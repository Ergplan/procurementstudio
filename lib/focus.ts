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
const ALIAS: Record<string, string[]> = { b3: ["economizer"], b2: ["grate"], b9: ["danblast", "soot blow"], b11: ["chimney", "stack"], b10: ["bag filter", "cyclone", "pollution control"], b7: ["feed pump", "feedwater", "feed water"], b8: ["safety valve", "trims"], b1: ["shell", "smoke tube", "furnace"], b4: ["fuel feed", "screw feeder", "dosing bin"], b14: ["ash"], b15: ["softener", "water treatment"], b16: ["ibr"], p1: ["multihead", "weigher"], p2: ["vffs", "form fill"], s1: ["module", "panels"], s2: ["inverter"], t1: ["coil"], f5: ["oil filter", "filtration"], f8: ["hood", "exhaust"] };

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
