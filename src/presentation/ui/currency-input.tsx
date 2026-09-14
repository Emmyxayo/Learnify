"use client";

import type { InputHTMLAttributes } from "react";
import { cn } from "@shared/lib/cn";
import { CONTROL_BASE } from "./input";

/**
 * Money entry that never touches a float.
 *
 * State is kobo, the field shows naira. Typing strips to digits and
 * multiplies by 100, so the value can only ever be a whole number of
 * kobo — there is no parseFloat anywhere in the path, which is how
 * rounding errors get into revenue splits.
 *
 * Whole naira only. Nobody prices a WhatsApp course at ₦4,999.50,
 * and allowing the decimal buys a rounding bug for no use case.
 *
 * Fully controlled from kobo rather than holding its own text, so the
 * field and the entity cannot drift. The cost is that editing in the
 * middle of the number puts the caret at the end; for a field people
 * type left to right and retype rather than edit, that is the better
 * trade.
 */
export function CurrencyInput({
  valueKobo,
  onChangeKobo,
  className,
  ...props
}: {
  valueKobo: number;
  onChangeKobo: (kobo: number) => void;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type">) {
  const naira = Math.round(valueKobo / 100);
  const display = naira === 0 ? "" : new Intl.NumberFormat("en-NG").format(naira);

  return (
    <div className="relative">
      <span
        aria-hidden
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[0.9375rem] font-medium text-muted"
      >
        ₦
      </span>

      <input
        {...props}
        /* numeric, not decimal — the keypad should not offer a point
           the field will throw away. */
        inputMode="numeric"
        autoComplete="off"
        value={display}
        onChange={(e) => {
          /* Nine digits caps entry at under a billion naira, which is
             well past any real course and short of anything that would
             overflow kobo arithmetic. */
          const digits = e.target.value.replace(/\D/g, "").slice(0, 9);
          onChangeKobo(digits === "" ? 0 : Number(digits) * 100);
        }}
        className={cn(
          CONTROL_BASE,
          "h-11 border-border-strong pl-7 pr-3 text-[0.9375rem] tabular-nums",
          className
        )}
      />
    </div>
  );
}
