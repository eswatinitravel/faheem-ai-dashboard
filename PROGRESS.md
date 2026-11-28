# Faheem AI — Kaam ka record

## 27 Oct 2026 — ho gaya
- Hermes Agent v0.22.5 laptop par chal raha hai (free model solar-mini4). Telemetry band. Telegram abhi baaki.
- Vestire Collection naya design: imported branded wear (Cougar + Turbo style) — Men / Women / Juniors panels, brand wall, sale countdown (30 Nov 2026), new arrivals, cart, COD/advance checkout, WhatsApp order.
- v2.5: API keys ab `C:\Users\<naam>\.faheem-ai\keys.json` mein — naye install/update se nahi mitti. Chhota, saaf layout.
- v2.6: Live screen (website dashboard ke andar live, desktop/tablet/mobile), Google Stitch jaisa naya theme, naya liquid 3D orb, app icon (Desktop, Start Menu, app window), Vestire mein Club signup, scroll animations, back-to-top.

- v2.7: Free AI pipeline — chat ab bina kisi key ke chalti hai (Pollinations + LLM7, dono free aur bina key). Keys lagi hon to pehle woh, phir free pipeline, phir Ollama. Settings mein On/Off.
- v2.8: Dyad bridge — Dyad ab Faheem AI ki free pipeline se chalta hai, koi key nahi. Dyad > Settings > AI Providers > Add custom provider: Name = Faheem AI, API Base URL = http://localhost:3000/api/v1, API key = free; phir model add karein: faheem-free. Dashboard (START.bat) chalta hona chahiye.
- v3.0: Naya look — front page par sirf saaf chat (Google Stitch jaisa), saare options doosre page (⋯ Options) par. Search button (Ctrl+K) chats mein + web par. Black aura background mein tez chalte laal dots. Oopar 6 theme balls: black-red aura, light pink, light purple, light green, black aura, white aura. Neeche left corner mein chhota version/update. Command dete hi left 25% par LIVE workspace: jo ban raha hai (picture, video storyboard, website preview, code) woh dikhta hai, neeche chhote harfon mein agents ki baat-cheet. Free pictures (Pollinations image). Laptop on hote hi auto start + taskbar tray icon (double-click = kholein, right-click = restart/update/band).
- v3.1: Chat mein attach — gallery se picture, video, file (ya drag-drop / paste). Text files AI parhta hai; pictures Gemini key ho to AI dekhta hai; video ka naam/lambai. Version ke oopar chamakta "New update" — ek click mein update.
- v3.2: Website/store kaam ab tarteeb se: Planner → Builder → Tester (tez checks + AI QA) → Fixer, 3 rounds tak. Asli AI pictures (placeholder nahi). Ek prompt mein website + banner. Gemini key ho to code/website pehle Gemini se. Naya ZIP nikalne par version badle to app khud rebuild.

## Baaki kaam (agli dafa)
0. Asli Windows par v3.0 ka visual check (tray icon, startup).
1. Hermes ko Telegram se jorna (bot token sirf terminal mein, chat mein nahi) aur behtar free model (Groq) lagana.
2. Groq key 1 Nov 2026 ko expire — chat free pipeline se chalti rahegi; sirf voice (transcribe) ke liye nayi Groq key chahiye.
3. Vestire: asli product photos, final qeematein, WhatsApp business number `config.js` mein.
4. Brand ke naam sirf asli/authorized maal par — warna "imported" likhein.
5. Vestire ko free hosting par live karna aur vestirecollection.com jorna (Hostinger account wapas milne ke baad).

## 28 Oct 2026 — v3.4.0
- Agent Mode (oopar "Agent" button, ya localhost:3000/agent) — Cursor jaisa coding agent: khud plan (todo), files parhta/likhta/edit karta, search, node/npm/python commands, web page parhna, free AI pictures, har file likhne ke baad khud check, ghalti ho to finish nahi karne deta, 40 steps tak loop.
- Projects: `C:\Users\<naam>\.faheem-ai\projects\<naam>` — update se nahi mitte. Har project ki pichli baatein yaad (follow-up: "cart ka rang badlo").
- Baayen files + plan, beech mein agent ke qadam (har tool khol kar result dekhein), daayen Live Preview / Code. Undo = aakhri run wapas. ■ Roko.
- Picture lagayein to pehle Gemini/Groq vision design parhta hai; key na ho to saaf batata hai.
- Hifazat: project folder se bahar koi file nahi, khatarnak commands band, sirf isi laptop se chalta hai.

## 28 Oct 2026 — v3.5.0
- Design rules (Hallmark se, MIT): Agent Mode, website pipeline aur Website Master ab "AI jaisa" design nahi banate — rang/font CSS variables mein, purple-blue gradient nahi, emoji icons nahi, nakli reviews/numbers nahi, focus style, reduced-motion.
- Design jaanch bina AI ke: check tool aur finish se pehle (2 dafa tak theek karwata hai). Website pipeline mein design tips sirf pehle 2 rounds; aakhir mein "Tayyar · design tips" — asli ghalti nahi ginti.
- Hermes: `HERMES-SKILLS.bat` chalayein → `faheem-design` aur `hallmark` skills Hermes mein. Istemal: `/faheem-design ...` ya `/hallmark ...`.

