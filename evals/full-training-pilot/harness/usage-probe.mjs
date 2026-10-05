// Bewijsregistratie voor de pilot (geen productcode): legt per Anthropic Messages-call alleen metadata vast
// (model, tokens, stop_reason, HTTP-status, duur). Nooit prompts, inhoud, headers of sleutels.
import { appendFileSync } from "node:fs";

const OUT = process.env.CERTUM_USAGE_PROBE_FILE;
const original = globalThis.fetch;
if (OUT && original) {
  globalThis.fetch = async function probedFetch(input, init) {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input?.url;
    if (!url || !url.startsWith("https://api.anthropic.com/v1/messages")) return original(input, init);
    const started = Date.now();
    let response;
    try {
      response = await original(input, init);
    } catch (error) {
      appendFileSync(OUT, JSON.stringify({ at: new Date().toISOString(), pid: process.pid, ok: false, error: error?.name ?? "error", durationMs: Date.now() - started }) + "\n");
      throw error;
    }
    const durationMs = Date.now() - started;
    response
      .clone()
      .json()
      .then((body) => {
        const u = body?.usage ?? {};
        appendFileSync(
          OUT,
          JSON.stringify({
            at: new Date().toISOString(),
            pid: process.pid,
            status: response.status,
            model: body?.model ?? null,
            stopReason: body?.stop_reason ?? null,
            inputTokens: u.input_tokens ?? null,
            outputTokens: u.output_tokens ?? null,
            cacheCreationInputTokens: u.cache_creation_input_tokens ?? null,
            cacheReadInputTokens: u.cache_read_input_tokens ?? null,
            durationMs,
          }) + "\n",
        );
      })
      .catch(() => appendFileSync(OUT, JSON.stringify({ at: new Date().toISOString(), pid: process.pid, status: response.status, unreadable: true, durationMs }) + "\n"));
    return response;
  };
}
