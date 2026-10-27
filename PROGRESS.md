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
