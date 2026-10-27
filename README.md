# Faheem AI Dashboard

Free 3D AI assistant for Windows: likh kar ya bol kar baat karein. Jab ek free AI ki limit khatam ho, agla khud jawab deta hai.

**Order:** Groq → Gemini → OpenRouter (free models) → Ollama (laptop, bina limit)

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

Keys sirf isi laptop par `data/keys.json` mein rehti hain. Purani `.env.local` bhi chalti hai.

## Voice

🎙 dabayein, bolein, chup ho jayein: app sun kar jawab dega aur bol kar sunaye ga, phir dobara sune gi. Band karne ke liye 🎙 dobara dabayein. Pehli dafa mic **Allow** karein. Voice ke liye Groq key zaroori hai.

## Rozana

- Kholna: Desktop icon **Faheem AI**
- Band karna: **STOP.bat**

## Ollama (optional)

https://ollama.com/download phir `ollama pull llama3.2:3b` (8GB RAM ke liye).

## Docker (optional)

Sirf us computer/server par jahan Docker chal sake: `docker compose up -d`
