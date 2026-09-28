import { ASSETS, INTEL, TECH, PARTS, SRC, RESEARCH_DATE, type Asset, type Cell, type Master, type Row, type Vendor } from "./data";
import { mergedHistory, trackScore, type Review } from "./history";

export type Disc = Record<string, { lo: number; hi: number; basis?: string; date: string; url?: string; stitle?: string }>;
export type RowO = { id: string; item: string; unit: string; gst: number; q: Record<string, Cell>; bench: any; ref?: string };
export type VOut = { v: Vendor; quoted: number; gst: number; gross: number; gaps: { id: string; item: string; fill: number }[]; gapLoad: number; scopeAdj: number; capF: number; capNorm: number; perUnit: number; lc: number; lcDelta: number; norm: number };
export type Comp = { out: Record<string, VOut>; rows: RowO[]; byQuoted: string[]; byNorm: string[] };

export const money = (n: number | null | undefined) => {
  if (n == null || isNaN(n)) return "–";
  const a = Math.abs(n), s = n < 0 ? "−" : "";
  if (a >= 1e7) return s + "₹" + (a / 1e7).toFixed(2) + " Cr";
  if (a >= 1e5) return s + "₹" + (a / 1e5).toFixed(1) + " L";
  return s + "₹" + Math.round(a).toLocaleString("en-IN");
};
export const rate = (n: number | null | undefined) => (n == null ? "–" : n < 100 ? "₹" + n.toFixed(2) : "₹" + Math.round(n).toLocaleString("en-IN"));
export const rowObj = (r: Row): RowO => ({ id: r[0], item: r[1], unit: r[2], gst: r[3], q: r[4], bench: r[5], ref: r[6] });
export const amt = (c: Cell) => (c ? c[1] * c[2] : null);
export const aName = (a: Asset, M: Master) => M.names[a.id] || a.name;
export const assetById = (id: string) => ASSETS.find(a => a.id === id)!;

export function benchFor(row: RowO, disc: Disc) {
  if (row.bench) return { kind: "web" as const, ...row.bench, srcT: SRC[row.bench.src]?.t, srcU: SRC[row.bench.src]?.u };
  const d = disc[row.id];
  if (d) return { kind: d.url ? ("live" as const) : ("ai" as const), ...d };
  return null;
}
export function benchFlag(row: RowO, cell: Cell, disc: Disc): "good" | "warn" | "bad" | null {
  const b = benchFor(row, disc); if (!b || !cell) return null;
  if (cell[2] > b.hi * 1.08) return "bad";
  if (cell[2] < b.lo * 0.92) return "warn";
  return "good";
}
function lifecycle(a: Asset, v: Vendor, M: Master) {
  const lc = a.lifecycle; if (!lc) return 0;
  if (lc.type === "fuel") { const heat = (lc.duty || 0) * M.load * M.hours; return heat / (M.gcv * ((v.eff || 80) / 100)) / 1000 * M.fuelPrice * M.years; }
  return -((v.yield || 0) * (a.req.cap / 1000) * M.tariff * M.years);
}
export function compute(a: Asset, M: Master): Comp {
  const rows = a.rows.map(rowObj); const out: Record<string, VOut> = {};
  a.vendors.forEach(v => {
    let quoted = 0, gst = 0, gapLoad = 0; const gaps: VOut["gaps"] = [];
    rows.forEach(r => {
      const c = r.q[v.key];
      if (c) { const x = amt(c)!; quoted += x; gst += x * r.gst / 100; }
      else { const others = a.vendors.filter(o => o.key !== v.key && r.q[o.key]).map(o => amt(r.q[o.key])!); const fill = others.length ? Math.max(...others) : 0; gapLoad += fill; gaps.push({ id: r.id, item: r.item, fill }); }
    });
    const scopeAdj = quoted + gapLoad, capF = Math.pow(a.req.cap / v.cap, a.scaleExp);
    out[v.key] = { v, quoted, gst, gross: quoted + gst, gaps, gapLoad, scopeAdj, capF, capNorm: scopeAdj * capF, perUnit: scopeAdj / v.cap, lc: lifecycle(a, v, M), lcDelta: 0, norm: 0 };
  });
  const minLc = Math.min(...a.vendors.map(v => out[v.key].lc));
  a.vendors.forEach(v => { const o = out[v.key]; o.lcDelta = o.lc - minLc; o.norm = o.capNorm + o.lcDelta; });
  const byQuoted = [...a.vendors].sort((x, y) => out[x.key].quoted - out[y.key].quoted).map(v => v.key);
  const byNorm = [...a.vendors].sort((x, y) => out[x.key].norm - out[y.key].norm).map(v => v.key);
  return { out, rows, byQuoted, byNorm };
}

