import type { ReactNode } from "react";
import Link from "next/link";

/** Full-bleed at 360px, centred once there is room. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-8 px-4 py-10">
      <Link href="/" className="text-lg font-bold tracking-tight text-brand">
        Learnify
      </Link>
      {children}
    </div>
  );
}
