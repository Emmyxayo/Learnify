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
import { DELIVERY } from "@shared/lib/delivery";
import { FEATURES } from "@shared/lib/features";

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
 * Three fields, and which one matters most depends on the channel.
 *
 * The form was built for a product where the phone number was the
 * delivery address — mistype it and the course goes to a stranger —
 * so phone led, with the plainest warning on the page. Lessons now
 * release to the portal instead, which moves that weight onto the
 * email: it is where the one-time sign-in code goes, and the OTP
 * endpoints send nowhere else. So email is required, and the field
 * says what it is for rather than calling itself optional.
 *
 * Phone keeps the first slot. It is still the identity the creator's
 * roster is keyed on, and still the delivery address the moment a
 * send path ships — at which point DELIVERY.phoneHint is the line
 * that changes, not this layout.
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
        label={DELIVERY.phoneLabel}
        error={errors.phone}
        hint={
          <span className="flex items-start gap-1.5">
            {FEATURES.whatsappDelivery && (
              <MessageCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            )}
            {DELIVERY.phoneHint}
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

      {/* Only promise a certificate where something issues one. */}
      <Field
        id="fullName"
        label="Your name"
        error={errors.fullName}
        hint={
          FEATURES.certificates
            ? "This is the name on your certificate."
            : "So your teacher knows who enrolled."
        }
      >
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

      {/* Required, and no longer "for your receipt": the sign-in code
          goes here, so this field is the student's only way back in.
          See validateEnrolDetails. */}
      <Field
        id="email"
        label={DELIVERY.emailLabel}
        error={errors.email}
        hint={DELIVERY.emailHint}
      >
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
