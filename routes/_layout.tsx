import StreakIndicator from "../islands/StreakIndicator.tsx";
import ThemeController from "../islands/ThemeController.tsx";
import CartIcon from "../islands/CartIcon.tsx";
import Toaster from "../islands/Toaster.tsx";
import { StreakStore } from "../lib/streak_store.ts";
import { AppState } from "./_middleware.ts";
import { BarChart, Dumbbell, Menu, ShoppingBag, Trophy } from "lucide-preact";
import { Badge } from "../components/ui/Badge.tsx";
import type { PageProps } from "fresh";

const stage = Deno.env.get("STAGE") ?? "DEV";

export default async function Layout(ctx: PageProps<unknown, AppState>) {
  const { state, Component } = ctx;
  const streakStore = await StreakStore.make();
  let initialStreak: number | undefined = undefined;
  if (state.session?.user_id) {
    const streak = await streakStore.get(state.session.user_id);
    if (streak) {
      initialStreak = streak.days;
    }
  }
  const links = [
    { href: "/emt/practice", label: "Practice" },
    { href: "/leaderboard", label: "Leaderboard" },
    { href: "/shop", label: "Shop" },
    { href: "/about", label: "About" },
    ...(state.session
      ? [
        { href: "/profile", label: "Profile" },
        { href: "/auth/logout", label: "Logout" },
      ]
      : [{ href: "/auth/login", label: "Login" }]),
  ];
  const linkItems = links.map(({ href, label }) => (
    <li key={href}>
      <a href={href} aria-current={ctx.route === href ? "page" : undefined}>
        {label}
      </a>
    </li>
  ));
  const themeController = (
    <ThemeController initial_theme={state.preferences?.theme} />
  );

  return (
    <>
      <div className="navbar bg-base-100 gap-2">
        <div className="navbar-start gap-2">
          <a href="/" className="btn btn-ghost text-xl px-2">WeeWoo🚑</a>
          {stage !== "PROD" && <Badge tone="warning">{stage}</Badge>}
        </div>

        <div className="navbar-end flex-nowrap gap-1">
          <CartIcon />
          {state.session && <StreakIndicator initialStreak={initialStreak} />}

          {/* Desktop: links and theme toggle in one row */}
          <ul className="menu menu-horizontal flex-nowrap px-1 hidden lg:flex">
            {linkItems}
          </ul>
          <div className="hidden lg:block">{themeController}</div>

          {/* Mobile and tablet: the same links in a dropdown */}
          <div className="dropdown dropdown-end lg:hidden">
            <div
              tabIndex={0}
              role="button"
              className="btn btn-ghost btn-circle"
              aria-label="Menu"
            >
              <Menu className="h-6 w-6" />
            </div>
            <ul
              tabIndex={0}
              className="menu dropdown-content bg-base-300 rounded-box z-10 mt-3 w-52 p-2 shadow"
            >
              {linkItems}
              <li>{themeController}</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Main content area that grows */}
      <main className="pb-16 md:pb-0">
        <Component />
      </main>

      <Toaster />

      {/* Dock - Hidden on md and larger screens */}
      <div className="dock md:hidden">
        <a
          href="/leaderboard"
          className={`flex flex-col items-center ${
            ctx.route === "/leaderboard" ? "dock-active" : ""
          }`}
        >
          <Trophy className="size-[1.2em]" />
          <span className="dock-label">Leaderboard</span>
        </a>

        <a
          href="/emt/practice"
          className={`flex flex-col items-center ${
            ctx.route === "/emt/practice" ? "dock-active" : ""
          }`}
        >
          <Dumbbell className="size-[1.2em]" />
          <span className="dock-label">Practice</span>
        </a>

        <a
          href={state.session ? "/profile" : "/auth/login"}
          className={`flex flex-col items-center ${
            ctx.route === "/profile" ? "dock-active" : ""
          }`}
        >
          <BarChart className="size-[1.2em]" />
          <span className="dock-label">Stats</span>
        </a>

        <a
          href="/shop"
          className={`flex flex-col items-center ${
            ctx.route?.includes("/shop") ? "dock-active" : ""
          }`}
        >
          <ShoppingBag className="size-[1.2em]" />
          <span className="dock-label">Shop</span>
        </a>
      </div>
    </>
  );
}
