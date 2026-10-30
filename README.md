# Faheem AI Dashboard

Free 3D AI assistant for Windows: likh kar ya bol kar baat karein. Jab ek free AI ki limit khatam ho, agla khud jawab deta hai.

**Order (v3.11):** pehle aap ke key wale brains (Groq, Gemini, OpenRouter, Z.ai, Mistral, Cohere, NVIDIA, SambaNova, Cloudflare, Hugging Face, Hetzner, Nous, Requesty, Pollinations) → bina-key free brains (Kilo, OVHcloud, LLM7) → Ollama (laptop, bina limit). Pollinations ab free key mangta hai (enter.pollinations.ai).

## Install (ek dafa)

1. ZIP extract karein.
2. Folder mein **INSTALL.bat** par double-click karein.
3. Desktop par **Faheem AI** icon ban jaye ga, app khud khul jaye gi.

## Master Agent

Har sawal Master Agent dekhta hai aur sahi expert ko deta hai: 💻 Code, 🌐 Website, ✍️ Urdu & Content, 📈 Business, ✈️ Travel, 🔎 Research. Har expert apna behtareen free AI istemal karta hai. Sidebar se khud bhi chun sakte hain. Bade kaam (browser, booking, email) ke liye **Hark se karwao** button.

## Self-update

App khulte hi GitHub (`eswatinitravel/faheem-ai-dashboard`) par naya version check karti hai. Naya ho to sidebar mein **⬆ Abhi update karein** aata hai. Keys aur chats mehfooz rehti hain. Haath se: **UPDATE.bat**.

## Keys

App mein **⚙ Settings / Keys** dabayein aur free keys paste karein (koi card nahi):
- Groq (chat + voice): https://console.groq.com/keys
- Gemini: https://aistudio.google.com/apikey
- OpenRouter: https://openrouter.ai/keys
- Z.ai GLM (glm-4.7-flash hamesha free): https://z.ai/manage-apikey/apikey-list
- Mistral (free Experiment plan): https://console.mistral.ai/api-keys

Keys sirf isi laptop par `data/keys.json` mein rehti hain. Purani `.env.local` bhi chalti hai.

## Voice

🎙 dabayein, bolein, chup ho jayein: app sun kar jawab dega aur bol kar sunaye ga, phir dobara sune gi. Band karne ke liye 🎙 dobara dabayein. Pehli dafa mic **Allow** karein. Voice ke liye Groq key zaroori hai.

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

## Ollama (optional)

https://ollama.com/download phir `ollama pull llama3.2:3b` (8GB RAM ke liye).

## Docker (optional)

Sirf us computer/server par jahan Docker chal sake: `docker compose up -d`
