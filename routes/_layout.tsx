import StreakIndicator from "../islands/StreakIndicator.tsx";
import ThemeController from "../islands/ThemeController.tsx";
import CartIcon from "../islands/CartIcon.tsx";
import PWAInstallPrompt from "../islands/PWAInstallPrompt.tsx";
import { StreakStore } from "../lib/streak_store.ts";
import { AppState } from "./_middleware.ts";
import { defineLayout } from "$fresh/server.ts";
import { BarChart, Dumbbell, ShoppingBag, Trophy } from "lucide-preact";

const stage = Deno.env.get("STAGE");

export default defineLayout<AppState>(async (_req, ctx) => {
  const { state, Component } = ctx;
  const streakStore = await StreakStore.make();
  let initialStreak: number | undefined = undefined;
  if (state.session?.user_id) {
    const streak = await streakStore.get(state.session.user_id);
    if (streak) {
      initialStreak = streak.days;
    }
  }
  return (
    <>
      <div className="navbar bg-base-100">
        {/* Logo */}
        <div className="navbar-start">
          <a href="/" className="btn btn-ghost text-xl">WeeWoo🚑</a>
          {stage !== "PROD" && (
            <span className="badge badge-warning">{stage}</span>
          )}
        </div>

        {/* Right Side: Streak, Cart and Menus */}
        <div className="navbar-end flex items-center gap-4">
          {/* Cart Icon */}
          <CartIcon />

          {/* Streak - Always Visible */}
          {state.session && <StreakIndicator initialStreak={initialStreak} />}

          {/* Hamburger Menu for Mobile */}
          <div className="md:hidden">
            <div className="dropdown dropdown-end">
              <label tabIndex={0} className="btn btn-ghost">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16m-7 6h7"
                  />
                </svg>
              </label>
              <ul
                tabIndex={0}
                className="menu dropdown-content bg-base-300 rounded-box z-10 mt-3 w-52 p-2 shadow"
              >
                <li>
                  <a href="/about">About</a>
                </li>
                <li>
                  <a href="/leaderboard">Leaderboard</a>
                </li>
                <li>
                  <a href="/cart">Cart</a>
                </li>
                {state.session && (
                  <>
                    <li>
                      <a href="/profile">Profile</a>
                    </li>
                    <li>
                      <a href="/auth/logout">Logout</a>
                    </li>
                  </>
                )}
                {!state.session && (
                  <li>
                    <a href="/auth/login">Login</a>
                  </li>
                )}
                <li>
                  <ThemeController
                    initial_theme={state.preferences?.theme}
                  />
                </li>
              </ul>
            </div>
          </div>

          {/* Full Menu for Desktop */}
          <div className="hidden md:flex">
            <ul className="menu menu-horizontal px-1">
              <li>
                <a href="/about">About</a>
              </li>
              <li>
                <a href="/leaderboard">Leaderboard</a>
              </li>
              <li>
                <a href="/shop">Shop</a>
              </li>
              <li>
                <a href="/cart">Cart</a>
              </li>
              {state.session && (
                <>
                  <li>
                    <a href="/profile">Profile</a>
                  </li>
                  <li>
                    <a href="/auth/logout">Logout</a>
                  </li>
                </>
              )}
              {!state.session && (
                <li>
                  <a href="/auth/login">Login</a>
                </li>
              )}
              <li>
                <ThemeController
                  initial_theme={state.preferences?.theme}
                />
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Main content area that grows */}
      <main className="pb-16 md:pb-0">
        <Component />
      </main>

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
            ctx.route.includes("/shop") ? "dock-active" : ""
          }`}
        >
          <ShoppingBag className="size-[1.2em]" />
          <span className="dock-label">Shop</span>
        </a>
      </div>

      {/* PWA Install Prompt - Only shows on mobile devices when not using installed PWA */}
      <PWAInstallPrompt />
    </>
  );
});
