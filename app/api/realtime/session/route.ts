import { cfg } from "@/lib/server/config";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Mints a short-lived OpenAI Realtime client secret. The browser then connects over WebRTC.
export async function POST(req: Request) {
  if (!cfg.key) return Response.json({ error: "OPENAI_API_KEY is not set in .env.local" }, { status: 400 });
  const { instructions, tools } = await req.json();
  const session: any = {
    type: "realtime",
    model: cfg.realtimeModel,
    instructions: String(instructions || "").slice(0, 24000),
    audio: { input: { turn_detection: { type: "server_vad" } }, output: { voice: cfg.voice } },
  };
  if (cfg.transcribeModel) session.audio.input.transcription = { model: cfg.transcribeModel };
  if (Array.isArray(tools)) session.tools = tools;
  const up = await fetch(`${cfg.base}/realtime/client_secrets`, {
    method: "POST",
    headers: { Authorization: `Bearer ${cfg.key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ session }),
  });
  const j: any = await up.json().catch(() => ({}));
  if (!up.ok || !j.value) return Response.json({ error: `Realtime ${up.status}: ${JSON.stringify(j.error || j).slice(0, 400)}` }, { status: 502 });
  return Response.json({ value: j.value, model: cfg.realtimeModel, callsUrl: `${cfg.base}/realtime/calls` });
}
