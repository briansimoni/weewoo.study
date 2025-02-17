import { PageProps } from "$fresh/server.ts";

export default function (props?: PageProps) {
  return (
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
            <a href="/auth/login">Login (Coming Soon)</a>
          </li>
        </ul>
      </div>
    </div>
  );
}