## 28 Oct 2026 — v3.6.0
- Browser Tester (jsdom, free): page ko chhupe browser mein chalata hai, har button/link/form dabata hai, asli JavaScript ghaltiyan + ghaib files pakarta hai. Ghalat code (infinite loop) 20 second baad khud band — dashboard nahi rukta.
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
- **Agent Team (Team mode):** bara kaam (website/store/kai files) ab 4 roles mein bant sakta hai: Designer (design spec + files ki list) → Coder (poori files) → Tester (bina AI checks + browser test, free) → Reviewer (aakhri jaanch). Har handoff live log mein dikhta hai aur project ke `team.json` board par likha jata hai.
- Har role apna free brain leta hai (specialist ka prefer order, jahan ho sake alag brain). Free limit bachane ke liye had: max 3 rounds, ~60k tokens, 10 brain calls. Brains limit par hon ya Coder file na likhe to khud purana single Agent Mode chalta hai. Chhota kaam ya picture wala kaam seedha single agent ko.
- Toggle: Agent Mode topbar mein "Team", ya Options → Agent Team. **Default band.**
- **Yaad-dasht (Persistent Memory):** naya /memory page — pasand (Roman Urdu jawab, Stitch jaisa design, Vestire brand), project khulase, ghalti → hal seekh. Dekhein, talaash (BM25), badlein, mitayein, pin, Export/Import (JSON), on/off switch, "Prompt preview".
- Jagah: `~/.faheem-ai/memory` (keys.json ki tarah) — ZIP update se nahi mitti. Koi database ya embeddings API nahi.
- Chat, Agent Mode aur Team ke prompts mein sirf sab se mutalliq yaadein jaati hain (default 300 tokens tak, Memory page se 150–800).
- Khud save: test fail ho kar pass ho to seekh; kaam khatam par project khulasa (har project ka ek).
- /skills mein 2 naye pages: Agent Team, Yaad-dasht. NOTICE.md mein Ruflo (ruvnet, MIT) ka credit — sirf idea, apna code; Ruflo install nahi kiya.
- Purane functions nahi badle (Agent Mode, Master Agent, Website pipeline, prefs, compound notes) — sirf naye hisse jore. Koi nayi dependency nahi.
- Test suite: Memory CRUD, BM25 ranking, injection cap, team board handoffs (mock brains), fallback, budget guard, naye pages browser mein bina JS error.



## 31 Oct 2026 — v3.14.0 (Brains Rooms + bina-jhanjhat free brains)
- **Brains Rooms** (oopar "Brains" button, ya localhost:3000/brains): har brain ka apna card + apna chat room. Ek screen par bilkul 4 (2x2), neeche "Page 1..6". Page 1 sab se tez: Groq, Gemini, Z.ai, Mistral.
- Har card par: naam, model, **"Key lein"** (brain ka key page), chhupi key (sirf ••••aakhri 4) + apna **Save**, aur **status light**: key chal rahi · key ghalat/expire/revoke (401/403) ya quota bilkul khatam · limit (429) "X min baad wapas" · key nahi. Save par aur har 30 min sasta check (/models ya 1-token, bari kharch nahi). Bina-key brains ki light asli live test se.
- **Key pool:** "+" se ek brain ki 2-3 keys. Limit (429) par khud agli key, ghalat key (401) band, thaki key aaram ke baad wapas. Lal light par: "Nayi key banayein — No expiration chunein" + link.
- Har room ki apni history isi laptop par (`C:\Users\<naam>\.faheem-ai\rooms\<brain>.json`). attach (tasveer/video/file, drag-drop, Ctrl+V): tasveer sirf dekhne wale brains ko (Gemini, Groq vision, Free.ai qwen25-vl, Puter), baaqi ko saaf note; text files parhi jati hain.
- **Soch raha hai animation:** brain kaam kare to us room ke kinare par tez laal dots, aur har page ke oopar patli dots ki patti. Jawab aate hi band. Windows "animations off" (reduced motion) par animation band.
- **Meta page** (localhost:3000/meta): tasveer chunein (upload / Gallery se), tayyar prompts (background badlein, product safed, cheez hatayein, style, Vestire banner) Copy ke sath, **"Meta AI mein kholo"** = alag Edge window (meta.ai, apna Facebook/Meta login — FREE). Meta Model API (PAID $0.01/tasveer) ka optional key box — default BAND, chalane ke liye switch + "$0.01 lagega" tick dono. Free backup: Puter.js edit (dashboard ke andar). Natija Gallery mein save + Download.
- **Skills guide** (localhost:3000/skills/guide): saari 16 skills aasaan Roman Urdu mein — kya karti hai, kab, kaise (steps), misaal prompt.
- **Naye bina-key brains:** Pollinations purana host (text.pollinations.ai/openai, openai-fast — bina key), Free.ai (qwen3-coder; tasveer: qwen25-vl), AI Horde (bilkul free, bohat dheema — sirf aakhri sahara). **Puter.js** brain (browser, ek dafa Puter sign-in, "free mahana hissa, had likhi nahi" — backup).
- **Live free list:** har ghante stillworks se abhi chalne wale bina-key brains khud Ollama se pehle jurte hain (6 tak). Service band = purani list. Options mein On/Off.
- Purana /tools, Agent Mode, Team, Memory, chat pipeline waise hi chalte hain (sirf izafa).
- Shamil NAHI kiye (Terms ki wajah se): OpenCode Zen, Hack Club AI, gpt4free.

### Baaki (v3.14 ke baad)
- Asli Windows par /brains aur "Meta AI mein kholo" (Edge app window) dekhna.
- Puter sign-in aur Puter edit asli account se aazmana (sandbox mein account nahi).
- Meta Model API key sirf zaroorat ho to — paid hai.
- GitHub par push aap ki ijazat ke baad.


