// ===== Vestire Collection — store settings (yahan apni details badlein) =====
window.VESTIRE = {
  brand: "Vestire Collection",
  // WhatsApp number international format, bina + ke. Misal: 923001234567
  whatsapp: "",
  city: "Gujrat, Punjab",
  currency: "Rs",
  deliveryCOD: 250,        // Cash on Delivery charge
  freeShippingAdvance: true, // advance payment par free delivery
  deliveryDays: "3-5 working days",
};

// ===== Products (demo). Asli photos aane par img aur price badal dein =====
// filter = demo rang (CSS hue). Asli product par filter hata dein.
window.PRODUCTS = [
  // ---- MEN ----
  { id: "m1", cat: "men", name: "Royal Ivory Waistcoat Suit", type: "Festive", price: 8990, old: 10990, img: "img/men-hero.jpg", fit: "cover-top", tag: "New", sizes: ["S","M","L","XL","XXL"], colors: ["Ivory/Black"] },
  { id: "m2", cat: "men", name: "Navy Wash & Wear Kameez Shalwar", type: "Wash & Wear", price: 3490, img: "img/men-product.jpg", tag: "Best Seller", sizes: ["S","M","L","XL","XXL"], colors: ["Navy"] },
  { id: "m3", cat: "men", name: "Maroon Kurta, White Shalwar", type: "Festive", price: 4290, old: 4990, img: "img/men-p2.jpg", tag: "Sale", sizes: ["M","L","XL","XXL"], colors: ["Maroon/White"] },
  { id: "m4", cat: "men", name: "Olive Everyday Kameez Shalwar", type: "Cotton", price: 3290, img: "img/men-p3.jpg", sizes: ["S","M","L","XL"], colors: ["Olive"] },
  { id: "m5", cat: "men", name: "Charcoal Classic Kameez Shalwar", type: "Wash & Wear", price: 3490, img: "img/men-product.jpg", filter: "grayscale(1) brightness(.8)", sizes: ["M","L","XL"], colors: ["Charcoal"] },
  // ---- WOMEN ----
  { id: "w1", cat: "women", name: "Emerald Embroidered 3-Piece", type: "Luxury Pret", price: 12490, old: 14990, img: "img/women-hero.jpg", fit: "cover-top", tag: "New", sizes: ["XS","S","M","L","XL"], colors: ["Emerald"] },
  { id: "w2", cat: "women", name: "Peach Printed Lawn 3-Piece", type: "Lawn", price: 4590, img: "img/women-product.jpg", tag: "Best Seller", sizes: ["XS","S","M","L","XL"], colors: ["Peach"] },
  { id: "w3", cat: "women", name: "Lilac Chiffon 3-Piece", type: "Pret", price: 5290, old: 5990, img: "img/women-p2.jpg", tag: "Sale", sizes: ["XS","S","M","L"], colors: ["Lilac"] },
  { id: "w4", cat: "women", name: "Mint Printed Lawn Suit", type: "Lawn", price: 4390, img: "img/women-p3.jpg", sizes: ["S","M","L","XL"], colors: ["Mint"] },
  // ---- KIDS ----
  { id: "k1", cat: "kids", name: "Eid Sibling Set (Boy + Girl)", type: "Festive", price: 6990, old: 7990, img: "img/kids-hero.jpg", fit: "cover-center", tag: "New", sizes: ["2-3Y","4-5Y","6-7Y","8-9Y"], colors: ["Maroon/Pink"] },
  { id: "k2", cat: "kids", name: "Sky Blue Boys Kurta Shalwar", type: "Cotton", price: 2190, img: "img/kids-product.jpg", tag: "Best Seller", sizes: ["2-3Y","4-5Y","6-7Y","8-9Y","10-11Y"], colors: ["Sky Blue"] },
  { id: "k3", cat: "kids", name: "Girls Embroidered Frock Set", type: "Festive", price: 3290, old: 3690, img: "img/kids-p2.jpg", tag: "Sale", sizes: ["2-3Y","4-5Y","6-7Y","8-9Y"], colors: ["Yellow/Pink"] },
  { id: "k4", cat: "kids", name: "Boys Kurta with Mustard Waistcoat", type: "Festive", price: 3490, img: "img/kids-p3.jpg", sizes: ["4-5Y","6-7Y","8-9Y","10-11Y"], colors: ["White/Mustard"] },
];
