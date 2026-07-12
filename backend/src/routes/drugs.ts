import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/client.js";

export const drugsRouter = Router();

// GET /drugs?search=metformin
// This is the source of truth for anything dose-related. The chat assistant
// (see services/generate.ts, rule 5) deliberately refuses to state dosing
// numbers itself and instead points here — so a wrong number only needs to
// be fixed in one place, not re-prompted-around in the LLM layer.
drugsRouter.get("/", async (req, res) => {
  const search = (req.query.search as string) || "";
  const { rows } = await pool.query(
    `SELECT id, name, drug_class
     FROM drugs
     WHERE $1 = '' OR name ILIKE '%' || $1 || '%'
     ORDER BY name ASC
     LIMIT 50`,
    [search]
  );
  res.json(rows);
});

// GET /drugs/:id — full structured record, including dosing
drugsRouter.get("/:id", async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, name, drug_class, dosing_by_renal_function, black_box_warnings,
            interactions, pregnancy_lactation_summary, created_at
     FROM drugs WHERE id = $1`,
    [req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: "Drug not found" });
  res.json(rows[0]);
});

const upsertSchema = z.object({
  name: z.string().min(1),
  drugClass: z.string().optional(),
  dosingByRenalFunction: z.record(z.any()).optional(),
  blackBoxWarnings: z.array(z.string()).optional(),
  interactions: z.record(z.any()).optional(),
  pregnancyLactationSummary: z.string().optional(),
});

// POST /drugs (admin tool target — same pattern as diseases.ts)
drugsRouter.post("/", async (req, res) => {
  const parsed = upsertSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const d = parsed.data;

  const { rows } = await pool.query(
    `INSERT INTO drugs
      (name, drug_class, dosing_by_renal_function, black_box_warnings, interactions, pregnancy_lactation_summary)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      d.name,
      d.drugClass || null,
      d.dosingByRenalFunction || {},
      d.blackBoxWarnings || [],
      d.interactions || {},
      d.pregnancyLactationSummary || null,
    ]
  );
  res.status(201).json(rows[0]);
});
