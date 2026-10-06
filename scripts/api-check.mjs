#!/usr/bin/env node
/**
 * Does this frontend's environment actually work against the backend?
 *
 *   npm run api:check
 *   npm run api:check -- --origin=https://my-codespace-3000.app.github.dev
 *   npm run api:check -- --identifier=+2348031234567 --password=...
 *
 * Three layers, each only run when the one before it passed, because a
 * failure in the first makes every later result meaningless noise:
 *
 *   1. Reachability and CORS, from the origin the browser will use.
 *   2. The public endpoints a signed-out student hits.
 *   3. With credentials: sign-in, then every authenticated endpoint
 *      the studio depends on.
 *
 * It writes nothing and creates nothing. The one exception is the
 * sign-in itself, which mints a token that is held in memory for the
 * run and never printed.
 */

import { readFileSync, existsSync } from "node:fs";

/* ------------------------------------------------------------------ *
 * Configuration
 * ------------------------------------------------------------------ */

function readEnvFile(path) {
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (match) out[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
  return out;
}

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, ...rest] = a.replace(/^--/, "").split("=");
    return [k, rest.join("=") || true];
  })
);

const env = { ...readEnvFile(".env.local"), ...readEnvFile(".env") };

/*
 * When NEXT_PUBLIC_API_URL is relative the app is proxying through
 * itself, so the thing worth checking is the API behind the proxy —
 * and CORS no longer applies to it at all.
 */
const configured = args.base ?? env.NEXT_PUBLIC_API_URL ?? "https://api.learnifyng.tech";
const PROXIED = configured.startsWith("/");
const BASE = (
  PROXIED ? (env.LEARNIFY_API_ORIGIN ?? "https://api.learnifyng.tech") : configured
).replace(/\/$/, "");

/**
 * The origin the browser will send. Codespaces exposes its own name,
 * so the common case needs no argument.
 */
const ORIGIN =
  args.origin ??
  (process.env.CODESPACE_NAME
    ? `https://${process.env.CODESPACE_NAME}-3000.${process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN ?? "app.github.dev"}`
    : "http://localhost:3000");

/* ------------------------------------------------------------------ *
 * Reporting
 * ------------------------------------------------------------------ */

const c = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  bold: "\x1b[1m",
};

let failures = 0;
let warnings = 0;

const pass = (label, detail = "") =>
  console.log(`  ${c.green}ok${c.reset}    ${label}${detail ? `  ${c.dim}${detail}${c.reset}` : ""}`);

const warn = (label, detail = "") => {
  warnings += 1;
  console.log(`  ${c.yellow}warn${c.reset}  ${label}${detail ? `  ${c.dim}${detail}${c.reset}` : ""}`);
};

const fail = (label, detail = "") => {
  failures += 1;
  console.log(`  ${c.red}FAIL${c.reset}  ${label}${detail ? `  ${c.dim}${detail}${c.reset}` : ""}`);
};

const section = (title) => console.log(`\n${c.bold}${title}${c.reset}`);

/* ------------------------------------------------------------------ *
 * Requests
 * ------------------------------------------------------------------ */

let accessToken = null;
let academySlug = null;

async function call(path, { method = "GET", body, auth = false, academy = false } = {}) {
  const headers = { Origin: ORIGIN };
  if (body) headers["Content-Type"] = "application/json";
  if (auth && accessToken) headers.Authorization = `Bearer ${accessToken}`;
  if (academy && academySlug) headers["X-Academy"] = academySlug;

  try {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
    return { ok: res.ok, status: res.status, json, text, headers: res.headers };
  } catch (error) {
    return { ok: false, status: 0, error: String(error?.message ?? error) };
  }
}

/** One line of context for a failing response, never the whole body. */
const why = (r) =>
  r.status === 0
    ? r.error
    : r.json?.detail
      ? `${r.status} — ${r.json.detail}`
      : `${r.status}${r.text ? ` — ${r.text.slice(0, 90)}` : ""}`;

/* ------------------------------------------------------------------ *
 * 1. Reachability and CORS
 * ------------------------------------------------------------------ */

