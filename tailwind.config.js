
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",        // ✅ ESTE É O ESSENCIAL
    "./components/**/*.{js,ts,jsx,tsx,mdx}", // se aplicável
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",      // opcional
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
