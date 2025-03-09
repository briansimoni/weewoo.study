import { AppHandlers } from "../_middleware.ts";

export const handler: AppHandlers = {
  GET(_req, ctx) {
    // this has a side effect of unsetting cookies
    ctx.state.session = {};

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
