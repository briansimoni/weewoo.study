import { page, type PageProps } from "fresh";
import UserPage from "../../components/UserPage.tsx";
import type { ComponentProps } from "preact";
import type { Handlers } from "fresh/compat";
import { StreakStore } from "../../lib/streak_store.ts";
import { UserStore } from "../../lib/user_store.ts";
import type { AppState } from "../_middleware.ts";

type UserPageData = ComponentProps<typeof UserPage> & { user_id: string };

export const handler: Handlers<UserPageData, AppState> = {
  GET: async (ctx) => {
    const userStore = await UserStore.make();
    const streakStore = await StreakStore.make();
    const user_id = decodeURIComponent(ctx.params["user_id"]);
    const user = await userStore.getUser(user_id);
    const streak = await streakStore.get(user_id);
    if (!user) {
      return new Response("User not found", { status: 404 });
    }
    return page({ user, user_id, streak: streak ?? undefined });
  },
};

export default function (props: PageProps<UserPageData, AppState>) {
  return <UserPage user={props.data.user} streak={props.data.streak} />;
}
