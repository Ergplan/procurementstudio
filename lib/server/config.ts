// Server-only configuration. Keys never reach the browser. Read at request time.
const KEY_NAMES = ["OPENAI_API_KEY", "OPENAI_API_KEY1", "OPENAI_KEY", "OPENAI_SECRET_KEY"];
function findKey() {
  for (const n of KEY_NAMES) {
    const v = (process.env[n] || "").trim().replace(/^["']|["']$/g, "");
    if (v) return { key: v, name: n };
  }
  return { key: "", name: null as string | null };
}
export const cfg = {
  get key() { return findKey().key; },
  get keyVar() { return findKey().name; },
  base: (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, ""),
  textModel: process.env.OPENAI_TEXT_MODEL || "gpt-6-astra",
  realtimeModel: process.env.OPENAI_REALTIME_MODEL || "gpt-realtime-2.1",
  voice: process.env.OPENAI_VOICE || "marin",
  transcribeModel: process.env.OPENAI_TRANSCRIBE_MODEL ?? "gpt-4o-mini-transcribe",
  web: (process.env.WEB_SEARCH || "on") !== "off",
  password: process.env.STUDIO_PASSWORD || "",
  host: process.env.VERCEL ? "vercel" : "local",
  vercelEnv: process.env.VERCEL_ENV || null, // production | preview | development
  // Names only (never values) of OpenAI-looking variables, to spot typos like NEXT_PUBLIC_OPENAI_API_KEY.
  similarVars: () => Object.keys(process.env).filter(k => /OPENAI/i.test(k) && !KEY_NAMES.includes(k)),
};
