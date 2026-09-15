import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, CircleSlash, FileQuestion, RefreshCw } from "lucide-react";
import { verifyCertificate } from "@app-layer/certificate/verify";
import { formatDate } from "@shared/lib/format";
import type { Certificate, VerificationResult } from "@core/entities/certificate";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const result = await verifyCertificate(code);

  /* The title is what shows in a WhatsApp link preview, so it carries
     the answer rather than the product name. */
  if (result.outcome === "valid") {
    return {
      title: `${result.certificate.studentName} — verified certificate`,
      description: `${result.certificate.courseTitle}, issued by ${result.certificate.academyName}.`,
    };
  }
  return { title: "Certificate check — Learnify", robots: { index: false } };
}

/**
 * Server-rendered, and the answer comes first.
 *
 * Someone is standing in an office holding a phone. There is no
 * marketing above the result, no shell, no JavaScript needed to read
 * it — the verdict is in the HTML of the first response.
 */
export default async function Page({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const result = await verifyCertificate(code);

  return (
    <main className="mx-auto max-w-lg px-5 py-8 sm:py-14">
      <Result result={result} code={code} />

      <p className="mt-8 text-center text-xs text-muted">
        <Link href="/verify" className="font-medium text-brand hover:underline">
          Check another certificate
        </Link>
      </p>
    </main>
  );
}

function Result({ result, code }: { result: VerificationResult; code: string }) {
  switch (result.outcome) {
    case "valid":
      return (
        <>
          <Verdict
            tone="good"
            icon={<BadgeCheck className="size-7" aria-hidden />}
            headline="This certificate is genuine"
            sub={`Issued by ${result.certificate.academyName} and still valid.`}
          />
          <Details certificate={result.certificate} />
        </>
      );

    case "superseded":
      return result.current ? (
        <>
          <Verdict
            tone="warn"
            icon={<RefreshCw className="size-7" aria-hidden />}
            headline="This code was replaced"
            sub={`The holder's certificate is genuine — it was reissued, and the current one is below.`}
          />
          <Details certificate={result.current} />
          <Superseded old={result.certificate} />
        </>
      ) : (
        <>
          <Verdict
            tone="bad"
            icon={<CircleSlash className="size-7" aria-hidden />}
            headline="This certificate is not valid"
            sub="It was replaced, and the certificate that replaced it cannot be found. Contact the academy named on it."
          />
          <Details certificate={result.certificate} muted />
        </>
      );

    case "revoked":
      return (
        <>
          <Verdict
            tone="bad"
            icon={<CircleSlash className="size-7" aria-hidden />}
            headline="This certificate was withdrawn"
            sub={result.certificate.status.state === "revoked" ? result.certificate.status.reason : ""}
          />
          <Details certificate={result.certificate} muted />
        </>
      );

    case "not-found":
      return (
        <Verdict
          tone="bad"
          icon={<FileQuestion className="size-7" aria-hidden />}
          headline="No certificate has this code"
          sub={`Nothing has ever been issued as ${code.toUpperCase()}. Check the code against the certificate — it is five digits after the year.`}
        />
      );
  }
}

/**
 * One sentence, large, at the top. An employer gets the verdict
 * before they get any detail, and it never hedges — "we could not
 * find it, maybe try again" is not an answer anybody can act on.
 */
function Verdict({
  tone,
  icon,
  headline,
  sub,
}: {
  tone: "good" | "warn" | "bad";
  icon: React.ReactNode;
  headline: string;
  sub: string;
}) {
  const tones = {
    good: "border-success/25 bg-success-subtle text-success",
    warn: "border-warning/25 bg-warning-subtle text-warning",
    bad: "border-danger/25 bg-danger-subtle text-danger",
  } as const;

  return (
    <section className={`rounded-panel border p-5 text-center sm:p-6 ${tones[tone]}`}>
      <span className="inline-flex size-14 items-center justify-center rounded-pill bg-surface-raised">
        {icon}
      </span>
      <h1 className="mt-4 text-heading text-ink sm:text-title">{headline}</h1>
      {sub && <p className="prose-measure mx-auto mt-2 text-body">{sub}</p>}
    </section>
  );
}

/** Snapshots, printed exactly as they were at issue. */
function Details({ certificate, muted }: { certificate: Certificate; muted?: boolean }) {
  return (
    <dl
      className={`mt-4 divide-y divide-border rounded-card border border-border bg-surface-raised px-4 ${
        muted ? "opacity-70" : ""
      }`}
    >
      <Row label="Student" value={certificate.studentName} strong />
      <Row label="Course" value={certificate.courseTitle} />
      <Row label="Issued by" value={certificate.academyName} />
      <Row label="Issued on" value={formatDate(certificate.issuedAt)} />
      <Row label="Certificate code" value={certificate.code} mono />
    </dl>
  );
}

function Row({
  label,
  value,
  strong,
  mono,
}: {
  label: string;
  value: string;
  strong?: boolean;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3">
      <dt className="text-sm text-muted">{label}</dt>
      <dd
        className={`min-w-0 text-right ${strong ? "text-base font-semibold text-ink" : "text-sm text-body"} ${
          mono ? "font-mono tabular-nums" : ""
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

function Superseded({ old }: { old: Certificate }) {
  return (
    <p className="mt-3 rounded-card border border-border bg-surface-sunken p-3.5 text-sm text-muted">
      The code you checked, <span className="font-mono">{old.code}</span>, was issued on{" "}
      {formatDate(old.issuedAt)} and replaced
      {old.status.state === "reissued" ? ` on ${formatDate(old.status.reissuedAt)}` : ""}.
      {old.status.state === "reissued" && ` ${old.status.reason}`}
    </p>
  );
}
