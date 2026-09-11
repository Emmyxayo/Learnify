/**
 * Nigeria-first formatting. Every figure the creator sees is Naira,
 * every date is WAT, every phone number is +234 unless stated.
 */

export function formatNaira(kobo: number, opts?: { compact?: boolean }): string {
  const naira = kobo / 100;
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
    notation: opts?.compact ? "compact" : "standard",
  }).format(naira);
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Africa/Lagos",
  }).format(new Date(iso));
}

export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("en-NG", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Africa/Lagos",
  }).format(new Date(iso));
}

/** +2348012345678 -> 0801 234 5678 */
export function formatPhone(e164: string): string {
  const local = e164.replace(/^\+234/, "0");
  return local.replace(/(\d{4})(\d{3})(\d{4})/, "$1 $2 $3");
}

export function formatCount(n: number): string {
  return new Intl.NumberFormat("en-NG", { notation: "compact" }).format(n);
}
