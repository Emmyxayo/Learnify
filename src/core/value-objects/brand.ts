/**
 * A creator's brand colour, expanded into the ramp the tokens need.
 *
 * Overriding --brand alone is not multi-tenancy, it is decoration: the
 * CTA turns the creator's colour while every tinted pill, hover state
 * and border below it stays Learnify teal. The whole ramp has to move
 * together, so one stored hex has to produce all of it.
 *
 * Derived here rather than with color-mix() in CSS for two reasons.
 * color-mix needs Chrome 111 / Safari 16.2, and when it is missing the
 * declaration is dropped silently — leaving a mismatched page on
 * exactly the old Android WebView a sales page is most likely to open
 * in. And the readable-text decision below cannot be expressed in CSS
 * at all; it is a branch, not a blend.
 *
 * No colour literals leave this file. The fallback for "creator has
 * not picked one" is null, which means emit nothing and let :root
 * stand — so Learnify's own values are never copied into TypeScript
 * where they could drift from globals.css.
 */

/* --- The mix ratios --------------------------------------------
   Not invented. Solved from Learnify's own tokens: --brand #0E7C6B
   against --brand-subtle, --brand-border and --brand-hover gives a
   consistent ratio per channel, which is how you can tell the
   original ramp was built by sRGB mixing in the first place.

   resolveBrand("#0E7C6B") therefore reproduces globals.css to within
   one unit per channel. That is the check that says this derivation
   matches the designer's intent rather than merely looking plausible.
   -------------------------------------------------------------- */

const TOWARD_WHITE_SUBTLE = 0.888;
const TOWARD_WHITE_BORDER = 0.73;
const TOWARD_BLACK_HOVER = 0.2;

/**
 * Relative luminance above which --ink reads better than white.
 *
 * Solved for --ink (#0F1A24, luminance 0.0097) rather than for pure
 * black, so it is the real crossover for this palette:
 *   (L + 0.05) / (0.0097 + 0.05) = 1.05 / (L + 0.05)  ->  L = 0.200
 *
 * A creator who picks a gold or a light green gets ink on their
 * buttons. White would be about 1.6:1, which is not a button.
 */
const INK_CROSSOVER = 0.2;

export interface BrandRamp {
  brand: string;
  brandHover: string;
  brandSubtle: string;
  brandBorder: string;
  /** A token reference, not a colour — nothing here invents a hex. */
  onBrand: "var(--ink)" | "var(--surface-raised)";
}

type Rgb = { r: number; g: number; b: number };

/** #abc and #aabbcc, with or without the hash. Anything else is null. */
export function parseHex(input: string): Rgb | null {
  const hex = input.trim().replace(/^#/, "").toLowerCase();
  if (!/^[0-9a-f]{3}$|^[0-9a-f]{6}$/.test(hex)) return null;

  const full =
    hex.length === 3
      ? hex
          .split("")
          .map((c) => c + c)
          .join("")
      : hex;

  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

const toHex = ({ r, g, b }: Rgb) =>
  "#" +
  [r, g, b]
    .map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, "0"))
    .join("");

const mixWhite = ({ r, g, b }: Rgb, t: number): Rgb => ({
  r: r + (255 - r) * t,
  g: g + (255 - g) * t,
  b: b + (255 - b) * t,
});

const mixBlack = ({ r, g, b }: Rgb, t: number): Rgb => ({
  r: r * (1 - t),
  g: g * (1 - t),
  b: b * (1 - t),
});

/** WCAG 2.1 relative luminance. */
export function relativeLuminance({ r, g, b }: Rgb): number {
  const channel = (value: number) => {
    const s = value / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG contrast ratio between two colours, 1 to 21. */
export function contrastRatio(a: Rgb, b: Rgb): number {
  const [light, dark] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (light! + 0.05) / (dark! + 0.05);
}

/**
 * The creator's colour, expanded.
 *
 * Null in, null out — and null out means the page renders no override
 * at all, so :root applies and the page is Learnify teal. A malformed
 * hex takes the same path rather than throwing: a typo in a creator's
 * config should cost them their branding, not their sales page.
 */
export function resolveBrand(hex: string | null | undefined): BrandRamp | null {
  if (!hex) return null;
  const rgb = parseHex(hex);
  if (!rgb) return null;

  return {
    brand: toHex(rgb),
    brandHover: toHex(mixBlack(rgb, TOWARD_BLACK_HOVER)),
    brandSubtle: toHex(mixWhite(rgb, TOWARD_WHITE_SUBTLE)),
    brandBorder: toHex(mixWhite(rgb, TOWARD_WHITE_BORDER)),
    onBrand: relativeLuminance(rgb) > INK_CROSSOVER ? "var(--ink)" : "var(--surface-raised)",
  };
}

/**
 * The ramp as the custom properties [data-tenant] expects.
 *
 * Returns undefined for no branding so the wrapper can omit the style
 * attribute entirely rather than emitting an empty one.
 */
export function brandStyle(ramp: BrandRamp | null): Record<string, string> | undefined {
  if (!ramp) return undefined;
  return {
    "--brand": ramp.brand,
    "--brand-hover": ramp.brandHover,
    "--brand-subtle": ramp.brandSubtle,
    "--brand-border": ramp.brandBorder,
    "--on-brand": ramp.onBrand,
  };
}

/**
 * How readable the text resolveBrand picked will be on this colour.
 *
 * Takes the two candidate text colours as arguments rather than
 * naming them, because their real values live in globals.css and
 * this file is the one place in the product that has sworn off
 * colour literals. The caller reads --ink and --surface-raised off
 * the document and passes them in, so the number shown to a creator
 * is computed against the token that will actually render.
 *
 * Null when the brand colour is not a colour.
 */
export function brandTextContrast(
  hex: string | null | undefined,
  tokens: { ink: string; onDark: string }
): { usesInk: boolean; ratio: number; rejected: number } | null {
  const rgb = parseHex(hex ?? "");
  const ramp = resolveBrand(hex);
  const ink = parseHex(tokens.ink);
  const onDark = parseHex(tokens.onDark);
  if (!rgb || !ramp || !ink || !onDark) return null;

  const usesInk = ramp.onBrand === "var(--ink)";
  const chosen = usesInk ? ink : onDark;
  const other = usesInk ? onDark : ink;

  return {
    usesInk,
    ratio: contrastRatio(rgb, chosen),
    rejected: contrastRatio(rgb, other),
  };
}
