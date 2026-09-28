// Isometric SVG site plan (string-built for crisp, lightweight rendering).
// @ts-nocheck
import { ASSETS, type Master } from "./data";
import { compute, money, aName, type Comp } from "./calc";
const esc = (s: any) => String(s ?? "").replace(/[&<>"']/g, (c: string) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" } as any)[c]);
// ===== isometric scene =====
const S = 5.2, CX = 0.866, OX = 442, OY = 28;
const P = (x, y, z = 0) => [OX + (x - y) * CX * S, OY + (x + y) * 0.5 * S - z * S];
const pts = arr => arr.map(p => p.map(n => n.toFixed(1)).join(",")).join(" ");
function poly(points, fill, extra = "") { return `<polygon points="${pts(points)}" style="fill:${fill}" ${extra}/>`; }
function box(x, y, z, w, d, h, m, extra = "") {
  const top = [P(x, y, z + h), P(x + w, y, z + h), P(x + w, y + d, z + h), P(x, y + d, z + h)];
  const left = [P(x, y + d, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x, y + d, z + h)];
  const right = [P(x + w, y, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x + w, y, z + h)];
  return `<g ${extra}>${poly(left, `var(--${m}-l)`)}${poly(right, `var(--${m}-r)`)}${poly(top, `var(--${m}-t)`)}</g>`;
}
function line(a, b, stroke, w = 1.2, extra = "") { return `<line x1="${a[0].toFixed(1)}" y1="${a[1].toFixed(1)}" x2="${b[0].toFixed(1)}" y2="${b[1].toFixed(1)}" style="stroke:${stroke}" stroke-width="${w}" ${extra}/>`; }
function railing(x, y, z, w, d, color = "var(--ylw)") {
  let s = ""; const h = 1.1;
  const c = [[x, y], [x + w, y], [x + w, y + d], [x, y + d], [x, y]];
  for (let i = 0; i < 4; i++) { s += line(P(c[i][0], c[i][1], z + h), P(c[i + 1][0], c[i + 1][1], z + h), color, 1.4); }
  for (let i = 0; i < 4; i++) { s += line(P(c[i][0], c[i][1], z), P(c[i][0], c[i][1], z + h), color, 1.2); }
  return s;
}
function pvArray(x0, y0, x1, y1, z) {
  let s = ""; const pw = 3.2, pd = 1.7, gx = 0.35, gy = 0.9;
  for (let y = y0; y + pd <= y1; y += pd + gy) for (let x = x0; x + pw <= x1; x += pw + gx) {
    s += `<polygon points="${pts([P(x, y, z + 0.5), P(x + pw, y, z + 0.5), P(x + pw, y + pd, z), P(x, y + pd, z)])}" style="fill:var(--pv);stroke:var(--pv-edge)" stroke-width=".5"/>`;
  }
  return s;
}
function tree(x, y, r = 2.2) { const c = P(x, y, 0); return `<ellipse cx="${c[0]}" cy="${c[1]}" rx="${r * S * 0.9}" ry="${r * S * 0.45}" fill="rgba(0,0,0,.08)"/><circle cx="${c[0]}" cy="${(c[1] - r * S * 0.9).toFixed(1)}" r="${(r * S * 0.75).toFixed(1)}" style="fill:var(--tree)"/><circle cx="${(c[0] + 3).toFixed(1)}" cy="${(c[1] - r * S * 1.05).toFixed(1)}" r="${(r * S * 0.45).toFixed(1)}" style="fill:var(--tree2)"/>`; }
function pile(x, y, w, d, h) {
  const a = P(x, y + d, 0), b = P(x + w, y + d, 0), c = P(x + w, y, 0), t = P(x + w / 2, y + d / 2, h);
  return `<polygon points="${pts([a, b, t])}" style="fill:var(--fuel-l)"/><polygon points="${pts([b, c, t])}" style="fill:var(--fuel-r)"/>`;
}
function pin(id, x, y, z, label, sub, lift = 26, dx = 0) {
  const p = P(x, y, z);
  const w = Math.max(label.length * 6.6 + 18, sub.length * 6.2 + 18);
  const lx = p[0] + dx, ly = p[1] - lift, top = lift >= 0 ? ly - 36 : ly;
  return `<g class="pinwrap" data-asset="${id}" style="pointer-events:none">
    <line x1="${p[0]}" y1="${p[1]}" x2="${lx}" y2="${ly}" style="stroke:var(--label-bg)" stroke-width="1.2"/>
    <circle class="pin-ring" cx="${p[0]}" cy="${p[1]}" r="6"/><circle class="pin-dot" cx="${p[0]}" cy="${p[1]}" r="5"/>
    <g class="pin-label" transform="translate(${(lx - w / 2).toFixed(1)},${top.toFixed(1)})"><rect width="${w.toFixed(0)}" height="36" rx="6"/>
    <text x="9" y="15">${esc(label)}</text><text class="sub" x="9" y="29">${esc(sub)}</text></g></g>`;
}
function hot(id: string, inner: string, M: Master) { return `<g class="hot" data-asset="${id}" tabindex="0" role="button" aria-label="Open ${esc(aName(ASSETS.find(a => a.id === id)!, M))}">${inner}</g>`; }

