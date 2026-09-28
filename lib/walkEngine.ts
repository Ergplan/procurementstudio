// Low-res wireframe 3D engine for equipment walkthroughs. Each BoQ row id is a pickable part.
import * as THREE from "three";
import type { Asset } from "./data";

export type View = { n: string; pos: number[]; tgt: number[]; walk: boolean };
export type EngineCb = { onSelect: (pid: string | null) => void; onHover: (pid: string | null) => void; onMode: (m: "orbit" | "walk") => void };
type Part = { id: string; g: THREE.Group; f: THREE.MeshLambertMaterial[]; l: THREE.LineBasicMaterial[]; box?: THREE.Box3; c?: THREE.Vector3; size?: number; n?: number; el?: HTMLButtonElement };

export const TOUR: Record<string, string[]> = { boiler: ["b4", "b2", "b5", "b1", "b9", "b8", "b7", "b15", "b3", "b6", "b10", "b11", "b14", "b12", "b13", "b16"] };
const COLK: Record<string, string> = { shell: "--blue-l", steel: "--ss-l", dark: "--dk-t", orange: "--or-t", pv: "--pv-l", ylw: "--ylw", conc: "--c-l", fuel: "--fuel", wall: "--w-l" };
const cssv = (k: string) => getComputedStyle(document.documentElement).getPropertyValue(k).trim() || "#888888";
const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

