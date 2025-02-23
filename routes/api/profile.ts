import { z } from "npm:zod";
import { AppHandlers } from "../_middleware.ts";
import { UserStore } from "../../lib/user_store.ts";

export const handler: AppHandlers = {
  async PATCH(req, ctx) {
    if (!ctx.state.session || !ctx.state.session.user_id) {
      return new Response("Unauthorized", { status: 401 });
    }
    const schema = z.object({
      display_name: z.string(),
    }).required();

    const body = await req.json();
    const params = schema.parse(body);
    const { user_id } = ctx.state.session;
    const userStore = await UserStore.make();
    const updatedUser = await userStore.updateUser({
      user_id,
      display_name: params.display_name,
    });
    return new Response(JSON.stringify(updatedUser), {
      headers: { "Content-Type": "application/json" },
    });
  },
};
