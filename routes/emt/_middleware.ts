import { AppHandler } from "../_middleware.ts";

export const handler: AppHandler[] = [
  // login required to practice
  (req, ctx) => {
    if (!ctx.state.session) {
      const currentUrl: URL = new URL(req.url);
      return Response.redirect(`${currentUrl.origin}/auth/login`, 302);
    }
    return ctx.next();
  },
];