## 1 Nov 2026 — v3.15.0 (Hallmark redesign + emoji-free + UI/UX Specialist + tez memory + Seekha hua + Research card)
- Hallmark redesign layer (tokens, focus ring, 44px), saare emoji hata kar SVG icons (Lucide, ISC). Test: app/, lib/, public/ mein emoji = fail.
- Ek GetLayers-style 3D background "Flowstate" (apna WebGL shader) + Options picker (Off/Flowstate).
- UI/UX Specialist: routing (uiux), Team Designer, website pipeline (prompt + audit score), Agent Mode finish se pehle design_audit.
- Memory: RAM cache (mtime+size), BM25 index cache, uses-ginti write debounce (2s), startup warm, /memory page browser cache.
- Seekha hua: ~/.faheem-ai/memory/learned.json (had 200): brain per task, ghalti → hal, tasheeh, audit score; routing aur prompt mein wapas; /memory par dekhein/mitayein.
- Research card: build intent par GitHub search + DuckDuckGo (bina key) + andar ka gyaan; features tick, stack chunein, Build ya Skip. Options mein on/off.
- Chat export (Markdown). Ideas doc (8 assistants).
- Wiring guard: scripts/wiring-check.mjs (routes, API, links, buttons, forms, hooks, tests). GitHub par push NAHI kiya (aap ki ijazat ka intezar).

## 1 Nov 2026 — v3.16.0
- Project Builder ZIP: chat mein "bana kar zip do" -> Planner -> Builder -> Tester -> Fixer -> ZIP (README Roman Urdu, INSTALL.bat, START.bat, setup.sh, .env.example). /api/agent/zip, ZIP history, Agent Mode ZIP button. Apna chhota ZIP writer (lib/zip.js), koi nayi dependency nahi.
- Poora redesign "Linear Ink" (Linear/Vercel andaaz, purane accent rang): collapse hone wala icon sidebar, header version chip, AI jawab surface, dense tables, empty/loading/error states, mobile patti. Design audit: pehle ~52-60, ab ~90-96 har page.
- Background: Purple Desert (getlayers.ai free) default, DNA (apna Three.js), Off. Flowstate aur Metal Human hata diye (user ki marzi).
- Private Assistant Builder (Hey Puppy): chat mein "free AI assistant banao" -> research card (GitHub trending is hafta + top assistants ke features) -> Planner (naam + shakhsiyat) -> Builder (3 skills) -> Tester (syntax, JSON, Electron window transparent/always-on-top, contextIsolation, extension sirf activeTab/scripting/storage + 127.0.0.1, persona) -> ZIP. Template: templates/hey-puppy (Electron + Three.js safed puppy, 9 moods, orb, Groq Whisper + Edge ur-PK awaz, Chrome extension Allow ke sath, yaad + seekha hua, Telegram ikhtiyari).
- Asli sandbox run (bina key free brains Kilo + OVH): 3 skills bani, 27 checks pass, ZIP 32 files (sample-hey-puppy.zip).
- Naye tests (section 37): assistant intent (haan/nahi), trending HTML parsing (mock), research offline/online/GitHub band, template checks, ZIP structure, brains band = default Puppy, puppy render headless Chromium (9 moods + orb, 0 console errors), API detect/research, chat research card.
- Baaki: asli Windows laptop par INSTALL.bat wali ZIP chala kar dekhna; free brain se lambi ZIP run. Hey Puppy kabhi asli Windows par nahi chala: Electron ghoomna / drag / hotkeys / tray, asli mic (Whisper) aur Edge awaz, "Hey Puppy" wake word, asli Chrome extension, Telegram - sab abhi untested.


## 20 Nov 2026 — v3.17.0 (Workflows + queue + approvals + brains ki tarteeb)
- Naya /workflows page: Kaam, Ijazat, Schedule, Brains ki tarteeb, Audit log; Pause All; data export.
- lib/ops: pakki JSON queue (retry 1/2/5/10/30s, dead-letter, crash recovery, idempotency), hash-bound ek-dafa ijazat (10 min), audit log (secret chhupe), Pause All, schedules (15m/2h/daily@HH:MM/once, Run Now, history).
- Agent: delete_file aur npm/pip install ab ijazat se; har command aur run audit mein; Pause All par agent nahi chalta.
- lib/brain-roles.js: 8 kaamon ke liye alag brain order (andaza, model dekh kar), user ↑↓ se badal sakta hai.
- instrumentation.js: server start par queue worker + schedule tick.
- Test: npm run test:ops (25/25).
- Baaki: asli Windows par /workflows ka visual check.

## 20 Nov 2026 — v3.17.1
- Windows par update ke baad app na khulne ka fix: instrumentation.js hataya, ops ab /workflows khulne par shuru; brain order fail ho to purana order.
- REPAIR.bat: double-click = purana build saaf, npm install, build, app start; log Desktop par.

## 20 Nov 2026 — v3.17.2
- Asli wajah mili: next build "Upgrade Next.js / coding agent" sawal poochhta tha aur chhupi window mein atak jata tha. Ab tray, update aur REPAIR mein CI=1 (koi sawal nahi).

## 21 Nov 2026 — v3.17.3
- Asal fix: next.config.mjs mein experimental.agentUpgrade = false. Next.js 16.4 ka default "security" har build par upgrade/agent sawal poochhta tha; ab kabhi nahi.

