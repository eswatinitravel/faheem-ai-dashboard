// v3.14 Meta page: Meta AI (Muse Image) se tasveer edit.
// FREE: meta.ai website/app par (apne Meta/Facebook account se login). PAID: Meta Model API $0.01/tasveer.
export const META_SITE = "https://www.meta.ai";
export const META_API = { base: "https://api.meta.ai/v1", path: "/images/edits", model: "muse-image-1.0", pricePerImage: 0.01 };

// Tayyar prompts (Roman Urdu + English). Meta AI dono samajhta hai; English zyada pakka.
export const META_TEMPLATES = [
  { id: "bg", title: "Background badlein", ur: "Is tasveer ka background badal kar saaf studio jaisa halka grey kar do, cheez waisi hi rahe.", en: "Replace the background with a clean light-grey studio backdrop. Keep the subject exactly the same, natural soft shadow." },
  { id: "white", title: "Product photo — saaf safed", ur: "Product ko bilkul safed (#FFFFFF) background par rakho, e-commerce jaisi saaf roshni, halka saya.", en: "Place the product on a pure white (#FFFFFF) background, e-commerce style even lighting, subtle shadow under it, sharp edges, no other objects." },
  { id: "remove", title: "Cheez hatayein", ur: "Tasveer se [CHEEZ KA NAAM] hata do aur jagah ko asli background se bhar do.", en: "Remove the [OBJECT] from the photo and fill the area naturally so it matches the surrounding background." },
  { id: "restyle", title: "Style badlein", ur: "Is tasveer ko [STYLE: watercolor / 3D / cinematic] style mein bana do, shakal wahi rahe.", en: "Restyle this image as [STYLE: watercolor / 3D render / cinematic film still] while keeping the composition and subject recognizable." },
  { id: "vestire", title: "Vestire banner", ur: "Is product se Vestire Collection ke liye luxury fashion banner banao: gehra background, sunehri roshni, upar 'VESTIRE COLLECTION' likha ho.", en: "Turn this product photo into a luxury fashion web banner for 'Vestire Collection': dark elegant backdrop, warm golden rim light, wide 16:9 layout with empty space on the left for text, the words 'VESTIRE COLLECTION' in a refined serif font." },
];

export const META_STEPS = [
  "Tasveer chunein (upload, drag-drop ya Gallery se).",
  "Neeche se prompt chun kar 'Copy' dabayein (ya apna likhein).",
  "'Tasveer copy karein' dabayein, phir 'Meta AI mein kholo' — alag Edge window khulegi.",
  "Meta AI mein apne Facebook/Meta account se login karein (sirf pehli dafa).",
  "Chat box mein Ctrl+V se tasveer chipkayein (ya + se upload), phir prompt paste karke bhejein.",
  "Nayi tasveer par right-click > Save image, phir yahan 'Natija ki tasveer chunein' se daal kar Gallery mein save karein.",
];

// Paid API sirf tab: key lagi ho + user ne switch on kiya + confirm tick. (Default band.)
export function paidAllowed({ keySet, paidOn, confirm }) {
  return !!(keySet && paidOn === true && confirm === true);
}
