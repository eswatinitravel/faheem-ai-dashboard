// v3.41 Jarvis Android app: laptop wale Faheem AI dashboard ka Jarvis phone par.
// Laptop par /connect ka QR scan -> phone browser mein /app.html -> APK install -> "App se jodo" (faheemjarvis://pair).
// Kaam laptop par hota hai; app sirf Jarvis Remote (m.html) kholti hai, aur mic/awaz Android ki apni (HTTPS ki zaroorat nahi).
package com.faheem.jarvis;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.speech.tts.TextToSpeech;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Locale;
import java.util.regex.Pattern;

public class MainActivity extends Activity {
    private static final int REQ_MIC = 7;
    private static final Pattern KEY = Pattern.compile("^fad-[a-f0-9]{16,64}$");
    private static final Pattern IPV4 = Pattern.compile("^(\\d{1,3})\\.(\\d{1,3})\\.(\\d{1,3})\\.(\\d{1,3})$");

    private WebView web;
    private SharedPreferences prefs;
    private SpeechRecognizer recognizer;
    private TextToSpeech tts;
    private boolean ttsReady = false;
    private boolean listenAfterPermission = false;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        prefs = getSharedPreferences("jarvis", MODE_PRIVATE);
        try { getWindow().setStatusBarColor(0xff05070f); getWindow().setNavigationBarColor(0xff05070f); } catch (Exception ignored) {}

