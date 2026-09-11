"use client";

import { useEffect, useId, useRef, type ClipboardEvent, type KeyboardEvent } from "react";
import { cn } from "@shared/lib/cn";

/**
 * Six boxes that behave the way people expect from every other OTP
 * field they have used: typing advances, backspace retreats, and
 * pasting the whole code fills every box at once.
 *
 * That last one matters most here. On Android the code arrives in a
 * notification and gets pasted as one string — a field that only
 * accepts one character per box turns a two-second task into six
 * failed attempts.
 */
export function OtpInput({
  id,
  value,
  onChange,
  onComplete,
  length = 6,
  disabled,
  invalid,
  autoFocus,
  describedBy,
  className,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  /** Fires when the last box fills, however it was filled. */
  onComplete?: (value: string) => void;
  length?: number;
  disabled?: boolean;
  invalid?: boolean;
  autoFocus?: boolean;
  describedBy?: string;
  className?: string;
}) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.padEnd(length, " ").slice(0, length).split("");

  // Fires on paste and on typing the last digit alike, so the caller
  // never has to detect completion twice.
  const completed = useRef(false);
  useEffect(() => {
    if (value.length === length && !completed.current) {
      completed.current = true;
      onComplete?.(value);
    }
    if (value.length < length) completed.current = false;
  }, [value, length, onComplete]);

  const focusBox = (index: number) => {
    const next = refs.current[Math.max(0, Math.min(length - 1, index))];
    next?.focus();
    next?.select();
  };

  const setDigit = (index: number, digit: string) => {
    const next = value.padEnd(length, " ").split("");
    next[index] = digit || " ";
    onChange(next.join("").trimEnd().replace(/ /g, ""));
  };

  const handleChange = (index: number, raw: string) => {
    const digit = raw.replace(/\D/g, "").slice(-1);
    if (!digit) return;

    // Typing over a full field should replace from here, not be ignored.
    const next = value.padEnd(length, " ").split("");
    next[index] = digit;
    onChange(next.join("").replace(/ /g, ""));
    if (index < length - 1) focusBox(index + 1);
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      if (digits[index].trim()) {
        setDigit(index, "");
      } else if (index > 0) {
        // Empty box: clear the one behind and go there. Otherwise the
        // creator has to press backspace twice per digit.
        setDigit(index - 1, "");
        focusBox(index - 1);
      }
      return;
    }
    if (e.key === "ArrowLeft") { e.preventDefault(); focusBox(index - 1); }
    if (e.key === "ArrowRight") { e.preventDefault(); focusBox(index + 1); }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!pasted) return;
    e.preventDefault();
    onChange(pasted);
    focusBox(pasted.length - 1);
  };

  return (
    <div
      className={cn("flex gap-2", className)}
      role="group"
      aria-label={`${length}-digit code`}
      aria-describedby={describedBy}
    >
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => { refs.current[index] = el; }}
          id={index === 0 ? fieldId : undefined}
          type="text"
          inputMode="numeric"
          // Lets Android and iOS drop the SMS code straight in.
          autoComplete={index === 0 ? "one-time-code" : "off"}
          maxLength={1}
          disabled={disabled}
          autoFocus={autoFocus && index === 0}
          aria-label={`Digit ${index + 1}`}
          aria-invalid={invalid || undefined}
          value={digit.trim()}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          className={cn(
            // min-w-0 + flex-1 so six boxes still fit at 360px.
            "h-13 min-w-0 flex-1 rounded-control border bg-surface-raised text-center text-xl font-semibold tabular-nums text-ink",
            "transition-colors duration-150",
            "disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:text-muted",
            invalid ? "border-danger" : "border-border-strong"
          )}
        />
      ))}
    </div>
  );
}
