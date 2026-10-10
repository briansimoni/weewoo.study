import { page } from "fresh";
import { SessionStore } from "../../lib/session_store.ts";
import { AppHandlers } from "../_middleware.ts";
import * as http from "@std/http";
import { Page } from "../../components/ui/Page.tsx";
import { Card } from "../../components/ui/Card.tsx";
import { LinkButton } from "../../components/ui/Button.tsx";

export const handler: AppHandlers = {
  async GET(ctx) {
    const req = ctx.req;
    const cookies = http.getCookies(req.headers);
    const session_id = cookies["app_session"];
    if (session_id) {
      const sessionStore = await SessionStore.make();
      await sessionStore.delete(session_id);
    }
    delete ctx.state.session;

    return page();
  },
};

export default function () {
  return (
    <Page title="Logged Out" width="narrow">
      <Card bodyClass="items-center text-center">
        <h1 class="text-3xl font-bold">Logged Out</h1>
        <p class="mb-4">You have successfully logged out.</p>
        <LinkButton href="/">Return to Home</LinkButton>
      </Card>
    </Page>
  );
}
