# Faheem AI — Kaam ka record

## 27 Oct 2026 — ho gaya
- Hermes Agent v0.22.5 laptop par chal raha hai (free model solar-mini4). Telemetry band. Telegram abhi baaki.
- Vestire Collection naya design: imported branded wear (Cougar + Turbo style) — Men / Women / Juniors panels, brand wall, sale countdown (30 Nov 2026), new arrivals, cart, COD/advance checkout, WhatsApp order.
- v2.5: API keys ab `C:\Users\<naam>\.faheem-ai\keys.json` mein — naye install/update se nahi mitti. Chhota, saaf layout.
- v2.6: Live screen (website dashboard ke andar live, desktop/tablet/mobile), Google Stitch jaisa naya theme, naya liquid 3D orb, app icon (Desktop, Start Menu, app window), Vestire mein Club signup, scroll animations, back-to-top.

- v2.7: Free AI pipeline — chat ab bina kisi key ke chalti hai (Pollinations + LLM7, dono free aur bina key). Keys lagi hon to pehle woh, phir free pipeline, phir Ollama. Settings mein On/Off.
- v2.8: Dyad bridge — Dyad ab Faheem AI ki free pipeline se chalta hai, koi key nahi. Dyad > Settings > AI Providers > Add custom provider: Name = Faheem AI, API Base URL = http://localhost:3000/api/v1, API key = free; phir model add karein: faheem-free. Dashboard (START.bat) chalta hona chahiye.
- v3.0: Naya look — front page par sirf saaf chat (Google Stitch jaisa), saare options doosre page (⋯ Options) par. Search button (Ctrl+K) chats mein + web par. Black aura background mein tez chalte laal dots. Oopar 6 theme balls: black-red aura, light pink, light purple, light green, black aura, white aura. Neeche left corner mein chhota version/update. Command dete hi left 25% par LIVE workspace: jo ban raha hai (picture, video storyboard, website preview, code) woh dikhta hai, neeche chhote harfon mein agents ki baat-cheet. Free pictures (Pollinations image). Laptop on hote hi auto start + taskbar tray icon (double-click = kholein, right-click = restart/update/band).
- v3.1: Chat mein 📎 attach — gallery se picture, video, file (ya drag-drop / paste). Text files AI parhta hai; pictures Gemini key ho to AI dekhta hai; video ka naam/lambai. Version ke oopar chamakta "New update" — ek click mein update.
- v3.2: Website/store kaam ab tarteeb se: 🧠 Planner → 🔨 Builder → 🧪 Tester (tez checks + AI QA) → 🔧 Fixer, 3 rounds tak. Asli AI pictures (placeholder nahi). Ek prompt mein website + banner. Gemini key ho to code/website pehle Gemini se. Naya ZIP nikalne par version badle to app khud rebuild.

## Baaki kaam (agli dafa)
0. Asli Windows par v3.0 ka visual check (tray icon, startup).
1. Hermes ko Telegram se jorna (bot token sirf terminal mein, chat mein nahi) aur behtar free model (Groq) lagana.
2. Groq key 1 Nov 2026 ko expire — chat free pipeline se chalti rahegi; sirf voice (transcribe) ke liye nayi Groq key chahiye.
3. Vestire: asli product photos, final qeematein, WhatsApp business number `config.js` mein.
4. Brand ke naam sirf asli/authorized maal par — warna "imported" likhein.
5. Vestire ko free hosting par live karna aur vestirecollection.com jorna (Hostinger account wapas milne ke baad).

## 28 Oct 2026 — v3.4.0
- 🤖 Agent Mode (oopar "🤖 Agent" button, ya localhost:3000/agent) — Cursor jaisa coding agent: khud plan (todo), files parhta/likhta/edit karta, search, node/npm/python commands, web page parhna, free AI pictures, har file likhne ke baad khud check, ghalti ho to finish nahi karne deta, 40 steps tak loop.
- Projects: `C:\Users\<naam>\.faheem-ai\projects\<naam>` — update se nahi mitte. Har project ki pichli baatein yaad (follow-up: "cart ka rang badlo").
- Baayen files + plan, beech mein agent ke qadam (har tool khol kar result dekhein), daayen Live Preview / Code. ↩ Undo = aakhri run wapas. ■ Roko.
- Picture lagayein to pehle Gemini/Groq vision design parhta hai; key na ho to saaf batata hai.
- Hifazat: project folder se bahar koi file nahi, khatarnak commands band, sirf isi laptop se chalta hai.

