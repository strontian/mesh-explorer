import { useState, useEffect } from "react";

const mono = "'IBM Plex Mono', monospace";
const BG = "#0f1117";
const TREE_COLOR = "#E8A598";

// ── DATA HOOK ─────────────────────────────────────────────────────────────
function useFData() {
  const [state, setState] = useState({ data: null, loading: true });
  useEffect(() => {
    fetch("/mesh-terms.json").then(r => r.json()).then(terms => {
      const childrenMap = new Map();
      for (const term of terms) {
        for (const tn of term.treeNums) {
          const dot = tn.lastIndexOf(".");
          const key = dot === -1 ? tn[0] : tn.slice(0, dot);
          if (!childrenMap.has(key)) childrenMap.set(key, []);
          childrenMap.get(key).push({ term, treeNum: tn });
        }
      }

      function countAll(treeNum) {
        let n = 0;
        const q = [treeNum];
        while (q.length) {
          const k = q.shift();
          const kids = childrenMap.get(k) || [];
          n += kids.length;
          for (const c of kids) q.push(c.treeNum);
        }
        return n;
      }

      const raw = (childrenMap.get("F") || []).sort((a, b) =>
        a.treeNum.localeCompare(b.treeNum, undefined, { numeric: true })
      );

      const branches = raw.map(({ term, treeNum }) => ({
        term, treeNum,
        directCount: childrenMap.get(treeNum)?.length ?? 0,
        totalCount:  countAll(treeNum),
      }));

      setState({ data: { branches, childrenMap }, loading: false });
    });
  }, []);
  return state;
}

