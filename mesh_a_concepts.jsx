import { useState, useEffect } from "react";
import { LoadingMesh, OverviewDetailExplorer, useMeshTreeData } from "./mesh_overview_concept.jsx";

const mono = "'IBM Plex Mono', monospace";
const BG = "#0f1117";
const TREE_COLOR = "#A8D8A8";

const A_BRANCH_COLORS = {
  A01: "#F4B8A0",
  A02: "#DDB892",
  A03: "#81B29A",
  A04: "#4ECDC4",
  A05: "#A8DADC",
  A06: "#A8C8D8",
  A07: "#E07A5F",
  A08: "#9B72CF",
  A09: "#FF9A9E",
  A10: "#7EC8C8",
  A11: "#C3A8D8",
  A12: "#D8A8B8",
  A13: "#A8D8C0",
  A14: "#F0B8C8",
  A15: "#F4A261",
  A16: "#D8C8A8",
  A17: "#A8D8A8",
};

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

const BODY_REGIONS = [
  { treeNum: "A01", label: "Body Regions", x: 248, y: 122, w: 82, h: 62, color: A_BRANCH_COLORS.A01 },
  { treeNum: "A08", label: "Nervous", x: 248, y: 122, w: 48, h: 52, color: A_BRANCH_COLORS.A08 },
  { treeNum: "A09", label: "Sense Organs", x: 248, y: 150, w: 74, h: 28, color: A_BRANCH_COLORS.A09 },
  { treeNum: "A14", label: "Stomatognathic", x: 248, y: 195, w: 62, h: 34, color: A_BRANCH_COLORS.A14 },
  { treeNum: "A04", label: "Respiratory", x: 218, y: 260, w: 72, h: 78, color: A_BRANCH_COLORS.A04 },
  { treeNum: "A07", label: "Cardiovascular", x: 280, y: 260, w: 64, h: 78, color: A_BRANCH_COLORS.A07 },
  { treeNum: "A15", label: "Hemic / Immune", x: 312, y: 322, w: 46, h: 64, color: A_BRANCH_COLORS.A15 },
  { treeNum: "A03", label: "Digestive", x: 218, y: 346, w: 76, h: 82, color: A_BRANCH_COLORS.A03 },
  { treeNum: "A05", label: "Urogenital", x: 248, y: 430, w: 118, h: 58, color: A_BRANCH_COLORS.A05 },
  { treeNum: "A02", label: "Musculoskeletal", x: 248, y: 530, w: 152, h: 170, color: A_BRANCH_COLORS.A02 },
  { treeNum: "A17", label: "Integumentary", x: 248, y: 352, w: 190, h: 450, color: A_BRANCH_COLORS.A17 },
];

const NON_SPATIAL_ANATOMY = ["A10", "A11", "A12", "A13", "A16"];

