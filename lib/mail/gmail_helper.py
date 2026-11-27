# v3.39 Gmail helper (sirf Python stdlib: imaplib + smtplib). Node isay stdin par JSON deta hai:
#   {"action":"test"|"list"|"send", "user":..., "pass":<Google App Password>, ...}
# list: INBOX sirf PARHTA hai (readonly + BODY.PEEK, email "parha hua" nahi banti). send: SMTP se reply.
# Password kabhi print/log nahi hota.
import sys, json, imaplib, smtplib, email, re, html
from email.header import decode_header, make_header
from email.message import EmailMessage
from email.utils import parseaddr, make_msgid, formatdate

def dh(v):
    try: return str(make_header(decode_header(v or "")))
    except Exception: return v or ""

def body_text(msg, limit=3000):
    parts = msg.walk() if msg.is_multipart() else [msg]
    plain, htm = None, None
    for p in parts:
        if p.get_content_maintype() == "multipart" or (p.get("Content-Disposition") or "").lower().startswith("attachment"): continue
        try: raw = p.get_payload(decode=True) or b""; txt = raw.decode(p.get_content_charset() or "utf-8", "replace")
        except Exception: continue
        if p.get_content_type() == "text/plain" and plain is None: plain = txt
        elif p.get_content_type() == "text/html" and htm is None: htm = txt
    t = plain if plain else re.sub(r"<[^>]+>", " ", re.sub(r"(?is)<(script|style).*?</\1>", " ", htm or ""))
    t = html.unescape(t)
    # Purani quoted line ("> ...") aur "On ... wrote:" ke baad ka hissa hatao.
    t = re.split(r"\n\s*On .{5,200}wrote:\s*\n", t)[0]
    t = "\n".join(l for l in t.splitlines() if not l.lstrip().startswith(">"))
    return re.sub(r"\n{3,}", "\n\n", re.sub(r"[ \t]+", " ", t)).strip()[:limit]

def imap(user, pw):
    m = imaplib.IMAP4_SSL("imap.gmail.com", 993, timeout=30); m.login(user, pw); return m

def do_list(a):
    m = imap(a["user"], a["pass"])
    try:
        m.select("INBOX", readonly=True)
        days = max(1, min(14, int(a.get("days", 2))))
        q = a.get("query") or f"in:inbox newer_than:{days}d -category:promotions -category:social -category:forums"
        typ, data = m.search(None, "X-GM-RAW", '"%s"' % q.replace('"', ""))
        ids = (data[0].split() if data and data[0] else [])[-int(a.get("max", 25)):]
        out = []
        for i in reversed(ids):
            typ, d = m.fetch(i, "(X-GM-THRID FLAGS BODY.PEEK[])")
            raw = next((x[1] for x in d if isinstance(x, tuple)), None)
            if not raw: continue
            meta = (d[0][0] if isinstance(d[0], tuple) else b"").decode("ascii", "replace")
            msg = email.message_from_bytes(raw)
            frm = dh(msg.get("From")); addr = parseaddr(msg.get("Reply-To") or msg.get("From"))[1]
            if addr.lower() == a["user"].lower(): continue
            out.append({"msgid": (msg.get("Message-ID") or "").strip(), "from": frm, "replyTo": addr, "subject": dh(msg.get("Subject")),
                        "date": msg.get("Date") or "", "references": (msg.get("References") or "").strip(), "seen": "\\Seen" in meta,
                        "text": body_text(msg)})
        return {"ok": True, "items": out}
    finally:
        try: m.logout()
        except Exception: pass

def do_send(a):
    r = a["reply"]
    to = parseaddr(r["to"])[1]
    if not to or "@" not in to: return {"ok": False, "error": "Pata ghalat"}
    msg = EmailMessage()
    msg["From"] = a["user"]; msg["To"] = to
    subj = r.get("subject") or ""
    msg["Subject"] = subj if subj.lower().startswith("re:") else "Re: " + subj
    msg["Date"] = formatdate(localtime=True); msg["Message-ID"] = make_msgid()
    if r.get("in_reply_to"):
        msg["In-Reply-To"] = r["in_reply_to"]
        msg["References"] = ((r.get("references") or "") + " " + r["in_reply_to"]).strip()
    msg.set_content(r["body"])
    with smtplib.SMTP_SSL("smtp.gmail.com", 465, timeout=30) as s:
        s.login(a["user"], a["pass"]); s.send_message(msg)
    return {"ok": True, "messageId": msg["Message-ID"]}

def main():
    a = json.loads(sys.stdin.read() or "{}")
    try:
        if not a.get("user") or not a.get("pass"): out = {"ok": False, "error": "Gmail ka pata ya App Password nahi"}
        elif a.get("action") == "test": imap(a["user"], a["pass"]).logout(); out = {"ok": True}
        elif a.get("action") == "list": out = do_list(a)
        elif a.get("action") == "send": out = do_send(a)
        else: out = {"ok": False, "error": "action?"}
    except imaplib.IMAP4.error as e:
        out = {"ok": False, "error": "Gmail ne login nahi maana. App Password dobara check karein (" + str(e)[:80].replace(a.get("pass") or "\0", "***") + ")"}
    except smtplib.SMTPAuthenticationError:
        out = {"ok": False, "error": "Gmail ne bhejne ka login nahi maana. App Password check karein."}
    except Exception as e:
        out = {"ok": False, "error": (type(e).__name__ + ": " + str(e))[:200].replace(a.get("pass") or "\0", "***")}
    sys.stdout.write(json.dumps(out, ensure_ascii=False))

if __name__ == "__main__":
    main()
