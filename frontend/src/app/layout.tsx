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
  title: {
    template: "%s | Lumeo CRM",
    default: "Lumeo CRM",
  },
  description: "Premium CRM for leads, deals, customers, tasks, and notes.",
  openGraph: {
    title: "Lumeo CRM",
    description: "Premium CRM for leads, deals, customers, tasks, and notes.",
    type: "website",
  },
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
