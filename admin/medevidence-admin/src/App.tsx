import { SignedIn, SignedOut, SignIn, UserButton } from "@clerk/clerk-react";
import { Routes, Route, Link } from "react-router-dom";
import DiseasesListPage from "./pages/DiseasesListPage";
import DiseaseEditPage from "./pages/DiseaseEditPage";

export default function App() {
  return (
    <>
      <SignedOut>
        <div style={styles.centerScreen}>
          <SignIn routing="hash" />
        </div>
      </SignedOut>

      <SignedIn>
        <div style={styles.shell}>
          <header style={styles.header}>
            <Link to="/" style={styles.logo}>
              MedEvidence Admin
            </Link>
            <UserButton />
          </header>
          <main style={styles.main}>
            <Routes>
              <Route path="/" element={<DiseasesListPage />} />
              <Route path="/diseases/new" element={<DiseaseEditPage mode="create" />} />
              <Route path="/diseases/:slug" element={<DiseaseEditPage mode="edit" />} />
            </Routes>
          </main>
        </div>
      </SignedIn>
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  centerScreen: {
    height: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  shell: {
    fontFamily: "system-ui, -apple-system, sans-serif",
    minHeight: "100vh",
    background: "#f7f8fa",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 24px",
    borderBottom: "1px solid #e2e4e8",
    background: "#fff",
  },
  logo: { fontWeight: 600, textDecoration: "none", color: "#1a1a1a", fontSize: 16 },
  main: { maxWidth: 900, margin: "0 auto", padding: "24px" },
};
