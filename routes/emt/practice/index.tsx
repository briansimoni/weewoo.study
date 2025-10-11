import QuestionPage from "../../../islands/Question.tsx";
import { Handlers } from "fresh/compat";

export const handler: Handlers = {
  GET(ctx) {
    if (!ctx.state.session) {
      return new Response("Unauthorized", { status: 401 });
    }
    return ctx.render();
  },
};

export default function PracticePage() {
  return <QuestionPage />;
}
