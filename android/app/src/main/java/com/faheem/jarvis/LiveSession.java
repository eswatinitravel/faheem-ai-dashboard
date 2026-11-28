// v3.43 Phone par Jarvis Live: Gemini Live se asli waqt ki baat (beech mein tok sakte hain).
// Token laptop deta hai (/api/v1/live, phone key ke saath); asal Gemini key phone par kabhi nahi aati.
// Har laptop kaam tool "jarvis_kaam" se laptop ke purane Jarvis dimagh tak jata hai: wahi allowlist, wahi "haan" hifazat.
// WebSocket: OkHttp (Apache-2.0). Baqi apna code.
package com.faheem.jarvis;

import android.annotation.SuppressLint;
import android.content.Context;
import android.media.AudioAttributes;
import android.media.AudioFormat;
import android.media.AudioManager;
import android.media.AudioRecord;
import android.media.AudioTrack;
import android.media.MediaRecorder;
import android.media.audiofx.AcousticEchoCanceler;
import android.media.audiofx.NoiseSuppressor;
import android.util.Base64;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;

import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import okhttp3.WebSocket;
import okhttp3.WebSocketListener;
import okio.ByteString;

class LiveSession {
    interface Ui {
        void state(String s, String note);   // connecting | live | off | error
        void line(String who, String text);  // u | j | tool
    }

    private static final int IN_RATE = 16000, OUT_RATE = 24000;
    private final Context ctx;
    private final String base, key, gender;
    private final Ui ui;
    private final PhoneActions phone;
    private final OkHttpClient http = new OkHttpClient.Builder().readTimeout(0, TimeUnit.MILLISECONDS).pingInterval(20, TimeUnit.SECONDS).build();
    private final ExecutorService io = Executors.newSingleThreadExecutor();
    private final ExecutorService tools = Executors.newSingleThreadExecutor();
    private final LinkedBlockingQueue<byte[]> playQ = new LinkedBlockingQueue<>();
    private volatile boolean running = false;
    private volatile int gen = 0;
    private WebSocket ws;
    private AudioRecord rec;
    private AudioTrack track;
    private Thread micThread, playThread;
    private Object pending = JSONObject.NULL;
    private final StringBuilder userLine = new StringBuilder(), jarvisLine = new StringBuilder();
    private int oldMode = AudioManager.MODE_NORMAL;
    private boolean oldSpeaker = false;

    LiveSession(Context ctx, PhoneActions phone, String base, String key, String gender, Ui ui) {
        this.phone = phone;
        this.ctx = ctx.getApplicationContext(); this.base = base; this.key = key; this.gender = gender; this.ui = ui;
    }

    boolean isRunning() { return running; }

    void start() {
        if (running) return;
        running = true;
        ui.state("connecting", "Jor raha hoon...");
        io.execute(() -> {
            try {
                JSONObject req = new JSONObject().put("action", "start").put("gender", gender);
                JSONObject cfg = post(req, 30000);
                if (!cfg.optBoolean("ok")) { fail(cfg.optString("error", "Live shuru nahi hua.")); return; }
                String url = cfg.getString("ws") + "?access_token=" + URLEncoder.encode(cfg.getString("token"), "UTF-8");
                final String setup = withPhoneTool(cfg.getJSONObject("setup")).toString();
                ws = http.newWebSocket(new Request.Builder().url(url).build(), new WebSocketListener() {
                    @Override public void onOpen(WebSocket s, Response r) { s.send(setup); }
                    @Override public void onMessage(WebSocket s, String text) { handle(text); }
                    @Override public void onMessage(WebSocket s, ByteString bytes) { handle(bytes.utf8()); }
                    @Override public void onClosing(WebSocket s, int code, String reason) { s.close(1000, null); }
                    @Override public void onClosed(WebSocket s, int code, String reason) { if (running) stop(reason == null || reason.isEmpty() ? "Live band ho gaya." : "Live band: " + cut(reason, 160)); }
                    @Override public void onFailure(WebSocket s, Throwable t, Response r) { if (running) fail("Google Live se raabta toot gaya: " + cut(String.valueOf(t.getMessage()), 120)); }
                });
            } catch (Exception e) { fail("Laptop se raabta nahi: " + cut(String.valueOf(e.getMessage()), 120)); }
        });
    }

