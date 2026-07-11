# MedEvidence AI — Backend Starter

Implements Phase 0–2 of the plan: schema, diseases CRUD, guideline RAG chat endpoint,
guideline comparison endpoint, and both ingestion pipelines.

## Setup

```bash
cp .env.example .env        # fill in ANTHROPIC_API_KEY, OPENAI_API_KEY
docker compose up -d        # starts Postgres + pgvector on :5432
npm install
npm run migrate             # applies src/db/migrations/0001_init.sql
npm run dev                 # starts API on :4000
```

Health check: `GET http://localhost:4000/health`

## Endpoints in this starter

- `GET /diseases?search=` — list/search
- `GET /diseases/:slug` — full page: guideline chunks, trials, textbook chapter refs
- `POST /diseases` — create (admin tool target)
- `POST /chat/ask` — RAG chat: `{ question, diseaseId? }` → grounded, cited answer
- `GET /guidelines/compare/:diseaseSlug` — recommendations grouped by society, for the
  Guideline Comparison Engine page

## How textbook PDFs are handled (read this before ingesting anything)

**Never put Harrison's/Robbins/Katzung/etc. full text into the vector DB or any endpoint
the API serves.** That's straightforward copyright infringement — you don't have a
license to redistribute or let an AI reproduce/paraphrase-closely from those books to
end users, no matter how the request to the AI is framed.

What you *can* do, and what this repo is set up for:

1. **Guidelines and trial abstracts** (`src/ingestion/guidelineIngest.ts`) — these are
   public/citable. Full pipeline: PDF → section-aware chunking → embed → store in
   `guideline_chunks`. This is the only content the `/chat/ask` RAG pipeline retrieves
   from (see `src/services/retrieval.ts` — it deliberately queries only
   `guideline_chunks` and `trials`, never a textbook table).

2. **Textbooks** (`src/ingestion/textbookIngest.ts`) — extracts only chapter number,
   title, and approximate page range from the PDF's table of contents. Nothing else is
   stored. Run it, review the printed chapter list, then call
   `insertTextbookReference()` (or build a small admin-UI form around it) to link a
   chapter to a `disease_id`. The frontend can then render "Harrison's Ch. 252" as a
   citation chip that doctors recognize, without you ever serving copyrighted text.

3. **Where the actual PDFs live**: drop them in `private_textbook_store/` locally (it's
   git-ignored) or in a private, non-public object storage bucket your API never reads
   from. That's your/your co-founder's personal reference copy — useful for feeding into
   NotebookLM yourselves while *you* write the original `pathophysiology_summary` text
   on each disease page. NotebookLM's output is for your own drafting process; don't
   pipe it directly into a public-facing field if it stays close to the book's wording —
   rewrite it in your own words the way you would for any other cited source.

4. **`diseases.pathophysiology_summary`** is explicitly documented in the migration as
   original content — written by a human (or Claude, prompted to explain the mechanism
   generally, not to quote a specific text) — with the textbook chapter attached only as
   a "for further reading" reference, the same way a review article cites a textbook
   without reproducing it.

If down the line you want *actual* textbook excerpts retrievable, the legitimate path is
a licensing deal with the publisher — the same thing UpToDate/DynaMed had to do. Don't
try to route around that with chunking tricks.

## Suggested split (2 people)

- **Person A**: `src/routes/diseases.ts`, admin tool (CRUD UI on top of the same
  endpoints), `src/ingestion/textbookIngest.ts` refinement, billing/CME tables (already
  in the migration, routes not yet built).
- **Person B**: `src/services/retrieval.ts`, `src/services/generate.ts`,
  `src/ingestion/guidelineIngest.ts`, `src/routes/chat.ts`, `src/routes/guidelines.ts`
  (comparison engine query logic).

## Next steps not yet in this starter

- Auth middleware (Clerk) — currently every route is open; add a middleware in
  `src/middleware/` that populates `req.user` from the Clerk session before any of this
  goes near production data.
- `drugs` and `calculators` routes (schema exists, routes don't yet — same CRUD pattern
  as `diseases.ts`).
- Re-ranking step in retrieval once you have enough guideline volume that top-k cosine
  similarity alone gets noisy.
- Rate limiting on `/chat/ask` (LLM calls are your most expensive path).
