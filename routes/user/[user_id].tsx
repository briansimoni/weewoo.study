import UserPage from "../../components/UserPage.tsx";
import { log } from "../../lib/logger.ts";
import { UserStore } from "../../lib/user_store.ts";
import { AppHandlers, AppProps } from "../_middleware.ts";

export const handler: AppHandlers = {
  GET: async (req, ctx) => {
    const userStore = await UserStore.make();
    const user_id = decodeURIComponent(ctx.params["user_id"]);
    log.debug("user_id", user_id);
    const user = await userStore.getUser(user_id);
    return await ctx.render({ user, user_id });
  },
};

export default function (props: AppProps) {
  return <UserPage user={props.data.user} />;
}
