// v3.27 Haath ke ishare (MediaPipe Hands ke 21 nuqte -> gesture). Apna saada code, koi library nahi.
// Nuqte: 0 kalai, 4 angootha, 8 shahadat ki ungli, 12 beech, 16 ring, 20 chhoti. x,y 0..1 (camera image).
const d = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

export function palmSize(lm) { return Math.max(1e-6, d(lm[0], lm[9])); }
export function fingerUp(lm, tip, pip) { return d(lm[0], lm[tip]) > d(lm[0], lm[pip]) * 1.12; }
export function fingersUp(lm) { return [[8, 6], [12, 10], [16, 14], [20, 18]].filter(([t, p]) => fingerUp(lm, t, p)).length; }
export function isOpenPalm(lm) { return fingersUp(lm) === 4 && d(lm[4], lm[5]) > palmSize(lm) * 0.45; }
export function pinchRatio(lm) { return d(lm[4], lm[8]) / palmSize(lm); }
export function palmCenter(lm) {
  const ids = [0, 5, 9, 13, 17];
  return { x: ids.reduce((s, i) => s + lm[i].x, 0) / 5, y: ids.reduce((s, i) => s + lm[i].y, 0) / 5 };
}

// Tracker: har frame par update(landmarks, ms) -> { events: ["palm"|"swipe-left"|"swipe-right"|"pinch"], cursor }
// Camera ki tasveer ulti (mirror) hoti hai, is liye x = 1 - x: aap haath daayen le jayein to "swipe-right".
export function createGestureTracker(opt = {}) {
  const o = { swipeDx: 0.22, swipeMs: 450, swipeMaxDy: 0.16, holdMs: 700, holdStill: 0.05, pinchIn: 0.3, pinchOut: 0.45, cooldownMs: 900, palmCooldownMs: 2200, ...opt };
  let hist = [], pinching = false, lastEvent = -Infinity, lastPalm = -Infinity, holdStart = 0, palmArmed = true;
  return {
    reset() { hist = []; pinching = false; holdStart = 0; },
    update(lm, t) {
      const events = [];
      if (!lm || lm.length < 21) { hist = []; holdStart = 0; pinching = false; palmArmed = true; return { events, cursor: null }; }
      const c = palmCenter(lm), mx = 1 - c.x;
      const cursor = { x: 1 - lm[8].x, y: lm[8].y };
      hist.push({ x: mx, y: c.y, t });
      hist = hist.filter((h) => t - h.t <= Math.max(o.swipeMs, o.holdMs));
      const pr = pinchRatio(lm);
      const open = isOpenPalm(lm) && pr > o.pinchOut, up = fingersUp(lm);
      // Swipe: tez seedhi harkat, kam az kam 3 ungliyan khuli
      const win = hist.filter((h) => t - h.t <= o.swipeMs);
      if (win.length >= 3 && up >= 3 && t - lastEvent > o.cooldownMs) {
        const dx = mx - win[0].x, dy = Math.abs(c.y - win[0].y);
        if (Math.abs(dx) >= o.swipeDx && dy <= o.swipeMaxDy) { events.push(dx > 0 ? "swipe-right" : "swipe-left"); lastEvent = t; hist = []; holdStart = 0; }
      }
      // Khula haath ruka hua (~0.7s) = sunna shuru / band
      if (open && !events.length) {
        const still = hist.filter((h) => t - h.t <= o.holdMs);
        const span = still.length ? Math.max(...still.map((h) => Math.hypot(h.x - mx, h.y - c.y))) : 1;
        if (span <= o.holdStill) { if (!holdStart) holdStart = t; } else holdStart = 0;
        if (palmArmed && holdStart && t - holdStart >= o.holdMs && t - lastPalm > o.palmCooldownMs && t - lastEvent > o.cooldownMs) { events.push("palm"); lastPalm = t; lastEvent = t; palmArmed = false; holdStart = 0; }
      } else if (!open) { holdStart = 0; palmArmed = true; }
      // Pinch (angootha + shahadat ki ungli milein) = select / click
      if (!pinching && pr < o.pinchIn) { pinching = true; if (t - lastEvent > 500) { events.push("pinch"); lastEvent = t; } }
      else if (pinching && pr > o.pinchOut) pinching = false;
      return { events, cursor, pinching, open, fingers: up };
    },
  };
}

// Test / demo ke liye nakli haath: khula (open) ya mutthi (fist), center (cx, cy), size s.
export function fakeHand({ cx = 0.5, cy = 0.5, s = 0.2, open = true, pinch = false } = {}) {
  const P = (x, y) => ({ x: cx + x * s, y: cy + y * s, z: 0 });
  const lm = new Array(21).fill(null).map(() => P(0, 0));
  lm[0] = P(0, 0.9);
  const bases = [[-0.35, 0], [-0.12, -0.05], [0.1, -0.05], [0.3, 0]]; // index, middle, ring, pinky MCP
  [[5, 6, 7, 8], [9, 10, 11, 12], [13, 14, 15, 16], [17, 18, 19, 20]].forEach((ids, k) => {
    const [bx, by] = bases[k];
    lm[ids[0]] = P(bx, by);
    if (open) { lm[ids[1]] = P(bx, by - 0.35); lm[ids[2]] = P(bx, by - 0.6); lm[ids[3]] = P(bx, by - 0.85); }
    else { lm[ids[1]] = P(bx, by - 0.25); lm[ids[2]] = P(bx, by - 0.05); lm[ids[3]] = P(bx, by + 0.15); }
  });
  lm[1] = P(-0.45, 0.6); lm[2] = P(-0.65, 0.4); lm[3] = P(-0.8, 0.2); lm[4] = open ? P(-0.95, 0.05) : P(-0.3, 0.2);
  if (pinch) lm[4] = { ...lm[8], x: lm[8].x + 0.01 * s };
  return lm;
}
