"use client";

import { useSession } from "@app-layer/auth/use-session";
import { useCertificateTemplate, useIssuedCertificates } from "@app-layer/certificate/queries";
import { TemplateEditor } from "./template-editor";
import { IssuedList } from "./issued-list";

export function CertificatesScreen() {
  const { creator } = useSession();
  const template = useCertificateTemplate(creator?.id ?? null);
  const issued = useIssuedCertificates(creator?.id ?? null);

  const loading = !creator || template.isPending;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-heading text-ink sm:text-title">Certificates</h1>
        <p className="mt-1.5 text-muted">
          What your students receive when they finish, and everyone you have issued one to.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-ink">Your template</h2>
        {loading || !template.data ? (
          <div className="aspect-[1.414/1] w-full animate-pulse rounded-card bg-surface-sunken" aria-busy />
        ) : (
          <TemplateEditor
            template={template.data}
            creatorId={creator.id}
            tier={creator.plan}
            academyName={creator.profile?.academyName ?? creator.fullName}
          />
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-ink">Issued</h2>
        <IssuedList
          certificates={issued.data ?? []}
          isLoading={!creator || issued.isPending}
          isError={issued.isError}
          onRetry={() => issued.refetch()}
        />
      </section>
    </div>
  );
}
