# MedEvidence Admin

Small internal tool for the content team: create/edit diseases, manage textbook
chapter references, and view (read-only) which guideline chunks are attached to
a disease. This is Phase 1's "admin tool" from the plan.

## Setup

```bash
cp .env.example .env    # set VITE_CLERK_PUBLISHABLE_KEY (same Clerk project as the backend)
npm install
npm run dev              # runs on :5174
```

Requires the backend (`medevidence-backend`) running on `:4000` (or wherever
`VITE_API_BASE_URL` points).

## Auth

Uses `@clerk/clerk-react`. Anyone who can sign in can view; only users whose
`users.role` is `admin` or `content_editor` in the backend DB can save changes
(the backend enforces this — see `requireRole` in
`medevidence-backend/src/middleware/auth.ts`). If you sign in with a fresh
account it'll auto-provision as `clinician` and writes will 403 until you
promote the row manually:

```sql
UPDATE users SET role = 'content_editor' WHERE email = 'you@example.com';
```

## What's here vs. not

- **Diseases**: full create/edit (name, evidence grade, pathophysiology
  summary).
- **Textbook references**: add/remove chapter+page metadata, linked to a
  disease. Deliberately has no field for pasting chapter text — see the
  hint text in the form and the backend README for why.
- **Guideline chunks**: read-only list. These come from
  `guidelineIngest.ts` on the backend, not from this UI — building a
  guideline-upload form here is a reasonable Phase 1.5 addition once the
  ingestion script is stable.
- **Drugs / calculators**: not yet built — same CRUD pattern as
  `DiseaseEditPage.tsx`, add when the backend routes exist.

## Split suggestion

This whole app is a natural Person A task (matches "content backend +
admin tool" from the plan), since it's the same person building the
`diseases`/`textbook-references` backend routes it talks to.
