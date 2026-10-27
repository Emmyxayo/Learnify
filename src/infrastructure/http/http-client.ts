import { z } from "zod";
import type { Page } from "@core/value-objects/page";
import { paginated } from "./wire";

/**
 * The HTTP boundary.
 *
 * Everything the real backend needs that the mock never did lives
 * here, in one place, so no repository has to remember it: the bearer
 * token, the academy scope, DRF's error shapes and DRF's pagination
 * envelope.
 */

const BASE = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");

/**
 * A relative base means requests go through this app's own proxy at
 * /api/backend rather than straight to the API.
 */
const PROXIED = BASE.startsWith("/");

/**
 * Django wants a trailing slash on every path; Next, with its default
 * trailingSlash: false, does not want one on its own routes. A proxied
 * request is both at once — a Next route on the way in, a Django route
 * on the way out — and only one of them can win at the door.
 *
 * So the slash is dropped here and put back by the proxy. Letting Next
 * decide what to do with it instead means depending on whether it
 * redirects or refuses, which is framework behaviour that can change
 * under us and is invisible when it does. Going direct, the path is
 * left exactly as written.
 */
/**
 * Where the server sends its own requests.
 *
 * Deliberately not NEXT_PUBLIC_, so the var itself is never exposed
 * to the browser — same as the proxy route, which reads it too.
 *
 * The fallback literal does still ship: webpack compiles
 * `process.env.LEARNIFY_API_ORIGIN` to `undefined` for the client, so
 * the `??` arm survives in the bundle as dead code. That costs
 * nothing — the API host is public, it is printed in wire.ts, and the
 * browser never reads this constant, because the branch below that
 * uses it only runs where there is no `window`. Worth knowing before
 * anyone puts a secret on this line.
 */
const SERVER_ORIGIN = (
  process.env.LEARNIFY_API_ORIGIN ?? "https://api.learnifyng.tech"
).replace(/\/$/, "");

function resolve(path: string): string {
  if (!PROXIED) return `${BASE}${path}`;

  const [pathname, search] = path.split("?");
  const qs = search ? `?${search}` : "";

  /*
   * The server does not go through the proxy, and must not.
   *
   * `/api/backend` is relative, which a browser resolves against the
   * page it is on. A server component has no page and no origin, so
   * fetch throws `Failed to parse URL` before a request is made —
   * and every repository catches that and reports "not found". That
   * is what 404'd the whole public storefront: the academy page,
   * every course sales page and the enrol form are server-rendered,
   * so every link a creator shared led nowhere while the API served
   * all of it perfectly.
   *
   * It does not need the proxy either. CORS is a rule browsers
   * enforce on a page against its origin; there is no page here and
   * nothing to enforce it against. So the server calls the API
   * directly — trailing slash intact, because only the Next route
   * needed that stripped — and the proxy stays what it was built to
   * be: a door for the browser.
   */
  if (typeof window === "undefined") return `${SERVER_ORIGIN}${pathname}${qs}`;

  return `${BASE}${pathname!.replace(/\/+$/, "")}${qs}`;
}

/* ------------------------------------------------------------------ *
 * Ambient request context
 *
 * The access token and the active academy are set by the auth layer
 * and read here. They are module state rather than arguments because
 * every authenticated call needs both and threading them through each
 * repository method would put transport concerns into every port
 * signature.
 *
 * Nothing above src/infrastructure/ touches these. Components go
 * through useSession() exactly as before.
 * ------------------------------------------------------------------ */

let accessToken: string | null = null;
let activeAcademySlug: string | null = null;

export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

export const setActiveAcademy = (slug: string | null) => {
  activeAcademySlug = slug;
};

export const getActiveAcademy = () => activeAcademySlug;

/**
 * Called when a 401 survives one refresh attempt. The auth layer
 * registers a handler that clears the session and sends the person to
 * sign-in; the client itself has no opinion about routing.
 */
let onAuthFailure: (() => void) | null = null;
export const setAuthFailureHandler = (fn: (() => void) | null) => {
  onAuthFailure = fn;
};

/**
 * Supplied by the auth layer: exchanges the stored refresh token for a
 * new access token and returns it, or null if that fails too.
 */
let refreshAccessToken: (() => Promise<string | null>) | null = null;
export const setTokenRefresher = (fn: (() => Promise<string | null>) | null) => {
  refreshAccessToken = fn;
};

