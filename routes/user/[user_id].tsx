import Profile from "../../components/Profile.tsx";
import { log } from "../../lib/logger.ts";
import { User, UserStore } from "../../lib/user_store.ts";
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

interface ProfileProps extends AppProps {
  user: User;
}

export default function (props: ProfileProps) {
  return <Profile user={props.data.user} />;
}
