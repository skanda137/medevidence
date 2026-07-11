import { pool } from "../db/client.js";
import { embedText } from "./embeddings.js";

export interface RetrievedChunk {
  id: string;
  kind: "guideline" | "trial";
  text: string;
  source: string;       // e.g. "ESC 2025 Heart Failure Guideline"
  evidenceGrade: string | null;
  similarity: number;
}

// Retrieves top-k relevant chunks from guideline_chunks + trials ONLY.
// Textbook content is intentionally never part of this retrieval set —
// see textbook_references table comments in the migration for why.
export async function retrieveContext(
  query: string,
  opts: { diseaseId?: string; topK?: number } = {}
): Promise<RetrievedChunk[]> {
  const topK = opts.topK ?? 6;
  const queryEmbedding = await embedText(query);
  const vectorLiteral = `[${queryEmbedding.join(",")}]`;

  const guidelineRows = await pool.query(
    `SELECT gc.id, gc.text, gc.evidence_grade,
            gd.society, gd.title, gd.published_date,
            1 - (gc.embedding <=> $1) AS similarity
     FROM guideline_chunks gc
     JOIN guideline_documents gd ON gd.id = gc.document_id
     WHERE gd.is_current = true
       ${opts.diseaseId ? "AND gc.disease_id = $3" : ""}
     ORDER BY gc.embedding <=> $1
     LIMIT $2`,
    opts.diseaseId ? [vectorLiteral, topK, opts.diseaseId] : [vectorLiteral, topK]
  );

  const trialRows = await pool.query(
    `SELECT id, summary AS text, key_finding, name, publication_year,
            1 - (embedding <=> $1) AS similarity
     FROM trials
     ${opts.diseaseId ? "WHERE disease_id = $3" : ""}
     ORDER BY embedding <=> $1
     LIMIT $2`,
    opts.diseaseId ? [vectorLiteral, Math.max(2, Math.floor(topK / 2)), opts.diseaseId]
                    : [vectorLiteral, Math.max(2, Math.floor(topK / 2))]
  );

  const guidelineChunks: RetrievedChunk[] = guidelineRows.rows.map((r) => ({
    id: r.id,
    kind: "guideline" as const,
    text: r.text,
    source: `${r.society} ${r.published_date ? new Date(r.published_date).getFullYear() : ""} — ${r.title}`.trim(),
    evidenceGrade: r.evidence_grade,
    similarity: r.similarity,
  }));

  const trialChunks: RetrievedChunk[] = trialRows.rows.map((r) => ({
    id: r.id,
    kind: "trial" as const,
    text: `${r.text} Key finding: ${r.key_finding}`,
    source: `${r.name} (${r.publication_year})`,
    evidenceGrade: null,
    similarity: r.similarity,
  }));

  return [...guidelineChunks, ...trialChunks].sort((a, b) => b.similarity - a.similarity);
}
