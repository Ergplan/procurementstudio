"use client";
import React, { useMemo, useRef, useState } from "react";
import { useStudio } from "@/lib/store";
import { INTEL, RESEARCH_DATE, SRC } from "@/lib/data";
import { aName, amt, assetById, benchFlag, benchFor, compute, money, rate } from "@/lib/calc";
import { llmJson, errText } from "@/lib/ai";
import Walkthrough from "./Walkthrough";
import AiPanel, { type AiKind } from "./AiPanel";
import VendorHistory from "./VendorHistory";
import { mergedHistory, scoreBand, trackScore } from "@/lib/history";
import { flash } from "@/lib/focus";

export default function AssetView() {
  const S = useStudio();
  const a = assetById(S.assetId!);
  const c = useMemo(() => compute(a, S.M), [a, S.M]);
  const [ai, setAi] = useState<{ kind: AiKind; run: number } | null>(null);
  const walkRef = useRef<HTMLDivElement>(null);
  const spread = (c.out[c.byQuoted[2]].quoted / c.out[c.byQuoted[0]].quoted - 1) * 100;
  const gaps = a.vendors.reduce((n, v) => n + c.out[v.key].gaps.length, 0);
  const run = (kind: AiKind) => setAi({ kind, run: Date.now() });
  S.ctrl.current.runAi = (kind: AiKind) => { run(kind); setTimeout(() => flash('[data-focus="sec-ai"]', "start"), 150); };
  const locate = (pid: string) => { walkRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); S.ctrl.current.showPart?.(pid) || S.setSel(pid); };
  return (
    <section>
      <div className="crumb"><button type="button" onClick={() => S.ctrl.current.goSite()}>← {S.M.factory}</button><span>/</span><span>{aName(a, S.M)}</span></div>
      <div className="ahead"><div>
        <span className="eyebrow">{a.category} · HSN {a.hsn}</span>
        <h2>{aName(a, S.M)}</h2>
        <div className="req">Requirement: {a.req.text}</div>
        <div className="chips"><span className="chip">{a.vendors.length} bids</span><span className={"chip " + (spread > 25 ? "warn" : "")}>Spread {spread.toFixed(0)}%</span><span className={"chip " + (gaps ? "warn" : "good")}>{gaps} scope gap{gaps === 1 ? "" : "s"}</span><span className="chip">Specs differ across bids</span></div>
      </div></div>

      <div className="vcards" data-focus="sec-vendors">
        {a.vendors.map(v => { const o = c.out[v.key], L = c.byQuoted.indexOf(v.key) + 1; return (
          <div key={v.key} className="card vcard" data-focus={"vendor-" + v.key}>
            <div className="vh"><div><div className="vn">{v.name}</div><div className="vo">{v.offer}</div></div><span className={"tag " + (L === 1 ? "l1" : "")}>{L === 1 ? "L1 quoted" : "L" + L}</span></div>
            <div className="vt">
              <div className="kv"><div className="k">Quoted, ex-GST</div><div className="big">{money(o.quoted)}</div></div>
              <div className="kv"><div className="k">Incl. GST</div><div className="v num" style={{ fontSize: 14, marginTop: 4 }}>{money(o.gross)}</div></div>
              <div className="kv"><div className="k">{a.capUnitLabel}</div><div className="v num" style={{ fontSize: 14, marginTop: 4 }}>{rate(o.perUnit)}</div></div>
            </div>
            <TrackChip name={v.name} /><div className="meta"><span>Lead {v.lead}</span><span>Warranty {v.warranty}</span><span>Pay {v.payment}</span>{o.gaps.length > 0 && <span className="chip warn">{o.gaps.length} not quoted</span>}</div>
          </div>); })}
      </div>

      <div ref={walkRef} style={{ scrollMarginTop: 84 }} data-focus="sec-walk"><Walkthrough asset={a} /></div>

      <div className="card actions" data-focus="sec-actions">
        <button className="btn accent" type="button" onClick={() => run("brief")}>Tell me about the {aName(a, S.M)} at the {S.M.factory}</button>
        <button className="btn" type="button" onClick={() => run("norm")}>Normalize</button>
        <button className="btn" type="button" onClick={() => run("homog")}>Homogenize specs</button>
        <button className="btn primary" type="button" onClick={() => run("verdict")}>Overall verdict</button>
        <span className="sep" />
        <span className="note">{S.health?.text ? `AI: OpenAI ${S.health.textModel || ""}${S.health.web ? " · live web search" : ""}` : "AI not configured · add OPENAI_API_KEY"}</span>
      </div>
      {ai && <div data-focus="sec-ai"><AiPanel key={ai.run} kind={ai.kind} asset={a} onClose={() => setAi(null)} /></div>}

      <Boq asset={a} onLocate={locate} />

      <VendorHistory asset={a} />

      {a.brochure && (
        <div className="card tbl-card" data-focus="sec-drawing">
          <div className="tbl-head"><div><h3>Reference drawing · Thermax Ultrapac</h3><span className="note">From the brochure you supplied. BoQ lines carry the matching component numbers.</span></div></div>
          <div className="ref">
            <img src="/boiler-ref.jpg" alt="Ultrapac boiler component drawing with numbered parts" />
            <div className="prose" style={{ fontSize: 13 }}>
              <h4>Components mapped to the BoQ</h4>
              <ul>
                <li><b>#1, #7, #8</b> Boiler shell, top membrane panel, bottom MPA with baffle walls</li><li><b>#12</b> Sloped reciprocating grate</li><li><b>#13</b> Economiser assembly</li>
                <li><b>#10, #11, #19, #20</b> Primary &amp; secondary fans and ducting</li><li><b>#14–16</b> Feed-water pumping and feed pipes</li><li><b>#3–6, #21</b> Stop valve, safety valves, gauge glass, probe controller, blowdown</li>
                <li><b>#27–29</b> Screw feeder, level switch, dosing bin</li><li><b>#31</b> Danblast online soot blowing</li><li><b>#23, #24</b> Ash removal points</li><li><b>#2, #17, #25, #26</b> Access platforms and staircases</li>
              </ul>
              <p className="note">Brochure rating for UPRGA 40: 4,000 kg/hr steam, 11.25/17.5 kg/cm² design pressure, 87% efficiency on briquettes, 677 kg/hr briquette consumption, IBR 1950.</p>
            </div>
          </div>
        </div>
      )}

      <h3 style={{ fontSize: 16, margin: "18px 0 10px" }}>Vendor intelligence <span className="note" style={{ fontWeight: 400 }}>· researched on the web {RESEARCH_DATE}</span></h3>
      <div className="intel" data-focus="sec-intel">
        {a.vendors.map(v => { const it = INTEL[v.name] || { rating: "No data", flags: [], plus: [], src: [] }; return (
          <div key={v.key} className="card" data-focus={"intel-" + v.key}><h4>{v.name}</h4><div className="note">{it.rating}</div>
            {it.flags.length > 0 && <ul>{it.flags.map(f => <li key={f}><span className="dot bad" />{f}</li>)}</ul>}
            {it.plus.length > 0 && <ul>{it.plus.map(f => <li key={f}><span className="dot good" />{f}</li>)}</ul>}
            <div className="src">{it.src.map(s => <a key={s.u} href={s.u} target="_blank" rel="noopener noreferrer">{s.t}</a>)}</div>
          </div>); })}
      </div>
    </section>
  );
}