    void stop(String note) {
        boolean was = running;
        running = false;
        gen++;
        try { if (ws != null) ws.close(1000, "bye"); } catch (Exception ignored) {}
        ws = null;
        try { if (rec != null) { rec.stop(); rec.release(); } } catch (Exception ignored) {}
        rec = null;
        playQ.clear();
        try { if (playThread != null) playThread.interrupt(); } catch (Exception ignored) {}
        try { if (track != null) { track.pause(); track.flush(); track.release(); } } catch (Exception ignored) {}
        track = null;
        restoreAudio();
        if (was || note != null) ui.state("off", note == null ? "" : note);
    }

    // v3.44: Live mein dusra tool "phone_kaam" (isi phone par), laptop wala "jarvis_kaam" waisa hi.
    static JSONObject withPhoneTool(JSONObject setup) throws Exception {
        JSONObject s = setup.has("setup") ? setup.getJSONObject("setup") : setup;
        JSONArray tools = s.optJSONArray("tools");
        if (tools == null) { tools = new JSONArray(); s.put("tools", tools); }
        if (tools.length() == 0) tools.put(new JSONObject().put("functionDeclarations", new JSONArray()));
        JSONObject t0 = tools.getJSONObject(0);
        JSONArray fds = t0.optJSONArray("functionDeclarations");
        if (fds == null) { fds = new JSONArray(); t0.put("functionDeclarations", fds); }
        fds.put(new JSONObject().put("name", "phone_kaam")
            .put("description", "User ke ISI Android phone par kaam: torch, phone ki awaz/battery/vibrate, call (dialer khulta hai), SMS, WhatsApp message (user Send dabata hai), alarm, timer, camera, map par rasta, phone par app kholna, Wi-Fi/Bluetooth settings, phone par YouTube/Google. Hukum user ke lafzon mein Roman Urdu mein do.")
            .put("parameters", new JSONObject().put("type", "OBJECT")
                .put("properties", new JSONObject().put("hukum", new JSONObject().put("type", "STRING").put("description", "Phone ka hukum, jaise 'torch on karo' ya 'subah 6 baje alarm lagao'")))
                .put("required", new JSONArray().put("hukum"))));
        JSONObject si = s.optJSONObject("systemInstruction");
        if (si != null && si.optJSONArray("parts") != null) {
            si.getJSONArray("parts").put(new JSONObject().put("text", "User abhi apne Android phone se baat kar raha hai. Phone ke kaam phone_kaam se, laptop ke kaam (laptop/PC/computer, emails, board) jarvis_kaam se. Jahan saaf na ho ke phone ya laptop, mukhtasir pooch lo."));
        }
        return setup;
    }

    private void fail(String msg) { stop(null); ui.state("error", msg); }

    private void handle(String text) {
        try {
            JSONObject m = new JSONObject(text);
            if (m.has("setupComplete")) { startAudio(); ui.state("live", "Bolein, main sun raha hoon. Beech mein tok bhi sakte hain."); return; }
            if (m.has("toolCall")) { final JSONObject call = m.getJSONObject("toolCall"); tools.execute(() -> runTools(call)); return; }
            if (m.has("goAway")) ui.state("live", "Session thori der mein khatam hoga; phir dobara Live dabayein.");
            JSONObject sc = m.optJSONObject("serverContent");
            if (sc == null) return;
            boolean interrupted = sc.optBoolean("interrupted");
            if (interrupted) flushPlayback();
            JSONObject turn = sc.optJSONObject("modelTurn");
            JSONArray parts = turn == null ? null : turn.optJSONArray("parts");
            if (parts != null) for (int i = 0; i < parts.length(); i++) {
                JSONObject inl = parts.getJSONObject(i).optJSONObject("inlineData");
                if (inl != null && inl.has("data")) playQ.offer(tag(Base64.decode(inl.getString("data"), Base64.DEFAULT)));
            }
            JSONObject it = sc.optJSONObject("inputTranscription"), ot = sc.optJSONObject("outputTranscription");
            if (it != null) userLine.append(it.optString("text"));
            if (ot != null) jarvisLine.append(ot.optString("text"));
            if (sc.optBoolean("turnComplete") || interrupted) {
                if (userLine.toString().trim().length() > 0) ui.line("u", userLine.toString().trim());
                if (jarvisLine.toString().trim().length() > 0) ui.line("j", jarvisLine.toString().trim() + (interrupted ? " …" : ""));
                userLine.setLength(0); jarvisLine.setLength(0);
            }
        } catch (Exception ignored) {}
    }

