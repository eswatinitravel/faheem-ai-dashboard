# v3.26.1 Jarvis/Friday: offline KittenTTS 2 nano (Hindi model) for Roman Urdu.
# Install once:  pip install onnxruntime numpy phonemizer espeakng_loader
# Use: python kitten_tts.py <out.wav> <voice> <text>      voice: priya | ananya | arjun | vikram
# Model (Apache-2.0, KittenML/kitten-tts-2-nano, int4 ~8.8 MB + voices ~2 MB) downloads once to
# %USERPROFILE%/.cache/kitten-tts-2-nano (or KITTEN_DIR). Phonemes: espeak-ng "hi" via phonemizer,
# post-processed like kittenml 0.9.8 (phonemizer v1 + misaki EspeakG2P). espeak-ng is GPL-3.0 and is
# only loaded at run time from the user's own pip install; nothing GPL is shipped in this repo.
import json, os, re, sys, wave, urllib.request

REPO = "https://huggingface.co/KittenML/kitten-tts-2-nano/resolve/main/"
FILES = ["vocab.json", "kitten_tts_2_nano_hi_int4.onnx", "voices_hi.npz"]
DIR = os.environ.get("KITTEN_DIR") or os.path.join(os.path.expanduser("~"), ".cache", "kitten-tts-2-nano")
SR = 24000

# ---------- Roman Urdu -> Devanagari (simple rules; English words stay Latin) ----------
WORDS = {
    "salam": "सलाम", "salaam": "सलाम", "assalam": "अस्सलाम", "alaikum": "अलैकुम", "main": "मैं", "mai": "मैं",
    "hoon": "हूँ", "hun": "हूँ", "hu": "हूँ", "hai": "है", "hain": "हैं", "hy": "है", "kya": "क्या", "kia": "क्या",
    "aap": "आप", "ap": "आप", "aaj": "आज", "nahi": "नहीं", "nahin": "नहीं", "mein": "में", "me": "में",
    "theek": "ठीक", "thik": "ठीक", "aur": "और", "or": "और", "yeh": "यह", "ye": "ये", "woh": "वह", "wo": "वो",
    "acha": "अच्छा", "achha": "अच्छा", "accha": "अच्छा", "ji": "जी", "haan": "हाँ", "han": "हाँ", "kuch": "कुछ",
    "abhi": "अभी", "shukriya": "शुक्रिया", "karna": "करना", "kar": "कर", "ka": "का", "ki": "की", "ke": "के",
    "ko": "को", "se": "से", "par": "पर", "pe": "पे", "hum": "हम", "tum": "तुम", "mera": "मेरा", "meri": "मेरी",
    "aapka": "आपका", "kaise": "कैसे", "kaisa": "कैसा", "kahan": "कहाँ", "kab": "कब", "kyun": "क्यों",
    "kyon": "क्यों", "bhi": "भी", "sab": "सब", "tha": "था", "thi": "थी", "gaya": "गया", "raha": "रहा",
    "rahi": "रही", "dein": "दें", "do": "दो", "bataen": "बताएँ", "batao": "बताओ", "khuda": "ख़ुदा",
    "hafiz": "हाफ़िज़", "zaroor": "ज़रूर", "zaroori": "ज़रूरी", "sahib": "साहिब", "bhai": "भाई", "jee": "जी",
}
EN = set("""the a an is are am was were be been to of in on at for with and or not no yes ok okay hello hi hey
please thanks thank you your my me it this that what which who file files folder open close start stop app apps
dashboard jarvis friday email mail phone laptop computer windows chrome google youtube github code update error
music song video settings voice mode online offline internet wifi download upload save delete new task tasks
meeting today tomorrow time date news weather sir madam boss done ready test screen""".split())

CONS = [("chh", "छ"), ("kh", "ख"), ("gh", "घ"), ("ch", "च"), ("jh", "झ"), ("th", "थ"), ("dh", "ध"),
        ("ph", "फ"), ("bh", "भ"), ("sh", "श"), ("zh", "ज़"), ("rh", "ढ़"), ("k", "क"), ("g", "ग"), ("j", "ज"),
        ("t", "त"), ("d", "द"), ("n", "न"), ("p", "प"), ("b", "ब"), ("m", "म"), ("y", "य"), ("r", "र"),
        ("l", "ल"), ("v", "व"), ("w", "व"), ("s", "स"), ("h", "ह"), ("z", "ज़"), ("f", "फ़"), ("q", "क़"),
        ("x", "क्स"), ("c", "क")]
VOW = [("aa", "आ", "ा"), ("ai", "ऐ", "ै"), ("au", "औ", "ौ"), ("ee", "ई", "ी"), ("ii", "ई", "ी"),
       ("oo", "ऊ", "ू"), ("uu", "ऊ", "ू"), ("a", "अ", ""), ("i", "इ", "ि"), ("u", "उ", "ु"), ("e", "ए", "े"),
       ("o", "ओ", "ो")]


def _word(w):
    lw = w.lower()
    if lw in WORDS:
        return WORDS[lw]
    if lw in EN or re.search(r"(tion|ing|ment|ness|ould|ight)$", lw):
        return w
    out, i, prev_cons, n = [], 0, False, len(lw)
    while i < n:
        for rom, ind, mat in VOW:
            if lw.startswith(rom, i):
                end = i + len(rom) == n
                if rom == "a" and end and prev_cons:
                    out.append("ा")                       # final a is long in Roman Urdu: karna, kya
                elif prev_cons:
                    out.append(mat)
                else:
                    out.append(ind)
                i += len(rom)
                if i == n - 1 and lw[i] == "n" and rom != "a":
                    out.append("ं"); i += 1                   # nahin, hain -> nasal
                prev_cons = False
                break
        else:
            for rom, dev in CONS:
                if lw.startswith(rom, i):
                    if prev_cons:
                        out.append("्")                   # cluster: kya, shukriya
                    out.append(dev); i += len(rom); prev_cons = True
                    break
            else:
                out.append(lw[i]); i += 1; prev_cons = False
    return "".join(out)


