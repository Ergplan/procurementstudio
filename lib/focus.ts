// Scroll-and-highlight helpers so the screen follows what the advisor is talking about.
import type { Asset } from "./data";

export function flash(sel: string, block: ScrollLogicalPosition = "center") {
  const el = document.querySelector(sel) as HTMLElement | null;
  if (!el) return false;
  el.scrollIntoView({ behavior: "smooth", block });
  el.classList.remove("focus-flash"); void el.offsetWidth; el.classList.add("focus-flash");
  clearTimeout((el as any)._ft); (el as any)._ft = setTimeout(() => el.classList.remove("focus-flash"), 2800);
  return true;
}

export const SECTIONS: Record<string, string> = {
  vendors: "sec-vendors", walkthrough: "sec-walk", tech_sheet: "sec-walk", boq: "sec-boq", analysis: "sec-ai",
  track_record: "sec-history", vendor_intel: "sec-intel", drawing: "sec-drawing", actions: "sec-actions",
};

export const ASSET_WORDS: Record<string, string[]> = {
  solar: ["solar", "rooftop", "photovoltaic"],
  fryer: ["fryer", "frying line"],
  extruder: ["extruder", "extrusion", "bhujia line", "sev machine", "sev line"],
  packing: ["packaging", "packing line", "pouch line", "vffs", "multihead"],
  tfh: ["thermic fluid heater", "thermic heater", "fluid heater", "tfh"],
  boiler: ["boiler"],
};
// Words too generic to identify one BoQ line: they made the screen jump on ordinary sentences.
const STOP = new Set(["with", "and", "the", "for", "system", "supply", "including", "initial", "standard", "assembly", "type", "set", "lot", "unit", "units", "per", "from", "into", "plus",
  "fryer", "solar", "extruder", "heater", "boiler", "thermic", "fluid", "plant", "panel", "panels", "control", "controls", "installation", "testing", "trial", "commissioning", "erection", "safety", "remote", "monitoring", "online",
  "storage", "feeding", "access", "removal", "approval", "approvals", "level", "switch", "gauge", "valve", "valves", "primary", "secondary", "water", "treatment", "continuous", "upper", "lower", "electrical", "cabling",
  "working", "comprehensive", "years", "body", "plate", "tubes", "tanks", "pumping", "piping", "ducting", "dosing", "screw", "conveyor", "steel", "price", "quote", "vendor", "module", "modules", "collar"]);
const ALIAS: Record<string, string[]> = { b3: ["economiser"], b2: ["grate"], b9: ["danblast", "online soot blowing", "online soot"], b11: ["chimney", "stack"], b10: ["bag filter", "cyclone", "pollution control"], b7: ["feed pump", "feedwater", "feed water"], b8: ["safety valve", "boiler trims", "trims"], b1: ["boiler shell", "shell", "smoke tube", "furnace"], b4: ["fuel feeding", "screw feeder", "dosing bin"], b14: ["ash removal", "ash handling", "ash conveyor"], b15: ["softener", "water treatment"], b16: ["ibr approval", "ibr"], b12: ["plc", "hmi"], b13: ["platform", "staircase"],
  p1: ["multihead", "weigher"], p2: ["vffs", "form fill"], p4: ["elevator"], p7: ["checkweigher", "check weigher"], s1: ["pv module", "solar module", "module"], s2: ["inverter"], s3: ["mounting structure"], s7: ["scada"], s10: ["net metering", "discom"], s11: ["o&m", "operation and maintenance"],
  t1: ["heater coil", "coil"], t4: ["circulation pump", "fluid pump"], t6: ["initial fill", "fluid fill"], b5: ["air fan", "primary air", "secondary air"], b6: ["id fan", "induced draft", "flue gas"], t8: ["chimney", "stack"], t5: ["expansion tank", "deaerator"], f1: ["fryer body", "fryer pan"], f3: ["heat exchanger"], f4: ["oil circulation pump", "oil pump"], f5: ["oil filter", "filtration"], f8: ["fume hood", "hood", "exhaust"], e1: ["kneader", "mixer"], e2: ["extruder head"], e3: ["die plate", "dies"], e7: ["coating drum"], s5: ["acdb", "lt panel"], s9: ["installation"], f2: ["conveyor with lift", "lift conveyor"], f7: ["control panel", "vfd"], f9: ["installation"], e5: ["feed conveyor"], e8: ["electrical panel"], e9: ["installation"], p8: ["take off conveyor", "takeoff conveyor"], t3: ["fd fan", "id fan", "fans"], t11: ["fuel feeding", "fuel feed"], t12: ["erection"] };
