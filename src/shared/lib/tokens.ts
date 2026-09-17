"use client";

/**
 * Reads a design token's computed value off the document.
 *
 * For the rare case that needs the actual colour rather than a class
 * that references it — the branding screen computes a contrast ratio,
 * and a number is not something a utility class can produce.
 *
 * Reading it rather than duplicating it means the ratio shown to a
 * creator is measured against whatever globals.css currently says,
 * and a token edit can never leave this quietly reporting the old
 * value. Returns null on the server, where there is no document.
 */
export function readToken(name: string): string | null {
  if (typeof window === "undefined") return null;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value.length > 0 ? value : null;
}
