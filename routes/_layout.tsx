import ThemeController from "../islands/ThemeController.tsx";
import { AppProps } from "./_middleware.ts";

// todo: type state better
export default function Layout({ Component, state }: AppProps) {
  let avatarPlaceHolderLetter = "?";
  if (state.session?.display_name) {
    avatarPlaceHolderLetter = state.session.display_name[0].toUpperCase();
  }
  return (
    <div className="flex flex-col min-h-screen">
      <div className="navbar bg-base-100">
        <div className="flex-1">
          <a href="/" className="btn btn-ghost text-xl">WeeWoo🚑</a>
        </div>
        <div className="flex-none">
          <ul className="menu menu-horizontal px-1">
            <li>
              {state.session && <span>🔥 {state.session?.streakDays ?? 0}
              </span>}
            </li>
          </ul>
          <ul className="menu menu-horizontal px-1">
            <li>
              <a href="/about">About</a>
            </li>
          </ul>
          <ul className="menu menu-horizontal px-1">
            <li>
              <a href="/leaderboard">Leaderboard</a>
            </li>
          </ul>
        </div>

        <div className="flex-none">
          <div className="dropdown dropdown-end">
            <div tabIndex={0} className="avatar placeholder btn btn-circle">
              <div className="bg-neutral text-neutral-content w-10 rounded-full">
                <span className="text-3l">{avatarPlaceHolderLetter}</span>
              </div>
            </div>
            <ul
              tabIndex={0}
              className="menu menu-sm dropdown-content bg-base-300 rounded-box z-1 mt-3 w-52 p-2"
            >
              <ThemeController />

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
            </ul>
          </div>
        </div>
      </div>
      {/* Main content area that grows */}
      <main className="grow">
        <Component />
      </main>
    </div>
  );
}
