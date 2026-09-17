/**
 * The account the public landing page demonstrates.
 *
 * Configuration, not a fixture. It lived in
 * infrastructure/mock/fixtures/courses.ts, which meant the marketing
 * route imported mock data directly — the exact reach past the
 * layering that CLAUDE.md forbids, and now that ESLint checks it, the
 * first thing it found.
 *
 * The dependency runs this way round: fixtures read config, config
 * knows nothing about fixtures. Point it at a seeded account when the
 * real backend lands and the landing page keeps working.
 */
export const DEMO_CREATOR_ID = process.env.NEXT_PUBLIC_DEMO_CREATOR_ID ?? "creator_001";