## 28 Oct 2026 — v3.5.0
- 🎨 Design rules (Hallmark se, MIT): Agent Mode, website pipeline aur Website Master ab "AI jaisa" design nahi banate — rang/font CSS variables mein, purple-blue gradient nahi, emoji icons nahi, nakli reviews/numbers nahi, focus style, reduced-motion.
- Design jaanch bina AI ke: check tool aur finish se pehle (2 dafa tak theek karwata hai). Website pipeline mein design tips sirf pehle 2 rounds; aakhir mein "Tayyar · design tips" — asli ghalti nahi ginti.
- Hermes: `HERMES-SKILLS.bat` chalayein → `faheem-design` aur `hallmark` skills Hermes mein. Istemal: `/faheem-design ...` ya `/hallmark ...`.

## 28 Oct 2026 — v3.6.0
- 🖱 Browser Tester (jsdom, free): page ko chhupe browser mein chalata hai, har button/link/form dabata hai, asli JavaScript ghaltiyan + ghaib files pakarta hai. Ghalat code (infinite loop) 20 second baad khud band — dashboard nahi rukta.
- Agent Mode: naya `test` tool; finish se pehle har HTML page (max 3) ka browser test — ghalti ho to agent ko wapas theek karne bhejta hai (2 dafa tak).
- Website pipeline: tez checks ke baad Browser Tester, phir AI tester, phir Fixer (3 rounds).
- Purana koi function badla ya hataya nahi; sirf naye checks jore.

## v3.6.1
- Groq gpt-oss "Tool choice is none" error fix: model ka tool call bacha kar action banta hai, warna llama-3.3-70b-versatile se dobara.
- Ollama: llama3.2:3b na ho to laptop par mojood model khud istemal hota hai; warna saaf hidayat (ollama pull).

## v3.6.2
- HERMES-SKILLS.bat: hallmark Hermes index mein purana tha; ab seedha GitHub (Nutlope/hallmark) se %LOCALAPPDATA%\hermes\skills\hallmark mein copy hota hai.

## v3.6.3
- Update button: ab UPDATE.bat explorer.exe se khulta hai (double-click jaisa), app window band hoti hai, dikhne wali install window chalti hai, phir app khud dobara khulti hai. Ek waqt mein ek hi updater; log data/update.log.

## v3.7.0
- 2 naye free brains: Z.ai GLM (glm-4.7-flash, hamesha free) aur Mistral (mistral-small-latest, free Experiment plan). Settings mein key boxes; Agent, chat aur /v1 order mein Groq ke baad.
- Cerebras nahi dala: ab sirf $5 trial, card zaroori, 30 din.

## v3.8.0
- Naya Tools page (/tools): har brain ka apna chat board, "Sab 1 by 1 test karo" button.
- Display: HD / 4K / 8K render quality, 3D orb (On / Ultra), UI size 90-200% (Options).
- Fix: bina-key server agar apni had ka message "jawab" bana kar bheje to ab error mana jata hai aur agla brain chalta hai.
- Full test suite: npm run test:full (116 checks).

## v3.9.0
- UI UX Pro Max (MIT) andar: 192 products, 88 styles, 74 font jore, 119 UX qawaid, BM25 search + Design System Generator (bina Python).
- Naya Design Studio page (/design): rang, font, page dhaancha, CSS copy, qawaid search.
- Agent Mode + Website Master ko khud design system milta hai; agent tools design_system aur design_search.
- Naye UX Pro checks: contrast 4.5:1, 44px buttons, emoji icons, alt text, viewport, labels.
- Dashboard mein SVG icons, phone par 44px buttons, focus ring, reduced-motion.
- HERMES-SKILLS.bat ab ui-ux-pro-max bhi daalta hai.
- Test suite: 175 checks.

