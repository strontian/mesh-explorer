import { useState, useEffect } from "react";

const mono = "'IBM Plex Mono', monospace";
const BG = "#0f1117";
const TREE_COLOR = "#A8D8A8";

// ── DATA HOOK ─────────────────────────────────────────────────────────────
function useAData() {
  const [state, setState] = useState({ data: null, loading: true });
  useEffect(() => {
    fetch("/mesh-terms.json").then(r => r.json()).then(terms => {
      // Build full childrenMap
      const childrenMap = new Map();
      for (const term of terms) {
        for (const tn of term.treeNums) {
          const dot = tn.lastIndexOf(".");
          const key = dot === -1 ? tn[0] : tn.slice(0, dot);
          if (!childrenMap.has(key)) childrenMap.set(key, []);
          childrenMap.get(key).push({ term, treeNum: tn });
        }
      }

      // BFS descendant count
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

      const raw = (childrenMap.get("A") || []).sort((a, b) =>
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

// ── CARD PALETTE ──────────────────────────────────────────────────────────
const CARD_PALETTE = [
  "#A8D8A8", "#7EC8C8", "#F4B8A0", "#C3A8D8",
  "#A8C8D8", "#D8C8A8", "#D8A8B8", "#A8D8C0",
];

// ═══════════════════════════════════════════════════════════════════════════
// SKETCH 1 — SYSTEM CARDS
// Grid of cards, one per top-level A branch. Hover shows scope note.
// ═══════════════════════════════════════════════════════════════════════════
function SystemCards({ data }) {
  const [hovered, setHovered] = useState(null);
  const { branches } = data;
  const max = Math.max(...branches.map(b => b.totalCount));

  return (
    <div style={{ padding: 24, overflowY: "auto", height: "100%", boxSizing: "border-box" }}>
      <div style={{ fontFamily: mono, fontSize: 9, color: "#ffffff22", letterSpacing: 3, marginBottom: 16 }}>
        ANATOMY TREE — TOP-LEVEL BRANCHES
      </div>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: 12,
      }}>
        {branches.map((b, i) => {
          const color = CARD_PALETTE[i % CARD_PALETTE.length];
          const barPct = (b.totalCount / max) * 100;
          const isHov = hovered === b.treeNum;
          const scopeNote = b.term.scopeNote || "";
          const scopeSnippet = scopeNote.slice(0, 200) + (scopeNote.length > 200 ? "…" : "");

          return (
            <div
              key={b.treeNum}
              onMouseEnter={() => setHovered(b.treeNum)}
              onMouseLeave={() => setHovered(null)}
              style={{
                background: isHov ? "#ffffff0a" : "#ffffff05",
                border: `1px solid ${isHov ? color + "55" : "#ffffff0e"}`,
                borderLeft: `3px solid ${color}`,
                borderRadius: 6,
                padding: "12px 14px",
                cursor: "default",
                transition: "all 0.15s",
              }}
            >
              {/* Tree number */}
              <div style={{ fontFamily: mono, fontSize: 8, color: color, letterSpacing: 1, marginBottom: 4 }}>
                {b.treeNum}
              </div>
              {/* Branch name */}
              <div style={{ fontFamily: mono, fontSize: 10, color: "#ffffffcc", lineHeight: 1.4, marginBottom: 8 }}>
                {b.term.name}
              </div>
              {/* Mini bar */}
              <div style={{ marginBottom: 6 }}>
                <div style={{ height: 3, background: "#ffffff0a", borderRadius: 2 }}>
                  <div style={{
                    height: 3, width: `${barPct}%`,
                    background: color + "99",
                    borderRadius: 2,
                    transition: "width 0.3s",
                  }} />
                </div>
              </div>
              {/* Count */}
              <div style={{ fontFamily: mono, fontSize: 8, color: "#ffffff44" }}>
                {b.totalCount.toLocaleString()} terms
              </div>
              {/* Scope note — shown on hover */}
              {isHov && scopeSnippet && (
                <div style={{
                  marginTop: 10,
                  fontFamily: mono,
                  fontSize: 8,
                  color: "#ffffff66",
                  lineHeight: 1.6,
                  borderTop: `1px solid ${color}22`,
                  paddingTop: 8,
                }}>
                  {scopeSnippet}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SKETCH 2 — SCALE LADDER
// Organizes branches by biological scale level with a vertical spine.
// ═══════════════════════════════════════════════════════════════════════════

// Assign each top-level A branch to a biological scale level
const SCALE_ASSIGNMENTS = {
  MOLECULAR: ["A11", "A12"],
  TISSUE:    ["A10"],
  ORGAN:     ["A02", "A03", "A04", "A05", "A06", "A07", "A08", "A09", "A14", "A15", "A16", "A17"],
  REGION:    ["A01"],
};

const SCALE_ORDER = ["MOLECULAR", "TISSUE", "ORGAN", "REGION"];
const SCALE_COLORS = {
  MOLECULAR: "#C3A8D8",
  TISSUE:    "#7EC8C8",
  ORGAN:     "#A8D8A8",
  REGION:    "#F4B8A0",
};
const SCALE_DESCS = {
  MOLECULAR: "cells, fluids & secretions",
  TISSUE:    "tissue types",
  ORGAN:     "organs, systems & structures",
  REGION:    "body regions",
};

function ScaleLadder({ data }) {
  const [hovered, setHovered] = useState(null);
  const { branches } = data;

  // Build lookup by treeNum prefix (e.g. "A11")
  const byTN = {};
  for (const b of branches) byTN[b.treeNum] = b;

  return (
    <div style={{ padding: "28px 40px", overflowY: "auto", height: "100%", boxSizing: "border-box" }}>
      <div style={{ fontFamily: mono, fontSize: 9, color: "#ffffff22", letterSpacing: 3, marginBottom: 28 }}>
        BIOLOGICAL SCALE — ANATOMY TREE A
      </div>

      <div style={{ position: "relative" }}>
        {/* Vertical gradient spine */}
        <div style={{
          position: "absolute",
          left: 120,
          top: 0,
          bottom: 0,
          width: 2,
          background: "linear-gradient(to bottom, #C3A8D855, #7EC8C855, #A8D8A855, #F4B8A055)",
          borderRadius: 1,
        }} />

        {SCALE_ORDER.map((level, li) => {
          const color = SCALE_COLORS[level];
          const treeNums = SCALE_ASSIGNMENTS[level] || [];
          const bsInLevel = treeNums.map(tn => byTN[tn]).filter(Boolean);

          return (
            <div key={level} style={{ display: "flex", alignItems: "flex-start", marginBottom: 36, minHeight: 40 }}>
              {/* Left: scale label */}
              <div style={{ width: 110, flexShrink: 0, paddingRight: 10, paddingTop: 6 }}>
                <div style={{ fontFamily: mono, fontSize: 8, color: color, letterSpacing: 2, textAlign: "right" }}>
                  {level}
                </div>
                <div style={{ fontFamily: mono, fontSize: 7, color: "#ffffff22", textAlign: "right", marginTop: 2 }}>
                  {SCALE_DESCS[level]}
                </div>
              </div>

              {/* Spine connector dot */}
              <div style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: color,
                flexShrink: 0,
                marginTop: 4,
                marginLeft: -4,
                marginRight: 16,
                boxShadow: `0 0 6px ${color}66`,
              }} />

              {/* Right: branch chips */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, paddingTop: 0 }}>
                {bsInLevel.map(b => {
                  const isHov = hovered === b.treeNum;
                  return (
                    <div
                      key={b.treeNum}
                      onMouseEnter={() => setHovered(b.treeNum)}
                      onMouseLeave={() => setHovered(null)}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        background: isHov ? color + "22" : "#ffffff08",
                        border: `1px solid ${isHov ? color + "88" : color + "33"}`,
                        borderRadius: 6,
                        padding: "6px 10px",
                        cursor: "default",
                        transition: "all 0.15s",
                        minWidth: 120,
                      }}
                    >
                      <div style={{ fontFamily: mono, fontSize: 7.5, color: color, letterSpacing: 1 }}>
                        {b.treeNum}
                      </div>
                      <div style={{ fontFamily: mono, fontSize: 9.5, color: "#ffffffcc", marginTop: 2 }}>
                        {b.term.name}
                      </div>
                      <div style={{ fontFamily: mono, fontSize: 7, color: "#ffffff44", marginTop: 4 }}>
                        {b.totalCount.toLocaleString()} terms
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SKETCH 3 — HIERARCHY DRILL
// Two-panel: left = top-level branches, right = 2-level deep children.
// ═══════════════════════════════════════════════════════════════════════════
function HierarchyDrill({ data }) {
  const [selected, setSelected] = useState(null);
  const [expanded, setExpanded] = useState({});
  const { branches, childrenMap } = data;

  function toggleExpand(treeNum) {
    setExpanded(prev => ({ ...prev, [treeNum]: !prev[treeNum] }));
  }

  // When a new branch is selected, reset expanded state
  function selectBranch(b) {
    setSelected(b);
    setExpanded({});
  }

  const selColor = selected
    ? CARD_PALETTE[branches.findIndex(b => b.treeNum === selected.treeNum) % CARD_PALETTE.length]
    : TREE_COLOR;

  const directChildren = selected ? (childrenMap.get(selected.treeNum) || []) : [];

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>

      {/* ── Left panel: top-level branches ─────────────────────────────── */}
      <div style={{
        width: 280,
        flexShrink: 0,
        borderRight: "1px solid #ffffff0e",
        overflowY: "auto",
        padding: "16px 0",
      }}>
        <div style={{ fontFamily: mono, fontSize: 8, color: "#ffffff22", letterSpacing: 3, padding: "0 16px 12px" }}>
          TOP-LEVEL BRANCHES
        </div>
        {branches.map((b, i) => {
          const color = CARD_PALETTE[i % CARD_PALETTE.length];
          const isSel = selected?.treeNum === b.treeNum;
          return (
            <div
              key={b.treeNum}
              onClick={() => selectBranch(b)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 16px",
                cursor: "pointer",
                background: isSel ? color + "15" : "transparent",
                borderLeft: `3px solid ${isSel ? color : "transparent"}`,
                transition: "all 0.12s",
              }}
            >
              <div style={{ fontFamily: mono, fontSize: 8, color: color, letterSpacing: 1, width: 28, flexShrink: 0 }}>
                {b.treeNum}
              </div>
              <div style={{ fontFamily: mono, fontSize: 9, color: isSel ? "#ffffffdd" : "#ffffff77", flex: 1, lineHeight: 1.4 }}>
                {b.term.name}
              </div>
              <div style={{ fontFamily: mono, fontSize: 7.5, color: "#ffffff33", flexShrink: 0 }}>
                {b.totalCount.toLocaleString()}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Right panel: children drill ─────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
        {!selected ? (
          <div style={{ fontFamily: mono, fontSize: 9, color: "#ffffff22", paddingTop: 40, textAlign: "center" }}>
            ← select a branch to explore its children
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontFamily: mono, fontSize: 8, color: selColor, letterSpacing: 2, marginBottom: 4 }}>
                {selected.treeNum}
              </div>
              <div style={{ fontFamily: mono, fontSize: 14, color: "#ffffffdd", marginBottom: 4 }}>
                {selected.term.name}
              </div>
              <div style={{ fontFamily: mono, fontSize: 8, color: "#ffffff44" }}>
                {selected.totalCount.toLocaleString()} total descendants · {directChildren.length} direct children
              </div>
              {selected.term.scopeNote && (
                <div style={{ fontFamily: mono, fontSize: 8, color: "#ffffff55", marginTop: 8, lineHeight: 1.6, maxWidth: 600 }}>
                  {selected.term.scopeNote.slice(0, 300)}{selected.term.scopeNote.length > 300 ? "…" : ""}
                </div>
              )}
            </div>

            {/* Children list */}
            {directChildren.length === 0 ? (
              <div style={{ fontFamily: mono, fontSize: 8, color: "#ffffff22" }}>No direct children found.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {directChildren.map(({ term: ct, treeNum: ctn }) => {
                  const grandchildren = childrenMap.get(ctn) || [];
                  const isExp = !!expanded[ctn];
                  return (
                    <div key={ctn}>
                      {/* Level 1 child row */}
                      <div
                        onClick={() => grandchildren.length > 0 && toggleExpand(ctn)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "6px 10px",
                          borderRadius: 4,
                          cursor: grandchildren.length > 0 ? "pointer" : "default",
                          background: isExp ? selColor + "12" : "transparent",
                          transition: "background 0.12s",
                        }}
                      >
                        {/* Expand triangle */}
                        <div style={{
                          width: 12,
                          fontFamily: mono,
                          fontSize: 8,
                          color: grandchildren.length > 0 ? selColor + "99" : "transparent",
                          flexShrink: 0,
                          userSelect: "none",
                          transition: "transform 0.15s",
                          transform: isExp ? "rotate(90deg)" : "rotate(0deg)",
                          display: "inline-block",
                        }}>▶</div>
                        <div style={{ fontFamily: mono, fontSize: 7.5, color: selColor + "bb", width: 50, flexShrink: 0 }}>
                          {ctn}
                        </div>
                        <div style={{ fontFamily: mono, fontSize: 9.5, color: "#ffffffcc", flex: 1 }}>
                          {ct.name}
                        </div>
                        {grandchildren.length > 0 && (
                          <div style={{ fontFamily: mono, fontSize: 7.5, color: "#ffffff33", flexShrink: 0 }}>
                            {grandchildren.length} children
                          </div>
                        )}
                      </div>

                      {/* Level 2: grandchildren */}
                      {isExp && grandchildren.map(({ term: gt, treeNum: gtn }) => (
                        <div
                          key={gtn}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "5px 10px 5px 34px",
                            borderRadius: 4,
                          }}
                        >
                          <div style={{ width: 12, flexShrink: 0 }} />
                          <div style={{ fontFamily: mono, fontSize: 7, color: selColor + "66", width: 50, flexShrink: 0 }}>
                            {gtn}
                          </div>
                          <div style={{ fontFamily: mono, fontSize: 8.5, color: "#ffffff88", flex: 1 }}>
                            {gt.name}
                          </div>
                          <div style={{ fontFamily: mono, fontSize: 7, color: "#ffffff22", flexShrink: 0 }}>
                            {(childrenMap.get(gtn) || []).length > 0
                              ? `+${(childrenMap.get(gtn) || []).length}`
                              : ""}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── APP ────────────────────────────────────────────────────────────────────
const VIEWS = [
  { id: "cards", label: "1. System Cards" },
  { id: "scale", label: "2. Scale Ladder" },
  { id: "drill", label: "3. Hierarchy Drill" },
];

export default function MeshAConcepts() {
  const [active, setActive] = useState("cards");
  const { data, loading } = useAData();

  const views = { cards: SystemCards, scale: ScaleLadder, drill: HierarchyDrill };
  const Active = views[active];

  return (
    <div style={{ width: "100%", height: "100vh", display: "flex", flexDirection: "column", background: BG }}>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&display=swap" rel="stylesheet" />

      <nav style={{ display: "flex", alignItems: "center", gap: 0, borderBottom: "2px solid #ffffff12", flexShrink: 0, background: "#0a0c10", overflowX: "auto" }}>
        <div style={{ padding: "12px 20px", fontFamily: mono, fontSize: 9, color: "#ffffff33", letterSpacing: 2, flexShrink: 0 }}>
          A CONCEPTS
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