function AnatomyBodyMap({ data }) {
  const { branches, childrenMap, countDescendants } = data;
  const [selectedRoot, setSelectedRoot] = useState("A01");
  const [selectedTag, setSelectedTag] = useState(null);
  const [expandedNodes, setExpandedNodes] = useState([]);
  const [hovered, setHovered] = useState(null);

  const byTN = new Map(branches.map(branch => [branch.treeNum, branch]));
  const treeIndex = new Map();
  for (const branch of branches) treeIndex.set(branch.treeNum, { term: branch.term, treeNum: branch.treeNum });
  for (const entries of childrenMap.values()) {
    for (const entry of entries) treeIndex.set(entry.treeNum, entry);
  }

  function getChildren(treeNum) {
    return (childrenMap.get(treeNum) || []).sort((a, b) =>
      a.treeNum.localeCompare(b.treeNum, undefined, { numeric: true })
    );
  }

  function selectRoot(treeNum) {
    setSelectedRoot(treeNum);
    setSelectedTag(null);
    setExpandedNodes([]);
  }

  function isExpanded(treeNum) {
    return expandedNodes.includes(treeNum);
  }

  function toggleExpanded(treeNum) {
    const dot = treeNum.lastIndexOf(".");
    const parentTreeNum = dot === -1 ? treeNum[0] : treeNum.slice(0, dot);
    const siblings = getChildren(parentTreeNum)
      .map(({ treeNum: siblingTreeNum }) => siblingTreeNum)
      .filter(siblingTreeNum => siblingTreeNum !== treeNum);

    setExpandedNodes(nodes => {
      if (nodes.includes(treeNum)) {
        return nodes.filter(n => n !== treeNum && !n.startsWith(treeNum + "."));
      }
      return [
        ...nodes.filter(n =>
          !siblings.some(siblingTreeNum => n === siblingTreeNum || n.startsWith(siblingTreeNum + "."))
        ),
        treeNum,
      ];
    });
  }

  function renderTags(parentTreeNum, color, depth = 0) {
    const children = getChildren(parentTreeNum);
    if (children.length === 0) {
      return <div style={{ fontFamily: mono, fontSize: 8, color: "#ffffff35" }}>No child terms.</div>;
    }

    const openChild = children.find(({ treeNum }) => isExpanded(treeNum));
    return (
      <>
        {children.map(({ term, treeNum }) => {
          const childCount = getChildren(treeNum).length;
          const active = selectedTag === treeNum;
          const open = isExpanded(treeNum);
          return (
            <button
              key={treeNum}
              type="button"
              title={treeNum}
              onClick={(event) => {
                event.stopPropagation();
                setSelectedTag(treeNum);
                if (childCount > 0) toggleExpanded(treeNum);
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                minHeight: 22,
                maxWidth: "100%",
                padding: "4px 8px",
                background: active ? color + "30" : open ? color + "20" : color + "10",
                border: `1px solid ${active || open ? color + "88" : color + "30"}`,
                borderRadius: 999,
                cursor: "pointer",
                fontFamily: mono,
                fontSize: 8,
                color: active ? "#fff" : "#ffffffb8",
                lineHeight: 1.25,
              }}
            >
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{term.name}</span>
              {childCount > 0 && <span style={{ color: color + "88", fontSize: 7 }}>{childCount}</span>}
            </button>
          );
        })}
        {openChild && (
          <div style={{
            flexBasis: "100%",
            marginTop: 4,
            marginLeft: Math.min(10 + depth * 8, 34),
            padding: "4px 0 2px 10px",
            borderLeft: `1px solid ${color + "2c"}`,
            display: "flex",
            flexWrap: "wrap",
            alignItems: "flex-start",
            gap: 4,
          }}>
            {renderTags(openChild.treeNum, color, depth + 1)}
          </div>
        )}
      </>
    );
  }

  const activeTreeNum = selectedTag || selectedRoot;
  const activeEntry = treeIndex.get(activeTreeNum);
  const activeBranch = byTN.get(selectedRoot);
  const activeColor = A_BRANCH_COLORS[selectedRoot] || TREE_COLOR;
  const activeChildren = getChildren(activeTreeNum);

  return (
    <div style={{ height: "100%", overflow: "hidden", display: "grid", gridTemplateColumns: "minmax(360px, 0.9fr) minmax(440px, 1.1fr)", background: BG }}>
      <section style={{ borderRight: "1px solid #ffffff0d", overflowY: "auto", padding: "18px 22px" }}>
        <div style={{ fontFamily: mono, fontSize: 11, color: TREE_COLOR, letterSpacing: 3, marginBottom: 5 }}>BODY MAP</div>
        <div style={{ fontFamily: mono, fontSize: 8, color: "#ffffff38", lineHeight: 1.55, marginBottom: 14 }}>
          Spatial anatomy branches are placed on the figure. Non-spatial branches remain as tags below.
        </div>

        <div style={{ border: "1px solid #ffffff14", borderRadius: 8, background: "linear-gradient(180deg,#ffffff05,transparent)", padding: 10, marginBottom: 12 }}>
          <svg viewBox="0 0 520 700" style={{ display: "block", width: "100%", maxHeight: 590 }}>
            <g opacity="0.9">
              <ellipse cx="248" cy="92" rx="38" ry="48" fill="#ffffff12" stroke="#ffffff2a" />
              <rect x="208" y="142" width="80" height="48" rx="20" fill="#ffffff10" stroke="#ffffff24" />
              <rect x="172" y="190" width="152" height="220" rx="48" fill="#ffffff12" stroke="#ffffff2a" />
              <path d="M172 218 C130 260 128 370 150 452" fill="none" stroke="#ffffff26" strokeWidth="34" strokeLinecap="round" />
              <path d="M324 218 C366 260 368 370 346 452" fill="none" stroke="#ffffff26" strokeWidth="34" strokeLinecap="round" />
              <path d="M214 410 C194 505 190 610 204 676" fill="none" stroke="#ffffff26" strokeWidth="36" strokeLinecap="round" />
              <path d="M282 410 C302 505 306 610 292 676" fill="none" stroke="#ffffff26" strokeWidth="36" strokeLinecap="round" />
            </g>

            {BODY_REGIONS.map(region => {
              const active = selectedRoot === region.treeNum;
              const hot = active || hovered === region.treeNum;
              const branch = byTN.get(region.treeNum);
              const isSkin = region.treeNum === "A17";
              return (
                <g
                  key={region.treeNum}
                  onClick={() => selectRoot(region.treeNum)}
                  onMouseEnter={() => setHovered(region.treeNum)}
                  onMouseLeave={() => setHovered(null)}
                  style={{ cursor: "pointer" }}
                >
                  {isSkin ? (
                    <rect x="150" y="54" width="196" height="628" rx="98" fill="transparent" stroke={hot ? region.color : "#ffffff12"} strokeWidth={active ? 3 : 1.5} strokeDasharray="4 7" />
                  ) : (
                    <rect
                      x={region.x - region.w / 2}
                      y={region.y - region.h / 2}
                      width={region.w}
                      height={region.h}
                      rx="16"
                      fill={hot ? region.color + "30" : region.color + "10"}
                      stroke={hot ? region.color : region.color + "38"}
                      strokeWidth={active ? 2 : 1}
                    />
                  )}
                  <text x={region.x} y={region.y + 3} textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="8" fill={hot ? "#fff" : region.color}>
                    {region.treeNum}
                  </text>
                  {hot && (
                    <text x={region.x} y={region.y + 17} textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="7" fill={region.color}>
                      {branch?.directCount || 0} direct
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {NON_SPATIAL_ANATOMY.map(treeNum => {
            const branch = byTN.get(treeNum);
            const color = A_BRANCH_COLORS[treeNum] || TREE_COLOR;
            const active = selectedRoot === treeNum;
            return (
              <button
                key={treeNum}
                type="button"
                onClick={() => selectRoot(treeNum)}
                style={{ padding: "6px 9px", display: "inline-flex", alignItems: "center", gap: 6, fontFamily: mono, fontSize: 8, background: active ? color + "20" : "#ffffff06", border: `1px solid ${active ? color : "#ffffff0f"}`, borderRadius: 999, color: active ? "#fff" : "#ffffff70", cursor: "pointer" }}
              >
                <span style={{ color }}>{treeNum}</span>
                <span>{branch?.term.name || treeNum}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section style={{ overflowY: "auto", padding: "18px 22px 24px" }}>
        <div style={{ height: 158, minHeight: 158, maxHeight: 158, overflow: "hidden", boxSizing: "border-box", padding: 14, background: "#ffffff06", border: `1px solid ${activeColor}36`, borderRadius: 8, marginBottom: 14, fontFamily: mono }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 14, alignItems: "start" }}>
            <div>
              <div style={{ fontSize: 7, color: activeColor + "aa", letterSpacing: 1.5, marginBottom: 5 }}>SELECTED ANATOMY TERM</div>
              <div style={{ fontSize: 15, color: "#fff", lineHeight: 1.3, fontWeight: 700 }}>{activeEntry?.term.name || activeBranch?.term.name}</div>
              <div style={{ fontSize: 8, color: activeColor, marginTop: 5 }}>{activeTreeNum}</div>
            </div>
            <div style={{ display: "flex", gap: 7, flexShrink: 0 }}>
              {[
                ["children", activeChildren.length],
                ["narrower", countDescendants(activeTreeNum)],
              ].map(([label, value]) => (
                <div key={label} style={{ minWidth: 68, padding: "7px 8px", background: "#00000022", border: "1px solid #ffffff0d", borderRadius: 5, textAlign: "center" }}>
                  <div style={{ fontSize: 12, color: activeColor }}>{value}</div>
                  <div style={{ fontSize: 7, color: "#ffffff33", marginTop: 2 }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
          {(activeEntry?.term.note || activeEntry?.term.scopeNote) && (
            <div style={{ fontSize: 8.4, color: "#ffffff65", lineHeight: 1.55, marginTop: 10, maxHeight: 55, overflowY: "auto" }}>
              {activeEntry.term.note || activeEntry.term.scopeNote}
            </div>
          )}
        </div>

        <div style={{ padding: 12, background: activeColor + "08", border: `1px solid ${activeColor}24`, borderRadius: 8 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 9 }}>
            <div style={{ fontFamily: mono, fontSize: 7, color: activeColor + "aa", letterSpacing: 1.5 }}>EXPLORE {selectedRoot}</div>
            <div style={{ fontFamily: mono, fontSize: 8, color: "#ffffff42" }}>{activeBranch?.term.name}</div>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", gap: 4 }}>
            {renderTags(selectedRoot, activeColor)}
          </div>
        </div>
      </section>
    </div>
  );
}

export default function MeshAConcepts() {
  const [active, setActive] = useState("overview");
  const { data, loading } = useMeshTreeData("A", A_BRANCH_COLORS, TREE_COLOR);
  const views = [
    { id: "overview", label: "Overview + Detail" },
    { id: "body", label: "Body Map" },
  ];

  return (
    <div style={{ width: "100%", height: "100vh", display: "flex", flexDirection: "column", background: BG }}>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&display=swap" rel="stylesheet" />
      <nav style={{ display: "flex", alignItems: "center", gap: 0, borderBottom: "2px solid #ffffff12", flexShrink: 0, background: "#0a0c10", overflowX: "auto" }}>
        <div style={{ padding: "12px 20px", fontFamily: mono, fontSize: 9, color: "#ffffff33", letterSpacing: 2, flexShrink: 0 }}>
          A · ANATOMY
        </div>
        {views.map(view => (
          <button
            key={view.id}
            type="button"
            onClick={() => setActive(view.id)}
            style={{ padding: "12px 18px", fontFamily: mono, fontSize: 10, color: active === view.id ? TREE_COLOR : "#ffffff55", background: "transparent", border: "none", borderBottom: active === view.id ? `2px solid ${TREE_COLOR}` : "2px solid transparent", marginBottom: "-2px", cursor: "pointer", flexShrink: 0 }}
          >
            {view.label}
          </button>
        ))}
      </nav>
      <div style={{ flex: 1, overflow: "hidden" }}>
        {loading ? <LoadingMesh /> : active === "overview" ? (
          <OverviewDetailExplorer
            data={data}
            treeLetter="A"
            navLabel="A · ANATOMY"
            eyebrow="ANATOMY — BODY REGIONS, ORGAN SYSTEMS, TISSUES, CELLS, AND FLUIDS"
            treeColor={TREE_COLOR}
            defaultCluster="A01"
          />
        ) : (
          <AnatomyBodyMap data={data} />
        )}
      </div>
    </div>
  );
}
