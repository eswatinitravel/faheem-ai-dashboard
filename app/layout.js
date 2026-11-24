import "./globals.css";
import AgentationDock from "./components/AgentationDock";
import ThinkingBar from "./components/ThinkingBar";
import { THEME_BOOT } from "../lib/prefs";

export const metadata = {
  title: "Faheem AI Dashboard",
  description: "Free 3D AI assistant with automatic provider fallback",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme="neon-blue" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} /></head>
      <body><ThinkingBar />{children}<AgentationDock /></body>
    </html>
  );
}
