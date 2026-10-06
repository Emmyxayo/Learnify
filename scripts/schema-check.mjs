#!/usr/bin/env node
/**
 * Checks src/infrastructure/http/wire.ts against the live OpenAPI
 * document.
 *
 * wire.ts was hand-written from the schema because the environment it
 * was written in could not reach the API. This is the drift check:
 * run it from anywhere that can (a Codespace, your laptop) and it
 * reports schemas the backend has that wire.ts does not mention, and
 * fields that moved underneath it.
 *
 *   node scripts/schema-check.mjs
 *
 * Exits non-zero when something drifted, so CI can run it.
 */
import { readFileSync } from "node:fs";

const URL_ =
  process.env.LEARNIFY_SCHEMA_URL ??
  "https://api.learnifyng.tech/api/schema/?format=json";

const wire = readFileSync(
  new URL("../src/infrastructure/http/wire.ts", import.meta.url),
  "utf8"
);

const res = await fetch(URL_, { headers: { Accept: "application/json" } });
if (!res.ok) {
  console.error(`Could not read the schema: HTTP ${res.status}`);
  process.exit(2);
}
const schema = await res.json();

const problems = [];

// Which component schemas does wire.ts know about?
for (const [name, def] of Object.entries(schema.components.schemas)) {
  // Request bodies are plain interfaces in wire.ts under a different name.
  if (name.endsWith("Request")) continue;

  const known = wire.includes(`Wire${name}`) || wire.includes(`Wire${name.replace(/^Paginated|List$/g, "")}`);
  if (!known) {
    problems.push(`missing schema: ${name}`);
    continue;
  }

  for (const field of Object.keys(def.properties ?? {})) {
    // Every wire field appears verbatim; snake_case makes this reliable.
    if (!wire.includes(field)) {
      problems.push(`missing field: ${name}.${field}`);
    }
  }
}

// Enum values are the likeliest silent break.
for (const [name, def] of Object.entries(schema.components.schemas)) {
  if (!def.enum) continue;
  for (const value of def.enum) {
    if (!wire.includes(`"${value}"`)) {
      problems.push(`missing enum value: ${name} = ${value}`);
    }
  }
}

if (problems.length === 0) {
  console.log("wire.ts matches the live schema.");
  process.exit(0);
}

console.error(`wire.ts has drifted from the live schema (${problems.length}):\n`);
for (const p of problems) console.error("  " + p);
console.error("\nUpdate src/infrastructure/http/wire.ts to match.");
process.exit(1);
