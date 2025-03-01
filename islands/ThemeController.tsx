import { useEffect, useState } from "preact/hooks";
import { Moon, Sun } from "../icons/index.ts";

export default function ThemeController() {
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    const storedTheme = localStorage.getItem("theme");
    if (storedTheme) setTheme(storedTheme);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const handleThemeToggle = (e: Event) => {
    const isChecked = (e.target as HTMLInputElement).checked;
    const newTheme = isChecked ? "dark" : "light";
    localStorage.setItem("theme", newTheme);
    setTheme(newTheme);
  };

  return (
    <label className="flex cursor-pointer gap-2">
      <Sun className="w-5 h-5" />
      <input
        onChange={handleThemeToggle}
        type="checkbox"
        className="toggle theme-controller"
        checked={theme === "dark"}
      />
      <Moon className="w-5 h-5" />
    </label>
  );
}