    // Har tukre ke aage generation number: tokne par purane tukre phenk diye jate hain.
    private byte[] tag(byte[] pcm) {
        byte[] out = new byte[pcm.length + 4]; int g = gen;
        out[0] = (byte) (g >> 24); out[1] = (byte) (g >> 16); out[2] = (byte) (g >> 8); out[3] = (byte) g;
        System.arraycopy(pcm, 0, out, 4, pcm.length); return out;
    }

    private void flushPlayback() {
        gen++; playQ.clear();
        try { if (track != null) { track.pause(); track.flush(); track.play(); } } catch (Exception ignored) {}
    }

    private void runTools(JSONObject call) {
        try {
            JSONArray fcs = call.optJSONArray("functionCalls"); JSONArray res = new JSONArray();
            for (int i = 0; fcs != null && i < fcs.length(); i++) {
                JSONObject fc = fcs.getJSONObject(i);
                String hukum = fc.optJSONObject("args") == null ? "" : fc.getJSONObject("args").optString("hukum");
                ui.line("tool", "⚙ " + hukum);
                String reply;
                if ("phone_kaam".equals(fc.optString("name"))) {
                    PhoneActions.Result pr = phone.run(hukum, true);
                    res.put(new JSONObject().put("id", fc.optString("id")).put("name", "phone_kaam").put("response", new JSONObject().put("result", pr.say)));
                    continue;
                }
                try {
                    JSONObject r = post(new JSONObject().put("action", "tool").put("hukum", hukum).put("pending", pending).put("gender", gender), 180000);
                    reply = r.optString("reply", "");
                    pending = r.has("pending") ? r.get("pending") : JSONObject.NULL;
                } catch (Exception e) { reply = "Laptop se jawab nahi aaya."; pending = JSONObject.NULL; }
                res.put(new JSONObject().put("id", fc.optString("id")).put("name", fc.optString("name")).put("response", new JSONObject().put("result", reply)));
            }
            if (ws != null) ws.send(new JSONObject().put("toolResponse", new JSONObject().put("functionResponses", res)).toString());
        } catch (Exception ignored) {}
    }

