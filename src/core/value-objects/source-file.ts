import { z } from "zod";

/* ============================================================
   Source material

   What a creator feeds the AI Course Builder. The rules live here
   rather than in the dropzone because the same limits have to be
   enforced by the backend, and a limit written twice is a limit
   that will disagree with itself.
   ============================================================ */

export const SourceFileKindSchema = z.enum(["pdf", "docx", "pptx", "audio", "text"]);
export type SourceFileKind = z.infer<typeof SourceFileKindSchema>;

export const SOURCE_FILE_KIND_LABELS: Record<SourceFileKind, string> = {
  pdf: "PDF",
  docx: "Word document",
  pptx: "Slides",
  audio: "Audio",
  text: "Text",
};

/**
 * Extensions first, MIME second.
 *
 * Browsers are unreliable about the Office types — a .docx arrives as
 * application/octet-stream often enough that trusting MIME alone
 * rejects real files. The extension is what the creator sees, so it
 * is what decides, with MIME only as a fallback for files renamed
 * without one.
 */
const KIND_RULES: Record<SourceFileKind, { extensions: string[]; mimePrefixes: string[] }> = {
  pdf:   { extensions: [".pdf"],  mimePrefixes: ["application/pdf"] },
  docx:  { extensions: [".docx", ".doc"], mimePrefixes: ["application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml"] },
  pptx:  { extensions: [".pptx", ".ppt"], mimePrefixes: ["application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml"] },
  audio: { extensions: [".mp3", ".m4a", ".wav", ".ogg", ".aac"], mimePrefixes: ["audio/"] },
  text:  { extensions: [".txt", ".md", ".rtf"], mimePrefixes: ["text/"] },
};

/** For the file input's accept attribute. */
export const ACCEPTED_EXTENSIONS = Object.values(KIND_RULES).flatMap((r) => r.extensions);

/**
 * Per kind, because one number for all of them is wrong at both ends:
 * an hour of audio is legitimately large, and a 25MB .txt file is
 * not a lesson, it is a mistake.
 */
export const MAX_BYTES: Record<SourceFileKind, number> = {
  pdf: 25 * 1024 * 1024,
  docx: 25 * 1024 * 1024,
  pptx: 50 * 1024 * 1024,
  audio: 100 * 1024 * 1024,
  text: 5 * 1024 * 1024,
};

/** One course's worth of material. Past this the builder loses the thread. */
export const MAX_SOURCE_FILES = 10;

export const extensionOf = (name: string): string => {
  const dot = name.lastIndexOf(".");
  return dot === -1 ? "" : name.slice(dot).toLowerCase();
};

export function detectSourceKind(name: string, mimeType: string): SourceFileKind | null {
  const extension = extensionOf(name);
  for (const [kind, rule] of Object.entries(KIND_RULES) as [SourceFileKind, typeof KIND_RULES[SourceFileKind]][]) {
    if (rule.extensions.includes(extension)) return kind;
  }
  const mime = mimeType.toLowerCase();
  for (const [kind, rule] of Object.entries(KIND_RULES) as [SourceFileKind, typeof KIND_RULES[SourceFileKind]][]) {
    if (rule.mimePrefixes.some((prefix) => mime.startsWith(prefix))) return kind;
  }
  return null;
}

/* ============================================================
   The file, once accepted
   ============================================================ */

export const SourceFileSchema = z.object({
  id: z.string(),
  name: z.string(),
  sizeBytes: z.number().int().nonnegative(),
  kind: SourceFileKindSchema,
  uploadedAt: z.string(),
});
export type SourceFile = z.infer<typeof SourceFileSchema>;

/* ============================================================
   Rejections

   Same shape as every other refusal in this codebase: a reason
   the caller can branch on, and a table that turns it into words.
   Each one carries a fix, because "Invalid file" tells a creator
   standing in front of a dropzone precisely nothing.
   ============================================================ */

export const SOURCE_FILE_PROBLEMS = [
  "unsupported-type",
  "too-large",
  "empty",
  "too-many",
  "duplicate",
] as const;
export type SourceFileProblem = (typeof SOURCE_FILE_PROBLEMS)[number];

export const SOURCE_FILE_PROBLEM_COPY: Record<
  SourceFileProblem,
  { title: string; fix: (ctx: { name: string; kind: SourceFileKind | null }) => string }
> = {
  "unsupported-type": {
    title: "That file type will not open",
    fix: () =>
      "Use a PDF, Word document, slide deck, audio recording or plain text file. If your notes are in Google Docs, download them as .docx first.",
  },
  "too-large": {
    title: "That file is too big",
    fix: ({ kind }) => {
      if (!kind) return "Try a smaller file.";
      const mb = Math.round(MAX_BYTES[kind] / 1024 / 1024);
      return kind === "audio"
        ? `Audio can be up to ${mb}MB. Split a long recording into parts and upload them together.`
        : `${SOURCE_FILE_KIND_LABELS[kind]} files can be up to ${mb}MB. Try splitting it, or exporting at a lower quality.`;
    },
  },
  empty: {
    title: "That file is empty",
    fix: ({ name }) => `${name} has nothing in it. Check it opens on your phone, then upload it again.`,
  },
  "too-many": {
    title: "That is more material than one course needs",
    fix: () =>
      `Upload up to ${MAX_SOURCE_FILES} files. If you have more, build a second course — shorter courses finish better anyway.`,
  },
  duplicate: {
    title: "You already added that file",
    fix: ({ name }) => `${name} is already in the list. Remove it there first if you meant to replace it.`,
  },
};

/**
 * Checks one candidate against the rules. Null means accepted.
 *
 * `existing` is passed in rather than read from anywhere, because
 * this file knows nothing about where the list lives.
 */
export function validateSourceFile(
  candidate: { name: string; sizeBytes: number; mimeType: string },
  existing: { name: string; sizeBytes: number }[] = []
): { problem: SourceFileProblem; kind: SourceFileKind | null } | null {
  const kind = detectSourceKind(candidate.name, candidate.mimeType);

  if (kind === null) return { problem: "unsupported-type", kind: null };
  if (candidate.sizeBytes === 0) return { problem: "empty", kind };
  if (candidate.sizeBytes > MAX_BYTES[kind]) return { problem: "too-large", kind };
  if (existing.length >= MAX_SOURCE_FILES) return { problem: "too-many", kind };
  if (existing.some((f) => f.name === candidate.name && f.sizeBytes === candidate.sizeBytes)) {
    return { problem: "duplicate", kind };
  }
  return null;
}
