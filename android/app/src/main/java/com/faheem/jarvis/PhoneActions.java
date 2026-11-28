// v3.44 Phone ke apne kaam (mobile se mobile): torch, awaz, call, SMS, WhatsApp, alarm, timer, camera, rasta,
// battery, app kholna, Wi-Fi/Bluetooth. Laptop ke kaam pehle ki tarah laptop par jate hain.
// Hifazat: call, SMS aur WhatsApp sirf tayar hote hain; aakhri button (Call/Send) user khud dabata hai.
// Qaida: sirf-phone wale kaam (torch, call, SMS, alarm, timer, camera, rasta) khud phone par; baqi (battery, awaz,
// app kholna, WhatsApp, YouTube...) sirf tab jab "phone/mobile" kaha ho, warna laptop.
package com.faheem.jarvis;

import android.Manifest;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.database.Cursor;
import android.hardware.camera2.CameraCharacteristics;
import android.hardware.camera2.CameraManager;
import android.media.AudioManager;
import android.net.Uri;
import android.os.BatteryManager;
import android.os.Build;
import android.provider.AlarmClock;
import android.provider.ContactsContract;
import android.provider.MediaStore;
import android.provider.Settings;

import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

class PhoneActions {
    static final int REQ_CONTACTS = 8;

    static class Result {
        final boolean handled; final String say;
        Result(boolean h, String s) { handled = h; say = s; }
    }

    private static final Result NO = new Result(false, "");
    private static Result ok(String s) { return new Result(true, s); }

    private static final Pattern PHONE_WORD = Pattern.compile("\\b(phone|mobile|mobail|fone|fon)\\b|موبائل|فون");
    private static final Pattern NUM = Pattern.compile("(\\+?\\d[\\d\\s-]{7,16}\\d)");
    private static final String GO = "(?:kholo|khol do|open karo|open|chalao|chala do|start karo|launch karo)";

    private final Activity act;
    private boolean torchOn = false;

    PhoneActions(Activity act) { this.act = act; }

    static boolean mentionsPhone(String t) { return PHONE_WORD.matcher(t).find(); }

    // forcePhone: Live ka phone_kaam tool (Gemini ne khud phone chuna)
    Result run(String text, boolean forcePhone) {
        if (text == null) return NO;
        String t = text.toLowerCase(Locale.ROOT).replaceAll("\\s+", " ").trim();
        if (t.isEmpty()) return NO;
        boolean phone = forcePhone || mentionsPhone(t);
        // "laptop par ..." hamesha laptop
        if (!forcePhone && t.matches(".*\\b(laptop|computer|pc)\\b.*")) return NO;
        try {
            Result r;
            if ((r = torch(t)) != null) return r;
            if ((r = alarm(t)) != null) return r;
            if ((r = timer(t)) != null) return r;
            if ((r = call(t)) != null) return r;
            if ((r = sms(t)) != null) return r;
            if ((r = camera(t)) != null) return r;
            if ((r = route(t)) != null) return r;
            if (!phone) return NO;
            if ((r = whatsapp(t)) != null) return r;
            if ((r = battery(t)) != null) return r;
            if ((r = volume(t)) != null) return r;
            if ((r = ringer(t)) != null) return r;
            if ((r = panels(t)) != null) return r;
            if ((r = search(t)) != null) return r;
            if ((r = openApp(t)) != null) return r;
            return forcePhone ? ok("Yeh kaam phone par abhi nahi aata. Laptop par karna ho to 'laptop par' keh kar bolein.") : NO;
        } catch (SecurityException e) {
            return ok("Phone ne ijazat nahi di: " + e.getMessage());
        } catch (Exception e) {
            return ok("Phone par yeh nahi hua: " + e.getMessage());
        }
    }

    // Seedha kholte hain (Android 11+ par resolveActivity bina <queries> ke jhooti "nahi" deta hai)
    private boolean start(Intent i) {
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        try { act.startActivity(i); return true; } catch (ActivityNotFoundException | SecurityException e) { return false; }
    }

