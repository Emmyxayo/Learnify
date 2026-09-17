"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ImagePlus, Trash2, TriangleAlert, Check } from "lucide-react";
import type { CSSProperties } from "react";
import type { Creator } from "@core/entities/creator";
import type { Course } from "@core/entities/course";
import type { Storefront } from "@core/entities/storefront";
import { brandStyle, brandTextContrast, parseHex, resolveBrand } from "@core/value-objects/brand";
import { readToken } from "@shared/lib/tokens";
import { naira } from "@core/value-objects/money";
import { useUpdateBranding, useUploadLogo } from "@app-layer/creator/queries";
import { Button } from "@ui/ui/button";
import { Field } from "@ui/ui/field";
import { Input } from "@ui/ui/input";
import { Spinner } from "@ui/ui/spinner";
import { StatusBanner } from "@ui/ui/status-banner";
import { StepProfile } from "@ui/patterns/onboarding/step-profile";
import { StepSubdomain } from "@ui/patterns/onboarding/step-subdomain";
import { SavedNote } from "@ui/patterns/onboarding/step-chrome";
import {
  StorefrontMasthead,
  StorefrontOffer,
} from "@ui/patterns/storefront/sales-page";
import { SettingsCard } from "./settings-screen";
import { cn } from "@shared/lib/cn";

/** WCAG AA for normal text. Below this a button label is not readable. */
const AA = 4.5;

/**
 * Presets, so a creator who does not have a brand colour to hand is
 * not staring at a colour wheel. All five clear AA against the text
 * resolveBrand picks for them.
 *
 * eslint-disable-next-line is deliberate: these are colour VALUES
 * offered to a creator as content, the same category as the hex they
 * would paste in themselves. They are not this product's styling and
 * must not become tokens — a creator picking "Learnify teal" has
 * chosen a colour, which is a different fact from having chosen
 * nothing.
 */
// eslint-disable-next-line no-restricted-syntax -- content offered to the creator, not design.
const PRESETS = ["#0E7C6B", "#7A1F3D", "#2450C8", "#B45309", "#3F6212"];

export function SectionBranding({ creator }: { creator: Creator }) {
  const save = useUpdateBranding(creator.id);
  const upload = useUploadLogo();

  const [color, setColor] = useState(creator.branding.brandColor ?? "");
  const [logoUrl, setLogoUrl] = useState(creator.branding.logoUrl);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const dirty =
    color !== (creator.branding.brandColor ?? "") || logoUrl !== creator.branding.logoUrl;

  async function pickLogo(file: File) {
    setUploading(true);
    try {
      const uploaded = await upload(file);
      setLogoUrl(uploaded.url);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-4">
      <SettingsCard
        title="Your academy"
        description="The name, subject and description students read on every course page."
      >
        <StepProfile creator={creator} />
      </SettingsCard>

      <SettingsCard
        title="Look"
        description="One colour and a logo. Everything on your sales pages follows from them."
      >
        {save.isError && (
          <StatusBanner tone="danger" title="Could not save your branding" className="mb-4">
            The network did not respond. Your choices are still here — try again.
          </StatusBanner>
        )}

        <div className="space-y-5">
          <ColourPicker value={color} onChange={setColor} />

          <LogoPicker
            logoUrl={logoUrl}
            uploading={uploading}
            inputRef={fileInput}
            onPick={pickLogo}
            onClear={() => setLogoUrl(null)}
          />

          <div className="flex flex-wrap items-center gap-4">
            <Button
              size="lg"
              disabled={!dirty || save.isPending || uploading}
              onClick={() =>
                save.mutate({ brandColor: color.trim() === "" ? null : color.trim(), logoUrl })
              }
            >
              {save.isPending && <Spinner label="" />}
              Save branding
            </Button>
            <SavedNote show={!dirty && save.isSuccess} />
          </div>
        </div>
      </SettingsCard>

      {/* The point of the whole section: what the colour actually does. */}
      <SettingsCard
        title="What students see"
        description="A live piece of your sales page, in the colour above."
      >
        <SalesPreview creator={creator} color={color} logoUrl={logoUrl} />
      </SettingsCard>

      <SettingsCard
        title="Your address"
        description="The web address students visit. Old addresses keep working forever."
      >
        <StepSubdomain creator={creator} />
      </SettingsCard>
    </div>
  );
}

/* ============================================================
   The colour, and whether it can carry text

   A hex field alone lets a creator pick a bright yellow and find out
   from a student that the button was unreadable. resolveBrand already
   chooses ink or white by luminance, so the only thing missing is
   telling the creator which one it chose and how much contrast that
   buys — using the same functions the sales page renders with, not a
   second opinion about the same colour.
   ============================================================ */
function ColourPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const rgb = parseHex(value);
  const ramp = resolveBrand(value);
  const invalid = value.trim() !== "" && rgb === null;

  /* The token values, read off the document rather than restated
     here. A ratio quoted against a colour that is no longer what
     --ink says would be worse than quoting no ratio at all. Resolved
     after mount, because there is no document on the server. */
  const [tokens, setTokens] = useState<{ ink: string; onDark: string } | null>(null);
  useEffect(() => {
    const ink = readToken("--ink");
    const onDark = readToken("--surface-raised");
    if (ink && onDark) setTokens({ ink, onDark });
  }, []);

  const readout = useMemo(
    () => (tokens ? brandTextContrast(value, tokens) : null),
    [value, tokens]
  );

  return (
    <Field
      id="brand-colour"
      label="Brand colour"
      error={invalid ? `That is not a colour. Use a hex like ${PRESETS[1]}.` : null}
      hint="Leave it empty to use Learnify's colours."
    >
      {(props) => (
        <div className="space-y-2.5">
          <div className="flex gap-2">
            <input
              type="color"
              aria-label="Pick a colour"
              value={rgb ? ramp!.brand : PRESETS[0]}
              onChange={(e) => onChange(e.target.value.toUpperCase())}
              className="h-11 w-14 shrink-0 cursor-pointer rounded-control border border-border-strong bg-surface-raised p-1"
            />
            <Input
              {...props}
              value={value}
              placeholder={PRESETS[0]}
              spellCheck={false}
              onChange={(e) => onChange(e.target.value)}
              className="font-mono uppercase"
            />
          </div>

          <ul className="flex flex-wrap gap-1.5">
            {PRESETS.map((preset) => (
              <li key={preset}>
                <button
                  type="button"
                  aria-label={`Use ${preset}`}
                  onClick={() => onChange(preset)}
                  style={{ background: preset }}
                  className={cn(
                    "size-7 rounded-pill border transition-transform hover:scale-110",
                    value.toUpperCase() === preset ? "border-ink" : "border-border-strong"
                  )}
                />
              </li>
            ))}
          </ul>

          {readout && (
            <p
              className={cn(
                "flex items-start gap-1.5 text-sm",
                readout.ratio >= AA ? "text-muted" : "text-danger"
              )}
            >
              {readout.ratio >= AA ? (
                <Check className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              ) : (
                <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              )}
              {readout.ratio >= AA ? (
                <span>
                  Your buttons will use {readout.usesInk ? "dark text" : "white text"} —{" "}
                  {readout.ratio.toFixed(1)}:1, comfortably readable.
                </span>
              ) : (
                <span>
                  Even with {readout.usesInk ? "dark text" : "white text"} this is only{" "}
                  {readout.ratio.toFixed(1)}:1. Button labels will be hard to read. Try something
                  darker or lighter.
                </span>
              )}
            </p>
          )}
        </div>
      )}
    </Field>
  );
}

