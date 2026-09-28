// Client helpers for the /api/llm streaming route.
export type Turn = { role: "user" | "assistant"; content: string };
export type AiErr = { code: string; message: string; text?: string };

export async function llm(input: string | Turn[], opts: { web?: boolean; signal?: AbortSignal; onText?: (t: string) => void } = {}) {
  let res: Response;
  try {
    res = await fetch("/api/llm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ input, web: !!opts.web }), signal: opts.signal });
  } catch (e: any) { throw { code: e?.name === "AbortError" ? "cancelled" : "network", message: String(e) } as AiErr; }
  if (!res.ok) { let m = res.statusText; try { m = (await res.json()).error || m; } catch {} throw { code: res.status === 429 ? "rate_limited" : "upstream", message: m } as AiErr; }
  const rd = res.body!.getReader(), dec = new TextDecoder(); let text = "";
  try { for (;;) { const { done, value } = await rd.read(); if (done) break; text += dec.decode(value, { stream: true }); opts.onText?.(text); } }
  catch (e: any) { throw { code: e?.name === "AbortError" ? "cancelled" : "network", message: String(e), text } as AiErr; }
  if (text.startsWith("[[ERROR]]")) throw { code: "upstream", message: text.slice(9) } as AiErr;
  if (!text.trim()) throw { code: "empty", message: "Empty answer" } as AiErr;
  return text;
}
export async function llmJson<T = any>(input: string, opts: { web?: boolean; signal?: AbortSignal } = {}): Promise<T> {
  const t = (await llm(input + "\n\nReturn only the JSON, no prose.", opts)).trim();
  const a = Math.min(...["{", "["].map(c => t.indexOf(c)).filter(i => i >= 0)), b = Math.max(t.lastIndexOf("}"), t.lastIndexOf("]"));
  for (const x of [t, (t.match(/```(?:json)?\s*([\s\S]*?)```/) || [])[1], a >= 0 && b > a ? t.slice(a, b + 1) : null]) { if (!x) continue; try { return JSON.parse(x); } catch {} }
  throw { code: "invalid_json", message: "The answer wasn't valid JSON", text: t } as AiErr;
}
export const errText = (e: any) => ({ rate_limited: "OpenAI is rate-limiting requests. Try again in a minute.", invalid_json: "The answer came back in an unexpected format. Try again.", network: "Couldn't reach the Studio server.", empty: "The model returned an empty answer." } as Record<string, string>)[e?.code] || e?.message || "Something went wrong.";
