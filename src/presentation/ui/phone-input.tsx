"use client";

import { useId } from "react";
import { cn } from "@shared/lib/cn";
import { formatNgLocal, ngNetwork, toE164, NG_DIALLING_CODE } from "@core/value-objects/phone";
import { CONTROL_BASE } from "./input";

/**
 * Phone is the account in this product, so this field shows up in
 * sign-up, sign-in, the WhatsApp connection step and student import.
 * All the rules about what a real Nigerian mobile looks like live in
 * core/value-objects/phone.ts — this only renders them.
 *
 * Controlled on what the creator typed, not on E.164. Reformatting a
 * half-typed number into +234... while someone is still entering it
 * moves the caret and loses digits, so the raw string stays theirs and
 * the normalised value is handed back alongside it.
 */
export function PhoneInput({
  id,
  value,
  onChange,
  disabled,
  invalid,
  autoFocus,
  placeholder = "803 123 4567",
  describedBy,
  className,
}: {
  id?: string;
  /** What the creator typed, digits only or already grouped. */
  value: string;
  /** Raw display string, plus E.164 when the number is valid. */
  onChange: (raw: string, e164: string | null) => void;
  disabled?: boolean;
  invalid?: boolean;
  autoFocus?: boolean;
  placeholder?: string;
  describedBy?: string;
  className?: string;
}) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const network = ngNetwork(value);

  return (
    <div className={className}>
      <div
        className={cn(
          CONTROL_BASE,
          "flex h-11 items-stretch overflow-hidden p-0",
          invalid ? "border-danger" : "border-border-strong",
          disabled && "bg-surface-sunken"
        )}
      >
        {/* +234 is fixed, not a country picker. Nigeria-first is the
            product, and a dropdown here would be a decision nobody
            in the target market needs to make. */}
        <span
          className="flex select-none items-center gap-1 border-r border-border-strong bg-surface-sunken px-3 text-[0.9375rem] text-body"
          aria-hidden
        >
          🇳🇬 +{NG_DIALLING_CODE}
        </span>

        <input
          id={inputId}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          // Android keyboards otherwise offer to autocorrect a phone number.
          autoCorrect="off"
          spellCheck={false}
          className="min-w-0 flex-1 bg-transparent px-3 text-[0.9375rem] tabular-nums text-ink placeholder:text-faint focus:outline-none disabled:cursor-not-allowed disabled:text-muted"
          value={formatNgLocal(value)}
          placeholder={placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          onChange={(e) => {
            const raw = e.target.value;
            onChange(raw, toE164(raw));
          }}
        />

        {/* Reading the network back is how a creator knows we parsed the
            number the way they meant it. */}
        {network && !disabled && (
          <span className="flex select-none items-center pr-3 text-xs font-medium text-muted" aria-hidden>
            {network}
          </span>
        )}
      </div>
    </div>
  );
}
