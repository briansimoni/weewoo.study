import {
  BarChart as BarChartIcon,
  LogIn as LoginIcon,
  Menu as MenuIcon,
  Moon as MoonIcon,
  ShoppingBag as ShoppingBagIcon,
  Sun as SunIcon,
  Trophy as TrophyIcon,
} from "lucide-preact";
import type { ComponentType } from "preact"; // Import Preact’s ComponentType

// For some reason Preact or Deno or Typescript doesn't like the lucide-preact component types out of the box which is dumb
export const Trophy = TrophyIcon as ComponentType<{ className?: string }>;
export const BarChart = BarChartIcon as ComponentType<
  { className?: string }
>;
export const ShoppingBag = ShoppingBagIcon as ComponentType<
  { className?: string }
>;
export const LogIn = LoginIcon as ComponentType<
  { className?: string }
>;
export const Menu = MenuIcon as ComponentType<
  { className?: string }
>;
export const Sun = SunIcon as ComponentType<
  { className?: string }
>;
export const Moon = MoonIcon as ComponentType<
  { className?: string }
>;