def roman_to_dev(text):
    return re.sub(r"[A-Za-z]+", lambda m: _word(m.group(0)), text)


# ---------- phonemes (as kittenml EspeakG2P, phonemizer v1, language "hi") ----------
E2M = sorted({"a^ɪ": "I", "a^ʊ": "W", "d^z": "ʣ", "d^ʒ": "ʤ", "e^ɪ": "A", "o^ʊ": "O", "ə^ʊ": "Q",
              "s^s": "S", "t^s": "ʦ", "t^ʃ": "ʧ", "ɔ^ɪ": "Y"}.items())
FOLD = {"\u032a": "", "\u0329": "", "\u030d": "", "\u032f": "", "\u026d": "l", "\u026b": "l", "\u0275": "\u00f8",
        "\u03b5": "\u025b", "{": "", "}": "", "[": "", "]": "", "\u00bf": "", "\u00a1": "", "\u202f": " "}


def phonemize(text):
    import espeakng_loader
    from phonemizer.backend.espeak.wrapper import EspeakWrapper
    from phonemizer.backend import EspeakBackend
    EspeakWrapper.set_library(espeakng_loader.get_library_path())
    os.environ.setdefault("ESPEAK_DATA_PATH", espeakng_loader.get_data_path())
    if hasattr(EspeakWrapper, "set_data_path"):
        EspeakWrapper.set_data_path(espeakng_loader.get_data_path())
    be = EspeakBackend(language="hi", preserve_punctuation=True, with_stress=True, tie="^",
                       language_switch="remove-flags")
    text = text.replace("«", "\u201c").replace("»", "\u201d").replace("(", "«").replace(")", "»")
    ps = (be.phonemize([text]) or [""])[0].strip()
    for a, b in E2M:
        ps = ps.replace(a, b)
    ps = ps.replace("^", "").replace("-", "").replace("«", "(").replace("»", ")")
    for a, b in FOLD.items():
        ps = ps.replace(a, b)
    return ps


def fetch():
    os.makedirs(DIR, exist_ok=True)
    for f in FILES:
        p = os.path.join(DIR, f)
        if not os.path.exists(p) or os.path.getsize(p) == 0:
            urllib.request.urlretrieve(REPO + f, p + ".part")
            os.replace(p + ".part", p)


def chunks(ps, maxlen=350):
    parts, cur = [], ""
    for s in re.split(r"(?<=[.!?।])\s+", ps):
        while len(s) > maxlen:
            cut = s.rfind(" ", 0, maxlen)
            cut = cut if cut > 0 else maxlen
            parts.append(s[:cut]); s = s[cut:].strip()
        if cur and len(cur) + 1 + len(s) > maxlen:
            parts.append(cur); cur = s
        else:
            cur = (cur + " " + s).strip()
    if cur:
        parts.append(cur)
    return parts


def synth(text, voice="priya", speed=1.0):
    import numpy as np, onnxruntime as ort
    fetch()
    vocab = json.load(open(os.path.join(DIR, FILES[0]), encoding="utf-8"))
    sess = ort.InferenceSession(os.path.join(DIR, FILES[1]), providers=["CPUExecutionProvider"])
    with np.load(os.path.join(DIR, FILES[2])) as z:
        pack = z[voice if voice in z.files else "priya"].astype(np.float32)
    out, gap = [], np.zeros(int(0.15 * SR), dtype=np.float32)
    for k, ps in enumerate(chunks(phonemize(roman_to_dev(text)))):
        tok = [0] + [vocab[c] if c in vocab else vocab[","] for c in ps if c in vocab or c in "()"] + [10, 0]
        style = pack[min(len(tok) - 1, pack.shape[0] - 1)][None]
        wav, dur = sess.run(None, {"input_ids": np.array([tok], dtype=np.int64), "style": style,
                                   "speed": np.array([speed], dtype=np.float32)})
        w = np.clip(wav.astype(np.float32), -1, 1)
        spf = max(1, round(len(w) / max(int(dur.sum()), 1)))
        lead = 0 if k == 0 else max(0, int(dur[0]) - 1) * spf
        trail = max(0, int(dur[-1]) - 1) * spf
        if lead + trail + spf < len(w):
            w = w[lead: len(w) - trail] if trail else w[lead:]
        w = np.ascontiguousarray(w)
        f = min(120, len(w) // 8)
        if f:
            w[:f] *= np.linspace(0, 1, f, dtype=np.float32); w[-f:] *= np.linspace(1, 0, f, dtype=np.float32)
        out += [w, gap]
    return np.concatenate(out[:-1]) if out else np.zeros(0, dtype=np.float32)


def main():
    if len(sys.argv) < 4:
        print("usage: kitten_tts.py out.wav voice text"); sys.exit(2)
    import numpy as np
    audio = synth(" ".join(sys.argv[3:]), sys.argv[2].lower())
    if not len(audio):
        sys.exit(1)
    with wave.open(sys.argv[1], "wb") as wf:
        wf.setnchannels(1); wf.setsampwidth(2); wf.setframerate(SR)
        wf.writeframes((audio * 32767).astype(np.int16).tobytes())
    sys.stdout.write("ok")


if __name__ == "__main__":
    main()
