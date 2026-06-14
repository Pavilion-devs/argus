import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        geist: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      // Argus dashboard palette.
      // the marketing pages use (just named), extended with threat-severity colors.
      colors: {
        ink: "#030303",
        surface: {
          DEFAULT: "#131315",
          50: "#1e1e22",
          100: "#18181b",
          200: "#1e1e22",
          300: "#27272a",
        },
        line: {
          DEFAULT: "#27272a",
          strong: "#3f3f46",
        },
        primary: {
          DEFAULT: "#2563eb",
          deep: "#172554",
          bright: "#60a5fa",
          50: "#eff6ff",
          600: "#2563eb",
          700: "#1d4ed8",
        },
        threat: {
          critical: "#ef4444",
          high: "#f97316",
          medium: "#f59e0b",
          low: "#eab308",
          info: "#3f3f46",
        },
        confirm: "#10b981",
        refute: "#ef4444",
      },
      boxShadow: {
        glow: "0 0 24px rgba(37,99,235,0.25)",
        "glow-sm": "0 0 12px rgba(37,99,235,0.4)",
        "glow-strong": "0 0 40px rgba(37,99,235,0.45)",
        "glow-white": "0 0 24px rgba(255,255,255,0.10)",
        card: "0 20px 40px rgba(0,0,0,0.3)",
        "threat-glow": "0 0 24px rgba(239,68,68,0.25)",
      },
      backgroundImage: {
        "blue-orb": "linear-gradient(135deg, #172554 0%, #2563eb 50%, #60a5fa 100%)",
        "card-sheen": "linear-gradient(135deg, #18181b 0%, #131315 50%, #18181b 100%)",
        "grid-faint":
          "linear-gradient(to right, rgba(63,63,70,0.18) 1px, transparent 1px), linear-gradient(to bottom, rgba(63,63,70,0.18) 1px, transparent 1px)",
      },
      keyframes: {
        slowPulse: {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.6", transform: "scale(0.9)" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.45" },
        },
        "caret-blink": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
        drift: {
          "0%": { transform: "translate(0,0) scale(1)" },
          "50%": { transform: "translate(2%, -3%) scale(1.05)" },
          "100%": { transform: "translate(0,0) scale(1)" },
        },
        "spin-slow": {
          to: { transform: "rotate(360deg)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "slow-pulse": "slowPulse 3s ease-in-out infinite",
        "fade-up": "fade-up 0.5s ease-out both",
        "pulse-glow": "pulse-glow 1.8s ease-in-out infinite",
        "caret-blink": "caret-blink 1s step-end infinite",
        drift: "drift 18s ease-in-out infinite",
        "spin-slow": "spin-slow 8s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