## v3.10.0
- Impeccable (Paul Bakaus, Apache-2.0) andar: 62 design checks (31 AI-slop + 31 quality), native engine, bina AI aur bina key, telemetry band.
- Design Studio mein "Design Audit": HTML paste karein, Impeccable + UX Pro nateeje.
- Website Master aur Agent Mode har bani website ko Impeccable se bhi jaanchte hain; naya agent tool design_audit.
- Design rules prompt mein Impeccable ki sab se aam AI-slop nishaniyan.
- /api/design?rules=impeccable aur POST /api/design ab Impeccable findings bhi deta hai.
- HERMES-SKILLS.bat ab 4 skills: impeccable bhi (hermes install, official installer, GitHub ZIP fallback).

## 28 Oct 2026 — v3.11.0 (Skills + Gallery + Agentation)
- Pipeline tests: mock fetch theek, Pollinations ab key mangta hai, OVH 429 → Llama fallback pass, Cloudflare URL docs ke mutabiq sahi.
- Naya /skills hub + har skill ka page (/skills/hallmark, /ui-ux-pro-max, /impeccable, /faheem-design, /agentation, /hermes-installer, /design-studio, /tools-board, /agent-mode, /browser-tester): live panel + "Kaise kaam karta hai" + "Setup".
- Naya /gallery + /api/gallery (sirf localhost, data/gallery): drag-drop, kai files, preview, delete, skill ko bhejein, chat mein bhejein.
- /api/skills: Hallmark / UX Pro / Impeccable / Browser Tester ko HTML ya Gallery file se chalayein.
- Agentation 3.1.2 toolbar (dev mein khud, production mein toggle). License NOTICE.md mein.


## v3.11.0 — extra tools
- [x] Playwright, Graphify, Compound Engineering, 21st MCP: skill pages, live panels, HERMES-SKILLS.bat Extra tools block, NOTICE.
- [x] Harvey: shamil nahi (legal enterprise).

## 31 Oct 2026 — v3.13.0 (Agent Team + Persistent Memory · Ruflo se inspired)
- 👥 **Agent Team (Team mode):** bara kaam (website/store/kai files) ab 4 roles mein bant sakta hai: Designer (design spec + files ki list) → Coder (poori files) → Tester (bina AI checks + browser test, free) → Reviewer (aakhri jaanch). Har handoff live log mein dikhta hai aur project ke `team.json` board par likha jata hai.
- Har role apna free brain leta hai (specialist ka prefer order, jahan ho sake alag brain). Free limit bachane ke liye had: max 3 rounds, ~60k tokens, 10 brain calls. Brains limit par hon ya Coder file na likhe to khud purana single Agent Mode chalta hai. Chhota kaam ya picture wala kaam seedha single agent ko.
- Toggle: Agent Mode topbar mein "Team", ya Options → Agent Team. **Default band.**
- 🧠 **Yaad-dasht (Persistent Memory):** naya /memory page — pasand (Roman Urdu jawab, Stitch jaisa design, Vestire brand), project khulase, ghalti → hal seekh. Dekhein, talaash (BM25), badlein, mitayein, pin, Export/Import (JSON), on/off switch, "Prompt preview".
- Jagah: `~/.faheem-ai/memory` (keys.json ki tarah) — ZIP update se nahi mitti. Koi database ya embeddings API nahi.
- Chat, Agent Mode aur Team ke prompts mein sirf sab se mutalliq yaadein jaati hain (default 300 tokens tak, Memory page se 150–800).
- Khud save: test fail ho kar pass ho to seekh; kaam khatam par project khulasa (har project ka ek).
- /skills mein 2 naye pages: Agent Team, Yaad-dasht. NOTICE.md mein Ruflo (ruvnet, MIT) ka credit — sirf idea, apna code; Ruflo install nahi kiya.
- Purane functions nahi badle (Agent Mode, Master Agent, Website pipeline, prefs, compound notes) — sirf naye hisse jore. Koi nayi dependency nahi.
- Test suite: Memory CRUD, BM25 ranking, injection cap, team board handoffs (mock brains), fallback, budget guard, naye pages browser mein bina JS error.



