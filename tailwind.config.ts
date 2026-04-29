import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        graphite: "#20252b",
        steel: "#5f6f7d",
        signal: "#d35400",
        workshop: "#f4f6f8"
      },
      boxShadow: {
        panel: "0 1px 2px rgba(16, 24, 40, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
