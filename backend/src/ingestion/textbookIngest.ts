import { readFileSync } from "node:fs";
// @ts-ignore
import pdfParse from "pdf-parse";
import { pool } from "../db/client.js";

// ─────────────────────────────────────────────────────────────────────────
// READ THIS BEFORE USING
//
// This script deliberately does NOT chunk, embed, or store textbook body
// text anywhere the API can serve it. It only extracts a table of contents
// (chapter number + title + page range) so the admin tool can attach a
// citation like "Harrison's Ch. 252, pp. 1234-1245" to a disease page.
//
// The source PDF itself should sit in private_textbook_store/ (git-ignored,
// never uploaded to S3/object storage the API touches) purely as a
// reference copy for your human content writers — or feed it to NotebookLM
// yourself for your own reading/synthesis. Nothing in this pipeline
// publishes textbook text to end users. See 0001_init.sql's comments on
// textbook_references for the legal reasoning.
//
// Usage: tsx src/ingestion/textbookIngest.ts <pdfPath> <bookTitle> <edition>
// It will print detected chapter headings for you to review, then you
// manually (or via a follow-up script) insert the ones you want into
// textbook_references, each linked to a disease_id.
// ─────────────────────────────────────────────────────────────────────────

interface DetectedChapter {
  chapterNumber: string;
  chapterTitle: string;
  approxPage: number;
}

function detectChapters(text: string): DetectedChapter[] {
  const lines = text.split("\n");
  const chapters: DetectedChapter[] = [];
  const chapterPattern = /^Chapter\s+(\d+)[:.]?\s+(.+)$/i;

  let approxPage = 0;
  const CHARS_PER_PAGE_ESTIMATE = 2200;
  let charCount = 0;

  for (const line of lines) {
    charCount += line.length + 1;
    approxPage = Math.floor(charCount / CHARS_PER_PAGE_ESTIMATE) + 1;
    const match = line.trim().match(chapterPattern);
    if (match) {
      chapters.push({ chapterNumber: match[1], chapterTitle: match[2].trim(), approxPage });
    }
  }
  return chapters;
}

async function main() {
  const [pdfPath, bookTitle, edition] = process.argv.slice(2);
  if (!pdfPath || !bookTitle) {
    console.error("Usage: tsx src/ingestion/textbookIngest.ts <pdfPath> <bookTitle> <edition>");
    process.exit(1);
  }

  const buf = readFileSync(pdfPath);
  const parsed = await pdfParse(buf);
  const chapters = detectChapters(parsed.text);

  console.log(`\nDetected ${chapters.length} chapter headings in "${bookTitle}" (${edition || "edition unknown"}):\n`);
  for (const c of chapters) {
    console.log(`  Ch. ${c.chapterNumber} — ${c.chapterTitle} (~p.${c.approxPage})`);
  }
  console.log(
    "\nNo database writes performed. Review the list above, then use insertTextbookReference()" +
      " below (or the admin UI) to link the chapters you want to specific disease_id rows."
  );
  console.log("Reminder: this script never stores chapter body text — metadata only.\n");

  await pool.end();
}

// Helper for the admin tool / a manual follow-up script to call once a human
// has matched a chapter to a disease.
export async function insertTextbookReference(params: {
  diseaseId: string;
  bookTitle: string;
  edition?: string;
  chapterNumber: string;
  chapterTitle: string;
  pageRange?: string;
  note?: string;
}) {
  await pool.query(
    `INSERT INTO textbook_references
      (disease_id, book_title, edition, chapter_number, chapter_title, page_range, note)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      params.diseaseId,
      params.bookTitle,
      params.edition || null,
      params.chapterNumber,
      params.chapterTitle,
      params.pageRange || null,
      params.note || null,
    ]
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
