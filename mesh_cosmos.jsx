import { useState, useEffect } from "react";

// ── TREE METADATA ──────────────────────────────────────────────────────────
// Visual + descriptive properties per tree. No term data here — that all
// comes from /mesh-terms.json and is indexed at load time.
const TREE_META = [
  {
    id: "A", name: "Anatomy", emoji: "🫀",
    radius: 52, color: "#E07A5F", glow: "#E07A5F",
    description: "The physical architecture of the body — organs, tissues, cells, and structures from gross anatomy down to subcellular components.",
    depth: "Medium (up to 9 levels)",
    size: "~1,900 terms",
    character: "Branchy and lateral. The body has countless named parts but they don't nest as deeply as organisms.",
  },
  {
    id: "B", name: "Organisms", emoji: "🦠",
    radius: 44, color: "#81B29A", glow: "#81B29A",
    description: "Every living thing science has named and classified — from viruses to vertebrates, following biological taxonomy precisely.",
    depth: "Very deep (up to 13 levels)",
    size: "~2,100 terms",
    character: "The deepest tree. Mirrors biological taxonomy: Kingdom → Phylum → Class → Order → Family → Genus → Species.",
  },
  {
    id: "C", name: "Diseases", emoji: "🫁",
    radius: 64, color: "#F2CC8F", glow: "#F4A261",
    description: "The full landscape of human disease — conditions, disorders, syndromes, and injuries organized by body system and mechanism.",
    depth: "Medium (up to 8 levels)",
    size: "~5,300 terms",
    character: "Wide more than deep. Enormous lateral spread — diseases don't nest as neatly as organisms. The largest clinically-focused tree.",
  },
  {
    id: "D", name: "Chemicals & Drugs", emoji: "⚗️",
    radius: 80, color: "#9B72CF", glow: "#9B72CF",
    description: "The largest tree. Every named chemical, drug, hormone, protein, allergen, and biological substance in biomedical science.",
    depth: "Deep (up to 11 levels)",
    size: "~16,000+ terms",
    character: "The gas giant. Enormous and dense — chemical taxonomy is vast. D tree terms for specific proteins go very deep.",
  },
  {
    id: "E", name: "Techniques", emoji: "🔬",
    radius: 42, color: "#4ECDC4", glow: "#4ECDC4",
    description: "How research is done — study designs, diagnostic methods, therapeutic techniques, and laboratory procedures.",
    depth: "Medium (up to 7 levels)",
    size: "~2,600 terms",
    character: "More like a controlled vocabulary than a true taxonomy. Study design terms are shallow; lab techniques go deeper.",
  },
  {
    id: "F", name: "Psychology", emoji: "🧠",
    radius: 34, color: "#FF9A9E", glow: "#FF9A9E",
    description: "Mental processes, behavior, psychiatric disorders, and psychological phenomena.",
    depth: "Medium (up to 7 levels)",
    size: "~1,200 terms",
    character: "Moderate depth. Psychiatric diagnoses are flat; psychological processes go deeper.",
  },
  {
    id: "G", name: "Phenomena", emoji: "⚡",
    radius: 46, color: "#A8DADC", glow: "#A8DADC",
    description: "Biological and physical processes — how things work at the mechanistic level. Genetics, immunology, physiology.",
    depth: "Deep (up to 10 levels)",
    size: "~3,400 terms",
    character: "Mechanistic science. Goes deep when it gets into molecular and genetic processes.",
  },
  {
    id: "H", name: "Disciplines", emoji: "📚",
    radius: 28, color: "#DDB892", glow: "#DDB892",
    description: "Academic and scientific disciplines — the fields of study themselves rather than their subject matter.",
    depth: "Shallow (up to 5 levels)",
    size: "~400 terms",
    character: "Flat and simple. Just names the disciplines. Not heavily used for indexing content.",
  },
  {
    id: "I", name: "Sociology", emoji: "🏘️",
    radius: 30, color: "#B5C99A", glow: "#B5C99A",
    description: "Society, culture, education, and social phenomena — the human context around health and disease.",
    depth: "Shallow (up to 5 levels)",
    size: "~600 terms",
    character: "Flat. Captures social determinants of health, environment, socioeconomic factors.",
  },
  {
    id: "J", name: "Technology", emoji: "🏭",
    radius: 32, color: "#F7DC6F", glow: "#F7DC6F",
    description: "Technology, industry, agriculture, food, and environmental science.",
    depth: "Medium (up to 7 levels)",
    size: "~900 terms",
    character: "Moderate. Environmental and industrial exposure terms live here — relevant for indoor air quality research.",
  },
  {
    id: "K", name: "Humanities", emoji: "🎭",
    radius: 22, color: "#C9B1BD", glow: "#C9B1BD",
    description: "Arts, humanities, and communication — the human dimensions of knowledge beyond science.",
    depth: "Shallow (up to 4 levels)",
    size: "~220 terms",
    character: "Very flat. Rarely used in biomedical indexing.",
  },
  {
    id: "L", name: "Information Science", emoji: "🗃️",
    radius: 24, color: "#7FC8F8", glow: "#7FC8F8",
    description: "Libraries, databases, information systems, publishing, and scientific communication.",
    depth: "Shallow (up to 5 levels)",
    size: "~650 terms",
    character: "Flat. Useful for indexing methodology papers and database studies.",
  },
  {
    id: "M", name: "Named Groups", emoji: "👥",
    radius: 36, color: "#AED6F1", glow: "#AED6F1",
    description: "Persons as individuals or as members of a group — classified by age, occupation, health status, social role, or demographic characteristic.",
    depth: "Shallow to medium (up to 6 levels)",
    size: "~400 terms",
    character: "Broader and more varied than it looks. The top level has ~60 direct children — not just age and sex, but social roles, health conditions, life circumstances.",
  },
  {
    id: "N", name: "Health Care", emoji: "🏥",
    radius: 36, color: "#A9CCE3", glow: "#A9CCE3",
    description: "Health care systems, facilities, quality, economics, and public health.",
    depth: "Medium (up to 7 levels)",
    size: "~1,100 terms",
    character: "Systems-level thinking. Public health, policy, and health services research.",
  },
  {
    id: "V", name: "Publication Types", emoji: "📄",
    radius: 20, color: "#D5DBDB", glow: "#D5DBDB",
    description: "What kind of document a paper is — not what it's about, but its form.",
    depth: "Very shallow (2–3 levels)",
    size: "~40 terms",
    character: "The smallest tree. Almost a flat list. Tells you if something is a clinical trial, review, letter, case report, etc.",
  },
  {
    id: "Z", name: "Geographic", emoji: "🌍",
    radius: 24, color: "#A3E4D7", glow: "#A3E4D7",
    description: "Place names — countries, regions, continents used to describe where research was conducted or populations studied.",
    depth: "Shallow (up to 4 levels)",
    size: "~600 terms",
    character: "Flat geographic hierarchy. Useful for distribution studies.",
  },
];

