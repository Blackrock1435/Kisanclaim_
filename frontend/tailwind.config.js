/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        forest: { DEFAULT: "#14532D", deep: "#0B3D2E", mid: "#2E7D52" },
        navy: "#14243A",
        canvas: "#F6F8F4",
        sage: { 50: "#F1F5EF", 100: "#E4ECE0", 200: "#CFDDC9", 400: "#8FAE8A" },
        gold: { DEFAULT: "#D6A84F", dark: "#8A6A1F" },
        muted: "#64748B",
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', "system-ui", "sans-serif"],
        sans: ['"Public Sans"', "system-ui", "sans-serif"],
      },
      boxShadow: { soft: "0 1px 2px rgba(20,36,58,.06), 0 8px 24px -12px rgba(20,36,58,.18)" },
    },
  },
  plugins: [],
};