    // ---------- torch ----------
    private Result torch(String t) {
        if (!t.matches(".*\\b(torch|tourch|flash ?light|flashlight|flash)\\b.*") && !t.contains("batti")) return null;
        if (t.contains("batti") && !t.matches(".*(torch|phone|mobile).*")) return null; // "batti" akela: kamre ki batti ho sakti hai
        boolean off = t.matches(".*\\b(band|bujha|bujhao|off|bund)\\b.*");
        boolean on = t.matches(".*\\b(on|jala|jalao|chalu|chalao|kholo)\\b.*");
        boolean want = off ? false : on ? true : !torchOn;
        CameraManager cm = (CameraManager) act.getSystemService(Context.CAMERA_SERVICE);
        try {
            for (String id : cm.getCameraIdList()) {
                Boolean f = cm.getCameraCharacteristics(id).get(CameraCharacteristics.FLASH_INFO_AVAILABLE);
                if (f != null && f) { cm.setTorchMode(id, want); torchOn = want; return ok(want ? "Torch on kar di." : "Torch band kar di."); }
            }
        } catch (Exception e) { return ok("Torch nahi chali: " + e.getMessage()); }
        return ok("Is phone mein torch nahi mili.");
    }

    // ---------- alarm / timer ----------
    private static final Pattern ALARM = Pattern.compile("(?:(subah|sobah|dopahar|dopehar|shaam|sham|raat|rat)\\s*)?(\\d{1,2})(?:[:.](\\d{2}))?\\s*(?:baje|bajay|bje|am|pm|o'?clock)?\\s*(am|pm)?[^\\n]*?alarm|alarm[^\\d]*?(?:(subah|sobah|dopahar|dopehar|shaam|sham|raat|rat)\\s*)?(\\d{1,2})(?:[:.](\\d{2}))?\\s*(am|pm)?");
    private Result alarm(String t) {
        if (!t.contains("alarm") || t.matches(".*(band|cancel|hatao|delete).*")) return null;
        Matcher m = ALARM.matcher(t);
        if (!m.find()) { start(new Intent(AlarmClock.ACTION_SHOW_ALARMS)); return ok("Alarm ka page khol diya. Waqt bhi bolein, jaise 'subah 6 baje alarm lagao'."); }
        boolean first = m.group(2) != null;
        String part = first ? m.group(1) : m.group(5);
        int h = Integer.parseInt(first ? m.group(2) : m.group(6));
        String mm = first ? m.group(3) : m.group(7);
        String ap = first ? m.group(4) : m.group(8);
        int min = mm == null ? 0 : Integer.parseInt(mm);
        if (h > 23 || min > 59) return ok("Waqt samajh nahi aaya.");
        boolean pm = "pm".equals(ap) || (part != null && part.matches("dopahar|dopehar|shaam|sham|raat|rat"));
        if (pm && h < 12 && !(part != null && part.matches("raat|rat") && h <= 4)) h += 12;
        if ("am".equals(ap) && h == 12) h = 0;
        Intent i = new Intent(AlarmClock.ACTION_SET_ALARM)
            .putExtra(AlarmClock.EXTRA_HOUR, h).putExtra(AlarmClock.EXTRA_MINUTES, min)
            .putExtra(AlarmClock.EXTRA_MESSAGE, "Jarvis").putExtra(AlarmClock.EXTRA_SKIP_UI, true);
        if (!start(i)) return ok("Is phone ki ghari app alarm nahi le rahi.");
        return ok(String.format(Locale.ROOT, "Alarm %d:%02d par laga diya.", h, min));
    }

