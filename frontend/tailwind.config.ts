import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bone: "rgb(var(--color-bone) / <alpha-value>)",
        "bone-2": "rgb(var(--color-bone-2) / <alpha-value>)",
        paper: "rgb(var(--color-paper) / <alpha-value>)",
        ink: "rgb(var(--color-ink) / <alpha-value>)",
        "ink-2": "rgb(var(--color-ink-2) / <alpha-value>)",
        muted: "rgb(var(--color-muted) / <alpha-value>)",
        line: "rgb(var(--color-line) / <alpha-value>)",
        "line-2": "rgb(var(--color-line-2) / <alpha-value>)",
        accent: "rgb(var(--color-accent) / <alpha-value>)",
        "accent-soft": "rgb(var(--color-accent-soft) / <alpha-value>)",
        green: "rgb(var(--color-green) / <alpha-value>)",
        "green-soft": "rgb(var(--color-green-soft) / <alpha-value>)",
        gold: "rgb(var(--color-gold) / <alpha-value>)",
        "gold-soft": "rgb(var(--color-gold-soft) / <alpha-value>)",
        blue: "rgb(var(--color-blue) / <alpha-value>)",
        "blue-soft": "rgb(var(--color-blue-soft) / <alpha-value>)",
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      borderRadius: {
        DEFAULT: "8px",
        lg: "8px",
      },
      keyframes: {
        rise: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideInRight: {
          "0%": { opacity: "0", transform: "translateX(100%)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
      },
      animation: {
        rise: "rise 0.5s cubic-bezier(.2,.7,.2,1) both",
        "slide-in-right": "slideInRight 0.3s cubic-bezier(.2,.7,.2,1) both",
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};

export default config;
