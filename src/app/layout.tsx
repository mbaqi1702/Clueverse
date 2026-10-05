import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ClueVerse — One clue closer",
  description: "A fresh anime mystery to solve every day.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
