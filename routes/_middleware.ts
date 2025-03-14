import { Handler, Handlers, PageProps } from "$fresh/server.ts";
import * as http from "@std/http";
import diff from "https://deno.land/x/microdiff@v1.2.0/index.ts";
import { log } from "../lib/logger.ts";
import { Session, SessionStore } from "../lib/session_store.ts";

export interface SessionData {
  session_id: string;
  user_id?: string;
  access_token?: string;
  nickname?: string;
  name?: string;
  picture?: string;
  display_name?: string;
  streakDays?: number;
  preferences?: {
    theme: "light" | "dark" | undefined;
  };
  [key: string]: any;
}

/**
 * same as Fresh's PageProps type but with state modified
 * by the app's middleware. It has the session object in it
 */
export interface AppProps extends PageProps {
  state: {
    session: SessionData;
  };
}

export type AppHandler = Handler<any, { session: SessionData }>;
export type AppHandlers = Handlers<any, { session: SessionData }>;

const statefulSessionMiddleware: Handler = async function handler(req, ctx) {
  const excluded = [
    "static",
    "internal",
  ];
  if (excluded.includes(ctx.destination)) {
    return ctx.next();
  }
  const sessionStore = await SessionStore.make();
  const cookies = http.getCookies(req.headers);
  const cookie_session_id = cookies["app_session"];
  let session: Session | null = null;
  if (cookie_session_id) {
    session = await sessionStore.get(cookie_session_id);
  }

  if (!session) {
    session = { session_id: crypto.randomUUID() };
  }
  ctx.state.session = JSON.parse(JSON.stringify(session));

  const response = await ctx.next();
  if (
    diff(ctx.state.session as any, session).length > 0 ||
    !cookie_session_id
  ) {
    log.info("updating session", ctx.state.session);
    await sessionStore.update(ctx.state.session as Session);
    if (cookie_session_id !== session?.session_id) {
      // TODO: use secure true conditionally based on whether the server is running https or not
      // TODO: set the max age and make in configurable
      http.setCookie(response.headers, {
        name: "app_session",
        value: session.session_id,
        path: "/",
        httpOnly: true,
        sameSite: "Lax",
      });
    }
  }
  return response;
};

const logMiddleware: AppHandler = async function (req, ctx) {
  const start = Date.now();
  log.debug("request started", req.url);
  const res = await ctx.next();
  const end = Date.now();
  log.info(req.method, req.url, {
    user_id: ctx.state.session?.user_id,
    name: ctx.state.session?.name,
    status: res.status,
    responseTime: end - start,
  });
  return res;
};

export const handler: AppHandler[] = [
  logMiddleware,
  // sessionMiddleware,
  statefulSessionMiddleware,
];