    private static final Pattern TIMER = Pattern.compile("(\\d{1,3})\\s*(ghante|ghanta|hour|hours|minute|minutes|mint|min|second|seconds|sec|saikand)");
    private Result timer(String t) {
        if (!t.contains("timer")) return null;
        Matcher m = TIMER.matcher(t);
        if (!m.find()) return ok("Kitni der ka timer? Jaise '10 minute ka timer lagao'.");
        int n = Integer.parseInt(m.group(1)); String u = m.group(2);
        int sec = u.startsWith("gh") || u.startsWith("hour") ? n * 3600 : u.startsWith("s") ? n : n * 60;
        if (sec < 1 || sec > 86400) return ok("Timer 24 ghante tak ka hi lag sakta hai.");
        Intent i = new Intent(AlarmClock.ACTION_SET_TIMER).putExtra(AlarmClock.EXTRA_LENGTH, sec)
            .putExtra(AlarmClock.EXTRA_MESSAGE, "Jarvis").putExtra(AlarmClock.EXTRA_SKIP_UI, true);
        if (!start(i)) return ok("Is phone ki ghari app timer nahi le rahi.");
        return ok(n + " " + u + " ka timer laga diya.");
    }

    // ---------- call / SMS / WhatsApp (aakhri button user ka) ----------
    private static final Pattern CALL_NAME = Pattern.compile("^(?:(?:phone|mobile) (?:se|par|pe) )?(.+?) ko (?:call|phone|fon|kaal)\\s*(?:karo|kar do|lagao|laga do|milao|mila do|kro)");
    private static final Pattern CALL_NAME2 = Pattern.compile("^(?:call|phone) (?:karo|lagao|milao) (.+?)(?: ko)?$");
    private Result call(String t) {
        // Sirf saaf "call karo / phone lagao / fon milao" (warna "phone par 0300.. ko whatsapp karo" bhi dial ho jata)
        if (!t.matches(".*\\b(call|kaal)\\b.*") && !t.matches(".*\\b(phone|fon) (lagao|laga do|milao|mila do|karo|kar do)\\b.*")) return null;
        if (t.contains("whatsapp") && !t.matches(".*\\b(call|kaal)\\b.*")) return null;
        Matcher n = NUM.matcher(t);
        String who = null, number = null;
        if (n.find()) number = n.group(1).replaceAll("[\\s-]", "");
        else {
            Matcher m = CALL_NAME.matcher(t); if (m.find()) who = m.group(1);
            else { m = CALL_NAME2.matcher(t); if (m.find()) who = m.group(1); }
            if (who == null) return null;
            who = cleanName(who);
            Object c = contactNumber(who);
            if (c instanceof Result) return (Result) c;
            number = (String) c;
        }
        start(new Intent(Intent.ACTION_DIAL, Uri.parse("tel:" + Uri.encode(number))));
        return ok((who == null ? number : who) + " ka number dialer mein khol diya. Call ka button aap dabayein.");
    }

    private static final Pattern SMS = Pattern.compile("^(.+?) ko (?:sms|text|message|msg|paigham)\\s*(?:karo|bhejo|bhej do|likho)?\\s*(?:ke|ki|keh do|:)?\\s*(.*)$");
    private Result sms(String t) {
        if (!t.matches(".*\\b(sms|text message)\\b.*") || t.contains("whatsapp")) return null;
        Matcher m = SMS.matcher(t.replaceFirst("^(phone|mobile) (se|par|pe) ", ""));
        if (!m.find()) return ok("Kis ko aur kya? Jaise 'Ali ko sms karo ke main aa raha hoon'.");
        String who = cleanName(m.group(1).replaceAll("\\b(sms|text)\\b", "").trim()), body = m.group(2).trim();
        String number;
        Matcher n = NUM.matcher(who);
        if (n.find()) number = n.group(1).replaceAll("[\\s-]", "");
        else { Object c = contactNumber(who); if (c instanceof Result) return (Result) c; number = (String) c; }
        start(new Intent(Intent.ACTION_SENDTO, Uri.parse("smsto:" + Uri.encode(number))).putExtra("sms_body", body));
        return ok("SMS tayar hai. Send aap khud dabayein.");
    }