## 31 Oct 2026 — v3.14.0 (Brains Rooms + bina-jhanjhat free brains)
- 🧠 **Brains Rooms** (oopar "Brains" button, ya localhost:3000/brains): har brain ka apna card + apna chat room. Ek screen par bilkul 4 (2x2), neeche "Page 1..6". Page 1 sab se tez: Groq, Gemini, Z.ai, Mistral.
- Har card par: naam, model, **"Key lein ↗"** (brain ka key page), chhupi key (sirf ••••aakhri 4) + apna **Save**, aur **status light**: 🟢 key chal rahi · 🔴 key ghalat/expire/revoke (401/403) ya quota bilkul khatam · 🟡 limit (429) "X min baad wapas" · ⚪ key nahi. Save par aur har 30 min sasta check (/models ya 1-token, bari kharch nahi). Bina-key brains ki light asli live test se.
- 🔑 **Key pool:** "+" se ek brain ki 2-3 keys. Limit (429) par khud agli key, ghalat key (401) band, thaki key aaram ke baad wapas. Lal light par: "Nayi key banayein — No expiration chunein" + link.
- 💬 Har room ki apni history isi laptop par (`C:\Users\<naam>\.faheem-ai\rooms\<brain>.json`). 📎 attach (tasveer/video/file, drag-drop, Ctrl+V): tasveer sirf dekhne wale brains ko (Gemini, Groq vision, Free.ai qwen25-vl, Puter), baaqi ko saaf note; text files parhi jati hain.
- 🔴 **Soch raha hai animation:** brain kaam kare to us room ke kinare par tez laal dots, aur har page ke oopar patli dots ki patti. Jawab aate hi band. Windows "animations off" (reduced motion) par animation band.
- 🖼 **Meta page** (localhost:3000/meta): tasveer chunein (upload / Gallery se), tayyar prompts (background badlein, product safed, cheez hatayein, style, Vestire banner) Copy ke sath, **"Meta AI mein kholo"** = alag Edge window (meta.ai, apna Facebook/Meta login — FREE). Meta Model API (PAID $0.01/tasveer) ka optional key box — default BAND, chalane ke liye switch + "$0.01 lagega" tick dono. Free backup: Puter.js edit (dashboard ke andar). Natija Gallery mein save + Download.
- 📘 **Skills guide** (localhost:3000/skills/guide): saari 16 skills aasaan Roman Urdu mein — kya karti hai, kab, kaise (steps), misaal prompt.
- 🆓 **Naye bina-key brains:** Pollinations purana host (text.pollinations.ai/openai, openai-fast — bina key), Free.ai (qwen3-coder; tasveer: qwen25-vl), AI Horde (bilkul free, bohat dheema — sirf aakhri sahara). **Puter.js** brain (browser, ek dafa Puter sign-in, "free mahana hissa, had likhi nahi" — backup).
- 📡 **Live free list:** har ghante stillworks se abhi chalne wale bina-key brains khud Ollama se pehle jurte hain (6 tak). Service band = purani list. Options mein On/Off.
- Purana /tools, Agent Mode, Team, Memory, chat pipeline waise hi chalte hain (sirf izafa).
- Shamil NAHI kiye (Terms ki wajah se): OpenCode Zen, Hack Club AI, gpt4free.

### Baaki (v3.14 ke baad)
- Asli Windows par /brains aur "Meta AI mein kholo" (Edge app window) dekhna.
- Puter sign-in aur Puter edit asli account se aazmana (sandbox mein account nahi).
- Meta Model API key sirf zaroorat ho to — paid hai.
- GitHub par push aap ki ijazat ke baad.
