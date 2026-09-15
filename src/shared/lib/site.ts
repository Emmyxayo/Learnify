/**
 * Where this deployment lives. Sales pages get shared, forwarded and
 * indexed, so every canonical and Open Graph URL has to be absolute —
 * a relative one in a WhatsApp link preview resolves against nothing.
 */
export const SITE_ORIGIN = process.env.NEXT_PUBLIC_SITE_ORIGIN ?? "https://learnify.com";

export const absoluteUrl = (path: string) => new URL(path, SITE_ORIGIN).toString();

/**
 * The public URL of a course.
 *
 * Path-based today. When real subdomain routing lands this becomes
 * `https://<creatorSlug>.learnify.com/<courseSlug>` and this is the
 * one function that has to change.
 */
export const courseUrl = (creatorSlug: string, courseSlug: string) =>
  `/c/${creatorSlug}/${courseSlug}`;

export const enrolUrl = (creatorSlug: string, courseSlug: string) =>
  `${courseUrl(creatorSlug, courseSlug)}/enrol`;
