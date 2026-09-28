// Server-only configuration. Keys never reach the browser.
export const cfg = {
  key: process.env.OPENAI_API_KEY || "",
  base: (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, ""),
  textModel: process.env.OPENAI_TEXT_MODEL || "gpt-6-astra",
  realtimeModel: process.env.OPENAI_REALTIME_MODEL || "gpt-realtime-2.1",
  voice: process.env.OPENAI_VOICE || "marin",
  transcribeModel: process.env.OPENAI_TRANSCRIBE_MODEL ?? "gpt-4o-mini-transcribe",
  web: (process.env.WEB_SEARCH || "on") !== "off",
};
