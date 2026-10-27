---
name: faheem-design
description: Hand-made look for websites and stores, no AI-slop
version: 1.0.0
author: Faheem Ahmed
metadata:
  hermes:
    tags: [design, website, html, css, ecommerce]
    category: design
---
# Faheem Design Rules

Rules distilled from Hallmark (github.com/Nutlope/hallmark, MIT) so that even small free models build sites that look designed, not generated.

## When to Use
Any time you build or change a website, landing page, online store (like Vestire Collection) or any HTML/CSS UI.

## Procedure
1. Keep the user's business name, products, prices (PKR for Pakistani shops) and language exactly.
2. Follow every rule below while writing the HTML/CSS.
3. Before finishing, re-read the CSS and fix anything that breaks a rule.

DESIGN RULES (anti "AI-slop", always follow):
1. Put every colour and font in CSS variables in :root (--bg, --text, --accent, --font-head, --font-body) and use var(...) everywhere else.
2. Never "transition: all". Animate only transform and opacity, never width/height/top/left.
3. No purple-to-blue gradients, no card inside a card, no emoji as icons (use simple inline SVG), no fake browser windows.
4. html, body { overflow-x: clip; } — never overflow-x: hidden, never width: 100vw.
5. Every button, link and input has a visible :focus-visible style.
6. Every animation has a @media (prefers-reduced-motion: reduce) fallback, and content stays visible without JavaScript.
7. Never invent numbers, reviews, testimonials or brand logos the user did not give. Leave a clearly marked slot instead.
8. Labels, tags and nav links in normal sentence case — no small ALL-CAPS tracked labels above every heading.
9. Hero: short headline (max 7 words), one sentence, one or two buttons — all visible on a laptop screen without scrolling.
10. Max ~80 words per screen; big real pictures instead of long text. Content container max-width ~1200px, centred.
11. Two font families at most, body text 16px or bigger, good contrast.
12. Image grids use grid-template-columns: repeat(auto-fill, minmax(min(240px,100%), 1fr)) so nothing overflows on phones.

## Pitfalls
- Do not add fake reviews, star ratings, customer counts or brand logos. Leave a marked slot for real ones.
- Do not use placeholder image sites. Use https://image.pollinations.ai/prompt/<description>?width=800&height=800&nologo=true or the user's own photos.

## Verification
- Search the CSS for "transition: all", "100vw", "overflow-x: hidden" and purple/blue gradients: there should be none.
- Every button/link has a :focus-visible style; every animation has a prefers-reduced-motion fallback.
