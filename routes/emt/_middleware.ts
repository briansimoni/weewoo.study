import { AppHandler } from "../_middleware.ts";

export const handler: AppHandler[] = [
  // login required to practice
  (ctx) => {
    if (!ctx.state.session) {
      const currentUrl: URL = new URL(ctx.req.url);
      return Response.redirect(`${currentUrl.origin}/auth/login`, 302);
    }
    return ctx.next();
  },
];
