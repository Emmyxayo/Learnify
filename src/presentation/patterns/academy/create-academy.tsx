"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Check, Loader2, TriangleAlert } from "lucide-react";
import { Button } from "@ui/ui/button";
import { Card } from "@ui/ui/card";
import { Field } from "@ui/ui/field";
import { Input, Textarea } from "@ui/ui/input";
import { StatusBanner } from "@ui/ui/status-banner";
import {
  useCreateAcademy,
  useSlugAvailability,
} from "@app-layer/academy/queries";
import { ADDRESS_AFFIX, academyBase } from "@shared/lib/site";

/**
 * Creating an academy is what turns a registered account into a
 * creator. Registration alone makes a login and nothing else, so this
 * sits on the way out of sign-up rather than in settings.
 *
 * Two fields, because the backend requires two. Everything else is
 * editable afterwards; the address is not.
 */

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);

export function CreateAcademy() {
  const router = useRouter();
  const create = useCreateAcademy();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [tagline, setTagline] = useState("");

  /* The address follows the name until the creator edits it, then
     stops. Typing a name and watching the address rewrite itself
     underneath you is the behaviour people hate about this pattern. */
  useEffect(() => {
    if (!slugTouched) setSlug(slugify(name));
  }, [name, slugTouched]);

  const availability = useSlugAvailability(slug);

  const canSubmit =
    name.trim().length >= 2 &&
    slug.length >= 3 &&
    availability.available &&
    !create.isPending;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    const academy = await create.mutateAsync({
      name: name.trim(),
      slug,
      tagline: tagline.trim() || undefined,
    });
    router.push(`/onboarding?academy=${academy.slug}`);
  }

  return (
    <div className="container-page max-w-xl py-10 sm:py-14">
      <header className="mb-7">
        <h1 className="text-title text-ink">Name your academy</h1>
        <p className="prose-measure mt-2 text-muted">
          This is the brand your students see — on your sales pages, in
          their lessons, and on anything you share.
        </p>
      </header>

      {create.isError && (
        <StatusBanner tone="danger" title="Could not create your academy" className="mb-5">
          {create.error instanceof Error
            ? create.error.message
            : "The network did not respond. Nothing was created — try again."}
        </StatusBanner>
      )}

      <Card className="p-5 sm:p-6">
        <form onSubmit={submit} className="space-y-5">
          <Field
            id="academy-name"
            label="Academy name"
            hint="You can change this later."
          >
            {(props) => (
              <Input
                {...props}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Grace Leadership Academy"
                maxLength={150}
                autoFocus
                autoComplete="organization"
              />
            )}
          </Field>

          <Field
            id="academy-slug"
            label="Your address"
            error={
              availability.tooShort
                ? "Three characters or more."
                : availability.taken
                  ? "That address is taken. Try another."
                  : null
            }
            hint={
              <SlugHint
                slug={slug}
                checking={availability.checking}
                available={availability.available}
              />
            }
          >
            {(props) => (
              <Input
                {...props}
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(slugify(e.target.value));
                }}
                placeholder="grace-leadership"
                maxLength={40}
                inputMode="url"
                autoCapitalize="none"
                spellCheck={false}
              />
            )}
          </Field>

          {/* The one thing on this form that cannot be undone, said
              plainly and next to the field it governs rather than in
              a confirm dialog nobody reads. */}
          <div className="flex gap-2.5 rounded-card border border-warning/30 bg-warning-subtle px-3.5 py-3">
            <TriangleAlert
              className="mt-0.5 size-4 shrink-0 text-warning"
              aria-hidden
            />
            <p className="text-sm text-body">
              Your address is permanent. Course links get forwarded and
              re-shared for years, so this one cannot be changed later.
            </p>
          </div>

          <Field id="academy-tagline" label="Tagline" optional>
            {(props) => (
              <Textarea
                {...props}
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="Practical leadership, taught in plain words"
                maxLength={160}
                rows={2}
              />
            )}
          </Field>

          <Button type="submit" disabled={!canSubmit} className="w-full">
            {create.isPending ? "Creating…" : "Create academy"}
          </Button>
        </form>
      </Card>
    </div>
  );
}

function SlugHint({
  slug,
  checking,
  available,
}: {
  slug: string;
  checking: boolean;
  available: boolean;
}) {
  if (!slug) {
    return (
      <>
        Letters, numbers and hyphens.
        {ADDRESS_AFFIX.suffix ? ` Your courses live at name${ADDRESS_AFFIX.suffix}.` : ""}
      </>
    );
  }

  return (
    <span className="flex items-center gap-1.5">
      <span className="truncate font-medium text-body">{academyBase(slug)}</span>
      {checking && (
        <Loader2 className="size-3.5 shrink-0 animate-spin text-muted" aria-label="Checking" />
      )}
      {!checking && available && (
        <Check className="size-3.5 shrink-0 text-success" aria-label="Available" />
      )}
    </span>
  );
}
