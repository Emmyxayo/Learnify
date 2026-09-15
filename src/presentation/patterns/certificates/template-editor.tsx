"use client";

import { useRef, useState } from "react";
import { ImageUp, Lock } from "lucide-react";
import { cn } from "@shared/lib/cn";
import Link from "next/link";
import { Button, buttonClasses } from "@ui/ui/button";
import { Card } from "@ui/ui/card";
import { Select } from "@ui/ui/input";
import { Spinner } from "@ui/ui/spinner";
import { StatusBanner } from "@ui/ui/status-banner";
import { useSaveTemplate, useUploadBackground } from "@app-layer/certificate/queries";
import {
  BUILT_IN_BACKGROUNDS,
  CERTIFICATE_FIELDS,
  CERTIFICATE_FIELD_LABELS,
  type BuiltInBackground,
  type CertificateField,
  type CertificateTemplate,
} from "@core/entities/certificate";
import { MIN_TIER_FOR, PLAN_TIER_LABELS, hasFeature, type PlanTier } from "@core/entities/plan";
import { CertificateCanvas, type CertificateContent } from "./certificate-canvas";

const BACKGROUND_LABELS: Record<BuiltInBackground, string> = {
  plain: "Plain",
  bordered: "Bordered",
  seal: "Seal",
};

/** What the creator sees in the preview before anyone has finished. */
const SAMPLE: CertificateContent = {
  studentName: "Adaeze Okonkwo",
  courseTitle: "Biblical Foundations of Christian Leadership",
  issuedAt: new Date().toISOString(),
  code: "GL-2026-40118",
  academyName: "Your academy",
};

