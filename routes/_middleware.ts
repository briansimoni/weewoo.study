import { FreshContext, Handlers, PageProps } from "$fresh/server.ts";
import diff from "https://deno.land/x/microdiff@v1.2.0/index.ts";

const SECRET_KEY = Deno.env.get("COOKIE_SECRET") || "super_secret_key";

interface SessionData {
  user_id?: string;
  access_token?: string;
  nickname?: string;
  name?: string;
  picture?: string;
  [key: string]: any;
}

/**
 * same as Fresh's PageProps type but with state modified
 * by the app's middleware. It has the session object in it
 */
export interface AppProps extends PageProps {
  state: {
    session?: SessionData;
  };
}

export type AppHandlers = Handlers<any, { session?: SessionData }>;

// Helper function to generate HMAC signature using crypto.subtle
async function sign(data: string, key: string = SECRET_KEY): Promise<string> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(key),
    { name: "HMAC", hash: { name: "SHA-256" } },
    false,
    ["sign"],
  );

  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    keyMaterial,
    encoder.encode(data),
  );

  return btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)));
}

// Helper function to verify signature
async function verify(
  data: string,
  signature: string,
  key: string = SECRET_KEY,
): Promise<boolean> {
  const expectedSignature = await sign(data, key);

  return expectedSignature === signature;
}

/**
 * session middleware
 */
export async function handler(req: Request, ctx: FreshContext) {
  let sessionData: Partial<SessionData> | undefined = undefined;

  // Hydrate session
  const cookie = req.headers.get("cookie");
  if (cookie) {
    const data = cookie
      .split("; ")
      .find((c) => c.startsWith("test_question_app_data="))?.split("=")[1];
    const signatureCookie = cookie
      .split("; ")
      .find((c) => c.startsWith("test_question_app_signature="));

    if (data && signatureCookie) {
      const signature = splitOnFirst(signatureCookie, "=")[1];
      const verified = await verify(data, signature!);
      if (verified) {
        try {
          sessionData = JSON.parse(decodeURIComponent(data));
        } catch (error) {
          console.warn("Failed to parse session data:", error);
          sessionData = undefined;
        }
      } else {
        console.warn("Invalid or tampered session data detected.");
      }
    }
  }

  ctx.state.session = sessionData;

  // Run the handlers
  const resp = await ctx.next();

  // Delete the cookies if session is missing
  if (!ctx.state.session || Object.keys(ctx.state.session).length === 0) {
    resp.headers.append(
      "Set-Cookie",
      "test_question_app_data=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax",
    );

    resp.headers.append(
      "Set-Cookie",
      "test_question_app_signature=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax",
    );
    return resp;
  }

  // Only set cookies if the session has changed
  if (diff(ctx.state.session, sessionData ?? {}).length === 0) {
    return resp;
  }

  const serialized = JSON.stringify(ctx.state.session);
  const payload = encodeURIComponent(serialized);
  const signature = await sign(payload);

  resp.headers.append(
    "Set-Cookie",
    `test_question_app_data=${payload}; Path=/; HttpOnly; Secure; SameSite=Lax`,
  );
  resp.headers.append(
    "Set-Cookie",
    `test_question_app_signature=${signature}; Path=/; HttpOnly; Secure; SameSite=Lax`,
  );

  return resp;
}

function splitOnFirst(input: string, delimiter: string): [string, string?] {
  const index = input.indexOf(delimiter);
  if (index === -1) {
    return [input];
  }
  const before = input.slice(0, index);
  const after = input.slice(index + delimiter.length);
  return [before, after];
}