async function checkTransport() {
  section(`1. Reachability and CORS   ${c.dim}origin ${ORIGIN}${c.reset}`);

  const reach = await call("/api/v1/academies/slug-available/?slug=connectivity-probe");
  if (reach.status === 0) {
    fail("Cannot reach the API", reach.error);
    console.log(
      `\n  ${c.dim}Nothing below this can run. Check the host, and that this machine has outbound access to it.${c.reset}`
    );
    return false;
  }
  pass("API reachable", `${BASE} responded ${reach.status}`);

  // The real question: will a browser on THIS origin be allowed to read
  // the response? Node ignores CORS, so the header is read directly.
  const pre = await fetch(`${BASE}/api/v1/auth/otp/request/`, {
    method: "OPTIONS",
    headers: {
      Origin: ORIGIN,
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "content-type,authorization,x-academy",
    },
  }).catch(() => null);

  if (!pre) {
    fail("Preflight failed outright");
    return false;
  }

  if (PROXIED) {
    pass(
      "CORS not applicable",
      `the app proxies through ${configured}, so the browser never goes cross-origin`
    );
    return true;
  }

  const allowOrigin = pre.headers.get("access-control-allow-origin");
  const allowHeaders = (pre.headers.get("access-control-allow-headers") ?? "").toLowerCase();

  if (allowOrigin === ORIGIN || allowOrigin === "*") {
    pass("CORS allows this origin", allowOrigin);
  } else {
    fail(
      "CORS does NOT allow this origin",
      `sent ${ORIGIN}, got back ${allowOrigin ?? "no header"}`
    );
    console.log(
      `\n  ${c.dim}Every browser request will be blocked before it reaches the app.${c.reset}`
    );
    console.log(
      `  ${c.dim}Backend fix: add ${ORIGIN} to CORS_ALLOWED_ORIGINS.${c.reset}`
    );
    console.log(
      `\n  ${c.dim}You do not have to wait for it. CORS is a browser rule, not a${c.reset}`
    );
    console.log(
      `  ${c.dim}server one, so proxy through this app instead — in .env.local:${c.reset}`
    );
    console.log(`    ${c.dim}NEXT_PUBLIC_API_URL=/api/backend${c.reset}`);
    console.log(`    ${c.dim}LEARNIFY_API_ORIGIN=${BASE}${c.reset}`);
  }

  for (const header of ["authorization", "content-type", "x-academy"]) {
    if (allowHeaders.includes(header)) pass(`CORS allows ${header}`);
    else fail(`CORS blocks ${header}`, "studio calls need it");
  }

  return failures === 0;
}

/* ------------------------------------------------------------------ *
 * 2. Public surface
 * ------------------------------------------------------------------ */

async function checkPublic() {
  section("2. Public endpoints   (what a signed-out student hits)");

  const slug = await call("/api/v1/academies/slug-available/?slug=connectivity-probe");
  if (slug.ok && typeof slug.json?.available === "boolean") {
    pass("slug-available", "shape matches wire.ts");
  } else {
    fail("slug-available", why(slug));
  }

  if (args.academy) {
    const academy = await call(`/api/v1/public/academies/${args.academy}/`);
    if (academy.ok) pass(`public academy ${args.academy}`, academy.json?.name ?? "");
    else fail(`public academy ${args.academy}`, why(academy));

    const courses = await call(`/api/v1/public/academies/${args.academy}/courses/`);
    if (courses.ok) {
      pass("public course list", `${courses.json?.count ?? 0} published`);
    } else {
      fail("public course list", why(courses));
    }
  } else {
    warn(
      "public academy and course list not checked",
      "pass --academy=<slug> once one exists"
    );
  }
}

/* ------------------------------------------------------------------ *
 * 3. Authenticated surface
 * ------------------------------------------------------------------ */

async function checkAuth() {
  section("3. Signing in");

  if (!args.identifier) {
    warn(
      "skipped",
      "pass --identifier=<phone or email> and either --password or --code"
    );
    console.log(
      `\n  ${c.dim}Without credentials nothing below the public surface can be checked.${c.reset}`
    );
    console.log(
      `  ${c.dim}No account yet? The backend requires email and password to register:${c.reset}`
    );
    console.log(
      `  ${c.dim}POST ${BASE}/api/v1/auth/register/ — try it in ${BASE}/api/docs/${c.reset}`
    );
    return false;
  }

  // Password and OTP are both offered because which one works is
  // exactly what is in question: OTP needs a delivery provider wired
  // up on the backend, and password does not.
  const [path, body] = args.password
    ? ["/api/v1/auth/login/", { identifier: args.identifier, password: args.password }]
    : ["/api/v1/auth/otp/login/", { identifier: args.identifier, code: String(args.code ?? "") }];

  const login = await call(path, { method: "POST", body });

  if (!login.ok) {
    fail(`sign in via ${path}`, why(login));
    return false;
  }
  if (!login.json?.access) {
    fail("sign in returned no access token", "shape does not match AuthResponse");
    return false;
  }

  accessToken = login.json.access;
  academySlug = login.json.academies?.[0]?.slug ?? null;

  pass("signed in", `${login.json.academies?.length ?? 0} academies`);
  if (academySlug) pass("active academy", academySlug);
  else warn("no academy on this account", "create one at /setup/academy");

  return true;
}

