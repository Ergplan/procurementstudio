"use client";
import React, { useEffect, useRef, useState } from "react";
import { useStudio } from "@/lib/store";
import { PARTS, TECH, type Asset } from "@/lib/data";
import { aName, amt, benchFlag, benchFor, compute, money, rate, rowObj } from "@/lib/calc";
import { createEngine, type Engine, TOUR } from "@/lib/walkEngine";

export default function Walkthrough({ asset: a }: { asset: Asset }) {
  const S = useStudio();
  const host = useRef<HTMLDivElement>(null), labels = useRef<HTMLDivElement>(null);
  const eng = useRef<Engine | null>(null);
  const [mode, setMode] = useState<"orbit" | "walk">("orbit");
  const [solid, setSolid] = useState(false);
  const [hover, setHover] = useState<string | null>(null);
  const [tour, setTour] = useState(-1);
  const [views, setViews] = useState<string[]>([]);
  const [failed, setFailed] = useState(false);
  const rowName = (id: string) => a.rows.find(r => r[0] === id)?.[1] || id;
  const order = TOUR[a.id] || a.rows.map(r => r[0]);

  useEffect(() => {
    let e: Engine;
    try { e = createEngine(host.current!, labels.current!, { onSelect: pid => S.setSel(pid), onHover: setHover, onMode: setMode }); }
    catch { setFailed(true); return; }
    eng.current = e; e.load(a, rowName); setViews(e.views().map(v => v.n));
    return () => { e.dispose(); eng.current = null; };
  }, [a.id]); // eslint-disable-line

  const step = (d: number, start = false) => { const i = start ? 0 : tour < 0 ? (d > 0 ? 0 : order.length - 1) : Math.max(0, Math.min(order.length - 1, tour + d)); setTour(i); eng.current?.select(order[i], true); return i; };
  // voice agent handles
  S.ctrl.current.showPart = (pid: string) => { if (!a.rows.find(r => r[0] === pid)) return false; eng.current ? eng.current.select(pid, true) : S.setSel(pid); const i = order.indexOf(pid); if (i >= 0) setTour(i); return true; };
  S.ctrl.current.tour = (s) => { const i = s === "start" ? step(1, true) : step(s === "previous" ? -1 : 1); return { idx: i, order }; };
  S.ctrl.current.views = () => views;
  S.ctrl.current.setView = (name: string) => { const i = views.findIndex(v => v.toLowerCase().includes(name.toLowerCase().slice(0, 12))); if (i < 0) return null; eng.current?.goView(i); return views[i]; };

  const hold = (k: any) => ({ onPointerDown: (e: React.PointerEvent) => { e.preventDefault(); eng.current?.hold(k); }, onPointerUp: () => eng.current?.hold(null), onPointerLeave: () => eng.current?.hold(null), onPointerCancel: () => eng.current?.hold(null) });
  return (
    <div className="card walk-card">
      <div className="walk-head">
        <div><span className="eyebrow">Equipment walkthrough · low-res wireframe</span><h3>Walk through every BoQ item</h3><span className="note">{mode === "walk" ? "Walk: W/S or ↑/↓ to move, A/D to strafe, Q/E up/down, drag to look." : "Orbit: drag to rotate, scroll to zoom, shift-drag to pan. Click a part or a number."}</span></div>
        <div className="walk-tools">
          <div className="seg" role="group" aria-label="Camera mode">
            <button type="button" aria-pressed={mode === "orbit"} onClick={() => eng.current?.setMode("orbit")}>Orbit</button>
            <button type="button" aria-pressed={mode === "walk"} onClick={() => eng.current?.setMode("walk")}>Walk inside</button>
          </div>
          <button className="btn sm" type="button" onClick={() => { setSolid(!solid); eng.current?.setSolid(!solid); }}>{solid ? "Wireframe" : "Solid"}</button>
          <button className="btn sm" type="button" onClick={() => { eng.current?.home(); setTour(-1); }}>Reset view</button>
        </div>
      </div>
      <div className="walk-grid">
        <div className="v3col">
          {failed ? <div className="note" style={{ padding: 24 }}>The 3D viewer couldn't start (WebGL unavailable). The part inspector still works from “Show in 3D” in the table.</div> :
            <div id="v3wrap">
              <div id="v3d" ref={host} />
              <div id="v3labels" ref={labels} />
              {hover && <div id="v3hover">{rowName(hover)}</div>}
              {mode === "walk" && <div id="v3pad">
                <button type="button" aria-label="Move up" {...hold("u")}>▲ up</button><button type="button" aria-label="Walk forward" {...hold("f")}>↑</button><button type="button" aria-label="Move down" {...hold("d")}>▼ dn</button>
                <button type="button" aria-label="Turn left" {...hold("l")}>←</button><button type="button" aria-label="Walk back" {...hold("b")}>↓</button><button type="button" aria-label="Turn right" {...hold("r")}>→</button>
              </div>}
              <div className="zoombox"><button type="button" aria-label="Zoom in" {...hold("zi")}>+</button><button type="button" aria-label="Zoom out" {...hold("zo")}>−</button></div>
            </div>}
          <div className="walk-foot">
            <div className="views">{views.map((v, i) => <button key={v} type="button" className="btn sm" onClick={() => eng.current?.goView(i)}>{v}</button>)}</div>
            <div className="tour">
              <button className="btn sm" type="button" disabled={tour <= 0} onClick={() => step(-1)}>← Prev</button>
              <span className="note num">{tour < 0 ? `${order.length} stops` : `Stop ${tour + 1} of ${order.length}`}</span>
              <button className="btn sm accent" type="button" disabled={tour >= order.length - 1} onClick={() => step(1)}>{tour < 0 ? "Start walkthrough" : "Next part →"}</button>
            </div>
          </div>
        </div>
        <aside className="insp" aria-live="polite">{S.sel ? <PartInspector asset={a} pid={S.sel} /> : <TechSheet asset={a} />}</aside>
      </div>
    </div>
  );
}

