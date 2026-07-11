import "dotenv/config";

// Swap this out for whichever embedding provider you pick (OpenAI, Cohere, Voyage).
// Kept as a single function so the rest of the codebase never cares which one you use.
// Dimension must match the `vector(1536)` columns in 0001_init.sql — if you change
// providers/models to a different dimension, update the migration too.

export async function embedText(text: string): Promise<number[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY not set — required for embeddings");
  }

  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.EMBEDDING_MODEL || "text-embedding-3-large",
      input: text,
    }),
  });

  if (!res.ok) {
    throw new Error(`Embedding request failed: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as { data: { embedding: number[] }[] };
  return data.data[0].embedding;
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  // Naive sequential loop for clarity — batch this properly (single API call
  // with an array input) once you're ingesting hundreds of chunks.
  const out: number[][] = [];
  for (const t of texts) {
    out.push(await embedText(t));
  }
  return out;
}
