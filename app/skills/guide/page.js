import Link from "next/link";
import Icon from "../../components/Icon";
import Background from "../../components/Background";
import ThemeBalls from "../../components/ThemeBalls";
import { SKILLS } from "../../../lib/skills";
import { SKILL_GUIDE } from "../../../lib/skills-guide";

export const metadata = { title: "Skills guide · Faheem AI" };

// v3.14 Skills guide: har skill aasaan Roman Urdu mein — kya karti hai, kab, kaise, ek misaal prompt.
export default function SkillsGuide() {
  return (
    <main className="optpage">
      <Background />
      <header className="topbar">
        <Link href="/skills" className="icon-btn" title="Wapas Skills" aria-label="Wapas Skills"><Icon name="back" /></Link>
        <div className="brand"><Icon name="grid" /> Skills guide · aasaan zubaan mein</div>
        <div className="top-actions"><Link href="/" className="icon-btn" title="Chat" aria-label="Chat"><Icon name="chat" /></Link><ThemeBalls /></div>
      </header>
      <div className="guidepage" data-skills-guide>
        <p className="muted" style={{ maxWidth: 980, margin: "0 auto 10px" }}>{SKILLS.length} skills. Har ek ke liye: kya karti hai, kab use karein, kaise chalayein (steps) aur ek misaal prompt jo aap copy kar sakte hain.</p>
        <nav className="guidetoc">{SKILLS.map((s) => <a key={s.id} href={`#g-${s.id}`}>{s.name}</a>)}</nav>
        <div className="guidelist">
          {SKILLS.map((s) => {
            const g = SKILL_GUIDE[s.id];
            if (!g) return null;
            return (
              <section key={s.id} id={`g-${s.id}`} className="card panel guidecard" data-guide={s.id}>
                <h2><Icon name={s.icon} size={18} /> {s.name}</h2>
                <h3>Kya karti hai</h3><p>{g.kya}</p>
                <h3>Kab use karein</h3><p>{g.kab}</p>
                <h3>Kaise chalayein</h3><ol>{g.steps.map((x, i) => <li key={i}>{x}</li>)}</ol>
                <h3>Misaal prompt</h3><p className="misaal">{g.misaal}</p>
                <Link href={s.href || `/skills/${s.id}`} className="muted">Skill kholein →</Link>
              </section>
            );
          })}
        </div>
      </div>
    </main>
  );
}
