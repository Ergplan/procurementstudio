"use client";
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_MASTER, type Master } from "./data";
import type { Disc } from "./calc";

export type Health = { text: boolean; web: boolean; voice: boolean; textModel?: string; realtimeModel?: string } | null;
// Imperative handles the voice agent uses to drive the UI.
export type Ctrl = {
  openAsset: (id: string) => void; goSite: () => void;
  showPart?: (pid: string) => boolean; tour?: (step: "next" | "previous" | "start") => { idx: number; order: string[] } | null;
  setView?: (name: string) => string | null; views?: () => string[];
};
type Ctx = {
  M: Master; setM: (m: Master) => void; disc: Disc; setDisc: (d: Disc) => void;
  assetId: string | null; setAssetId: (id: string | null) => void; sel: string | null; setSel: (p: string | null) => void;
  health: Health; ctrl: React.MutableRefObject<Ctrl>; rtAsk: React.MutableRefObject<(q: string) => void>;
};
const C = createContext<Ctx>(null as any);
const load = (k: string) => { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch { return null; } };
const save = (k: string, v: any) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

export function StudioProvider({ children }: { children: React.ReactNode }) {
  const [M, setMs] = useState<Master>(DEFAULT_MASTER);
  const [disc, setDiscS] = useState<Disc>({});
  const [assetId, setAssetId] = useState<string | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  const [health, setHealth] = useState<Health>(null);
  const ctrl = useRef<Ctrl>({ openAsset: () => {}, goSite: () => {} });
  const rtAsk = useRef<(q: string) => void>(() => {});
  useEffect(() => {
    const m = load("ps.master"); if (m) setMs({ ...DEFAULT_MASTER, ...m, names: { ...(m.names || {}) } });
    const d = load("ps.discovered"); if (d) setDiscS(d);
    fetch("/api/health").then(r => r.json()).then(setHealth).catch(() => setHealth({ text: false, web: false, voice: false }));
  }, []);
  const v = useMemo(() => ({ M, setM: (m: Master) => { setMs(m); save("ps.master", m); }, disc, setDisc: (d: Disc) => { setDiscS(d); save("ps.discovered", d); }, assetId, setAssetId: (id: string | null) => { setAssetId(id); setSel(null); }, sel, setSel, health, ctrl, rtAsk }), [M, disc, assetId, sel, health]);
  return <C.Provider value={v}>{children}</C.Provider>;
}
export const useStudio = () => useContext(C);
