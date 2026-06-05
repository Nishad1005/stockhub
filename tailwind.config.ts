import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          ink:        "#2C1E0F",
          "ink-2":    "#3D2A18",
          accent:     "#C1A77D",
          "accent-2": "#8B6B40",
          "accent-soft": "#EDE3D2",
          cream:      "#F5EEE3",
          mute:       "#8C7659",
          ok:         "#4F7942",
          warn:       "#C77B25",
          bad:        "#B33A3A",
          line:       "#E8DFD0",
        },
      },
      fontFamily: {
        sans: [
          "-apple-system", "BlinkMacSystemFont", "Segoe UI",
          "Roboto", "Helvetica Neue", "Noto Sans Devanagari",
          "Arial", "sans-serif",
        ],
        mono: ["JetBrains Mono", "Menlo", "Monaco", "Consolas", "monospace"],
      },
      borderRadius: { sm: "6px", DEFAULT: "8px", lg: "12px" },
    },
  },
  plugins: [],
} satisfies Config;