// ── DATA LOADING ──────────────────────────────────────────────────────────
// Fetches /mesh-terms.json and builds a childrenMap index:
//   parentKey → [{term, treeNum}]
// parentKey is either the single tree letter (for top-level branches)
// or the parent tree number (e.g. "A01" → children of A01).
function useMeshData() {
  const [state, setState] = useState({ data: null, loading: true, error: null });

  useEffect(() => {
    fetch("/mesh-terms.json")
      .then((r) => r.json())
      .then((terms) => {
        const childrenMap = new Map();
        for (const term of terms) {
          for (const tn of term.treeNums) {
            const dot = tn.lastIndexOf(".");
            const parentKey = dot === -1 ? tn[0] : tn.slice(0, dot);
            if (!childrenMap.has(parentKey)) childrenMap.set(parentKey, []);
            childrenMap.get(parentKey).push({ term, treeNum: tn });
          }
        }
        // Sort each group numerically by tree number
        for (const children of childrenMap.values()) {
          children.sort((a, b) =>
            a.treeNum.localeCompare(b.treeNum, undefined, { numeric: true })
          );
        }
        setState({ data: { childrenMap }, loading: false, error: null });
      })
      .catch((error) =>
        setState({ data: null, loading: false, error })
      );
  }, []);

  return state;
}

// ── LOADING SCREEN ────────────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div style={{
      width: "100%", height: "100vh",
      background: "#111418",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      gap: 16,
    }}>
      <div style={{
        fontFamily: "'IBM Plex Mono',monospace",
        fontSize: 13, color: "#AED6F1", fontWeight: 700, letterSpacing: 1,
      }}>
        MeSH Tree Explorer
      </div>
      <div style={{
        fontFamily: "'IBM Plex Mono',monospace",
        fontSize: 10, color: "#ffffff44",
      }}>
        Loading 31,000+ terms…
      </div>
    </div>
  );
}

