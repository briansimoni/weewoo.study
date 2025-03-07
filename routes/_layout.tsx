import {
  BarChart,
  Dumbbell,
  LogIn,
  ShoppingBag,
  Trophy,
} from "../icons/index.ts";
import StreakIndicator from "../islands/StreakIndicator.tsx";
import ThemeController from "../islands/ThemeController.tsx";
import { AppProps } from "./_middleware.ts";

// todo: type state better
export default function Layout(props: AppProps) {
  const { state, Component } = props;
  return (
    <div className="flex flex-col min-h-screen">
      <div className="navbar bg-base-100">
        {/* Logo */}
        <div className="navbar-start">
          <a href="/" className="btn btn-ghost text-xl">WeeWoo🚑</a>
        </div>

        {/* Right Side: Streak and Menus */}
        <div className="navbar-end flex items-center gap-4">
          {/* Streak - Always Visible */}
          {
            /* {state.session && (
            <StreakIndicator initialStreak={state.session.streakDays} />
          )} */
          }

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
                  <ThemeController />
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
                <ThemeController />
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Main content area that grows */}
      <main className="grow pb-16">
        <Component />
      </main>

      {/* Dock - Hidden on md and larger screens */}
      <div className="dock md:hidden">
        <a
          href="/leaderboard"
          className={`flex flex-col items-center ${
            props.route === "/leaderboard" ? "dock-active" : ""
          }`}
        >
          <Trophy className="size-[1.2em]" />
          <span className="dock-label">Leaderboard</span>
        </a>

        <a
          href="/emt/practice"
          className={`flex flex-col items-center ${
            props.route === "/emt/practice" ? "dock-active" : ""
          }`}
        >
          <Dumbbell className="size-[1.2em]" />
          <span className="dock-label">Practice</span>
        </a>

        <a
          href={state.session ? "/profile" : "/auth/login"}
          className={`flex flex-col items-center ${
            props.route === "/profile" ? "dock-active" : ""
          }`}
        >
          {state.session
            ? <BarChart className="size-[1.2em]" />
            : <LogIn className="size-[1.2em]" />}
          <span className="dock-label">
            {state.session ? "Stats" : "Login"}
          </span>
        </a>

        <a
          href="/shop"
          className={`flex flex-col items-center ${
            props.route === "/shop" ? "dock-active" : ""
          }`}
        >
          <ShoppingBag className="size-[1.2em]" />
          <span className="dock-label">Shop</span>
        </a>
      </div>
    </div>
  );
}
