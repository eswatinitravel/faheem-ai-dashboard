# v3.32 Jarvis Voice Server: Whisper (awaz->text) aur Kitten (text->awaz) EK DAFA load, phir har baat foran.
# Pehle har jumle par naya Python khulta tha aur model dobara load hota tha (live baat-cheet ki sab se bari der).
# Sirf 127.0.0.1 par sunta hai (Wi-Fi se band). 30 min koi request na aaye to khud band.
# Use: python voice_server.py [port]   (dashboard khud chalata hai, port 5577)
import hmac, io, json, os, sys, tempfile, threading, time, wave
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 5577
IDLE_MAX = 30 * 60
# v3.36: dashboard ka raaz (data/voice-token). Iske bagair koi POST nahi.
TOKEN = os.environ.get("JARVIS_VOICE_TOKEN", "")
state = {"last": time.time(), "whisper": {}, "lock": threading.Lock()}


def whisper(model):
    m = state["whisper"].get(model)
    if m is None:
        from faster_whisper import WhisperModel
        m = WhisperModel(model, device="auto", compute_type="int8")
        state["whisper"] = {model: m}  # 8GB RAM: ek hi model yaad rakho
    return m


class H(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def _send(self, code, body, ctype="application/json"):
        if isinstance(body, (dict, list)):
            body = json.dumps(body).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        state["last"] = time.time()
        if urlparse(self.path).path == "/health":
            return self._send(200, {"ok": True, "whisper": list(state["whisper"].keys())})
        self._send(404, {"error": "not found"})

    def do_POST(self):
        got = self.headers.get("X-Voice-Token") or ""
        if not TOKEN or not hmac.compare_digest(got, TOKEN):
            return self._send(403, {"error": "forbidden"})
        state["last"] = time.time()
        u = urlparse(self.path)
        q = parse_qs(u.query)
        n = int(self.headers.get("Content-Length") or 0)
        if n <= 0 or n > 25_000_000:
            return self._send(400, {"error": "khali ya bohat bari request"})
        data = self.rfile.read(n)
        try:
            if u.path == "/stt":
                model = (q.get("model") or ["small"])[0]
                lang = (q.get("lang") or [""])[0] or None
                f = tempfile.NamedTemporaryFile(delete=False, suffix=".webm")
                f.write(data); f.close()
                try:
                    with state["lock"]:
                        segs, _ = whisper(model).transcribe(f.name, beam_size=1, vad_filter=True, language=lang)
                        text = " ".join(s.text.strip() for s in segs).strip()
                finally:
                    try: os.unlink(f.name)
                    except Exception: pass
                return self._send(200, {"text": text})
            if u.path == "/tts":
                import numpy as np
                import kitten_tts
                j = json.loads(data.decode("utf-8"))
                with state["lock"]:
                    audio = kitten_tts.synth(str(j.get("text", ""))[:1200], str(j.get("voice", "priya")).lower())
                if not len(audio):
                    return self._send(500, {"error": "awaz nahi bani"})
                buf = io.BytesIO()
                with wave.open(buf, "wb") as wf:
                    wf.setnchannels(1); wf.setsampwidth(2); wf.setframerate(kitten_tts.SR)
                    wf.writeframes((audio * 32767).astype(np.int16).tobytes())
                return self._send(200, buf.getvalue(), "audio/wav")
        except Exception as e:
            return self._send(500, {"error": str(e)[:200]})
        self._send(404, {"error": "not found"})


def idle_watch(srv):
    while True:
        time.sleep(60)
        if time.time() - state["last"] > IDLE_MAX:
            srv.shutdown(); return


if __name__ == "__main__":
    srv = ThreadingHTTPServer(("127.0.0.1", PORT), H)
    threading.Thread(target=idle_watch, args=(srv,), daemon=True).start()
    srv.serve_forever()
