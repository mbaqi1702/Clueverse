import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ClueVerse | Daily anime puzzle",
  description: "Read the synopsis, follow the clues, and name today's anime.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
