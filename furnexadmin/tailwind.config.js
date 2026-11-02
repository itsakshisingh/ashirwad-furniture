/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: { sans: ["Manrope", "system-ui", "sans-serif"] },
      colors: {
        ink: { 900: "#13251F", 800: "#1B342C", 700: "#264739", 600: "#335A49" },
        brass: { 50: "#FBF6EA", 100: "#F4E7C6", 500: "#B8893B", 600: "#9C7229", 700: "#7D5A20" },
        paper: "#F3F4F1",
      },
    },
  },
  plugins: [],
};
