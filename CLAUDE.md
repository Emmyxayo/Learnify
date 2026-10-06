# Learnify — Frontend

A course platform for Nigeria. Creators build a course, set a pace, and
publish it; students enrol with a phone number and the lessons release
themselves on schedule. Naira, WAT, phone-number identity, no app to install.

The product was designed WhatsApp-native and the backend does not deliver over
WhatsApp — it releases lessons to a web portal. Both the copy and the feature
flags reflect what ships, not what was planned. See "What the backend does not
have" below before writing anything that assumes otherwise.

## Stack
Next.js 15 App Router, TypeScript strict, Tailwind v4, TanStack Query v5, Zod.

## Architecture — clean layering, enforce it

src/core/           entities (Zod schemas), value objects, repository interfaces
                    core/ has no framework or transport dependencies — no React,
                    no Next, no fetch, no repository impls. Standard platform
                    types (File, Blob, URL, Date, Intl) are fine.
src/application/    use cases + TanStack Query hooks. "use client".
src/infrastructure/ mock/ and http/ repository impls + container.ts
src/presentation/   ui/ primitives, patterns/ composites
src/shared/         lib utilities
src/app/            routes only. ~15 lines. Compose a feature component, read params.

Rules:
- Components reach data through src/application/ — hooks in client components,
  plain async functions in server components. Never import a repository directly.
- container.ts is the ONLY file that knows mock vs http.
- New entity? Zod schema in core/entities, port in core/ports, both impls, then hooks.

## Design tokens
All in src/app/globals.css. NEVER hardcode a hex or a Tailwind colour literal
(no bg-emerald-600). Use token utilities: bg-brand, text-ink, border-border,
bg-surface-raised, bg-deep, text-on-deep.

Two layers: :root holds raw CSS custom properties, @theme inline maps them to
utilities. Per-creator branding overrides --brand on a wrapper, so utilities
must resolve through var().

--deep (dark teal) is RESERVED. It means "WhatsApp is happening here" — live
engine, delivery queue, broadcast composer, scheduler. Never decoration.

Radii vary by role: rounded-control (buttons/inputs), rounded-card, rounded-panel.

## Mobile first
Creators are pastors and coaches on Android phones over 3G. Design at 360px,
scale up. Not the other way round.

## Copy
Sentence case. Active voice. Plain verbs. Buttons say what happens
("Publish", not "Submit"). Errors say what broke and how to fix it, no apology.
Empty states invite an action.

## Data
Two sources, chosen by NEXT_PUBLIC_DATA_SOURCE in container.ts.

mock — seeded faker, jittered latency, injectable errors via
NEXT_PUBLIC_MOCK_ERROR_RATE. Always build loading, error and empty states; the
mocks exist to force this.

api — https://api.learnifyng.tech. Wire shapes live in
src/infrastructure/http/wire.ts, hand-written from the OpenAPI document and
checked with `npm run schema:check`. Core entities are the domain; wire types
are the transport. HTTP repos map between them in mappers.ts. Never let a
generated or wire type into core/.

Studio endpoints are scoped by an X-Academy header, set by the HTTP client.
Public and /learn/* endpoints are unscoped; public ones are anonymous too.
Every list is paginated — ports that map to one return Page<T>.

## What the backend does not have
Roughly half this frontend was built against a contract the API does not
implement: the AI course builder, quizzes, submissions and grading,
certificates, plans and commission, payments, and per-message WhatsApp
delivery state.

Those are gated in src/shared/lib/features.ts, not deleted — everything is on
against the mock and only what has endpoints is on against the API. When an
endpoint lands, set its NEXT_PUBLIC_FEATURE_* var to "1", then delete the flag
once it is no longer optional.

Do not build a screen that depends on one of these without gating it, and do
not make a claim in copy that a gated feature would have to be on to keep.

## Session
Components call useSession() from src/application/auth/ and never read a
cookie. That rule held through the JWT migration, which is the point of it.

Against the API the access token lives in memory and the refresh token in a
cookie (src/infrastructure/http/token-store.ts). A 401 refreshes once and
replays; a second 401 signs out. Only token-store.ts changes when the backend
starts issuing the refresh token httpOnly.

An academy is not the creator. A user can belong to several, each with a role,
and every studio call is scoped to one by header. mappers.ts builds a Creator
from Me + Academy as a compatibility seam — splitting Creator into User and
Academy is the real fix and is still outstanding.

## Don't
- Auth or session state in localStorage/sessionStorage. Cookies only, so it
  matches what the real backend will issue. localStorage IS fine for
  non-sensitive UI preferences (sidebar collapsed, table density, dismissed
  banners).
- Hardcoded colours
- Business logic in src/app/
- New deps without asking
- `any`

## Verify before claiming done
npm run typecheck && npm run build
