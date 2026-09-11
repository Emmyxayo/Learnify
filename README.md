# Learnify — Frontend

WhatsApp-native learning commerce platform. Next.js 15, TypeScript, Tailwind v4,
TanStack Query, clean architecture, mock data until the backend lands.

## Running it

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000 — it renders a token and component proof sheet.
Delete `src/app/page.tsx` once real routes exist.

## Layers

```
src/core/            entities, value objects, repository interfaces
                     imports nothing — no React, no Next, no fetch
src/application/     use cases + TanStack Query hooks
src/infrastructure/  mock/ and http/ implementations + container
src/presentation/    ui/ primitives, patterns/ composites
src/app/             routes only, ~15 lines each
```

Two rules keep this honest:

1. **`core/` imports nothing.** If it reaches for React, the layering broke.
2. **`app/` files stay thin.** They compose a feature component and read route
   params. Logic lives below.

## Switching off the mocks

`.env.local`:

```
NEXT_PUBLIC_DATA_SOURCE=api
NEXT_PUBLIC_API_URL=https://api.learnify.com/v1
```

That is the whole migration. `src/infrastructure/container.ts` is the only file
that knows which implementation is live.

## Mocks that lie realistically

`NEXT_PUBLIC_MOCK_LATENCY_MS` adds jittered delay; `NEXT_PUBLIC_MOCK_ERROR_RATE`
(0–1) injects failures. Set the error rate to `0.3` occasionally and fix
whatever breaks — mocks that always succeed produce a UI with no error states.

Fixtures are seeded (`faker.seed(20260911)`), so data is identical across
reloads. Screenshots and diffs stay stable.

## The API contract

`src/core/entities/*.ts` and `src/core/ports/*.ts` are the backend spec. Hand
them over. HTTP responses are parsed through the same Zod schemas the mocks
satisfy, so drift surfaces as a loud, located error rather than `undefined`
three components deep.

## Design tokens

All in `src/app/globals.css`. Never hardcode a hex in a component.

Two layers on purpose: `:root` holds raw custom properties, `@theme inline`
maps them to Tailwind utilities. Because utilities resolve through `var()`,
per-creator branding works by overriding on a wrapper:

```tsx
<div data-tenant style={{ "--brand": creator.brandColor } as React.CSSProperties}>
```

The deep teal (`--deep`) is reserved. It means "WhatsApp is happening here" —
live engine, delivery queue, broadcast composer, scheduler. Not decoration.

## Build order

1. ~~Tokens, primitives, app shell~~ (started)
2. ~~Entities, ports, mock repositories~~ (started)
3. Auth + onboarding wizard — phone/OTP first, email secondary
4. Creator dashboard
5. Courses list, then the course builder
6. Schedule, pricing, publish
7. Students + submissions + grading
8. Certificates + public verification
9. Public sales page + checkout
10. Settings + billing
