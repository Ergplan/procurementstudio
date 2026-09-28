"use client";
import React, { useEffect, useRef, useState } from "react";
import { useStudio } from "@/lib/store";
import { ASSETS, RESEARCH_DATE } from "@/lib/data";
import { aName, aiContext, assetById, partInfo, portfolio } from "@/lib/calc";
import { llm, errText, type Turn } from "@/lib/ai";
import Markdown from "./Markdown";

type Msg = { id: number; role: "user" | "bot" | "sys" | "tool"; text: string; voice?: boolean };
type VState = "off" | "connecting" | "listening" | "user" | "thinking" | "speaking";

const TOOLS = [
  { type: "function", name: "open_asset", description: "Open an equipment package on screen. asset_id: solar, fryer, extruder, packing, tfh, boiler.", parameters: { type: "object", properties: { asset_id: { type: "string", enum: ASSETS.map(a => a.id) } }, required: ["asset_id"] } },
  { type: "function", name: "show_part", description: "Fly the 3D walkthrough to a BoQ part of the open asset and show its inspector. part_id is a BoQ row id, e.g. b3 = economiser. Returns the part's function, what to check and each vendor's quote.", parameters: { type: "object", properties: { part_id: { type: "string" } }, required: ["part_id"] } },
  { type: "function", name: "walkthrough", description: "Move the guided walkthrough of the open asset: start, next or previous. Returns the stop and its part.", parameters: { type: "object", properties: { step: { type: "string", enum: ["start", "next", "previous"] } }, required: ["step"] } },
  { type: "function", name: "set_view", description: "Switch the 3D camera to a named view of the open asset, e.g. 'Walk inside furnace', 'Along the smoke tubes', 'Top platform', 'Overview'.", parameters: { type: "object", properties: { view: { type: "string" } }, required: ["view"] } },
  { type: "function", name: "get_asset", description: "Full data for one package: requirement, BoQ lines with every vendor's spec/qty/rate, market prices, normalized totals, tech sheet (incl. design pressure for the boiler) and vendor intel.", parameters: { type: "object", properties: { asset_id: { type: "string", enum: ASSETS.map(a => a.id) } }, required: ["asset_id"] } },
  { type: "function", name: "get_portfolio", description: "Summary of all six packages: vendors, quoted and normalized totals, ranks, scope gaps and risk flags.", parameters: { type: "object", properties: {} } },
  { type: "function", name: "go_to_site", description: "Return to the isometric factory site view.", parameters: { type: "object", properties: {} } },
];