const VENDOR_ALIAS: Record<string, string[]> = { "Harikrishna Techno (HKT)": ["hkt"], "Tata Power Solar": ["tata power"] };

// Same-length normalisation so match positions equal character positions in the spoken text.
const norm = (s: string) => s.toLowerCase().replace(/z/g, "s").replace(/[-‑–]/g, " ");
const rx = (w: string) => new RegExp("(?<![a-z0-9])" + norm(w).replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(?:s|es)?(?![a-z0-9])", "g");
function hits(t: string, re: RegExp) { const out: [number, number][] = []; re.lastIndex = 0; let m: RegExpExecArray | null; while ((m = re.exec(t))) { out.push([m.index, m[0].length]); if (!m[0].length) re.lastIndex++; } return out; }

const ASSET_RX: [string, RegExp][] = Object.entries(ASSET_WORDS).flatMap(([id, ws]) => ws.map(w => [id, rx(w)] as [string, RegExp]));
// Distinct packages named in a piece of text, in order of first mention.
export function assetsIn(text: string): string[] {
  const t = norm(text); const first = new Map<string, number>();
  for (const [id, re] of ASSET_RX) for (const [i] of hits(t, re)) if (!first.has(id) || i < first.get(id)!) first.set(id, i);
  return [...first.entries()].sort((a, b) => a[1] - b[1]).map(e => e[0]);
}

// ---------------------------------------------------------------------------
// Synchronised narration: find EVERY mention (part, vendor, figure, section) with its
// character position so the screen can highlight each one as it is spoken.
export type Mention =
  | { at: number; kind: "part"; id: string }
  | { at: number; kind: "vendor"; id: string; about?: "history" | "intel" }
  | { at: number; kind: "figure"; cands: string[]; label: string }
  | { at: number; kind: "section"; id: string };

// Only explicit phrases move the page; everyday words ("line item", "complaint", "drawing") do not.
const SECTION_WORDS: [RegExp, string][] = [
  [/\b(bill of quantities|boq)\b/g, "sec-boq"],
  [/\b(track record|annual reviews?|past (work|performance)|worked with us|history with (us|you))\b/g, "sec-history"],
  [/\b(normali[sz]ed (comparison|total|price)s?|normali[sz]ation|like[- ]for[- ]like|overall verdict|scorecard|homogeni[sz]ed spec(ification)?s?)\b/g, "sec-ai"],
  [/\b(tech(nical)? sheet|technical spec(ification)?s?|spec(ification)? sheet)\b/g, "tech"],
  [/\b(market reputation|online reviews?|vendor intel(ligence)?|trustpilot|indiamart)\b/g, "sec-intel"],
  [/\b(brochure|reference drawing)\b/g, "sec-drawing"],
];
const ABOUT_HIST = /track record|past (work|performance)|warrant(y|ies) (claims?|honou?red)|claims? (were |was )?honou?red|satisfaction|annual review|worked with us|history with/;
const ABOUT_INTEL = /reputation|complaint|trustpilot|indiamart|online review/;

export function makeScanner(a: Asset) {
  const words = new Map<string, string[]>(), count = new Map<string, number>();
  a.rows.forEach(r => { const ws = Array.from(new Set(norm(r[1]).replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(w => w.length >= 5 && !STOP.has(w)))); words.set(r[0], ws); ws.forEach(w => count.set(w, (count.get(w) || 0) + 1)); });
  const partKeys: [RegExp, string][] = [];
  a.rows.forEach(r => { (words.get(r[0]) || []).filter(w => count.get(w) === 1).forEach(w => partKeys.push([rx(w), r[0]])); (ALIAS[r[0]] || []).forEach(w => partKeys.push([rx(w), r[0]])); });
  const vendKeys: [RegExp, string][] = a.vendors.flatMap(v => [v.name.split(/[\s(]/)[0], ...(VENDOR_ALIAS[v.name] || [])].map(w => [rx(w), v.key] as [RegExp, string]));

  return (raw: string): Mention[] => {
    const t = norm(raw); const out: Mention[] = [];
    // parts: where two keys overlap ("fryer body" vs "body"), the longest phrase wins
    const ph: { at: number; len: number; id: string }[] = [];
    for (const [re, id] of partKeys) for (const [i, len] of hits(t, re)) ph.push({ at: i, len, id });
    ph.sort((x, y) => y.len - x.len);
    const kept: typeof ph = [];
    for (const h of ph) if (!kept.some(k => h.at < k.at + k.len && k.at < h.at + h.len)) kept.push(h);
    kept.forEach(h => out.push({ at: h.at, kind: "part", id: h.id }));
    const seenV = new Set<number>();
    for (const [re, id] of vendKeys) for (const [i] of hits(t, re)) {
      if (seenV.has(i)) continue; seenV.add(i);
      // judge "track record / reputation" context within the vendor's own sentence only
      const s0 = Math.max(t.lastIndexOf(". ", i), t.lastIndexOf("? ", i), t.lastIndexOf("\n", i)) + 1; let s1 = t.slice(i).search(/[.?!](\s|$)|\n/); s1 = s1 < 0 ? t.length : i + s1;
      const win = t.slice(Math.max(s0, i - 60), Math.min(s1, i + 110));
      const about = ABOUT_HIST.test(win) ? "history" : ABOUT_INTEL.test(win) ? "intel" : undefined;
      out.push({ at: i, kind: "vendor", id, about });
    }
    for (const [re, id] of SECTION_WORDS) for (const [i] of hits(raw.toLowerCase(), re)) out.push({ at: i, kind: "section", id });
    const tf = raw.toLowerCase();
    // figures: ₹ amounts in lakh/crore, percentages, scores, decimals like 10.54
    const fre = /(?:₹|rs\.?\s*|rupees\s*)?(\d{1,3}(?:[.,]\d{1,2})?)\s*(crores?|cr\b|lakhs?|l\b|lacs?|percent|%|out of (?:100|10|5)|\/\s?(?:100|10|5)|kg\/cm|kilograms? per square)?/g;
    let m: RegExpExecArray | null;
    while ((m = fre.exec(tf))) {
      const n = parseFloat(m[1].replace(",", ".")), unit = (m[2] || "").trim(); if (!isFinite(n)) continue;
      const hasRs = /₹|rs|rupee/.test(m[0]);
      const c: string[] = [];
      if (/^cr/.test(unit)) c.push(`₹${n.toFixed(2)} Cr`);
      else if (/^l|^lac/.test(unit) && unit !== "") c.push(`₹${n.toFixed(1)} L`);
      else if (/percent|%/.test(unit)) c.push(`${n}%`, `${Math.round(n)}%`);
      else if (/out of|\//.test(unit)) { c.push(Number.isInteger(n) ? `${n}` : n.toFixed(1)); }
      else if (/kg/.test(unit) || /[.,]\d/.test(m[1])) c.push(m[1].replace(",", "."));
      else if (hasRs) continue; else continue;
      out.push({ at: m.index, kind: "figure", cands: c, label: m[0].trim() });
    }
    return out.sort((x, y) => x.at - y.at);
  };
}

export function inView(el: Element) { const r = el.getBoundingClientRect(); return r.top >= 70 && r.bottom <= window.innerHeight - 20; }
// A tall section (walkthrough, BoQ) never fits fully on screen; "visible" means it fills a good part of the viewport.
export function visible(el: Element) {
  const r = el.getBoundingClientRect(), vh = window.innerHeight; if (!r.height) return false;
  const shown = Math.min(r.bottom, vh) - Math.max(r.top, 70);
  return shown >= Math.min(r.height, (vh - 70) * 0.45);
}
export function flashEl(el: HTMLElement, cls = "focus-flash", scroll: "always" | "ifNeeded" | "never" = "ifNeeded", block: ScrollLogicalPosition = "center") {
  if (scroll === "always" || (scroll === "ifNeeded" && !inView(el))) el.scrollIntoView({ behavior: "smooth", block });
  el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls);
  clearTimeout((el as any)["_t" + cls]); (el as any)["_t" + cls] = setTimeout(() => el.classList.remove(cls), 2600);
}
// Find the on-screen element that displays a spoken figure, preferring the region already in focus.
export function findFigure(cands: string[], scope: Element | null): HTMLElement | null {
  const root = document.querySelector("main, section") || document.body;
  const sel = "td, .big, .v, .num, .hist-score, .offer, .meter-l span, .chip, .tech td, .kv, b";
  const pick = (base: Element) => {
    const hits: HTMLElement[] = [];
    base.querySelectorAll<HTMLElement>(sel).forEach(el => { const tx = (el.textContent || "").replace(/\s+/g, " "); if (cands.some(c => tx.includes(c))) hits.push(el); });
    // keep the innermost matches
    return hits.filter(h => !hits.some(o => o !== h && h.contains(o)));
  };
  if (scope) { const h = pick(scope); if (h.length) return h.find(inView) || h[0]; }
  const h = pick(root); if (!h.length) return null;
  return h.find(inView) || h[0];
}
