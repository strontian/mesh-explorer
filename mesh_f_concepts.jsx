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
  const [selected, setSelected] = useState("F03");
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

  const nodeByPath = new Map();
  for (const b of branches) nodeByPath.set(b.treeNum, b.term);
  for (const kids of childrenMap.values()) {
    for (const { term, treeNum } of kids) nodeByPath.set(treeNum, term);
  }

  function lineage(treeNum) {
    const parts = treeNum.split(".");
    const nodes = [];
    for (let i = 1; i <= parts.length; i++) {
      const path = parts.slice(0, i).join(".");
      nodes.push({ treeNum: path, term: nodeByPath.get(path) });
    }
    return nodes;
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

  function collectVisibleDescendants(rootTreeNum, maxItems = 90, maxDepth = 4) {
    const rows = [];
    const walk = (treeNum, depth) => {
      if (depth > maxDepth || rows.length >= maxItems) return;
      const kids = (childrenMap.get(treeNum) || []).sort((a, b) =>
        a.treeNum.localeCompare(b.treeNum, undefined, { numeric: true })
      );
      for (const child of kids) {
        if (rows.length >= maxItems) break;
        const grandCount = (childrenMap.get(child.treeNum) || []).length;
        rows.push({ ...child, depth, grandCount });
        if (grandCount > 0) walk(child.treeNum, depth + 1);
      }
    };
    walk(rootTreeNum, 1);
    return rows;
  }

  const selectedTerm = selected ? nodeByPath.get(selected) : f03.term;
  const selectedChildren = selected
    ? (childrenMap.get(selected) || []).sort((a, b) =>
        a.treeNum.localeCompare(b.treeNum, undefined, { numeric: true }))
    : [];
  const selectedLineage = selected ? lineage(selected).filter(n => n.term) : [];

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
            const grandkids = (childrenMap.get(treeNum) || []).sort((a, b) =>
              a.treeNum.localeCompare(b.treeNum, undefined, { numeric: true })
            ).slice(0, 8);
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
                      <button
                        key={gtn}
                        onClick={(e) => { e.stopPropagation(); setSelected(gtn); }}
                        style={{ fontFamily: mono, fontSize: 7.5, color: selected === gtn ? "#fff" : color + "cc", background: selected === gtn ? color + "28" : color + "14", border: `1px solid ${selected === gtn ? color : color + "30"}`, borderRadius: 4, padding: "2px 6px", cursor: "pointer" }}
                      >
                        {gt.name}
                      </button>
                    ))}
                    {(childrenMap.get(treeNum) || []).length > 8 && (
                      <span style={{ fontFamily: mono, fontSize: 7.5, color: "#ffffff33", padding: "2px 6px" }}>
                        +{(childrenMap.get(treeNum) || []).length - 8} more
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Selected detail panel */}
        <div style={{ width: 330, borderLeft: "1px solid #ffffff0a", padding: 20, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, flexShrink: 0 }}>
          <div style={{ fontFamily: mono, fontSize: 8, color: "#ffffff33", letterSpacing: 2 }}>SELECTED TERM</div>
          <div>
            <div style={{ fontFamily: mono, fontSize: 7, color: TREE_COLOR + "88", letterSpacing: 1, marginBottom: 4 }}>{selected || "F03"}</div>
            <div style={{ fontFamily: mono, fontSize: 13, color: "#ffffffdd", fontWeight: 600, lineHeight: 1.35 }}>{selectedTerm?.name || "Mental Disorders"}</div>
          </div>

          {selectedLineage.length > 1 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, paddingBottom: 4 }}>
              {selectedLineage.map((node, i) => (
                <button
                  key={node.treeNum}
                  onClick={() => setSelected(node.treeNum)}
                  style={{ fontFamily: mono, fontSize: 7, color: i === selectedLineage.length - 1 ? "#fff" : "#ffffff8a", background: i === selectedLineage.length - 1 ? TREE_COLOR + "22" : "#ffffff08", border: `1px solid ${i === selectedLineage.length - 1 ? TREE_COLOR + "66" : "#ffffff12"}`, borderRadius: 4, padding: "3px 6px", cursor: "pointer" }}
                >
                  {node.term?.name || node.treeNum}
                </button>
              ))}
            </div>
          )}

          {selectedTerm?.note && (
            <div style={{ fontFamily: mono, fontSize: 8.5, color: "#ffffff66", lineHeight: 1.6, background: "#ffffff06", border: "1px solid #ffffff10", borderRadius: 6, padding: "10px 11px" }}>
              {selectedTerm.note}
            </div>
          )}

          <div style={{ fontFamily: mono, fontSize: 8, color: "#ffffff33", letterSpacing: 1 }}>
            {selectedChildren.length} CHILD {selectedChildren.length === 1 ? "TERM" : "TERMS"}
          </div>

          {selectedChildren.length === 0 ? (
            <div style={{ fontFamily: mono, fontSize: 8.5, color: "#ffffff35", lineHeight: 1.6 }}>
              No narrower terms in the current MeSH data.
            </div>
          ) : (
            selectedChildren.map(({ term, treeNum }) => {
              const childCount = (childrenMap.get(treeNum) || []).length;
              const active = selected === treeNum;
              return (
                <button
                  key={treeNum}
                  onClick={() => setSelected(treeNum)}
                  style={{ textAlign: "left", padding: "7px 10px", background: active ? TREE_COLOR + "18" : "#ffffff06", border: `1px solid ${active ? TREE_COLOR + "66" : "#ffffff0a"}`, borderRadius: 5, cursor: "pointer" }}
                >
                  <div style={{ fontFamily: mono, fontSize: 6.5, color: TREE_COLOR + "77", letterSpacing: 1, marginBottom: 1 }}>{treeNum}</div>
                  <div style={{ fontFamily: mono, fontSize: 9.5, color: "#ffffffaa", lineHeight: 1.35 }}>{term.name}</div>
                  <div style={{ fontFamily: mono, fontSize: 7, color: "#ffffff2f", marginTop: 3 }}>{childCount} children</div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SKETCH 1 — MENTAL HEALTH STACK
// Four layer view: behavior, phenomena, disorders, and practice.
// ═══════════════════════════════════════════════════════════════════════════
function MentalHealthStack({ data }) {
  const [selected, setSelected] = useState("F01");
  const [expandedByLayer, setExpandedByLayer] = useState({});
  const { branches, childrenMap } = data;

  const LAYERS = [
    { treeNum: "F01", label: "Behavior / Mechanisms", phrase: "what people do and the mechanisms behind it", color: "#9B72CF" },
    { treeNum: "F02", label: "Phenomena / Theory", phrase: "mental processes, principles, and applied constructs", color: "#4ECDC4" },
    { treeNum: "F03", label: "Disorders / Diagnosis", phrase: "when adaptation and mental function break down", color: "#E8A598" },
    { treeNum: "F04", label: "Methods / Practice", phrase: "how psychology and psychiatry measure, treat, and organize work", color: "#81B29A" },
  ];

  const byId = new Map(branches.map(b => [b.treeNum, b]));
  const nodeByPath = new Map();
  for (const b of branches) nodeByPath.set(b.treeNum, b.term);
  for (const kids of childrenMap.values()) {
    for (const { term, treeNum } of kids) nodeByPath.set(treeNum, term);
  }

  const selectedRoot = selected?.slice(0, 3) || "F01";
  const selectedLayer = LAYERS.find(l => l.treeNum === selectedRoot) || LAYERS[0];
  const selectedInline = expandedByLayer[selectedRoot] || (selected === selectedRoot ? null : selected);
  const selectedInlineTerm = selectedInline ? nodeByPath.get(selectedInline) : null;
  const selectedInlineChildren = selectedInline
    ? (childrenMap.get(selectedInline) || []).sort((a, b) =>
        a.treeNum.localeCompare(b.treeNum, undefined, { numeric: true })
      )
    : [];
  const selectedTerm = nodeByPath.get(selected) || byId.get(selectedLayer.treeNum)?.term;
  const selectedChildren = (childrenMap.get(selected) || []).sort((a, b) =>
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

  function collectVisibleDescendants(rootTreeNum, maxItems = 90, maxDepth = 4) {
    const rows = [];
    const walk = (treeNum, depth) => {
      if (depth > maxDepth || rows.length >= maxItems) return;
      const kids = (childrenMap.get(treeNum) || []).sort((a, b) =>
        a.treeNum.localeCompare(b.treeNum, undefined, { numeric: true })
      );
      for (const child of kids) {
        if (rows.length >= maxItems) break;
        const grandCount = (childrenMap.get(child.treeNum) || []).length;
        rows.push({ ...child, depth, grandCount });
        if (grandCount > 0) walk(child.treeNum, depth + 1);
      }
    };
    walk(rootTreeNum, 1);
    return rows;
  }

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ padding: "16px 24px 12px", borderBottom: "1px solid #ffffff0a", flexShrink: 0 }}>
        <div style={{ fontFamily: mono, fontSize: 8, color: "#ffffff33", letterSpacing: 2 }}>F · PSYCHOLOGY AND PSYCHIATRY</div>
        <div style={{ fontFamily: mono, fontSize: 11, color: "#ffffffaa", marginTop: 2 }}>
          Mental health as a stack: behavior, mind, disorder, practice
        </div>
      </div>

      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "minmax(420px, 1fr) 340px", overflow: "hidden" }}>
        <div style={{ padding: 22, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
          {LAYERS.map((layer, idx) => {
            const branch = byId.get(layer.treeNum);
            const children = (childrenMap.get(layer.treeNum) || []).slice(0, 12);
            const active = selectedRoot === layer.treeNum;
            return (
              <div
                key={layer.treeNum}
                style={{ display: "grid", gridTemplateColumns: "92px minmax(0, 1fr)", gap: 14, padding: 16, background: active ? layer.color + "16" : "#ffffff06", border: `1px solid ${active ? layer.color : "#ffffff0f"}`, borderRadius: 8 }}
              >
                <div style={{ borderRight: `1px solid ${layer.color}33`, paddingRight: 12 }}>
                  <div style={{ fontFamily: mono, fontSize: 7, color: layer.color, letterSpacing: 2, marginBottom: 8 }}>LAYER {idx + 1}</div>
                  <button
                    onClick={() => { setSelected(layer.treeNum); setExpandedByLayer(prev => ({ ...prev, [layer.treeNum]: null })); }}
                    style={{ display: "block", background: "transparent", border: "none", padding: 0, fontFamily: mono, fontSize: 17, color: layer.color, fontWeight: 700, cursor: "pointer", textAlign: "left" }}
                  >
                    {layer.treeNum}
                  </button>
                  <div style={{ fontFamily: mono, fontSize: 7, color: "#ffffff33", marginTop: 4 }}>{branch?.totalCount?.toLocaleString() || 0} terms</div>
                </div>
                <div>
                  <button
                    onClick={() => { setSelected(layer.treeNum); setExpandedByLayer(prev => ({ ...prev, [layer.treeNum]: null })); }}
                    style={{ display: "block", background: "transparent", border: "none", padding: 0, fontFamily: mono, fontSize: 13, color: active ? "#fff" : "#ffffffd0", fontWeight: 600, cursor: "pointer", textAlign: "left" }}
                  >
                    {branch?.term.name || layer.label}
                  </button>
                  <div style={{ fontFamily: mono, fontSize: 8.5, color: "#ffffff55", lineHeight: 1.5, marginTop: 4 }}>
                    {layer.label} · {layer.phrase}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 10 }}>
                    {children.map(({ term, treeNum }) => (
                      <button
                        key={treeNum}
                        onClick={(e) => { e.stopPropagation(); setSelected(treeNum); setExpandedByLayer(prev => ({ ...prev, [layer.treeNum]: treeNum })); }}
                        style={{ fontFamily: mono, fontSize: 7.5, color: selectedInline === treeNum ? "#fff" : layer.color + "dd", background: selectedInline === treeNum ? layer.color + "28" : layer.color + "12", border: `1px solid ${selectedInline === treeNum ? layer.color : layer.color + "2f"}`, borderRadius: 4, padding: "2px 6px", cursor: "pointer" }}
                      >
                        {term.name}
                      </button>
                    ))}
                  </div>

                  {active && selectedInline && (
                    <div style={{ marginTop: 13, paddingTop: 12, borderTop: `1px solid ${layer.color}24` }}>
                      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
                        <div>
                          <div style={{ fontFamily: mono, fontSize: 7, color: layer.color + "aa", letterSpacing: 1, marginBottom: 2 }}>{selectedInline}</div>
                          <div style={{ fontFamily: mono, fontSize: 10, color: "#ffffffcc", fontWeight: 600 }}>{selectedInlineTerm?.name}</div>
                        </div>
                        <div style={{ fontFamily: mono, fontSize: 7, color: "#ffffff33", flexShrink: 0 }}>
                          {selectedInlineChildren.length} child {selectedInlineChildren.length === 1 ? "term" : "terms"}
                        </div>
                      </div>

                      {selectedInlineChildren.length === 0 ? (
                        <div style={{ fontFamily: mono, fontSize: 8, color: "#ffffff35", lineHeight: 1.5 }}>
                          No narrower terms in the current MeSH data.
                        </div>
                      ) : (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                          {collectVisibleDescendants(selectedInline).map(({ term, treeNum, depth, grandCount }) => (
                            <button
                              key={treeNum}
                              onClick={(e) => { e.stopPropagation(); setSelected(treeNum); }}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                fontFamily: mono,
                                fontSize: 7.2,
                                color: selected === treeNum ? "#fff" : "#ffffffb8",
                                background: selected === treeNum ? layer.color + "28" : layer.color + "0d",
                                border: `1px solid ${selected === treeNum ? layer.color : layer.color + "22"}`,
                                borderRadius: 12,
                                padding: "3px 7px",
                                cursor: "pointer",
                                maxWidth: "100%",
                              }}
                            >
                              <span style={{ color: layer.color + "aa", fontSize: 6.2 }}>L{depth}</span>
                              <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{term.name}</span>
                              {grandCount > 0 && <span style={{ color: "#ffffff30", fontSize: 6.5 }}>+{grandCount}</span>}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <aside style={{ borderLeft: "1px solid #ffffff0a", padding: 20, overflowY: "auto" }}>
          <div style={{ fontFamily: mono, fontSize: 8, color: selectedLayer.color, letterSpacing: 2, marginBottom: 6 }}>{selected}</div>
          <div style={{ fontFamily: mono, fontSize: 13, color: "#ffffffdd", fontWeight: 600, lineHeight: 1.35 }}>{selectedTerm?.name}</div>
          <div style={{ fontFamily: mono, fontSize: 8.5, color: "#ffffff55", lineHeight: 1.55, marginTop: 8 }}>{selectedLayer.phrase}</div>
          {selectedTerm?.note && (
            <div style={{ fontFamily: mono, fontSize: 8, color: "#ffffff55", lineHeight: 1.55, background: "#ffffff06", border: "1px solid #ffffff10", borderRadius: 6, padding: 10, marginTop: 12 }}>
              {selectedTerm.note}
            </div>
          )}
          <div style={{ fontFamily: mono, fontSize: 7.5, color: "#ffffff35", lineHeight: 1.6, marginTop: 14 }}>
            Child terms are shown inline inside the active stack layer.
          </div>
        </aside>
      </div>
    </div>
  );
}

// ── APP ────────────────────────────────────────────────────────────────────
const VIEWS = [
  { id: "stack",     label: "1. Mental Health Stack" },
  { id: "disorders", label: "2. Disorder Taxonomy" },
];

export default function MeshFConcepts() {
  const [active, setActive] = useState("stack");
  const { data, loading } = useFData();

  const views = { stack: MentalHealthStack, disorders: DisorderTaxonomy };
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
