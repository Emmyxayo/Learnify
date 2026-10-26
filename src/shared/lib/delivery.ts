import { FEATURES } from "./features";

/* ============================================================
   How lessons actually reach a student, in words.

   The product was designed WhatsApp-native: lessons arrive as
   messages, there is nothing to install, and the sales page says so
   in four different places. This backend does not send a single
   WhatsApp message. It releases lessons to the web portal at /learn
   on the schedule the creator set, and notifies through the bell in
   that portal.

   Until this file existed, the promise was hardcoded. A student read
   "Lessons arrive on WhatsApp. Nothing to download." on the page
   where they decide to enrol, enrolled, and then waited for messages
   that were never coming. That is not a bug a creator can see — it
   is their reputation, spent on a promise the product could not
   keep, with their students and not ours.

   So the words live here, once, keyed to the flag that decides
   whether the channel exists. When a send path ships, set
   NEXT_PUBLIC_FEATURE_WHATSAPP=1 and every sentence moves together.
   ============================================================ */

const onWhatsApp = FEATURES.whatsappDelivery;

export const DELIVERY = {
  /** Mid-sentence, for "…reach you on X". */
  where: onWhatsApp ? "WhatsApp" : "your browser",

  /** Under the enrol button, where someone decides. */
  reassurance: onWhatsApp
    ? "Lessons arrive on WhatsApp. Nothing to download."
    : "Lessons open in your browser. Nothing to install.",

  /** The "how this works" panel on the sales page. */
  howItWorks: (schedule: string) =>
    onWhatsApp
      ? `${schedule}, straight to WhatsApp. No app, no login, no password — it arrives like a message from a friend.`
      : /* Not "the link we send you": nothing is sent. The lesson
           unlocks on the course page on its day, and the bell in the
           portal is the only notice there is. */
        `${schedule}. Each one unlocks on your course page that morning — no app to install.`,

  /* --- The enrol form -------------------------------------------
     Three fields, and every one of them was describing a product
     this backend is not. The phone was "WhatsApp number" with
     "Every lesson goes to this number" under it; the name promised a
     certificate nothing issues; the email was "optional", "for your
     receipt only" — on a free course, for the address that turns out
     to be the only way the student can ever sign in again.
     -------------------------------------------------------------- */

  /** Phone is identity here. It is a delivery address only on WhatsApp. */
  phoneLabel: onWhatsApp ? "WhatsApp number" : "Phone number",
  phoneHint: onWhatsApp
    ? "Every lesson goes to this number. Check it before you enrol."
    : "How your teacher knows you. Your lessons open on this site, not on your phone.",

  /**
   * Where a one-time code actually goes: email, and only email.
   *
   * The OTP endpoints deliver by mail — a request for a phone
   * identifier answers the same "if the account exists, a code has
   * been sent" and then sends nothing. So email is not a nicety on
   * the enrol form, it is the student's only key, and the form now
   * requires it and says what it is for.
   */
  emailLabel: "Email",
  emailHint: "Where your sign-in code goes. This is how you get back into the course.",
  codeSentTo: (email: string) => `We will email a code to ${email}.`,

  /**
   * Under the sign-in field, which takes either an email or a phone
   * number. Says which of the two will actually hear from us, so
   * nobody types a phone number and then waits for a text.
   */
  codeChannelHint: "Your code arrives by email, so use the address on your account.",

  /** What the creator is told their students will get. */
  afterPublish: onWhatsApp
    ? "Anyone with the link can join. Lessons start arriving on WhatsApp as soon as they do."
    : "Anyone with the link can join. Their first lesson opens as soon as they do, and the rest follow on your schedule.",

  /** The moment after someone enrols. */
  afterEnrol: onWhatsApp
    ? "Your first lesson will arrive on WhatsApp shortly."
    : "Your first lesson is ready now. Open it from the link on this page.",

  /** The og:description. What a WhatsApp group actually sees. */
  linkPreview: onWhatsApp
    ? "Delivered on WhatsApp."
    : "Lessons open in your browser, on a schedule.",

  /** The creator's empty dashboard, before any course exists. */
  emptyStudio: onWhatsApp
    ? "Upload what you already teach and Learnify turns it into lessons, then delivers them to your students on WhatsApp, one day at a time."
    : "Build a course from what you already teach, set the pace, and your students work through it one lesson at a time.",

  /** The tab title and og:description on every page. A shared link
      previews with these, so they reach a student first. */
  siteTitle: onWhatsApp ? "Learnify — Teach on WhatsApp" : "Learnify — Teach online",
  siteDescription: onWhatsApp
    ? "Build a course, sell it, and deliver it on WhatsApp. No app for your students to download."
    : "Build a course, set the pace, and let the lessons release themselves. No app for your students to download.",

  /** The same dashboard, once something is built but unpublished. */
  unpublished: onWhatsApp
    ? "You have a course started but nothing live yet. Publish it and your students start receiving lessons on WhatsApp."
    : "You have a course started but nothing live yet. Publish it and students can enrol and begin.",
} as const;
