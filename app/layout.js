import "./globals.css";
import AgentationDock from "./components/AgentationDock";
import ThinkingBar from "./components/ThinkingBar";

export const metadata = {
  title: "Faheem AI Dashboard",
  description: "Free 3D AI assistant with automatic provider fallback",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body><ThinkingBar />{children}<AgentationDock /></body>
    </html>
  );
}
