import {
  BarChart as BarChartIcon,
  Bug as BugIcon,
  Dumbbell as DumbbellIcon,
  Edit as EditIcon,
  FileQuestion as FileQuestionIcon,
  FileText as FileTextIcon,
  HelpCircle as HelpCircleIcon,
  Home as HomeIcon,
  Info as InfoIcon,
  LayoutDashboard as LayoutDashboardIcon,
  LogIn as LoginIcon,
  LogOut as LogOutIcon,
  Menu as MenuIcon,
  MessageCircle as MessageCircleIcon,
  Moon as MoonIcon,
  PanelRight as PanelRightIcon,
  ShoppingBag as ShoppingBagIcon,
  Sun as SunIcon,
  ThumbsDown as ThumbsDownIcon,
  ThumbsUp as ThumbsUpIcon,
  Trophy as TrophyIcon,
} from "npm:lucide-preact";
import type { ComponentType } from "preact"; // Import Preact’s ComponentType

// For some reason Preact or Deno or Typescript doesn't like the lucide-preact component types out of the box which is dumb
export const Trophy = TrophyIcon as ComponentType<{ className?: string }>;
export const BarChart = BarChartIcon as ComponentType<{ className?: string }>;
export const ShoppingBag = ShoppingBagIcon as ComponentType<
  { className?: string }
>;
export const LogIn = LoginIcon as ComponentType<{ className?: string }>;
export const Menu = MenuIcon as ComponentType<{ className?: string }>;
export const Sun = SunIcon as ComponentType<{ className?: string }>;
export const Moon = MoonIcon as ComponentType<{ className?: string }>;
export const Dumbbell = DumbbellIcon as ComponentType<{ className?: string }>;

// New icon exports
export const ThumbsUp = ThumbsUpIcon as ComponentType<{ className?: string }>;
export const ThumbsDown = ThumbsDownIcon as ComponentType<
  { className?: string }
>;
export const Home = HomeIcon as ComponentType<{ className?: string }>;
export const LogOut = LogOutIcon as ComponentType<{ className?: string }>;
export const Edit = EditIcon as ComponentType<{ className?: string }>;
export const Info = InfoIcon as ComponentType<{ className?: string }>;
export const Bug = BugIcon as ComponentType<{ className?: string }>;
export const LayoutDashboard = LayoutDashboardIcon as ComponentType<
  { className?: string }
>;
export const FileQuestion = FileQuestionIcon as ComponentType<
  { className?: string }
>;
export const HelpCircle = HelpCircleIcon as ComponentType<
  { className?: string }
>;
export const MessageCircle = MessageCircleIcon as ComponentType<
  { className?: string }
>;
export const PanelRight = PanelRightIcon as ComponentType<
  { className?: string }
>;
export const FileText = FileTextIcon as ComponentType<{ className?: string }>;
