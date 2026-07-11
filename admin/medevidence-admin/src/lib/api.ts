// Thin fetch wrapper: every call grabs a fresh Clerk session token and
// attaches it as a Bearer token, matching what src/middleware/auth.ts on the
// backend expects (getAuth(req) via clerkMiddleware()).

const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

export type GetTokenFn = () => Promise<string | null>;

async function request<T>(
  getToken: GetTokenFn,
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${body}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export interface Disease {
  id: string;
  name: string;
  slug: string;
  icd10_codes: string[];
  pathophysiology_summary: string | null;
  diagnosis_criteria: Record<string, unknown>;
  treatment_algorithm: Record<string, unknown>;
  evidence_grade: string | null;
  last_reviewed_at: string | null;
}

export interface DiseaseDetail extends Disease {
  guidelines: {
    id: string;
    section_heading: string;
    text: string;
    evidence_grade: string | null;
    society: string;
    title: string;
    published_date: string | null;
    source_url: string | null;
  }[];
  trials: {
    id: string;
    name: string;
    summary: string;
    key_finding: string;
    publication_year: number | null;
    pubmed_id: string | null;
  }[];
  textbookReferences: {
    id?: string;
    book_title: string;
    edition: string | null;
    chapter_number: string;
    chapter_title: string;
    page_range: string | null;
    note: string | null;
  }[];
}

export const api = {
  listDiseases: (getToken: GetTokenFn, search = "") =>
    request<Disease[]>(getToken, `/diseases?search=${encodeURIComponent(search)}`),

  getDisease: (getToken: GetTokenFn, slug: string) =>
    request<DiseaseDetail>(getToken, `/diseases/${slug}`),

  createDisease: (
    getToken: GetTokenFn,
    body: Partial<Disease> & { name: string; slug: string }
  ) => request<Disease>(getToken, `/diseases`, { method: "POST", body: JSON.stringify(body) }),

  updateDisease: (getToken: GetTokenFn, id: string, body: Partial<Disease>) =>
    request<Disease>(getToken, `/diseases/${id}`, { method: "PATCH", body: JSON.stringify(body) }),

  deleteDisease: (getToken: GetTokenFn, id: string) =>
    request<void>(getToken, `/diseases/${id}`, { method: "DELETE" }),

  addTextbookReference: (
    getToken: GetTokenFn,
    body: {
      diseaseId: string;
      bookTitle: string;
      edition?: string;
      chapterNumber: string;
      chapterTitle: string;
      pageRange?: string;
      note?: string;
    }
  ) =>
    request<unknown>(getToken, `/textbook-references`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  deleteTextbookReference: (getToken: GetTokenFn, id: string) =>
    request<void>(getToken, `/textbook-references/${id}`, { method: "DELETE" }),
};
