import { AppHandler } from "../routes/_middleware.ts";

export const adminsOnlyMiddleware: AppHandler = (_req, ctx) => {
  if (ctx.state.session?.user_id !== "auth0|67b28845f4ba32d0be58bc46") {
    return new Response("Unauthorized", { status: 401 });
  }
  return ctx.next();
};
