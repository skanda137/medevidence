-- 0001_init.sql
-- MedEvidence AI core schema
-- Design principle: guidelines & trials are RAG-able (full text stored/chunked/embedded).
-- Textbooks are REFERENCE ONLY — we never store or serve their full text. See textbook_references.

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto; -- for gen_random_uuid()

-- ─────────────────────────────────────────────
-- Users / Orgs (minimal — Clerk/Auth0 is source of truth for auth itself)
-- ─────────────────────────────────────────────
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  seat_count INT DEFAULT 1,
  sso_config JSONB,
  billing_contact TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_provider_id TEXT UNIQUE NOT NULL, -- Clerk/Auth0 user id
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'clinician', -- clinician | admin | enterprise_admin | content_editor
  org_id UUID REFERENCES organizations(id),
  specialty TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────
-- Diseases (the hub entity everything else links into)
-- ─────────────────────────────────────────────
CREATE TABLE diseases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  icd10_codes TEXT[] DEFAULT '{}',
  -- Original, human/AI-authored summary — NOT copied from any textbook.
  pathophysiology_summary TEXT,
  diagnosis_criteria JSONB,
  treatment_algorithm JSONB,
  evidence_grade TEXT, -- A | B | C | Expert opinion (overall page grade)
  last_reviewed_at TIMESTAMPTZ,
  last_reviewed_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────
-- TIER 1: Guidelines — fully RAG-able
-- ─────────────────────────────────────────────
CREATE TABLE guideline_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society TEXT NOT NULL,        -- 'ESC', 'ACC/AHA', 'NICE', 'WHO', 'KDIGO', 'GOLD', 'GINA', 'NCCN', 'IDSA', 'ADA'
  title TEXT NOT NULL,
  topic TEXT NOT NULL,
  published_date DATE,
  version TEXT,
  source_url TEXT,
  raw_storage_key TEXT,         -- pointer to S3/object storage for the original PDF/HTML
  ingested_at TIMESTAMPTZ DEFAULT now(),
  is_current BOOLEAN DEFAULT true -- flipped false when superseded by a newer version
);

CREATE TABLE guideline_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES guideline_documents(id) ON DELETE CASCADE,
  disease_id UUID REFERENCES diseases(id),
  section_heading TEXT,
  page_ref TEXT,
  text TEXT NOT NULL,           -- the actual chunk text (public guideline content — safe to store/serve)
  evidence_grade TEXT,          -- per-recommendation grade if the chunk is a specific recommendation
  embedding vector(1536),       -- adjust dimension to match your embedding model
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX guideline_chunks_embedding_idx ON guideline_chunks
  USING hnsw (embedding vector_cosine_ops);
CREATE INDEX guideline_chunks_disease_idx ON guideline_chunks(disease_id);

-- ─────────────────────────────────────────────
-- TIER 2: Landmark trials — RAG-able (abstracts/summaries, not full paywalled paper text)
-- ─────────────────────────────────────────────
CREATE TABLE trials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,           -- 'DAPA-HF', 'PARADIGM-HF', etc.
  disease_id UUID REFERENCES diseases(id),
  pubmed_id TEXT,
  summary TEXT NOT NULL,        -- original written summary, or public abstract
  key_finding TEXT NOT NULL,
  publication_year INT,
  embedding vector(1536),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX trials_embedding_idx ON trials USING hnsw (embedding vector_cosine_ops);

-- ─────────────────────────────────────────────
-- TIER 3: Textbooks — METADATA ONLY. No full text, ever.
-- Purpose: let the UI show "Harrison's Ch. 252" as a citation/reference link,
-- and let the admin/content team track which chapters informed a given
-- original summary. The book_pdf lives in a private, non-served store
-- (see private_textbook_store/ and ingestion/textbookIngest.ts) purely so
-- your human writers / NotebookLM can consult it — the API never returns
-- its contents.
-- ─────────────────────────────────────────────
CREATE TABLE textbook_references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  disease_id UUID REFERENCES diseases(id),
  book_title TEXT NOT NULL,     -- 'Harrison''s Principles of Internal Medicine'
  edition TEXT,
  chapter_number TEXT,
  chapter_title TEXT,
  page_range TEXT,
  note TEXT,                    -- e.g. "used as background for pathophysiology_summary"
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────
-- Drugs
-- ─────────────────────────────────────────────
CREATE TABLE drugs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  drug_class TEXT,
  dosing_by_renal_function JSONB,
  black_box_warnings TEXT[] DEFAULT '{}',
  interactions JSONB,
  pregnancy_category TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────
-- Calculators
-- ─────────────────────────────────────────────
CREATE TABLE calculators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  formula_type TEXT,
  input_schema JSONB,
  interpretation_rules JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────
-- AI Assistant — chat history + citations
-- ─────────────────────────────────────────────
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL, -- 'user' | 'assistant'
  content TEXT NOT NULL,
  cited_guideline_chunk_ids UUID[] DEFAULT '{}',
  cited_trial_ids UUID[] DEFAULT '{}',
  retrieval_confidence TEXT, -- 'high' | 'low' | 'none' — drives the frontend warning banner
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────
-- CME + Subscriptions (Phase 3, included now so migrations don't fragment later)
-- ─────────────────────────────────────────────
CREATE TABLE cme_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  credits NUMERIC,
  content_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE cme_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  course_id UUID REFERENCES cme_courses(id),
  completed_at TIMESTAMPTZ,
  certificate_url TEXT
);

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id),
  user_id UUID REFERENCES users(id),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  plan_tier TEXT, -- 'free' | 'pro' | 'enterprise'
  status TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
