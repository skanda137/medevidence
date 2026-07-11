import { useEffect, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useNavigate, useParams } from "react-router-dom";
import { api, DiseaseDetail } from "../lib/api";

interface Props {
  mode: "create" | "edit";
}

export default function DiseaseEditPage({ mode }: Props) {
  const { getToken } = useAuth();
  const { slug } = useParams();
  const navigate = useNavigate();

  const [disease, setDisease] = useState<Partial<DiseaseDetail>>({
    name: "",
    slug: "",
    pathophysiology_summary: "",
    evidence_grade: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New textbook reference form state
  const [refForm, setRefForm] = useState({
    bookTitle: "",
    edition: "",
    chapterNumber: "",
    chapterTitle: "",
    pageRange: "",
    note: "",
  });

  useEffect(() => {
    if (mode === "edit" && slug) {
      api.getDisease(getToken, slug).then(setDisease).catch((e) => setError((e as Error).message));
    }
  }, [mode, slug]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (mode === "create") {
        const created = await api.createDisease(getToken, {
          name: disease.name!,
          slug: disease.slug!,
          pathophysiology_summary: disease.pathophysiology_summary,
          evidence_grade: disease.evidence_grade,
        });
        navigate(`/diseases/${created.slug}`);
      } else if (disease.id) {
        await api.updateDisease(getToken, disease.id, {
          name: disease.name,
          pathophysiology_summary: disease.pathophysiology_summary,
          evidence_grade: disease.evidence_grade,
        });
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleAddReference(e: React.FormEvent) {
    e.preventDefault();
    if (!disease.id) return;
    try {
      await api.addTextbookReference(getToken, { diseaseId: disease.id, ...refForm });
      const refreshed = await api.getDisease(getToken, slug!);
      setDisease(refreshed);
      setRefForm({ bookTitle: "", edition: "", chapterNumber: "", chapterTitle: "", pageRange: "", note: "" });
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function handleDeleteReference(id?: string) {
    if (!id) return;
    await api.deleteTextbookReference(getToken, id);
    const refreshed = await api.getDisease(getToken, slug!);
    setDisease(refreshed);
  }

  return (
    <div>
      <h1 style={{ fontSize: 20, marginBottom: 16 }}>
        {mode === "create" ? "New disease" : disease.name || "Loading…"}
      </h1>
      {error && <p style={{ color: "crimson" }}>{error}</p>}

      <form onSubmit={handleSave} style={{ display: "grid", gap: 12, maxWidth: 600 }}>
        <label style={labelStyle}>
          Name
          <input
            required
            value={disease.name || ""}
            onChange={(e) => setDisease({ ...disease, name: e.target.value })}
            style={inputStyle}
          />
        </label>

        {mode === "create" && (
          <label style={labelStyle}>
            Slug (url-safe id, e.g. "heart-failure")
            <input
              required
              value={disease.slug || ""}
              onChange={(e) => setDisease({ ...disease, slug: e.target.value })}
              style={inputStyle}
            />
          </label>
        )}

        <label style={labelStyle}>
          Evidence grade
          <select
            value={disease.evidence_grade || ""}
            onChange={(e) => setDisease({ ...disease, evidence_grade: e.target.value })}
            style={inputStyle}
          >
            <option value="">—</option>
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
            <option value="Expert opinion">Expert opinion</option>
          </select>
        </label>

        <label style={labelStyle}>
          Pathophysiology summary
          <span style={hintStyle}>
            Write this yourself, in your own words — do not paste text from Harrison's/Robbins/etc.
            Use the textbook reference list below to cite the chapter instead.
          </span>
          <textarea
            rows={8}
            value={disease.pathophysiology_summary || ""}
            onChange={(e) => setDisease({ ...disease, pathophysiology_summary: e.target.value })}
            style={{ ...inputStyle, fontFamily: "inherit" }}
          />
        </label>

        <button type="submit" disabled={saving} style={buttonStyle}>
          {saving ? "Saving…" : "Save"}
        </button>
      </form>

      {mode === "edit" && disease.id && (
        <>
          <section style={{ marginTop: 32 }}>
            <h2 style={{ fontSize: 16, marginBottom: 8 }}>Textbook references</h2>
            <p style={hintStyle}>
              Chapter/page metadata only — no book text is stored here. This renders as a citation
              chip on the disease page.
            </p>
            <ul style={{ paddingLeft: 0, listStyle: "none", marginBottom: 12 }}>
              {(disease.textbookReferences || []).map((r) => (
                <li
                  key={r.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "6px 0",
                    borderBottom: "1px solid #f0f1f3",
                    fontSize: 14,
                  }}
                >
                  <span>
                    {r.book_title} {r.edition ? `(${r.edition})` : ""} — Ch. {r.chapter_number}{" "}
                    {r.chapter_title} {r.page_range ? `pp. ${r.page_range}` : ""}
                  </span>
                  <button onClick={() => handleDeleteReference(r.id)} style={linkButtonStyle}>
                    remove
                  </button>
                </li>
              ))}
              {(disease.textbookReferences || []).length === 0 && (
                <li style={{ fontSize: 14, color: "#888" }}>None added yet.</li>
              )}
            </ul>

            <form onSubmit={handleAddReference} style={{ display: "grid", gap: 8, maxWidth: 600 }}>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  placeholder="Book title (e.g. Harrison's Principles of Internal Medicine)"
                  value={refForm.bookTitle}
                  onChange={(e) => setRefForm({ ...refForm, bookTitle: e.target.value })}
                  required
                  style={inputStyle}
                />
                <input
                  placeholder="Edition"
                  value={refForm.edition}
                  onChange={(e) => setRefForm({ ...refForm, edition: e.target.value })}
                  style={{ ...inputStyle, maxWidth: 100 }}
                />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  placeholder="Chapter #"
                  value={refForm.chapterNumber}
                  onChange={(e) => setRefForm({ ...refForm, chapterNumber: e.target.value })}
                  required
                  style={{ ...inputStyle, maxWidth: 100 }}
                />
                <input
                  placeholder="Chapter title"
                  value={refForm.chapterTitle}
                  onChange={(e) => setRefForm({ ...refForm, chapterTitle: e.target.value })}
                  required
                  style={inputStyle}
                />
                <input
                  placeholder="Page range"
                  value={refForm.pageRange}
                  onChange={(e) => setRefForm({ ...refForm, pageRange: e.target.value })}
                  style={{ ...inputStyle, maxWidth: 120 }}
                />
              </div>
              <button type="submit" style={buttonStyle}>
                Add reference
              </button>
            </form>
          </section>

          <section style={{ marginTop: 32 }}>
            <h2 style={{ fontSize: 16, marginBottom: 8 }}>
              Guideline chunks ({(disease.guidelines || []).length})
            </h2>
            <p style={hintStyle}>
              Read-only here — add these via the guideline ingestion script, not this form.
            </p>
            {(disease.guidelines || []).map((g) => (
              <div key={g.id} style={{ padding: "8px 0", borderBottom: "1px solid #f0f1f3", fontSize: 14 }}>
                <strong>
                  {g.society} — {g.title}
                </strong>
                <div style={{ color: "#666" }}>{g.section_heading}</div>
              </div>
            ))}
          </section>
        </>
      )}
    </div>
  );
}

const labelStyle: React.CSSProperties = { display: "grid", gap: 4, fontSize: 13, color: "#444" };
const hintStyle: React.CSSProperties = { fontSize: 12, color: "#888" };
const inputStyle: React.CSSProperties = {
  padding: "8px 10px",
  border: "1px solid #d7d9dd",
  borderRadius: 6,
  fontSize: 14,
  width: "100%",
};
const buttonStyle: React.CSSProperties = {
  background: "#1a1a1a",
  color: "#fff",
  padding: "8px 14px",
  borderRadius: 6,
  border: "none",
  fontSize: 14,
  width: "fit-content",
  cursor: "pointer",
};
const linkButtonStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "crimson",
  cursor: "pointer",
  fontSize: 13,
};
