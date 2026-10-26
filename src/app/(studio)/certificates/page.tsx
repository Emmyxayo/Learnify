import { notFound } from "next/navigation";
import { FEATURES } from "@shared/lib/features";
import { CertificatesScreen } from "@ui/patterns/certificates/certificates-screen";

export const metadata = { title: "Certificates — Learnify" };

export default function Page() {
  /* certificates has no endpoints on this backend, so the screen is
     not shown rather than shown and then broken. */
  if (!FEATURES.certificates) notFound();

  return <CertificatesScreen />;
}
