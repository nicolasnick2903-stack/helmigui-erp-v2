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
        verde: {
          DEFAULT: "#1a5c40",
          dark:    "#0d3d2a",
          light:   "#2a7a56",
        },
        ouro: {
          DEFAULT: "#c8a84b",
          light:   "#d9bb6a",
          dark:    "#a8882e",
        },
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
      keyframes: {
        scan: {
          '0%, 100%': { top: '10%' },
          '50%':      { top: '90%' },
        },
      },
      animation: {
        scan: 'scan 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
export default config;