/* ------------------------------------------------------------------ *
 * Errors
 * ------------------------------------------------------------------ */

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    /** Field name to messages, for form-level display. */
    public fieldErrors: Record<string, string[]> = {},
    public body?: unknown,
    /**
     * The backend's own machine-readable code, when it sends one —
     * "email_not_verified", "validation_error". A screen that has to
     * branch on WHICH failure happened reads this; matching on the
     * message would break the moment someone rewords it.
     */
    public code?: string
  ) {
    super(message);
    this.name = "ApiError";
  }

  /** The message for this field, if the server rejected it by name. */
  forField(name: string): string | undefined {
    return this.fieldErrors[name]?.[0];
  }
}

/** first_name -> "First name". The wire's spelling is not a person's. */
function labelFor(field: string): string {
  const words = field.replace(/_/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** Pulls {field: ["msg"]} out of whatever object holds it. */
function collectFieldErrors(record: Record<string, unknown>) {
  const fieldErrors: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(record)) {
    if (Array.isArray(value)) fieldErrors[key] = value.map(String);
    else if (typeof value === "string") fieldErrors[key] = [value];
  }
  return fieldErrors;
}

/**
 * Failure arrives in four shapes and the difference is not meaningful
 * to a person, so a form never has to guess which one it got.
 *
 * The first is this backend's own and is NOT in its OpenAPI document,
 * which declares only `{detail}`:
 *
 *   {"error": {"code": "validation_error",
 *              "message": "Validation failed.",
 *              "details": {"email": ["This field is required."]}}}
 *
 * The other three are DRF's defaults, still reachable from anything
 * that raises before the custom handler runs: `{detail}` for most
 * errors, `{field: [...]}` for serializer validation, and
 * `{non_field_errors: [...]}` for rules spanning fields.
 */
function normaliseError(status: number, body: unknown): ApiError {
  if (!body || typeof body !== "object") {
    return new ApiError(status, `Request failed (${status})`, {}, body);
  }

  const record = body as Record<string, unknown>;

  // This backend's envelope.
  const envelope = record.error;
  if (envelope && typeof envelope === "object") {
    const e = envelope as Record<string, unknown>;
    const details =
      e.details && typeof e.details === "object"
        ? collectFieldErrors(e.details as Record<string, unknown>)
        : {};

    /* The field errors first, because the envelope's message is a
       category and theirs is the reason. A bad sign-up answers

         message: "Validation failed."
         details: {email: ["An account with this email already
                            exists."]}

       and showing the first of those is how somebody learns to go and
       sign in instead. The envelope message stands in only when there
       are no details to be more specific than it.

       Joined rather than first-only: the serializer reports every
       field it objected to in one response, and fixing them one
       round-trip at a time is the worst way to find that out. */
    const spelled = Object.entries(details)
      .map(([field, messages]) =>
        // One rejection speaks for itself. Several need saying which
        // is which, or "This field is required." twice over is the
        // whole message.
        Object.keys(details).length > 1
          ? `${labelFor(field)}: ${messages[0]}`
          : messages[0]
      )
      .filter(Boolean);

    const summary =
      spelled.join(" ") ||
      (typeof e.message === "string" && e.message) ||
      `Request failed (${status})`;

    return new ApiError(
      status,
      summary,
      details,
      body,
      typeof e.code === "string" ? e.code : undefined
    );
  }

  if (typeof record.detail === "string") {
    return new ApiError(status, record.detail, {}, body);
  }

  const fieldErrors = collectFieldErrors(record);
  const summary =
    fieldErrors.non_field_errors?.[0] ??
    Object.values(fieldErrors)[0]?.[0] ??
    `Request failed (${status})`;

  return new ApiError(status, summary, fieldErrors, body);
}

/* ------------------------------------------------------------------ *
 * The request
 * ------------------------------------------------------------------ */

export interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  /** Skip the Authorization header — for login, register and /public/. */
  anonymous?: boolean;
  /** Skip the X-Academy header on a call that is not academy-scoped. */
  unscoped?: boolean;
  /** Already a FormData: let the browser set its own multipart boundary. */
  form?: FormData;
}

