import { cfg } from "@/lib/server/config";
export const dynamic = "force-dynamic";
export async function GET() {
  return Response.json({ app: "procurement-studio", text: !!cfg.key, web: !!cfg.key && cfg.web, voice: !!cfg.key, textModel: cfg.textModel, realtimeModel: cfg.realtimeModel });
}
