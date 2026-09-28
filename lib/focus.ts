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
  solar: ["solar", "rooftop", "photovoltaic", " pv "],
  fryer: ["fryer", "frying"],
  extruder: ["extruder", "extrusion", "bhujia line", "sev machine", "kneader"],
  packing: ["packaging", "packing line", "pouch", "vffs", "multihead", "weigher"],
  tfh: ["thermic", "tfh", "fluid heater"],
  boiler: ["boiler", "steam"],
};
const STOP = new Set(["with", "and", "the", "for", "system", "supply", "including", "initial", "standard", "assembly", "type", "set", "lot", "unit", "units", "per", "from", "into", "plus"]);
const ALIAS: Record<string, string[]> = { b3: ["economizer"], b2: ["grate"], b9: ["danblast", "online soot"], b11: ["chimney", "stack"], b10: ["bag filter", "cyclone", "pollution control"], b7: ["feed pump", "feedwater", "feed water"], b8: ["safety valve", "trims"], b1: ["shell", "smoke tube", "furnace"], b4: ["fuel feed", "screw feeder", "dosing bin"], b14: ["ash"], b15: ["softener", "water treatment"], b16: ["ibr"], p1: ["multihead", "weigher"], p2: ["vffs", "form fill"], s1: ["module", "panels"], s2: ["inverter"], t1: ["coil"], f5: ["oil filter", "filtration"], f8: ["hood", "exhaust"] };