function buildHeaders(options: RequestOptions): Headers {
  const headers = new Headers(options.headers);

  // Not set for FormData — the browser must supply the boundary.
  if (!options.form && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (!options.anonymous && accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  // Studio endpoints are always scoped to one academy by this header.
  // A user can belong to several, so without it the backend cannot
  // know which one a request is about.
  if (!options.unscoped && activeAcademySlug) {
    headers.set("X-Academy", activeAcademySlug);
  }

  return headers;
}

async function send(path: string, options: RequestOptions): Promise<Response> {
  const { body, form, anonymous, unscoped, ...init } = options;
  void anonymous;
  void unscoped;

  return fetch(resolve(path), {
    ...init,
    headers: buildHeaders(options),
    body: form ?? (body === undefined ? undefined : JSON.stringify(body)),
  });
}

/**
 * At most one refresh in flight, however many requests want one.
 *
 * This backend rotates refresh tokens and blacklists the old one:
 * refreshing with R returns a new R2 and makes R permanently
 * invalid — a second call with R answers 401 token_not_valid.
 *
 * Every screen here opens several authenticated requests at once,
 * and after a reload the access token is gone (it lives in memory by
 * design), so they all 401 together. Each one then refreshed on its
 * own: the first rotated the token, and every other one presented
 * the token that rotation had just killed, got a 401, and called
 * onAuthFailure — which clears the session. So a reload signed the
 * person out, sometimes after appearing to work, because the render
 * came from the one request that won the race.
 *
 * Coalescing fixes it. The first 401 starts the refresh, the rest
 * await the same promise, and the rotated token is written once.
 */
let refreshInFlight: Promise<string | null> | null = null;

function refreshOnce(): Promise<string | null> {
  /*
   * Deliberately `Promise.resolve().then(...)` rather than an async
   * IIFE. The work has to start in a microtask, strictly after the
   * assignment below has happened: an async IIFE begins running the
   * moment it is created, so if the refresher ever threw
   * synchronously its `finally` would clear this slot BEFORE `??=`
   * filled it, leaving a rejected promise latched here for the rest
   * of the session and every later refresh handed that same
   * rejection. Today's refresher cannot throw that way; a future one
   * should not be able to break the session by starting to.
   */
  refreshInFlight ??= Promise.resolve()
    .then(() => refreshAccessToken!())
    .finally(() => {
      /* Cleared as this settles, so a later 401 — an access token
         that has genuinely aged out — starts a fresh refresh rather
         than being handed this one's stale answer. */
      refreshInFlight = null;
    });

  return refreshInFlight;
}

/**
 * One request, with a single refresh retry on 401.
 *
 * Exactly one: a refresh that itself returns 401 means the refresh
 * token is dead too, and retrying past that is a loop that ends in a
 * rate limit rather than a session.
 */
export async function request<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  let res = await send(path, options);

  if (res.status === 401 && !options.anonymous && refreshAccessToken) {
    const fresh = await refreshOnce();
    if (fresh) {
      accessToken = fresh;
      res = await send(path, options);
    }
    if (res.status === 401) {
      onAuthFailure?.();
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => undefined);
    throw normaliseError(res.status, body);
  }

  // 204 and friends.
  if (res.status === 204 || res.headers.get("content-length") === "0") {
    return undefined as T;
  }

  return (await res.json()) as T;
}

/** Parses the response through a schema, so drift throws here. */
export async function requestParsed<S extends z.ZodTypeAny>(
  schema: S,
  path: string,
  options: RequestOptions = {}
): Promise<z.infer<S>> {
  return schema.parse(await request<unknown>(path, options));
}

/**
 * A paginated list, unwrapped into the domain's Page shape.
 *
 * `count` survives the unwrap, which is the whole reason Page exists —
 * a bare array loses the total and every caller then has to guess it
 * from the rows in hand.
 */
export async function requestPage<S extends z.ZodTypeAny>(
  itemSchema: S,
  path: string,
  options: RequestOptions = {}
): Promise<Page<z.infer<S>>> {
  const raw = await request<unknown>(path, options);
  const parsed = paginated(itemSchema).parse(raw);
  return {
    items: parsed.results,
    count: parsed.count,
    next: parsed.next,
    previous: parsed.previous,
  };
}

/** Drops undefined and empty values so they never reach the query string. */
export function query(params: Record<string, string | number | undefined>) {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") qs.set(key, String(value));
  }
  const s = qs.toString();
  return s ? `?${s}` : "";
}
