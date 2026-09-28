import { cfg } from "@/lib/server/config";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Web-search answers can take a while; allow up to 5 minutes on Vercel (Fluid compute).
export const maxDuration = 300;

type Turn = { role: "user" | "assistant"; content: string };
function turnsOf(input: string | Turn[]): Turn[] {
  if (typeof input === "string") return [{ role: "user", content: input }];
  const out: Turn[] = [];
  for (const t of input || []) {
    const role = t.role === "assistant" ? "assistant" : "user";
    if (out.length && out[out.length - 1].role === role) out[out.length - 1].content += "\n\n" + t.content;
    else out.push({ role, content: String(t.content || "") });
  }
  return out;
}

// Streams plain text deltas from the OpenAI Responses API (optionally with live web search).
export async function POST(req: Request) {
  if (!cfg.key) return Response.json({ error: "OPENAI_API_KEY is not set in .env.local" }, { status: 400 });
  const { input, web } = await req.json();
  const size = JSON.stringify(input ?? "").length;
  if (!input) return Response.json({ error: "Missing input" }, { status: 400 });
  if (size > 200_000) return Response.json({ error: "Request too large" }, { status: 413 });
  const payload: any = { model: cfg.textModel, input: turnsOf(input), stream: true };
  if (web && cfg.web) payload.tools = [{ type: "web_search" }];
  const up = await fetch(`${cfg.base}/responses`, {
    method: "POST",
    headers: { Authorization: `Bearer ${cfg.key}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: req.signal,
  });
  if (!up.ok || !up.body) {
    const t = await up.text().catch(() => "");
    return Response.json({ error: `OpenAI ${up.status}: ${t.slice(0, 400)}` }, { status: up.status === 429 ? 429 : 502 });
  }
  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(ctrl) {
      const rd = up.body!.getReader(), dec = new TextDecoder();
      let buf = "", wrote = false;
      try {
        for (;;) {
          const { done, value } = await rd.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          let i: number;
          while ((i = buf.indexOf("\n")) >= 0) {
            const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
            if (!line.startsWith("data:")) continue;
            const data = line.slice(5).trim();
            if (!data || data === "[DONE]") continue;
            try {
              const ev = JSON.parse(data);
              if (ev.type === "response.output_text.delta" && ev.delta) { wrote = true; ctrl.enqueue(enc.encode(ev.delta)); }
              else if ((ev.type === "error" || ev.type === "response.failed") && !wrote) ctrl.enqueue(enc.encode("[[ERROR]]" + JSON.stringify(ev.error || ev.response?.error || ev).slice(0, 300)));
            } catch { /* partial line */ }
          }
        }
      } catch { /* client aborted */ }
      ctrl.close();
    },
  });
  return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}
