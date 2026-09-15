import type { ReactNode } from "react";

/**
 * The public side. No studio shell, no sidebar, no auth, and no
 * Providers — this subtree has no client data, and a query cache is
 * dead weight on a page opened by a QR scanner on a bad connection.
 */
export default function PublicLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-dvh bg-surface">{children}</div>;
}
