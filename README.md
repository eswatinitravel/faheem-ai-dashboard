# Faheem AI Dashboard

Free 3D AI assistant for Windows: likh kar ya bol kar baat karein. Jab ek free AI ki limit khatam ho, agla khud jawab deta hai.

**Order (v3.14, v3.17 mein har kaam ka apna order: /workflows > Brains ki tarteeb):** pehle aap ke key wale brains (Groq, Gemini, OpenRouter, Z.ai, Mistral, Cohere, NVIDIA, SambaNova, Cloudflare, Hugging Face, Hetzner, Nous, Requesty, Pollinations) → bina-key free brains (Kilo, OVHcloud, LLM7, Pollinations purana host, Free.ai) → live free list (stillworks, har ghanta) → AI Horde (dheema, aakhri sahara) → Ollama (laptop, bina limit). Puter.js browser mein backup brain hai (Brains Rooms / Meta page).

## Naya v3.35.0 (Phone mic + Excel Report)
- **Phone par seedha mic:** dashboard folder mein PHONE-HTTPS.bat ek dafa chalayein, dashboard restart. Jarvis Phone ka QR https wala hoga; phone par pehli dafa "Not secure" > Advanced > Proceed, phir 🎤.
- **Excel Report:** home par Excel button. File daalein: safai ki jaanch, chart, saaf CSV aur report download. File laptop se bahar nahi jati.

## Naya v3.34.0 (Free tools hub)
- Jarvis se kahein: "reels banao", "meeting notes kholo", "duplicate files dhoondo", "screen recording karo", "video chhoti karo", "pdf se excel karo". Tool laga ho to khulta hai, warna download page.
- **TOOLS.bat** se ShareX, HandBrake aur ActivityWatch ek click mein.

## Naya v3.33.0 (Live Jarvis Pro)
- **Beech mein bolein:** Jarvis ko tok kar baat karein, aap ke pehle lafz bhi sune jate hain.
- **Agent Plan pehle:** bara kaam shuru hone se pehle plan dikhta hai, aap badal kar Approve karein. Band karna ho to Agent mein "Plan pehle" checkbox.
- **Tez jawab:** AI ko har baar sirf zaroori qawaid jate hain.

## Naya v3.32.0 (live awaz + Jarvis Phone)
- **Tez awaz:** Whisper aur Kitten ab ek dafa load hote hain (voice server, sirf laptop par). Jarvis 0.8s chup ke baad sunna band karta hai.
- **Jarvis Phone:** Jarvis page > **Jarvis Phone** > QR. Phone camera se scan karein, Chrome menu > Add to Home screen. Phone aur laptop ek Wi-Fi par.
- **"Aaj kitna kaam kiya?"** ActivityWatch (free) laga ho to Jarvis aaj ka khulasa batata hai.

## Naya v3.31.1

 - **Jarvis foran bolta hai:** AI ka pehla jumla aate hi bolna shuru, baqi saath saath. Intezar kaafi kam.

## Naya v3.31 (Jarvis: live baat-cheet theek, professional andaaz, tasveer/screen parhna)

 - **Live baat-cheet theek:** Whisper na mile to browser foran sunta hai (koi baat zaya nahi), har ghalti screen par saaf likhi aati hai, Groq key expire ho to bata deta hai.
 - **Mic khud set:** shuru mein kamre ka shor naap kar sunne ki had set; Jarvis apni hi awaz se nahi rukta.
 - **Professional andaaz (default):** seedha jawab, ek agla qadam, faltu baatein nahi.
 - **Aankh:** tasveer lagao ya "meri screen parho" bolo; Jarvis likha hua parh kar batata hai (Gemini ya Groq vision key).

## Naya v3.29 (Phase 1 bugs: schedules, update wapsi, timeouts)

