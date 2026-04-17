import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Review Intelligence Bot",
  description:
    "Telegram-first AI review management for independent restaurants. Draft polished responses, track sentiment, and benchmark competitors without a dashboard.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
