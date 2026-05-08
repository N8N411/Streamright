/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/pages/**/*.{js,ts,jsx,tsx}", "./src/components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        "arcium-purple": "#5b3fff",
        "arcium-deep": "#3d1a99",
        "arcium-bg": "#0a0a0a"
      },
      fontFamily: {
        body: ["var(--font-body)", "Inter", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Departure Mono", "VT323", "Major Mono Display", "monospace"]
      },
      boxShadow: {
        "arcium-glow": "0 0 24px rgba(91, 63, 255, 0.5)",
        "arcium-inner": "inset 0 0 24px rgba(91, 63, 255, 0.25)"
      }
    }
  },
  plugins: []
};

