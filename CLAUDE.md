# Learnify — Frontend

WhatsApp-native learning commerce platform. Creators build courses,
sell them, and deliver lessons over WhatsApp. Students never install an app.
Nigeria-first: Naira, Paystack, WAT, phone-number identity.

## Stack
Next.js 15 App Router, TypeScript strict, Tailwind v4, TanStack Query v5, Zod.

## Architecture — clean layering, enforce it

src/core/           entities (Zod schemas), value objects, repository interfaces
                    IMPORTS NOTHING. No React, no Next, no fetch. Ever.
src/application/    use cases + TanStack Query hooks. "use client".
src/infrastructure/ mock/ and http/ repository impls + container.ts
src/presentation/   ui/ primitives, patterns/ composites
src/shared/         lib utilities
src/app/            routes only. ~15 lines. Compose a feature component, read params.

Rules:
- Components call hooks from src/application/, never repositories directly.
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
Mocks in src/infrastructure/mock/, seeded faker, jittered latency, injectable
errors via NEXT_PUBLIC_MOCK_ERROR_RATE. Always build loading, error and empty
states — the mocks exist to force this.

## Session
Session state is a cookie, never web storage, so it matches what the real
backend will issue. No component may read the cookie directly — the real
backend will make it httpOnly and JS will not be able to see it at all.
Session access goes through the repository port like every other read:
components call useSession() from src/application/auth/. The mock reads
document.cookie, the http impl calls GET /me, and nothing above
src/infrastructure/ changes.

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
