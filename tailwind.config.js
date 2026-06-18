/** @type {import('tailwindcss').Config} */
export default {
  content:[
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#ffffff",
        foreground: "#0f172a",
        primary: {
          DEFAULT: "#2563eb", // Azul bonito
          foreground: "#ffffff",
        },
        card: {
          DEFAULT: "#f8fafc",
          foreground: "#0f172a",
        },
        border: "#e2e8f0",
      }
    },
  },
  plugins:[],
}