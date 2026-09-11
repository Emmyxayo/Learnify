import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

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

export const metadata: Metadata = {
  title: "Learnify — Teach on WhatsApp",
  description:
    "Build a course, sell it, and deliver it on WhatsApp. No app for your students to download.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={jakarta.variable}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