async function checkOtpDelivery() {
  if (!args.identifier || args.password) return;

  section("OTP delivery");
  const req = await call("/api/v1/auth/otp/request/", {
    method: "POST",
    body: { identifier: args.identifier, purpose: "login" },
  });

  if (req.ok) {
    pass("otp/request accepted", `${req.status} — check whether a code actually arrives`);
  } else {
    fail("otp/request refused", why(req));
  }
}

async function checkStudio() {
  section("4. Studio   (scoped by X-Academy)");

  const me = await call("/api/v1/auth/me/", { auth: true });
  if (me.ok && me.json?.user) pass("auth/me", me.json.user.phone ?? me.json.user.email ?? "");
  else fail("auth/me", why(me));

  const academies = await call("/api/v1/academies/", { auth: true });
  if (academies.ok) pass("academies", `${academies.json?.count ?? 0}`);
  else fail("academies", why(academies));

  if (!academySlug) {
    warn("studio checks skipped", "no academy to scope to");
    return;
  }

  const onboarding = await call(`/api/v1/academies/${academySlug}/onboarding/`, { auth: true });
  if (onboarding.ok) {
    const steps = onboarding.json?.steps ?? [];
    pass(
      "onboarding",
      `${steps.filter((s) => s.done).length}/${steps.length} done — keys: ${steps.map((s) => s.key).join(", ") || "none"}`
    );
  } else {
    fail("onboarding", why(onboarding));
  }

  const courses = await call("/api/v1/studio/courses/", { auth: true, academy: true });
  if (!courses.ok) {
    fail("studio courses", why(courses));
    return;
  }
  pass("studio courses", `${courses.json?.count ?? 0}`);

  const first = courses.json?.results?.[0];
  if (!first) {
    warn("course-level checks skipped", "no courses yet — create one and re-run");
    return;
  }

  const detail = await call(`/api/v1/studio/courses/${first.id}/`, { auth: true, academy: true });
  if (detail.ok) {
    pass("course detail", `${detail.json?.modules?.length ?? 0} modules`);
  } else {
    fail("course detail", why(detail));
  }

  const blockers = await call(`/api/v1/studio/courses/${first.id}/publish-check/`, {
    auth: true,
    academy: true,
  });
  if (blockers.ok) {
    const list = blockers.json?.blockers ?? [];
    pass("publish-check", list.length ? list.join(" | ") : "nothing blocking");
  } else {
    fail("publish-check", why(blockers));
  }

  const roster = await call(`/api/v1/studio/courses/${first.id}/students/`, {
    auth: true,
    academy: true,
  });
  if (roster.ok) pass("roster", `${roster.json?.count ?? 0} enrolled`);
  else fail("roster", why(roster));
}

async function checkLearn() {
  section("5. Student portal   (unscoped)");

  const enrolments = await call("/api/v1/learn/enrollments/", { auth: true });
  if (!enrolments.ok) {
    fail("learn/enrollments", why(enrolments));
    return;
  }
  pass("learn/enrollments", `${enrolments.json?.count ?? 0} enrolled`);

  const first = enrolments.json?.results?.[0];
  if (!first) {
    warn("lesson checks skipped", "this account is not enrolled in anything");
    return;
  }

  const detail = await call(`/api/v1/learn/enrollments/${first.id}/`, { auth: true });
  if (detail.ok) {
    const lessons = detail.json?.lessons ?? [];
    pass(
      "enrolment detail",
      `${lessons.length} lessons, ${lessons.filter((l) => l.available).length} unlocked`
    );
  } else {
    fail("enrolment detail", why(detail));
  }
}

/* ------------------------------------------------------------------ *
 * Run
 * ------------------------------------------------------------------ */

console.log(`\n${c.bold}Learnify — API check${c.reset}`);
console.log(`${c.dim}${BASE}${c.reset}`);

const transportOk = await checkTransport();

if (transportOk) {
  await checkPublic();
  await checkOtpDelivery();
  if (await checkAuth()) {
    await checkStudio();
    await checkLearn();
  }
}

console.log(
  `\n${failures === 0 ? c.green : c.red}${failures} failed${c.reset}, ${c.yellow}${warnings} skipped${c.reset}\n`
);

process.exit(failures === 0 ? 0 : 1);
