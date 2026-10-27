// ===== Vestire Collection — store settings (yahan apni details badlein) =====
window.VESTIRE = {
  brand: "Vestire Collection",
  // WhatsApp number international format, bina + ke. Misal: 923001234567
  whatsapp: "",
  city: "Gujrat, Punjab",
  currency: "Rs",
  deliveryCOD: 250,          // Cash on Delivery charge
  freeShippingAdvance: true, // advance payment par free delivery
  deliveryDays: "3-5 working days",
  saleEnds: "2026-11-30T23:59:00+05:00", // countdown banner ki aakhri tareekh
  storeTiming: "Har din 11 AM se 11 PM",
};

// Brands jo "Shop by brand" mein dikhte hain (naya brand yahan add karein)
window.BRANDS = ["Nike", "Adidas", "Puma", "Louis Vuitton", "Gucci", "Zara", "Polo Ralph Lauren", "The North Face", "Levi's", "H&M"];

// ===== Products (demo). Asli photos aane par img, naam aur price badal dein =====
// Note: brand ka naam sirf asli / authorized imported maal par likhein.
window.PRODUCTS = [
  // ---- MEN ----
  { id: "m1", cat: "men", brand: "The North Face", name: "Double-Side Puffer Jacket", type: "Jackets", price: 7499, old: 10999, img: "img/p-puffer.jpg", tag: "New", sizes: ["M","L","XL","2XL"], colors: ["Black"] },
  { id: "m2", cat: "men", brand: "Adidas", name: "Classic 3-Stripe Tracksuit", type: "Tracksuits", price: 4999, old: 6999, img: "img/p-tracksuit.jpg", tag: "Sale", sizes: ["M","L","XL","2XL"], colors: ["Navy/White"] },
  { id: "m3", cat: "men", brand: "Nike", name: "Oversized Fleece Hoodie", type: "Hoodies", price: 3999, old: 5499, img: "img/p-hoodie.jpg", tag: "Best Seller", sizes: ["S","M","L","XL"], colors: ["Heather Grey"] },
  { id: "m4", cat: "men", brand: "Nike", name: "Air Runner Chunky Sneakers", type: "Sneakers", price: 8999, old: 11999, img: "img/p-sneakers.jpg", tag: "New", sizes: ["40","41","42","43","44"], colors: ["White/Grey"] },
  { id: "m5", cat: "men", brand: "Polo Ralph Lauren", name: "Slim Polo + Denim Combo", type: "Polos", price: 4499, img: "img/p-polo.jpg", sizes: ["S","M","L","XL"], colors: ["White/Blue"] },
  { id: "m6", cat: "men", brand: "Levi's", name: "Winter Street Look Set", type: "Jackets", price: 9999, old: 13999, img: "img/panel-men.jpg", fit: "cover-top", tag: "Sale", sizes: ["M","L","XL"], colors: ["Black"] },
  // ---- WOMEN ----
  { id: "w1", cat: "women", brand: "Louis Vuitton", name: "Leather Tote Handbag", type: "Bags", price: 14999, old: 18999, img: "img/p-bag.jpg", tag: "New", sizes: ["One Size"], colors: ["Tan"] },
  { id: "w2", cat: "women", brand: "Zara", name: "Cropped Biker Jacket", type: "Jackets", price: 6499, old: 8999, img: "img/p-wjacket.jpg", tag: "Sale", sizes: ["XS","S","M","L"], colors: ["Black"] },
  { id: "w3", cat: "women", brand: "Gucci", name: "Camel Wool Long Coat", type: "Coats", price: 12999, old: 16999, img: "img/panel-women.jpg", fit: "cover-top", tag: "Best Seller", sizes: ["S","M","L"], colors: ["Camel"] },
  { id: "w4", cat: "women", brand: "Adidas", name: "Women Oversized Hoodie", type: "Hoodies", price: 3799, img: "img/p-hoodie.jpg", sizes: ["XS","S","M","L"], colors: ["Grey"] },
  // ---- KIDS ----
  { id: "k1", cat: "kids", brand: "Puma", name: "Striped Hoodie + Jogger Set", type: "Tracksuits", price: 2999, old: 3999, img: "img/p-kids.jpg", tag: "New", sizes: ["2-3Y","4-5Y","6-7Y","8-9Y","10-12Y"], colors: ["Red/Grey"] },
  { id: "k2", cat: "kids", brand: "Nike", name: "Colour-Block Tracksuit", type: "Tracksuits", price: 3499, old: 4499, img: "img/panel-kids.jpg", fit: "cover-center", tag: "Sale", sizes: ["4-5Y","6-7Y","8-9Y","10-12Y"], colors: ["Blue/Yellow"] },
  { id: "k3", cat: "kids", brand: "Adidas", name: "Kids Running Sneakers", type: "Sneakers", price: 4499, img: "img/p-sneakers.jpg", tag: "Best Seller", sizes: ["28","30","32","34"], colors: ["White"] },
];