## 24 Nov 2026 — v3.25.0 (Brains deep check + WebBrain + TUIOS)
- Brains deep check (asli 1-token chat): Kilo, OVH, PollFree, FreeAI, AI Horde chal rahe; LLM7 bina token din ki limit par; Ollama sandbox mein nahi (laptop par check karein).
- Fix: brain ki light pehle /models dekh kar hari dikhti thi jabke asli chat "limit" keh chuki hoti. Ab peeli: "Limit par — X min baad wapas".
- WebBrain (GPL-3.0, webbrain-one/webbrain): code copy nahi kiya. /api/v1 ab browser extension (chrome/moz-extension) aur localhost ke liye CORS kholta hai, baqi websites ke liye band. Jarvis mein WebBrain card: Base URL copy, model faheem-free, key free; Chrome/Edge/Firefox store link. Act mode (click/type) ke liye Ollama seedha behtar, kyunke bridge tool-calls nahi bhejta.
- TUIOS (MIT, Gaurav-Gosain/tuios): TUIOS.bat GitHub se tuios + tuios-web (Windows x86_64/arm64) %USERPROFILE%\.faheem-ai\bin mein lagata hai. Jarvis: "TUIOS kholo" = tuios-web 127.0.0.1:7681 browser mein; "TUIOS terminal mein kholo" = Windows Terminal. Jarvis mein Agent Inbox card (ruka/ijazat wala oopar, desktop notification).
- Test: action pehchan 7/7, CORS 5/5 (evil.com band), /api/v1 normal + stream extension origin ke saath, tuios-web asli launch (Linux) HTTP 200, build EXIT 0.
- Baaki: TUIOS.bat asli Windows par; WebBrain extension asli browser mein; visual check.

## 24 Nov 2026 — v3.25.1
- Jarvis laptop screen par poora fit: page scroll band (100vh), har column andar se scroll, avatar screen ki oonchai ke hisaab se chhota/bara, "Apna assistant banayein" ab band patti (click se khulti hai). Chhoti screen (700px se kam oonchai) par meters chhup jate hain.

## 24 Nov 2026 — v3.26.0
- Naye theme: sirf 3 neon glass — Neon Blue (default), Neon Red, Neon Magenta. Purane 6 theme hata diye; purani saved value khud Neon Blue ban jati hai (layout.js ka chhota script pehle paint se pehle theme lagata hai, har page par, Jarvis aur Agent bhi).
- Har page ka background "ripple glass": gehra gradient + do narm rang ke dhabbe + khari fluted glass dhaariyan (~34px), sirf CSS. Options > Background mein "Ripple glass" naya default (Desert/DNA ab bhi chun sakte hain).
- Har card/panel: shafaf frosted glass, patla chamakta kinara (--hi), halki accent glow, upar-baayen aur neeche-daayen chhoti chamak (glint).
- Buttons glass pill, aadhe size (~28px). Jarvis ke options 2 column grid mein chhote.
- Jarvis: CPU/RAM/Disk/Battery ab gol "energy gauges" (24 hisse, 270°, andar dashed ring, beech mein icon + %), peeche halki speed lines. Mard/Aurat avatar aur lip-sync waise hi.
- Jarvis conversation skills (andaz ke liye): pehle suno, chhoti baari, ek follow-up sawal, khushamad nahi. "Khud baat chhero" toggle (default band): on ho aur aap 2 min chup rahein to Jarvis kabhi kabhi (10 min mein ek baar) ek halki baat chherta hai.
- Skills: pjt222/agent-almanac listen (MIT), harims95/straight-talk (MIT), CoffeeFancy/hermes-proactive-chat (MIT, sirf khayal), pipecat-ai/skills talk (BSD-2-Clause), ironyjk/howtotalk active-listening + nvc (MIT) — apne lafzon mein Roman Urdu khulasa. underyx/human-skills chhor diya: LICENSE file nahi.
- Test: build EXIT 0; headless screenshot /jarvis 1366x768 + 1920x1080 (page scroll nahi), / aur /options 1366x768.
- Baaki: asli Windows laptop par visual check; Neon Red/Magenta par har page ki nazar.

## 26 Nov 2026 — v3.26.1
- Friday/Jarvis ke liye offline awaz: KittenTTS 2 nano (Hindi model, int4, ~8.8 MB + awazen ~2 MB), Roman Urdu ko pehle Devanagari mein badal kar bolta hai (English lafz waise hi).
- Lehja list mein "Kitten Urdu/Hindi (offline)": Aurat = Priya, Mard = Arjun. Sirf Roman Urdu / اردو zubaan par dikhta hai (اردو script wala jawab browser awaz se).
- Laptop par ek dafa: `pip install onnxruntime numpy phonemizer espeakng_loader`. Pehli baar model khud download (%USERPROFILE%\.cache\kitten-tts-2-nano), phir internet ki zaroorat nahi.
- Server: /api/jarvis/tts -> lib/jarvis/kitten_tts.py (wav). Honth AnalyserNode se hilte hain; beech mein bolo to ruk jata hai.
- Kuch bhi ghalat ho (package nahi, model nahi, error) to chup chaap purani browser awaz, aur is session mein Kitten dobara try nahi.
- Test: sandbox mein asli wav bani (3.9 s, 24 kHz, "Salam, main Friday hoon. Aaj kya karna hai?"); build EXIT 0.
- Baaki: asli Windows par sun kar check; Roman Urdu -> Devanagari rules saade hain (t/d retroflex, "salam/salaam" jaise farq ghalat ho sakte hain).

