// v3.25 WebBrain (browser extension) ke liye CORS: sirf extension aur isi laptop ke pages. Baqi websites ko ijazat nahi.
const OK = /^(chrome-extension|moz-extension|safari-web-extension):\/\/[a-z0-9-]+$|^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;
export function corsHeaders(req) {
  const o = req?.headers?.get?.("origin") || "";
  if (!o || !OK.test(o)) return {};
  return { "Access-Control-Allow-Origin": o, "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type, Authorization", "Access-Control-Max-Age": "600", Vary: "Origin" };
}
export const preflight = (req) => new Response(null, { status: 204, headers: corsHeaders(req) });
export function withCors(req, res) { for (const [k, v] of Object.entries(corsHeaders(req))) res.headers.set(k, v); return res; }
