/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
  theme: {
    extend: {
      backgroundImage: {
        "hero-pattern": "url('/retrocross.svg')",
      },

      boxShadow: {
        hard: "0.5rem 0.5rem 0 #E32262",
      },
    },
  },
  plugins: [],
};