## 26 Nov 2026 — v3.27.0 (phone connect, status tiles + launcher, AI Team chat, haath se control, Penpot/n8n)
- /connect "Phone se jodo": laptop ka LAN IP server khud dhoondta hai (Wi-Fi pehle, WSL/Hyper-V/VirtualBox aakhir), Base URL `http://<IP>:3000/api/v1`, phone key `fad-…` (data/phone.json), apna QR generator (lib/qr.js, v1-10, level M; 80 QR OpenCV se decode = 80/80). Maid / PocketPal AI / AI Edge Gallery ke Roman Urdu steps, Windows firewall command.
- LAN guard (proxy.js, Next 16 proxy): `next start -H 0.0.0.0`; Wi-Fi se sirf /api/v1 + Bearer key jab Phone connect On; baqi sab 403. Pehle (v3.26) saara dashboard LAN par khula tha.
- /api/v1 streaming: stream foran shuru + har 10s ": ping" (phone app timeout na ho); non-stream waisa hi.
- /status: services (server, Ollama, Whisper, Kitten TTS, GitHub update, Phone) + har brain ka /models ping, ms, rang, 60s auto-refresh (server cache 45s, GitHub 10 min). App launcher: search, add/remove/order, data/launcher.json, sirf http(s) ya /page links.
- Agent page "AI Team chat": Planner → Researcher → Coder → Reviewer (har ek alag brain, NDJSON stream). File/command sirf tajweez; server par hash ke saath, project-bound, 10 min, ek dafa; "Ijazat do" se runTool (write_file / run_command) aur audit log. Khatarnak commands blocked.
- Jarvis "Haath se control" (default band): MediaPipe Tasks Vision 1.2.3 CDN se sirf On par; khula haath = Shuru/Band, swipe = theme/persona, pinch = click. CDN/camera fail par khud band + wajah.
- Design: Penpot links. Workflows: n8n webhook tab (/api/n8n server-side POST, Pause All aur audit ke saath).
- Test: build EXIT 0; npm run test:v327 27/27 (+13 HTTP = 40/40); test:ops 25/25; LAN guard curl 15 cases; phone jaisi request LAN IP se key ke saath models + chat (stream/non-stream) 200; AI Team chat asli free brains (Kilo, OVH, Pollinations, Free.ai) ~28s, file + command ijazat se chale, dobara/doosra project/fake id 409; n8n local echo webhook 200; headless Chromium 1366x768 screenshots (koi horizontal overflow nahi), MediaPipe asli CDN + fake camera se load, CDN band aur camera inkaar par fallback.
- Baaki (Windows par unverified): asli phone se Maid/PocketPal; Windows Firewall prompt; asli haath ke ishare (sirf nakli landmarks se test); n8n asli instance.
- Pata hai: Wi-Fi par koi jaan bujh kar Host + X-Forwarded-For dono jaali bheje to guard dhoka kha sakta hai (Next.js asli socket IP route ko nahi deta) — is liye firewall Private-only rakhein aur Phone connect kaam ke baad band.

## 26 Nov 2026 — v3.31.0 (Jarvis live baat-cheet theek + professional andaaz + aankh)
- Live fix: Whisper/Groq fail par browser par foran switch (pehle 1-2 baatein zaya hoti thin, engineRef render ka intezar karta tha).
- Browser speech ki ghaltiyan ab screen par: mic ijazat nahi, internet nahi, zubaan nahi. Khali round ke baad 0.8s waqfa (tez chakkar band).
- Groq 401/403 par saaf paigham "key expire ya ghalat", 429 par "limit poori".
- Mic calibration: shuru mein 0.5s kamre ka shor naap kar sunne ki had (0.015-0.05) aur beech mein rokne ki had (kam az kam 0.14, ~250ms) khud set. Speaker ki goonj se Jarvis khud nahi rukta.
- Jawab ki raftar: Ollama 60s, baqi brains 30s (pehle 90/45).
- Professional andaaz default: seedha jawab, ek kaam ka agla qadam, filler aur baar baar maafi nahi.
- Aankh (vision): Jarvis page par tasveer lagao (3 tak) ya "meri screen parho" bolo / screen button dabao. Screen ki chhoti JPEG temp mein, foran mit jati hai. Gemini ya Groq vision key chahiye.
- Baaki: asli Windows par mic, speaker, screen capture aur vision ka test.

## 27 Nov 2026 — v3.31.1 (Jarvis foran bolta hai: streaming)
- Naya /api/jarvis/stream (NDJSON): AI ka har mukammal jumla aate hi bheja jata hai; Jarvis pehla jumla bolna shuru kar deta hai, baqi qatar mein.
- lib/providers.js callProviderStream: OpenAI-jaisi stream (Ollama, Groq, Gemini waghera). Stream na ho ya pehle tukre se pehle ghalti ho to purana callProvider.
- ACTION tag aur markdown bolne se pehle hat jate hain; laptop kaam aakhir mein chalta hai, ijazat/ghalti ka paigham aakhir mein bola jata hai.
- Beech mein user bole to awaz ruk jati hai, stream band, qatar khali.
- Stream ka endpoint fail ho to purana /api/jarvis (ek dafa poora jawab).
- Test: build EXIT 0; mock streaming brain se 3 jumle ~0.5s ke faasle par alag alag aaye, tag hat gaya, action chala.
- Baaki: asli Windows par sun kar check (Kitten har jumle ke liye alag request karta hai, thora waqfa ho sakta hai).

## 27 Nov 2026 — v3.31.2 (Tez routes + Headphones mode)
- Jarvis settings mein "Tez routes" (default band, taake pehle Ollama wali shart qaim rahe): chhoti baat Groq, mushkil kaam (plan, code, business, explain) Gemini/SambaNova, private baat (password, bank, raaz) sirf laptop Ollama. Brain label mein route dikhta hai.
- "Headphones" toggle: beech mein rokne ki had halki (0.05) aur ~100ms; speaker par purani mazboot had.
- Test: build; mock se private jumla "Ollama (local) · local" route par gaya.

