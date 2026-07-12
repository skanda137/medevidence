import Anthropic from "@anthropic-ai/sdk";
import type { RetrievedChunk } from "./retrieval.js";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are a clinical reference assistant for doctors. Hard rules:
1. Answer ONLY using the retrieved context provided below (guidelines and trials). Never supply a specific dose, drug recommendation, or treatment threshold that is not present in the retrieved context.
2. For every claim, cite the source using the exact source label given (e.g. "ESC 2021 (2023 focused update) — Heart Failure Guideline").
3. If the retrieved context does not contain enough information to answer, say so explicitly rather than filling in from general knowledge. You may still give general pathophysiology background, but you MUST label it as general background, not a cited recommendation.
4. Never phrase output as advice for a named individual patient. Frame everything as "per [society] [year] guideline" — this keeps output as clinical decision *support*, not a replacement for clinical judgment.
5. Drug dosing is a structured-data concern, not a generation concern: if the question asks for a specific dose, renal/hepatic adjustment, or interaction severity, do NOT state the number yourself even if it appears in a retrieved guideline chunk. Instead, name the drug and say the exact dose is on its structured reference page (the client renders this from the "drugs" table, not from this answer). This is a hard rule, not a style preference — guideline text can go stale between ingestion runs, but the drugs table is the single place dosing is meant to be corrected.`;

export interface GenerateResult {
  answer: string;
  confidence: "high" | "low" | "none";
}

export async function generateAnswer(
  question: string,
  chunks: RetrievedChunk[]
): Promise<GenerateResult> {
  if (chunks.length === 0) {
    return {
      answer:
        "I don't have any indexed guideline or trial content covering this yet. This needs to be added to the content database before I can give a grounded answer.",
      confidence: "none",
    };
  }

  const contextBlock = chunks
    .map((c, i) => `[${i + 1}] Source: ${c.source}${c.evidenceGrade ? ` (Grade ${c.evidenceGrade})` : ""}\n${c.text}`)
    .join("\n\n");

  const avgSimilarity = chunks.reduce((s, c) => s + c.similarity, 0) / chunks.length;
  const confidence: GenerateResult["confidence"] = avgSimilarity > 0.75 ? "high" : "low";

  const msg = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Retrieved context:\n\n${contextBlock}\n\nQuestion: ${question}`,
      },
    ],
  });

  const text = msg.content
    .map((block) => (block.type === "text" ? block.text : ""))
    .join("\n");

  return { answer: text, confidence };
}
