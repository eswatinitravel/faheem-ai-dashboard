import Link from "next/link";
import Icon from "../components/Icon";
import Background from "../components/Background";
import ThemeBalls from "../components/ThemeBalls";
import { SKILLS } from "../../lib/skills";

export const metadata = { title: "Skills · Faheem AI" };

// v3.11 Skills hub: dashboard ki har skill aur tool ek jagah, har ek ka apna page.
export default function Skills() {
  return (
    <main className="optpage">
      <Background />
      <header className="topbar">
        <Link href="/" className="icon-btn" title="Wapas chat" aria-label="Wapas chat"><Icon name="back" /></Link>
        <div className="brand"><Icon name="grid" /> Skills · sab ek jagah</div>
        <div className="top-actions"><Link href="/gallery" className="icon-btn" title="Gallery" aria-label="Gallery"><Icon name="image" /></Link><ThemeBalls /></div>
      </header>
      <div className="toolspage">
        <p className="muted skillintro">{SKILLS.length} skills aur tools. Har card kholein: live panel, "Kaise kaam karta hai" aur "Setup" (commands, keys, license).</p>
        <div className="toolsgrid">
          {SKILLS.map((s) => (
            <Link key={s.id} href={`/skills/${s.id}`} className="card panel skillcard" data-skill={s.id}>
              <div className="skillcard-head"><span className="skillico"><Icon name={s.icon} size={18} /></span><div><b>{s.name}</b><small>{s.tag}</small></div></div>
              <p>{s.summary}</p>
              <small className="muted">{s.license}</small>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
