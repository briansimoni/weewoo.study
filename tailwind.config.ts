import { type Config } from "tailwindcss";
import daisyui from "daisyui";

export default {
  content: [
    "{routes,islands,components}/**/*.{ts,tsx,js,jsx}",
  ],
  theme: {
    extend: {},
  },
  daisyui: { themes: ["light", "dark"] },
  plugins: [daisyui],
} satisfies Config;