type Hit = { kind: "part" | "vendor"; id: string; at: number };
// Builds a matcher that returns the LAST part/vendor mentioned in a piece of text.
export function makeMatcher(a: Asset) {
  const words = new Map<string, string[]>();
  const count = new Map<string, number>();
  a.rows.forEach(r => {
    const ws = Array.from(new Set(r[1].toLowerCase().replace(/[^a-z0-9 -]/g, " ").split(/[\s/,&()]+/).filter(w => w.length >= 5 && !STOP.has(w))));
    words.set(r[0], ws); ws.forEach(w => count.set(w, (count.get(w) || 0) + 1));
  });
  const partKeys: [string, string][] = [];
  a.rows.forEach(r => { (words.get(r[0]) || []).filter(w => count.get(w) === 1).forEach(w => partKeys.push([w, r[0]])); (ALIAS[r[0]] || []).forEach(w => partKeys.push([w, r[0]])); });
  const vendKeys: [string, string][] = a.vendors.map(v => [v.name.split(/[\s(]/)[0].toLowerCase(), v.key]);
  return (text: string): { part?: string; vendor?: string; about?: string } => {
    const t = " " + text.toLowerCase() + " ";
    let best: Hit | null = null, bestV: Hit | null = null;
    for (const [w, id] of partKeys) { const i = t.lastIndexOf(w); if (i >= 0 && (!best || i > best.at)) best = { kind: "part", id, at: i }; }
    for (const [w, id] of vendKeys) { const i = t.lastIndexOf(w); if (i >= 0 && (!bestV || i > bestV.at)) bestV = { kind: "vendor", id, at: i }; }
    const about = /track record|past (work|performance)|warrant|satisfaction|annual review|history with us|worked with us/.test(t) ? "history" : /reputation|complain|review(s)? online|trustpilot|indiamart/.test(t) ? "intel" : undefined;
    return { part: best?.id, vendor: bestV?.id, about };
  };
}
export function assetFromText(text: string): string | null {
  const t = " " + text.toLowerCase() + " "; let best: [string, number] | null = null;
  for (const [id, ws] of Object.entries(ASSET_WORDS)) for (const w of ws) { const i = t.lastIndexOf(w); if (i >= 0 && (!best || i > best[1])) best = [id, i]; }
  return best ? best[0] : null;
}

// ---------------------------------------------------------------------------
// Synchronised narration: find EVERY mention (part, vendor, figure, section) with its
// character position so the screen can highlight each one as it is spoken.
export type Mention =
  | { at: number; kind: "part"; id: string }
  | { at: number; kind: "vendor"; id: string; about?: "history" | "intel" }
  | { at: number; kind: "figure"; cands: string[]; label: string }
  | { at: number; kind: "section"; id: string };

const SECTION_WORDS: [RegExp, string][] = [
  [/\b(bill of quantities|boq|line items?)\b/g, "sec-boq"],
  [/\b(track record|annual review|past (work|performance)|worked with us)\b/g, "sec-history"],
  [/\b(normali[sz]ed?|normali[sz]ation|like[- ]for[- ]like|verdict|scorecard|homogeni[sz]ed?)\b/g, "sec-ai"],
  [/\b(tech(nical)? sheet|design pressure|specifications? (sheet|table))\b/g, "tech"],
  [/\b(reputation|online reviews?|complaints?|trustpilot|indiamart)\b/g, "sec-intel"],
  [/\b(brochure|drawing)\b/g, "sec-drawing"],
];

function allIdx(t: string, w: string) { const out: number[] = []; let i = t.indexOf(w); while (i >= 0) { out.push(i); i = t.indexOf(w, i + w.length); } return out; }

export function makeScanner(a: Asset) {
  // reuse the part/vendor keyword tables from makeMatcher
  const words = new Map<string, string[]>(), count = new Map<string, number>();
  a.rows.forEach(r => { const ws = Array.from(new Set(r[1].toLowerCase().replace(/[^a-z0-9 -]/g, " ").split(/[\s/,&()]+/).filter(w => w.length >= 5 && !STOP.has(w)))); words.set(r[0], ws); ws.forEach(w => count.set(w, (count.get(w) || 0) + 1)); });
  const partKeys: [string, string][] = [];
  a.rows.forEach(r => { (words.get(r[0]) || []).filter(w => count.get(w) === 1).forEach(w => partKeys.push([w, r[0]])); (ALIAS[r[0]] || []).forEach(w => partKeys.push([w, r[0]])); });
  const vendKeys: [string, string][] = a.vendors.map(v => [v.name.split(/[\s(]/)[0].toLowerCase(), v.key]);

  return (raw: string): Mention[] => {
    const t = raw.toLowerCase(); const out: Mention[] = [];
    for (const [w, id] of partKeys) for (const i of allIdx(t, w)) out.push({ at: i, kind: "part", id });
    for (const [w, id] of vendKeys) for (const i of allIdx(t, w)) {
      const win = t.slice(Math.max(0, i - 60), i + 90);
      const about = /track record|past (work|performance)|warrant|satisfaction|annual review|worked with us|history/.test(win) ? "history" : /reputation|complain|trustpilot|indiamart|online review/.test(win) ? "intel" : undefined;
      out.push({ at: i, kind: "vendor", id, about });
    }
    for (const [re, id] of SECTION_WORDS) { re.lastIndex = 0; let m: RegExpExecArray | null; while ((m = re.exec(t))) out.push({ at: m.index, kind: "section", id }); }
    // figures: ₹ amounts in lakh/crore, percentages, scores, decimals like 10.54
    const fre = /(?:₹|rs\.?\s*|rupees\s*)?(\d{1,3}(?:[.,]\d{1,2})?)\s*(crores?|cr\b|lakhs?|l\b|lacs?|percent|%|out of (?:100|10|5)|\/\s?(?:100|10|5)|kg\/cm|kilograms? per square)?/g;
    let m: RegExpExecArray | null;
    while ((m = fre.exec(t))) {
      const n = parseFloat(m[1].replace(",", ".")), unit = (m[2] || "").trim(); if (!isFinite(n)) continue;
      const hasRs = /₹|rs|rupee/.test(m[0]);
      const c: string[] = [];
      if (/^cr/.test(unit)) c.push(`₹${n.toFixed(2)} Cr`);
      else if (/^l|^lac/.test(unit) && unit !== "") c.push(`₹${n.toFixed(1)} L`);
      else if (/percent|%/.test(unit)) c.push(`${n}%`, `${Math.round(n)}%`);
      else if (/out of|\//.test(unit)) { c.push(Number.isInteger(n) ? `${n}` : n.toFixed(1)); }
      else if (/kg/.test(unit) || /[.,]\d/.test(m[1])) c.push(m[1].replace(",", "."));
      else if (hasRs) continue; else continue;
      if (n >= 1900 && n <= 2100) continue; // years
      out.push({ at: m.index, kind: "figure", cands: c, label: m[0].trim() });
    }
    return out.sort((x, y) => x.at - y.at);
  };
}

export function inView(el: Element) { const r = el.getBoundingClientRect(); return r.top >= 70 && r.bottom <= window.innerHeight - 20; }
export function flashEl(el: HTMLElement, cls = "focus-flash", scroll: "always" | "ifNeeded" = "ifNeeded", block: ScrollLogicalPosition = "center") {
  if (scroll === "always" || !inView(el)) el.scrollIntoView({ behavior: "smooth", block });
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
