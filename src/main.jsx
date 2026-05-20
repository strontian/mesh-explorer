import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import MeshCosmos from "../mesh_cosmos.jsx";
import SwimLanes from "../mesh_swimlanes.jsx";
import MeshCConcepts from "../mesh_c_concepts.jsx";

const TABS = [
  { id: "meshtrees", label: "MeSH Trees" },
  { id: "swimlanes", label: "Named Groups" },
  { id: "diseases",  label: "Diseases (concepts)" },
];

const NAV_STYLE = {
  display: "flex",
  gap: "2px",
  padding: "10px 16px",
  borderBottom: "1px solid #1e2130",
  background: "#0a0c12",
};

const TAB_STYLE = (active) => ({
  padding: "6px 16px",
  fontSize: "12px",
  fontFamily: "inherit",
  cursor: "pointer",
  border: "none",
  borderRadius: "4px",
  background: active ? "#1e2740" : "transparent",
  color: active ? "#AED6F1" : "#666",
  letterSpacing: "0.04em",
});

function App() {
  const [active, setActive] = useState("meshtrees");

  return (
    <>
      <nav style={NAV_STYLE}>
        {TABS.map((t) => (
          <button key={t.id} style={TAB_STYLE(active === t.id)} onClick={() => setActive(t.id)}>
            {t.label}
          </button>
        ))}
      </nav>
      {active === "meshtrees" && (
        <MeshCosmos onNamedGroups={() => setActive("swimlanes")} />
      )}
      {active === "swimlanes" && <SwimLanes />}
      {active === "diseases"  && <MeshCConcepts />}
    </>
  );
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