    private static final Pattern WA = Pattern.compile("whats\\s*app\\s*(?:par|pe|per|se)?\\s*(.+?)\\s+ko\\s*(?:message|msg|paigham)?\\s*(?:bhejo|likho|karo|bhej do)?\\s*(?:ke|ki|keh do|:)?\\s*(.*)$");
    private Result whatsapp(String t) {
        if (!t.contains("whatsapp") && !t.contains("whats app")) return null;
        Matcher m = WA.matcher(t);
        if (!m.find()) {
            Intent i = act.getPackageManager().getLaunchIntentForPackage("com.whatsapp");
            if (i == null) return ok("Phone par WhatsApp nahi mila.");
            start(i); return ok("WhatsApp khol diya.");
        }
        String who = cleanName(m.group(1)), body = m.group(2).trim(), number;
        Matcher n = NUM.matcher(who);
        if (n.find()) number = n.group(1).replaceAll("[\\s-]", "");
        else { Object c = contactNumber(who); if (c instanceof Result) return (Result) c; number = (String) c; }
        String wa = waNumber(number);
        Intent i = new Intent(Intent.ACTION_VIEW, Uri.parse("https://wa.me/" + wa + "?text=" + Uri.encode(body)));
        start(i);
        return ok("WhatsApp par " + who + " ka message tayar hai. Send aap khud dabayein.");
    }

    static String waNumber(String raw) {
        String d = raw.replaceAll("[^\\d]", "");
        if (d.startsWith("00")) d = d.substring(2);
        if (d.startsWith("03") && d.length() == 11) d = "92" + d.substring(1);
        return d;
    }

    private static String cleanName(String s) {
        return s.replaceAll("^(phone|mobile|whatsapp)\\s*(se|par|pe)?\\s*", "").replaceAll("\\b(bhai|sahab|saab|ji)\\b", "").replaceAll("\\s+", " ").trim();
    }

    // Phone ke contacts se number (ijazat pehli dafa maangi jati hai). Do ya zyada mile to andaza nahi.
    private Object contactNumber(String name) {
        if (Build.VERSION.SDK_INT >= 23 && act.checkSelfPermission(Manifest.permission.READ_CONTACTS) != PackageManager.PERMISSION_GRANTED) {
            act.runOnUiThread(() -> act.requestPermissions(new String[] { Manifest.permission.READ_CONTACTS }, REQ_CONTACTS));
            return ok("Contacts dekhne ki ijazat dein, phir dobara kahein.");
        }
        String[] proj = { ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME, ContactsContract.CommonDataKinds.Phone.NUMBER };
        String exact = null, firstHit = null, firstName = null; int hits = 0;
        try (Cursor c = act.getContentResolver().query(ContactsContract.CommonDataKinds.Phone.CONTENT_URI, proj,
                ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME + " LIKE ?", new String[] { "%" + name + "%" }, null)) {
            java.util.HashSet<String> people = new java.util.HashSet<>();
            while (c != null && c.moveToNext()) {
                String n = c.getString(0), num = c.getString(1);
                if (n == null || num == null) continue;
                if (n.trim().equalsIgnoreCase(name)) exact = num;
                if (people.add(n.toLowerCase(Locale.ROOT))) { hits++; if (firstHit == null) { firstHit = num; firstName = n; } }
            }
        }
        if (exact != null) return exact;
        if (hits == 1) return firstHit;
        if (hits == 0) return ok(name + " naam ka contact phone mein nahi mila.");
        return ok(name + " naam ke " + hits + " contacts hain. Poora naam bolein.");
    }

    // ---------- camera / rasta ----------
    private Result camera(String t) {
        if (!t.matches(".*\\b(camera|kamra)\\b.*\\b(kholo|chalao|on|open)\\b.*") && !t.matches(".*\\b(photo|tasveer|selfie)\\b.*\\b(lo|kheencho|khicho|banao|nikalo)\\b.*")) return null;
        if (t.contains("laptop")) return null;
        boolean video = t.contains("video");
        start(new Intent(video ? MediaStore.INTENT_ACTION_VIDEO_CAMERA : MediaStore.INTENT_ACTION_STILL_IMAGE_CAMERA));
        return ok("Camera khol diya.");
    }

