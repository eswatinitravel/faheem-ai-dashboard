"use client";
import { useEffect, useState } from "react";
import { thinking, isThinkingRequest } from "../../lib/thinking";

// v3.14: Top par patli dots ki patti — jab bhi koi brain kaam kar raha ho (kisi bhi page par). Jawab par band.
// fetch ko lapet kar /api/chat, /api/tools, /api/rooms (send), /api/agent ki POST calls pakarta hai.
export default function ThinkingBar() {
  const [n, setN] = useState(0);
  useEffect(() => {
    const off = thinking.subscribe(setN);
    if (!window.__faheemFetchPatched) {
      window.__faheemFetchPatched = true;
      const orig = window.fetch.bind(window);
      window.fetch = async (input, init = {}) => {
        const url = typeof input === "string" ? input : input?.url || "";
        const method = init?.method || (typeof input === "object" && input?.method) || "GET";
        if (!isThinkingRequest(url, method, init?.body)) return orig(input, init);
        const id = "net-" + Math.random().toString(36).slice(2);
        thinking.start(id);
        let stopped = false;
        const stop = () => { if (!stopped) { stopped = true; thinking.stop(id); } };
        const guard = setTimeout(stop, 6 * 60 * 1000); // kabhi atke nahi
        try {
          const res = await orig(input, init);
          if (!res.body || res.status === 204) { clearTimeout(guard); stop(); return res; }
          // Jawab (stream ya JSON) poora parh liya jaye tab band
          const ts = new TransformStream({ flush() { clearTimeout(guard); stop(); } });
          return new Response(res.body.pipeThrough(ts), { status: res.status, statusText: res.statusText, headers: res.headers });
        } catch (e) { clearTimeout(guard); stop(); throw e; }
      };
    }
    setN(thinking.count());
    return off;
  }, []);
  return <div className={"thinkbar" + (n > 0 ? " on" : "")} data-thinking-bar data-active={n > 0 ? "1" : "0"} aria-hidden={n > 0 ? "false" : "true"} role="status" aria-label={n > 0 ? "Brain soch raha hai" : undefined} />;
}
