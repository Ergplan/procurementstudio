import { cfg } from "@/lib/server/config";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Mints a short-lived OpenAI Realtime client secret. The browser then connects over WebRTC.
export async function POST(req: Request) {
  if (!cfg.key) return Response.json({ error: "OPENAI_API_KEY is not set in .env.local" }, { status: 400 });
  const { instructions, tools } = await req.json();
  const session: any = {
    type: "realtime",
    model: cfg.realtimeModel,
    instructions: String(instructions || "").slice(0, 60000),
    audio: {
      // semantic VAD waits for a finished thought instead of answering every pause or background noise
      input: { turn_detection: { type: "semantic_vad" }, noise_reduction: { type: "near_field" } },
      output: { voice: cfg.voice },
    },
  };
  if (cfg.transcribeModel) session.audio.input.transcription = { model: cfg.transcribeModel, ...(cfg.transcribeLang ? { language: cfg.transcribeLang } : {}) };
  if (Array.isArray(tools)) session.tools = tools;
  const reasoning = cfg.realtimeReasoning !== "off";
  if (reasoning) session.reasoning = { effort: cfg.realtimeReasoning };
  const mint = () => fetch(`${cfg.base}/realtime/client_secrets`, {
    method: "POST",
    headers: { Authorization: `Bearer ${cfg.key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ session }),
  });
  let up = await mint();
  // Some voice models (e.g. gpt-live-1) reject the reasoning option: retry without it.
  if (up.status === 400 && reasoning) { delete session.reasoning; up = await mint(); }
  const j: any = await up.json().catch(() => ({}));
  if (!up.ok || !j.value) return Response.json({ error: `Realtime ${up.status}: ${JSON.stringify(j.error || j).slice(0, 400)}` }, { status: 502 });
  return Response.json({ value: j.value, model: cfg.realtimeModel, callsUrl: `${cfg.base}/realtime/calls` });
}
