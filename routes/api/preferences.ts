import { AppHandlers } from "../_middleware.ts";
import { z } from "npm:zod";
import * as http from "@std/http";
import { encodeBase64 } from "jsr:@std/encoding@^1.0.7/base64";

export const handler: AppHandlers = {
  async POST(req, ctx) {
    const body = await req.json();
    const schema = z.object({
      theme: z.enum(["light", "dark"]),
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
      value: encodeBase64((JSON.stringify(preferences))),
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    });
    return response;
  },
};
