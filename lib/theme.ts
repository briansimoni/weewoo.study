/** A visitor's saved choice from the theme toggle; unset means the default. */
export type ThemePreference = "light" | "dark";

/** DaisyUI theme names, defined in static/styles.css. */
export const THEMES = { dark: "nightshift", light: "dayshift" } as const;

export type ThemeName = (typeof THEMES)[ThemePreference];

/** Night Shift unless the visitor chose light. */
export function themeName(preference?: ThemePreference): ThemeName {
  return preference === "light" ? THEMES.light : THEMES.dark;
}

/** Browser chrome color (`<meta name="theme-color">`) per theme. */
export const THEME_COLOR: Record<ThemeName, string> = {
  nightshift: "#0e1726",
  dayshift: "#e9edf3",
};
