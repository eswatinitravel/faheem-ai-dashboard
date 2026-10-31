# NOTICE — Third-party credits (Faheem AI Dashboard v3.13.0)

Yeh dashboard in open-source projects ko istemal karta hai. Har ek ka license aur notice yahan mehfooz hai.

| Project | Kahan | License |
|---|---|---|
| Agentation — Benji Taylor (github.com/benjitaylor/agentation, npm `agentation` 3.1.2) | Toolbar: `app/components/AgentationDock.js`, page `/skills/agentation` | PolyForm Shield 1.0.0 (poora text neeche) |
| Agentation MCP (npm `agentation-mcp`, `npx -y agentation-mcp server`) | Sirf setup command (install nahi kiya) | PolyForm Shield 1.0.0 |
| Hallmark — Nutlope (github.com/Nutlope/hallmark) | `lib/design.js`, `hermes-skills/faheem-design` | MIT |
| UI UX Pro Max — nextlevelbuilder (github.com/nextlevelbuilder/ui-ux-pro-max-skill) | `lib/uupm` (data + LICENSE) | MIT — `lib/uupm/LICENSE` |
| Impeccable — Paul Bakaus (github.com/pbakaus/impeccable, npm `impeccable` 4.8.0) | `lib/impeccable` | Apache-2.0 — `lib/impeccable/LICENSE`, `lib/impeccable/NOTICE.md` |
| Lucide icon shapes | `app/components/Icon.js` | ISC |
| jsdom | Browser Tester | MIT |
| three.js | 3D background | MIT |

Agentation ka istemal: apne kaam (dashboard ke andar visual feedback) ke liye free. PolyForm Shield ke mutabiq
Agentation ka muqabil product/service banana ya bechna mana hai, aur license/copyright notices hatana mana hai.

---

## Agentation — PolyForm Shield License 1.0.0 (node_modules/agentation/LICENSE se, bilkul waisa)

PolyForm Shield License 1.0.0

Copyright (c) 2026 Benji Taylor

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to use,
copy, modify, and distribute the Software, subject to the following conditions:

1. You may not use the Software to provide a product or service that competes
   with the Software or any product or service offered by the Licensor that
   includes the Software.

2. You may not remove or obscure any licensing, copyright, or other notices
   included in the Software.

3. If you distribute the Software or any derivative works, you must include a
   copy of this license.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

For more information, see https://polyformproject.org/licenses/shield/1.0.0


---

## Extra tools (v3.11) — dashboard inhe bundle nahi karta (sirf setup/guide), siwaye playwright-core

- **Playwright / playwright-core 1.64.1** — Microsoft, Apache License 2.0. https://github.com/microsoft/playwright
- **Graphify (graphifyy)** — Graphify Labs. PyPI release: Apache-2.0; GitHub main pyproject abhi MIT likhta hai. https://github.com/safishamsi/graphify
- **Compound Engineering plugin** — Every Inc, MIT. https://github.com/EveryInc/compound-engineering-plugin
- **21st MCP (21st.dev, pehle Magic MCP)** — repo ISC; service 21st.dev terms ke tehat. Free plan: search + logo search; AI generate paid credits.
- **Harvey** — shamil nahi (Harvey.ai enterprise legal AI, sirf demo).

---

## v3.13 — Ruflo se inspired (code shamil nahi)

- **Ruflo — ruvnet (github.com/ruvnet/ruflo), MIT License.** Agent Team (swarm: coordinator + Designer/Coder/Tester/Reviewer roles, shared task board, handoffs, budget guard) aur Persistent Memory (local yaad + retrieval) ke *ideas* Ruflo se liye gaye. Dashboard ka code (`lib/agent/team.js`, `lib/agent/team-run.js`, `lib/memory.js`, `app/memory`, `app/api/memory`) apna likha hua hai — Ruflo ka koi code copy ya install nahi kiya (Ruflo ko paid Claude Code/Codex chahiye; yeh dashboard sirf free brains istemal karta hai). Shukriya ruvnet.
- Memory ki retrieval `lib/uupm` wala BM25 formula istemal karti hai (UI UX Pro Max, MIT — upar).

---

## v3.14 — Brains Rooms + bina-jhanjhat free brains (code shamil nahi, sirf ideas/services)

- **freelm — shihabshahrier (github.com/shihabshahrier/freelm), MIT License.** "Key pool" ka *idea* (har brain ki 2-3 keys, 429 par agli key, 401 par key band, thaki hui keys ko aaram) freelm se liya. Dashboard ka code (`lib/brain-status.js`, `lib/brain-check.js`, `lib/providers.js` ka pool hissa) apna likha hua hai — freelm ka koi code copy ya install nahi kiya. Shukriya.
- **stillworks (stillworks.supercapybara.com)** — free LLM endpoints ki live list (`/api/llm/up`). Dashboard har ghante sirf yeh public JSON parhta hai; service band ho to purani list chalti hai. Pollinations purane host aur Free.ai ki maloomat bhi yahin se (2026-10-31).
- **Pollinations (text.pollinations.ai)**, **Free.ai (api.free.ai)**, **AI Horde (aihorde.net, public anonymous key 0000000000)** — doosron ki free services; apni terms ke tehat, kabhi bhi badal sakti hain.
- **Puter.js (heyPuter/puter, js.puter.com/v2)** — browser mein, user ke apne Puter account se (koi API key nahi). "User-pays" model: free mahana hissa, had likhi nahi. Script sirf zaroorat par load hoti hai, bundle nahi.
- **Meta AI / Meta Model API (Muse Image, muse-image-1.0)** — Meta Platforms. Free: meta.ai website/app (user ka apna login, alag Edge window). Meta Model API paid ($0.01/tasveer) — dashboard mein default BAND. Meta ka koi code shamil nahi.
- Jaan bujh kar shamil NAHI: OpenCode Zen free, Hack Club AI, gpt4free / web scrapers (Terms of Service).
