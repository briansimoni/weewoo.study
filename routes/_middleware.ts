import diff from "https://deno.land/x/microdiff@v1.2.0/index.ts";
import { asyncLocalStorage, log } from "../lib/logger.ts";
import { Session, SessionStore } from "../lib/session_store.ts";
import { decodeBase64 } from "jsr:@std/encoding@^1.0.7/base64";
import type {
  Handler,
  Handlers,
  PageProps,
} from "https://deno.land/x/fresh@1.7.3/server.ts";
import * as http from "@std/http";

export interface SessionData {
  session_id: string;
  user_id?: string;
  access_token?: string;
  nickname?: string;
  name?: string;
  picture?: string;
  display_name?: string;
  streakDays?: number;
  [key: string]: unknown;
}

/**
 * same as Fresh's PageProps type but with state modified
 * by the app's middleware. It has the session object in it
 */
export interface AppProps extends PageProps {
  state: AppState;
}

export interface AppState extends Record<string, unknown> {
  session?: SessionData;
  preferences?: {
    theme: "light" | "dark" | undefined;
  };
}

export type AppHandler = Handler<unknown, AppState>;
export type AppHandlers = Handlers<unknown, AppState>;

const statefulSessionMiddleware: AppHandler = async function handler(req, ctx) {
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

  ctx.state.session = JSON.parse(JSON.stringify(session));

  const response = await ctx.next();
  // if there was a session and one of the next functions deleted it, unset the cookie
  // or if there was no session but a cookie was set, that means it was probably deleted from the database
  if (
    (session && !ctx.state.session) ||
    (cookie_session_id && !session && !ctx.state.session)
  ) {
    http.setCookie(response.headers, {
      name: "app_session",
      value: "",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
      expires: new Date(0),
    });
    return response;
  }
  // if none of the functions set a session, just return without doing any session store updates
  if (!ctx.state.session) {
    return response;
  }
  // if the session has changed, update it in the database
  if (
    diff(ctx.state.session, session ?? {}).length > 0
  ) {
    log.info("updating session", ctx.state.session);
    session = await sessionStore.update(ctx.state.session as Session);
    if (cookie_session_id !== session?.session_id) {
      // TODO: use secure true conditionally based on whether the server is running https or not
      // TODO: set the max age and make in configurable
      http.setCookie(response.headers, {
        name: "app_session",
        value: session.session_id,
        path: "/",
        httpOnly: true,
        sameSite: "Lax",
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });
    }
  }
  return response;
};

const logMiddleware: AppHandler = function (req, ctx) {
  const excluded = [
    "static",
    "internal",
  ];
  if (excluded.includes(ctx.destination)) {
    return ctx.next();
  }
  const requestId = crypto.randomUUID();
  // log a request id with every log statement
  return asyncLocalStorage.run(requestId, async () => {
    const start = Date.now();
    const clonedBody = await req.clone().text();
    let request_body: string | undefined;
    try {
      request_body = JSON.parse(clonedBody);
    } catch (_error) {
      // I just want to log things nicely without double JSON stringifying stuff
    }
    let res: Response;
    try {
      res = await ctx.next();
    } catch (error: unknown) {
      log.error("request log", {
        method: req.method,
        url: req.url,
        user_id: ctx.state.session?.user_id,
        status: 500,
        responseTime: Date.now() - start,
        request_body,
        error,
      });
      throw error;
    }
    const end = Date.now();
    log.info("request log", {
      method: req.method,
      url: req.url,
      user_id: ctx.state.session?.user_id,
      status: res.status,
      responseTime: end - start,
      request_body,
    });
    return res;
  });
};

const preferencesMiddleware: AppHandler = async function (req, ctx) {
  const cookies = http.getCookies(req.headers);
  const preferences = cookies["preferences"];
  if (preferences) {
    const decodedPreferences = decodeBase64(preferences);
    const preferencesText = new TextDecoder().decode(decodedPreferences);
    ctx.state.preferences = JSON.parse(preferencesText);
  }
  const response = await ctx.next();
  return response;
};

export const handler: AppHandler[] = [
  logMiddleware,
  preferencesMiddleware,
  statefulSessionMiddleware,
];
