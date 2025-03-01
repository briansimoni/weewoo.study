import UserPage from "../../components/UserPage.tsx";
import { log } from "../../lib/logger.ts";
import { StreakStore } from "../../lib/streak_store.ts";
import { UserStore } from "../../lib/user_store.ts";
import { AppHandlers, AppProps } from "../_middleware.ts";

export const handler: AppHandlers = {
  GET: async (req, ctx) => {
    const userStore = await UserStore.make();
    const streakStore = await StreakStore.make();
    const user_id = decodeURIComponent(ctx.params["user_id"]);
    const user = await userStore.getUser(user_id);
    const streak = await streakStore.get(user_id);
    return await ctx.render({ user, user_id, streak });
  },
};

export default function (props: AppProps) {
  return <UserPage user={props.data.user} streak={props.data.streak} />;
}
