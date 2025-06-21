import { AppHandlers } from "../_middleware.ts";
import { z } from "npm:zod";
import * as http from "@std/http";
import { encodeBase64 } from "jsr:@std/encoding@^1.0.7/base64";

export const handler: AppHandlers = {
  async POST(req, ctx) {
    const body = await req.json();
    const schema = z.object({
      theme: z.enum(["light", "dark"]).optional(),
      trial_questions_completed: z.boolean().optional(),
    });
    const prefs = schema.parse(body);
    const preferences = {
      ...ctx.state.preferences,
      ...prefs,
    };
    ctx.state.preferences = preferences;

    const response = new Response(
      JSON.stringify(preferences),
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    http.setCookie(response.headers, {
      name: "preferences",
      value: encodeBase64(JSON.stringify(preferences)),
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
      maxAge: 60 * 60 * 24 * 365 * 1, // a year
    });
    return response;
  },
};
