import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/client.js";

export const diseasesRouter = Router();

// GET /diseases?search=heart+failure
diseasesRouter.get("/", async (req, res) => {
  const search = (req.query.search as string) || "";
  const { rows } = await pool.query(
    `SELECT id, name, slug, icd10_codes, evidence_grade, last_reviewed_at
     FROM diseases
     WHERE $1 = '' OR name ILIKE '%' || $1 || '%'
     ORDER BY name ASC
     LIMIT 50`,
    [search]
  );
  res.json(rows);
});

// GET /diseases/:slug  — full page: guidelines, trials, textbook refs, drugs
diseasesRouter.get("/:slug", async (req, res) => {
  const { slug } = req.params;

  const diseaseRes = await pool.query(`SELECT * FROM diseases WHERE slug = $1`, [slug]);
  const disease = diseaseRes.rows[0];
  if (!disease) return res.status(404).json({ error: "Disease not found" });

  const [guidelines, trials, textbookRefs] = await Promise.all([
    pool.query(
      `SELECT gc.id, gc.section_heading, gc.text, gc.evidence_grade,
              gd.society, gd.title, gd.published_date, gd.source_url
       FROM guideline_chunks gc
       JOIN guideline_documents gd ON gd.id = gc.document_id
       WHERE gc.disease_id = $1 AND gd.is_current = true
       ORDER BY gd.published_date DESC`,
      [disease.id]
    ),
    pool.query(
      `SELECT id, name, summary, key_finding, publication_year, pubmed_id
       FROM trials WHERE disease_id = $1 ORDER BY publication_year DESC`,
      [disease.id]
    ),
    pool.query(
      `SELECT book_title, edition, chapter_number, chapter_title, page_range, note
       FROM textbook_references WHERE disease_id = $1`,
      [disease.id]
    ),
  ]);

  res.json({
    ...disease,
    guidelines: guidelines.rows,
    trials: trials.rows,
    // Note: this returns chapter/page metadata only — never full textbook text.
    textbookReferences: textbookRefs.rows,
  });
});

const upsertSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  icd10Codes: z.array(z.string()).optional(),
  pathophysiologySummary: z.string().optional(),
  diagnosisCriteria: z.record(z.any()).optional(),
  treatmentAlgorithm: z.record(z.any()).optional(),
  evidenceGrade: z.string().optional(),
});

// POST /diseases  (admin tool uses this)
diseasesRouter.post("/", async (req, res) => {
  const parsed = upsertSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const d = parsed.data;

  const { rows } = await pool.query(
    `INSERT INTO diseases
      (name, slug, icd10_codes, pathophysiology_summary, diagnosis_criteria, treatment_algorithm, evidence_grade)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      d.name,
      d.slug,
      d.icd10Codes || [],
      d.pathophysiologySummary || null,
      d.diagnosisCriteria || {},
      d.treatmentAlgorithm || {},
      d.evidenceGrade || null,
    ]
  );
  res.status(201).json(rows[0]);
});
