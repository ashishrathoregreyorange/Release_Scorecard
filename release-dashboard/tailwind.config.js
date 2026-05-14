/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        score: {
          go: "#16a34a",
          conditional: "#d97706",
          nogo: "#dc2626",
        },
      },
    },
  },
  plugins: [],
};