## 27 Nov 2026 — v3.32.0 (Live awaz server + Jarvis Phone + ActivityWatch)
- Voice server (lib/jarvis/voice_server.py, sirf 127.0.0.1:5577): Whisper aur Kitten EK dafa load. Pehle har baat par naya Python + model load hota tha. Dashboard khud chalata hai; na chale to purana tareeqa. 30 min khali rahe to khud band.
- Kitten model ab yaad rehta hai (_load cache).
- Sunna tez: chup ka intezar 1.3s se 0.8s. Browser speech mein live captions (interimResults).
- Jarvis Phone: Jarvis page par "Jarvis Phone" button > QR. Phone camera se scan = Jarvis Remote (/m.html), Add to Home screen se icon. Hukum /api/v1/jarvis par phone key ke saath; khatarnak kaam par "haan" chahiye. Wi-Fi par sirf m.html, manifest, icons aur /api/v1 khulte hain.
- ActivityWatch: "aaj kitna kaam kiya" = localhost:5600 se aaj ka khulasa (top 3 apps). Sirf khulasa, poori history AI ko nahi.
- Test: node --check JS files; Windows par asli test baqi (voice server, phone QR, ActivityWatch).
- Baaki: beech mein bolne par user ke pehle lafz record karna; Parakeet/sherpa-onnx (OpenWhispr wala engine) option.

## 27 Nov 2026 — v3.33.0 (Live Jarvis Pro)
- Asli barge-in: Jarvis bolte waqt aap ki awaz shuru hote hi chhoti recording chalu (Whisper engine). Jarvis ruka to wahi recording agla sawal banti hai, pehle lafz zaya nahi. Awaz khud ruk jaye to recording phenk di jati hai.
- Scoped qawaid (Parlant ka idea, apna code): laptop actions ki list sirf tab AI ko jati hai jab baat mein kaam ka ishara ho; comfort skill sirf jab jazbaat neutral na hon. Prompt chhota, jawab tez.
- Agent "Plan pehle" (Plannotator ka idea, apna code, default On): Agent pehle /api/agent/plan se 3-8 qadam ka plan + Risk deta hai, koi file nahi badalti. Plan badal kar "Approve aur chalao". Team mode aur tasveer wale kaam par seedha chalta hai.
- Parakeet nahi lagaya: Parakeet v2 sirf English aur v3 European zubanen; Urdu/Roman Urdu nahi. Tez sunne ke liye Options > WHISPER_MODEL = base.
- Test: node --check, esbuild JSX parse. Windows par asli test baqi.
- Baaki: phone page ka apna mic (HTTPS chahiye), NeonClipping/Meetily launcher.

## 27 Nov 2026 — v3.34.0 (Free tools hub)
- Jarvis ab free tools kholta hai: "reels banao" (NeonClipping), "meeting notes kholo" (Meetily), "duplicate files dhoondo" (Krokiet), "screen recording karo" (ShareX), "video chhoti karo" (HandBrake), "pdf se excel karo" (Stirling-PDF), "ActivityWatch kholo". Start Menu / Desktop shortcut dhoondta hai; na mile to download page.
- TOOLS.bat: ShareX, HandBrake, ActivityWatch winget se; baqi ke download page.
- Sirf kholna aur links; in tools ka code shamil nahi (NeonClipping AGPL-3.0, alag app).
- Test: node --check; detectLaptop mock se 7 jumle sahi route. Windows par shortcut talash ka test baqi.
- Baaki: phone page ka apna mic (HTTPS), Excel chart/report.

## 27 Nov 2026 — v3.35.0 (Phone mic HTTPS + Excel Report)
- PHONE-HTTPS.bat (scripts/phone-https.ps1): laptop ke Wi-Fi IP ka apna certificate (data\phone-cert.pfx, git se bahar), firewall Private 3443. server.mjs certificate ho to 3443 par HTTPS bhi chalata hai. Jarvis Phone QR khud https wala. Phone page par 🎤 button (Urdu speech, bolna khatam = khud bhejna).
- Excel Report (/excel, home par "Excel" button, Jarvis "excel ki report banao"): .xlsx/.csv browser mein parhta hai (apna chhota reader, koi naya package nahi), khali/duplicate rows, extra spaces, har column ka khulasa, group/sum chart, saaf CSV aur HTML report download.
- Test (Linux par): next build EXIT 0; production server: /, /jarvis, /agent, /excel, /connect, /m.html 200; HTTPS m.html 200 (LAN par bhi), LAN /jarvis 403; /api/v1/jarvis bina key 401, key ke saath jawab; shutdown par "haan/nahi"; safety tests 49/49; xlsx reader test (shared strings, rich text, inline, khali row, duplicate). Windows par certificate script aur asli phone mic test baqi.

## 27 Nov 2026 — v3.36.0 (Phone aur voice server ki hifazat)
- Khatarnak kaam (shutdown, restart, lock) ki "haan" ab sirf server ke apne yaad rakhe hukum par chalti hai. Jarvis page aur phone sirf ek token wapas bhejte hain (2 minute, ek dafa). Nakli pending bhej kar shutdown ab nahi hota. Phone par haan/nahi pehle jaisa chalta hai.
- Voice server (127.0.0.1:5577) par taala: data\\voice-token (git se bahar) ke bagair koi POST nahi. Koi website browser se Whisper/Kitten nahi chala sakti.
- Test: npm run test:v336 (7), CI mein shamil.
- Note: purana voice server chal raha ho to laptop restart (ya 30 min baad woh khud band), phir naya taale wala chalega.

