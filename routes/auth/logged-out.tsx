import * as oauth from "npm:oauth4webapi";
import { AppHandlers } from "../_middleware.ts";
const client_id = Deno.env.get("CLIENT_ID");
const client_secret = Deno.env.get("CLIENT_SECRET");
const redirect_uri = Deno.env.get("REDIRECT_URI");

export const handler: AppHandlers = {
  GET(_req, ctx) {
    // this has a side effect of unsetting cookies
    ctx.state.session = {};

    return ctx.render();
  },
};

export default function () {
  return (
    <div class="flex items-center justify-center min-h-screen bg-base-200 text-base-content">
      <div class="card bg-base-100 shadow-xl p-6 max-w-sm text-center">
        <h1 class="text-3xl font-bold mb-4">Logged Out</h1>
        <p class="mb-6">You have successfully logged out.</p>
        <a href="/" class="btn btn-primary">Return to Home</a>
      </div>
    </div>
  );
}