    private static final Pattern ROUTE1 = Pattern.compile("^(?:mujhe )?(.+?) (?:ka|tak ka|ki taraf ka|jane ka) (?:rasta|raasta|route)");
    private static final Pattern ROUTE2 = Pattern.compile("(?:navigate|navigation|rasta|raasta|directions?)\\s*(?:to|batao|dikhao|chahiye)?\\s+(?:to\\s+)?(.+)$");
    private Result route(String t) {
        if (!t.matches(".*\\b(rasta|raasta|route|navigate|navigation|directions?)\\b.*")) return null;
        Matcher m = ROUTE1.matcher(t);
        String place = m.find() ? m.group(1) : null;
        if (place == null) { m = ROUTE2.matcher(t); if (m.find()) place = m.group(1); }
        if (place == null) return null;
        place = place.replaceAll("\\b(batao|dikhao|chahiye|ka|tak)\\b", "").trim();
        if (place.isEmpty()) return null;
        Intent i = new Intent(Intent.ACTION_VIEW, Uri.parse("google.navigation:q=" + Uri.encode(place)));
        if (!start(i) && !start(new Intent(Intent.ACTION_VIEW, Uri.parse("geo:0,0?q=" + Uri.encode(place))))) return ok("Phone par map app nahi mili.");
        return ok(place + " ka rasta map mein khol diya.");
    }

