// Gallery se aayi files ko chat ke liye tayyar karein.
const TEXT_EXT = /\.(txt|md|csv|json|html?|css|js|jsx|ts|tsx|py|xml|yml|yaml|log|ini|sql|bat|ps1)$/i;

function resizeImage(file, max = 1280) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const s = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve({ dataUrl: c.toDataURL("image/jpeg", 0.82), width: c.width, height: c.height });
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Picture khul nahi saki")); };
    img.src = url;
  });
}

function videoInfo(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => resolve({ url, duration: v.duration, width: v.videoWidth, height: v.videoHeight });
    v.onerror = () => resolve({ url });
    v.src = url;
  });
}

export async function prepareFiles(fileList) {
  const out = [];
  for (const f of Array.from(fileList || []).slice(0, 6)) {
    const base = { name: f.name, size: f.size, type: f.type };
    try {
      if (f.type.startsWith("image/")) out.push({ kind: "image", ...base, ...(await resizeImage(f)) });
      else if (f.type.startsWith("video/")) out.push({ kind: "video", ...base, ...(await videoInfo(f)) });
      else if (f.type.startsWith("text/") || TEXT_EXT.test(f.name)) {
        if (f.size > 2_000_000) out.push({ kind: "file", ...base });
        else out.push({ kind: "text", ...base, text: await f.text() });
      } else out.push({ kind: "file", ...base });
    } catch { out.push({ kind: "file", ...base }); }
  }
  return out;
}

// Server ko kya bhejna hai (video ka link nahi, sirf maloomat).
export function forServer(a) {
  const { url, ...rest } = a;
  return rest;
}

// localStorage mein save karne ke liye halka version.
export function forStorage(a, keepImage) {
  const { url, text, ...rest } = a;
  if (a.kind === "image" && !keepImage) delete rest.dataUrl;
  if (a.kind === "text") rest.text = (text || "").slice(0, 4000);
  return rest;
}
