"use client";
import React, { useState } from "react";
import { useStudio } from "@/lib/store";
import type { Asset } from "@/lib/data";
import { money } from "@/lib/calc";
import { mergedHistory, scoreBand, trackScore, type Review } from "@/lib/history";

export default function VendorHistory({ asset: a }: { asset: Asset }) {
  const S = useStudio();
  const [form, setForm] = useState<string | null>(null);
  return (
    <div className="card tbl-card" data-focus="sec-history">
      <div className="tbl-head">
        <div><h3>Vendor track record with {S.M.client.split(" ").slice(0, 2).join(" ")}</h3>
          <span className="note">Past work with us: quality of similar jobs, warranties honoured, and the satisfaction score plant members give in the annual review. Score = quality 40% + warranties 30% + satisfaction 30%, recent years weighted more.</span></div>
        <button className="btn sm" type="button" onClick={() => setForm(a.vendors[0].name)}>Add annual review</button>
      </div>
      <div className="hist">
        {a.vendors.map(v => {
          const h = mergedHistory(v.name, S.reviews), t = trackScore(h), band = scoreBand(t?.score ?? null);
          const similar = h.projects.filter(p => p.similar).length;
          const lastNote = [...h.reviews].reverse().find(r => r.note)?.note;
          return (
            <div key={v.key} className="hist-card" data-focus={"hist-" + v.key}>
              <div className="hist-top">
                <div><b>{v.name}</b><span className="note">{h.projects.length ? `${h.projects.length} past job${h.projects.length > 1 ? "s" : ""} · ${similar} similar` : "No past work with us"}</span></div>
                {t ? <span className={"hist-score " + band} title="Past-performance score out of 100">{t.score}</span> : <span className="chip">New vendor</span>}
              </div>
              {t ? <>
                <Meter label="Quality of similar work" value={t.quality} max={5} fmt={t.quality.toFixed(1) + " / 5"} />
                <Meter label="Warranties honoured" value={t.warranty} max={1} fmt={t.claims ? `${t.honored} of ${t.claims} claims · ${Math.round(t.warranty * 100)}%` : "No claims raised"} />
                <Meter label="Plant satisfaction (annual review)" value={t.satisfaction} max={10} fmt={t.satisfaction.toFixed(1) + " / 10"} />
                <div className="spark" aria-label="Satisfaction by year">
                  {h.reviews.map((r, i) => <div key={i} className="sp-col" title={`${r.year}: ${r.satisfaction}/10 · ${r.reviewers} reviewers${r.by ? " · " + r.by : ""}`}><i style={{ height: `${r.satisfaction * 10}%` }} className={r.local ? "local" : ""} /><span>{String(r.year).slice(2)}</span></div>)}
                  <span className={"note trend " + (t.trend > 0.2 ? "up" : t.trend < -0.2 ? "down" : "")}>{t.trend > 0.2 ? "▲ improving" : t.trend < -0.2 ? "▼ declining" : "steady"}</span>
                </div>
                {lastNote && <p className="note hist-note">“{lastNote}”</p>}
              </> : <p className="note" style={{ margin: "8px 0" }}>No annual reviews yet. Ask for 2–3 reference sites of similar size and check warranty handling before award.</p>}
              {h.projects.length > 0 && <ul className="hist-proj">{h.projects.map((p, i) => <li key={i}><span className="num">{p.year}</span> {p.work} · <span className="num">{money(p.value)}</span></li>)}</ul>}
            </div>
          );
        })}
      </div>
      <p className="note" style={{ padding: "0 16px 14px", margin: 0 }}>Seed history is illustrative. Reviews you add are saved in this browser and feed the AI verdict.</p>
      {form && <ReviewForm asset={a} initial={form} onClose={() => setForm(null)} />}
    </div>
  );
}

function Meter({ label, value, max, fmt }: { label: string; value: number; max: number; fmt: string }) {
  const pct = Math.max(0, Math.min(1, value / max));
  return <div className="meter"><div className="meter-l"><span>{label}</span><span className="num">{fmt}</span></div><div className="meter-t"><i style={{ width: pct * 100 + "%" }} className={pct >= 0.8 ? "good" : pct >= 0.65 ? "warn" : "bad"} /></div></div>;
}

function ReviewForm({ asset: a, initial, onClose }: { asset: Asset; initial: string; onClose: () => void }) {
  const S = useStudio();
  const [f, setF] = useState({ vendor: initial, year: new Date().getFullYear(), quality: 4, claims: 0, honored: 0, satisfaction: 8, reviewers: 1, by: "", note: "" });
  const [err, setErr] = useState("");
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.type === "number" ? parseFloat(e.target.value) : e.target.value } as any);
  const save = () => {
    if (!(f.quality >= 1 && f.quality <= 5)) return setErr("Quality must be between 1 and 5.");
    if (!(f.satisfaction >= 1 && f.satisfaction <= 10)) return setErr("Satisfaction must be between 1 and 10.");
    if (f.honored > f.claims) return setErr("Warranties honoured can't be more than claims raised.");
    const r: Review = { year: +f.year, quality: +f.quality, claims: +f.claims || 0, honored: +f.honored || 0, satisfaction: +f.satisfaction, reviewers: Math.max(1, +f.reviewers || 1), by: f.by.trim() || undefined, note: f.note.trim() || undefined };
    S.addReview(f.vendor, r); onClose();
  };
  const N = (id: string, label: string, k: string, p: any) => <div className="field"><label htmlFor={id}>{label}</label><input id={id} type="number" value={(f as any)[k]} onChange={set(k)} {...p} /></div>;
  return (
    <div className="modal-bg" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="rvTitle">
        <header><h3 id="rvTitle">Annual vendor review</h3><button className="btn sm ghost" type="button" onClick={onClose}>Close</button></header>
        <div className="body">
          <div className="fgrid2">
            <div className="field"><label htmlFor="rvV">Vendor</label><select id="rvV" value={f.vendor} onChange={set("vendor")}>{a.vendors.map(v => <option key={v.key}>{v.name}</option>)}</select></div>
            {N("rvY", "Review year", "year", { min: 2015, max: 2035, step: 1 })}
            {N("rvQ", "Quality of similar work (1–5)", "quality", { min: 1, max: 5, step: 0.1 })}
            {N("rvS", "Overall satisfaction (1–10)", "satisfaction", { min: 1, max: 10, step: 0.1 })}
            {N("rvC", "Warranty claims raised", "claims", { min: 0, step: 1 })}
            {N("rvH", "Warranty claims honoured", "honored", { min: 0, step: 1 })}
            {N("rvR", "Number of plant reviewers", "reviewers", { min: 1, step: 1 })}
            <div className="field"><label htmlFor="rvB">Reviewed by (name / role)</label><input id="rvB" value={f.by} onChange={set("by")} placeholder="e.g. Plant head, maintenance lead" /></div>
          </div>
          <div className="field"><label htmlFor="rvN">Remarks</label><textarea id="rvN" rows={2} value={f.note} onChange={set("note")} placeholder="What went well or badly this year" /></div>
          {err && <p className="err" style={{ margin: 0 }}>{err}</p>}
        </div>
        <footer><button className="btn ghost" type="button" onClick={onClose}>Cancel</button><button className="btn primary" type="button" onClick={save}>Save review</button></footer>
      </div>
    </div>
  );
}