- **Schedules restart ke baad khud chalte hain:** pehle dashboard dobara chalane ke baad schedules / kaam-queue tab tak sote rehte jab tak `/workflows` na khulta. Ab `server.mjs` shuru hote hi ops chalu karta hai (ek hi timer, dev hot-reload par bhi dobara nahi). Laptop band tha aur waqt guzar gaya? Har schedule sirf **ek dafa** chalta hai (sailaab nahi), history mein "chhoota hua" likha aata hai, phir agla waqt abhi se. Band karna ho to `FAHEEM_NO_OPS_BOOT=1`.
- **Update se pehle backup, fail par khud wapsi:** naya version lagane se pehle purane ka backup `backups\v<version>-<tareekh>` mein (node_modules, data, .next, .env.local ke baghair; aakhri 3 rehte hain). npm install / build / start fail ho to purana version khud wapas lag kar chal jata hai. Chats aur keys (`data\`, `~/.faheem-ai`) kabhi nahi chhoote.
- **Purane version par wapas:** neeche version ke paas **"Purane version (vX) par wapas"** button, ya project folder mein **ROLLBACK.bat** (ya `UPDATE.bat rollback`) — server na chal raha ho tab bhi.
- **Timeouts:** Whisper (awaz), GitHub, update check, Uiverse aur Ollama model download ab hamesha ke liye nahi atakte; had guzarne par saaf paigham ("... ne 60 second mein jawab nahi diya (timeout)"). Brain aur web_fetch ka timeout bhi ab "operation aborted" ke bajaye Roman Urdu mein. Streaming waisi hi.
- Test: `npm run test:phase1` (18 checks bina internet), GitHub CI mein bhi.

## Naya v3.28 (hifazat: Phase 1)

- **Doosri website se request band (CSRF):** koi bhi website ab browser ke zariye `localhost:3000/api/*` par POST nahi bhej sakti (Agent, keys, settings, Jarvis "haan" sab). Sirf isi dashboard ke page ya browser extension (WebBrain) se, aur sirf JSON (Gallery / awaz upload par file bhi). `/api/v1` phone wali key se waisa hi chalta hai.
- **DNS-rebinding guard:** Host mein koi ajeeb domain ho to request rad (Docker / lan-guard-off mein bhi sirf localhost ya seedha IP).
- **Agent ki command (run_command):** sirf `node, npm, npx, python, python3, py, pip, git`, ek waqt mein ek command (`&& | ; > <` nahi). Install par ijazat pehle jaisi. Command ko ab aap ki API keys (env) nahi milti.
- **Keys mehfooz:** Agent `.env`, `keys.json` aur `~/.faheem-ai` ki raaz files na parh sakta hai na dhoond sakta hai (shortcut / symlink se bhi nahi).
- **Agent preview sandbox:** agent ki banai website preview mein alag "sandbox" mein chalti hai, dashboard ki APIs tak nahi pahunchti. (Preview mein localStorage nahi chalta; ZIP / asli project mein sab theek.)
- **Wi-Fi se "localhost" ban kar ghusna band:** pehle Wi-Fi par koi bhi `Host: localhost` aur jaali `X-Forwarded-For: 127.0.0.1` bhej kar poora dashboard khol sakta tha. Ab faisla asli connection (socket) ke pate se hota hai: `npm start` / START.bat ab `server.mjs` chalate hain jo har request par asli pata (raaz ke saath) likhta hai. Seedha `next start` se laptop par bhi 403 aata hai, is liye hamesha `npm start` (ya `npm run dev`) istemal karein. Docker / lan-guard-off pehle jaisa.
- Test: `npm run test:safety` (45 checks bina internet; build mojood ho to 49 — asli server par LAN IP se live jaanch). GitHub par har push / PR par tests khud chalte hain.

## Naya v3.27 (phone, status, AI team, haath se control)

- **Phone se jodo (sidebar > Phone, localhost:3000/connect):** phone par **Maid** ya **PocketPal AI** app se dashboard ke free brains istemal karein.
  1. Page par **Phone connect** On karein (default band).
  2. Phone aur laptop ek hi Wi-Fi par. Page par laptop ka IP, **Base URL** aur **API key** (`fad-...`) milte hain; QR code se phone camera mein copy.
  3. **Maid:** Settings > API **OpenAI** > Base URL `http://<laptop-IP>:3000/api/v1` > API key `fad-...` > model **faheem-free**.
  4. **PocketPal AI:** Models > + > OpenAI-compatible server > URL `http://<laptop-IP>:3000/api` > key `fad-...` > **faheem-free**.
  5. Na jude: Windows Firewall mein port 3000 **Private** network par allow (page par command likhi hai), Wi-Fi profile Private, guest Wi-Fi nahi.
  - Hifazat: Wi-Fi se ab sirf `/api/v1` khulta hai aur woh bhi key ke saath. Agent, files, keys sirf laptop par. "Poora dashboard phone par" Advanced mein alag toggle (default band).
  - Server ab saaf `next start -H 0.0.0.0` se chalta hai (pehle bhi sab interfaces par sunta tha, ab yeh guard ke saath).
- **Status + Launcher (sidebar > Status, localhost:3000/status):** Ollama, Whisper, Kitten awaz, GitHub update, Phone connect aur har free brain ki hari/peeli/laal light, ms mein raftar, "kitni der pehle" check. Har 60 second khud taaza; "Abhi check karo" foran. Sirf sasta `/models` ping (koi chat token kharch nahi). Neeche **App launcher**: tiles, talaash bar, "Badlo" se tile jodo/hatao/oopar-neeche; `data/launcher.json` mein save (update par mehfooz).
- **AI Team chat (Agent page > "AI Team chat" tab):** Planner, Researcher, Coder, Reviewer ek hi chat mein baari baari jawab dete hain, har ek alag free brain se. Coder file ya command sirf **tajweez** karta hai; har tajweez ke neeche **Ijazat do / Mana karo**. Kuch bhi khud nahi chalta; ijazat isi project folder tak, ek dafa, 10 minute mein expire. Khatarnak commands (delete, format, shutdown, registry, `curl | sh`) dikhai bhi nahi jatin, "Roki gayi" likha aata hai.
- **Jarvis "Haath se control" (button oopar, default band):** On karne par hi camera ki ijazat aur MediaPipe (internet se ek dafa ~8 MB). Khula haath ~1 second roko = sunna shuru/band · haath tezi se daayen/baayen = theme badlo (ya "Swipe: Persona") · shahadat ki ungli = cursor, angootha + ungli milao (pinch) = click. Internet/camera na ho to khud band aur wajah likh deta hai.
- **Design page:** Penpot (free open-source design tool) ke links. **Workflows > n8n webhook:** n8n ka Webhook URL aur JSON daal kar "Webhook bhejo".
- Test: `npm run test:v327` (27 checks, bina internet). Server chal raha ho to `BASE=http://localhost:3000 npm run test:v327` (40 checks).

## Naya v3.19 (GitHub)

 - **v3.19.1 Superpowers (obra/superpowers):** GitHub > Skill download > "Superpowers" chip se 15 skills install. Phir chat khud sahi skill chunti hai: "bug/error/fix" = systematic-debugging, "plan" = writing-plans, "test" = TDD, "idea/naya feature" = brainstorming, "review" = code review. "superpowers" likhein to poora tareeqa.

 - **GitHub page (sidebar > GitHub, localhost:3000/github):** account juda (default **eswatinitravel**). Token ikhtiyari: private repos aur zyada limit ke liye.
 - **Meri repos:** apni saari repos, har ek par Download aur Skills.
 - **Repo download:** koi bhi GitHub link ya `owner/repo` likhein, ya talaash karein. Files: `C:\Users\<naam>\.faheem-ai\repos`. "Folder kholo" se Explorer khulta hai.
 - **Skill download:** repo ya folder ka link; jahan SKILL.md mile woh skill install. Files: `C:\Users\<naam>\.faheem-ai\skills`. Chat mein skill ka naam likhein to brain usay parh kar kaam karta hai.
 - Pause All chalu ho to download nahi hota; har download audit log mein.

## Naya v3.18 (front dashboard, 2 screen)

 - **Front page ab do hisson mein:** baayen aap ki chat, daayen **Live panel** (hamesha khula; oopar panel button se band/khol).
 - **Brains tab:** har sawal par us kaam ke brains ki line number ke saath. Peeli roshni = kaam kar raha, hari = jawab diya, laal = ruk gaya (wajah ke saath), agla khud try.
 - **Har kaam ki tarteeb front par hi:** Code, Website, UI/UX, Urdu & Content, Business, Travel, Research, General. Oopar/neeche se badlein, Default se wapas.
 - **Ijazat tab:** Agent file hatana ya package install karna chahe to yahin Approve / Reject.
 - **Pause All** panel ke oopar: sab foran rukta hai. Resume se wapas.
 - **Live kaam tab:** website preview, tasveeren, aur agents ki baat-cheet.

## Naya v3.17

- **v3.17.1:** dashboard na khule to folder mein **REPAIR.bat** par double-click (log: Desktop\faheem-ai-repair-log.txt).

- **Workflows page (localhost:3000/workflows, chat ke oopar "Workflows" button):** har kaam ki timeline, Kaam / Ijazat / Schedule / Brains ki tarteeb / Audit log tabs.
- **Pakki kaam-queue:** har background kaam pehle save, phir chalta hai. Ghalti par 1s, 2s, 5s, 10s, 30s baad 5 dafa tak dobara, phir "fail (list)" jahan se Retry. App band ho kar khule to adhoore kaam khud wapas line mein. Files: `C:\Users\<naam>\.faheem-ai\ops`.
- **Ijazat (Approve / Reject):** Agent file hatana chahe, ya internet se package install (npm/pip install) kare, to pehle ijazat. Ijazat exact kaam + exact arguments par bandhi (SHA-256), 10 minute mein expire, sirf ek dafa. Kuch badla to nayi ijazat.
- **Pause All:** ek button se Agent, queue aur schedules foran ruk jaate hain; Resume se wapas.
- **Audit log:** har agent run, command, ijazat, file hatana, export ka record. Keys/tokens kabhi nahi likhe jaate.
- **Brains ki tarteeb:** har kaam (Code, Website, UI/UX, Urdu & Content, Business, Travel, Research, General) ke liye key wale brains ka apna order, misaal: Code = Gemini > NVIDIA (DeepSeek) > SambaNova > Groq; Research = SambaNova > NVIDIA > Gemini; General = Groq pehle (sab se tez). ↑ ↓ se badlein, "Default" se wapas. Bina-key brains, live list, AI Horde aur Ollama hamesha aakhir. Order: `C:\Users\<naam>\.faheem-ai\brain-order.json`.
- **Schedules + yaad-dihani:** "15m", "2h", "daily@09:00" ya "once". Run Now, Roko/Chalu, har chalne ki history, taaza natije.
- **Data export:** Workflows par download button, saara data ek JSON mein (API keys ke baghair).
- Test: `npm run test:ops` (25 checks).

## Naya v3.16

- **Project Builder ZIP:** main chat mein likhein "todo website bana kar zip do" (ya "project bana do zip", "zip folder do"). Planner file list banata hai, Builder har file likhta hai, Tester bina AI jaanchta hai (node --check, JSON, HTML, Python syntax, browser test), Fixer had ke andar theek karta hai, phir ZIP: project + README.md (Roman Urdu) + INSTALL.bat + START.bat + setup.sh + .env.example. Chat mein download card (size, files, sachcha test result: tests fail hon to "Tayyar" nahi likhta). Agent Mode mein har project ke liye **ZIP** button + **ZIP history** (dobara download / hatao). ZIP files: `C:\Users\<naam>\.faheem-ai\zips`.
- **Private Assistant Builder (Hey Puppy):** main chat mein likhein "mere laptop ke liye free AI assistant banao" (ya "hey puppy assistant bana do"). Pehle research card: is hafte ka GitHub trending + top assistants (OpenClaw, Hermes Agent, nanobot, QwenPaw, AstrBot, Orkas) ke sab se zyada maange gaye features, tick karein, phir Build. Natija ek ZIP: **Hey Puppy** - Electron desktop app jis mein safed 3D puppy (9 jazbaat: khush, excited, udaas, neend, curious, sun raha, soch raha, playful, pyar) screen ke neeche ghoomta hai, ya "Glowing orb" avatar. Urdu / English awaz (Groq Whisper free key + Edge ki free ur-PK Uzma awaz), Ctrl+Shift+Space push-to-talk, Chrome extension (page parhna; fill / click sirf Allow par), har kaam se pehle Allow / Deny, yaad + "seekha hua" sabaq, skills folder, Telegram ikhtiyari. Dimagh sirf free: Groq key ya Ollama (qwen2.5:3b). AI sirf naam / shakhsiyat aur 3 skills likhta hai; brain band ho to bhi default Puppy chalne wala ZIP milta hai. Code: `templates/hey-puppy`, `lib/agent/assistant-zip.js`, `lib/assistant-research.js`.
- **Poora naya design "Linear Ink" (Linear/Vercel 2026 andaaz + Hallmark qawaid):** near-black base, patli 1px lines, baayen sidebar jo sirf icons tak chhota hota hai, version chip (v3.16.0), AI jawab apni surface par, dense tables, docked composer. Rang purane hi: laal-coral buttons, violet/blue/teal/pink chips, green/amber/red status. Design audit score har page par ~55 se ~90-96.
- **Background:** main chatboard par "Purple Desert" video (getlayers.ai free layer) default; Options > Display > Background: Purple Desert / DNA (apna 3D helix) / Off. Windows animations off par ruki hui tasveer. Purana 3D orb waisa hi.
- v3.15 ka Flowstate background hata diya gaya.

## Naya v3.15

- **Naya saaf design (Hallmark):** ek type scale, 4/8px spacing, saaf focus ring, phone par 44px buttons. Saare emoji hata kar SVG icons.
- **UI/UX Specialist:** website ka kaam ab designer specialist ke qawaid se banta hai; har bani site ka design audit score (100 ka) log mein.
- **Tez yaad-dasht:** memory RAM cache + ek dafa ka index; 1000 yaadon par jawab ~60ms se ~2ms.
- **Seekha hua:** har kaam ke baad sabaq (kaun sa brain chala, ghalti → hal, aap ki tasheeh, design score). /memory par dekhein ya mitayein.
- **Research card:** "website banao / project banao" likhein to pehle milte-julte products, extra features aur stack dikhte hain. Tick karein aur Build dabayein, ya Skip.
- **Chat export:** oopar download button se chat Markdown file mein.
- Top AI assistants se ideas: `docs/IDEAS-FROM-TOP-ASSISTANTS.md`.

## Brains Rooms (v3.14) — localhost:3000/brains

Har brain ka apna card + chat room, ek screen par 4 (2x2), Page 1..6. Card par "Key lein" link, chhupi key + Save, status light (chal rahi · ghalat/expire · limit, X min baad · key nahi), key pool (+ se 2-3 keys, limit par agli). Har room ki history `~/.faheem-ai/rooms/`. Attach: tasveer sirf dekhne wale brains ko.
Brain kaam kare to room ke kinare aur oopar patli patti par laal dots.

## Meta page (v3.14) — localhost:3000/meta

Meta AI (Muse Image) se tasveer edit: tayyar prompts + Copy, "Meta AI mein kholo" (alag Edge window, FREE, apna Meta login). Meta Model API paid ($0.01/tasveer) — default band. Free backup: Puter.js.

## Skills guide (v3.14) — localhost:3000/skills/guide

16 skills aasaan Roman Urdu mein: kya, kab, kaise, misaal prompt.

## Install (ek dafa)

1. ZIP extract karein.
2. Folder mein **INSTALL.bat** par double-click karein.
3. Desktop par **Faheem AI** icon ban jaye ga, app khud khul jaye gi.

## Master Agent

Har sawal Master Agent dekhta hai aur sahi expert ko deta hai: Code, Website, Urdu & Content, Business, Travel, Research. Har expert apna behtareen free AI istemal karta hai. Sidebar se khud bhi chun sakte hain. Bade kaam (browser, booking, email) ke liye **Hark se karwao** button.

## Self-update

App khulte hi GitHub (`eswatinitravel/faheem-ai-dashboard`) par naya version check karti hai. Naya ho to sidebar mein **Abhi update karein** aata hai. Keys aur chats mehfooz rehti hain. Haath se: **UPDATE.bat**. v3.29 se har update se pehle backup banta hai; masla ho to khud purana version wapas, ya **ROLLBACK.bat**.

## Keys

App mein **Settings / Keys** dabayein aur free keys paste karein (koi card nahi):
- Groq (chat + voice): https://console.groq.com/keys
- Gemini: https://aistudio.google.com/apikey
- OpenRouter: https://openrouter.ai/keys
- Z.ai GLM (glm-4.7-flash hamesha free): https://z.ai/manage-apikey/apikey-list
- Mistral (free Experiment plan): https://console.mistral.ai/api-keys

Keys sirf isi laptop par `data/keys.json` mein rehti hain. Purani `.env.local` bhi chalti hai.

## Voice

dabayein, bolein, chup ho jayein: app sun kar jawab dega aur bol kar sunaye ga, phir dobara sune gi. Band karne ke liye dobara dabayein. Pehli dafa mic **Allow** karein. Voice ke liye Groq key zaroori hai.

## Rozana

- Kholna: Desktop icon **Faheem AI**
- Band karna: **STOP.bat**

## Skills (v3.11) — localhost:3000/skills

Saari skills ek jagah, har ek ka apna page (live panel + side panel: **Kaise kaam karta hai** aur **Setup**):
Hallmark design rules, UI UX Pro Max, Impeccable (62 checks), Faheem Design (Hermes), Agentation, Hermes skills installer,
Design Studio, Tools board, Agent Mode, Browser Tester. Hermes mein sab design skills: **HERMES-SKILLS.bat**.

**Agentation** (visual feedback toolbar, PolyForm Shield 1.0.0): `npm run dev` mein khud chalu; START.bat (production) mein
`/skills/agentation` par "Toolbar dikhayein" On karein. Agent se jorna: `npx add-mcp "npx -y agentation-mcp server"`,
endpoint `http://localhost:4747`, jaanch `npx agentation-mcp doctor`.

### Extra tools (v3.11)
- **Playwright** — /skills/playwright: "Run Playwright check" (Windows Edge/Chrome, screenshot gallery mein). MCP: `npx @playwright/mcp@latest`.
- **Graphify** — /skills/graphify: `uv tool install graphifyy` → `graphify install` → agent mein `/graphify .`; graph.html yahan dikhta hai.
- **Compound Engineering** — /skills/compound-engineering: brainstorm → plan → work → review → compound notes.
- **21st MCP** — /skills/21st-mcp: free key 21st.dev/mcp, Options → Keys → Tool keys. Sirf free search use.
- Sab HERMES-SKILLS.bat ke "Extra tools (Y/N)" se.

## Gallery (v3.11) — localhost:3000/gallery

Pictures/files drag-drop ya click se (kai ek sath; png, jpg, webp, gif, html, css, txt, md, json, pdf; har file 10MB tak).
Files sirf isi laptop par `data/gallery` mein (update se nahi mitti). HTML/CSS file seedha skill audit ko; picture
"Chat" button se chat mein lagti hai (vision ke liye Gemini ya Groq key).

Credits/licenses: **NOTICE.md**.

## Agent Team (v3.13) — Agent Mode → "Team"
- Bara kaam (website / store / kai files): Designer → Coder → Tester → Reviewer. Shared board: `~/.faheem-ai/projects/<project>/team.json`.
- Har role apna free brain (lib/providers.js pipeline). Had: 3 rounds, ~60k tokens, 10 brain calls. Brains limit par → khud single Agent Mode.
- Default band: Agent Mode topbar mein "Team" ya Options → Agent Team.

## Memory (v3.13) — localhost:3000/memory
- Yaad-dasht: pasand, project khulase, ghalti → hal seekh. `~/.faheem-ai/memory/memories.jsonl` (update se nahi mitti).
- BM25 search se chhota hissa (default 300 tokens) chat, Agent Mode aur Team prompts mein. On/off, talaash, badlein, mitayein, Export/Import.

## Ollama (optional)

https://ollama.com/download phir `ollama pull llama3.2:3b` (8GB RAM ke liye).

## Docker (optional)

Sirf us computer/server par jahan Docker chal sake: `docker compose up -d`

## v3.19.2
- Next.js 16.4.3 se 16.4.5 (security fixes).

## v3.20.0
- Claude-Skills (alirezarezvani, MIT): GitHub page par 5 packs ke chips (Engineering, Product, Marketing, Finance, CEO/CTO).
- Skill auto-pick: naam poore lafz se, aur description se milaan (bina naam likhe sahi skill).
- Model Autopilot (Linger se idea): Brains page par laptop ka RAM/GPU dekh kar Ollama model ka mashwara, Install aur Use karo.
- Agent Inbox (TUIOS se idea): LIVE panel mein Inbox tab, ruke/ijazat wale kaam oopar, Dobara/Cancel, aur kaam khatam par desktop notification.

## v3.21.0
- Copilot (front chat): har message par khud faisla, kaun sa specialist, kaun se brains kis tarteeb mein, aur kaun si skills. Saaf na ho to sab se tez brain se 1 chhota sawal.
- Dashboard ki purani skills (Hallmark, UI UX Pro Max, Impeccable, Browser Tester, Playwright, Compound Engineering, Graphify, Agent Team, Memory) ab front chat mein khud lagti hain.
- LIVE panel mein naya Skills tab: Model Autopilot + saari dashboard aur GitHub skills ki list.

## v3.22.0
- Chat Powers: front chat se GitHub search, repo download, skill install ("github se X skill lagao"), repo utha kar us mein kaam, aur laptop par asli project (Agent Mode chat ke andar, har qadam LIVE panel par).
- Uiverse (MIT, uiverse-io/galaxy): "uiverse se loader/button/card lao" par 3 elements code ke saath.
- Grainrad aur free domain/hosting (iFreeDomains, GitHub Pages) ka mashwara chat mein; Skills list mein shamil.

## v3.23.0
- GitHub Pages publish chat se: "is website ko GitHub Pages par daal do" (chat ki aakhri website) ya "project <naam> ko GitHub Pages par daal do". Naya public repo, files upload, Pages on, link wapas. Token ko Contents, Pages, Administration: Read & write chahiye.
- iFreeDomains hata diya; domain sawal par ab GitHub Pages ka rasta.

## v3.23.1
- Website pipeline: agar Fixer adhoora ya khali jawab de (free brain limit/timeout), to pichla chalne wala page rakha jata hai, khona nahi.

## v3.24.0 — Jarvis (live awaz assistant) + Emotional skills
- Naya page **/jarvis** (front chat ke upar mic button aur sidebar mein "Jarvis"): HUD screen, mic hamesha sunta hai, beech mein bolo to Jarvis ruk jata hai, "bas" kaho to band.
- **Mard / Aurat**: Jarvis (mard) aur Friday (aurat), har ek ki alag awazen; "Lehja" list se en-GB, en-IN, ur-PK waghera chunein. Zubaan: Roman Urdu, اردو, English.
- **Sunna**: laptop wala Whisper (`pip install faster-whisper`, free, offline) → Groq Whisper key → Chrome/Edge ki apni speech recognition.
- **Bolna (offline, v3.26.1)**: Lehja > "Kitten Urdu/Hindi (offline)" — KittenTTS 2 nano, `pip install onnxruntime numpy phonemizer espeakng_loader`. Na lage to browser ki awaz.
- **Sochna**: pehle laptop ka Ollama, phir baqi free brains.
- **Laptop control** (allowlist): apps kholna (Chrome, Edge, Notepad, Calculator, Explorer, VS Code, Word, Excel, WhatsApp, Spotify, Settings), links/YouTube/Google search, folders, files dhoondna, screenshot, awaz, lock/shutdown/restart (pehle "haan"), shutdown roko. Front chat mein bhi: "chrome kholo", "screenshot lo".
- **Chrome control** (optional): `npm i -g chrome-devtools-mcp@latest` (Google, Apache-2.0).
- **Self-Improve button** (Jarvis page, upar daayen): pichli baat cheet parh kar naye qawaid seekhta hai (foran lagte hain, har ek Delete) aur code ke mashware deta hai jo Agent Mode mein aap ki ijazat se lagte hain.
- **Emotional skills** (MIT: danielroe/empathy, lonelymoon87/need-a-hug, dralexlup/therapy-skill, hoainho/iamhumans): mood pehchan (udaas, pareshan, gussa, akela, khush, dara hua), usi hisaab se jawab aur awaz ki raftar/pitch. Front chat mein bhi. Khatre ki baat par madad ki taraf rehnumai. Therapy nahi.

## v3.24.1 — Jarvis naya dashboard (hologram avatar + lip-sync)
- Pinterest wale "AI Assistant" design jaisa: baayen Persona (Personal Assistant, Coder, Teacher, Business Advisor, Dost), Andaz (Professional, Friendly, Formal) aur Laptop kaam; beech mein hologram avatar platform par; chat ab daayen side par, neeche Misaalen.
- Lip-sync: Friday (aurat) aur Jarvis (mard) ke avatar bolte waqt har lafz par honth hilate hain (speech boundary + syllables; boundary na mile to narm flap).
- Neeche "Apna assistant banayein": Naam, Mard/Aurat, Lehja, Zubaan, Sunna. Persona aur andaz Jarvis ke jawab badalte hain.

## v3.24.2 — Glass Jarvis + laptop meters
- Poora shafaf glass design; avatar background mein ghula hua hologram.
- Avatar ke saath side bubble mein jawab type hota dikhta hai (soch raha ho to dots).
- Glass meters: CPU, RAM, Disk, Battery (har 2.5 sec live), /api/jarvis/sys.

## v3.24.3 — Pro polish
- Chhote saaf fonts, ziada glass blur, avatar ka sar ab poora nazar aata hai, meters compact aur tabular numbers.
