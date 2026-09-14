import { cn } from "@shared/lib/cn";
import { type Category } from "@core/entities/course";

/**
 * A cover every course already has.
 *
 * Nobody uploads artwork for a draft, and a wall of identical
 * graduation caps makes nine courses look like one. So the cover is
 * derived: the ground comes from the category, the layout from the
 * id. The same course is therefore always the same cover — on this
 * screen, in the marketplace, and in a screenshot taken last month.
 *
 * Shared with the public marketplace later, which is why it takes
 * loose fields rather than a Course.
 */

/**
 * One ground per category — none of them in the brand family.
 *
 * --brand means "interactive" everywhere else in this app: links, the
 * sidebar active state, primary buttons. A cover painted in it reads
 * as a control, and sitting a teal card next to a teal active nav
 * item makes both harder to see. --success is out for the same
 * reason at one remove: it is close enough to the brand teal that at
 * card size the two are hard to tell apart, and it is already spoken
 * for by the Published chip.
 *
 * So the set is built from the hues that carry no interactive
 * meaning: ink, info, accent, gold, warning, danger, and two subtle
 * grounds. --deep is excluded outright — it is reserved for WhatsApp
 * surfaces and must never be decoration.
 *
 * Ink colours are chosen for contrast against the ground, not by
 * habit: every pairing here clears 4.5:1, so a title stays legible
 * at the 16px it renders at on a phone.
 */
const GROUNDS: Record<Category, { ground: string; ink: string; wash: string }> = {
  business:     { ground: "bg-ink",            ink: "text-white", wash: "text-white/15" },
  technology:   { ground: "bg-info",           ink: "text-white", wash: "text-white/15" },
  ministry:     { ground: "bg-accent",         ink: "text-ink",   wash: "text-ink/15"   },
  "exam-prep":  { ground: "bg-gold",           ink: "text-ink",   wash: "text-ink/15"   },
  agriculture:  { ground: "bg-warning",        ink: "text-white", wash: "text-white/15" },
  healthcare:   { ground: "bg-danger",         ink: "text-white", wash: "text-white/15" },
  vocational:   { ground: "bg-accent-subtle",  ink: "text-ink",   wash: "text-ink/10"   },
  leadership:   { ground: "bg-info-subtle",    ink: "text-ink",   wash: "text-ink/10"   },
};

/**
 * Three placements, all fully inside the frame.
 *
 * The monogram used to bleed off the edge, and because it is text the
 * bleed landed at a different point for every pair of letters — "PF"
 * and "SM" were sliced mid-stroke while narrower pairs cleared it.
 * A crop that moves with glyph width cannot be made deliberate, so
 * the monogram is now contained instead: it is sized in cqw against
 * the cover, which means it holds the same proportion at 360px and
 * on a three-column desktop grid, and the widest pair of capitals
 * still clears both edges.
 */
const LAYOUTS = [
  "left-[6%] top-[7%]",
  "right-[6%] top-[7%]",
  "left-1/2 top-[9%] -translate-x-1/2",
] as const;

/** Stable index from a string. Same id in, same cover out, forever. */
function pick(seed: string, count: number): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % count;
}

/** "WAEC Mathematics Preparation" -> "WM". Skips the small words. */
function initials(title: string): string {
  const skip = new Set(["a", "an", "the", "of", "for", "and", "to", "in", "as", "your"]);
  const words = title
    .split(/\s+/)
    .map((w) => w.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter((w) => w.length > 0 && !skip.has(w.toLowerCase()));

  const source = words.length > 0 ? words : [title];
  return source
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

export function CourseCover({
  id,
  title,
  category,
  className,
}: {
  id: string;
  title: string;
  category: Category;
  className?: string;
}) {
  const { ground, ink, wash } = GROUNDS[category];
  const layout = LAYOUTS[pick(id, LAYOUTS.length)]!;

  return (
    <div
      /* @container makes cqw below resolve against the cover itself,
         so the monogram scales with the card rather than the viewport. */
      className={cn(
        "@container relative isolate aspect-[16/10] w-full overflow-hidden",
        ground,
        className
      )}
    >
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute text-[30cqw] font-bold leading-none tracking-tighter select-none",
          wash,
          layout
        )}
      >
        {initials(title)}
      </span>

      <p
        className={cn(
          "absolute inset-x-0 bottom-0 line-clamp-3 p-3.5 text-base font-bold leading-tight tracking-tight sm:p-4 sm:text-lg",
          ink
        )}
      >
        {title}
      </p>
    </div>
  );
}
