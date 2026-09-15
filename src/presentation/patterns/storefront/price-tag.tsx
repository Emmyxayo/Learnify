import { formatNaira } from "@shared/lib/format";
import { isFree, type Money } from "@core/value-objects/money";
import { cn } from "@shared/lib/cn";

/**
 * Free says "Free". Not "₦0", which reads as a price that failed to
 * load, and not "₦0.00", which reads as a bug.
 */
export function PriceTag({
  price,
  compareAtPrice,
  size = "lg",
  className,
}: {
  price: Money;
  compareAtPrice: Money | null;
  size?: "sm" | "lg";
  className?: string;
}) {
  const free = isFree(price);
  /* A strike-through that is not actually higher is a lie a student
     can check, so it is dropped rather than rendered. */
  const showCompare = !free && compareAtPrice !== null && compareAtPrice.amount > price.amount;

  return (
    <p className={cn("flex flex-wrap items-baseline gap-x-2 gap-y-0.5", className)}>
      <span
        className={cn(
          "font-bold tracking-tight text-ink",
          size === "lg" ? "text-[1.75rem]" : "text-lg"
        )}
      >
        {free ? "Free" : formatNaira(price.amount)}
      </span>

      {showCompare && (
        <>
          <span
            className={cn("text-muted line-through", size === "lg" ? "text-base" : "text-sm")}
          >
            {formatNaira(compareAtPrice.amount)}
          </span>
          <span className="rounded-pill bg-accent-subtle px-2 py-0.5 text-xs font-semibold text-accent">
            Save {Math.round((1 - price.amount / compareAtPrice.amount) * 100)}%
          </span>
        </>
      )}
    </p>
  );
}
