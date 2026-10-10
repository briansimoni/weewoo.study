import { page } from "fresh";
import QuestionPage from "../../../islands/Question.tsx";
import type { Handlers } from "fresh/compat";
import type { AppState } from "../../_middleware.ts";
import { Page } from "../../../components/ui/Page.tsx";

export const handler: Handlers<undefined, AppState> = {
  GET(ctx) {
    if (!ctx.state.session) {
      return new Response("Unauthorized", { status: 401 });
    }
    return page();
  },
};

export default function PracticePage() {
  return (
    <Page title="Practice" width="narrow">
      <QuestionPage />
    </Page>
  );
}
