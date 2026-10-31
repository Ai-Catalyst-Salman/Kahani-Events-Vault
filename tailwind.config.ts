import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "royal-plum": "#8C345C",
        "forest-green": "#1E544A",
        "dusty-pink": "#CE9FA6",
        "soft-gold": "#CD9556",
        "deep-ochre": "#C77F2A",
        cream: "#FAF7F2",
        "cream-dark": "#F2EDE5",
      },
      fontFamily: {
        "bona-nova": ["var(--font-bona-nova)", "serif"],
      },
      boxShadow: {
        "glow-ochre": "0 0 20px rgba(199, 127, 42, 0.35), 0 4px 24px rgba(199, 127, 42, 0.15)",
        "glow-plum": "0 0 20px rgba(140, 52, 92, 0.25), 0 4px 16px rgba(140, 52, 92, 0.1)",
        "card": "0 2px 16px rgba(140, 52, 92, 0.08), 0 1px 4px rgba(140, 52, 92, 0.04)",
        "card-hover": "0 8px 40px rgba(140, 52, 92, 0.14), 0 2px 12px rgba(140, 52, 92, 0.08)",
      },
      backgroundImage: {
        "cream-gradient": "linear-gradient(135deg, #FAF7F2 0%, #F5EFE8 50%, #EDE5D8 100%)",
        "plum-gradient": "linear-gradient(135deg, #8C345C 0%, #6B2646 100%)",
        "gold-gradient": "linear-gradient(135deg, #CD9556 0%, #C77F2A 100%)",
      },
      animation: {
        "shimmer": "shimmer 2s linear infinite",
        "fade-up": "fadeUp 0.6s ease-out forwards",
        "pulse-soft": "pulseSoft 3s ease-in-out infinite",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
