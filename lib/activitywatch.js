// v3.39 ActivityWatch (MPL-2.0 app; hum sirf us ka local REST API parhte hain, code copy nahi).
// AW laptop par chalta ho to http://localhost:5600/api/0/ par buckets hote hain. Hum "query" se kal ka
// focus waqt (AFK hata kar) aur top apps nikalte hain. AW band ho to report bina is hisse ke banti hai.
const BASE = () => (process.env.AW_URL || "http://127.0.0.1:5600").replace(/\/+$/, "") + "/api/0";

async function j(url, opts = {}, ms = 6000) {
  const r = await fetch(url, { ...opts, signal: AbortSignal.timeout(ms) });
  if (!r.ok) throw new Error(`ActivityWatch ${r.status}`);
  return r.json();
}

export async function awBuckets() {
  const b = await j(`${BASE()}/buckets/`);
  const ids = Object.keys(b || {});
  return {
    window: ids.find((x) => x.startsWith("aw-watcher-window")) || null,
    afk: ids.find((x) => x.startsWith("aw-watcher-afk")) || null,
    web: ids.filter((x) => x.startsWith("aw-watcher-web")),
  };
}

const iso = (d) => new Date(d).toISOString();
// Din ki hadd: laptop ke waqt ke hisab se aadhi raat se aadhi raat.
export function dayRange(daysAgo = 1, now = new Date()) {
  const s = new Date(now); s.setHours(0, 0, 0, 0); s.setDate(s.getDate() - daysAgo);
  const e = new Date(s); e.setDate(e.getDate() + 1);
  return [s, e];
}

export function buildQuery(b) {
  const q = [`window = query_bucket("${b.window}");`];
  if (b.afk) q.push(`afk = filter_keyvals(query_bucket("${b.afk}"), "status", ["not-afk"]);`, "window = filter_period_intersect(window, afk);");
  q.push('apps = sort_by_duration(merge_events_by_keys(window, ["app"]));', 'titles = sort_by_duration(merge_events_by_keys(window, ["app", "title"]));',
    "RETURN = {\"apps\": limit_events(apps, 8), \"titles\": limit_events(titles, 5), \"total\": sum_durations(window)};");
  return q;
}

const cleanApp = (a) => String(a || "?").replace(/\.exe$/i, "").slice(0, 40);
// Kal (ya daysAgo) ka khulasa. Wapas: { ok, totalMin, apps:[{app,min}], titles:[{app,title,min}] } ya { ok:false, reason }
export async function awDaySummary(daysAgo = 1) {
  let b;
  try { b = await awBuckets(); } catch (e) { return { ok: false, reason: "ActivityWatch nahi chal raha (localhost:5600). Install/start karein: activitywatch.net" }; }
  if (!b.window) return { ok: false, reason: "ActivityWatch mein window watcher nahi mila." };
  const [s, e] = dayRange(daysAgo);
  try {
    const r = await j(`${BASE()}/query/`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ timeperiods: [`${iso(s)}/${iso(e)}`], query: buildQuery(b) }) }, 15000);
    const d = Array.isArray(r) ? r[0] : r;
    const min = (sec) => Math.round((Number(sec) || 0) / 60);
    return {
      ok: true, day: s.toISOString().slice(0, 10), totalMin: min(d.total),
      apps: (d.apps || []).map((x) => ({ app: cleanApp(x.data?.app), min: min(x.duration) })).filter((x) => x.min > 0),
      titles: (d.titles || []).map((x) => ({ app: cleanApp(x.data?.app), title: String(x.data?.title || "").slice(0, 80), min: min(x.duration) })).filter((x) => x.min > 0),
    };
  } catch (e2) { return { ok: false, reason: "ActivityWatch query nahi chali: " + e2.message }; }
}

export const fmtMin = (m) => (m >= 60 ? `${Math.floor(m / 60)} ghante ${m % 60 ? (m % 60) + " min" : ""}`.trim() : `${m} min`);
