// v3.43 Phone se Jarvis Live: wahi /api/jarvis/live, magar phone key (Bearer) ke saath (proxy.js check karta hai).
// Phone ko bhi asal Gemini key nahi milti, sirf 1 session ka ephemeral token.
import { GET as baseGet, POST as basePost } from "../../jarvis/live/route.js";
import { notePhoneSeen } from "../../../../lib/phone.js";
export const dynamic = "force-dynamic";
export const maxDuration = 180;
export async function GET(req) { return baseGet(req); }
export async function POST(req) { try { notePhoneSeen(req.headers.get("user-agent")); } catch {} return basePost(req); }