function LogoPicker({
  logoUrl,
  uploading,
  inputRef,
  onPick,
  onClear,
}: {
  logoUrl: string | null;
  uploading: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onPick: (file: File) => void;
  onClear: () => void;
}) {
  return (
    <div>
      <p className="text-sm font-medium text-ink">Logo</p>
      <p className="mt-1 text-sm text-muted">Square works best. Shown beside your academy name.</p>

      <div className="mt-2.5 flex items-center gap-3">
        <span className="inline-flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-card border border-border bg-surface-sunken">
          {uploading ? (
            <Spinner className="size-4 text-muted" />
          ) : logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="" className="size-full object-cover" />
          ) : (
            <ImagePlus className="size-5 text-faint" aria-hidden />
          )}
        </span>

        <Button variant="secondary" size="sm" disabled={uploading} onClick={() => inputRef.current?.click()}>
          {logoUrl ? "Replace" : "Upload"}
        </Button>
        {logoUrl && (
          <Button variant="ghost" size="sm" disabled={uploading} onClick={onClear}>
            <Trash2 className="size-4" aria-hidden />
            Remove
          </Button>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onPick(file);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}

/* ============================================================
   The preview

   Rendered from the same components the real sales page renders —
   StorefrontMasthead and StorefrontOffer — inside the same
   [data-tenant] wrapper, fed the colour currently in the form rather
   than the one that is saved.

   A lookalike built out of divs would be a second implementation of
   the page, and the first time one of them changed the creator would
   be approving something their students never see.
   ============================================================ */
function SalesPreview({
  creator,
  color,
  logoUrl,
}: {
  creator: Creator;
  color: string;
  logoUrl: string | null;
}) {
  const storefront: Storefront = {
    creatorId: creator.id,
    academyName: creator.profile?.academyName ?? creator.fullName,
    bio: creator.profile?.bio ?? "",
    subdomain: creator.subdomain.value ?? "your-academy",
    brandColor: color.trim() === "" ? null : color.trim(),
    logoUrl,
    whatsappNumber: null,
    canAcceptPayments: creator.payments.status === "connected",
  };

  /* A stand-in course, so the preview is a page rather than a swatch.
     Only the fields the two fragments read are populated. */
  const course = {
    title: "Your course title",
    price: naira(12000),
    compareAtPrice: naira(20000),
  } as unknown as Course;

  const style = brandStyle(resolveBrand(storefront.brandColor));

  return (
    <div
      data-tenant
      style={style as CSSProperties | undefined}
      className="overflow-hidden rounded-card border border-border bg-surface"
    >
      <StorefrontMasthead storefront={storefront} />
      <div className="p-4">
        <h3 className="text-lg font-bold leading-tight tracking-tight text-ink">{course.title}</h3>
        <p className="mt-1 text-sm text-body">
          What your students read before they decide.
        </p>
        <StorefrontOffer course={course} className="mt-4" />
      </div>
    </div>
  );
}
