import { readFileSync } from "node:fs";
// @ts-ignore - pdf-parse has no types
import pdfParse from "pdf-parse";
import { pool } from "../db/client.js";
import { embedBatch } from "../services/embeddings.js";

// Usage: tsx src/ingestion/guidelineIngest.ts <pdfPath> <society> <title> <topic> <publishedDate YYYY-MM-DD> <sourceUrl> [diseaseSlug]
// Guidelines are public/citable content, so unlike textbooks we DO store and
// chunk the full text here.

function chunkBySection(text: string, targetTokenChars = 3000): { heading: string; text: string }[] {
  // Naive splitter: break on headings that look like "1. Introduction" / "ALL CAPS HEADER"
  // then further split any oversized section into ~3000-char pieces (~600-800 tokens).
  const lines = text.split("\n");
  const sections: { heading: string; text: string }[] = [];
  let currentHeading = "Preamble";
  let buffer: string[] = [];

  const isHeadingLike = (line: string) =>
    /^\d+(\.\d+)*\s+[A-Z]/.test(line.trim()) || (/^[A-Z][A-Z\s]{6,}$/.test(line.trim()) && line.trim().length < 80);

  for (const line of lines) {
    if (isHeadingLike(line)) {
      if (buffer.length) sections.push({ heading: currentHeading, text: buffer.join("\n").trim() });
      currentHeading = line.trim();
      buffer = [];
    } else {
      buffer.push(line);
    }
  }
  if (buffer.length) sections.push({ heading: currentHeading, text: buffer.join("\n").trim() });

  // Split oversized sections further
  const chunks: { heading: string; text: string }[] = [];
  for (const s of sections) {
    if (s.text.length <= targetTokenChars) {
      if (s.text.length > 40) chunks.push(s);
      continue;
    }
    for (let i = 0; i < s.text.length; i += targetTokenChars) {
      chunks.push({ heading: s.heading, text: s.text.slice(i, i + targetTokenChars) });
    }
  }
  return chunks;
}

async function main() {
  const [pdfPath, society, title, topic, publishedDate, sourceUrl, diseaseSlug] = process.argv.slice(2);
  if (!pdfPath || !society || !title) {
    console.error(
      "Usage: tsx src/ingestion/guidelineIngest.ts <pdfPath> <society> <title> <topic> <publishedDate> <sourceUrl> [diseaseSlug]"
    );
    process.exit(1);
  }

  const buf = readFileSync(pdfPath);
  const parsed = await pdfParse(buf);
  const chunks = chunkBySection(parsed.text);
  console.log(`Parsed ${chunks.length} chunks from ${pdfPath}`);

  const docRes = await pool.query(
    `INSERT INTO guideline_documents (society, title, topic, published_date, source_url)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [society, title, topic, publishedDate || null, sourceUrl || null]
  );
  const documentId = docRes.rows[0].id;

  let diseaseId: string | null = null;
  if (diseaseSlug) {
    const dRes = await pool.query(`SELECT id FROM diseases WHERE slug = $1`, [diseaseSlug]);
    diseaseId = dRes.rows[0]?.id || null;
    if (!diseaseId) console.warn(`Warning: disease slug "${diseaseSlug}" not found, chunks will be unlinked`);
  }

  const embeddings = await embedBatch(chunks.map((c) => c.text));

  for (let i = 0; i < chunks.length; i++) {
    const vectorLiteral = `[${embeddings[i].join(",")}]`;
    await pool.query(
      `INSERT INTO guideline_chunks (document_id, disease_id, section_heading, text, embedding)
       VALUES ($1, $2, $3, $4, $5)`,
      [documentId, diseaseId, chunks[i].heading, chunks[i].text, vectorLiteral]
    );
  }

  console.log(`Ingested ${chunks.length} chunks into guideline_chunks for document ${documentId}`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
