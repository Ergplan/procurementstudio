"use client";
import React, { useEffect, useMemo, useState } from "react";
import { StudioProvider, useStudio } from "@/lib/store";
import { ASSETS, RESEARCH_DATE } from "@/lib/data";
import { aName, compute, money } from "@/lib/calc";
import { siteSVG } from "@/lib/iso";
import AssetView from "./AssetView";
import MasterModal from "./MasterModal";
import RealTalk from "./RealTalk";

export default function Studio() {
  return <StudioProvider><Shell /></StudioProvider>;
}

function Shell() {
  const S = useStudio();
  const [master, setMaster] = useState(false);
  // expose navigation to the voice agent
  S.ctrl.current.openAsset = (id: string) => { S.setAssetId(id); try { history.replaceState(null, "", "#" + id); } catch {} window.scrollTo({ top: 0 }); };
  S.ctrl.current.goSite = () => { S.setAssetId(null); try { history.replaceState(null, "", "#site"); } catch {} };
  useEffect(() => { const h = location.hash.slice(1); if (ASSETS.find(a => a.id === h)) S.setAssetId(h); }, []); // eslint-disable-line
  return (
    <>
      <div className="wrap">
        <header className="top">
          <div className="brand">
            <div className="brand-mark" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 18 18"><path d="M9 1 16 5v8l-7 4-7-4V5z" fill="none" stroke="#E3A43A" strokeWidth="1.6" /><path d="M9 1v8m0 0 7-4M9 9 2 5m7 4v8" stroke="#E3A43A" strokeWidth="1.2" opacity=".6" /></svg></div>
            <div><h1>Procurement Studio</h1><small>Capex bid evaluation · Joulewise</small></div>
          </div>
          <div className="ctx">
            <div className="ctx-item"><span className="eyebrow">Client</span><b>{S.M.client}</b></div>
            <div className="ctx-item"><span className="eyebrow">Factory</span><b>{S.M.factory}</b></div>
            <button className="btn" type="button" onClick={() => setMaster(true)}>Master data</button>
          </div>
        </header>
        {S.assetId ? <AssetView key={S.assetId} /> : <Factory />}
      </div>
      {master && <MasterModal onClose={() => setMaster(false)} />}
      <RealTalk />
    </>
  );
}

function Factory() {
  const { M, ctrl } = useStudio();
  const svg = useMemo(() => siteSVG(M), [M]);
  const comps = useMemo(() => Object.fromEntries(ASSETS.map(a => [a.id, compute(a, M)])), [M]);
  const [hl, setHl] = useState<string | null>(null);
  let l1 = 0, h1 = 0;
  ASSETS.forEach(a => { const c = comps[a.id]; l1 += c.out[c.byQuoted[0]].quoted; h1 += c.out[c.byQuoted[2]].quoted; });
  useEffect(() => { document.querySelectorAll("#scene .hot").forEach(g => g.classList.toggle("on", (g as HTMLElement).dataset.asset === hl)); }, [hl, svg]);
  const hit = (e: React.SyntheticEvent) => ((e.target as Element).closest(".hot") as HTMLElement | null)?.dataset.asset;
  return (
    <section>
      <div className="fgrid">
        <div className="card scene-card">
          <div className="scene-head">
            <div><span className="eyebrow">Site plan · isometric</span><h2>{M.factory}</h2><p>{M.location} · snacks &amp; bhujia manufacturing</p></div>
            <div className="legend"><span><i style={{ background: "var(--pv)" }} />Rooftop PV</span><span><i style={{ background: "var(--accent)" }} />Process flow</span><span><i style={{ background: "var(--blue-l)" }} />Steam</span><span><i style={{ background: "var(--or-l)" }} />Thermic fluid</span></div>
          </div>
          <svg id="scene" viewBox="0 0 1010 610" role="img" aria-label="Isometric view of the factory with clickable equipment"
            dangerouslySetInnerHTML={{ __html: svg }}
            onClick={e => { const id = hit(e); if (id) ctrl.current.openAsset(id); }}
            onKeyDown={e => { const id = hit(e); if (id && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); ctrl.current.openAsset(id); } }}
            onMouseOver={e => setHl(hit(e) || null)} onMouseLeave={() => setHl(null)} />
          <div className="scene-note">Click any highlighted equipment, or the rooftop, to open its bid comparison and 3D walkthrough. Not to scale.</div>
        </div>
        <aside className="card asset-list">
          <h3>Open purchase requisitions</h3>
          <div>
            {ASSETS.map(a => { const c = comps[a.id]; return (
              <button key={a.id} type="button" className={"arow" + (hl === a.id ? " on" : "")} onClick={() => ctrl.current.openAsset(a.id)} onMouseEnter={() => setHl(a.id)} onMouseLeave={() => setHl(null)}>
                <span className="nm">{aName(a, M)}</span>
                <span className="rng num"><b>{money(c.out[c.byQuoted[0]].quoted)}</b>to {money(c.out[c.byQuoted[2]].quoted)}</span>
                <span className="cat">{a.req.capLabel} · {a.vendors.length} bids</span>
              </button>); })}
          </div>
          <div className="portfolio">
            <div className="kv"><div className="k">L1 total, 6 packages (ex-GST)</div><div className="v num">{money(l1)}</div></div>
            <div className="kv"><div className="k">Spread L1 → H1</div><div className="v num">+{money(h1 - l1)}</div></div>
          </div>
          <div style={{ padding: "0 16px 16px" }}>
            <p className="demo-note"><span className="chip warn">Sample bids</span><span>Vendor quotes are <b>illustrative demo data</b>. Replace them with received quotations. Market benchmarks and vendor intel were researched on the web on {RESEARCH_DATE}.</span></p>
          </div>
        </aside>
      </div>
    </section>
  );
}
