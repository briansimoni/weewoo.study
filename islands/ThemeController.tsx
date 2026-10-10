import { useEffect, useState } from "preact/hooks";
import { Moon, Sun } from "lucide-preact";
import { THEME_COLOR, themeName, type ThemePreference } from "../lib/theme.ts";

export default function ThemeController(
  { initial_theme }: { initial_theme?: ThemePreference },
) {
  const [preference, setPreference] = useState(initial_theme);
  const dark = preference !== "light";

  useEffect(() => {
    if (!preference) return;
    const theme = themeName(preference);
    document.documentElement.setAttribute("data-theme", theme);
    document.querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", THEME_COLOR[theme]);
  }, [preference]);

  const handleThemeToggle = async (e: Event) => {
    const isChecked = (e.target as HTMLInputElement).checked;
    const newPreference: ThemePreference = isChecked ? "dark" : "light";
    setPreference(newPreference);
    await fetch("/api/preferences", {
      method: "POST",
      body: JSON.stringify({ theme: newPreference }),
    });
  };

  return (
    <label className="flex cursor-pointer gap-2">
      <Sun className="w-5 h-5" />
      <input
        onChange={handleThemeToggle}
        type="checkbox"
        className="toggle"
        checked={dark}
        aria-label="Dark mode"
      />
      <Moon className="w-5 h-5" />
    </label>
  );
}
