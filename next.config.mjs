import path from "path";
import { fileURLToPath } from "url";

const root = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
// v3.17.3: Next.js build ka "Upgrade / coding agent" sawal hamesha ke liye band (build kabhi nahi rukega).
const nextConfig = { turbopack: { root }, experimental: { agentUpgrade: false } };
export default nextConfig;
