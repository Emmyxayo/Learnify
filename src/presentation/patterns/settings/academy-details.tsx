"use client";

import { useState } from "react";
import { Button } from "@ui/ui/button";
import { Field } from "@ui/ui/field";
import { Input } from "@ui/ui/input";
import { PhoneInput } from "@ui/ui/phone-input";
import { Spinner } from "@ui/ui/spinner";
import { StatusBanner } from "@ui/ui/status-banner";
import {
  useAcademy,
  useActiveAcademySlug,
  useUpdateAcademy,
} from "@app-layer/academy/queries";
import { fieldError } from "@shared/lib/field-errors";
import { SavedNote } from "@ui/patterns/onboarding/step-chrome";
import { SettingsCard } from "./settings-screen";

/**
 * The academy record, edited directly.
 *
 * Every field here maps one-to-one onto the backend's academy, and
 * three of them are things it refuses to let a course go live
 * without: a description, and a support email or a WhatsApp number.
 * None of the three had a field anywhere in the product, so a
 * creator could read "finish your academy onboarding first" on the
 * publish screen and have no way at all to finish it.
 *
 * The WhatsApp number here is a CONTACT DETAIL — the number a
 * student messages when they are stuck. It is not a Business API
 * connection and no lesson is ever delivered through it, which is
 * why it belongs here rather than behind the WhatsApp delivery flag
 * that is switched off against this backend.
 */
export function AcademyDetails() {
  const slug = useActiveAcademySlug();
  const { data: academy, isLoading } = useAcademy(slug);
  const save = useUpdateAcademy(slug ?? "");

  const [name, setName] = useState<string | null>(null);
  const [tagline, setTagline] = useState<string | null>(null);
  const [description, setDescription] = useState<string | null>(null);
  const [supportEmail, setSupportEmail] = useState<string | null>(null);
  const [whatsapp, setWhatsapp] = useState<string | null>(null);

  if (!slug || isLoading || !academy) {
    return (
      <SettingsCard
        title="Your academy"
        description="The name, description and contact details students see."
      >
        <div className="flex items-center gap-2 py-6 text-muted">
          <Spinner /> Loading
        </div>
      </SettingsCard>
    );
  }

  /* Null means untouched, so the saved value shows until it is
     edited — and an edit to "" is a real edit, which `?? saved`
     would silently discard. */
  const v = {
    name: name ?? academy.name,
    tagline: tagline ?? academy.tagline,
    description: description ?? academy.description,
    supportEmail: supportEmail ?? academy.supportEmail,
    whatsapp: whatsapp ?? academy.whatsappNumber,
  };

  const dirty =
    v.name !== academy.name ||
    v.tagline !== academy.tagline ||
    v.description !== academy.description ||
    v.supportEmail !== academy.supportEmail ||
    v.whatsapp !== academy.whatsappNumber;

  /* The backend's `contact` step wants one or the other, not both. */
  const hasContact = v.supportEmail.trim() !== "" || v.whatsapp.trim() !== "";

  return (
    <SettingsCard
      title="Your academy"
      description="The name, description and contact details students see."
    >
      {save.isError && (
        <StatusBanner tone="danger" title="Could not save" className="mb-4">
          {save.error instanceof Error && save.error.message
            ? save.error.message
            : "The network did not respond. Your details are still here — try again."}
        </StatusBanner>
      )}

      <form
        className="space-y-4"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (!dirty || save.isPending) return;
          save.mutate({
            name: v.name.trim(),
            tagline: v.tagline.trim(),
            description: v.description.trim(),
            supportEmail: v.supportEmail.trim(),
            whatsappNumber: v.whatsapp.trim(),
          });
        }}
      >
        <Field id="academy-name" label="Name" error={fieldError(save.error, "name")}>
          {(props) => (
            <Input {...props} value={v.name} onChange={(e) => setName(e.target.value)} />
          )}
        </Field>

        <Field
          id="academy-tagline"
          label="Tagline"
          hint="One line. What you teach, in the words a student would use."
          error={fieldError(save.error, "tagline")}
        >
          {(props) => (
            <Input
              {...props}
              value={v.tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="Practical poultry farming for beginners"
            />
          )}
        </Field>

        <Field
          id="academy-description"
          label="Description"
          hint="A paragraph on who you teach and what they walk away with."
          error={fieldError(save.error, "description")}
        >
          {(props) => (
            <textarea
              {...props}
              value={v.description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full rounded-control border border-border-strong bg-surface-raised px-3 py-2 text-sm text-ink placeholder:text-faint"
            />
          )}
        </Field>

        <div className="rounded-card border border-border bg-surface-sunken p-3">
          <p className="text-sm font-medium text-ink">How students reach you</p>
          <p className="mt-0.5 text-sm text-muted">
            One of these is enough, and one of them is required before a course
            can go live.
          </p>

          <div className="mt-3 space-y-4">
            <Field
              id="academy-support-email"
              label="Support email"
              optional
              error={fieldError(save.error, "support_email")}
            >
              {(props) => (
                <Input
                  {...props}
                  type="email"
                  value={v.supportEmail}
                  onChange={(e) => setSupportEmail(e.target.value)}
                  placeholder="hello@youracademy.ng"
                  autoCapitalize="none"
                  spellCheck={false}
                />
              )}
            </Field>

            <Field
              id="academy-whatsapp"
              label="WhatsApp number"
              optional
              hint="A number students can message. Lessons are not sent from it."
              error={fieldError(save.error, "whatsapp_number")}
            >
              {(props) => (
                <PhoneInput
                  id={props.id}
                  describedBy={props["aria-describedby"]}
                  invalid={props["aria-invalid"]}
                  value={v.whatsapp}
                  onChange={setWhatsapp}
                />
              )}
            </Field>
          </div>

          {!hasContact && (
            <p className="mt-3 text-sm text-danger">
              Add one of these. Without it your courses cannot be published.
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <Button type="submit" size="lg" disabled={!dirty || save.isPending}>
            {save.isPending && <Spinner label="" />}
            Save changes
          </Button>
          <SavedNote show={!dirty && save.isSuccess} />
        </div>
      </form>
    </SettingsCard>
  );
}
