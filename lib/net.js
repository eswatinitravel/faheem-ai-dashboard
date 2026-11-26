// v3.29 Bahar ki har request ki had (timeout). Pehle kuch fetch (Whisper, GitHub, update check, Uiverse, Ollama pull)
// bina had ke the: server / internet atak jaye to dashboard ka woh hissa hamesha "chal raha hai…" par ruka rehta.
// Yahan sab hadein ek jagah, aur timeout par saaf Roman Urdu paigham.
export const TIMEOUTS = {
  whisper: 60_000, // awaz se likhai (Groq Whisper)
  github: 30_000, // GitHub API / repo files
  githubZip: 180_000, // GitHub se poora ZIP / bari file
  updateCheck: 10_000, // naya version dekhna
  web: 20_000, // web_fetch, Uiverse, chhoti files
  ollamaPull: 60 * 60_000, // Ollama model download (kai GB) — ek ghanta
};

export const isTimeout = (e) => e?.name === "TimeoutError" || e?.name === "AbortError" || e?.timeout === true;

const secs = (ms) => (ms >= 120_000 ? `${Math.round(ms / 60_000)} minute` : `${Math.round(ms / 1000)} second`);
export const timeoutMessage = (what, ms) => `${what} ne ${secs(ms)} mein jawab nahi diya (timeout). Internet ya woh server check karein, phir dobara koshish karein.`;

// fetch + had. `what` = paigham mein naam ("GitHub", "Whisper"…). Caller ka apna signal (Stop button) bhi chalta rehta hai.
// untilHeaders: true = had sirf jawab shuru hone (headers) tak; phir body / stream jitni der chahe chale (streaming nahi tootti).
export async function fetchWithTimeout(url, opt = {}, { ms = TIMEOUTS.web, what = "Server", untilHeaders = false } = {}) {
  const outer = opt.signal;
  let timer = null, signal;
  if (untilHeaders) {
    const ac = new AbortController();
    timer = setTimeout(() => ac.abort(Object.assign(new Error("timeout"), { name: "TimeoutError" })), ms);
    signal = outer ? AbortSignal.any([outer, ac.signal]) : ac.signal;
  } else {
    const t = AbortSignal.timeout(ms);
    signal = outer ? AbortSignal.any([outer, t]) : t;
  }
  try {
    return await fetch(url, { ...opt, signal });
  } catch (e) {
    // Aap ne khud roka (Stop) to woh "timeout" nahi.
    if (outer?.aborted) throw e;
    if (isTimeout(e)) throw Object.assign(new Error(timeoutMessage(what, ms)), { timeout: true, cause: e });
    throw e;
  } finally {
    if (timer) clearTimeout(timer);
  }
}
