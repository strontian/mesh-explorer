import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import MeshCosmos from "../mesh_cosmos.jsx";
import SwimLanes from "../mesh_swimlanes.jsx";
import MeshAConcepts from "../mesh_a_concepts.jsx";
import MeshBConcepts from "../mesh_b_concepts.jsx";
import MeshCConcepts from "../mesh_c_concepts.jsx";
import MeshDConcepts from "../mesh_d_concepts.jsx";
import MeshEConcepts from "../mesh_e_concepts.jsx";
import MeshFConcepts from "../mesh_f_concepts.jsx";
import MeshGConcepts from "../mesh_g_concepts.jsx";
import MeshHConcepts from "../mesh_h_concepts.jsx";
import MeshIConcepts from "../mesh_i_concepts.jsx";
import MeshJConcepts from "../mesh_j_concepts.jsx";
import MeshKConcepts from "../mesh_k_concepts.jsx";
import MeshLConcepts from "../mesh_l_concepts.jsx";
import MeshNConcepts from "../mesh_n_concepts.jsx";
import MeshVConcepts from "../mesh_v_concepts.jsx";
import MeshZConcepts from "../mesh_z_concepts.jsx";

// ── Top-level views ──────────────────────────────────────────────────────
const TOP_TABS = [
  { id: "meshtrees", label: "MeSH Trees" },
];

// ── Concept-sketch trees (letter chips) ──────────────────────────────────
const CONCEPT_TREES = [
  { id: "a", letter: "A", label: "Anatomy",        color: "#A8D8A8", Comp: MeshAConcepts },
  { id: "b", letter: "B", label: "Organisms",      color: "#98D8C8", Comp: MeshBConcepts },
  { id: "c", letter: "C", label: "Diseases",       color: "#F4A261", Comp: MeshCConcepts },
  { id: "d", letter: "D", label: "Chemicals",      color: "#C3A6FF", Comp: MeshDConcepts },
  { id: "e", letter: "E", label: "Techniques",     color: "#7EC8E3", Comp: MeshEConcepts },
  { id: "f", letter: "F", label: "Psychology",     color: "#E8A598", Comp: MeshFConcepts },
  { id: "g", letter: "G", label: "Phenomena",      color: "#E8D58A", Comp: MeshGConcepts },
  { id: "h", letter: "H", label: "Disciplines",    color: "#B8C8A8", Comp: MeshHConcepts },
  { id: "i", letter: "I", label: "Sociology",      color: "#D8A8D8", Comp: MeshIConcepts },
  { id: "j", letter: "J", label: "Technology",     color: "#E8C888", Comp: MeshJConcepts },
  { id: "k", letter: "K", label: "Humanities",     color: "#F0B8C8", Comp: MeshKConcepts },
  { id: "l", letter: "L", label: "Information",    color: "#A8C8E8", Comp: MeshLConcepts },
  { id: "m", letter: "M", label: "Named Groups",   color: "#AED6F1", Comp: SwimLanes },
  { id: "n", letter: "N", label: "Health Care",    color: "#90D0B8", Comp: MeshNConcepts },
  { id: "v", letter: "V", label: "Publications",   color: "#C8C8A8", Comp: MeshVConcepts },
  { id: "z", letter: "Z", label: "Geographicals",  color: "#88C8D8", Comp: MeshZConcepts },
];

// ── Styles ──────────────────────────────────────────────────────────────
const NAV_BG = "#0a0c12";
const MONO = "'IBM Plex Mono', monospace";

const NAV_TOP = {
  display: "flex",
  alignItems: "center",
  gap: 2,
  padding: "10px 16px 8px",
  background: NAV_BG,
};
const NAV_BOTTOM = {
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap",
  gap: 4,
  padding: "0 16px 10px",
  borderBottom: "1px solid #1e2130",
  background: NAV_BG,
};

const TOP_TAB = (active) => ({
  padding: "6px 14px",
  fontSize: "12px",
  fontFamily: "inherit",
  cursor: "pointer",
  border: "none",
  borderRadius: 4,
  background: active ? "#1e2740" : "transparent",
  color: active ? "#AED6F1" : "#666",
  letterSpacing: "0.04em",
});

const CONCEPT_LABEL = {
  fontFamily: MONO,
  fontSize: 8,
  color: "#ffffff33",
  letterSpacing: 2,
  marginRight: 8,
  paddingLeft: 2,
};

const LETTER_CHIP = (active, color) => ({
  padding: "5px 9px",
  fontFamily: MONO,
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: 1,
  cursor: "pointer",
  border: `1px solid ${active ? color : "#ffffff14"}`,
  background: active ? color + "1e" : "transparent",
  color: active ? color : "#ffffff55",
  borderRadius: 3,
  transition: "all 0.12s",
  display: "flex",
  alignItems: "center",
  gap: 5,
});

function App() {
  const [active, setActive] = useState({ kind: "top", id: "meshtrees" });

  const topActive  = (id) => active.kind === "top"     && active.id === id;
  const treeActive = (id) => active.kind === "concept" && active.id === id;

  return (
    <>
      <nav style={NAV_TOP}>
        {TOP_TABS.map((t) => (
          <button key={t.id} style={TOP_TAB(topActive(t.id))} onClick={() => setActive({ kind: "top", id: t.id })}>
            {t.label}
          </button>
        ))}
      </nav>
      <nav style={NAV_BOTTOM}>
        <span style={CONCEPT_LABEL}>CONCEPT SKETCHES ▸</span>
        {CONCEPT_TREES.map((t) => (
          <button
            key={t.id}
            style={LETTER_CHIP(treeActive(t.id), t.color)}
            onClick={() => setActive({ kind: "concept", id: t.id })}
            title={t.label}
          >
            <span>{t.letter}</span>
            <span style={{ fontWeight: 400, fontSize: 9, opacity: treeActive(t.id) ? 1 : 0.7 }}>{t.label}</span>
          </button>
        ))}
      </nav>

      {active.kind === "top" && active.id === "meshtrees" && (
        <MeshCosmos
          onNamedGroups={() => setActive({ kind: "concept", id: "m" })}
          onPsychology={() => setActive({ kind: "concept", id: "f" })}
          onGeography={() => setActive({ kind: "concept", id: "z" })}
          onPublications={() => setActive({ kind: "concept", id: "v" })}
          onDiseases={() => setActive({ kind: "concept", id: "c" })}
          onChemicals={() => setActive({ kind: "concept", id: "d" })}
        />
      )}
      {active.kind === "concept" && (() => {
        const tree = CONCEPT_TREES.find((t) => t.id === active.id);
        if (!tree) return null;
        const Comp = tree.Comp;
        return <Comp />;
      })()}
    </>
  );
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