function Boq({ asset: a, onLocate }: { asset: ReturnType<typeof assetById>; onLocate: (pid: string) => void }) {
  const S = useStudio(); const c = compute(a, S.M);
  const [busy, setBusy] = useState(false); const [msg, setMsg] = useState("");
  const missing = c.rows.filter(r => !benchFor(r, S.disc));
  const discover = async () => {
    setBusy(true); setMsg("");
    const web = !!S.health?.web;
    const prompt = `${web ? "Search the web (IndiaMART, TradeIndia, OEM and industry sites) for" : "Estimate"} the current (2026) Indian market price range PER UNIT for each BoQ line below, for a ${aName(a, S.M)} (${a.req.text}). ${web ? "Use real listings you find; if nothing is found for a line, give a careful estimate and say so in basis." : ""} Be realistic and conservative; price the typical scope.
Reply with ONLY a JSON array: [{"row_id":"id","lo":number,"hi":number,"basis":"max 12 words","source_title":"string","source_url":"https://..."}] with lo/hi in ₹ per the row's unit, ex-GST.
Rows: ${JSON.stringify(missing.map(r => ({ row_id: r.id, item: r.item, unit: r.unit, vendor_quotes: a.vendors.filter(v => r.q[v.key]).map(v => ({ spec: r.q[v.key]![0], qty: r.q[v.key]![1], rate: r.q[v.key]![2] })) })))}`;
    try {
      const arr: any[] = await llmJson(prompt, { web });
      const d = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }); const nd = { ...S.disc }; let n = 0;
      (Array.isArray(arr) ? arr : []).forEach(x => { if (missing.find(r => r.id === x.row_id) && +x.hi > 0 && isFinite(+x.lo)) { nd[x.row_id] = { lo: +x.lo, hi: +x.hi, basis: String(x.basis || "").slice(0, 120), date: d, url: /^https?:\/\//.test(x.source_url || "") ? x.source_url : "", stitle: String(x.source_title || "").slice(0, 80) }; n++; } });
      S.setDisc(nd); setMsg(`Added ${n} market price${n === 1 ? "" : "s"}.`);
    } catch (e) { setMsg(errText(e)); } finally { setBusy(false); }
  };
  return (
    <div className="card tbl-card" data-focus="sec-boq">
      <div className="tbl-head">
        <div><h3>Bill of quantities · vendor comparison</h3><span className="note">Amounts ex-GST in ₹. Lowest amount per line is shaded. The orange column is the last discovered market price.</span></div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>{msg && <span className="note">{msg}</span>}<button className="btn sm" type="button" disabled={!missing.length || busy || !S.health?.text} onClick={discover}>{busy ? "Searching market prices…" : missing.length ? `Find ${missing.length} missing market price${missing.length > 1 ? "s" : ""}` : "All lines priced"}</button></div>
      </div>
      <div className="scroll"><table className="boq">
        <thead>
          <tr className="vrow"><th rowSpan={2}>#</th><th rowSpan={2}>Line item</th>{a.vendors.map(v => <th key={v.key} colSpan={3} className="vcol">{v.name}</th>)}<th rowSpan={2} className="lp">Last discovered price<br /><span style={{ fontWeight: 500 }}>per unit</span></th></tr>
          <tr>{a.vendors.map(v => <React.Fragment key={v.key}><th className="vcol">Spec · qty</th><th className="r">Rate</th><th className="r">Amount</th></React.Fragment>)}</tr>
        </thead>
        <tbody>
          {c.rows.map((r, i) => {
            const amts = a.vendors.map(v => amt(r.q[v.key])).filter(x => x != null) as number[]; const mn = Math.min(...amts); const b = benchFor(r, S.disc);
            return (
              <tr key={r.id} data-focus={"row-" + r.id}>
                <td className="num">{i + 1}</td>
                <td className="item">{r.item}<small><button type="button" className="linkbtn" onClick={() => onLocate(r.id)}>Show in 3D</button> · {r.unit} · GST {r.gst}%{r.ref ? ` · brochure ${r.ref}` : ""}</small></td>
                {a.vendors.map(v => { const cell = r.q[v.key]; if (!cell) return <React.Fragment key={v.key}><td className="vcol"><span className="gap">Not quoted</span></td><td /><td className="r note">loaded {money(c.out[v.key].gaps.find(g => g.id === r.id)!.fill)}</td></React.Fragment>;
                  const x = amt(cell)!; const fl = benchFlag(r, cell, S.disc);
                  return <React.Fragment key={v.key}><td className="vcol spec">{cell[0]}<br /><span className="num">{cell[1].toLocaleString("en-IN")} {r.unit}</span></td><td className="r num">{fl && <span className={"dot " + fl} title={fl === "bad" ? "Above market range" : fl === "warn" ? "Below market: check scope" : "Within market range"} />}{rate(cell[2])}</td><td className={"r num amt " + (x === mn && amts.length > 1 ? "min" : "")}>{money(x)}</td></React.Fragment>; })}
                <td className="lp">{b ? <><span className="v num">{rate(b.lo)}–{rate(b.hi)}</span>{(b as any).note && <small>{(b as any).note}</small>}<small>{b.kind === "web" ? <>Web · <a href={(b as any).srcU} target="_blank" rel="noopener noreferrer">{(b as any).srcT}</a></> : b.kind === "live" ? <><span className="chip ai">Live web · {(b as any).date}</span> <a href={(b as any).url} target="_blank" rel="noopener noreferrer">{(b as any).stitle || "source"}</a></> : <><span className="chip ai">AI estimate · {(b as any).date}</span> {(b as any).basis}</>}</small></> : <span className="note">No discovered price yet</span>}</td>
              </tr>);
          })}
        </tbody>
        <tfoot>
          {([["Quoted subtotal", "quoted", ""], ["GST", "gst", ""], ["Grand total incl. GST", "gross", "grand"]] as const).map(([l, k, cls]) => (
            <tr key={k} className={cls}><td /><td>{l}</td>{a.vendors.map(v => <React.Fragment key={v.key}><td className="vcol" /><td /><td className="r num">{money((c.out[v.key] as any)[k])}</td></React.Fragment>)}<td className="lp" /></tr>))}
          {a.assetBench && <tr><td /><td colSpan={1 + a.vendors.length * 3} className="note" style={{ fontWeight: 500 }}>Package benchmark: <b className="num">{money(a.assetBench.lo)}–{money(a.assetBench.hi)}</b> ({a.assetBench.note}) · <a href={SRC[a.assetBench.src!].u} target="_blank" rel="noopener noreferrer">{SRC[a.assetBench.src!].t}</a></td><td className="lp" /></tr>}
        </tfoot>
      </table></div>
    </div>
  );
}

function TrackChip({ name }: { name: string }) {
  const S = useStudio(); const t = trackScore(mergedHistory(name, S.reviews));
  const band = scoreBand(t?.score ?? null);
  return <div className="trackchip"><span className={"chip " + (band === "none" ? "" : band)} title="Past-performance score with us (0–100)">{t ? `Track record ${t.score}/100` : "New to us"}</span>{t && <span className="note">{Math.round(t.warranty * 100)}% warranties honoured · satisfaction {t.satisfaction.toFixed(1)}/10</span>}</div>;
}
