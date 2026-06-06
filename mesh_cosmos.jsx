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
      width: "100%", height: "100%",
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
          const branchLabel = branchCount === 1 ? "branch" : "branches";
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

              <div style={{
                fontFamily: "'IBM Plex Mono',monospace",
                fontSize: 9,
                color: tree.color + "cc",
                lineHeight: 1.5,
                borderTop: `1px solid ${isHov ? tree.color + "22" : "transparent"}`,
                paddingTop: 8,
                minHeight: 48,
                opacity: isHov ? 1 : 0,
                transition: "opacity 0.15s ease, border-color 0.15s ease",
              }}>
                {tree.character}
              </div>

              <div style={{
                fontFamily: "'IBM Plex Mono',monospace", fontSize: 8,
                color: isHov ? tree.color : "#ffffff22",
                marginTop: 2,
                minHeight: 12,
                lineHeight: "12px",
                display: "flex",
                alignItems: "center",
              }}>
                {isHov ? "click to explore →" : `${branchCount} top-level ${branchLabel}`}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── APP ────────────────────────────────────────────────────────────────────
export default function MeshCosmos({ onTreeSelect }) {
  const { data: meshData, loading, error } = useMeshData();

  function handleSelect(tree) {
    onTreeSelect?.(tree.id.toLowerCase());
  }

  if (loading) return <LoadingScreen />;
  if (error) return (
    <div style={{ width: "100%", height: "100%", background: "#111418", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: "#FF9A9E" }}>
        Failed to load mesh-terms.json: {error.message}
      </div>
    </div>
  );

  return (
    <div style={{ width: "100%", height: "100%", position: "relative", overflow: "hidden" }}>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&display=swap" rel="stylesheet" />

      <GalaxyView onSelect={handleSelect} meshData={meshData} />
    </div>
  );
}
