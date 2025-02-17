import { PageProps } from "$fresh/server.ts";

interface ExtendedPageProps extends PageProps {
  state: {
    session?: {
      [key: string]: any;
    };
  };
}

// todo: type state better
export default function Layout({ Component, state }: ExtendedPageProps) {
  let avatarPlaceHolderLetter = "";
  if (state.session?.name) {
    avatarPlaceHolderLetter = state.session.name[0].toUpperCase();
  }
  return (
    <>
      <div class="navbar bg-base-100">
        <div class="flex-1">
          <a href="/" class="btn btn-ghost text-xl">WeeWoo🚑</a>
        </div>
        <div class="flex-none">
          <ul class="menu menu-horizontal px-1">
            <li>
              <a href="/about">About</a>
            </li>
          </ul>
        </div>
        <div class="flex-none">
          {!state.session &&
            (
              <ul class="menu menu-horizontal px-1">
                <li>
                  <a href="/auth/login">Login</a>
                </li>
              </ul>
            )}
        </div>
        {state.session && (
          <div class="flex-none">
            <div class="dropdown dropdown-end">
              <div tabindex={0} class="avatar placeholder btn btn-circle">
                <div class="bg-neutral text-neutral-content w-10 rounded-full">
                  <span class="text-3l">{avatarPlaceHolderLetter}</span>
                </div>
              </div>
              <ul
                tabindex={0}
                class="menu menu-sm dropdown-content rounded-box z-[1] mt-3 w-52 p-2 shadow"
              >
                <li>
                  <a href="/auth/logout">Logout</a>
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>
      <Component />
    </>
  );
}
