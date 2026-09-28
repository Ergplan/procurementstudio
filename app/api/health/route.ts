import { cfg } from "@/lib/server/config";
export const dynamic = "force-dynamic";

// GET /api/health          → what's configured (no secrets)
// GET /api/health?check=1  → also verifies the key with OpenAI (GET /models)
export async function GET(req: Request) {
  const key = cfg.key;
  const out: any = {
    app: "procurement-studio", text: !!key, web: !!key && cfg.web, voice: !!key,
    textModel: cfg.textModel, realtimeModel: cfg.realtimeModel,
    host: cfg.host, vercelEnv: cfg.vercelEnv, keyVar: cfg.keyVar, similarVars: key ? [] : cfg.similarVars(),
  };
  if (key && new URL(req.url).searchParams.get("check")) {
    try {
      const r = await fetch(`${cfg.base}/models`, { headers: { Authorization: `Bearer ${key}` }, cache: "no-store" });
      out.keyCheck = r.ok ? "ok" : `OpenAI rejected the key (HTTP ${r.status})`;
    } catch (e: any) { out.keyCheck = "Couldn't reach OpenAI: " + String(e?.message || e); }
  }
  return Response.json(out, { headers: { "Cache-Control": "no-store" } });
}
