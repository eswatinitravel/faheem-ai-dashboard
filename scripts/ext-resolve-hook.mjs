// v3.29 test helper: lib/* Next bundler ke liye bina ".js" import karti hai (jaise "./config").
// Tests mein Node ko sikhate hain ke na mile to ".js" laga kar dobara dhoonde. Sirf scripts/*-test.mjs istemal karte hain.
export async function resolve(specifier, context, next) {
  try { return await next(specifier, context); } catch (e) {
    if (e?.code === "ERR_MODULE_NOT_FOUND" && /^\.{1,2}\//.test(specifier) && !/\.[cm]?js$/.test(specifier)) return next(specifier + ".js", context);
    throw e;
  }
}