export function TemplateEditor({
  template,
  creatorId,
  tier,
  academyName,
}: {
  template: CertificateTemplate;
  creatorId: string;
  tier: PlanTier;
  academyName: string;
}) {
  const save = useSaveTemplate(creatorId);
  const upload = useUploadBackground();
  const fileRef = useRef<HTMLInputElement>(null);

  const [field, setField] = useState<CertificateField>("studentName");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const canCustomise = hasFeature(tier, "custom-certificates");
  const required = PLAN_TIER_LABELS[MIN_TIER_FOR["custom-certificates"]];
  const placement = template.placements[field];

  /* Optimistic: the preview is the product here, and a round trip per
     nudge of a slider would make positioning unusable. */
  const patch = (next: Partial<CertificateTemplate>) => save.mutate({ ...template, ...next });

  const movePlacement = (changes: Partial<NonNullable<typeof placement>>) => {
    if (!placement) return;
    patch({ placements: { ...template.placements, [field]: { ...placement, ...changes } } });
  };

  async function pickBackground(file: File) {
    setUploadError(null);
    setUploading(true);
    try {
      const uploaded = await upload(file);
      patch({ background: { kind: "custom", url: uploaded.url, fileName: uploaded.fileName } });
    } catch {
      setUploadError("That image did not upload. Try a JPG or PNG under 5MB.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_20rem] lg:items-start">
      {/* The certificate leads. A creator judging a layout needs the
          layout, not a form that describes one. */}
      <CertificateCanvas
        template={template}
        content={{ ...SAMPLE, academyName }}
        verifyUrl="https://learnify.com/verify/GL-2026-40118"
        highlight={field}
      />

      <Card className="space-y-4 p-4">
        <section>
          <h2 className="mb-2 text-sm font-semibold text-ink">Background</h2>
          <div className="grid grid-cols-3 gap-2">
            {BUILT_IN_BACKGROUNDS.map((name) => {
              const active =
                template.background.kind === "built-in" && template.background.name === name;
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => patch({ background: { kind: "built-in", name } })}
                  aria-pressed={active}
                  className={cn(
                    "rounded-control border px-2 py-2 text-xs font-semibold transition-colors",
                    active
                      ? "border-brand bg-brand-subtle text-brand"
                      : "border-border text-body hover:bg-surface-sunken"
                  )}
                >
                  {BACKGROUND_LABELS[name]}
                </button>
              );
            })}
          </div>

          {canCustomise ? (
            <>
              <Button
                variant="secondary"
                size="sm"
                className="mt-2 w-full"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
              >
                {uploading ? (
                  <Spinner className="size-3.5" label="" />
                ) : (
                  <ImageUp className="size-3.5" aria-hidden />
                )}
                {template.background.kind === "custom" ? "Replace image" : "Upload your own"}
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void pickBackground(file);
                  e.target.value = "";
                }}
              />
              {template.background.kind === "custom" && (
                <p className="mt-1.5 truncate text-xs text-muted">
                  {template.background.fileName}
                </p>
              )}
              {uploadError && <p className="mt-1.5 text-xs text-danger">{uploadError}</p>}
            </>
          ) : (
            /* Locked, with the reason and the fix — never a button that
               silently does nothing. */
            <div className="mt-2 rounded-control border border-dashed border-border-strong bg-surface-sunken p-3 text-center">
              <p className="flex items-center justify-center gap-1.5 text-xs font-semibold text-muted">
                <Lock className="size-3.5" aria-hidden />
                Your own background is part of {required}
              </p>
              <Link
                href="/settings"
                className={buttonClasses({
                  variant: "secondary",
                  size: "sm",
                  className: "mt-2 w-full",
                })}
              >
                Move to {required}
              </Link>
            </div>
          )}
        </section>

        <section className="border-t border-border pt-4">
          <h2 className="mb-2 text-sm font-semibold text-ink">Position a field</h2>

          <Select
            aria-label="Field to position"
            value={field}
            onChange={(e) => setField(e.target.value as CertificateField)}
            className="h-10 text-sm"
          >
            {CERTIFICATE_FIELDS.map((f) => (
              <option key={f} value={f}>
                {CERTIFICATE_FIELD_LABELS[f]}
              </option>
            ))}
          </Select>

          {field === "qr" && (
            <label className="mt-2 flex items-center gap-2 text-sm text-body">
              <input
                type="checkbox"
                checked={template.showQr}
                onChange={(e) => patch({ showQr: e.target.checked })}
                className="size-4 rounded-[3px] accent-[var(--brand)]"
              />
              Print a QR code
            </label>
          )}

          {placement && (
            /* Sliders rather than drag: this is positioned on a phone
               as often as a laptop, and dragging inside a scrolling
               page on touch fights the page. */
            <div className="mt-3 space-y-3">
              <Slider
                label="Across"
                value={placement.x}
                onChange={(x) => movePlacement({ x })}
                max={100}
              />
              <Slider
                label="Down"
                value={placement.y}
                onChange={(y) => movePlacement({ y })}
                max={100}
              />
              <Slider
                label="Size"
                value={placement.size}
                onChange={(size) => movePlacement({ size })}
                min={1}
                max={field === "qr" ? 25 : 12}
                step={0.2}
              />

              {field !== "qr" && (
                <div className="flex gap-1.5">
                  {(["left", "center", "right"] as const).map((align) => (
                    <button
                      key={align}
                      type="button"
                      onClick={() => movePlacement({ align })}
                      aria-pressed={placement.align === align}
                      className={cn(
                        "flex-1 rounded-control border px-2 py-1.5 text-xs font-semibold capitalize",
                        placement.align === align
                          ? "border-brand bg-brand-subtle text-brand"
                          : "border-border text-body hover:bg-surface-sunken"
                      )}
                    >
                      {align}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        {save.isError && (
          <StatusBanner tone="danger" title="That change did not save">
            The layout went back to what it was. Move it again and it will retry.
          </StatusBanner>
        )}
      </Card>
    </div>
  );
}

function Slider({
  label,
  value,
  onChange,
  min = 0,
  max,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max: number;
  step?: number;
}) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between text-xs font-medium text-muted">
        {label}
        <span className="tabular-nums">{value.toFixed(step < 1 ? 1 : 0)}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full accent-[var(--brand)]"
      />
    </label>
  );
}