// ---- compact data packs for the AI
export function trackFor(name: string, reviews: Record<string, Review[]> = {}) {
  const h = mergedHistory(name, reviews), t = trackScore(h);
  if (!t) return { past_work_with_us: "none (new vendor)" };
  return { past_work_with_us: h.projects.map(p => `${p.year}: ${p.work}`), score_0_100: t.score, quality_of_similar_work_5: +t.quality.toFixed(1), warranties_honoured: `${t.honored}/${t.claims}`, plant_satisfaction_10: +t.satisfaction.toFixed(1), satisfaction_trend: t.trend > 0.2 ? "improving" : t.trend < -0.2 ? "declining" : "steady", review_notes: h.reviews.filter(r => r.note).map(r => `${r.year}: ${r.note}`) };
}
export function aiContext(a: Asset, M: Master, disc: Disc, reviews: Record<string, Review[]> = {}) {
  const c = compute(a, M);
  return {
    factory: M.factory, client: M.client + " (snacks & bhujia manufacturer, India)", asset: aName(a, M), requirement: a.req.text,
    market_note: a.marketNote, research_date: RESEARCH_DATE,
    assumptions: a.lifecycle ? (a.lifecycle.type === "fuel" ? { fuel_price_per_t: M.fuelPrice, gcv: M.gcv, hours: M.hours, load: M.load, years: M.years } : { tariff: M.tariff, years: M.years }) : undefined,
    vendors: a.vendors.map(v => {
      const o = c.out[v.key];
      return { vendor: v.name, offer: v.offer, capacity: v.cap + " " + a.capUnit, efficiency_pct: v.eff, yield_kwh_per_kwp: v.yield, lead: v.lead, warranty: v.warranty, payment_terms: v.payment, quoted_ex_gst: Math.round(o.quoted), incl_gst: Math.round(o.gross), not_quoted: o.gaps.map(g => g.item), per_unit: +o.perUnit.toFixed(2) + " " + a.capUnitLabel, normalized_total: Math.round(o.norm), intel: INTEL[v.name] ? { rating: INTEL[v.name].rating, flags: INTEL[v.name].flags, strengths: INTEL[v.name].plus } : null, track_record_with_us: trackFor(v.name, reviews) };
    }),
    boq: c.rows.map(r => { const b = benchFor(r, disc); return { id: r.id, item: r.item, unit: r.unit, quotes: Object.fromEntries(a.vendors.map(v => [v.name, r.q[v.key] ? { spec: r.q[v.key]![0], qty: r.q[v.key]![1], rate: r.q[v.key]![2] } : "not quoted"])), market: b ? { lo: b.lo, hi: b.hi, source: b.kind } : null }; }),
    tech_sheet: (TECH[a.id] || []).map(t => ({ parameter: t[0], requirement: t[1], offers: Object.fromEntries(a.vendors.map(v => [v.name, `${t[2][v.key]} (${t[3][v.key]})`])) })),
  };
}
export function portfolio(M: Master, reviews: Record<string, Review[]> = {}) {
  return ASSETS.map(a => { const c = compute(a, M); return { id: a.id, asset: aName(a, M), requirement: a.req.text, vendors: a.vendors.map(v => { const o = c.out[v.key]; return { vendor: v.name, offer: v.offer, quoted_ex_gst: Math.round(o.quoted), normalized: Math.round(o.norm), rank_quoted: c.byQuoted.indexOf(v.key) + 1, rank_normalized: c.byNorm.indexOf(v.key) + 1, not_quoted: o.gaps.map(g => g.item), flags: INTEL[v.name]?.flags, track_score: trackScore(mergedHistory(v.name, reviews))?.score ?? "new vendor" }; }) }; });
}
export function partInfo(a: Asset, pid: string) {
  const r = a.rows.find(x => x[0] === pid); if (!r) return null;
  return { id: pid, item: r[1], unit: r[2], about: PARTS[pid]?.about, check: PARTS[pid]?.check, quotes: Object.fromEntries(a.vendors.map(v => [v.name, r[4][v.key] ? { spec: r[4][v.key]![0], qty: r[4][v.key]![1], rate: r[4][v.key]![2], amount: amt(r[4][v.key]) } : "not quoted"])) };
}
