import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import { Caveat, Fraunces, Newsreader } from "next/font/google";
import "./globals.css";

const newsreader = Newsreader({
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  variable: "--font-newsreader",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  axes: ["opsz"],
  variable: "--font-fraunces",
  display: "swap",
});

const caveat = Caveat({
  subsets: ["latin"],
  weight: "500",
  variable: "--font-hand",
  display: "swap",
});

export const metadata: Metadata = {
  title: "A birthday gift",
  description: "A small birthday gift, wrapped in letters and memories.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#f5eee8",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${newsreader.variable} ${fraunces.variable} ${caveat.variable} h-full antialiased`}>
      <body className="min-h-full">
        <noscript>
          <p className="noscript-note">This letter opens with JavaScript.</p>
        </noscript>
        {children}
      </body>
    </html>
  );
}