    // ---------- sirf "phone/mobile" kehne par ----------
    private Result battery(String t) {
        if (!t.matches(".*\\b(battery|betri|charge|charging)\\b.*")) return null;
        BatteryManager bm = (BatteryManager) act.getSystemService(Context.BATTERY_SERVICE);
        int pct = bm.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY);
        boolean ch = Build.VERSION.SDK_INT >= 23 && bm.isCharging();
        return ok("Phone ki battery " + pct + " percent hai" + (ch ? ", charge ho rahi hai." : "."));
    }

    private Result volume(String t) {
        if (!t.matches(".*\\b(awaz|aawaz|awaaz|volume|sound)\\b.*")) return null;
        AudioManager am = (AudioManager) act.getSystemService(Context.AUDIO_SERVICE);
        int s = AudioManager.STREAM_MUSIC, max = am.getStreamMaxVolume(s);
        Matcher p = Pattern.compile("(\\d{1,3})\\s*(?:percent|%|fisad)").matcher(t);
        if (p.find()) { int v = Math.min(100, Integer.parseInt(p.group(1))); am.setStreamVolume(s, Math.round(max * v / 100f), AudioManager.FLAG_SHOW_UI); return ok("Phone ki awaz " + v + " percent kar di."); }
        if (t.matches(".*\\b(band|mute|khamosh)\\b.*")) { am.setStreamVolume(s, 0, AudioManager.FLAG_SHOW_UI); return ok("Phone ki awaz band kar di."); }
        if (t.matches(".*\\b(full|poori|puri|max)\\b.*")) { am.setStreamVolume(s, max, AudioManager.FLAG_SHOW_UI); return ok("Phone ki awaz poori kar di."); }
        boolean down = t.matches(".*\\b(kam|dheemi|dheema|halki|down|neeche)\\b.*");
        for (int i = 0; i < 3; i++) am.adjustStreamVolume(s, down ? AudioManager.ADJUST_LOWER : AudioManager.ADJUST_RAISE, i == 0 ? AudioManager.FLAG_SHOW_UI : 0);
        return ok(down ? "Phone ki awaz kam kar di." : "Phone ki awaz barha di.");
    }

    private Result ringer(String t) {
        if (!t.matches(".*\\b(silent|vibrate|vibration|ringer|ring)\\b.*")) return null;
        AudioManager am = (AudioManager) act.getSystemService(Context.AUDIO_SERVICE);
        boolean normal = t.matches(".*\\b(normal|ring on|hatao|band karo silent|off)\\b.*");
        try { am.setRingerMode(normal ? AudioManager.RINGER_MODE_NORMAL : AudioManager.RINGER_MODE_VIBRATE); }
        catch (SecurityException e) { start(new Intent(Settings.ACTION_SOUND_SETTINGS)); return ok("Phone ne seedha ijazat nahi di; sound settings khol di."); }
        return ok(normal ? "Phone ki ghanti wapas on." : "Phone vibrate par kar diya.");
    }

    private Result panels(String t) {
        Intent i = null; String what = null;
        if (t.matches(".*\\b(wifi|wi-fi|wai fai)\\b.*")) { i = Build.VERSION.SDK_INT >= 29 ? new Intent(Settings.Panel.ACTION_WIFI) : new Intent(Settings.ACTION_WIFI_SETTINGS); what = "Wi-Fi"; }
        else if (t.matches(".*\\b(bluetooth|blutooth)\\b.*")) { i = new Intent(Settings.ACTION_BLUETOOTH_SETTINGS); what = "Bluetooth"; }
        else if (t.matches(".*\\b(data|internet)\\b.*\\b(on|off|band|chalu)\\b.*")) { i = Build.VERSION.SDK_INT >= 29 ? new Intent(Settings.Panel.ACTION_INTERNET_CONNECTIVITY) : new Intent(Settings.ACTION_WIRELESS_SETTINGS); what = "Internet"; }
        else if (t.matches(".*\\b(brightness|roshni)\\b.*")) { i = new Intent(Settings.ACTION_DISPLAY_SETTINGS); what = "Brightness"; }
        else if (t.matches(".*\\b(settings|setting)\\b.*")) { i = new Intent(Settings.ACTION_SETTINGS); what = "Settings"; }
        if (i == null) return null;
        start(i);
        return ok(what + " khol diya. Android app ko yeh khud on/off nahi karne deta, button aap dabayein.");
    }

    private Result search(String t) {
        Matcher m = Pattern.compile("(youtube|google|maps)\\s*(?:par|pe|per)\\s+(.+?)\\s*(?:chalao|lagao|dhoondo|search karo|dikhao|kholo)?$").matcher(t.replaceFirst("^(phone|mobile) (par|pe|mein) ", ""));
        if (!m.find()) return null;
        String site = m.group(1), q = m.group(2).trim();
        String url = "youtube".equals(site) ? "https://www.youtube.com/results?search_query=" + Uri.encode(q)
            : "maps".equals(site) ? "geo:0,0?q=" + Uri.encode(q) : "https://www.google.com/search?q=" + Uri.encode(q);
        start(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
        return ok(site + " par \"" + q + "\" khol diya.");
    }

    private Result openApp(String t) {
        Matcher m = Pattern.compile("^(?:(?:phone|mobile) (?:par|pe|mein|me) )?(.+?) (?:app )?" + GO + "(?: (?:phone|mobile) (?:par|pe|mein|me))?$").matcher(t);
        if (!m.find()) return null;
        String want = m.group(1).replaceAll("\\b(phone|mobile|par|pe|mein|me|ki|ka|app)\\b", "").replaceAll("\\s+", " ").trim();
        if (want.isEmpty()) return null;
        PackageManager pm = act.getPackageManager();
        List<ResolveInfo> apps = pm.queryIntentActivities(new Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER), 0);
        ResolveInfo best = null; int bestScore = 0;
        for (ResolveInfo r : apps) {
            String label = String.valueOf(r.loadLabel(pm)).toLowerCase(Locale.ROOT);
            int s = label.equals(want) ? 3 : label.startsWith(want) ? 2 : label.contains(want) ? 1 : 0;
            if (s > bestScore) { bestScore = s; best = r; }
        }
        if (best == null) return ok("Phone par \"" + want + "\" naam ki app nahi mili.");
        Intent i = pm.getLaunchIntentForPackage(best.activityInfo.packageName);
        if (i == null) return ok("Yeh app khul nahi rahi.");
        start(i);
        return ok(best.loadLabel(pm) + " khol di.");
    }
}
