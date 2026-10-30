"use client";
import { useEffect, useRef } from "react";
import Link from "next/link";
import Icon from "../components/Icon";
import Background from "../components/Background";
import ThemeBalls from "../components/ThemeBalls";

// v3.12 Flights: Travelpayouts / Aviasales widgets (Eswatini Travels affiliate, marker 797848).
const SEARCH_FORM = "https://tpembd.com/content?currency=usd&trs=593218&shmarker=797848&show_hotels=true&powered_by=true&locale=en&searchUrl=www.aviasales.com%2Fsearch&primary_override=%2332a8dd&color_button=%2332a8dd&color_icons=%2332a8dd&dark=%23262626&light=%23ffffff&secondary=%233FABDB&special=%23C4C4C4&color_focused=%2332a8dd&border_radius=0&plain=false&promo_id=7879&campaign_id=100";
const PRICE_MAP = "https://tpembd.com/content?currency=usd&trs=593218&shmarker=797848&lat=-26.2041028&lng=28.0473051&powered_by=true&search_host=www.aviasales.com%2Fsearch&locale=en&origin=JNB&value_min=0&value_max=1000000&round_trip=true&only_direct=false&radius=1&draggable=true&disable_zoom=false&show_logo=false&scrollwheel=false&primary=%233FABDB&secondary=%233FABDB&light=%23ffffff&width=1500&height=500&zoom=2&promo_id=4054&campaign_id=100";

function Widget({ src }) {
  const box = useRef(null);
  useEffect(() => {
    const el = box.current;
    if (!el || el.dataset.loaded) return;
    el.dataset.loaded = "1";
    const s = document.createElement("script");
    s.async = true; s.charset = "utf-8"; s.src = src;
    el.appendChild(s);
  }, [src]);
  return <div ref={box} className="tp-widget" style={{ width: "100%", minHeight: 120, overflow: "hidden", background: "#fff", borderRadius: 12, padding: 8 }} />;
}

export default function FlightsPage() {
  return (
    <main className="optpage">
      <Background />
      <header className="topbar">
        <Link href="/" className="icon-btn" title="Wapas chat" aria-label="Wapas chat"><Icon name="back" /></Link>
        <div className="brand"><Icon name="globe" /> Flights</div>
        <div className="top-actions"><Link href="/options" className="icon-btn" title="Options" aria-label="Options"><Icon name="settings" /></Link><ThemeBalls /></div>
      </header>
      <div className="toolspage">
        <section className="card panel">
          <h2>Sasti flights dhoondo</h2>
          <Widget src={SEARCH_FORM} />
        </section>
        <section className="card panel">
          <h2>Johannesburg se prices map par</h2>
          <Widget src={PRICE_MAP} />
        </section>
        <p className="muted small">Booking Aviasales / airline site par hoti hai; Eswatini Travels ko commission milta hai. Internet zaroori hai.</p>
      </div>
    </main>
  );
}
