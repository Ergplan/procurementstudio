"use client";
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_MASTER, type Master } from "./data";
import type { Disc } from "./calc";
import type { Review } from "./history";

export type Health = { text: boolean; web: boolean; voice: boolean; textModel?: string; realtimeModel?: string; host?: "vercel" | "local"; vercelEnv?: string | null; keyVar?: string | null; similarVars?: string[]; unreachable?: boolean } | null;
// Imperative handles the voice agent uses to drive the UI.
export type Ctrl = {
  openAsset: (id: string) => void; goSite: () => void;
  showPart?: (pid: string) => boolean; tour?: (step: "next" | "previous" | "start") => { idx: number; order: string[] } | null;
  setView?: (name: string) => string | null; views?: () => string[];
  runAi?: (kind: "brief" | "norm" | "homog" | "verdict") => void;
};
type Ctx = {
  M: Master; setM: (m: Master) => void; disc: Disc; setDisc: (d: Disc) => void;
  assetId: string | null; setAssetId: (id: string | null) => void; sel: string | null; setSel: (p: string | null) => void;
  health: Health; ctrl: React.MutableRefObject<Ctrl>; rtAsk: React.MutableRefObject<(q: string) => void>;
  reviews: Record<string, Review[]>; addReview: (vendor: string, r: Review) => void;
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
  const [reviews, setReviews] = useState<Record<string, Review[]>>({});
  const ctrl = useRef<Ctrl>({ openAsset: () => {}, goSite: () => {} });
  const rtAsk = useRef<(q: string) => void>(() => {});
  useEffect(() => {
    const m = load("ps.master"); if (m) setMs({ ...DEFAULT_MASTER, ...m, names: { ...(m.names || {}) } });
    const d = load("ps.discovered"); if (d) setDiscS(d);
    const rv = load("ps.reviews"); if (rv) setReviews(rv);
    fetch("/api/health", { cache: "no-store" }).then(r => (r.ok ? r.json() : Promise.reject(r.status))).then(setHealth).catch(() => setHealth({ text: false, web: false, voice: false, unreachable: true }));
  }, []);
  const v = useMemo(() => ({ M, setM: (m: Master) => { setMs(m); save("ps.master", m); }, disc, setDisc: (d: Disc) => { setDiscS(d); save("ps.discovered", d); }, assetId, setAssetId: (id: string | null) => { setAssetId(id); setSel(null); }, sel, setSel, health, ctrl, rtAsk,
    reviews, addReview: (vendor: string, r: Review) => { setReviews(prev => { const n = { ...prev, [vendor]: [...(prev[vendor] || []), { ...r, local: true }] }; save("ps.reviews", n); return n; }); } }), [M, disc, assetId, sel, health, reviews]);
  return <C.Provider value={v}>{children}</C.Provider>;
}
export const useStudio = () => useContext(C);
