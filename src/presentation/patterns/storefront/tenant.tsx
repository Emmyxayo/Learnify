import type { ReactNode } from "react";
import type { CSSProperties } from "react";
import { brandStyle, resolveBrand } from "@core/value-objects/brand";

/**
 * Paints a subtree in a creator's colours.
 *
 * One stored hex expands into the whole ramp, so bg-brand, bg-brand-
 * subtle, border-brand-border, hover:bg-brand-hover and text-on-brand
 * all move together. Nothing below this element knows it happened:
 * every component keeps using the same token utilities it uses in the
 * studio, and the utilities re-resolve through var().
 *
 * A creator with no brand colour renders no style attribute at all,
 * which lets :root stand rather than overriding it with a copy of
 * itself — so Learnify's own values live in exactly one file.
 */
export function TenantTheme({
  brandColor,
  children,
  className,
}: {
  brandColor: string | null;
  children: ReactNode;
  className?: string;
}) {
  const style = brandStyle(resolveBrand(brandColor));

  return (
    <div data-tenant className={className} style={style as CSSProperties | undefined}>
      {children}
    </div>
  );
}