// ── LOADING ───────────────────────────────────────────────────────────────
function Loading() {
  return (
    <div style={{ background: BG, height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontFamily: mono, fontSize: 10, color: "#ffffff44" }}>Loading MeSH…</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SKETCH 1 — FOUR QUADRANTS
// 2×2 quadrant layout: X = Theoretical↔Clinical, Y = Individual↔Social
// F01 = Individual+Theoretical, F02 = Individual+Clinical,
// F03 = Clinical+Individual (bottom-right), F04 = Social+Theoretical (bottom-left)
// ═══════════════════════════════════════════════════════════════════════════

// Quadrant placement: [colIndex 0=left/1=right, rowIndex 0=top/1=bottom]
const QUADRANT_MAP = {
  "F01": { col: 0, row: 0, label: "Individual · Theoretical", accent: "#9B72CF" },
  "F02": { col: 1, row: 0, label: "Individual · Clinical",    accent: "#4ECDC4" },
  "F04": { col: 0, row: 1, label: "Social · Theoretical",     accent: "#81B29A" },
  "F03": { col: 1, row: 1, label: "Social · Clinical",        accent: "#E8A598" },
};

function FourQuadrants({ data }) {
  const [selected, setSelected] = useState(null);
  const { branches, childrenMap } = data;

  const byTN = {};
  for (const b of branches) byTN[b.treeNum] = b;

  // Build 2×2 grid
  const grid = [[null, null], [null, null]];
  for (const b of branches) {
    const q = QUADRANT_MAP[b.treeNum];
    if (q) grid[q.row][q.col] = { ...b, ...q };
  }

  const selBranch = selected ? byTN[selected] : null;
  const children = selected
    ? (childrenMap.get(selected) || []).sort((a, b) =>
        a.treeNum.localeCompare(b.treeNum, undefined, { numeric: true }))
    : [];

  return (
    <div style={{ height: "100%", display: "flex", gap: 0, overflow: "hidden" }}>
      {/* Left: 2×2 quadrant grid */}
      <div style={{ flex: 1, padding: 24, display: "flex", flexDirection: "column", gap: 0, overflow: "hidden" }}>
        {/* Axis labels */}
        <div style={{ display: "flex", justifyContent: "space-between", padding: "0 8px 6px 8px" }}>
          <div style={{ fontFamily: mono, fontSize: 8, color: "#ffffff33", letterSpacing: 2 }}>◀ THEORETICAL</div>
          <div style={{ fontFamily: mono, fontSize: 8, color: "#ffffff33", letterSpacing: 2 }}>CLINICAL ▶</div>
        </div>
        <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "1fr 1fr", gap: 8 }}>
          {grid.map((row, ri) =>
            row.map((cell, ci) => {
              if (!cell) return <div key={`${ri}-${ci}`} style={{ background: "#ffffff04", borderRadius: 10, border: "1px solid #ffffff08" }} />;
              const isSel = selected === cell.treeNum;
              return (
                <div
                  key={cell.treeNum}
                  onClick={() => setSelected(isSel ? null : cell.treeNum)}
                  style={{
                    background: isSel ? cell.accent + "18" : "#ffffff06",
                    border: `1px solid ${isSel ? cell.accent : "#ffffff0f"}`,
                    borderRadius: 10,
                    padding: 20,
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                    transition: "all 0.18s",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  {/* Accent corner */}
                  <div style={{ position: "absolute", top: 0, left: 0, width: 4, height: "100%", background: isSel ? cell.accent : cell.accent + "44", borderRadius: "10px 0 0 10px" }} />
                  <div style={{ paddingLeft: 8 }}>
                    <div style={{ fontFamily: mono, fontSize: 8, color: cell.accent + "aa", letterSpacing: 2, marginBottom: 4 }}>{cell.treeNum}</div>
                    <div style={{ fontFamily: mono, fontSize: 13, color: isSel ? "#fff" : "#ffffffcc", fontWeight: 600, lineHeight: 1.3 }}>
                      {cell.term.name}
                    </div>
                    <div style={{ fontFamily: mono, fontSize: 8, color: "#ffffff44", marginTop: 6, letterSpacing: 1 }}>{cell.label}</div>
                  </div>
                  <div style={{ paddingLeft: 8, display: "flex", gap: 16, marginTop: "auto" }}>
                    <div>
                      <div style={{ fontFamily: mono, fontSize: 18, color: cell.accent, fontWeight: 700 }}>{cell.totalCount.toLocaleString()}</div>
                      <div style={{ fontFamily: mono, fontSize: 7, color: "#ffffff33", letterSpacing: 1 }}>TOTAL TERMS</div>
                    </div>
                    <div>
                      <div style={{ fontFamily: mono, fontSize: 18, color: "#ffffff55", fontWeight: 700 }}>{cell.directCount}</div>
                      <div style={{ fontFamily: mono, fontSize: 7, color: "#ffffff33", letterSpacing: 1 }}>DIRECT CHILDREN</div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
        {/* Y-axis labels */}
        <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 8px 0 8px" }}>
          <div style={{ fontFamily: mono, fontSize: 8, color: "#ffffff33", letterSpacing: 2 }}>▲ INDIVIDUAL</div>
          <div style={{ fontFamily: mono, fontSize: 8, color: "#ffffff33", letterSpacing: 2 }}>SOCIAL ▼</div>
        </div>
      </div>

      {/* Right: children panel */}
      <div style={{ width: 320, borderLeft: "1px solid #ffffff0a", padding: 20, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
        {!selBranch ? (
          <div style={{ fontFamily: mono, fontSize: 9, color: "#ffffff22", marginTop: 40, textAlign: "center", lineHeight: 2 }}>
            Click a quadrant<br/>to explore its children
          </div>
        ) : (
          <>
            <div style={{ fontFamily: mono, fontSize: 8, color: "#ffffff33", letterSpacing: 2, marginBottom: 4 }}>
              {selBranch.treeNum} · {children.length} CHILDREN
            </div>
            <div style={{ fontFamily: mono, fontSize: 12, color: "#ffffffcc", fontWeight: 600, marginBottom: 12 }}>
              {selBranch.term.name}
            </div>
            {children.map(({ term, treeNum }) => (
              <div key={treeNum} style={{ padding: "8px 12px", background: "#ffffff06", border: "1px solid #ffffff0a", borderRadius: 6 }}>
                <div style={{ fontFamily: mono, fontSize: 7, color: TREE_COLOR + "88", letterSpacing: 1, marginBottom: 2 }}>{treeNum}</div>
                <div style={{ fontFamily: mono, fontSize: 10, color: "#ffffffaa" }}>{term.name}</div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SKETCH 2 — DISORDER TAXONOMY
// Focus on F03 Mental Disorders. Direct children as cards with grandchildren chips.
// ═══════════════════════════════════════════════════════════════════════════
function DisorderTaxonomy({ data }) {
  const [selected, setSelected] = useState(null);
  const { branches, childrenMap } = data;

  const f03 = branches.find(b => b.treeNum === "F03");
  if (!f03) {
    return (
      <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontFamily: mono, fontSize: 10, color: "#ffffff44" }}>F03 not found</div>
      </div>
    );
  }

  const f03Children = (childrenMap.get("F03") || []).sort((a, b) =>
    a.treeNum.localeCompare(b.treeNum, undefined, { numeric: true })
  );

  function countAll(treeNum) {
    let n = 0;
    const q = [treeNum];
    while (q.length) {
      const k = q.shift();
      const kids = childrenMap.get(k) || [];
      n += kids.length;
      for (const c of kids) q.push(c.treeNum);
    }
    return n;
  }

  const selChild = selected
    ? f03Children.find(c => c.treeNum === selected)
    : null;
  const grandchildren = selected
    ? (childrenMap.get(selected) || []).sort((a, b) =>
        a.treeNum.localeCompare(b.treeNum, undefined, { numeric: true }))
    : [];

  // Color palette for disorder categories
  const COLORS = ["#E8A598","#9B72CF","#4ECDC4","#81B29A","#F4A261","#A8DADC","#DDB892","#FF9A9E","#B5C99A","#E07A5F","#C9B1FF","#FFD6A5"];

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "16px 24px 12px", borderBottom: "1px solid #ffffff0a", flexShrink: 0 }}>
        <div style={{ fontFamily: mono, fontSize: 8, color: "#ffffff33", letterSpacing: 2 }}>F03 · MENTAL DISORDERS</div>
        <div style={{ fontFamily: mono, fontSize: 11, color: "#ffffffaa", marginTop: 2 }}>
          {f03.totalCount.toLocaleString()} total terms · {f03Children.length} top-level categories
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Category cards */}
        <div style={{ flex: 1, padding: 20, overflowY: "auto", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12, alignContent: "start" }}>
          {f03Children.map(({ term, treeNum }, idx) => {
            const color = COLORS[idx % COLORS.length];
            const grandkids = (childrenMap.get(treeNum) || []).slice(0, 6);
            const subCount = countAll(treeNum);
            const isSel = selected === treeNum;
            return (
              <div
                key={treeNum}
                onClick={() => setSelected(isSel ? null : treeNum)}
                style={{
                  background: isSel ? color + "18" : "#ffffff06",
                  border: `1px solid ${isSel ? color : "#ffffff0f"}`,
                  borderRadius: 8,
                  padding: 14,
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div>
                    <div style={{ fontFamily: mono, fontSize: 7, color: color + "99", letterSpacing: 2, marginBottom: 3 }}>{treeNum}</div>
                    <div style={{ fontFamily: mono, fontSize: 11, color: isSel ? "#fff" : "#ffffffcc", fontWeight: 600, lineHeight: 1.3 }}>{term.name}</div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 8 }}>
                    <div style={{ fontFamily: mono, fontSize: 14, color: color, fontWeight: 700 }}>{subCount}</div>
                    <div style={{ fontFamily: mono, fontSize: 6, color: "#ffffff33", letterSpacing: 1 }}>TERMS</div>
                  </div>
                </div>
                {grandkids.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
                    {grandkids.map(({ term: gt, treeNum: gtn }) => (
                      <span key={gtn} style={{ fontFamily: mono, fontSize: 7.5, color: color + "cc", background: color + "14", border: `1px solid ${color}30`, borderRadius: 4, padding: "2px 6px" }}>
                        {gt.name}
                      </span>
                    ))}
                    {(childrenMap.get(treeNum) || []).length > 6 && (
                      <span style={{ fontFamily: mono, fontSize: 7.5, color: "#ffffff33", padding: "2px 6px" }}>
                        +{(childrenMap.get(treeNum) || []).length - 6} more
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Selected detail panel */}
        {selChild && (
          <div style={{ width: 300, borderLeft: "1px solid #ffffff0a", padding: 20, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
            <div style={{ fontFamily: mono, fontSize: 8, color: "#ffffff33", letterSpacing: 2 }}>{selChild.treeNum}</div>
            <div style={{ fontFamily: mono, fontSize: 12, color: "#ffffffcc", fontWeight: 600, marginBottom: 4 }}>{selChild.term.name}</div>
            <div style={{ fontFamily: mono, fontSize: 8, color: "#ffffff33", letterSpacing: 1, marginBottom: 8 }}>{grandchildren.length} SUBCATEGORIES</div>
            {grandchildren.map(({ term, treeNum }) => (
              <div key={treeNum} style={{ padding: "6px 10px", background: "#ffffff06", border: "1px solid #ffffff0a", borderRadius: 5 }}>
                <div style={{ fontFamily: mono, fontSize: 6.5, color: TREE_COLOR + "77", letterSpacing: 1, marginBottom: 1 }}>{treeNum}</div>
                <div style={{ fontFamily: mono, fontSize: 9.5, color: "#ffffffaa" }}>{term.name}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SKETCH 3 — BEHAVIOR SPECTRUM
// F01 children as horizontal spectrum from primitive drives to complex social behavior.
// Other branches shown as supporting cards below.
// ═══════════════════════════════════════════════════════════════════════════

// Manual ordering from primitive/basic to complex/social
// We'll sort F01 children alphabetically but present with a conceptual spectrum gradient
function BehaviorSpectrum({ data }) {
  const [hovered, setHovered] = useState(null);
  const { branches, childrenMap } = data;

  const f01 = branches.find(b => b.treeNum === "F01");
  const otherBranches = branches.filter(b => b.treeNum !== "F01");

  const f01Children = f01
    ? (childrenMap.get("F01") || []).sort((a, b) =>
        a.treeNum.localeCompare(b.treeNum, undefined, { numeric: true }))
    : [];

  // Spectrum gradient: cool (primitive) → warm (complex/social)
  function spectrumColor(idx, total) {
    const t = total <= 1 ? 0 : idx / (total - 1);
    // cool purple → warm salmon
    const r = Math.round(155 + t * (232 - 155));
    const g = Math.round(114 + t * (165 - 114));
    const b2 = Math.round(207 - t * (207 - 152));
    return `rgb(${r},${g},${b2})`;
  }

  const hov = hovered ? f01Children.find(c => c.treeNum === hovered) : null;

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "16px 24px 12px", borderBottom: "1px solid #ffffff0a", flexShrink: 0 }}>
        <div style={{ fontFamily: mono, fontSize: 8, color: "#ffffff33", letterSpacing: 2 }}>F01 · BEHAVIOR AND BEHAVIOR MECHANISMS</div>
        <div style={{ fontFamily: mono, fontSize: 11, color: "#ffffffaa", marginTop: 2 }}>
          Spectrum from primitive drives to complex social behavior
        </div>
      </div>

      <div style={{ flex: 1, padding: 24, overflowY: "auto", display: "flex", flexDirection: "column", gap: 24 }}>
        {/* Spectrum axis labels */}
        <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: 6, borderBottom: "1px solid #ffffff08" }}>
          <div style={{ fontFamily: mono, fontSize: 8, color: "#9B72CF", letterSpacing: 2 }}>◀ PRIMITIVE / BASIC DRIVES</div>
          <div style={{ fontFamily: mono, fontSize: 8, color: TREE_COLOR, letterSpacing: 2 }}>COMPLEX SOCIAL BEHAVIOR ▶</div>
        </div>

        {/* Ribbon of chips */}
        {f01 ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "flex-start" }}>
            {f01Children.map(({ term, treeNum }, idx) => {
              const color = spectrumColor(idx, f01Children.length);
              const isHov = hovered === treeNum;
              return (
                <div
                  key={treeNum}
                  onMouseEnter={() => setHovered(treeNum)}
                  onMouseLeave={() => setHovered(null)}
                  style={{
                    fontFamily: mono,
                    fontSize: 9.5,
                    color: isHov ? "#fff" : color,
                    background: isHov ? color + "28" : color + "12",
                    border: `1px solid ${isHov ? color : color + "55"}`,
                    borderRadius: 20,
                    padding: "6px 14px",
                    cursor: "default",
                    transition: "all 0.15s",
                    whiteSpace: "nowrap",
                  }}
                >
                  <span style={{ fontSize: 7, opacity: 0.6, marginRight: 5 }}>{treeNum}</span>
                  {term.name}
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ fontFamily: mono, fontSize: 9, color: "#ffffff33" }}>F01 branch not found</div>
        )}

        {/* Hover tooltip */}
        <div style={{ minHeight: 60, padding: "12px 16px", background: "#ffffff06", border: `1px solid ${hov ? TREE_COLOR + "44" : "#ffffff0a"}`, borderRadius: 8, transition: "all 0.15s" }}>
          {hov ? (
            <>
              <div style={{ fontFamily: mono, fontSize: 8, color: TREE_COLOR + "88", letterSpacing: 2, marginBottom: 4 }}>{hov.treeNum}</div>
              <div style={{ fontFamily: mono, fontSize: 11, color: "#ffffffcc", fontWeight: 600 }}>{hov.term.name}</div>
              {hov.term.scopeNote && (
                <div style={{ fontFamily: mono, fontSize: 9, color: "#ffffff66", marginTop: 6, lineHeight: 1.6, fontStyle: "italic" }}>
                  {hov.term.scopeNote.slice(0, 220)}{hov.term.scopeNote.length > 220 ? "…" : ""}
                </div>
              )}
              <div style={{ fontFamily: mono, fontSize: 7.5, color: "#ffffff33", marginTop: 6, letterSpacing: 1 }}>
                {(childrenMap.get(hov.treeNum) || []).length} sub-terms
              </div>
            </>
          ) : (
            <div style={{ fontFamily: mono, fontSize: 8, color: "#ffffff22" }}>Hover a chip to see scope note</div>
          )}
        </div>

        {/* Divider */}
        <div style={{ borderTop: "1px solid #ffffff0a", paddingTop: 16 }}>
          <div style={{ fontFamily: mono, fontSize: 8, color: "#ffffff33", letterSpacing: 2, marginBottom: 12 }}>OTHER F BRANCHES</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {otherBranches.map(b => (
              <div key={b.treeNum} style={{ padding: "10px 16px", background: "#ffffff06", border: "1px solid #ffffff0a", borderRadius: 8, minWidth: 180 }}>
                <div style={{ fontFamily: mono, fontSize: 7, color: TREE_COLOR + "88", letterSpacing: 2, marginBottom: 3 }}>{b.treeNum}</div>
                <div style={{ fontFamily: mono, fontSize: 10, color: "#ffffffaa", fontWeight: 600 }}>{b.term.name}</div>
                <div style={{ fontFamily: mono, fontSize: 8, color: "#ffffff44", marginTop: 4 }}>{b.totalCount.toLocaleString()} terms</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── APP ────────────────────────────────────────────────────────────────────
const VIEWS = [
  { id: "quadrant",  label: "1. Four Quadrants" },
  { id: "disorders", label: "2. Disorder Taxonomy" },
  { id: "spectrum",  label: "3. Behavior Spectrum" },
];

export default function MeshFConcepts() {
  const [active, setActive] = useState("quadrant");
  const { data, loading } = useFData();

  const views = { quadrant: FourQuadrants, disorders: DisorderTaxonomy, spectrum: BehaviorSpectrum };
  const Active = views[active];

  return (
    <div style={{ width: "100%", height: "100vh", display: "flex", flexDirection: "column", background: BG }}>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&display=swap" rel="stylesheet" />

      <nav style={{ display: "flex", alignItems: "center", gap: 0, borderBottom: "2px solid #ffffff12", flexShrink: 0, background: "#0a0c10", overflowX: "auto" }}>
        <div style={{ padding: "12px 20px", fontFamily: mono, fontSize: 9, color: "#ffffff33", letterSpacing: 2, flexShrink: 0 }}>
          F CONCEPTS
        </div>
        {VIEWS.map(v => (
          <button
            key={v.id}
            onClick={() => setActive(v.id)}
            style={{
              padding: "12px 18px", fontFamily: mono, fontSize: 10,
              background: "transparent", border: "none",
              borderBottom: active === v.id ? `2px solid ${TREE_COLOR}` : "2px solid transparent",
              marginBottom: "-2px",
              color: active === v.id ? TREE_COLOR : "#ffffff44",
              cursor: "pointer", flexShrink: 0, transition: "all 0.15s",
            }}
          >
            {v.label}
          </button>
        ))}
      </nav>

      <div style={{ flex: 1, overflow: "hidden" }}>
        {loading ? <Loading /> : <Active data={data} />}
      </div>
    </div>
  );
}
