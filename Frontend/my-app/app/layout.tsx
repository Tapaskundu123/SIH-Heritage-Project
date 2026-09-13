import type { Metadata } from "next";
import { Outfit, Inter } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "KarigarSetu — AI Business Manager for Indian Artisans",
  description:
    "Empowering Indian artisans, weavers, and micro-entrepreneurs to digitize and sell their crafts with AI-powered tools. Multilingual voice cataloging, product studio, dynamic pricing.",
  keywords: [
    "Indian artisans", "handloom", "handicrafts", "AI business manager",
    "voice cataloger", "multilingual", "SIH", "KarigarSetu",
  ],
  openGraph: {
    title: "KarigarSetu — AI Business Manager for Indian Artisans",
    description: "AI-powered platform for Indian craftspeople to go digital",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} ${inter.variable} h-full`}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-[#0c0908] text-[#f5efe6] antialiased">
        {children}
      </body>
    </html>
  );
}
