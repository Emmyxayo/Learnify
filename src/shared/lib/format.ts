/**
 * Nigeria-first formatting. Every figure the creator sees is Naira,
 * every date is WAT, every phone number is +234 unless stated.
 */

export function formatNaira(kobo: number, opts?: { compact?: boolean }): string {
  const naira = kobo / 100;
  const compact = opts?.compact ?? false;
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    /* Standard notation shows whole naira — kobo on a revenue figure is
       noise. Compact keeps one decimal, because dropping it rounds
       1,691,000 to "₦2M" and a creator reading their own earnings will
       not forgive a number that is 18% wrong. Below a million the digit
       costs nothing: 45,000 is still "₦45K". */
    maximumFractionDigits: compact ? 1 : 0,
    notation: compact ? "compact" : "standard",
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

const RELATIVE = new Intl.RelativeTimeFormat("en-NG", { numeric: "auto" });

/** Largest unit first, so 90 minutes reads "2 hours ago", not "90 minutes ago". */
const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 31_536_000_000],
  ["month", 2_592_000_000],
  ["week", 604_800_000],
  ["day", 86_400_000],
  ["hour", 3_600_000],
  ["minute", 60_000],
];

/**
 * "18 minutes ago", "yesterday". Only for lists a creator reads as
 * a feed — anything they might quote back to a student gets
 * formatDate, because "last week" is not a date.
 *
 * Reads the clock, so it must not run during prerender. Every caller
 * so far renders from a query result, which by definition arrives on
 * the client.
 */
export function formatRelativeTime(iso: string, now: number = Date.now()): string {
  const diff = new Date(iso).getTime() - now;
  const abs = Math.abs(diff);

  for (const [unit, ms] of UNITS) {
    if (abs >= ms) return RELATIVE.format(Math.round(diff / ms), unit);
  }
  return "just now";
}

/** "2.4 MB". Decimal units, because that is what file managers show. */
export function formatBytes(bytes: number): string {
  if (bytes < 1000) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1000;
  let unit = 0;
  while (value >= 1000 && unit < units.length - 1) {
    value /= 1000;
    unit++;
  }
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`;
}

/** 247 -> "4:07". Media time, so minutes and seconds, never words. */
export function formatDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
