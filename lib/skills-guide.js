// v3.14 Skills guide (/skills/guide): har skill aasaan Roman Urdu mein — kya karti hai, kab use karein, kaise chalayein, ek misaal prompt.
// id lib/skills.js ke SKILLS se milti hai (test check karta hai ke sab 16 hain).
export const SKILL_GUIDE = {
  hallmark: {
    kya: "Website ke design mein woh ghaltiyan pakarti hai jo AI aksar karta hai — jaise har jagah purple gradient, 'transition: all', focus na hona.",
    kab: "Jab koi page ya store bana lein aur dekhna ho ke design sasta/AI jaisa to nahi lag raha.",
    steps: ["Skills → Hallmark kholein.", "Apna HTML/CSS paste karein ya Gallery se .html file chunein.", "'Check' dabayein — Roman Urdu mein tips milenge.", "Tips Agent Mode ko de kar theek karwa lein."],
    misaal: "Is landing page ka design Hallmark qawaid se check karo aur 3 sab se bari ghaltiyan theek karo.",
  },
  "ui-ux-pro-max": {
    kya: "Business ka naam/qism likhein to poora design system deti hai: rang, font, style, page ka dhaancha.",
    kab: "Naya website ya store shuru karne se pehle, taake rang aur font pehle se tay hon.",
    steps: ["Design Studio (/design) kholein.", "Business likhein, jaise 'luxury fashion ecommerce'.", "Rang/font/CSS copy karein.", "Agent Mode ya Website Master ko yeh brief khud mil jata hai."],
    misaal: "Vestire Collection (luxury fashion) ke liye design system banao — rang, font aur hero section ka layout.",
  },
  impeccable: {
    kya: "62 pakke checks (bina AI, bina internet) — kam contrast, purane fonts, side-tab border waghera.",
    kab: "Website deploy karne se pehle aakhri design jaanch ke liye.",
    steps: ["Skills → Impeccable kholein.", "HTML paste karein ya Gallery se file chunein.", "Findings error → warning → advisory tarteeb se dekhein.", "Errors pehle theek karein."],
    misaal: "Meri index.html ka Impeccable audit chalao aur sirf 'error' wali cheezein batao.",
  },
  "faheem-design": {
    kya: "Hermes Agent ki chhoti design skill jo chhote/free models ko bhi saaf, hand-made design banane deti hai.",
    kab: "Jab Hermes Agent se website ya UI banwa rahe hon.",
    steps: ["HERMES-SKILLS.bat ek dafa chalayein.", "Hermes mein /faheem-design likhein.", "Phir apna kaam batayein."],
    misaal: "/faheem-design Eswatini Travels ke liye ek saaf tour booking page banao.",
  },
  agentation: {
    kya: "Page par kisi bhi cheez ko click karke note likhein — AI agent ko bilkul pata chalta hai kaunsa button/hissa.",
    kab: "Jab design mein chhoti tabdeeliyan batani hon aur lafzon mein samjhana mushkil ho.",
    steps: ["Neeche konay mein Agentation button dabayein.", "Element par click karke note likhein.", "'Copy' karke Agent Mode ya Hark ko paste karein."],
    misaal: "(Agentation notes paste karke) In 3 notes ke mutabiq page theek karo.",
  },
  "hermes-installer": {
    kya: "HERMES-SKILLS.bat ek click mein 4 design skills Hermes Agent mein daalta hai.",
    kab: "Pehli dafa Hermes set karte waqt, ya skills update karni hon.",
    steps: ["Dashboard folder mein HERMES-SKILLS.bat par double-click.", "Har step ka ✓ dekhein.", "Hermes dobara kholein."],
    misaal: "HERMES-SKILLS.bat chalane ke baad batao kaun si skills install huin.",
  },
  "design-studio": {
    kya: "Design system generator + qawaid search + Impeccable audit box ek jagah.",
    kab: "Rang/font chunne, UX qawaid dhoondne ya jaldi audit ke liye.",
    steps: ["/design kholein.", "Upar business likhein → system milega.", "Search mein 'form error' jaisa sawal likhein.", "Audit box mein HTML paste karein."],
    misaal: "Restaurant website ke liye design system aur mobile menu ke UX qawaid dikhao.",
  },
  "tools-board": {
    kya: "Purana Tools board: har brain ka chhota chat board aur 'Sab 1 by 1 test karo'.",
    kab: "Jaldi dekhna ho ke kaun se brains abhi jawab de rahe hain. (Naya: Brains Rooms /brains.)",
    steps: ["/tools kholein.", "Upar sawal likhein.", "'Sab 1 by 1 test karo' dabayein.", "✓/✗ dekhein."],
    misaal: "Salam! Ek line mein batao tum kaun ho?",
  },
  "agent-mode": {
    kya: "Cursor jaisa coding agent — plan banata, files likhta/edit karta, test chalata hai.",
    kab: "Poori website, store ya kai files wala kaam.",
    steps: ["/agent kholein.", "Naya project banayein.", "Kaam saaf likhein (kya, kis ke liye, kaunse pages).", "Live preview dekhein; ghalti ho to Undo."],
    misaal: "Vestire Collection ke liye 3 page ka store banao: home, product list, contact form — WhatsApp button ke sath.",
  },
  "browser-tester": {
    kya: "Page ko chhupe browser mein chala kar har button/link dabata hai aur JavaScript ghaltiyan pakarta hai.",
    kab: "Jab button kaam na kare ya page khali dikhe.",
    steps: ["Skills → Browser Tester.", "HTML paste karein.", "Natija: kitne buttons chale, kaunsi ghaltiyan."],
    misaal: "Is page ka Browser Tester chalao aur 'Add to cart' button ki ghalti batao.",
  },
  playwright: {
    kya: "Asli browser (Edge/Chrome) ko chalata hai: page kholna, click, screenshot.",
    kab: "Jab asli browser mein dekhna ho ke site theek chalti hai.",
    steps: ["Skills → Playwright.", "URL ya HTML dein.", "'Playwright check' dabayein.", "Screenshot aur errors dekhein."],
    misaal: "vestirecollection.com kholo, screenshot lo aur console errors batao.",
  },
  graphify: {
    kya: "Project folder ka naqsha (knowledge graph) banata hai — kaun si file kis se juri hai.",
    kab: "Bara/purana project samajhna ho.",
    steps: ["Skills → Graphify.", "Setup ki commands chalayein (Python).", "graph.html Gallery mein kholein."],
    misaal: "Mere dashboard folder ka graph banao aur sab se ahem 5 files batao.",
  },
  "compound-engineering": {
    kya: "Har kaam ke baad seekh likhne ka tareeqa: brainstorm → plan → work → review → compound.",
    kab: "Jab ek hi qism ka kaam bar bar ho (stores, landing pages).",
    steps: ["Skills → Compound Engineering.", "Project naam + step chunein.", "Note likhein (kya seekha).", "Agli dafa yeh notes kaam aate hain."],
    misaal: "Is store ke kaam ka review note likho: kya achha hua, kya agli dafa pehle karna hai.",
  },
  "21st-mcp": {
    kya: "12,000+ React components ki library — search free, rozana 2 component code free.",
    kab: "Tayyar UI hissa (pricing table, navbar) chahiye ho.",
    steps: ["21st.dev/mcp se free key lein.", "Options → Tool keys mein lagayein.", "Skills → 21st MCP mein search karein."],
    misaal: "Dark luxury pricing table component dhoondo.",
  },
  "agent-team": {
    kya: "Bara kaam 4 roles mein: Designer → Coder → Tester → Reviewer, har role apna free brain.",
    kab: "Poora store ya kai pages, jahan ek agent thak jata hai.",
    steps: ["/agent kholein.", "Upar 'Team' switch on.", "Kaam likhein — board par har role ka kaam dikhega.", "Budget: 3 rounds / 10 calls."],
    misaal: "Team mode: Eswatini Travels ke liye tours page — design, code, test aur review ke sath.",
  },
  memory: {
    kya: "Aap ki pasand aur seekh yaad rakhta hai (isi laptop par) aur chat/agent ko khud batata hai.",
    kab: "Har dafa — khaas kar jab koi pasand bar bar batani pare (Roman Urdu, Vestire rang).",
    steps: ["/memory kholein.", "Nayi yaad likhein (jaise 'Vestire font Playfair').", "Search se dhoondein, ghalat ho to mitayein.", "Export se backup lein."],
    misaal: "Yaad rakho: Vestire ke rang black aur gold hain, font Playfair Display.",
  },
};
