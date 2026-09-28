"use client";
import React, { useEffect, useState } from "react";
import { useStudio } from "@/lib/store";
import { ASSETS, DEFAULT_MASTER, type Master } from "@/lib/data";

export default function MasterModal({ onClose }: { onClose: () => void }) {
  const { M, setM } = useStudio();
  const [f, setF] = useState<Master>({ ...M, names: { ...M.names } });
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === "Escape" && onClose(); addEventListener("keydown", k); return () => removeEventListener("keydown", k); }, [onClose]);
  const num = (k: keyof Master) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: parseFloat(e.target.value) || 0 } as Master);
  const txt = (k: keyof Master) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value } as Master);
  const saveIt = () => {
    const pos = (v: number, d: number) => (isFinite(v) && v > 0 ? v : d);
    const names: Record<string, string> = {}; ASSETS.forEach(a => { const v = (f.names[a.id] || "").trim(); if (v && v !== a.name) names[a.id] = v; });
    setM({ ...f, client: f.client.trim() || DEFAULT_MASTER.client, factory: f.factory.trim() || DEFAULT_MASTER.factory, location: f.location.trim() || DEFAULT_MASTER.location, fuelPrice: pos(f.fuelPrice, 8000), gcv: pos(f.gcv, 3800), hours: pos(f.hours, 6000), load: Math.min(1, pos(f.load, 0.7)), years: pos(f.years, 5), tariff: pos(f.tariff, 8), names });
    onClose();
  };
  const F = (id: string, label: string, props: any) => <div className="field"><label htmlFor={id}>{label}</label><input id={id} {...props} /></div>;
  return (
    <div className="modal-bg" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="mTitle">
        <header><h3 id="mTitle">Master data</h3><button className="btn sm ghost" type="button" onClick={onClose}>Close</button></header>
        <div className="body">
          <div className="fgrid2">{F("mClient", "Client", { value: f.client, onChange: txt("client") })}{F("mFactory", "Factory name", { value: f.factory, onChange: txt("factory") })}</div>
          {F("mLocation", "Location", { value: f.location, onChange: txt("location") })}
          <div><span className="eyebrow">Asset names</span></div>
          <div className="fgrid2">{ASSETS.map(a => F("mA_" + a.id, a.name, { value: f.names[a.id] ?? a.name, onChange: (e: any) => setF({ ...f, names: { ...f.names, [a.id]: e.target.value } }) }))}</div>
          <div><span className="eyebrow">Evaluation assumptions</span></div>
          <div className="fgrid2">
            {F("mFuel", "Biomass briquette price (₹/tonne)", { type: "number", step: 100, value: f.fuelPrice, onChange: num("fuelPrice") })}
            {F("mGcv", "Fuel GCV (kcal/kg)", { type: "number", step: 50, value: f.gcv, onChange: num("gcv") })}
            {F("mHours", "Operating hours per year", { type: "number", step: 100, value: f.hours, onChange: num("hours") })}
            {F("mLoad", "Average load factor (0–1)", { type: "number", step: 0.05, value: f.load, onChange: num("load") })}
            {F("mYears", "Evaluation horizon (years)", { type: "number", step: 1, value: f.years, onChange: num("years") })}
            {F("mTariff", "Grid tariff avoided (₹/kWh)", { type: "number", step: 0.1, value: f.tariff, onChange: num("tariff") })}
          </div>
        </div>
        <footer><button className="btn ghost" type="button" onClick={() => setF({ ...DEFAULT_MASTER, names: {} })}>Reset to defaults</button><button className="btn primary" type="button" onClick={saveIt}>Save master data</button></footer>
      </div>
    </div>
  );
}
