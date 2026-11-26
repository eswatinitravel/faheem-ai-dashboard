// v3.28 server entry (START.bat / tray / Docker sab `npm start` se yahi chalate hain).
// Kyun? Next.js (16.4.5) proxy ko asli TCP peer (socket) ka pata nahi deta. Woh x-forwarded-for
// sirf tab bharta hai jab request mein pehle se na ho (??=), is liye Wi-Fi wala koi bhi
// "X-Forwarded-For: 127.0.0.1" bhej kar khud ko localhost bana sakta tha.
// Yahan har request par socket ka asli pata ek header mein likhte hain (client wala mita kar),
// saath ek per-process raaz taake bahar se yeh header jaali na banaya ja sake. proxy.js isi ko maanta hai.
import http from "http";
import crypto from "crypto";
import next from "next";
import { PEER_HEADER, peerSecretKey } from "./lib/peer.js";

const args = process.argv.slice(2);
const flag = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
const dev = args.includes("--dev");
const hostname = flag("-H") || flag("--hostname") || process.env.HOSTNAME_BIND || "0.0.0.0";
const port = Number(flag("-p") || flag("--port") || process.env.PORT) || 3000;

// Raaz sirf is process ki memory mein (globalThis), kabhi disk ya response mein nahi.
const secret = crypto.randomBytes(24).toString("hex");
globalThis[peerSecretKey] = secret;

const app = next({ dev, hostname: hostname === "0.0.0.0" ? "localhost" : hostname, port });
const handle = app.getRequestHandler();
await app.prepare();

http
  .createServer((req, res) => {
    // Client ke bheje hue "peer" header kabhi nahi maante; socket ka asli pata likhte hain.
    delete req.headers[PEER_HEADER];
    const ip = req.socket?.remoteAddress || "";
    req.headers[PEER_HEADER] = `${secret} ${ip}`;
    handle(req, res);
  })
  .listen(port, hostname, () => {
    console.log(`> Faheem AI ${dev ? "dev" : "production"} server: http://localhost:${port} (sunta hai ${hostname}:${port})`);
  });
