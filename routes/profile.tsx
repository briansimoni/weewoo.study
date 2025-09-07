import Profile from "../islands/Profile.tsx";
import { AttemptStore } from "../lib/attempt_store.ts";
import { StreakStore } from "../lib/streak_store.ts";

import { User, UserStore } from "../lib/user_store.ts";
import { AppHandlers, AppProps } from "./_middleware.ts";

export const handler: AppHandlers = {
  async GET(req, ctx) {
    const user_id = ctx.state.session?.user_id;
    if (!user_id) {
      return new Response("Unauthorized", { status: 401 });
    }
    const userStore = await UserStore.make();
    const sreakStore = await StreakStore.make();
    const attemptStore = await AttemptStore.make();
    const [user, streak, attempts] = await Promise.all([
      userStore.getUser(user_id),
      sreakStore.get(user_id),
      attemptStore.listByUserId(user_id),
    ]);
    return ctx.render({ user, streak, session: ctx.state.session, attempts });
  },
};

interface ProfileProps extends AppProps {
  user: User;
}

export default function (props: ProfileProps) {
  return (
    <Profile
      user={props.data.user}
      session={props.data.session}
      streak={props.data.streak}
      attempts={props.data.attempts}
    />
  );
}
