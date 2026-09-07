import { page, type PageProps } from "fresh";
import Profile from "../islands/Profile.tsx";
import { AttemptStore } from "../lib/attempt_store.ts";
import { StreakStore } from "../lib/streak_store.ts";

import { UserStore } from "../lib/user_store.ts";
import type { AppState } from "./_middleware.ts";
import type { ComponentProps } from "preact";
import type { Handlers } from "fresh/compat";

type ProfileData = ComponentProps<typeof Profile>;

export const handler: Handlers<ProfileData, AppState> = {
  async GET(ctx) {
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
    if (!user) {
      return new Response("User not found", { status: 404 });
    }
    return page({
      user,
      streak: streak ?? undefined,
      session: ctx.state.session,
      attempts,
    });
  },
};

export default function (props: PageProps<ProfileData, AppState>) {
  return (
    <Profile
      user={props.data.user}
      session={props.data.session}
      streak={props.data.streak}
      attempts={props.data.attempts}
    />
  );
}
