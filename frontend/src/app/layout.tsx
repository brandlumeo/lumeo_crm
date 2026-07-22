import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";

import { Providers } from "@/components/providers";
import { ErrorBoundary } from "@/components/error-boundary";

import "./globals.css";

const serif = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});

const sans = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const mono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.lumeo.estgrp.in"),
  title: "Lumeo CRM - AI-Powered CRM for Small Businesses & Startups",
  description: "Lumeo CRM automates lead follow-ups, prioritizes deals with AI, and keeps your pipeline updated. Try it free for 14 days.",
  keywords: ["CRM software", "AI CRM", "small business CRM", "sales automation", "lead management"],
  alternates: {
    canonical: "/",
  },
  verification: {
    google: "4BJ_RrzvBej9t5cPyOkvxYCQHcGE1xLNWboh_O6SepU",
  },
  openGraph: {
    title: "Lumeo CRM - AI-Powered CRM for Small Businesses",
    description: "Automate follow-ups, prioritize leads, and close deals faster with AI. Free 14-day trial.",
    url: "https://www.lumeo.estgrp.in",
    siteName: "Lumeo CRM",
    images: [{ url: "https://www.lumeo.estgrp.in/og-image.png", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Lumeo CRM - AI-Powered CRM",
    description: "AI-powered CRM that automates follow-ups for small businesses and startups.",
    images: ["https://www.lumeo.estgrp.in/og-image.png"],
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const color = localStorage.getItem("theme_color") || "orange";
                const size = localStorage.getItem("theme_font_size") || "medium";
                const dark = localStorage.getItem("theme_dark");
                
                if (dark === "true") document.documentElement.classList.add("dark");
                else if (dark === "false") document.documentElement.classList.remove("dark");
                
                const fontMap = { small: "13px", medium: "14px", large: "16px" };
                document.documentElement.style.fontSize = fontMap[size] || "14px";
                
                const colors = {
                  orange: "255 91 31",
                  blue: "42 78 140",
                  violet: "124 58 237",
                  emerald: "5 150 105",
                  rose: "225 29 72",
                  amber: "217 119 6"
                };
                const softColors = {
                  orange: "255 230 217",
                  blue: "216 226 242",
                  violet: "237 224 255",
                  emerald: "209 250 229",
                  rose: "255 228 230",
                  amber: "254 243 199"
                };
                
                if (colors[color]) {
                  document.documentElement.style.setProperty("--color-accent", colors[color]);
                  document.documentElement.style.setProperty("--color-accent-soft", softColors[color]);
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body>
        {/* H18 fix: ErrorBoundary catches any unhandled render error — prevents blank white screen */}
        <ErrorBoundary>
          <Providers>{children}</Providers>
        </ErrorBoundary>
      </body>
    </html>
  );
}
