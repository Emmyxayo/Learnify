"use client";

import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { Field } from "@ui/ui/field";
import { Input } from "@ui/ui/input";
import { PhoneInput } from "@ui/ui/phone-input";
import { Button } from "@ui/ui/button";
import { Spinner } from "@ui/ui/spinner";
import {
  toEnrolDetails,
  validateEnrolDetails,
  type EnrolDetails,
  type EnrolField,
} from "@core/entities/storefront";
import { formatNgDisplay } from "@core/value-objects/phone";

export interface EnrolFormValues {
  fullName: string;
  phone: string;
  email: string;
}

export const emptyForm: EnrolFormValues = { fullName: "", phone: "", email: "" };

/** An abandoned student gets their own answers back, not a blank form. */
export function formFromDetails(details: EnrolDetails): EnrolFormValues {
  return {
    fullName: details.fullName,
    phone: formatNgDisplay(details.phone),
    email: details.email ?? "",
  };
}

/**
 * Phone first, and the copy says why.
 *
 * Everywhere else in this product the phone number is identity. Here
 * it is also the delivery address: a student who mistypes it pays and
 * then waits forever for a course that is being sent to a stranger.
 * That is the one mistake on this page that cannot be undone by the
 * student, so it gets the first field and the plainest warning.
 */
export function EnrolForm({
  initial,
  submitting,
  submitLabel,
  onSubmit,
}: {
  initial: EnrolFormValues;
  submitting: boolean;
  submitLabel: string;
  onSubmit: (details: EnrolDetails) => void;
}) {
  const [values, setValues] = useState<EnrolFormValues>(initial);
  const [errors, setErrors] = useState<Partial<Record<EnrolField, string>>>({});

  const set = (key: keyof EnrolFormValues, value: string) => {
    setValues((v) => ({ ...v, [key]: value }));
    /* Clear this field's error as they fix it. Leaving it under a
       field they are actively correcting is just nagging. */
    if (errors[key as EnrolField]) {
      setErrors((e) => ({ ...e, [key]: undefined }));
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const found = validateEnrolDetails(values);
    if (found) {
      setErrors(found);
      return;
    }
    const details = toEnrolDetails(values);
    if (!details) {
      setErrors({ phone: "That is not a Nigerian mobile number. Check the digits." });
      return;
    }
    onSubmit(details);
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <Field
        id="phone"
        label="WhatsApp number"
        error={errors.phone}
        hint={
          <span className="flex items-start gap-1.5">
            <MessageCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            Every lesson goes to this number. Check it before you pay.
          </span>
        }
      >
        {(props) => (
          <PhoneInput
            {...props}
            value={values.phone}
            invalid={Boolean(errors.phone)}
            disabled={submitting}
            describedBy={props["aria-describedby"]}
            onChange={(raw) => set("phone", raw)}
          />
        )}
      </Field>

      <Field id="fullName" label="Your name" error={errors.fullName} hint="This is the name on your certificate.">
        {(props) => (
          <Input
            {...props}
            value={values.fullName}
            disabled={submitting}
            autoComplete="name"
            placeholder="Ada Okafor"
            onChange={(e) => set("fullName", e.target.value)}
          />
        )}
      </Field>

      <Field id="email" label="Email" optional error={errors.email} hint="For your receipt only.">
        {(props) => (
          <Input
            {...props}
            type="email"
            inputMode="email"
            value={values.email}
            disabled={submitting}
            autoComplete="email"
            placeholder="ada@example.com"
            onChange={(e) => set("email", e.target.value)}
          />
        )}
      </Field>

      <Button type="submit" size="lg" className="w-full" disabled={submitting}>
        {submitting ? <Spinner className="size-4" /> : null}
        {submitLabel}
      </Button>
    </form>
  );
}