    @SuppressLint("MissingPermission") // MainActivity pehle RECORD_AUDIO ki ijazat le leti hai
    private void startAudio() {
        if (rec != null) return;
        AudioManager am = (AudioManager) ctx.getSystemService(Context.AUDIO_SERVICE);
        try { oldMode = am.getMode(); oldSpeaker = am.isSpeakerphoneOn(); am.setMode(AudioManager.MODE_IN_COMMUNICATION); am.setSpeakerphoneOn(true); } catch (Exception ignored) {}
        int inBuf = Math.max(AudioRecord.getMinBufferSize(IN_RATE, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT), 6400);
        rec = new AudioRecord(MediaRecorder.AudioSource.VOICE_COMMUNICATION, IN_RATE, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT, inBuf * 2);
        try { if (AcousticEchoCanceler.isAvailable()) { AcousticEchoCanceler a = AcousticEchoCanceler.create(rec.getAudioSessionId()); if (a != null) a.setEnabled(true); } } catch (Exception ignored) {}
        try { if (NoiseSuppressor.isAvailable()) { NoiseSuppressor n = NoiseSuppressor.create(rec.getAudioSessionId()); if (n != null) n.setEnabled(true); } } catch (Exception ignored) {}
        int outBuf = Math.max(AudioTrack.getMinBufferSize(OUT_RATE, AudioFormat.CHANNEL_OUT_MONO, AudioFormat.ENCODING_PCM_16BIT), 9600);
        track = new AudioTrack.Builder()
            .setAudioAttributes(new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_VOICE_COMMUNICATION).setContentType(AudioAttributes.CONTENT_TYPE_SPEECH).build())
            .setAudioFormat(new AudioFormat.Builder().setSampleRate(OUT_RATE).setEncoding(AudioFormat.ENCODING_PCM_16BIT).setChannelMask(AudioFormat.CHANNEL_OUT_MONO).build())
            .setBufferSizeInBytes(outBuf * 2).setTransferMode(AudioTrack.MODE_STREAM).build();
        track.play();
        rec.startRecording();
        micThread = new Thread(() -> {
            byte[] buf = new byte[3200]; // 100 ms
            while (running && rec != null) {
                int n; try { n = rec.read(buf, 0, buf.length); } catch (Exception e) { break; }
                if (n <= 0 || ws == null) continue;
                try {
                    String b64 = Base64.encodeToString(buf, 0, n, Base64.NO_WRAP);
                    ws.send("{\"realtimeInput\":{\"audio\":{\"data\":\"" + b64 + "\",\"mimeType\":\"audio/pcm;rate=16000\"}}}");
                } catch (Exception ignored) {}
            }
        }, "jarvis-mic");
        playThread = new Thread(() -> {
            while (running) {
                byte[] t; try { t = playQ.poll(500, TimeUnit.MILLISECONDS); } catch (InterruptedException e) { break; }
                if (t == null || track == null) continue;
                int g = ((t[0] & 0xff) << 24) | ((t[1] & 0xff) << 16) | ((t[2] & 0xff) << 8) | (t[3] & 0xff);
                if (g != gen) continue; // tokne se pehle ka tukra
                try { track.write(t, 4, t.length - 4); } catch (Exception ignored) {}
            }
        }, "jarvis-play");
        micThread.start(); playThread.start();
    }

    private void restoreAudio() {
        try { AudioManager am = (AudioManager) ctx.getSystemService(Context.AUDIO_SERVICE); am.setSpeakerphoneOn(oldSpeaker); am.setMode(oldMode); } catch (Exception ignored) {}
    }

    private JSONObject post(JSONObject body, int timeoutMs) throws Exception {
        HttpURLConnection c = (HttpURLConnection) new URL(base + "/api/v1/live").openConnection();
        c.setRequestMethod("POST"); c.setConnectTimeout(8000); c.setReadTimeout(timeoutMs); c.setDoOutput(true);
        c.setRequestProperty("Content-Type", "application/json");
        c.setRequestProperty("Authorization", "Bearer " + key);
        try (OutputStream o = c.getOutputStream()) { o.write(body.toString().getBytes(StandardCharsets.UTF_8)); }
        int code = c.getResponseCode();
        InputStream in = code >= 400 ? c.getErrorStream() : c.getInputStream();
        ByteArrayOutputStream bo = new ByteArrayOutputStream();
        if (in != null) { byte[] b = new byte[8192]; int n; while ((n = in.read(b)) > 0) bo.write(b, 0, n); in.close(); }
        String s = bo.toString("UTF-8");
        JSONObject j; try { j = new JSONObject(s); } catch (Exception e) { j = new JSONObject(); }
        if (code == 401) j.put("ok", false).put("error", "Phone ki key ghalat ya purani hai. Laptop par Phone se jodo ka QR dobara scan karein.");
        else if (code == 403 && !j.has("error")) j.put("ok", false).put("error", "Laptop par Phone connect band hai.");
        else if (code == 404) j.put("ok", false).put("error", "Laptop par naya version nahi. Laptop par UPDATE.bat chalayein.");
        else if (j.opt("error") instanceof JSONObject) j.put("error", j.getJSONObject("error").optString("message", "Ghalti " + code));
        return j;
    }

    private static String cut(String s, int n) { return s == null ? "" : s.length() > n ? s.substring(0, n) : s; }
}