export function createEngine(host: HTMLDivElement, labels: HTMLDivElement, cb: EngineCb) {
  const S: any = { parts: [] as Part[], meshes: [] as THREE.Mesh[], sel: null as string | null, mode: "orbit", solid: false, views: [] as View[], keys: {} as Record<string, boolean>, hold: null as null | (() => void), anim: null as any, asset: null as Asset | null, raf: 0, alive: true };
  const r = new THREE.WebGLRenderer({ antialias: true });
  r.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  host.appendChild(r.domElement);
  const cam = new THREE.PerspectiveCamera(50, 1, 0.05, 400);
  const pos = new THREE.Vector3(), tgt = new THREE.Vector3();
  let scene: THREE.Scene | null = null, staticG: THREE.Group | null = null, home = { pos: new THREE.Vector3(), tgt: new THREE.Vector3() };

  // ---- camera
  const sph = (v: THREE.Vector3) => { const rr = v.length(); return { r: rr, th: Math.atan2(v.x, v.z), ph: Math.acos(Math.max(-1, Math.min(1, v.y / rr))) }; };
  const fromSph = (s: any) => new THREE.Vector3(s.r * Math.sin(s.ph) * Math.sin(s.th), s.r * Math.cos(s.ph), s.r * Math.sin(s.ph) * Math.cos(s.th));
  const stop = () => (S.anim = null);
  function orbit(dx: number, dy: number) { stop(); const s = sph(pos.clone().sub(tgt)); s.th -= dx * 0.006; s.ph = Math.max(0.08, Math.min(Math.PI - 0.08, s.ph - dy * 0.006)); pos.copy(tgt).add(fromSph(s)); }
  function look(dx: number, dy: number) { stop(); const s = sph(tgt.clone().sub(pos)); s.th -= dx * 0.005; s.ph = Math.max(0.1, Math.min(Math.PI - 0.1, s.ph - dy * 0.005)); s.r = 1; tgt.copy(pos).add(fromSph(s)); }
  function zoom(f: number) { stop(); const off = pos.clone().sub(tgt).multiplyScalar(f); if (off.length() < 0.6) off.setLength(0.6); if (off.length() > 120) off.setLength(120); pos.copy(tgt).add(off); }
  function pan(dx: number, dy: number) { stop(); const d = pos.distanceTo(tgt) * 0.0016; const right = new THREE.Vector3().subVectors(tgt, pos).cross(cam.up).normalize(); const m = right.multiplyScalar(-dx * d).add(new THREE.Vector3(0, dy * d, 0)); pos.add(m); tgt.add(m); }
  function walk(fwd: number, side: number, up: number) { stop(); const dir = tgt.clone().sub(pos); const flat = new THREE.Vector3(dir.x, 0, dir.z).normalize(); const right = new THREE.Vector3().crossVectors(flat, new THREE.Vector3(0, 1, 0)).normalize(); const m = flat.multiplyScalar(fwd).add(right.multiplyScalar(side)).add(new THREE.Vector3(0, up, 0)); pos.add(m); tgt.add(m); }
  function flyTo(p: THREE.Vector3, t: THREE.Vector3, ms = 900) { S.anim = { p0: pos.clone(), t0: tgt.clone(), p1: p.clone(), t1: t.clone(), s: performance.now(), ms }; }

  // ---- input
  const cv = r.domElement; cv.tabIndex = 0; cv.setAttribute("aria-label", "3D equipment model. Drag to rotate, scroll to zoom, click a part.");
  let down: any = null, moved = 0, hoverT = 0;
  const ray = new THREE.Raycaster(), mv = new THREE.Vector2();
  function pickAt(e: PointerEvent) { const b = cv.getBoundingClientRect(); mv.set((e.clientX - b.left) / b.width * 2 - 1, -(e.clientY - b.top) / b.height * 2 + 1); ray.setFromCamera(mv, cam); const hit = ray.intersectObjects(S.meshes, false)[0]; return hit ? (hit.object.userData.pid as string) : null; }
  cv.addEventListener("pointerdown", e => { down = { x: e.clientX, y: e.clientY, b: e.button, sh: e.shiftKey }; moved = 0; cv.setPointerCapture(e.pointerId); cv.focus({ preventScroll: true }); });
  cv.addEventListener("pointermove", e => {
    if (!down) { const now = performance.now(); if (now - hoverT < 60) return; hoverT = now; const pid = pickAt(e); cv.style.cursor = pid ? "pointer" : S.mode === "walk" ? "crosshair" : "grab"; cb.onHover(pid); return; }
    const dx = e.clientX - down.x, dy = e.clientY - down.y; moved += Math.abs(dx) + Math.abs(dy); down.x = e.clientX; down.y = e.clientY;
    if (down.b === 2 || down.sh) pan(dx, dy); else if (S.mode === "orbit") orbit(dx, dy); else look(dx, dy);
  });
  cv.addEventListener("pointerup", e => { if (down && moved < 6) { const pid = pickAt(e); if (pid) api.select(pid, false); else if (S.sel) api.select(null); } down = null; });
  cv.addEventListener("contextmenu", e => e.preventDefault());
  cv.addEventListener("wheel", e => { e.preventDefault(); if (S.mode === "orbit") zoom(e.deltaY > 0 ? 1.12 : 0.89); else walk(e.deltaY > 0 ? -0.6 : 0.6, 0, 0); }, { passive: false });
  cv.addEventListener("keydown", e => { S.keys[e.key.toLowerCase()] = true; if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(e.key.toLowerCase())) e.preventDefault(); });
  cv.addEventListener("keyup", e => { S.keys[e.key.toLowerCase()] = false; });
  cv.addEventListener("blur", () => (S.keys = {}));
  const ro = new ResizeObserver(resize); ro.observe(host);
  function resize() { const w = host.clientWidth, h = host.clientHeight; if (!w || !h) return; r.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }

  // ---- model helpers
  function mats(ck: string, pid: string | null) {
    const f = new THREE.MeshLambertMaterial({ color: new THREE.Color(cssv(COLK[ck] || ck)), transparent: true, opacity: S.solid ? 0.95 : 0.2, flatShading: true, depthWrite: S.solid, side: THREE.DoubleSide });
    const l = new THREE.LineBasicMaterial({ color: new THREE.Color(pid ? cssv("--ink") : cssv("--faint")), transparent: true, opacity: pid ? 0.8 : 0.45 });
    f.userData.base = f.color.clone(); l.userData.base = l.color.clone(); return { f, l };
  }
  function grp(pid: string): Part { let p = S.parts.find((x: Part) => x.id === pid); if (!p) { p = { id: pid, g: new THREE.Group(), f: [], l: [] }; scene!.add(p.g); S.parts.push(p); } return p; }
  function add(pid: string | null, ck: string, geo: THREE.BufferGeometry, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0) {
    const m = mats(ck, pid); const mesh = new THREE.Mesh(geo, m.f); mesh.position.set(x, y, z); mesh.rotation.set(rx, ry, rz);
    mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 20), m.l));
    if (pid) { const p = grp(pid); p.g.add(mesh); p.f.push(m.f); p.l.push(m.l); mesh.userData.pid = pid; S.meshes.push(mesh); } else staticG!.add(mesh);
    return mesh;
  }
  const BX = (pid: string | null, c: string, w: number, h: number, d: number, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0) => add(pid, c, new THREE.BoxGeometry(w, h, d), x, y, z, rx, ry, rz);
  const CY = (pid: string | null, c: string, rt: number, rb: number, h: number, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0, seg = 10) => add(pid, c, new THREE.CylinderGeometry(rt, rb, h, seg, 1), x, y, z, rx, ry, rz);
  const TO = (pid: string, c: string, R: number, rr: number, x: number, y: number, z: number) => add(pid, c, new THREE.TorusGeometry(R, rr, 4, 14), x, y, z, Math.PI / 2, 0, 0);
  function PIPE(pid: string, c: string, a: number[], b: number[], rad = 0.08) {
    const A = new THREE.Vector3(a[0], a[1], a[2]), B = new THREE.Vector3(b[0], b[1], b[2]), d = B.clone().sub(A);
    const m = add(pid, c, new THREE.CylinderGeometry(rad, rad, d.length(), 6, 1), 0, 0, 0);
    m.position.copy(A.clone().add(B).multiplyScalar(0.5)); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  }
  function RAIL(pid: string, pts: number[][], h = 1.0) {
    const m = mats("ylw", pid); m.l.color = new THREE.Color(cssv("--ylw")); m.l.userData.base = m.l.color.clone(); m.l.opacity = 0.95;
    const arr: number[] = [];
    for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1]; arr.push(a[0], a[1] + h, a[2], b[0], b[1] + h, b[2], a[0], a[1], a[2], a[0], a[1] + h, a[2]); }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(arr, 3));
    const p = grp(pid); p.g.add(new THREE.LineSegments(g, m.l)); p.l.push(m.l);
  }
  const ring = (pid: string, x0: number, x1: number, y: number, z0: number, z1: number) => RAIL(pid, [[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1], [x0, y, z0]]);

  const MODELS: Record<string, () => void> = {
    boiler() {
      BX("b16", "conc", 24, 0.4, 8, 2, 0.2, 0);
      BX("b1", "shell", 7.6, 2.8, 4.8, -0.2, 2.0, 0); CY("b1", "shell", 2.2, 2.2, 7.6, -0.2, 5.2, 0, 0, 0, Math.PI / 2, 14);
      for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) CY("b1", "steel", .1, .1, 7.3, -0.2, 4.3 + i * 0.55, -0.9 + j * 0.9, 0, 0, Math.PI / 2, 5);
      for (let i = 0; i < 8; i++) BX("b2", "dark", 0.85, 0.14, 3.8, -3.4 + i * 0.9, 1.45 - i * 0.09, 0, 0, 0, -0.1);
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) CY("b9", "dark", .09, .09, .6, 3.9, 4.6 + i * .5, -0.6 + j * .6, 0, 0, Math.PI / 2, 6);
      BX("b9", "dark", .4, .4, .4, 4.3, 6.4, -1.2);
      CY("b8", "steel", .15, .15, .9, -2.2, 7.8, 0.5); CY("b8", "steel", .15, .15, .9, -1.6, 7.8, 0.5); BX("b8", "dark", .5, .6, .5, 0.6, 7.7, 0); CY("b8", "steel", .08, .08, 1.6, 3.9, 4.4, 1.8);
      BX("b13", "ylw", 8.6, 0.08, 5.4, -0.2, 7.45, 0); ring("b13", -4.5, 4.1, 7.5, -2.7, 2.7);
      BX("b13", "ylw", 8.6, 0.08, 1.4, -0.2, 3.6, 3.2); RAIL("b13", [[-4.5, 3.6, 3.9], [4.1, 3.6, 3.9]]); BX("b13", "ylw", 0.9, 0.08, 4.4, 5.0, 1.8, 3.2, 0.72, 0, 0);
      BX("b4", "dark", 1.7, 3.0, 1.7, -5.8, 3.6, 0); CY("b4", "dark", 0.85, 0.3, 1.0, -5.8, 1.6, 0, 0, Math.PI / 4, 0, 4); CY("b4", "steel", .35, .35, 2.2, -4.6, 1.3, 0, 0, 0, Math.PI / 2, 8);
      CY("b5", "shell", .65, .65, .55, -6.3, 0.95, 2.6, Math.PI / 2, 0, 0, 12); BX("b5", "dark", 2.2, .5, .5, -5.0, 0.95, 2.3); CY("b5", "shell", .55, .55, .5, -6.3, 0.85, -2.6, Math.PI / 2, 0, 0, 12); BX("b5", "dark", 2.2, .45, .45, -5.0, 2.6, -2.35);
      CY("b14", "steel", .28, .28, 7.2, -0.2, 0.62, -2.9, 0, 0, Math.PI / 2, 8); BX("b14", "dark", 1, 0.8, 0.8, 3.8, 0.8, -2.9);
      BX("b6", "dark", 3.3, .9, .9, 5.4, 7.5, 0);
      BX("b3", "shell", 2.3, 6.2, 2.3, 7.6, 4.0, 0); for (let i = 0; i < 8; i++) CY("b3", "steel", .07, .07, 2.0, 7.6, 1.6 + i * 0.6, 0, 0, 0, i % 2 ? 1.45 : 1.69, 5); CY("b3", "dark", 1.15, 0.2, 0.9, 7.6, 0.45, 0, 0, Math.PI / 4, 0, 4);
      for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { CY("b10", "steel", .45, .45, .9, 10.2 + i, 3.6, -0.5 + j); CY("b10", "steel", .45, .1, 1.3, 10.2 + i, 2.5, -0.5 + j); }
      BX("b10", "steel", 2.2, 3.4, 2.4, 12.8, 3.4, 0); CY("b10", "dark", 1.2, 0.2, 1.0, 12.8, 1.2, 0, 0, Math.PI / 4, 0, 4);
      BX("b6", "dark", 2.4, .7, .7, 9.8, 6.9, 0); PIPE("b6", "dark", [8.8, 6.9, 0], [8.8, 4.3, 0], .3);
      CY("b6", "shell", .7, .7, .6, 13.3, 0.95, 2.4, Math.PI / 2, 0, 0, 12); PIPE("b6", "dark", [12.8, 1.2, 1.1], [13.3, 1.0, 2.1], .25); PIPE("b6", "dark", [13.3, 1.0, 2.6], [14.8, 1.0, 2.6], .3);
      CY("b11", "dark", .6, .8, 15, 15.2, 7.9, 1.2, 0, 0, 0, 10);
      CY("b7", "shell", .25, .25, .9, 5.6, 0.85, 3.3, 0, 0, 0, 8); CY("b7", "shell", .25, .25, .9, 6.4, 0.85, 3.3, 0, 0, 0, 8); PIPE("b7", "steel", [6, 1.2, 3.3], [3.8, 4.5, 2.2], .06);
      CY("b15", "steel", .45, .45, 1.9, 9.2, 1.35, 3.3, 0, 0, 0, 10); CY("b15", "steel", .45, .45, 1.9, 10.3, 1.35, 3.3, 0, 0, 0, 10); CY("b15", "orange", .35, .35, 1.0, 11.4, 0.9, 3.3, 0, 0, 0, 8);
      BX("b12", "dark", 1.8, 2.1, .6, -6.6, 1.45, -3.3);
      S.views = [{ n: "Overview" }, { n: "Walk inside furnace", pos: [-2.8, 2.2, 0.4], tgt: [3, 1.4, 0], walk: true }, { n: "Along the smoke tubes", pos: [-3.7, 4.95, 0.45], tgt: [3, 4.95, 0.45], walk: true }, { n: "Top platform", pos: [-3.5, 8.9, 2], tgt: [2, 7.6, -1], walk: true }];
    },
    solar() {
      BX(null, "wall", 26, 6, 15, 0, 3, 0); BX("s9", "conc", 26.4, .2, 15.4, 0, 6.1, 0);
      for (let rr = 0; rr < 6; rr++) {
        const z = -6 + rr * 2.2;
        for (let c = 0; c < 9; c++) BX("s1", "pv", 2.2, .05, 1.15, -10.4 + c * 2.35, 6.62, z, -0.22, 0, 0);
        BX("s3", "steel", 21.4, .08, .08, -0.9, 6.35, z - .35); BX("s3", "steel", 21.4, .08, .08, -0.9, 6.45, z + .35);
        for (let c = 0; c < 5; c++) BX("s3", "steel", .08, .35, .08, -10.4 + c * 5, 6.4, z + .35);
        if (rr % 2 === 1) BX("s8", "ylw", 21.4, .04, .5, -0.9, 6.24, z + 1.1);
      }
      RAIL("s8", [[-11.5, 6.2, 7.4], [11.5, 6.2, 7.4]], 1.1);
      for (let i = 0; i < 4; i++) BX("s2", "dark", .8, 1, .35, 12.6, 7.0, -5 + i * 3.3);
      BX("s4", "steel", .3, .1, 14, 11.8, 6.3, 0); BX("s4", "steel", .3, 5.8, .1, 12.9, 3.2, 6.6); BX("s4", "steel", 3, .1, .3, 14.2, 0.4, 6.6);
      BX("s5", "dark", 1.6, 2.1, .7, 15.8, 1.05, 6.6);
      [[-12.8, -7.3], [12.8, -7.3], [-12.8, 7.3]].forEach(p => { CY("s6", "steel", .05, .05, 3.2, p[0], 7.8, p[1], 0, 0, 0, 5); CY("s6", "dark", .02, .18, .5, p[0], 9.5, p[1], 0, 0, 0, 5); });
      for (let i = 0; i < 3; i++) CY("s6", "conc", .25, .25, .25, -14.5 + i, 0.12, 8.6);
      CY("s7", "steel", .04, .04, 2.2, 11.5, 7.3, 7.1, 0, 0, 0, 5); BX("s7", "dark", .4, .3, .2, 11.5, 7.6, 7.3); CY("s7", "pv", .15, .15, .05, 11.8, 8.4, 7.1);
      BX("s10", "orange", 1.2, 1.8, .8, -15.5, 0.9, 8.2);
      CY("s11", "steel", .7, .7, 1.2, -11.5, 6.8, -7.0, 0, 0, 0, 10); PIPE("s11", "steel", [-11.5, 6.3, -6.2], [-11.5, 6.3, 6.4], .05);
      BX(null, "conc", 36, .1, 22, 0, -0.05, 2);
      S.views = [{ n: "Overview" }, { n: "Walk the roof", pos: [-11.8, 7.9, 7.0], tgt: [0, 6.6, -2], walk: true }, { n: "Inverter wall", pos: [9.5, 7.8, 3], tgt: [12.6, 7, -2], walk: true }];
    },
    fryer() {
      BX("f9", "conc", 18, .2, 5.5, 0, .1, 0);
      for (let i = 0; i < 6; i++) { BX(null, "steel", .1, .9, .1, -5.5 + i * 2.2, .65, .8); BX(null, "steel", .1, .9, .1, -5.5 + i * 2.2, .65, -.8); }
      BX("f1", "steel", 12.4, .1, 1.8, 0, 1.1, 0); BX("f1", "steel", 12.4, .6, .06, 0, 1.4, .9); BX("f1", "steel", 12.4, .6, .06, 0, 1.4, -.9); BX("f1", "orange", 12.2, .02, 1.7, 0, 1.45, 0);
      BX("f2", "steel", 12.0, .05, 1.5, 0, 1.3, 0); BX("f2", "dark", 12.0, .05, 1.5, 0, 1.62, 0);
      [-5.8, 5.8].forEach(x => [-1, 1].forEach(z => CY("f2", "dark", .08, .08, 1.1, x, 2.2, z, 0, 0, 0, 6)));
      BX("f8", "steel", 12.6, .5, 2.2, 0, 2.75, 0); CY("f8", "steel", .35, .35, 2.2, 0, 4.1, 0, 0, 0, 0, 8); BX("f8", "dark", .8, .6, .8, 0, 5.4, 0);
      BX("f3", "dark", 1.8, 1.3, 1.1, -3, .95, 2.4); for (let i = 0; i < 4; i++) CY("f3", "steel", .06, .06, 1.7, -3, .6 + i * .22, 2.4, 0, 0, Math.PI / 2, 5); PIPE("f3", "orange", [-3, 1.4, 1.85], [-3, 1.4, 0.9], .06);
      CY("f4", "steel", .6, .6, 1.4, -6.8, .9, 2.4, 0, 0, 0, 10); BX("f4", "shell", .5, .4, .4, -5.6, .4, 2.4); PIPE("f4", "steel", [-5.6, .5, 2.4], [-3.9, .8, 2.4], .06);
      CY("f5", "steel", .45, .45, 1.2, 0.5, .8, 2.4, Math.PI / 2, 0, 0, 10); PIPE("f5", "steel", [0.5, 1.1, 1.8], [0.5, 1.3, 0.9], .05);
      BX("f6", "steel", 2.6, .15, 1.3, 7.6, 1.15, 0, 0, 0, -0.18); BX("f6", "dark", .5, .5, .5, 7.6, .6, 0);
      BX("f7", "dark", .9, 1.9, .45, -8.3, 1.15, -2.0); BX(null, "steel", 1.2, .9, 1.2, -6.8, 2.0, 0);
      S.views = [{ n: "Overview" }, { n: "Walk along the fryer", pos: [-8.2, 2.2, 2.2], tgt: [2, 1.4, 0], walk: true }, { n: "Under the hood", pos: [-5.8, 2.2, 0.3], tgt: [4, 1.5, 0], walk: true }];
    },
    extruder() {
      BX("e9", "conc", 12, .2, 5, 0, .1, 0);
      BX("e1", "steel", 1.8, 1, 1.3, -4, .7, 0); CY("e1", "steel", .6, .6, 1.5, -4, 1.6, 0, 0, 0, Math.PI / 2, 10); BX("e1", "dark", .5, .4, .5, -5.2, 1.6, 0);
      BX(null, "steel", 1.6, .1, 1.6, -1, 2.0, 0); [[-1.7, -.7], [-.3, -.7], [-1.7, .7], [-.3, .7]].forEach(p => BX(null, "steel", .1, 1.9, .1, p[0], 1.05, p[1]));
      CY("e2", "steel", .5, .5, 1.6, -1, 2.9, 0, 0, 0, 0, 10); CY("e2", "steel", .95, .5, .8, -1, 4.1, 0, 0, 0, 0, 10); BX("e2", "dark", .6, .5, .6, -1, 3.95, -1.0);
      CY("e3", "orange", .58, .58, .08, -1, 2.06, 0, 0, 0, 0, 16);
      CY("e4", "dark", .42, .42, .05, -1, 1.8, 0, 0, 0, 0, 12); BX("e4", "dark", .9, .02, .06, -1, 1.78, 0, 0, .6, 0);
      BX("e5", "steel", 4, .08, .9, 1.5, 1.2, 0, 0, 0, -0.12);
      CY("e6", "steel", .65, .65, 1.1, 4.2, .85, 1.6, 0, 0, 0, 12);
      CY("e7", "steel", .55, .55, 2.2, 4, 1.35, -1.3, 0, 0, Math.PI / 2 - 0.1, 12);
      BX("e8", "dark", .9, 1.7, .45, -5.2, 1.05, -1.9);
      S.views = [{ n: "Overview" }, { n: "Operator's view", pos: [-3, 2.4, 2.6], tgt: [-0.5, 1.8, 0], walk: true }];
    },
    packing() {
      BX("p9", "conc", 10, .15, 7, 0, .08, 0);
      BX("p5", "steel", 3.2, .1, 3.2, 0, 2.85, 0); [[-1.5, -1.5], [1.5, -1.5], [-1.5, 1.5], [1.5, 1.5]].forEach(p => BX("p5", "steel", .12, 2.7, .12, p[0], 1.5, p[1])); ring("p5", -1.6, 1.6, 2.9, -1.6, 1.6); BX("p5", "steel", .8, .08, 3.2, -2.4, 1.5, 1.2, 0, 0, 0.9);
      BX("p2", "steel", 1.5, 2.4, 1.3, 0, 1.35, 0); CY("p2", "dark", .38, .38, .7, 0, 1.9, -.95, 0, 0, Math.PI / 2, 10);
      CY("p3", "orange", .38, .16, .5, 0, 2.55, .25, 0, 0, 0, 10); CY("p3", "orange", .11, .11, 1.3, 0, 1.75, .25, 0, 0, 0, 8);
      CY("p1", "steel", .5, .5, .7, 0, 3.3, 0, 0, 0, 0, 12); CY("p1", "steel", .25, .75, .6, 0, 4.1, 0, 0, 0, 0, 12);
      for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; BX("p1", "steel", .28, .35, .28, Math.cos(a) * .95, 3.65, Math.sin(a) * .95, 0, -a, 0); }
      BX("p4", "shell", .55, 3.8, .55, -2.9, 2.0, -.6); BX("p4", "shell", 2.1, .45, .55, -2.0, 4.1, -.6); BX("p4", "shell", 1.1, .55, .9, -3.4, .4, -.6);
      BX("p6", "dark", .35, .35, .35, .95, 2.1, .4); BX("p8", "dark", 2.2, .1, .45, 1.8, .55, .5, 0, 0, .22);
      BX("p7", "steel", 1.3, .7, .6, 3.5, .45, .5); BX("p7", "dark", .5, .5, .3, 3.9, 1.0, .1);
      S.views = [{ n: "Overview" }, { n: "On the platform", pos: [-1.2, 4.6, 1.3], tgt: [0.2, 3.6, -0.3], walk: true }, { n: "Under the weigher", pos: [2.4, 1.6, 2.4], tgt: [0, 1.8, 0], walk: true }];
    },
    tfh() {
      BX("t12", "conc", 13, .2, 8, 1, .1, 0); BX("t2", "dark", 2.6, 1.2, 2.6, 0, .8, 0);
      CY("t1", "orange", 1.15, 1.15, 3.4, 0, 3.1, 0, 0, 0, 0, 14); for (let i = 0; i < 6; i++) TO("t1", "steel", .8, .06, 0, 1.8 + i * .5, 0);
      BX("t11", "dark", 1.1, 1.3, 1.1, -2.4, 1.7, 0); CY("t11", "steel", .22, .22, 1.3, -1.6, .9, 0, 0, 0, Math.PI / 2, 8);
      CY("t3", "shell", .45, .45, .4, -1.9, .7, 1.8, Math.PI / 2, 0, 0, 10); CY("t3", "shell", .5, .5, .45, 4.3, .75, -2.2, Math.PI / 2, 0, 0, 10);
      CY("t4", "shell", .22, .22, .7, 2.6, .55, 2.4, 0, 0, Math.PI / 2, 8); CY("t4", "shell", .22, .22, .7, 2.6, .55, 3.1, 0, 0, Math.PI / 2, 8);
      BX("t5", "steel", .1, 2.0, .1, 1.2, 5.0, -.5); BX("t5", "steel", .1, 2.0, .1, 2.4, 5.0, -.5); CY("t5", "orange", .45, .45, 1.8, 1.8, 6.2, -.5, 0, 0, Math.PI / 2, 10); CY("t5", "steel", .3, .3, 1, 3.2, .9, 1.2, 0, 0, 0, 8); CY("t5", "orange", .6, .6, 2.2, 5.2, .8, 2.8, 0, 0, Math.PI / 2, 10);
      for (let i = 0; i < 3; i++) CY("t6", "orange", .3, .3, .9, -3.6 + i * .7, .65, 3.0, 0, 0, 0, 8);
      for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { CY("t7", "steel", .38, .38, .8, 3.2 + i * .85, 2.6, -1.9 + j * .85); CY("t7", "steel", .38, .1, 1.1, 3.2 + i * .85, 1.65, -1.9 + j * .85); }
      PIPE("t7", "dark", [0.9, 4.6, -.4], [3.6, 3.2, -1.5], .25);
      CY("t8", "dark", .45, .6, 11, 6.2, 5.7, -2.2, 0, 0, 0, 10); PIPE("t8", "dark", [4.7, .75, -2.2], [6.0, .75, -2.2], .25);
      BX("t9", "dark", 1, 1.8, .5, -3.6, 1.1, -2.6);
      PIPE("t10", "orange", [1.1, 1.6, .6], [2.6, 1.6, 2.4], .09); PIPE("t10", "orange", [2.6, 1.6, 2.4], [7.2, 1.6, 2.4], .09); PIPE("t10", "orange", [1.1, 4.4, .6], [7.2, 4.4, 1.6], .09); PIPE("t10", "orange", [7.2, 1.6, 2.4], [7.2, 1.6, -3.2], .09); PIPE("t10", "orange", [1.8, 5.7, -.5], [1.3, 4.7, .3], .05);
      S.views = [{ n: "Overview" }, { n: "Pump skid", pos: [4.6, 1.6, 4.8], tgt: [2.2, .8, 1.8], walk: true }, { n: "Inside heater (coil)", pos: [0.25, 3.1, 0.2], tgt: [0, 1.6, -0.3], walk: true }];
    },
  };

  function clear() {
    if (scene) scene.traverse((o: any) => { o.geometry?.dispose?.(); (Array.isArray(o.material) ? o.material : o.material ? [o.material] : []).forEach((m: any) => m.dispose()); });
    S.parts = []; S.meshes = []; S.sel = null; labels.innerHTML = "";
  }
  function paint(p: Part) {
    const sel = S.sel === p.id, dim = !!S.sel && !sel, acc = new THREE.Color(cssv("--accent"));
    p.f.forEach(m => { m.color.copy(sel ? acc : m.userData.base); m.opacity = sel ? (S.solid ? 1 : 0.55) : S.solid ? (dim ? 0.35 : 0.95) : dim ? 0.08 : 0.2; m.depthWrite = S.solid && !dim; });
    p.l.forEach(m => { m.color.copy(sel ? acc : m.userData.base); m.opacity = sel ? 1 : dim ? 0.22 : 0.85; });
  }
  function loop() {
    if (!S.alive) return; S.raf = requestAnimationFrame(loop);
    if (!scene) return;
    const k = S.keys, sp = 0.12;
    if (k.w || k.arrowup) S.mode === "walk" ? walk(sp, 0, 0) : zoom(0.98);
    if (k.s || k.arrowdown) S.mode === "walk" ? walk(-sp, 0, 0) : zoom(1.02);
    if (k.a || k.arrowleft) S.mode === "walk" ? walk(0, -sp, 0) : orbit(-4, 0);
    if (k.d || k.arrowright) S.mode === "walk" ? walk(0, sp, 0) : orbit(4, 0);
    if (k.q) walk(0, 0, sp); if (k.e) walk(0, 0, -sp);
    S.hold?.();
    if (S.anim) { const t = Math.min(1, (performance.now() - S.anim.s) / S.anim.ms), e = ease(t); pos.lerpVectors(S.anim.p0, S.anim.p1, e); tgt.lerpVectors(S.anim.t0, S.anim.t1, e); if (t >= 1) S.anim = null; }
    cam.position.copy(pos); cam.lookAt(tgt); r.render(scene, cam);
    const w = host.clientWidth, h = host.clientHeight;
    S.parts.forEach((p: Part) => {
      const v = p.c!.clone(); v.y = Math.max(p.box!.max.y - 0.1, p.c!.y); v.project(cam);
      const vis = v.z < 1 && Math.abs(v.x) < 1.05 && Math.abs(v.y) < 1.05;
      p.el!.style.display = vis ? "" : "none";
      if (vis) p.el!.style.transform = `translate(${((v.x + 1) / 2 * w - 11).toFixed(0)}px,${((1 - v.y) / 2 * h - 11).toFixed(0)}px)`;
      p.el!.classList.toggle("on", S.sel === p.id);
    });
  }

  const api = {
    load(a: Asset, rowName: (id: string) => string) {
      clear(); S.asset = a;
      scene = new THREE.Scene(); scene.background = new THREE.Color(cssv("--panel2"));
      staticG = new THREE.Group(); scene.add(staticG);
      scene.add(new THREE.HemisphereLight(0xffffff, 0x445566, 2.2)); const dl = new THREE.DirectionalLight(0xffffff, 1.4); dl.position.set(8, 14, 10); scene.add(dl);
      const grid = new THREE.GridHelper(60, 60, new THREE.Color(cssv("--line")), new THREE.Color(cssv("--line2"))); grid.position.y = -0.01; scene.add(grid);
      S.views = []; MODELS[a.id]?.();
      const ids = a.rows.map(rr => rr[0]);
      S.parts.forEach((p: Part) => { p.box = new THREE.Box3().setFromObject(p.g); p.c = p.box.getCenter(new THREE.Vector3()); p.size = p.box.getSize(new THREE.Vector3()).length(); p.n = ids.indexOf(p.id) + 1; });
      S.parts.sort((x: Part, y: Part) => x.n! - y.n!);
      const all = new THREE.Box3(); S.parts.forEach((p: Part) => all.union(p.box!)); if (staticG.children.length) all.union(new THREE.Box3().setFromObject(staticG));
      const c = all.getCenter(new THREE.Vector3()), s = all.getSize(new THREE.Vector3()).length();
      home = { pos: c.clone().add(new THREE.Vector3(0.75, 0.55, 1.0).normalize().multiplyScalar(s * 0.82)), tgt: c.clone().setY(c.y * 0.75) };
      S.views[0] = { n: "Overview", pos: home.pos.toArray(), tgt: home.tgt.toArray(), walk: false };
      pos.copy(home.pos); tgt.copy(home.tgt); S.anim = null;
      S.parts.forEach((p: Part) => { const b = document.createElement("button"); b.type = "button"; b.className = "plabel"; b.textContent = String(p.n); b.title = rowName(p.id); b.setAttribute("aria-label", `Part ${p.n}: ${b.title}`); b.onclick = () => api.select(p.id, true); labels.appendChild(b); p.el = b; });
      api.setMode("orbit", true); resize();
      if (!S.raf) loop();
    },
    views: (): View[] => S.views,
    tourOrder: (): string[] => (S.asset ? TOUR[S.asset.id] || S.asset.rows.map((rr: any) => rr[0]).filter((id: string) => S.parts.find((p: Part) => p.id === id)) : []),
    select(pid: string | null, fly = true) {
      S.sel = pid; S.parts.forEach(paint);
      if (pid && fly) {
        const p = S.parts.find((x: Part) => x.id === pid); if (p) {
          const rad = Math.max(2.8, p.size * 1.5);
          const dir = (S.mode === "walk" ? pos.clone().sub(p.c) : pos.clone().sub(tgt)).normalize(); if (dir.y < 0.15) dir.y = 0.35; dir.normalize();
          if (S.mode === "walk") api.setMode("orbit", true);
          flyTo(p.c.clone().add(dir.multiplyScalar(rad)), p.c.clone());
        }
      }
      cb.onSelect(pid);
    },
    setMode(m: "orbit" | "walk", silent = false) {
      S.mode = m; cv.style.cursor = m === "walk" ? "crosshair" : "grab";
      if (!silent && m === "walk") { const d = tgt.clone().sub(pos); d.setLength(1); tgt.copy(pos).add(d); }
      if (!silent && m === "orbit") { const d = tgt.clone().sub(pos); d.setLength(Math.max(4, home.pos.distanceTo(home.tgt) * 0.4)); tgt.copy(pos).add(d); }
      cb.onMode(m);
    },
    setSolid(v: boolean) { S.solid = v; S.parts.forEach(paint); staticG?.traverse((o: any) => { if (o.material?.isMeshLambertMaterial) { o.material.opacity = v ? 0.95 : 0.16; o.material.depthWrite = v; } }); },
    goView(i: number) { const v = S.views[i]; if (!v) return; api.setMode(v.walk ? "walk" : "orbit", true); flyTo(new THREE.Vector3(...v.pos), new THREE.Vector3(...v.tgt), 1100); },
    home() { api.setMode("orbit", true); api.select(null); flyTo(home.pos, home.tgt); },
    hold(fn: null | "f" | "b" | "l" | "r" | "u" | "d" | "zi" | "zo") {
      const m: Record<string, () => void> = { f: () => walk(.1, 0, 0), b: () => walk(-.1, 0, 0), l: () => look(-5, 0), r: () => look(5, 0), u: () => walk(0, 0, .08), d: () => walk(0, 0, -.08), zi: () => (S.mode === "walk" ? walk(.1, 0, 0) : zoom(.98)), zo: () => (S.mode === "walk" ? walk(-.1, 0, 0) : zoom(1.02)) };
      S.hold = fn ? m[fn] : null;
    },
    dispose() { S.alive = false; cancelAnimationFrame(S.raf); ro.disconnect(); clear(); r.dispose(); r.domElement.remove(); },
  };
  return api;
}
export type Engine = ReturnType<typeof createEngine>;