// ── GALAXY VIEW ───────────────────────────────────────────────────────────
function GalaxyView({ onSelect, meshData }) {
  const [hovered, setHovered] = useState(null);

  function sizeBar(radius) {
    const level = radius >= 70 ? 5 : radius >= 55 ? 4 : radius >= 40 ? 3 : radius >= 28 ? 2 : 1;
    return Array.from({ length: 5 }, (_, i) => (
      <div key={i} style={{
        width: 8, height: 8, borderRadius: 2,
        background: "currentColor",
        opacity: i < level ? 0.85 : 0.15,
      }} />
    ));
  }

  function depthBar(depth) {
    const level =
      depth?.includes("13") ? 5 : depth?.includes("11") ? 4 :
      depth?.includes("10") ? 4 : depth?.includes("9") ? 3 :
      depth?.includes("7") ? 3 : depth?.includes("5") ? 2 : 1;
    return Array.from({ length: 5 }, (_, i) => (
      <div key={i} style={{
        width: 8, height: 8, borderRadius: "50%",
        background: "currentColor",
        opacity: i < level ? 0.85 : 0.15,
      }} />
    ));
  }

  return (
    <div style={{
      width: "100%", height: "100%",
      background: "#111418",
      display: "flex", flexDirection: "column",
      overflow: "hidden",
    }}>
      <style>{`@keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }`}</style>

      {/* Header */}
      <div style={{
        padding: "18px 24px 14px",
        borderBottom: "1px solid #ffffff12",
        flexShrink: 0,
      }}>
        <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 13, color: "#e8e8e8", fontWeight: 700, letterSpacing: 1 }}>
          MeSH Tree Explorer
        </div>
        <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: "#ffffff55", marginTop: 3, letterSpacing: 0.5 }}>
          16 trees · 31,108 terms · NLM 2026 — click a category to explore
        </div>
      </div>

      {/* Legend */}
      <div style={{
        padding: "10px 24px",
        borderBottom: "1px solid #ffffff08",
        display: "flex", gap: 24, flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#ffffff44", fontFamily: "'IBM Plex Mono',monospace", fontSize: 9 }}>
          <div style={{ display: "flex", gap: 2, color: "#ffffff44" }}>
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} style={{ width: 8, height: 8, borderRadius: 2, background: "currentColor", opacity: i < 3 ? 0.8 : 0.2 }} />
            ))}
          </div>
          TERM COUNT
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#ffffff44", fontFamily: "'IBM Plex Mono',monospace", fontSize: 9 }}>
          <div style={{ display: "flex", gap: 2, color: "#ffffff44" }}>
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: "currentColor", opacity: i < 3 ? 0.8 : 0.2 }} />
            ))}
          </div>
          MAX DEPTH
        </div>
      </div>

      {/* Grid */}
      <div style={{
        flex: 1, overflowY: "auto",
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
        gap: 1, padding: 1,
        background: "#1a1d22",
      }}>
        {TREE_META.map((tree, i) => {
          const isHov = hovered === tree.id;
          const branchCount = meshData?.childrenMap?.get(tree.id)?.length ?? "…";
          return (
            <div
              key={tree.id}
              onClick={() => onSelect(tree)}
              onMouseEnter={() => setHovered(tree.id)}
              onMouseLeave={() => setHovered(null)}
              style={{
                padding: "18px 20px",
                background: isHov ? "#1e2228" : "#111418",
                borderLeft: `3px solid ${isHov ? tree.color : tree.color + "44"}`,
                cursor: "pointer",
                transition: "all 0.15s ease",
                display: "flex", flexDirection: "column", gap: 8,
                animation: "fadeIn 0.3s ease",
                animationDelay: `${i * 0.03}s`,
                animationFillMode: "both",
              }}
            >
              <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 20, fontWeight: 700, color: tree.color, lineHeight: 1 }}>
                  {tree.id}
                </span>
                <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, fontWeight: 600, color: "#e8e8e8", lineHeight: 1 }}>
                  {tree.name}
                </span>
              </div>

              <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9.5, color: "#ffffff77", lineHeight: 1.6 }}>
                {tree.description}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 8, color: "#ffffff33", width: 36 }}>SIZE</span>
                  <div style={{ display: "flex", gap: 2, color: tree.color }}>{sizeBar(tree.radius)}</div>
                  <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 8, color: "#ffffff44" }}>{tree.size}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 8, color: "#ffffff33", width: 36 }}>DEPTH</span>
                  <div style={{ display: "flex", gap: 2, color: tree.color }}>{depthBar(tree.depth)}</div>
                  <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 8, color: "#ffffff44" }}>{tree.depth}</span>
                </div>
              </div>

              {isHov && (
                <div style={{
                  fontFamily: "'IBM Plex Mono',monospace",
                  fontSize: 9, color: tree.color + "cc",
                  lineHeight: 1.5,
                  borderTop: `1px solid ${tree.color}22`,
                  paddingTop: 8,
                  animation: "fadeIn 0.15s ease",
                }}>
                  {tree.character}
                </div>
              )}

              <div style={{
                fontFamily: "'IBM Plex Mono',monospace", fontSize: 8,
                color: isHov ? tree.color : "#ffffff22",
                marginTop: 2,
              }}>
                {isHov ? "click to explore →" : `${branchCount} top-level branches`}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── PLANET VIEW ───────────────────────────────────────────────────────────
