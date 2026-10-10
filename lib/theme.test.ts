import { assertEquals } from "@std/assert";
import { THEME_COLOR, themeName } from "./theme.ts";

Deno.test("themeName defaults to Night Shift and maps light to Day Shift", () => {
  assertEquals(themeName(), "nightshift");
  assertEquals(themeName("dark"), "nightshift");
  assertEquals(themeName("light"), "dayshift");
  assertEquals(THEME_COLOR[themeName()], "#0e1726");
});
