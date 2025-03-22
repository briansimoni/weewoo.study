import { SessionStore } from "../../lib/session_store.ts";
import { AppHandlers } from "../_middleware.ts";
import * as http from "@std/http";

export const handler: AppHandlers = {
  async GET(req, ctx) {
    const cookies = http.getCookies(req.headers);
    const session_id = cookies["app_session"];
    if (session_id) {
      const sessionStore = await SessionStore.make();
      await sessionStore.delete(session_id);
    }
    delete ctx.state.session;

    return ctx.render();
  },
};

export default function () {
  return (
    <div class="flex justify-center">
      <div class="card shadow-xl p-6 max-w-md">
        <h1 class="text-3xl text-center">Logged Out</h1>
        <p class="mb-6 text-center">You have successfully logged out.</p>
        <a href="/" class="btn btn-primary">Return to Home</a>
      </div>
    </div>
  );
}
