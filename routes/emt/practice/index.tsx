import QuestionPage from "../../../islands/Question.tsx";
import { Handlers } from "$fresh/server.ts";

export const handler: Handlers = {
  GET(_req, ctx) {
    if (!ctx.state.session) {
      return new Response("Unauthorized", { status: 401 });
    }
    return ctx.render();
  },
};

export default function PracticePage() {
  return <QuestionPage />;
}
