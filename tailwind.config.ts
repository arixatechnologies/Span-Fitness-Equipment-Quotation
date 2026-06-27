import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#24323A",
        navy: "#3F5F70",
        gold: "#E4D8DC",
        wine: "#7C5862",
        line: "#C9CCD5",
        panel: "#FFF7F7",
        mist: "#93B5C6",
        cloud: "#C9CCD5",
        blush: "#E4D8DC",
        rose: "#FFE3E3"
      },
      boxShadow: {
        soft: "0 14px 34px rgba(147, 181, 198, 0.18)"
      }
    }
  },
  plugins: []
};

export default config;
