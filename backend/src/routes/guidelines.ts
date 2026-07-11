import { Router } from "express";
import { pool } from "../db/client.js";

export const guidelinesRouter = Router();

// GET /guidelines/compare/:diseaseSlug
// Returns each society's current recommendation chunks side by side —
// backs the Guideline Comparison Engine page.
guidelinesRouter.get("/compare/:diseaseSlug", async (req, res) => {
  const { rows } = await pool.query(
    `SELECT gd.society, gd.title, gd.published_date, gc.section_heading, gc.text, gc.evidence_grade
     FROM guideline_chunks gc
     JOIN guideline_documents gd ON gd.id = gc.document_id
     JOIN diseases d ON d.id = gc.disease_id
     WHERE d.slug = $1 AND gd.is_current = true
     ORDER BY gd.society, gd.published_date DESC`,
    [req.params.diseaseSlug]
  );

  const bySociety: Record<string, typeof rows> = {};
  for (const row of rows) {
    bySociety[row.society] = bySociety[row.society] || [];
    bySociety[row.society].push(row);
  }
  res.json(bySociety);
});
