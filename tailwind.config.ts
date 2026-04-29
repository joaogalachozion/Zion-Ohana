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
        zion: {
          dark:      "#002624",
          deep:      "#00312B",
          navy:      "#1F2A44",
          mint:      "#C5FFCE",
          "mint-lt": "#E8FFF0",
          cream:     "#FCF8F5",
          orange:    "#FE5000",
          "orange-lt":"#FFF0EB",
          "navy-lt": "#D6E4F0",
        },
      },
    },
  },
  plugins: [],
};
export default config;
