import { type NextRequest } from "next/server";

/**
 * A same-origin door to the backend.
 *
 * CORS is a rule browsers enforce on the page, not a rule servers
 * enforce on each other. When the API has not allowlisted this
 * deployment's origin, every request from the browser dies before it
 * is sent — but a request made by this server does not, because
 * there is no origin to compare.
 *
 * So the browser talks to /api/backend/… on the origin it was served
 * from, and this forwards it. Nothing about the frontend changes:
 * NEXT_PUBLIC_API_URL simply points here instead.
 *
 * Turn it on by setting, in .env.local:
 *
 *   NEXT_PUBLIC_API_URL=/api/backend
 *   LEARNIFY_API_ORIGIN=https://api.learnifyng.tech
 *
 * LEARNIFY_API_ORIGIN has no NEXT_PUBLIC_ prefix on purpose: it is
 * read here, on the server, and never inlined into the browser
 * bundle.
 *
 * This is a workaround, not the destination. Ask for the origin to be
 * added to CORS_ALLOWED_ORIGINS, then point NEXT_PUBLIC_API_URL back
 * at the API and this file stops being used. It is worth keeping
 * either way — in production it also keeps the API host out of the
 * client bundle.
 */

const ORIGIN = (
  process.env.LEARNIFY_API_ORIGIN ?? "https://api.learnifyng.tech"
).replace(/\/$/, "");

const PREFIX = "/api/backend";

/**
 * Hop-by-hop headers, plus the ones that describe the connection to
 * THIS server rather than the one being made to the backend. Passing
 * `host` on would have the API reject the request or, worse, build
 * absolute URLs pointing back here.
 */
const STRIP_REQUEST = new Set([
  "host",
  "connection",
  "keep-alive",
  "transfer-encoding",
  "upgrade",
  "proxy-authorization",
  "proxy-connection",
  "te",
  "trailer",
  // Set by the browser and meaningless server-to-server. Forwarding
  // it is what would re-introduce the CORS check this exists to avoid.
  "origin",
  "referer",
  // Next adds these; the backend has no use for them.
  "x-forwarded-host",
  "x-forwarded-proto",
]);

const STRIP_RESPONSE = new Set([
  "connection",
  "keep-alive",
  "transfer-encoding",
  "content-encoding",
  "content-length",
]);

async function proxy(request: NextRequest): Promise<Response> {
  /*
   * Taken from the URL rather than from the matched params.
   *
   * Django is strict about trailing slashes — /api/v1/auth/login/ and
   * /api/v1/auth/login are different URLs to it, and the second one
   * redirects or 404s. Joining the param segments drops that slash;
   * slicing the original path keeps it, along with the query string.
   */
  const url = new URL(request.url);
  const path = url.pathname.slice(PREFIX.length) || "/";
  const target = `${ORIGIN}${path}${url.search}`;

  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (!STRIP_REQUEST.has(key.toLowerCase())) headers.set(key, value);
  });

  const hasBody = request.method !== "GET" && request.method !== "HEAD";

  let response: Response;
  try {
    response = await fetch(target, {
      method: request.method,
      headers,
      // Streamed rather than buffered, so a lesson attachment does not
      // have to fit in this process's memory on its way through.
      body: hasBody ? request.body : undefined,
      // Required by undici whenever body is a stream.
      ...(hasBody ? { duplex: "half" } : {}),
      redirect: "manual",
      cache: "no-store",
    } as RequestInit);
  } catch (error) {
    // The backend is unreachable from this server. Said in the shape
    // the app already knows how to render, so it surfaces as a
    // message rather than a parse failure.
    return Response.json(
      {
        detail:
          "Could not reach the backend from this server. Check LEARNIFY_API_ORIGIN and that the API is up.",
        cause: String(error instanceof Error ? error.message : error),
      },
      { status: 502 }
    );
  }

  const out = new Headers();
  response.headers.forEach((value, key) => {
    if (!STRIP_RESPONSE.has(key.toLowerCase())) out.set(key, value);
  });

  // 204 and 304 must not carry one, and constructing them with a body
  // throws.
  const bodyless = response.status === 204 || response.status === 304;

  return new Response(bodyless ? null : response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: out,
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const HEAD = proxy;
export const OPTIONS = proxy;

/** Never cached, and never pre-rendered: every call is a live one. */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
