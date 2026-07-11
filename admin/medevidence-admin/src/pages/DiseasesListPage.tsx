import { useEffect, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { Link } from "react-router-dom";
import { api, Disease } from "../lib/api";

export default function DiseasesListPage() {
  const { getToken } = useAuth();
  const [diseases, setDiseases] = useState<Disease[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load(q = "") {
    setLoading(true);
    setError(null);
    try {
      const rows = await api.listDiseases(getToken, q);
      setDiseases(rows);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <h1 style={{ fontSize: 20 }}>Diseases</h1>
        <Link to="/diseases/new" style={buttonStyle}>
          + New disease
        </Link>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          load(search);
        }}
        style={{ marginBottom: 16 }}
      >
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search diseases…"
          style={inputStyle}
        />
      </form>

      {error && <p style={{ color: "crimson" }}>{error}</p>}
      {loading ? (
        <p>Loading…</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid #e2e4e8" }}>
              <th style={thStyle}>Name</th>
              <th style={thStyle}>Slug</th>
              <th style={thStyle}>Evidence grade</th>
              <th style={thStyle}>Last reviewed</th>
            </tr>
          </thead>
          <tbody>
            {diseases.map((d) => (
              <tr key={d.id} style={{ borderBottom: "1px solid #f0f1f3" }}>
                <td style={tdStyle}>
                  <Link to={`/diseases/${d.slug}`}>{d.name}</Link>
                </td>
                <td style={tdStyle}>{d.slug}</td>
                <td style={tdStyle}>{d.evidence_grade || "—"}</td>
                <td style={tdStyle}>
                  {d.last_reviewed_at ? new Date(d.last_reviewed_at).toLocaleDateString() : "Never"}
                </td>
              </tr>
            ))}
            {diseases.length === 0 && (
              <tr>
                <td style={tdStyle} colSpan={4}>
                  No diseases yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}

const buttonStyle: React.CSSProperties = {
  background: "#1a1a1a",
  color: "#fff",
  padding: "8px 14px",
  borderRadius: 6,
  textDecoration: "none",
  fontSize: 14,
};
const inputStyle: React.CSSProperties = {
  padding: "8px 10px",
  border: "1px solid #d7d9dd",
  borderRadius: 6,
  width: 320,
  fontSize: 14,
};
const thStyle: React.CSSProperties = { padding: "8px 6px", fontSize: 13, color: "#666" };
const tdStyle: React.CSSProperties = { padding: "8px 6px", fontSize: 14 };
