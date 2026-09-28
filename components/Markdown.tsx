"use client";
import React from "react";
// Minimal, safe markdown: headings, bullets, bold, links.
function inline(s: string, k: string) {
  const parts: React.ReactNode[] = []; const re = /\*\*(.+?)\*\*|\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g; let last = 0, m: RegExpExecArray | null, i = 0;
  while ((m = re.exec(s))) { if (m.index > last) parts.push(s.slice(last, m.index)); parts.push(m[1] ? <b key={k + i++}>{m[1]}</b> : <a key={k + i++} href={m[3]} target="_blank" rel="noopener noreferrer">{m[2]}</a>); last = re.lastIndex; }
  if (last < s.length) parts.push(s.slice(last)); return parts;
}
export default function Markdown({ text }: { text: string }) {
  const out: React.ReactNode[] = []; let list: React.ReactNode[] = [];
  const flush = (k: number) => { if (list.length) { out.push(<ul key={"u" + k}>{list}</ul>); list = []; } };
  text.split("\n").forEach((ln, idx) => {
    const L = ln.trim();
    if (/^#{1,4}\s/.test(L)) { flush(idx); out.push(<h4 key={idx}>{inline(L.replace(/^#+\s*/, ""), "h" + idx)}</h4>); }
    else if (/^([-•*]|\d+\.)\s+/.test(L)) list.push(<li key={idx}>{inline(L.replace(/^([-•*]|\d+\.)\s+/, ""), "l" + idx)}</li>);
    else if (!L) flush(idx);
    else { flush(idx); out.push(<p key={idx}>{inline(L, "p" + idx)}</p>); }
  });
  flush(-1); return <div className="prose">{out}</div>;
}
