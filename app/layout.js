import "./globals.css";

export const metadata = {
  title: "Faheem AI Dashboard",
  description: "Free 3D AI assistant with automatic provider fallback",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
