"use client";

import { useState } from "react";
import { Button } from "@ui/ui/button";
import { Field } from "@ui/ui/field";
import { Input, Select, Textarea } from "@ui/ui/input";
import { Spinner } from "@ui/ui/spinner";
import { StatusBanner } from "@ui/ui/status-banner";
import { useUpdateProfile } from "@app-layer/creator/queries";
import { CATEGORIES, CATEGORY_LABELS } from "@core/entities/course";
import type { Category } from "@core/entities/course";
import type { Creator } from "@core/entities/creator";
import { subdomainFromAcademyName } from "@core/value-objects/subdomain";
import { academyBase } from "@shared/lib/site";
import { SavedNote } from "./step-chrome";

const BIO_MAX = 280;

export function StepProfile({ creator, onDone }: { creator: Creator; onDone?: () => void }) {
  const save = useUpdateProfile(creator.id);

  const [academyName, setAcademyName] = useState(creator.profile?.academyName ?? "");
  const [category, setCategory] = useState<Category>(creator.profile?.category ?? "business");
  const [bio, setBio] = useState(creator.profile?.bio ?? "");
  const [touched, setTouched] = useState(false);

  const nameError =
    touched && academyName.trim().length < 2 ? "Give your academy a name students will recognise." : null;
  const bioError = bio.length > BIO_MAX ? `Trim this to ${BIO_MAX} characters.` : null;
  const valid = academyName.trim().length >= 2 && !bioError;

  /* The address comes free with the name — worth showing before they commit
     to one, since this is what students will see. */
  const previewAddress =
    !creator.subdomain.value && academyName.trim().length >= 2
      ? academyBase(subdomainFromAcademyName(academyName))
      : null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!valid || save.isPending) return;
    save.mutate(
      { academyName: academyName.trim(), category, bio: bio.trim() },
      { onSuccess: onDone }
    );
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      {save.isError && (
        <StatusBanner tone="danger" title="Could not save your academy">
          The network did not respond. Your details are still here — try again.
        </StatusBanner>
      )}

      <Field id="academy-name" label="Academy name" error={nameError}>
        {(props) => (
          <Input
            {...props}
            value={academyName}
            onChange={(e) => setAcademyName(e.target.value)}
            placeholder="Grace Leadership Academy"
            disabled={save.isPending}
            autoFocus
          />
        )}
      </Field>

      {previewAddress && (
        <p className="-mt-2 text-sm text-muted">
          Your address will be <span className="font-medium text-body">{previewAddress}</span>. You can
          change it at the last step.
        </p>
      )}

      <Field id="category" label="What do you teach?" hint="Students browse by this.">
        {(props) => (
          <Select
            {...props}
            value={category}
            onChange={(e) => setCategory(e.target.value as Category)}
            disabled={save.isPending}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </Select>
        )}
      </Field>

      <Field
        id="bio"
        label="Short bio"
        optional
        hint={`${BIO_MAX - bio.length} characters left. This appears on your sales page.`}
        error={bioError}
      >
        {(props) => (
          <Textarea
            {...props}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="I train church leaders and small business owners across Lagos and Ogun."
            rows={3}
            disabled={save.isPending}
          />
        )}
      </Field>

      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={save.isPending}>
          {save.isPending && <Spinner label="" />}
          {save.isPending ? "Saving" : onDone ? "Save and continue" : "Save changes"}
        </Button>
        {/* Settings has no navigation to stand in for the acknowledgement. */}
        <SavedNote show={!onDone && save.isSuccess} />
      </div>
    </form>
  );
}
