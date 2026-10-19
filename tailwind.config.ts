import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: { extend: { colors: { ink: "#0f172a", mist: "#f8fafc", blue: "#2563eb" } } },
  plugins: []
};

export default config;
