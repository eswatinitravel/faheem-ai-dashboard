# Faheem AI Dashboard

Free 3D AI assistant for Windows: likh kar ya bol kar baat karein. Jab ek free AI ki limit khatam ho, agla khud jawab deta hai.

**Order (v3.14):** pehle aap ke key wale brains (Groq, Gemini, OpenRouter, Z.ai, Mistral, Cohere, NVIDIA, SambaNova, Cloudflare, Hugging Face, Hetzner, Nous, Requesty, Pollinations) → bina-key free brains (Kilo, OVHcloud, LLM7, Pollinations purana host, Free.ai) → live free list (stillworks, har ghanta) → AI Horde (dheema, aakhri sahara) → Ollama (laptop, bina limit). Puter.js browser mein backup brain hai (Brains Rooms / Meta page).

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

App khulte hi GitHub (`eswatinitravel/faheem-ai-dashboard`) par naya version check karti hai. Naya ho to sidebar mein **Abhi update karein** aata hai. Keys aur chats mehfooz rehti hain. Haath se: **UPDATE.bat**.

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
