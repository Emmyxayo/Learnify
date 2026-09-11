import type { ReactNode } from "react";
import Link from "next/link";

export default function StudioLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-surface">
      <header className="border-b border-border bg-surface-raised">
        <div className="container-page flex h-14 items-center">
          <Link href="/" className="font-bold tracking-tight text-brand">
            Learnify
          </Link>
        </div>
      </header>
      {children}
    </div>
  );
}
