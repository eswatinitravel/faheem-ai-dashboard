// v3.27 LAN guard (Next.js 16 proxy, Node runtime). Server 0.0.0.0 par sunta hai taake phone jud sake,
// lekin Wi-Fi par doosra koi dashboard (Agent, files, keys) na khol sake:
//  - Isi laptop (localhost) se: sab kuch waisa hi.
//  - Phone / LAN se: sirf /api/v1/* (OpenAI-compatible), woh bhi tab jab /connect par "Phone connect" On ho
//    aur app phone wali key (Bearer) bheje. "Poora dashboard phone par" On ho to saare pages bhi (key cookie se).
import { NextResponse } from "next/server";
import { readPhone, requestIsLocal, bearer, safeEqual, guardDisabled } from "./lib/phone.js";

let cache = { at: 0, v: null };
function phone() {
  if (!cache.v || Date.now() - cache.at > 3000) cache = { at: Date.now(), v: readPhone() };
  return cache.v;
}
const deny = (status, message) => NextResponse.json({ error: { message, type: "lan_guard" } }, { status });

export function proxy(request) {
  // Docker mein har request bridge IP se aati hai; wahan compose file guard band karti hai (port sirf 127.0.0.1 par).
  if (guardDisabled()) return NextResponse.next();
  if (requestIsLocal(request.headers)) return NextResponse.next();
  const p = phone();
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/api/v1/") || pathname === "/api/v1") {
    if (!p.enabled) return deny(403, "Phone connect band hai. Laptop par localhost:3000/connect kholein aur 'Phone connect' On karein.");
    if (!safeEqual(bearer(request.headers), p.key)) return deny(401, "API key ghalat hai. /connect page wali key (fad-...) app mein daalein.");
    return NextResponse.next();
  }
  if (p.enabled && p.fullLan) {
    const ck = request.cookies.get("fad_phone")?.value || "";
    const q = request.nextUrl.searchParams.get("key") || "";
    if (safeEqual(q, p.key)) {
      const res = NextResponse.next();
      res.cookies.set("fad_phone", p.key, { httpOnly: true, sameSite: "strict", path: "/", maxAge: 60 * 60 * 12 });
      return res;
    }
    if (safeEqual(ck, p.key)) return NextResponse.next();
  }
  return new NextResponse(
    "<!doctype html><meta charset=utf-8><meta name=viewport content='width=device-width'><title>Faheem AI</title><body style='font:16px system-ui;background:#05070f;color:#cfe8ff;padding:24px'><h2>Yeh dashboard sirf laptop par khulta hai</h2><p>Phone ke liye Maid ya PocketPal AI app mein Base URL aur key daalein (laptop par <b>localhost:3000/connect</b> dekhein).</p></body>",
    { status: 403, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