## 27 Nov 2026 — v3.37.0 (MCP client + Recipes)
- Naya page /mcp (home menu mein "MCP"): Goose / Claude Code / Cursor wale MCP servers jodo (stdio ya HTTP), "Test + tools", tool aazmao.
- Servers ki list: C:\\Users\\<naam>\\.faheem-ai\\mcp-servers.json (update par nahi mitti). Namoona: mcp-servers.example.json (files, fetch, github).
- Hifazat: server ko sirf zaroori Windows env + jo keys aap env_keys mein likhein; baqi keys nahi jati. Jarvis har MCP tool se pehle "haan" poochta hai (server token, phone par bhi), siwaye auto_tools ke.
- Jarvis: jude hue MCP tools khud dekhta hai (5 min cache) aur <<ACTION mcp>> se chalata hai.
- Recipes (Goose recipe jaisa JSON, idea only): title, prompt, parameters {{naam}}, extensions (MCP servers), retry.checks (contains / mcp). Built-in: Website check, Folder ka khulasa, Vestire post likho. Apni recipes: .faheem-ai\\recipes.
- Test: npm run test:v337 (18), CI mein shamil.

## 27 Nov 2026 — v3.38.0 (Task Board)
- Naya page /board (menu mein "Board"): Backlog, Karna hai, Chal raha, Review, Done. Multica ka idea, apna code.
- Card mera ya Jarvis ka. Jarvis card "Chalao" se chalta hai: recipe (MCP tools) ya seedha AI. Natija card par note, card Review mein; aap Approve karein to Done, "Wapas" se dobara.
- Tool chahiye ho to card Review mein "Ijazat chahiye" dikhata hai; "Haan, chalao" sirf usi dafa ki ijazat.
- Autopilot: Jarvis card khud chale (har 30 min, 2 ghante, roz 9 ya 6 baje). Workflows schedule se, natija notification mein, phir bhi Review par aap ki haan.
- Awaz: "board par likho: ...", "Jarvis ke liye board par daalo ...", "board par kya hai".
- Drag-and-drop columns, phone par columns side scroll.
- Test: npm run test:v338 (17), CI mein shamil.

## 27 Nov 2026 — v3.39.0 (Subah ki report + Gmail + naye Jarvis looks)
- Naya page /subah (menu mein "Subah"), pins ka design: kaala mission-control, glass holo panel, beech mein Jarvis gol pad par.
- Kal ka focus ActivityWatch se (localhost:5600, AFK hata kar): kul waqt, top apps, top windows. AW band ho to report phir bhi banti hai.
- Board ka khulasa + zaroori kaam.
- Gmail (nazfaheem121@gmail.com): Google App Password se (Options keys GMAIL_USER, GMAIL_APP_PASSWORD; sirf laptop par). Jarvis emails PARHTA hai (readonly, "parhi hui" nahi banti), promotions/social/noreply chhorta hai, har aham email ka jawab TAYAR karta hai. Bhejta sirf "Bhejo" + haan par.
- Roz report: 7, 8 ya 9 baje (ops schedule "briefing"), notification mein bhi. "Suno" button report bol kar sunata hai.
- Awaz/phone: "subah ki report sunao", "emails parho", "email 1 ka jawab sunao", "email 1 ka jawab bhejo" (phir "haan", server token wala).
- Naye Jarvis looks: Crystal hummingbird, Fluffy dost.
- Settings API ab TOKEN/PASSWORD bhi chhupata hai.
- Test: npm run test:v339 (23), CI mein.

## 27 Nov 2026 — v3.40.0 (Jarvis khud: roz 9 baje sab emails)
- Jitne chahein email accounts: Gmail, Yahoo (App Password), Hotmail/Outlook.com (Microsoft sign-in, device code; Microsoft 16 Sep 2024 se password nahi leta), ya koi bhi IMAP. File: ~/.faheem-ai/mail-accounts.json (0600). Purana v3.39 Gmail khud account ban jata hai.
- Roz 9 baje khud (pehli dafa khud chalu; band karein to band): sab accounts parhta hai, har email samajhta hai (jawab zaroori? kitna zaroori? Roman Urdu tafseel), zaroori ke jawab tayar.
- Report bol kar: Jarvis page khula ho to wahi achhi awaz mein, warna laptop Windows awaz mein. Har zaroori email: kis ne, kis account par, kya chahiye.
- Awaz: "kaun si emails zaroori hain", "email 1 ki tafseel", "email 1 ka jawab sunao", "email 1 ka jawab likho ke ...", "email 1 ka jawab bhejo" + "haan". Jawab usi account se jata hai jahan email aayi.
- Page: accounts list (test, band/chalu, hatao), "+ Account jodo", Hotmail ka code, har email par tafseel + Jarvis ko hidayat.
- Test: npm run test:v340 (27), CI mein.

