/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        studio: {
          950: "#090d16",
          900: "#0e1526",
          850: "#141d33",
          800: "#1a2540",
          700: "#26355b",
          600: "#364a7d",
          accent: "#06b6d4",
          "accent-glow": "#22d3ee",
          neon: "#10b981",
        },
      },
    },
  },
  plugins: [],
};
