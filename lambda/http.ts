/**
 * Translates between API Gateway HTTP API events (payload format 2.0) and the
 * web `Request` and `Response` the Fresh app speaks (lambda/web.ts).
 *
 * CloudFront sits in front of the HTTP API (infra/web.tf). It can't pass the
 * viewer's `Host` header to the API, so a CloudFront Function copies it into
 * `x-forwarded-host`, and CloudFront adds a secret `x-origin-secret` header
 * so the function can refuse requests that didn't come through the
 * distribution.
 * https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-integrations-lambda.html
 */

/** The part of an HTTP API event (payload format 2.0) used here. */
export interface HttpApiEvent {
  rawPath: string;
  rawQueryString?: string;
  /** Header names are lowercase; repeated headers are joined with commas. */
  headers?: Record<string, string>;
  /** Cookies arrive separately from the headers. */
  cookies?: string[];
  body?: string;
  isBase64Encoded?: boolean;
  requestContext: {
    http: { method: string; sourceIp?: string };
    domainName?: string;
  };
}

export interface HttpApiResult {
  statusCode: number;
  headers: Record<string, string>;
  /** `Set-Cookie` values: a response may set several. */
  cookies: string[];
  body: string;
  isBase64Encoded: boolean;
}

export const ORIGIN_SECRET_HEADER = "x-origin-secret";

/** The first address in `x-forwarded-for` is the viewer's. */
export function clientIp(event: HttpApiEvent): string {
  const forwarded = event.headers?.["x-forwarded-for"]?.split(",")[0]?.trim();
  return forwarded || event.requestContext.http.sourceIp || "0.0.0.0";
}

export function toRequest(event: HttpApiEvent): Request {
  const headers = new Headers();
  for (const [name, value] of Object.entries(event.headers ?? {})) {
    if (name === ORIGIN_SECRET_HEADER) continue; // not the app's business
    headers.set(name, value);
  }
  if (event.cookies?.length) headers.set("cookie", event.cookies.join("; "));

  // The app builds absolute URLs (OAuth redirects) from the request URL, so
  // it must see the site's host, not the API's.
  const host = headers.get("x-forwarded-host") ??
    headers.get("host") ?? event.requestContext.domainName ?? "localhost";
  headers.set("host", host);
  const query = event.rawQueryString ? `?${event.rawQueryString}` : "";
  const url = `https://${host}${event.rawPath}${query}`;

  const method = event.requestContext.http.method;
  const hasBody = method !== "GET" && method !== "HEAD" &&
    event.body !== undefined;
  const body = hasBody
    ? (event.isBase64Encoded
      ? Uint8Array.from(atob(event.body!), (c) => c.charCodeAt(0))
      : event.body!)
    : undefined;
  return new Request(url, { method, headers, body });
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export async function toResult(response: Response): Promise<HttpApiResult> {
  const headers: Record<string, string> = {};
  for (const [name, value] of response.headers) {
    if (name !== "set-cookie") headers[name] = value;
  }
  // The body is always sent base64-encoded: it may be binary (images, audio).
  const bytes = new Uint8Array(await response.arrayBuffer());
  return {
    statusCode: response.status,
    headers,
    cookies: response.headers.getSetCookie(),
    body: toBase64(bytes),
    isBase64Encoded: true,
  };
}

/** A fixed-time comparison, so the secret can't be guessed byte by byte. */
function sameSecret(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export type FetchHandler = (
  request: Request,
  info: Deno.ServeHandlerInfo<Deno.NetAddr>,
) => Response | Promise<Response>;

/**
 * A Lambda handler that serves HTTP API events with `fetch`. With an
 * `originSecret`, requests without that `x-origin-secret` header get a 403.
 */
export function httpApiHandler(
  fetch: FetchHandler,
  options: { originSecret?: string } = {},
) {
  return async (event: unknown): Promise<HttpApiResult> => {
    const apiEvent = event as HttpApiEvent;
    const { originSecret } = options;
    if (
      originSecret &&
      !sameSecret(apiEvent.headers?.[ORIGIN_SECRET_HEADER] ?? "", originSecret)
    ) {
      return {
        statusCode: 403,
        headers: { "content-type": "text/plain" },
        cookies: [],
        body: "Forbidden",
        isBase64Encoded: false,
      };
    }
    const remoteAddr: Deno.NetAddr = {
      transport: "tcp",
      hostname: clientIp(apiEvent),
      port: 0,
    };
    const response = await fetch(toRequest(apiEvent), {
      remoteAddr,
      completed: Promise.resolve(),
    });
    return toResult(response);
  };
}
