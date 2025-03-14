import { useEffect, useState } from "preact/hooks";
import { Moon, Sun } from "../icons/index.ts";

export default function ThemeController(
  { initial_theme }: { initial_theme?: string },
) {
  const [theme, setTheme] = useState(initial_theme);

  useEffect(() => {
    if (theme) {
      document.documentElement.setAttribute("data-theme", theme);
    }
  }, [theme]);

  const handleThemeToggle = async (e: Event) => {
    const isChecked = (e.target as HTMLInputElement).checked;
    const newTheme = isChecked ? "dark" : "light";
    setTheme(newTheme);
    await fetch("/api/preferences", {
      method: "POST",
      body: JSON.stringify({ theme: newTheme }),
    });
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