        web = new WebView(this);
        web.setBackgroundColor(0xff05070f);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(false);
        s.setUserAgentString(s.getUserAgentString() + " FaheemJarvis/" + versionName() + " (" + Build.MODEL + ")");
        web.addJavascriptInterface(new Bridge(), "JarvisNative");
        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri u = request.getUrl();
                if (isOurs(u)) return false;
                // Bahar ke links (GitHub waghera) phone ke browser mein
                try { startActivity(new Intent(Intent.ACTION_VIEW, u)); } catch (Exception ignored) {}
                return true;
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) showAsset("offline.html");
            }
        });
        setContentView(web);

        tts = new TextToSpeech(this, status -> {
            if (status != TextToSpeech.SUCCESS) return;
            Locale[] want = { new Locale("ur", "PK"), new Locale("hi", "IN"), Locale.getDefault() };
            for (Locale l : want) {
                int r = tts.isLanguageAvailable(l);
                if (r >= TextToSpeech.LANG_AVAILABLE) { tts.setLanguage(l); break; }
            }
            ttsReady = true;
        });

        if (!handlePair(getIntent())) openHome();
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handlePair(intent);
    }

    // faheemjarvis://pair?h=192.168.1.5&p=3000&k=fad-...
    private boolean handlePair(Intent intent) {
        if (intent == null || intent.getData() == null) return false;
        Uri d = intent.getData();
        if (!"faheemjarvis".equals(d.getScheme()) || !"pair".equals(d.getHost())) return false;
        boolean ok = savePair(d.getQueryParameter("h"), d.getQueryParameter("p"), d.getQueryParameter("k"));
        if (ok) openRemote(); else showAsset("setup.html");
        return true;
    }

    static boolean validHost(String h) {
        if (h == null) return false;
        java.util.regex.Matcher m = IPV4.matcher(h);
        if (m.matches()) {
            for (int i = 1; i <= 4; i++) if (Integer.parseInt(m.group(i)) > 255) return false;
            int a = Integer.parseInt(m.group(1)), b = Integer.parseInt(m.group(2));
            // Sirf ghar/office ka private network (192.168.x, 10.x, 172.16-31.x) ya Tailscale (100.64-127.x)
            return a == 10 || (a == 192 && b == 168) || (a == 172 && b >= 16 && b <= 31) || (a == 100 && b >= 64 && b <= 127);
        }
        return h.matches("^[a-zA-Z0-9-]{1,63}\\.local$");
    }

    private boolean savePair(String h, String p, String k) {
        if (h == null || k == null) return false;
        h = h.trim(); k = k.trim();
        int port;
        try { port = p == null || p.isEmpty() ? 3000 : Integer.parseInt(p.trim()); } catch (NumberFormatException e) { return false; }
        if (!validHost(h) || port < 1 || port > 65535 || !KEY.matcher(k).matches()) return false;
        prefs.edit().putString("host", h).putInt("port", port).putString("key", k).putLong("paired", System.currentTimeMillis()).apply();
        return true;
    }

    private boolean paired() { return prefs.getString("host", null) != null && prefs.getString("key", null) != null; }

    private String base() { return "http://" + prefs.getString("host", "") + ":" + prefs.getInt("port", 3000); }

    private boolean isOurs(Uri u) {
        if (u == null) return false;
        if ("file".equals(u.getScheme()) && u.getPath() != null && u.getPath().startsWith("/android_asset/")) return true;
        if (!paired()) return false;
        return "http".equals(u.getScheme()) && prefs.getString("host", "").equals(u.getHost()) && u.getPort() == prefs.getInt("port", 3000);
    }

    private void openHome() { if (paired()) openRemote(); else showAsset("setup.html"); }

    private void openRemote() {
        web.getSettings().setAllowFileAccess(false);
        web.loadUrl(base() + "/m.html#k=" + prefs.getString("key", ""));
    }

    private void showAsset(String name) {
        web.loadUrl("file:///android_asset/" + name);
    }

    private String versionName() {
        try { return getPackageManager().getPackageInfo(getPackageName(), 0).versionName; } catch (Exception e) { return "?"; }
    }

    private void js(String fn, String arg1, String arg2) {
        final String code = "window." + fn + "&&window." + fn + "(" + JSONObject.quote(arg1 == null ? "" : arg1) + (arg2 == null ? "" : "," + arg2) + ")";
        runOnUiThread(() -> web.evaluateJavascript(code, null));
    }

    private void startListening() {
        if (Build.VERSION.SDK_INT >= 23 && checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            listenAfterPermission = true;
            requestPermissions(new String[] { Manifest.permission.RECORD_AUDIO }, REQ_MIC);
            return;
        }
        if (!SpeechRecognizer.isRecognitionAvailable(this)) { js("__jarvisMicErr", "Is phone par awaz pehchanne wali service nahi mili (Google app update karein).", null); return; }
        if (recognizer != null) { try { recognizer.destroy(); } catch (Exception ignored) {} }
        recognizer = SpeechRecognizer.createSpeechRecognizer(this);
        recognizer.setRecognitionListener(new RecognitionListener() {
            public void onReadyForSpeech(Bundle b) { js("__jarvisMicState", "listening", null); }
            public void onBeginningOfSpeech() {}
            public void onRmsChanged(float v) {}
            public void onBufferReceived(byte[] b) {}
            public void onEndOfSpeech() { js("__jarvisMicState", "thinking", null); }
            public void onError(int code) { js("__jarvisMicErr", micError(code), null); }
            public void onResults(Bundle b) { js("__jarvisHeard", first(b), "true"); }
            public void onPartialResults(Bundle b) { js("__jarvisHeard", first(b), "false"); }
            public void onEvent(int t, Bundle b) {}
        });
        Intent i = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
        i.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
        i.putExtra(RecognizerIntent.EXTRA_LANGUAGE, "ur-PK");
        i.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true);
        i.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1);
        recognizer.startListening(i);
    }

    private static String first(Bundle b) {
        ArrayList<String> r = b == null ? null : b.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
        return r == null || r.isEmpty() ? "" : r.get(0);
    }

    private static String micError(int c) {
        switch (c) {
            case SpeechRecognizer.ERROR_NO_MATCH: return "Samajh nahi aaya, dobara bolein.";
            case SpeechRecognizer.ERROR_SPEECH_TIMEOUT: return "Kuch suna nahi.";
            case SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS: return "Mic ki ijazat nahi mili.";
            case SpeechRecognizer.ERROR_NETWORK: case SpeechRecognizer.ERROR_NETWORK_TIMEOUT: return "Awaz pehchanne ke liye internet chahiye.";
            default: return "Mic ghalti " + c;
        }
    }

    @Override
    public void onRequestPermissionsResult(int code, String[] perms, int[] res) {
        super.onRequestPermissionsResult(code, perms, res);
        if (code != REQ_MIC) return;
        boolean ok = res.length > 0 && res[0] == PackageManager.PERMISSION_GRANTED;
        if (ok && listenAfterPermission) startListening();
        else if (!ok) js("__jarvisMicErr", "Mic ki ijazat nahi di. Phone Settings > Apps > Jarvis > Permissions se dein.", null);
        listenAfterPermission = false;
    }

    @Override
    public void onBackPressed() {
        if (web.canGoBack()) web.goBack(); else super.onBackPressed();
    }

    @Override
    protected void onDestroy() {
        try { if (recognizer != null) recognizer.destroy(); } catch (Exception ignored) {}
        try { if (tts != null) tts.shutdown(); } catch (Exception ignored) {}
        super.onDestroy();
    }

    // m.html / setup.html / offline.html isay window.JarvisNative ke naam se bulate hain.
    class Bridge {
        @JavascriptInterface public boolean isApp() { return true; }
        @JavascriptInterface public void listen() { runOnUiThread(MainActivity.this::startListening); }
        @JavascriptInterface public void stop() { runOnUiThread(() -> { try { if (recognizer != null) recognizer.stopListening(); } catch (Exception ignored) {} }); }
        @JavascriptInterface public void speak(String text) {
            if (!ttsReady || text == null) return;
            String t = text.length() > 3500 ? text.substring(0, 3500) : text;
            tts.speak(t, TextToSpeech.QUEUE_FLUSH, null, "jarvis");
        }
        @JavascriptInterface public void quiet() { if (tts != null) tts.stop(); }
        @JavascriptInterface public boolean pair(String h, String p, String k) {
            boolean ok = savePair(h, p, k);
            if (ok) runOnUiThread(MainActivity.this::openRemote);
            return ok;
        }
        @JavascriptInterface public void retry() { runOnUiThread(MainActivity.this::openHome); }
        @JavascriptInterface public void unpair() {
            prefs.edit().clear().apply();
            runOnUiThread(() -> { web.clearHistory(); showAsset("setup.html"); });
        }
        @JavascriptInterface public String info() {
            JSONObject o = new JSONObject();
            try {
                o.put("paired", paired());
                o.put("host", prefs.getString("host", ""));
                o.put("port", prefs.getInt("port", 3000));
                o.put("version", versionName());
                o.put("device", Build.MODEL);
            } catch (JSONException ignored) {}
            return o.toString();
        }
    }
}