## 28 Nov 2026 — v3.41.0 (Jarvis App: QR scan, APK install, phone se jodo)
- /connect (Phone se jodo) naya design: upar bara "Jarvis App" QR, teen status (Phone connect, App file, kaun sa phone aakhri dafa bola), 3 qadam: Scan, Install, Jodo. Maid/PocketPal aur API key "Doosri apps" mein.
- Phone camera se QR scan -> /app.html: "Jarvis App (APK) download" + "App se jodo" (faheemjarvis://pair). Key sirf # mein, server tak nahi jati.
- Android app (android/ folder, apna Java code, koi library nahi): laptop ka Jarvis Remote, Android ka apna mic (Urdu) aur awaz, isliye HTTPS/PHONE-HTTPS.bat ki zaroorat nahi. Laptop na mile to "Laptop nahi mila" screen, khud dobara koshish. Sirf private Wi-Fi IP aur fad- key maanti hai.
- GitHub Actions (android.yml) har PR par APK banata hai; main par release "jarvis-android" mein. Laptop pehli zaroorat par wahan se data/jarvis.apk laata hai (din mein ek dafa naya), phone /download/jarvis se leta hai (sirf Phone connect On par).
- Jarvis modal ka QR bhi ab App page kholta hai.
- Note: APK apni chabi (android/jarvis-release.p12) se sign hoti hai taake naya APK purane par update ho. Repo private kiya to laptop ko release download ke liye token chahiye hoga.
- Test: npm run test:v341 (30), CI mein. APK build CI (android) mein.

## 28 Nov 2026 — v3.42.0 (Jarvis Live: MYRA ki khoobiyan, apna code)
- Jarvis page par "Live" button: Gemini Live (gemini-3.8-live, free tier) se asli waqt ki baat. Beech mein tok sakte hain (barge-in), Jarvis foran ruk jata hai. Baat ka likha hua (transcript) saath dikhta hai.
- Asal Gemini key browser ko nahi jati: laptop 1 session/30 min ka ephemeral token banata hai (/api/jarvis/live, sirf laptop).
- Har laptop kaam ek tool "jarvis_kaam" se purane Jarvis dimagh tak: wahi allowlist, wahi "haan" hifazat (band, restart, lock, email bhejna, likhna, app band karna).
- "Screen dikhao" aur "Camera": Jarvis 1 tasveer/second dekh kar baat karta hai.
- "Hey Jarvis": page khula ho to naam sun kar Live shuru (Chrome/Edge). "Floating orb": chhota orb har window ke upar (Document Picture-in-Picture, Chrome/Edge 116+), dabane se Live shuru/band, awaz ke saath dhadakta hai.
- Naye PC kaam: battery/CPU/RAM, brightness (laptop screen), gaana roko/agla/pichla, desktop dikhao/windows wapas/window badlo/bari/chhoti, app saamne lao, app band karo (haan), clipboard parho/daalo, "likho: ..." (haan), WhatsApp par number ko message (tayar karta hai, Send aap dabate hain).
- Hotmail fix: Microsoft scope ab IMAP.AccessAsUser.All (pehle ghalat AccessScope tha).
- Option key GEMINI_LIVE_MODEL (khali = gemini-3.8-live).
- Ideas: MYRA ULTRA (codeninjavik/myra-ultra, MIT). Koi code copy nahi.
- Test: npm run test:v342 (34), CI mein.

## 28 Nov 2026 — v3.43.0 (Jarvis Live phone par + WhatsApp naam se)
- Jarvis Android app mein "● Live" button: Gemini Live se asli waqt ki baat phone par, beech mein tok sakte hain. Echo cancel + speaker. Screen Live ke dauran on rehti hai; app peeche jaye to mic khud band.
- Token laptop deta hai (/api/v1/live, phone key ke saath); asal Gemini key phone par nahi jati. Har kaam laptop ke Jarvis dimagh se, "haan" hifazat wahi.
- App mein pehli library: OkHttp 4.12.0 (Apache-2.0), sirf WebSocket ke liye.
- Purani app: m.html "naya app install karein" batata hai. Naya APK: laptop par Phone se jodo QR -> Jarvis App (APK) download.
- WhatsApp naam se: "Ali ka number 0300 1234567 save karo", phir "WhatsApp par Ali ko message bhejo ke ...". Phone book sirf laptop par (~/.faheem-ai/contacts.json, 0600). Do ek jaise naam hon to Jarvis andaza nahi lagata.
- Test: npm run test:v343 (19), CI mein. Android build CI mein.

## 28 Nov 2026 — v3.44.0 (mobile se mobile + laptop)
- Jarvis Android app ab phone ke apne kaam bhi karta hai: torch, alarm, timer, call (dialer khulta hai), SMS aur WhatsApp (tayar, Send user ka), camera, map par rasta, phone ki battery/awaz/vibrate, "phone par X kholo", Wi-Fi/Bluetooth/brightness settings, phone par YouTube/Google.
- Qaida: sirf-phone kaam (torch, call, SMS, alarm, timer, camera, rasta) khud phone par; shared kaam (battery, awaz, app, WhatsApp) sirf "phone/mobile" kehne par; "laptop par ..." hamesha laptop. Baqi sab laptop.
- Live mein dusra tool phone_kaam (phone par), jarvis_kaam laptop par.
- Ijazat: alarm (SET_ALARM), contacts (pehli dafa poochta hai). Call/SMS ki ijazat nahi li: app khud call ya SMS nahi kar sakti.
- Test: npm run test:v344.

## 28 Nov 2026 — v3.45.0 (Jarvis internet par dhoondta aur mashwara deta hai)
- "kaunsa laptop behtar hai", "iPhone 16 ki qeemat", "aaj ki khabar", "mausam", "internet par dekho ...", "mashwara do": Jarvis internet par dhoondta hai (DuckDuckGo, na mile to Bing; koi key nahi), top 3 pages parhta hai, phir ek saaf mashwara deta hai. Jarvis page par "Source" links.
- Roman Urdu sawal ko tez AI chhote English search mein badalta hai (na ho to purana tareeqa).
- Link + "parho/khulasa": woh page parh kar batata hai.
- Hifazat: localhost/LAN/private IP ka koi page nahi khulta; page ka text sirf maloomat, us ki "hidayat" hukum nahi; qeemat sirf jo source mein likhi ho.
- Live: Gemini ka Google Search tool; setup ka dhancha theek (responseModalities/speechConfig ab generationConfig mein).
- Test: npm run test:v345 (33).
