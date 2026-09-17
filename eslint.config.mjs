import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

/* ============================================================
   The rules in CLAUDE.md, made checkable.

   Everything below was already a rule — enforced by reading diffs
   and remembering. That works until it doesn't: --radius-pill sat
   unmapped for weeks, getBySlug ignored its first argument, and the
   publish screen handed out a domain nobody owns. A rule a machine
   can check is a different kind of rule.

   eslint-config-next is eslintrc-shaped, so it comes in through
   FlatCompat rather than directly.
   ============================================================ */

/** #fff, #ffff, #ffffff, #ffffffff — but not #dialog-title. */
const HEX_COLOUR = String.raw`#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})(?![0-9a-zA-Z])`;

/** bg-emerald-600 and every other escape hatch out of the token layer. */
const TAILWIND_PALETTE = String.raw`\b(?:bg|text|border|ring|fill|stroke|from|via|to|decoration|outline|accent|caret|divide|placeholder|shadow)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|\d{3})\b`;

const COLOUR_MESSAGE =
  "Hardcoded colour. Use a design token from globals.css (bg-brand, text-ink, border-border, text-on-brand). " +
  "Per-creator branding overrides --brand on a wrapper, so a literal here cannot re-theme. " +
  "If this really is content rather than design — a creator's own hex, or another product's brand — " +
  "disable this rule on the line and say why.";

const colourRules = [
  { selector: `Literal[value=/${HEX_COLOUR}/]`, message: COLOUR_MESSAGE },
  { selector: `TemplateElement[value.raw=/${HEX_COLOUR}/]`, message: COLOUR_MESSAGE },
  { selector: `Literal[value=/${TAILWIND_PALETTE}/]`, message: COLOUR_MESSAGE },
  { selector: `TemplateElement[value.raw=/${TAILWIND_PALETTE}/]`, message: COLOUR_MESSAGE },
];

/** Session lives in a cookie the backend will make httpOnly. */
const WEB_STORAGE_KEYS = String.raw`session|token|auth|creator|otp|challenge|credential|phone|jwt`;

const sessionRules = [
  {
    selector: `CallExpression[callee.object.name=/^(localStorage|sessionStorage)$/][arguments.0.value=/${WEB_STORAGE_KEYS}/i]`,
    message:
      "Session state must not go in web storage — the real backend issues an httpOnly cookie that JS cannot read, " +
      "so this would work against the mock and break at integration. Go through the repository port (useSession). " +
      "Web storage is fine for UI preferences: a collapsed sidebar, a dismissed banner.",
  },
  {
    selector: "MemberExpression[object.name='document'][property.name='cookie']",
    message:
      "No component may touch document.cookie. The real backend will make it httpOnly and this will silently " +
      "read nothing. Session access goes through the repository port like every other read — useSession() " +
      "from src/application/auth/. Only src/infrastructure/ may implement it.",
  },
];

const LAYERING_MESSAGE =
  "Components reach data through src/application/ — hooks in client components, plain async functions in " +
  "server components. Never import a repository or the container directly.";

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),

  { ignores: [".next/**", "node_modules/**", "next-env.d.ts"] },

  /* --- Everywhere ------------------------------------------- */
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },

  /* --- core/ is a leaf --------------------------------------
     No framework, no transport, no layers above it. Standard
     platform types (File, Blob, URL, Date, Intl) are fine, which is
     why this bans modules rather than globals. */
  {
    files: ["src/core/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["react", "react-dom", "next", "next/*", "@tanstack/*"],
              message:
                "core/ has no framework dependencies. If this needs React it is not an entity — " +
                "it belongs in application/ or presentation/.",
            },
            {
              group: ["@infra/*", "@ui/*", "@app-layer/*", "@/infrastructure/*", "@/presentation/*"],
              message:
                "core/ is the bottom layer. Nothing above it may be imported from inside it — " +
                "that is what makes it testable without a browser.",
            },
          ],
        },
      ],
      "no-restricted-globals": [
        "error",
        { name: "fetch", message: "core/ has no transport. A repository port describes the call; it does not make it." },
        { name: "window", message: "core/ has no browser. Move this to presentation/." },
        { name: "document", message: "core/ has no browser. Move this to presentation/." },
        { name: "localStorage", message: "core/ has no browser, and session state never goes in web storage." },
      ],
      "no-restricted-syntax": ["error", ...sessionRules],
    },
  },

  /* --- application/ owns the container ----------------------- */
  {
    files: ["src/application/**/*.ts", "src/application/**/*.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@infra/mock/*", "@infra/http/*", "@/infrastructure/mock/*", "@/infrastructure/http/*"],
              message:
                "container.ts is the ONLY file that knows mock from http. Import { repositories } from " +
                "@infra/container instead — that is the seam the whole architecture turns on.",
            },
          ],
        },
      ],
      "no-restricted-syntax": ["error", ...sessionRules],
    },
  },

  /* --- presentation/ and app/ draw; they do not fetch --------- */
  {
    files: ["src/presentation/**/*.ts", "src/presentation/**/*.tsx", "src/app/**/*.ts", "src/app/**/*.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@infra/*", "@/infrastructure/*", "**/infrastructure/*"],
              message: LAYERING_MESSAGE,
            },
          ],
        },
      ],
      "no-restricted-syntax": ["error", ...colourRules, ...sessionRules],
    },
  },

  /* --- middleware runs on the edge --------------------------- */
  {
    files: ["src/middleware.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@infra/*", "@app-layer/*"],
              message:
                "Middleware runs on every request in the edge runtime. Keep it to headers and rewrites — " +
                "no repositories, no data.",
            },
          ],
        },
      ],
    },
  },
];

export default eslintConfig;
