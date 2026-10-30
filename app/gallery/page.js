"use client";
import Link from "next/link";
import Icon from "../components/Icon";
import Background from "../components/Background";
import ThemeBalls from "../components/ThemeBalls";
import Gallery from "../components/Gallery";

// v3.11 Gallery: sab pictures/files ek jagah (sirf isi laptop par, data/gallery).
// HTML/CSS file seedha Impeccable audit ko; picture "Chat" se vision brain ko.
export default function GalleryPage() {
  return (
    <main className="optpage">
      <Background />
      <header className="topbar">
        <Link href="/" className="icon-btn" title="Wapas chat" aria-label="Wapas chat"><Icon name="back" /></Link>
        <div className="brand"><Icon name="image" /> Gallery</div>
        <div className="top-actions"><Link href="/skills" className="icon-btn" title="Skills" aria-label="Skills"><Icon name="grid" /></Link><ThemeBalls /></div>
      </header>
      <div className="toolspage gallerypage">
        <Gallery title="Meri files" onUse={(f) => { location.href = `/skills/impeccable?file=${encodeURIComponent(f.name)}`; }} useLabel="Impeccable audit" chatPrompt="Is picture/file ko dekho aur design ke bare mein batao." />
        <p className="muted small">Files is laptop par <code>data/gallery</code> mein rehti hain (update se nahi mitti). Bahar se koi nahi dekh sakta.</p>
      </div>
    </main>
  );
}