export default function RealTalk() {
  const S = useStudio();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([{ id: 0, role: "bot", text: "I'm **RealTalk**, your voice co-pilot for this procurement. Tap the orb and talk to me: ask me to take you inside the boiler, compare vendors, or explain any BoQ line or procurement step." }]);
  const [vs, setVs] = useState<VState>("off");
  const [level, setLevel] = useState(0);
  const [muted, setMuted] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const rtc = useRef<any>(null), idc = useRef(1), cur = useRef<{ id: number; text: string } | null>(null), turns = useRef<Turn[]>([]), textCtl = useRef<AbortController | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const Sref = useRef(S); Sref.current = S;

  const push = (m: Omit<Msg, "id">) => { const id = idc.current++; setMsgs(x => [...x, { ...m, id }]); return id; };
  const patch = (id: number, text: string) => setMsgs(x => x.map(m => (m.id === id ? { ...m, text } : m)));
  useEffect(() => { logRef.current?.scrollTo({ top: 1e9 }); }, [msgs]);

  const instructions = () => {
    const s = Sref.current, a = s.assetId ? assetById(s.assetId) : null;
    return `You are RealTalk, the spoken procurement co-pilot inside Joulewise Procurement Studio, talking with the CXO and procurement team of ${s.M.client} (${s.M.factory}, ${s.M.location}), an Indian snacks & bhujia manufacturer.
Speak in short, clear Indian-English sentences (2-4 sentences per turn unless asked for detail). Use ₹ lakh and crore. Be numeric and decisive; say when evidence is thin.
You can drive the screen: open_asset, show_part, walkthrough, set_view, go_to_site. When the user asks to see or go inside something ("take me inside the boiler", "show me the economiser", "next part"), call the tools first, then explain what is on screen. Always call get_asset or get_portfolio before quoting numbers you don't already have.
You also answer any question on the procurement process: RFQ, techno-commercial evaluation, L1 vs normalized N1, reverse auction, negotiation, PO terms (advance, ABG/PBG, LDs, warranty), IBR/CEIG/pollution-board approvals, GST and input tax credit, FAT/SAT, commissioning.
Vendor bids are illustrative demo data; market benchmarks and vendor intel were web-researched on ${RESEARCH_DATE}.
Packages: ${ASSETS.map(x => `${x.id} = ${aName(x, s.M)} (${x.req.capLabel})`).join("; ")}.
On screen now: ${a ? `${aName(a, s.M)}${s.sel ? `, part ${s.sel} (${a.rows.find(r => r[0] === s.sel)?.[1]})` : ""}. Parts: ${a.rows.map(r => `${r[0]}=${r[1]}`).join("; ")}` : "the factory site view"}.`;
  };

  const runTool = async (name: string, args: any) => {
    const s = Sref.current, ctrl = s.ctrl.current;
    const wait = (ms: number) => new Promise(r => setTimeout(r, ms));
    try {
      if (name === "open_asset") { if (!ASSETS.find(a => a.id === args.asset_id)) return { error: "unknown asset" }; ctrl.openAsset(args.asset_id); await wait(700); const a = assetById(args.asset_id); return { ok: true, asset: a.name, parts: a.rows.map(r => ({ id: r[0], item: r[1] })), views: ctrl.views?.() || [] }; }
      if (name === "show_part") { if (!s.assetId) return { error: "open an asset first" }; const ok = ctrl.showPart?.(args.part_id); if (!ok) return { error: "unknown part" }; document.querySelector(".walk-card")?.scrollIntoView({ behavior: "smooth", block: "start" }); return partInfo(assetById(s.assetId), args.part_id); }
      if (name === "walkthrough") { if (!s.assetId) return { error: "open an asset first" }; const t = ctrl.tour?.(args.step); if (!t) return { error: "walkthrough not ready" }; const pid = t.order[t.idx]; document.querySelector(".walk-card")?.scrollIntoView({ behavior: "smooth", block: "start" }); return { stop: t.idx + 1, of: t.order.length, ...partInfo(assetById(s.assetId), pid) }; }
      if (name === "set_view") { const v = ctrl.setView?.(String(args.view || "")); return v ? { ok: true, view: v } : { error: "views available: " + (ctrl.views?.() || []).join(", ") }; }
      if (name === "get_asset") { const a = ASSETS.find(x => x.id === args.asset_id); return a ? aiContext(a, s.M, s.disc) : { error: "unknown asset" }; }
      if (name === "get_portfolio") return portfolio(s.M);
      if (name === "go_to_site") { ctrl.goSite(); return { ok: true }; }
    } catch (e: any) { return { error: String(e?.message || e) }; }
    return { error: "unknown tool" };
  };

  const onEvent = async (e: any) => {
    const r = rtc.current; if (!r) return;
    switch (e.type) {
      case "input_audio_buffer.speech_started": setVs("user"); break;
      case "input_audio_buffer.speech_stopped": setVs("thinking"); break;
      case "output_audio_buffer.started": setVs("speaking"); break;
      case "output_audio_buffer.stopped": case "output_audio_buffer.cleared": setVs("listening"); break;
      case "conversation.item.input_audio_transcription.completed": if (e.transcript?.trim()) push({ role: "user", text: e.transcript.trim(), voice: true }); break;
      case "response.output_audio_transcript.delta": case "response.output_text.delta":
        if (!cur.current) cur.current = { id: push({ role: "bot", text: "" }), text: "" };
        cur.current.text += e.delta || ""; patch(cur.current.id, cur.current.text); break;
      case "response.output_audio_transcript.done": case "response.output_text.done": cur.current = null; break;
      case "response.done": {
        const calls = (e.response?.output || []).filter((o: any) => o.type === "function_call");
        if (!calls.length) break;
        for (const c of calls) {
          let args: any = {}; try { args = JSON.parse(c.arguments || "{}"); } catch {}
          push({ role: "tool", text: `${c.name}(${Object.values(args).join(", ")})` });
          const out = await runTool(c.name, args);
          r.send({ type: "conversation.item.create", item: { type: "function_call_output", call_id: c.call_id, output: JSON.stringify(out).slice(0, 30000) } });
        }
        r.send({ type: "session.update", session: { type: "realtime", instructions: instructions() } });
        r.send({ type: "response.create" }); break;
      }
      case "error": push({ role: "sys", text: "⚠ " + (e.error?.message || "Realtime error") }); break;
    }
  };

  const start = async () => {
    if (rtc.current) return stop();
    setVs("connecting");
    try {
      const res = await fetch("/api/realtime/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ instructions: instructions(), tools: TOOLS }) });
      const s = await res.json(); if (!res.ok || !s.value) throw new Error(s.error || "Could not create a Realtime session");
      const mic = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      const pc = new RTCPeerConnection();
      const audio = new Audio(); audio.autoplay = true; pc.ontrack = ev => { audio.srcObject = ev.streams[0]; };
      mic.getTracks().forEach(t => pc.addTrack(t, mic));
      const dc = pc.createDataChannel("oai-events");
      // mic level meter
      const ac = new AudioContext(); const an = ac.createAnalyser(); an.fftSize = 512; ac.createMediaStreamSource(mic).connect(an); const buf = new Uint8Array(an.fftSize);
      let raf = 0; const tick = () => { an.getByteTimeDomainData(buf); let m = 0; for (const v of buf) m = Math.max(m, Math.abs(v - 128)); setLevel(m / 128); raf = requestAnimationFrame(tick); }; tick();
      rtc.current = { pc, dc, mic, audio, ac, stopMeter: () => cancelAnimationFrame(raf), send: (m: any) => dc.readyState === "open" && dc.send(JSON.stringify(m)) };
      dc.onmessage = ev => { try { onEvent(JSON.parse(ev.data)); } catch {} };
      dc.onopen = () => { setVs("listening"); push({ role: "sys", text: `Voice connected · ${s.model}` }); };
      pc.onconnectionstatechange = () => { if (["failed", "closed", "disconnected"].includes(pc.connectionState)) stop(); };
      const offer = await pc.createOffer(); await pc.setLocalDescription(offer);
      const ans = await fetch(s.callsUrl, { method: "POST", body: offer.sdp, headers: { Authorization: `Bearer ${s.value}`, "Content-Type": "application/sdp" } });
      if (!ans.ok) throw new Error(`Realtime call failed (${ans.status})`);
      await pc.setRemoteDescription({ type: "answer", sdp: await ans.text() });
    } catch (err: any) {
      stop(); push({ role: "sys", text: "⚠ Voice couldn't start: " + (err?.name === "NotAllowedError" ? "microphone permission was denied." : err?.message || err) });
    }
  };
  const stop = () => {
    const r = rtc.current; rtc.current = null; cur.current = null;
    if (r) { try { r.stopMeter(); r.mic.getTracks().forEach((t: MediaStreamTrack) => t.stop()); r.dc.close(); r.pc.close(); r.ac.close(); r.audio.srcObject = null; } catch {} }
    setVs("off"); setLevel(0); setMuted(false);
  };
  useEffect(() => () => stop(), []); // eslint-disable-line
  useEffect(() => { document.body.classList.toggle("rt-open", open); }, [open]);
  const toggleMute = () => { const r = rtc.current; if (!r) return; const m = !muted; r.mic.getAudioTracks().forEach((t: MediaStreamTrack) => (t.enabled = !m)); setMuted(m); };

  // keep the live session aware of what's on screen
  useEffect(() => { rtc.current?.send({ type: "session.update", session: { type: "realtime", instructions: instructions() } }); }, [S.assetId, S.sel, S.M]); // eslint-disable-line

  const ask = async (q: string) => {
    setOpen(true); push({ role: "user", text: q });
    const r = rtc.current;
    if (r && r.dc.readyState === "open") { r.send({ type: "conversation.item.create", item: { type: "message", role: "user", content: [{ type: "input_text", text: q }] } }); r.send({ type: "response.create" }); return; }
    if (!Sref.current.health?.text) { push({ role: "sys", text: "Add OPENAI_API_KEY to .env.local to use RealTalk." }); return; }
    textCtl.current?.abort(); const ctl = new AbortController(); textCtl.current = ctl; setBusy(true);
    const s = Sref.current, a = s.assetId ? assetById(s.assetId) : null;
    const data = { portfolio: portfolio(s.M), focus_asset: a ? aiContext(a, s.M, s.disc) : null, focus_part: a && s.sel ? partInfo(a, s.sel) : null };
    turns.current.push({ role: "user", content: q });
    const id = push({ role: "bot", text: "" });
    try {
      const t = await llm([{ role: "user", content: instructions() + "\nYou are answering in text now; keep it under 170 words and cite web sources as links if you search.\nStudio data: " + JSON.stringify(data) }, ...turns.current.slice(-10)], { web: !!s.health?.web, signal: ctl.signal, onText: x => patch(id, x) });
      turns.current.push({ role: "assistant", content: t });
    } catch (e: any) { turns.current.pop(); patch(id, e?.code === "cancelled" ? "_Stopped._" : "⚠ " + errText(e)); }
    finally { setBusy(false); }
  };
  S.rtAsk.current = ask;

  const a = S.assetId ? assetById(S.assetId) : null;
  const stateText: Record<VState, React.ReactNode> = { off: <>Tap to talk</>, connecting: <>Connecting to OpenAI Realtime…</>, listening: <><b>Listening</b> · just speak</>, user: <><b>You're speaking</b></>, thinking: <><b>Thinking…</b></>, speaking: <><b>RealTalk is speaking</b> · talk to interrupt</> };
  const live = vs !== "off" && vs !== "connecting";
  const chips = a ? [`Take me inside the ${a.id === "boiler" ? "boiler furnace" : aName(a, S.M).toLowerCase()}`, "Start the walkthrough", `Which ${aName(a, S.M).toLowerCase()} bid should we award?`] : ["Take me inside the boiler", "Where is the biggest saving across all six packages?", "What's our timeline from RFQ to commissioning?"];
  return (<>
    {!open && <button className="rt-fab" type="button" onClick={() => setOpen(true)}><span className="rt-dot" style={live ? { background: "var(--good)" } : undefined} />RealTalk{live ? " · live" : ""}</button>}
    {open && (
      <aside className="rt" aria-label="RealTalk voice assistant">
        <header className="rt-h">
          <div><b>RealTalk</b><span className="note">OpenAI Realtime voice{S.health?.realtimeModel ? ` · ${S.health.realtimeModel}` : ""}</span></div>
          <span className="sp" />
          {live && <button className="btn sm" type="button" onClick={toggleMute}>{muted ? "Unmute mic" : "Mute mic"}</button>}
          <button className="btn sm ghost" type="button" onClick={() => setOpen(false)}>Hide</button>
        </header>
        {S.health && !S.health.voice && <div className="setup">Voice needs an OpenAI key. Add <code>OPENAI_API_KEY=…</code> to <code>.env.local</code> and restart <code>npm run dev</code>.</div>}
        <div className="rt-stage">
          <button type="button" className={"orb" + (live ? " live" : "") + (vs === "speaking" ? " speaking" : "")} disabled={vs === "connecting" || !S.health?.voice} onClick={start} aria-label={live ? "End voice session" : "Start voice session"}>
            <span className="ring" style={{ transform: `scale(${1 + (vs === "user" || vs === "listening" ? level * 0.35 : vs === "speaking" ? 0.12 : 0)})` }} />
            {live ? "End" : vs === "connecting" ? "…" : "Talk"}
          </button>
          <div className="rt-state">{stateText[vs]}</div>
        </div>
        <div className="rt-ctx"><span className="eyebrow">On screen</span> {a ? `${aName(a, S.M)}${S.sel ? " › " + a.rows.find(r => r[0] === S.sel)?.[1] : ""}` : `Site view · ${S.M.factory}`}</div>
        <div className="rt-log" ref={logRef}>
          {msgs.map(m => m.role === "tool" ? <div key={m.id} className="tool-call">↳ {m.text}</div> : m.role === "sys" ? <div key={m.id} className="msg sys"><span className="note">{m.text}</span></div> :
            <div key={m.id} className={"msg " + m.role}>{m.role === "bot" ? (m.text ? <Markdown text={m.text} /> : <div className="thinking"><i />…</div>) : <>{m.text}{m.voice && <span className="note" style={{ color: "inherit", opacity: .7 }}> · voice</span>}</>}</div>)}
        </div>
        <div className="rt-chips">{chips.map(q => <button key={q} type="button" className="chip-btn" onClick={() => ask(q)}>{q}</button>)}</div>
        <form className="rt-form" onSubmit={e => { e.preventDefault(); const q = input.trim(); if (q) { setInput(""); ask(q); } }}>
          <label className="sr" htmlFor="rtIn">Type to RealTalk</label>
          <textarea id="rtIn" rows={2} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); (e.currentTarget.form as HTMLFormElement).requestSubmit(); } }} placeholder={live ? "Type into the live voice session…" : "Or type a question…"} />
          <div className="rt-row"><span className="note">{live ? "Typed messages go into the voice session" : "Typed answers use OpenAI text + web search"}</span><span className="sp" />{busy && <button className="btn sm ghost" type="button" onClick={() => textCtl.current?.abort()}>Stop</button>}<button className="btn sm primary" type="submit">Send</button></div>
        </form>
      </aside>
    )}
  </>);
}
