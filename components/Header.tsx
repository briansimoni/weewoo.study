import { JSX } from "preact";
// import { IS_BROWSER } from "$fresh/runtime.ts";

export function Header(_props: JSX.HTMLAttributes<HTMLButtonElement>) {
  return (
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
        <div class="dropdown dropdown-end">
          <div tabindex={0} class="avatar placeholder btn btn-circle">
            <div class="bg-neutral text-neutral-content w-10 rounded-full">
              <span class="text-3l">D</span>
            </div>
          </div>
          <ul
            tabindex={0}
            class="menu menu-sm dropdown-content rounded-box z-[1] mt-3 w-52 p-2 shadow"
          >
            <li>
              <a>Login (Coming Soon)</a>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
