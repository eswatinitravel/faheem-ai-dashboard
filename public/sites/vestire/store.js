(() => {
  const C = window.VESTIRE, ALL = window.PRODUCTS;
  const page = document.body.dataset.cat; // home | men | women | kids
  const rs = (n) => `${C.currency} ${n.toLocaleString("en-PK")}`;
  const $ = (s, r = document) => r.querySelector(s);
  const CART_KEY = "vestire-cart";
  let cart = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
  const save = () => { localStorage.setItem(CART_KEY, JSON.stringify(cart)); drawCart(); };

  // ---------- Header / nav ----------
  const nav = [["men", "Men", "men.html"], ["women", "Women", "women.html"], ["kids", "Juniors", "kids.html"], ["sale", "Sale", "index.html#arrivals"]];
  $("#nav").innerHTML = nav.map(([k, t, h]) => `<a href="${h}" class="${k === page ? "on" : ""}">${t}</a>`).join("");
  document.querySelectorAll(".brandname").forEach((e) => (e.textContent = C.brand));
  const ann = `🚚 Pure Pakistan mein delivery  ·  💵 Cash on Delivery ${rs(C.deliveryCOD)}  ·  💳 Advance payment par FREE delivery  ·  ✨ Imported branded collection  ·  `;
  $("#announce").innerHTML = `<div class="marq"><span>${ann.repeat(3)}</span><span>${ann.repeat(3)}</span></div>`;

  // ---------- Products ----------
  const qs = new URLSearchParams(location.search);
  let brand = qs.get("brand") || "Sab";
  const list = page === "home" ? ALL : ALL.filter((p) => p.cat === page);
  const types = ["Sab", ...new Set(list.map((p) => p.type))];
  let filter = "Sab", sort = "new";
  const bsel = $("#brandsel");
  if (bsel) {
    const bl = ["Sab", ...new Set(list.map((p) => p.brand))];
    if (!bl.includes(brand)) brand = "Sab";
    bsel.innerHTML = `<select id="brand">${bl.map((b) => `<option ${b === brand ? "selected" : ""} value="${b}">${b === "Sab" ? "Sab brands" : b}</option>`).join("")}</select>`;
    $("#brand").onchange = (e) => { brand = e.target.value; drawGrid(); };
  }
  const chips = $("#chips");
  const drawChips = () => (chips.innerHTML = types.map((t) => `<button class="chip ${t === filter ? "on" : ""}" data-t="${t}">${t}</button>`).join(""));
  chips.onclick = (e) => { const t = e.target.dataset.t; if (t) { filter = t; drawChips(); drawGrid(); } };
  $("#sort").onchange = (e) => { sort = e.target.value; drawGrid(); };

  const imgTag = (p, cls = "") =>
    `<img class="${cls} ${p.fit || ""}" src="${p.img}" alt="${p.name}" loading="lazy" style="${p.filter ? `filter:${p.filter}` : ""}">`;

  function drawGrid() {
    let items = list.filter((p) => (filter === "Sab" || p.type === filter) && (brand === "Sab" || p.brand === brand));
    if (sort === "low") items = [...items].sort((a, b) => a.price - b.price);
    if (sort === "high") items = [...items].sort((a, b) => b.price - a.price);
    $("#grid").innerHTML = items.map((p) => `
      <article class="card" data-id="${p.id}">
        <div class="ph">${imgTag(p)}${p.tag ? `<span class="tag ${p.tag === "Sale" ? "sale" : ""}">${p.tag}</span>` : ""}${p.old ? `<span class="off">-${Math.round((1 - p.price / p.old) * 100)}%</span>` : ""}
          <button class="quick" data-open="${p.id}">Jaldi dekhein</button></div>
        <div class="info"><small>${p.brand || ""} · ${p.type}</small><h3>${p.name}</h3>
          <div class="price">${rs(p.price)} ${p.old ? `<s>${rs(p.old)}</s>` : ""}</div></div>
      </article>`).join("");
    tilt();
  }

  // 3D tilt on cards
  function tilt() {
    document.querySelectorAll(".card").forEach((c) => {
      c.onmousemove = (e) => {
        const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        c.style.transform = `perspective(900px) rotateY(${x * 10}deg) rotateX(${-y * 10}deg) translateZ(6px)`;
        c.style.setProperty("--gx", `${(x + 0.5) * 100}%`); c.style.setProperty("--gy", `${(y + 0.5) * 100}%`);
      };
      c.onmouseleave = () => (c.style.transform = "");
      c.onclick = () => openProduct(c.dataset.id);
    });
  }

  // ---------- Product modal ----------
  const modal = $("#modal");
  function openProduct(id) {
    const p = ALL.find((x) => x.id === id); let size = null, qty = 1; modal.dataset.pid = id;
    modal.innerHTML = `<div class="sheet pd">
      <button class="x" data-close>✕</button>
      <div class="pdimg">${imgTag(p)}</div>
      <div class="pdinfo"><small>${p.brand || ""} · ${p.type} · ${p.colors.join(", ")}</small><h2>${p.name}</h2>
        <div class="price big">${rs(p.price)} ${p.old ? `<s>${rs(p.old)}</s>` : ""}</div>
        <div class="row"><b>Size</b><button class="link" id="sizechart">Size chart</button></div>
        <div class="sizes">${p.sizes.map((s) => `<button class="sz" data-s="${s}">${s}</button>`).join("")}</div>
        <div class="row"><b>Tadaad</b><div class="qty"><button data-q="-1">−</button><span id="q">1</span><button data-q="1">+</button></div></div>
        <button class="btn primary" id="add">Cart mein daalein</button>
        <button class="btn wa" id="waask">WhatsApp par poochein</button>
        <ul class="perks"><li>🚚 Delivery ${C.deliveryDays}</li><li>💵 Cash on Delivery ${rs(C.deliveryCOD)}</li><li>🔁 7 din mein exchange (size)</li></ul>
        <p class="note">Demo photo — asli product ki photo jald.</p></div></div>`;
    modal.classList.add("open");
    modal.onclick = (e) => {
      if (e.target === modal || e.target.dataset.close !== undefined) return close();
      if (e.target.dataset.s) { size = e.target.dataset.s; modal.querySelectorAll(".sz").forEach((b) => b.classList.toggle("on", b.dataset.s === size)); }
      if (e.target.dataset.q) { qty = Math.max(1, qty + +e.target.dataset.q); $("#q", modal).textContent = qty; }
      if (e.target.id === "sizechart") sizeChart();
      if (e.target.id === "waask") wa(`Assalam o Alaikum, mujhe "${p.name}" (${rs(p.price)}) ke baare mein poochna hai.`);
      if (e.target.id === "add") {
        if (!size) { toast("Pehle size chunein"); return; }
        const ex = cart.find((c) => c.id === p.id && c.size === size);
        ex ? (ex.qty += qty) : cart.push({ id: p.id, size, qty });
        save(); close(); openCart(); toast("Cart mein add ho gaya ✓");
      }
    };
  }
  const close = () => modal.classList.remove("open");

  function sizeChart() {
    const kids = (ALL.find((x) => x.id === modal.dataset.pid) || {}).cat === "kids";
    const pc = (ALL.find((x) => x.id === modal.dataset.pid) || {}).cat;
    const rows = kids
      ? [["2-3Y", 20, 16], ["4-5Y", 22, 19], ["6-7Y", 24, 22], ["8-9Y", 26, 25], ["10-11Y", 28, 28]]
      : pc === "women"
      ? [["XS", 17, 38], ["S", 18, 39], ["M", 19, 40], ["L", 20, 41], ["XL", 21.5, 42]]
      : [["S", 20, 40], ["M", 21, 41], ["L", 22.5, 42], ["XL", 24, 43], ["XXL", 25.5, 44]];
    const box = document.createElement("div");
    box.className = "modal open"; box.style.zIndex = 60;
    box.innerHTML = `<div class="sheet small"><button class="x">✕</button><h3>Size chart (inch)</h3>
      <table><tr><th>Size</th><th>${kids ? "Seena (½)" : "Seena (½)"}</th><th>Lambai</th></tr>
      ${rows.map((r) => `<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join("")}</table>
      <p class="note">Andaza hai. Shak ho to WhatsApp par poochein.</p></div>`;
    box.onclick = (e) => { if (e.target === box || e.target.classList.contains("x")) box.remove(); };
    document.body.appendChild(box);
  }

  // ---------- Cart drawer ----------
  const drawer = $("#cart");
  const openCart = () => drawer.classList.add("open");
  $("#cartbtn").onclick = openCart;
  function drawCart() {
    const lines = cart.map((c) => ({ ...c, p: ALL.find((p) => p.id === c.id) })).filter((l) => l.p);
    const sub = lines.reduce((s, l) => s + l.p.price * l.qty, 0);
    $("#count").textContent = lines.reduce((s, l) => s + l.qty, 0);
    $("#cartbody").innerHTML = lines.length ? lines.map((l, i) => `
      <div class="line">${imgTag(l.p)}<div><b>${l.p.name}</b><small>Size ${l.size} · ${rs(l.p.price)}</small>
        <div class="qty sm"><button data-i="${i}" data-d="-1">−</button><span>${l.qty}</span><button data-i="${i}" data-d="1">+</button></div></div>
        <button class="rm" data-rm="${i}">✕</button></div>`).join("")
      : `<p class="empty">Cart khali hai. Kuch pasand karein ✨</p>`;
    $("#subtotal").textContent = rs(sub);
    $("#checkout").disabled = !lines.length;
    return { lines, sub };
  }
  drawer.onclick = (e) => {
    if (e.target === drawer || e.target.dataset.closecart !== undefined) drawer.classList.remove("open");
    const i = e.target.dataset.i, rm = e.target.dataset.rm;
    if (i !== undefined) { cart[i].qty = Math.max(1, cart[i].qty + +e.target.dataset.d); save(); }
    if (rm !== undefined) { cart.splice(+rm, 1); save(); }
    if (e.target.id === "checkout") checkout();
  };

  // ---------- Checkout (COD / Advance) ----------
  function checkout() {
    const { lines, sub } = drawCart();
    modal.innerHTML = `<div class="sheet small"><button class="x" data-close>✕</button><h3>Order details</h3>
      <form id="of">
        <input name="name" placeholder="Poora naam" required>
        <input name="phone" placeholder="Mobile number (03xx...)" required pattern="[0-9+ ]{10,14}">
        <input name="city" placeholder="Shehar" required>
        <textarea name="addr" placeholder="Poora pata (gali, mohalla, landmark)" required></textarea>
        <label class="pay"><input type="radio" name="pay" value="COD" checked> Cash on Delivery (+${rs(C.deliveryCOD)})</label>
        <label class="pay"><input type="radio" name="pay" value="Advance"> Advance (Bank / Easypaisa) — FREE delivery</label>
        <div class="tot"><span>Total</span><b id="tot"></b></div>
        <button class="btn primary">Order confirm karein</button>
        <p class="note">Order WhatsApp par confirm hoga.</p>
      </form></div>`;
    modal.classList.add("open");
    const f = $("#of", modal);
    const total = () => sub + (f.pay.value === "COD" || !C.freeShippingAdvance ? C.deliveryCOD : 0);
    const upd = () => ($("#tot", modal).textContent = rs(total()));
    f.onchange = upd; upd();
    modal.onclick = (e) => { if (e.target === modal || e.target.dataset.close !== undefined) close(); };
    f.onsubmit = (e) => {
      e.preventDefault();
      const d = Object.fromEntries(new FormData(f));
      const id = "VC" + Date.now().toString().slice(-6);
      const msg = [`🛍️ Naya order ${id} — ${C.brand}`, ...lines.map((l) => `• ${l.p.name} | Size ${l.size} | x${l.qty} = ${rs(l.p.price * l.qty)}`),
        `Payment: ${d.pay}`, `Total: ${rs(total())}`, `Naam: ${d.name}`, `Phone: ${d.phone}`, `Pata: ${d.addr}, ${d.city}`].join("\n");
      const orders = JSON.parse(localStorage.getItem("vestire-orders") || "[]");
      orders.push({ id, at: new Date().toISOString(), ...d, total: total(), lines: lines.map((l) => ({ id: l.id, size: l.size, qty: l.qty })) });
      localStorage.setItem("vestire-orders", JSON.stringify(orders));
      cart = []; save(); drawer.classList.remove("open");
      modal.innerHTML = `<div class="sheet small center"><div class="ok">✓</div><h3>Shukriya ${d.name}!</h3>
        <p>Aap ka order <b>${id}</b> mil gaya. ${C.whatsapp ? "WhatsApp khul raha hai, wahan Send dabayein." : ""}</p>
        <button class="btn primary" data-close>Shopping jari rakhein</button></div>`;
      if (C.whatsapp) wa(msg);
    };
  }

  function wa(text) {
    if (!C.whatsapp) return toast("WhatsApp number abhi set nahi (config.js)");
    window.open(`https://wa.me/${C.whatsapp}?text=${encodeURIComponent(text)}`, "_blank");
  }
  $("#wafloat").onclick = () => wa(`Assalam o Alaikum ${C.brand}, mujhe order ke baare mein poochna hai.`);

  function toast(t) {
    const el = $("#toast"); el.textContent = t; el.classList.add("show");
    clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove("show"), 2200);
  }

  // ---------- 3D hero parallax + particles ----------
  const hero = $(".hero");
  if (hero) { hero.onmousemove = (e) => {
    const x = e.clientX / innerWidth - 0.5, y = e.clientY / innerHeight - 0.5;
    hero.style.setProperty("--rx", `${-y * 6}deg`); hero.style.setProperty("--ry", `${x * 8}deg`);
  };
  }
  const cv = $("#fx"); if (cv) { const g = cv.getContext("2d"); let pts = [];
  const rsz = () => { cv.width = cv.offsetWidth * devicePixelRatio; cv.height = cv.offsetHeight * devicePixelRatio;
    pts = Array.from({ length: 70 }, () => ({ x: Math.random() * cv.width, y: Math.random() * cv.height, z: Math.random() * 1 + 0.3, v: Math.random() * 0.4 + 0.1 })); };
  rsz(); addEventListener("resize", rsz);
  (function loop() {
    g.clearRect(0, 0, cv.width, cv.height);
    for (const p of pts) { p.y -= p.v * p.z * devicePixelRatio; if (p.y < 0) p.y = cv.height;
      g.fillStyle = `rgba(232,196,120,${0.25 * p.z})`; g.beginPath(); g.arc(p.x, p.y, 1.6 * p.z * devicePixelRatio, 0, 7); g.fill(); }
    requestAnimationFrame(loop);
  })(); }

  // ---------- Home: slider, brands, countdown ----------
  const slides = document.querySelectorAll(".slide");
  if (slides.length) {
    let si = 0; const dots = $("#dots");
    dots.innerHTML = [...slides].map((_, i) => `<button data-i="${i}"></button>`).join("");
    const show = (i) => { si = (i + slides.length) % slides.length; slides.forEach((s, k) => s.classList.toggle("on", k === si)); dots.querySelectorAll("button").forEach((d, k) => d.classList.toggle("on", k === si)); };
    dots.onclick = (e) => { if (e.target.dataset.i) show(+e.target.dataset.i); };
    show(0); setInterval(() => show(si + 1), 5500);
    const sl = $(".slider");
    sl.onmousemove = (e) => { const x = e.clientX / innerWidth - 0.5, y = e.clientY / innerHeight - 0.5;
      sl.style.setProperty("--rx", `${-y * 5}deg`); sl.style.setProperty("--ry", `${x * 7}deg`); };
  }
  const bw = $("#brandwall");
  if (bw) bw.innerHTML = (window.BRANDS || []).map((b) => { const c = (ALL.find((p) => p.brand === b) || { cat: "men" }).cat;
    return `<a href="${c}.html?brand=${encodeURIComponent(b)}" class="bw">${b}</a>`; }).join("");
  document.querySelectorAll(".panel3").forEach((p) => {
    p.onmousemove = (e) => { const r = p.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      p.style.transform = `perspective(1000px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg)`; };
    p.onmouseleave = () => (p.style.transform = "");
  });
  const cd = $("#countdown");
  if (cd) { const end = new Date(C.saleEnds).getTime();
    const tick = () => { let t = Math.max(0, end - Date.now()) / 1000; const d = Math.floor(t / 86400), h = Math.floor(t % 86400 / 3600), m = Math.floor(t % 3600 / 60), s = Math.floor(t % 60);
      cd.innerHTML = [[d, "Din"], [h, "Ghante"], [m, "Minute"], [s, "Second"]].map(([v, l]) => `<div><b>${String(v).padStart(2, "0")}</b><small>${l}</small></div>`).join(""); };
    tick(); setInterval(tick, 1000); }
  const tm = $("#timing"); if (tm) tm.textContent = C.storeTiming;

  $("#year").textContent = new Date().getFullYear();
  drawChips(); drawGrid(); drawCart();
})();
