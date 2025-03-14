import { AppHandlers } from "../_middleware.ts";
import { z } from "npm:zod";

export const handler: AppHandlers = {
  async POST(req, ctx) {
    const body = await req.json();
    const schema = z.object({
      theme: z.enum(["light", "dark"]),
    });
    const prefs = schema.parse(body);
    const updatedPreferences = {
      ...ctx.state.session.preferences,
      ...prefs,
    };
    ctx.state.session.preferences = updatedPreferences;

    return new Response(
      JSON.stringify(updatedPreferences),
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  },
};