export function siteSVG(M: Master): string {
  let s = "";
  // ground plate
  s += box(0, 0, -1.2, 124, 92, 1.2, "g");
  // road
  s += poly([P(0, 82, 0.02), P(124, 82, 0.02), P(124, 89, 0.02), P(0, 89, 0.02)], "var(--road)");
  s += poly([P(116, 0, 0.02), P(123, 0, 0.02), P(123, 82, 0.02), P(116, 82, 0.02)], "var(--road)");
  // --- main processing hall with rooftop PV
  let hall = box(8, 8, 0, 64, 36, 11, "w");
  hall += poly([P(8, 8, 11), P(72, 8, 11), P(72, 44, 11), P(8, 44, 11)], "var(--roof-t)");
  hall += pvArray(10, 10, 70, 42, 11.05);
  // wall ribs
  for (let x = 12; x < 72; x += 6) hall += line(P(x, 44, 0), P(x, 44, 11), "var(--w-r)", .8);
  for (let y = 12; y < 44; y += 6) hall += line(P(72, y, 0), P(72, y, 11), "var(--w-l)", .8);
  // store annex with PV
  let store2 = box(8, 50, 0, 34, 24, 8, "w");
  store2 += poly([P(8, 50, 8), P(42, 50, 8), P(42, 74, 8), P(8, 74, 8)], "var(--roof-t)");
  store2 += pvArray(10, 52, 40, 72, 8.05);
  for (let x = 12; x < 42; x += 6) store2 += line(P(x, 74, 0), P(x, 74, 8), "var(--w-r)", .8);
  s += hot("solar", hall + store2, M);
  // hall door + label
  s += poly([P(30, 44, 0), P(38, 44, 0), P(38, 44, 5), P(30, 44, 5)], "var(--dk-l)");
  s += poly([P(18, 74, 0), P(25, 74, 0), P(25, 74, 4.5), P(18, 74, 4.5)], "var(--dk-l)");

  // --- open production bay (cut-away)
  s += box(48, 50, 0, 40, 28, 0.4, "c");
  s += box(48, 50, 0.4, 40, 0.5, 7, "w");   // back wall (y=50)
  s += box(48, 50.5, 0.4, 0.5, 27.5, 7, "w"); // side wall (x=48)
  // columns
  [[87.4, 50.5], [87.4, 77.4], [48.5, 77.4], [68, 77.4], [87.4, 64]].forEach(c => s += box(c[0], c[1], 0.4, 0.6, 0.6, 7, "c"));
  // roof truss lines (cut-away)
  s += line(P(48, 78, 7.4), P(88, 78, 7.4), "var(--c-r)", 1.4) + line(P(88, 50, 7.4), P(88, 78, 7.4), "var(--c-r)", 1.4);
  // extruder + kneader
  let ex = box(52, 57, 0.4, 5, 5, 2.4, "ss") + box(53, 58, 2.8, 3, 3, 2.2, "ss") + box(53.8, 58.8, 5, 1.4, 1.4, 0.6, "dk");
  ex += box(57.5, 58.3, 0.4, 3.5, 2.4, 1.6, "ss"); // cutter/feed
  s += hot("extruder", ex, M);
  // fryer: long body + hood + conveyor
  let fr = box(61.5, 57, 0.4, 20, 5, 1.9, "ss");
  fr += box(64, 57.6, 2.3, 14, 3.8, 1.3, "ss");
  fr += box(70, 58.6, 3.6, 2, 1.8, 2.2, "dk"); // exhaust stub
  fr += box(81.5, 58, 0.4, 3.5, 3, 1.2, "ss"); // de-oiler
  s += hot("fryer", fr, M);
  // packaging line: platform, weigher, vffs, z-elevator
  let pk = box(72, 67, 0.4, 7, 6, 3.6, "c") + railing(72, 67, 4, 7, 6);
  pk += box(73.5, 68.3, 4, 4, 3.4, 1.8, "ss"); // weigher body
  pk += box(74.3, 69, 5.8, 2.4, 2, 1.3, "ss"); // weigher top cone
  pk += box(73.6, 68.8, 0.4, 3.6, 2.8, 3.6, "ss"); // vffs under platform (visible front)
  pk += box(66, 69, 0.4, 1.4, 1.4, 7.2, "dk"); // z-elevator column
  pk += line(P(67.4, 69.7, 7.4), P(73.5, 69.7, 6), "var(--dk-l)", 2);
  pk += box(79.4, 69.5, 0.4, 6, 1.4, 1, "dk"); // take-off conveyor
  s += hot("packing", pk, M);
  // process flow arrows
  const f1 = P(57, 59.5, 3), f2 = P(62, 59.5, 2.4), f3 = P(84, 59.5, 1.8), f4 = P(83, 66, 1), f5 = P(76, 69.5, 7.3);
  s += `<path class="flow" d="M${f1} L${f2} M${P(64, 59.5, 3.7)} L${P(80, 59.5, 3.7)} M${f3} Q${P(86, 65, 3)} ${f4} M${P(80, 66, 4.5)} Q${P(72, 64, 9)} ${f5}"/>`;

  // --- boiler house (Ultrapac-style)
  let bl = box(90, 10, 0, 22, 22, 0.6, "c");
  bl += box(93, 13, 0.6, 11, 9, 8.8, "blue");                // boiler shell block
  bl += box(94, 14.5, 9.4, 8, 6, 0.4, "dk") + railing(93, 13, 9.4, 11, 9);
  bl += box(105.5, 14, 0.6, 3.6, 4, 10.2, "blue");           // economiser tower
  bl += box(105.3, 13.8, 10.8, 4, 4.4, 1.2, "dk");
  bl += line(P(106.5, 16, 12), P(102, 16, 11.5), "var(--dk-l)", 3);
  bl += box(99, 22, 0.6, 5, 5, 3.5, "dk");                   // dosing bin / feeder
  bl += box(99.5, 22.5, 4.1, 4, 4, 2.4, "dk");
  bl += railing(93, 22, 5, 7, 5); // mid platform
  // staircase
  for (let i = 0; i < 7; i++) bl += line(P(92 - i * .3, 23 + i * .9, 5 - i * 0.7), P(92 - i * .3 - 1.4, 23 + i * .9, 5 - i * 0.7), "var(--ylw)", 1.6);
  // chimney
  bl += box(109.5, 25, 0.6, 1.8, 1.8, 30, "dk");
  bl += box(109.3, 24.8, 30.6, 2.2, 2.2, 0.6, "dk");
  bl += line(P(107, 18, 11.5), P(110, 25.5, 11), "var(--dk-l)", 3.5);
  bl += box(91, 26.5, 0.6, 3, 3, 2.3, "c"); // FW pumps
  s += hot("boiler", bl, M);
  // steam header to production bay
  s += `<path d="M${P(93, 20, 7)} L${P(88, 20, 7)} L${P(88, 52, 6.8)} L${P(84, 55, 3)}" fill="none" style="stroke:var(--blue-l)" stroke-width="2.4" stroke-linecap="round" opacity=".85"/>`;

  // --- thermic fluid heater
  let th = box(92, 40, 0, 14, 11, 0.6, "c");
  th += box(94, 42, 0.6, 6, 6, 4.4, "or");    // heater
  th += box(100.8, 42.5, 0.6, 3, 2.4, 2, "dk"); // pumps
  th += box(101, 45.8, 0.6, 3.5, 3.5, 1.8, "or"); // expansion / storage
  th += box(95.5, 43.5, 5, 3, 3, 1.4, "dk");
  th += box(103.8, 41.2, 0.6, 1.3, 1.3, 16, "dk"); // stack
  s += hot("tfh", th, M);
  // hot oil line to fryer
  s += `<path d="M${P(94, 47, 2.4)} L${P(90, 47, 2.4)} L${P(90, 58, 2.4)} L${P(81.5, 58, 1.6)}" fill="none" style="stroke:var(--or-l)" stroke-width="2.4" stroke-linecap="round"/>`;

  // fuel yard
  s += box(96, 58, 0, 18, 14, 0.4, "c");
  s += pile(98, 60, 7, 5, 3.4) + pile(105, 63, 7, 6, 3.8) + pile(99, 66, 5, 4, 2.6);
  // trees
  [[4, 80], [12, 79], [46, 84.5], [60, 85], [118, 88], [114, 5], [4, 4], [86, 86]].forEach(t => s += tree(t[0], t[1], 2));

  // pins
  const pv: Record<string, Comp> = Object.fromEntries(ASSETS.map(a => [a.id, compute(a, M)]));
  const pinTxt = id => { const a = ASSETS.find(x => x.id === id); const c = pv[id]; return [a.short, "L1 " + money(c.out[c.byQuoted[0]].quoted)]; };
  const pinsDef = [["solar", 40, 26, 12.2, 30, 0], ["extruder", 54.5, 59.5, 5.6, 64, -80], ["fryer", 72, 59.5, 3.6, 54, 70], ["packing", 75.5, 70, 7.2, -46, -70], ["tfh", 97, 45, 5, 30, 20], ["boiler", 98.5, 17.5, 9.8, 30, 0]];
  pinsDef.forEach(pd => { const [l, sb] = pinTxt(pd[0]); s += pin(pd[0], pd[1], pd[2], pd[3], l.replace("Thermic Fluid Heater", "Thermic Fluid Htr"), sb, pd[4], pd[5]); });
  // area labels
  const lab = (x, y, t) => { const p = P(x, y, 0); return `<text x="${p[0]}" y="${p[1]}" text-anchor="middle" style="fill:var(--faint);font:600 10px 'Public Sans',system-ui,sans-serif;letter-spacing:.08em">${t}</text>`; };
  s += lab(68, 80.5, "PRODUCTION BAY · CUT-AWAY") + lab(26, 77, "FG STORE") + lab(104, 75, "BRIQUETTE YARD");
  return s;
}
