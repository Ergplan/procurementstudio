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
  const [msgs, setMsgs] = useState<Msg[]>([{ id: 0, role: "bot", text: "I'm your **AI Proc Advisory**. Tap the mic and talk, or type. I can take you inside the equipment, compare vendors, or explain any BoQ line or procurement step." }]);
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
    return `You are AI Proc Advisory, the spoken procurement advisor inside Joulewise Procurement Studio, talking with the CXO and procurement team of ${s.M.client} (${s.M.factory}, ${s.M.location}), an Indian snacks & bhujia manufacturer.
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
  const toggleMute = () => { const r = rtc.current; if (!r) return; const m = !muted; r.mic.getAudioTracks().forEach((t: MediaStreamTrack) => (t.enabled = !m)); setMuted(m); };

  // keep the live session aware of what's on screen
  useEffect(() => { rtc.current?.send({ type: "session.update", session: { type: "realtime", instructions: instructions() } }); }, [S.assetId, S.sel, S.M]); // eslint-disable-line

  const ask = async (q: string) => {
    setOpen(true); push({ role: "user", text: q });
    const r = rtc.current;
    if (r && r.dc.readyState === "open") { r.send({ type: "conversation.item.create", item: { type: "message", role: "user", content: [{ type: "input_text", text: q }] } }); r.send({ type: "response.create" }); return; }
    if (!Sref.current.health?.text) { push({ role: "sys", text: "The server can't see OPENAI_API_KEY yet. See the note at the top of this panel." }); return; }
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
  const stateText: Record<VState, string> = { off: "Tap the mic to talk", connecting: "Connecting…", listening: "Listening", user: "You're speaking", thinking: "Thinking…", speaking: "Speaking · talk to interrupt" };
  const live = vs !== "off" && vs !== "connecting";
  const onScreen = a ? `${aName(a, S.M)}${S.sel ? " › " + a.rows.find(r => r[0] === S.sel)?.[1] : ""}` : `Site view`;
  const chips = a ? [a.id === "boiler" ? "Take me inside the furnace" : "Start the walkthrough", "Which bid should we award?", "What should we negotiate?"] : ["Take me inside the boiler", "Biggest saving across packages?", "RFQ to commissioning timeline"];
  const Mic = () => <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" /></svg>;
  return (<>
    {!open && <button className="adv-pill" type="button" onClick={() => setOpen(true)} aria-label="Open AI Proc Advisory">
      <span className={"adv-pill-dot" + (live ? " live" : "")}><Mic /></span>AI Proc Advisory{live && <span className="note"> · {stateText[vs]}</span>}
    </button>}
    {open && (
      <aside className="adv" aria-label="AI Proc Advisory">
        <header className="adv-h">
          <button type="button" className={"adv-mic" + (live ? " live" : "") + (vs === "speaking" ? " speaking" : "")} disabled={vs === "connecting" || !S.health?.voice} onClick={start} aria-label={live ? "End voice session" : "Start voice session"} title={live ? "End voice" : "Talk"}>
            <span className="adv-ring" style={{ transform: `scale(${1 + (vs === "user" || vs === "listening" ? level * 0.5 : vs === "speaking" ? 0.18 : 0)})` }} />
            {live ? <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><rect width="12" height="12" rx="2" fill="currentColor" /></svg> : <Mic />}
          </button>
          <div className="adv-title"><b>AI Proc Advisory</b><span>{stateText[vs]} · {onScreen}</span></div>
          {live && <button className="adv-icon" type="button" onClick={toggleMute} aria-label={muted ? "Unmute microphone" : "Mute microphone"} title={muted ? "Unmute" : "Mute"}>{muted ? "Unmute" : "Mute"}</button>}
          <button className="adv-icon" type="button" onClick={() => setOpen(false)} aria-label="Minimise" title="Minimise">–</button>
        </header>
        {S.health && !S.health.voice && <KeyHelp h={S.health} />}
        <div className="adv-log" ref={logRef}>
          {msgs.map(m => m.role === "tool" ? <div key={m.id} className="tool-call">↳ {m.text}</div> : m.role === "sys" ? <div key={m.id} className="msg sys"><span className="note">{m.text}</span></div> :
            <div key={m.id} className={"msg " + m.role}>{m.role === "bot" ? (m.text ? <Markdown text={m.text} /> : <div className="thinking"><i />…</div>) : <>{m.text}{m.voice && <span style={{ opacity: .65 }}> · voice</span>}</>}</div>)}
        </div>
        <div className="adv-chips">{chips.map(q => <button key={q} type="button" className="chip-btn" onClick={() => ask(q)}>{q}</button>)}</div>
        <form className="adv-form" onSubmit={e => { e.preventDefault(); const q = input.trim(); if (q) { setInput(""); ask(q); } }}>
          <label className="sr" htmlFor="rtIn">Ask AI Proc Advisory</label>
          <input id="rtIn" value={input} onChange={e => setInput(e.target.value)} placeholder={live ? "Type into the voice session…" : "Ask about any package, part or step…"} />
          {busy ? <button className="btn sm ghost" type="button" onClick={() => textCtl.current?.abort()}>Stop</button> : <button className="btn sm primary" type="submit">Send</button>}
        </form>
      </aside>
    )}
  </>);
}

function KeyHelp({ h }: { h: NonNullable<ReturnType<typeof useStudio>["health"]> }) {
  const [check, setCheck] = useState<string>("");
  const retry = async () => { setCheck("Checking…"); try { const j = await (await fetch("/api/health?check=1", { cache: "no-store" })).json(); if (j.voice) location.reload(); else setCheck("Still no key visible to the server."); } catch { setCheck("Couldn't reach /api/health."); } };
  if (h.unreachable) return <div className="setup">Couldn't reach the Studio server (<code>/api/health</code>). Check the deployment is running, then reload.</div>;
  const similar = (h.similarVars || []).length ? <> Found similar variables: <code>{h.similarVars!.join(", ")}</code>. Rename to <code>OPENAI_API_KEY</code> (never use a <code>NEXT_PUBLIC_</code> prefix for a secret).</> : null;
  return (
    <div className="setup">
      {h.host === "vercel" ? <>
        <b>This {h.vercelEnv || ""} deployment can't see <code>OPENAI_API_KEY</code>.</b> In Vercel → Settings → Environment Variables, check the name is exactly <code>OPENAI_API_KEY</code> and it's ticked for <b>{h.vercelEnv === "preview" ? "Preview" : "Production"}</b>. Then <b>Redeploy</b>: variables only reach new deployments.{similar}
      </> : <>
        Voice needs an OpenAI key. Put <code>OPENAI_API_KEY=sk-…</code> in <code>.env.local</code> in the project folder, then stop and restart <code>npm run dev</code>.{similar}
      </>}
      {" "}<button type="button" className="linkbtn" onClick={retry}>Check again</button>{check && <span className="note"> {check}</span>}
    </div>
  );
}
