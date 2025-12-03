import typography from "@tailwindcss/typography";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        easy: "#16a34a",
        medium: "#f59e0b",
        hard: "#ef4444"
      }
    }
  },
  plugins: [typography]
};
