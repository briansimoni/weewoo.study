import z from "zod";
import { AttemptStore } from "../../lib/attempt_store.ts";
import { AppHandlers } from "../_middleware.ts";
import dayjs from "dayjs";

export const handler: AppHandlers = {
  async GET(req, ctx) {
    const user_id = ctx.state.session?.user_id;
    if (!user_id) {
      return new Response("unauthorized", {
        status: 401,
      });
    }

    const schema = z.object({
      time: z.number(),
      unit: z.enum(["day", "week", "month", "year"]),
    });

    const requestBody = await req.json();
    const { time, unit } = schema.parse(requestBody);

    const attemptStore = await AttemptStore.make();
    const attempts = await attemptStore.listWithLookbackWindow({
      user_id,
      duration: dayjs.duration(time, unit),
    });
    return new Response(JSON.stringify(attempts));
  },
};
