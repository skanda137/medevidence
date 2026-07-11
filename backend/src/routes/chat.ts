import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/client.js";
import { retrieveContext } from "../services/retrieval.js";
import { generateAnswer } from "../services/generate.js";

export const chatRouter = Router();

const askSchema = z.object({
  sessionId: z.string().uuid().optional(),
  question: z.string().min(1),
  diseaseId: z.string().uuid().optional(),
});

// POST /chat/ask
// This is the endpoint AIPage.tsx should call instead of using static demo data.
chatRouter.post("/ask", async (req, res) => {
  const parsed = askSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { question, diseaseId } = parsed.data;
  let { sessionId } = parsed.data;

  if (!sessionId) {
    const { rows } = await pool.query(
      `INSERT INTO chat_sessions DEFAULT VALUES RETURNING id`
    );
    sessionId = rows[0].id;
  }

  const chunks = await retrieveContext(question, { diseaseId });
  const { answer, confidence } = await generateAnswer(question, chunks);

  const citedGuidelineIds = chunks.filter((c) => c.kind === "guideline").map((c) => c.id);
  const citedTrialIds = chunks.filter((c) => c.kind === "trial").map((c) => c.id);

  await pool.query(
    `INSERT INTO chat_messages (session_id, role, content, cited_guideline_chunk_ids, cited_trial_ids, retrieval_confidence)
     VALUES ($1, 'user', $2, '{}', '{}', NULL),
            ($1, 'assistant', $3, $4, $5, $6)`,
    [sessionId, question, answer, citedGuidelineIds, citedTrialIds, confidence]
  );

  res.json({
    sessionId,
    answer,
    confidence,
    citations: chunks.map((c) => ({
      source: c.source,
      evidenceGrade: c.evidenceGrade,
      kind: c.kind,
    })),
  });
});
