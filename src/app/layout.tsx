import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { DELIVERY } from "@shared/lib/delivery";

/**
 * One family, weight contrast doing the work. The prototype's headlines
 * are a geometric grotesk with tight tracking; Jakarta is the closest
 * open equivalent. Swap the import here and nothing else changes.
 */
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
  display: "swap",
});

/**
 * The default title and og:description for every page — which is what
 * a WhatsApp group sees when a creator pastes a course link.
 *
 * Keyed to the delivery channel rather than hardcoded. It promised
 * WhatsApp delivery on a build that has none, in the one place the
 * promise reaches a student before they have read anything else.
 */
export const metadata: Metadata = {
  title: DELIVERY.siteTitle,
  description: DELIVERY.siteDescription,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={jakarta.variable}>
      <body>{children}</body>
    </html>
  );
}
