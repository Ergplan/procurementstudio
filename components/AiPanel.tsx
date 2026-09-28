"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useStudio } from "@/lib/store";
import type { Asset } from "@/lib/data";
import { RESEARCH_DATE } from "@/lib/data";
import { aName, aiContext, amt, compute, money, rate } from "@/lib/calc";
import { llm, llmJson, errText } from "@/lib/ai";
import Markdown from "./Markdown";

export type AiKind = "brief" | "norm" | "homog" | "verdict";
const TITLES: Record<AiKind, string> = { brief: "Briefing", norm: "Normalized comparison", homog: "Homogenized specification", verdict: "Overall verdict" };

function useAi<T>(fn: (signal: AbortSignal, onText: (t: string) => void) => Promise<T>, enabled: boolean) {
  const [text, setText] = useState(""), [data, setData] = useState<T | null>(null), [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  const ctl = useRef<AbortController | null>(null);
  useEffect(() => {
    if (!enabled) return; const c = new AbortController(); ctl.current = c; setBusy(true);
    fn(c.signal, setText).then(d => !c.signal.aborted && setData(d)).catch(e => { if (e?.code !== "cancelled") setErr(errText(e)); }).finally(() => setBusy(false));
    return () => c.abort();
  }, [enabled]); // eslint-disable-line
  return { text, data, err, busy, stop: () => ctl.current?.abort() };
}

export default function AiPanel({ kind, asset: a, onClose }: { kind: AiKind; asset: Asset; onClose: () => void }) {
  const S = useStudio(); const ok = !!S.health?.text;
  const c = useMemo(() => compute(a, S.M), [a, S.M]);
  const ctx = useMemo(() => aiContext(a, S.M, S.disc), [a, S.M, S.disc]);
  const web = !!S.health?.web;
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, []);

  const job = useAi<any>(async (signal, onText) => {
    const name = aName(a, S.M);
    if (kind === "brief") return llm(`You are the head of procurement briefing the CXO of an Indian snacks & bhujia manufacturer on a capex package. Be short, sharp and numeric. Use ₹ lakh (L) and crore (Cr). Maximum 150 words.
Format exactly:
### Bottom line
one or two sentences with the recommendation direction and the key number.
### Pricing read
3 bullets: how quotes compare with each other and with market benchmarks, which lines drive the spread, anything priced above/below market.
### Watch-outs
2-3 bullets: scope gaps, spec mismatches, vendor risk flags.
Don't invent numbers. Data: ${JSON.stringify(ctx)}`, { signal, onText });
    if (kind === "norm") return llm(`Explain to a CXO in at most 110 words what normalization changes versus raw quotes for the ${name} at ${S.M.factory}. Name raw L1 and normalized N1 and the 2-3 biggest adjustments (scope gaps, capacity, efficiency/yield) with ₹ in L/Cr. Then "### Judgement calls" with 1-2 bullets.
Raw L1: ${c.out[c.byQuoted[0]].v.name}. Normalized order: ${c.byNorm.map(k => c.out[k].v.name).join(" < ")}.
Data: ${JSON.stringify({ capacity_rule: "price × (required/offered)^" + a.scaleExp, gaps_rule: "missing lines loaded at highest competing quote", vendors: a.vendors.map(v => { const o = c.out[v.key]; return { vendor: v.name, capacity: v.cap + " " + a.capUnit, quoted: Math.round(o.quoted), gap_load: Math.round(o.gapLoad), gaps: o.gaps.map(g => g.item), cap_factor: +o.capF.toFixed(3), lifecycle_delta: Math.round(o.lcDelta), normalized: Math.round(o.norm), eff: v.eff, yield: v.yield }; }) })}`, { signal, onText });
    const need = (k: string) => (r: any) => { if (!r || typeof r !== "object" || Array.isArray(r) || !(k in r)) throw { code: "invalid_json", message: "unexpected format" }; return r; };
    if (kind === "homog") return llmJson(`You are a senior process/procurement engineer for an Indian snacks & bhujia manufacturer. Homogenize the three bids for "${name}" to ONE common specification that fits the requirement ("${a.req.text}"), then choose the right BoQ mix: for each line pick the vendor whose offered spec best meets the common spec at a sensible price (not always cheapest; never a "not quoted" cell; prefer one vendor where interfaces matter).
Reply with ONLY JSON: {"common_spec":[{"parameter":"","value":"","why":""}],"mix":[{"row_id":"","vendor":"exact vendor name","reason":"max 14 words"}],"single_source_advice":"one sentence","asks":["max 3 re-quote asks"]}
4-6 common_spec items; one mix entry per BoQ row. Data: ${JSON.stringify(ctx)}`, { signal }).then(need("mix"));
    return llmJson(`You advise the CXO of an Indian snacks & bhujia manufacturer on which vendor to award "${name}" at ${S.M.factory}. Weigh normalized price 35%, technical fit 30%, reputation & customer-flagged issues 20%, delivery & commercial risk 15%. Stored vendor intel was web-researched on ${RESEARCH_DATE}.${web ? " Use web search now to check each vendor's recent Indian customer reviews, complaints, litigation or quality issues; include URLs in sources." : ""} Say when evidence is thin.
Reply with ONLY JSON: {"vendor":"exact name","confidence":"High|Medium|Low","headline":"max 22 words","scorecard":[{"vendor":"","price":1-5,"technical":1-5,"reputation":1-5,"delivery_risk":1-5,"weighted":0-5}],"why":["3 bullets"],"risks":["2-3"],"negotiate":["2-3 levers with ₹ targets"],"conditions":["2-3 clauses"],"sources":[{"title":"","url":""}]}
(delivery_risk 5 = lowest risk). Data: ${JSON.stringify(ctx)}`, { signal, web }).then(need("vendor"));
  }, ok && kind !== "norm" ? true : ok);

  const l1 = c.out[c.byQuoted[0]], n1 = c.out[c.byNorm[0]];
  return (
    <div className="card ai-panel" ref={ref}>
      <div className="ai-head"><h3>{TITLES[kind]} · {aName(a, S.M)}</h3><span className="chip ai">{web && (kind === "verdict") ? "AI + live web" : "AI"}</span><span className="status">{job.busy ? "Working…" : job.err ? "" : ok ? "Done" : ""}</span><span className="sp" />{job.busy && <button className="btn sm" type="button" onClick={job.stop}>Stop</button>}<button className="btn sm ghost" type="button" onClick={onClose}>Close</button></div>
      <div className="ai-body">
        {kind === "brief" && <div className="keynums"><div className="kv"><div className="k">L1 quoted</div><div className="v num">{money(l1.quoted)}</div><div className="note">{l1.v.name}</div></div><div className="kv"><div className="k">Best normalized</div><div className="v num">{money(n1.norm)}</div><div className="note">{n1.v.name}</div></div><div className="kv"><div className="k">Quote spread</div><div className="v num">{money(c.out[c.byQuoted[2]].quoted - l1.quoted)}</div></div><div className="kv"><div className="k">Market reference</div><div className="v num" style={{ fontSize: 13 }}>{a.assetBench ? money(a.assetBench.lo) + "–" + money(a.assetBench.hi) : "₹40–55/Wp EPC"}</div></div></div>}
        {kind === "norm" && <NormTable asset={a} />}
        {!ok && <p className="note">AI isn't configured. Add <code>OPENAI_API_KEY</code> to <code>.env.local</code> and restart the app.</p>}
        {(kind === "brief" || kind === "norm") && ok && (job.text ? <Markdown text={job.text} /> : !job.err && <div className="thinking"><i />Thinking…</div>)}
        {kind === "homog" && ok && (job.data ? <Homog asset={a} r={job.data} /> : !job.err && <div className="thinking"><i />Aligning specifications line by line…</div>)}
        {kind === "verdict" && ok && (job.data ? <Verdict r={job.data} web={web} /> : !job.err && <div className="thinking"><i />Weighing price, specs and vendor track record{web ? ", searching the web" : ""}…</div>)}
        {job.err && <p className="err">{job.err}</p>}
      </div>
    </div>
  );
}

function NormTable({ asset: a }: { asset: Asset }) {
  const { M } = useStudio(); const c = compute(a, M); const vs = a.vendors;
  const row = (label: string, fn: (o: any, v: any) => React.ReactNode, cls = "") => <tr className={cls}><td>{label}</td>{vs.map(v => <td key={v.key} className="num">{fn(c.out[v.key], v)}</td>)}</tr>;
  const max = Math.max(...vs.map(v => c.out[v.key].norm));
  return (<>
    <div className="scroll"><table className="ntable"><thead><tr><th>Step</th>{vs.map(v => <th key={v.key}>{v.name}</th>)}</tr></thead><tbody>
      {row("Quoted, ex-GST", o => money(o.quoted))}
      {row("+ Scope gaps loaded at highest competing quote", o => (o.gapLoad ? "+" + money(o.gapLoad) : "–"))}
      {row("= Scope-adjusted price", o => money(o.scopeAdj))}
      {row("Offered capacity", (o, v) => v.cap.toLocaleString("en-IN") + " " + a.capUnit)}
      {row(`Unit rate (${a.capUnitLabel})`, o => rate(o.perUnit))}
      {row(`× Capacity factor to ${a.req.capLabel} (exp. ${a.scaleExp})`, o => o.capF.toFixed(3))}
      {row("= Capacity-normalized price", o => money(o.capNorm))}
      {a.lifecycle && row(a.lifecycle.label, (o, v) => v[a.lifecycle!.field] + " " + a.lifecycle!.unit)}
      {a.lifecycle && row(a.lifecycle.type === "fuel" ? `+ Extra fuel cost vs best, ${M.years} yr` : `+ Energy value lost vs best, ${M.years} yr`, o => (o.lcDelta ? "+" + money(o.lcDelta) : "–"))}
      {row("= Normalized total", o => <b>{money(o.norm)}</b>, "total")}
      {row("Rank", (o, v) => (c.byNorm.indexOf(v.key) === 0 ? <span className="chip good">N1</span> : "N" + (c.byNorm.indexOf(v.key) + 1)))}
    </tbody></table></div>
    <div className="bars">{c.byNorm.map((k, i) => { const o = c.out[k]; return <div className="bar" key={k}><span>{o.v.name}</span><div className="track"><div className={"fill " + (i === 0 ? "best" : "")} style={{ width: (o.norm / max * 100).toFixed(1) + "%" }} /></div><span className="num">{money(o.norm)}</span></div>; })}</div>
    <p className="note">Capacity factor uses the {a.scaleExp === 1 ? "linear rule" : "power-law cost-capacity rule"}: normalized = price × (required ÷ offered)^{a.scaleExp}. Assumptions are editable in Master data.</p>
  </>);
}

function Homog({ asset: a, r }: { asset: Asset; r: any }) {
  const { M } = useStudio(); const c = compute(a, M); let total = 0; const byV: Record<string, number> = {};
  const rows = c.rows.map(row => {
    const m = (r.mix || []).find((x: any) => x.row_id === row.id) || {};
    let v = a.vendors.find(x => x.name === m.vendor && row.q[x.key]);
    if (!v) v = a.vendors.filter(x => row.q[x.key]).sort((p, q) => amt(row.q[p.key])! - amt(row.q[q.key])!)[0];
    const x = amt(row.q[v.key])!; total += x; byV[v.name] = (byV[v.name] || 0) + x;
    return <tr key={row.id}><td>{row.item}</td><td><b>{v.name}</b><br /><span className="note">{row.q[v.key]![0]}</span></td><td className="num" style={{ textAlign: "right" }}>{money(x)}</td><td className="note">{m.reason || "Fallback: lowest quoted"}</td></tr>;
  });
  const l1 = c.out[c.byQuoted[0]];
  return (<>
    <div className="two"><div>
      <h4 className="eyebrow" style={{ margin: "0 0 8px" }}>Common specification</h4>
      <div className="scroll"><table className="ntable homog"><thead><tr><th>Parameter</th><th>Value</th><th>Why</th></tr></thead><tbody>{(r.common_spec || []).map((s: any, i: number) => <tr key={i}><td><b>{s.parameter}</b></td><td>{s.value}</td><td className="note">{s.why}</td></tr>)}</tbody></table></div>
      <div className="prose" style={{ marginTop: 12 }}><h4>Award advice</h4><p>{r.single_source_advice}</p>{r.asks?.length > 0 && <><h4>Ask vendors to re-quote</h4><ul>{r.asks.map((x: string, i: number) => <li key={i}>{x}</li>)}</ul></>}</div>
    </div><div>
      <div className="keynums"><div className="kv"><div className="k">Suggested mix total, ex-GST</div><div className="v num">{money(total)}</div></div><div className="kv"><div className="k">vs L1 single-vendor</div><div className="v num">{total - l1.quoted >= 0 ? "+" : ""}{money(total - l1.quoted)}</div><div className="note">{l1.v.name}, but with scope gaps</div></div></div>
      <div className="note">Split by vendor: {Object.entries(byV).map(([k, v]) => `${k} ${money(v)}`).join(" · ")}</div>
    </div></div>
    <h4 className="eyebrow" style={{ margin: "14px 0 8px" }}>Recommended BoQ mix</h4>
    <div className="scroll"><table className="ntable homog"><thead><tr><th>Line item</th><th>Pick</th><th style={{ textAlign: "right" }}>Amount</th><th>Reason</th></tr></thead><tbody>{rows}</tbody></table></div>
    <p className="note">Totals are computed from the quoted rates, not by the AI. A split award needs interface responsibility written into the POs.</p>
  </>);
}

const Pips = ({ n }: { n: number }) => <span className="pips" aria-label={`${n} of 5`}>{[1, 2, 3, 4, 5].map(i => <i key={i} className={i <= n ? "on" : ""} />)}</span>;
function Verdict({ r, web }: { r: any; web: boolean }) {
  const ul = (a: string[]) => <ul>{(a || []).map((x, i) => <li key={i}>{x}</li>)}</ul>;
  const src = (r.sources || []).filter((s: any) => /^https?:/.test(s?.url || "")).slice(0, 10);
  return (<>
    <div className="verdict-top"><div style={{ flex: 1, minWidth: 240 }}><span className="eyebrow">Recommended award</span><div className="pick">{r.vendor}</div><p style={{ margin: "6px 0 0" }}>{r.headline}</p></div><span className={"chip " + (r.confidence === "High" ? "good" : r.confidence === "Low" ? "bad" : "warn")}>{r.confidence} confidence</span></div>
    <div className="scroll"><table className="score"><thead><tr><th>Vendor</th><th>Price 35%</th><th>Technical 30%</th><th>Reputation 20%</th><th>Delivery risk 15%</th><th>Weighted</th></tr></thead><tbody>
      {(r.scorecard || []).map((s: any, i: number) => <tr key={i}><td><b>{s.vendor}</b></td><td><Pips n={+s.price} /></td><td><Pips n={+s.technical} /></td><td><Pips n={+s.reputation} /></td><td><Pips n={+s.delivery_risk} /></td><td className="num"><b>{s.weighted}</b></td></tr>)}
    </tbody></table></div>
    <div className="two prose" style={{ marginTop: 14 }}><div><h4>Why</h4>{ul(r.why)}<h4>Risks</h4>{ul(r.risks)}</div><div><h4>Negotiate</h4>{ul(r.negotiate)}<h4>Contract conditions</h4>{ul(r.conditions)}</div></div>
    {src.length > 0 && <><h4 className="eyebrow" style={{ margin: "12px 0 6px" }}>Live web sources</h4><div className="src">{src.map((s: any, i: number) => <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" style={{ marginRight: 10 }}>{s.title || s.url}</a>)}</div></>}
    <p className="note">Reputation scores draw on stored vendor intel{web ? " plus a live web search just now" : ""}. Verify with reference customers before award.</p>
  </>);
}
