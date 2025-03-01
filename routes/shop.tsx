import { defineRoute } from "$fresh/server.ts";
import { ShoppingBag } from "../icons/index.ts";

export default defineRoute((req, ctx) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-base-100 text-center p-4">
      <ShoppingBag className="size-16 text-primary mb-6 animate-pulse" />
      <h1 className="text-4xl font-bold text-base-content mb-4">
        Shop Coming Soon!
      </h1>
      <p className="text-lg text-base-content/80 max-w-md mb-6">
        We're crafting something special for you. Check back soon!
      </p>
      <div className="w-1/2 mb-6">
        <progress
          className="progress progress-primary"
          value="70"
          max="100"
        >
        </progress>
        <p className="text-sm text-base-content/60">70% Complete</p>
      </div>
      <a href="/" className="btn btn-primary">
        Back to Home
      </a>
    </div>
  );
});