function Asks({ qs, pid }: { qs: string[]; pid?: string }) {
  const S = useStudio(); const [q, setQ] = useState("");
  return (<>
    <div className="ask-row">{qs.map(x => <button key={x} type="button" className="chip-btn" onClick={() => S.rtAsk.current(x)}>{x}</button>)}</div>
    {pid && <form className="askf" onSubmit={e => { e.preventDefault(); if (q.trim()) { S.rtAsk.current(q.trim()); setQ(""); } }}><label className="sr" htmlFor="askPart">Ask about this part</label><input id="askPart" value={q} onChange={e => setQ(e.target.value)} placeholder="Ask AI Proc Advisory about this part…" /><button className="btn sm primary" type="submit">Ask</button></form>}
  </>);
}

function TechSheet({ asset: a }: { asset: Asset }) {
  const { M } = useStudio(); const t = TECH[a.id] || [];
  return (<>
    <div className="insp-h"><span className="eyebrow">Offered technical specs</span><h3>{aName(a, M)}</h3><p className="note">Click any part in the model, or start the walkthrough, to see its BoQ line, what it does and each vendor's offer.</p></div>
    <div className="scroll"><table className="tech"><thead><tr><th>Parameter</th>{a.vendors.map(v => <th key={v.key}>{v.name.split(" ")[0]}</th>)}</tr></thead><tbody>
      {t.map(r => <tr key={r[0]}><td><b>{r[0]}</b><small>Need: {r[1]}</small></td>{a.vendors.map(v => <td key={v.key}><span className={"dot " + r[3][v.key]} />{r[2][v.key]}</td>)}</tr>)}
    </tbody></table></div>
    <Asks qs={a.id === "boiler" ? ["Which boiler spec is best for our 10.5 kg/cm² working pressure?", "Walk me through the flue-gas path and what each part costs"] : ["Which vendor's specs best fit our requirement?", "What are the weakest specs across the bids?"]} />
  </>);
}

function PartInspector({ asset: a, pid }: { asset: Asset; pid: string }) {
  const S = useStudio(); const r = a.rows.find(x => x[0] === pid); if (!r) return null;
  const row = rowObj(r), info = PARTS[pid] || { about: "", check: "" }, c = compute(a, S.M), b = benchFor(row, S.disc), n = a.rows.indexOf(r) + 1;
  const amts = a.vendors.map(v => amt(row.q[v.key])).filter(x => x != null) as number[], mn = Math.min(...amts);
  return (<>
    <div className="insp-h"><span className="eyebrow">BoQ line {n}{row.ref ? " · brochure " + row.ref : ""}</span><h3>{row.item}</h3></div>
    <p>{info.about}</p>
    {info.check && <div className="checkbox"><span className="eyebrow">What to check</span><p>{info.check}</p></div>}
    <div className="offers">{a.vendors.map(v => { const cell = row.q[v.key];
      if (!cell) return <div key={v.key} className="offer gapo"><b>{v.name}</b><span className="gap">Not quoted, loaded at {money(c.out[v.key].gaps.find(g => g.id === pid)!.fill)}</span></div>;
      const x = amt(cell)!, fl = benchFlag(row, cell, S.disc);
      return <div key={v.key} className={"offer " + (x === mn && amts.length > 1 ? "best" : "")}><div><b>{v.name}</b><span className="note">{cell[0]} · {cell[1].toLocaleString("en-IN")} {row.unit} × {rate(cell[2])}</span></div><span className="num">{fl && <span className={"dot " + fl} />}{money(x)}</span></div>; })}</div>
    <p className="note">{b ? <>Market: <b className="num">{rate(b.lo)}–{rate(b.hi)}</b> per {row.unit}</> : "No market price discovered yet for this line."}</p>
    <Asks pid={pid} qs={["b1", "b7", "b8"].includes(pid) ? ["Which vendor's offer is best for our 10.5 kg/cm² working pressure?", "What could go wrong with this part?"] : ["Which vendor's offer is best here, and why?", "Is this line priced right?", "What should I ask vendors about this part?"]} />
  </>);
}
