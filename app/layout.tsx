import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Vibe2Verse — AI 3D Rap Character",
  description:
    "Describe someone's personality and watch an animated 3D character perform a personalized AI-generated rap song with real music and vocals.",
  keywords: ["AI rap", "3D character", "music generation", "personalized song"],
  openGraph: {
    title: "Vibe2Verse — AI 3D Rap Character",
    description: "Your personality, your rap, your vibe.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f8fafc",
};

export default function RootLayout({
  children,
}: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="h-full bg-[#f8fafc] text-slate-900 antialiased selection:bg-purple-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