function PlanetView({ tree, onSelectBranch, onBack, meshData }) {
  const [hovered, setHovered] = useState(null);
  const branches = meshData?.childrenMap?.get(tree.id) ?? [];

  return (
    <div style={{
      width: "100%", height: "100%",
      background: "#111418",
      display: "flex", flexDirection: "column",
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center",
        borderBottom: `1px solid ${tree.color}33`,
        flexShrink: 0,
      }}>
        <button onClick={onBack} style={{
          fontFamily: "'IBM Plex Mono',monospace", fontSize: 9,
          color: "#ffffff66", background: "transparent",
          border: "none", borderRight: "1px solid #ffffff12",
          padding: "14px 16px", cursor: "pointer", letterSpacing: 1,
        }}>
          ← ALL TREES
        </button>
        <div style={{ padding: "14px 20px", flex: 1 }}>
          <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 14, color: tree.color, fontWeight: 700 }}>
            {tree.id} — {tree.name}
          </span>
          <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, color: "#ffffff44", marginLeft: 16 }}>
            {tree.size} · {tree.depth}
          </span>
        </div>
      </div>

      {/* Description */}
      <div style={{ padding: "14px 24px", borderBottom: "1px solid #ffffff08", flexShrink: 0 }}>
        <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: "#ffffffcc", lineHeight: 1.7 }}>
          {tree.description}
        </div>
        <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, color: tree.color + "bb", marginTop: 6, lineHeight: 1.5 }}>
          {tree.character}
        </div>
      </div>

      {/* Branch grid */}
      <div style={{
        flex: 1, overflowY: "auto",
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
        gap: 1, padding: 1, background: "#1a1d22",
      }}>
        {branches.map((branch, i) => {
          const isHov = hovered === branch.treeNum;
          const childCount = meshData?.childrenMap?.get(branch.treeNum)?.length ?? 0;
          return (
            <div
              key={branch.treeNum}
              onClick={() => onSelectBranch(branch)}
              onMouseEnter={() => setHovered(branch.treeNum)}
              onMouseLeave={() => setHovered(null)}
              style={{
                padding: "16px 18px",
                background: isHov ? "#1e2228" : "#111418",
                borderLeft: `3px solid ${isHov ? tree.color : tree.color + "33"}`,
                cursor: "pointer", transition: "all 0.15s ease",
              }}
            >
              <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: "#ffffff33", marginBottom: 3 }}>
                {branch.treeNum}
              </div>
              <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, color: "#e8e8e8", fontWeight: 600, marginBottom: 6 }}>
                {branch.term.name}
              </div>
              {branch.term.note && (
                <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, color: "#ffffff44", lineHeight: 1.5, marginBottom: 6 }}>
                  {branch.term.note.slice(0, 120)}{branch.term.note.length > 120 ? "…" : ""}
                </div>
              )}
              <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, color: "#ffffff33" }}>
                {childCount} sub-branches
              </div>
              {isHov && (
                <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, color: tree.color, marginTop: 8 }}>
                  explore terms →
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── SURFACE VIEW ──────────────────────────────────────────────────────────
function SurfaceView({ tree, branch, onBack, onBackToPlanet, meshData }) {
  const [selected, setSelected] = useState(null);
  const [expanded, setExpanded] = useState(new Set());

  const mono = "'IBM Plex Mono',monospace";

  function toggleExpand(treeNum) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(treeNum) ? next.delete(treeNum) : next.add(treeNum);
      return next;
    });
  }

  function renderTerms(parentKey, depth = 0) {
    const children = meshData?.childrenMap?.get(parentKey) ?? [];
    if (!children.length) return null;

    return children.map(({ term, treeNum }) => {
      const hasChildren = !!(meshData?.childrenMap?.get(treeNum)?.length);
      const isSelected = selected?.treeNum === treeNum;
      const isExpanded = expanded.has(treeNum);

      return (
        <div key={treeNum}>
          <div
            onClick={() => {
              setSelected(isSelected ? null : { ...term, treeNum });
              if (hasChildren) toggleExpand(treeNum);
            }}
            style={{
              display: "flex", alignItems: "flex-start", gap: 8,
              padding: "6px 10px",
              paddingLeft: `${10 + depth * 14}px`,
              background: isSelected ? `${tree.color}22` : "transparent",
              borderLeft: isSelected ? `2px solid ${tree.color}` : "2px solid transparent",
              cursor: "pointer", transition: "all 0.12s", marginBottom: 1,
            }}
          >
            <span style={{ fontFamily: mono, fontSize: 10, color: "#ffffff44", flexShrink: 0, marginTop: 1, width: 10 }}>
              {hasChildren ? (isExpanded ? "▾" : "▸") : "·"}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: mono, fontSize: 11, color: isSelected ? "#e8e8e8" : "#c0c0c0", lineHeight: 1.3 }}>
                {term.name}
              </div>
              {term.note && !isSelected && (
                <div style={{ fontFamily: mono, fontSize: 9, color: "#ffffff44", marginTop: 2, lineHeight: 1.5, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                  {term.note.slice(0, 90)}{term.note.length > 90 ? "…" : ""}
                </div>
              )}
            </div>
            {hasChildren && (
              <span style={{ fontFamily: mono, fontSize: 8, color: "#ffffff33", marginTop: 2, flexShrink: 0 }}>
                +{meshData.childrenMap.get(treeNum).length}
              </span>
            )}
          </div>
          {hasChildren && isExpanded && (
            <div style={{ borderLeft: `1px solid ${tree.color}22`, marginLeft: 20 }}>
              {renderTerms(treeNum, depth + 1)}
            </div>
          )}
        </div>
      );
    });
  }

  // Build breadcrumb path from treeNum
  function buildPath(treeNum) {
    const parts = treeNum.split(".");
    return parts.map((_, i) => parts.slice(0, i + 1).join(".")).join(" → ");
  }

  return (
    <div style={{
      width: "100%", height: "100%", background: "#111418",
      display: "flex", flexDirection: "column", overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", borderBottom: `1px solid ${tree.color}33`, flexShrink: 0 }}>
        <button onClick={onBack} style={{ fontFamily: mono, fontSize: 9, color: "#ffffff66", background: "transparent", border: "none", borderRight: "1px solid #ffffff12", padding: "14px 16px", cursor: "pointer", letterSpacing: 1 }}>
          ← ALL TREES
        </button>
        <button onClick={onBackToPlanet} style={{ fontFamily: mono, fontSize: 9, color: "#ffffff66", background: "transparent", border: "none", borderRight: "1px solid #ffffff12", padding: "14px 16px", cursor: "pointer", letterSpacing: 1 }}>
          ← {tree.name}
        </button>
        <div style={{ padding: "14px 20px" }}>
          <span style={{ fontFamily: mono, fontSize: 12, color: tree.color, fontWeight: 700 }}>
            {branch.treeNum} / {branch.term.name}
          </span>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* Left: term tree */}
        <div style={{ width: 340, borderRight: "1px solid #ffffff0e", overflowY: "auto", padding: "12px 0", flexShrink: 0 }}>
          <div style={{ fontFamily: mono, fontSize: 8, color: "#ffffff33", letterSpacing: 2, marginBottom: 10, paddingLeft: 12 }}>
            TERMS
          </div>
          {renderTerms(branch.treeNum)}
        </div>

        {/* Right: detail */}
        <div style={{ flex: 1, padding: 24, overflowY: "auto" }}>
          {selected ? (
            <div style={{ animation: "fadeIn 0.15s ease" }}>
              <div style={{ fontFamily: mono, fontSize: 8, color: "#ffffff33", letterSpacing: 2, marginBottom: 6 }}>
                {selected.treeNum}
              </div>
              <div style={{ fontFamily: mono, fontSize: 15, color: tree.color, fontWeight: 700, marginBottom: 12 }}>
                {selected.name}
              </div>
              <div style={{ fontFamily: mono, fontSize: 10, color: "#ffffffbb", lineHeight: 1.8, marginBottom: 20 }}>
                {selected.note || "A MeSH controlled vocabulary term used to index biomedical literature."}
              </div>

              {/* Child terms preview */}
              {meshData?.childrenMap?.get(selected.treeNum)?.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontFamily: mono, fontSize: 8, color: "#ffffff33", letterSpacing: 2, marginBottom: 8 }}>
                    CHILD TERMS ({meshData.childrenMap.get(selected.treeNum).length})
                  </div>
                  {meshData.childrenMap.get(selected.treeNum).slice(0, 10).map(({ term: ct, treeNum: ctn }) => (
                    <div key={ctn} style={{
                      padding: "7px 12px", marginBottom: 3,
                      background: "#ffffff08",
                      borderLeft: `2px solid ${tree.color}44`,
                      borderRadius: 3,
                    }}>
                      <div style={{ fontFamily: mono, fontSize: 9, color: "#ffffff55", marginBottom: 2 }}>{ctn}</div>
                      <div style={{ fontFamily: mono, fontSize: 10, color: "#d0d0d0" }}>{ct.name}</div>
                      {ct.note && (
                        <div style={{ fontFamily: mono, fontSize: 9, color: "#ffffff44", marginTop: 2 }}>
                          {ct.note.slice(0, 120)}{ct.note.length > 120 ? "…" : ""}
                        </div>
                      )}
                    </div>
                  ))}
                  {meshData.childrenMap.get(selected.treeNum).length > 10 && (
                    <div style={{ fontFamily: mono, fontSize: 9, color: "#ffffff33", padding: "6px 12px" }}>
                      + {meshData.childrenMap.get(selected.treeNum).length - 10} more — expand in the left panel
                    </div>
                  )}
                </div>
              )}

              <div style={{ padding: "10px 14px", background: "#ffffff06", borderRadius: 4, border: "1px solid #ffffff0e" }}>
                <div style={{ fontFamily: mono, fontSize: 8, color: "#ffffff33", letterSpacing: 2, marginBottom: 4 }}>PATH IN TREE</div>
                <div style={{ fontFamily: mono, fontSize: 9, color: "#ffffff66" }}>
                  {tree.id} → {buildPath(selected.treeNum)}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
              <div style={{ fontSize: 28, marginBottom: 12 }}>{tree.emoji}</div>
              <div style={{ fontFamily: mono, fontSize: 10, color: "#ffffff44", lineHeight: 1.8 }}>
                {branch.term.name}
              </div>
              <div style={{ fontFamily: mono, fontSize: 9, color: "#ffffff22", marginTop: 6 }}>
                select a term to see details
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── APP ────────────────────────────────────────────────────────────────────
export default function MeshCosmos({ onNamedGroups }) {
  const [view, setView] = useState("galaxy");
  const [selectedTree, setSelectedTree] = useState(null);
  const [selectedBranch, setSelectedBranch] = useState(null);

  const { data: meshData, loading, error } = useMeshData();

  function handleSelect(tree) {
    if (tree.id === "M" && onNamedGroups) {
      onNamedGroups();
    } else {
      setSelectedTree(tree);
      setView("planet");
    }
  }

  if (loading) return <LoadingScreen />;
  if (error) return (
    <div style={{ width: "100%", height: "100vh", background: "#111418", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: "#FF9A9E" }}>
        Failed to load mesh-terms.json: {error.message}
      </div>
    </div>
  );

  return (
    <div style={{ width: "100%", height: "100vh", position: "relative", overflow: "hidden" }}>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&display=swap" rel="stylesheet" />

      {view === "galaxy" && (
        <GalaxyView onSelect={handleSelect} meshData={meshData} />
      )}
      {view === "planet" && selectedTree && (
        <PlanetView
          tree={selectedTree}
          onSelectBranch={(branch) => { setSelectedBranch(branch); setView("surface"); }}
          onBack={() => setView("galaxy")}
          meshData={meshData}
        />
      )}
      {view === "surface" && selectedTree && selectedBranch && (
        <SurfaceView
          tree={selectedTree}
          branch={selectedBranch}
          onBack={() => { setView("galaxy"); }}
          onBackToPlanet={() => setView("planet")}
          meshData={meshData}
        />
      )}
    </div>
  );
}
