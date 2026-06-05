import { useState, useEffect } from "react";
import {
  FloatingMeshDetailPanel,
  FloatingMeshQueryPanel,
  usePersistentMeshQueries,
} from "./mesh_query_ui.jsx";
import { MeshPageHeader } from "./mesh_page_header.jsx";

const mono = "'IBM Plex Mono', monospace";
const BG = "#0f1117";
const TREE_COLOR = "#E8D58A";

// ── SCALE GROUPS ──────────────────────────────────────────────────────────
// Manual grouping of G branches by scale of observation
const SCALE_GROUPS = [
  {
    id: "physics",
    label: "PHYSICS / MATH",
    sublabel: "abstract & physical",
    branches: ["G01", "G17"],
    color: "#7EC8E3",   // cool blue
    gradient: "#5B9BD5",
  },
  {
    id: "chemistry",
    label: "CHEMISTRY",
    sublabel: "molecular",
    branches: ["G02", "G03"],
    color: "#81D4A4",   // teal-green
    gradient: "#6BC49A",
  },
  {
    id: "cell",
    label: "CELL",
    sublabel: "cellular",
    branches: ["G04", "G05", "G06"],
    color: "#B5C99A",   // light green
    gradient: "#A0C080",
  },
  {
    id: "system",
    label: "ORGAN SYSTEM",
    sublabel: "systems",
    branches: ["G09", "G10", "G11", "G12", "G13", "G14", "G15"],
    color: "#F4C17A",   // warm yellow-orange
    gradient: "#E8B060",
  },
  {
    id: "organism",
    label: "ORGANISM",
    sublabel: "whole organism",
    branches: ["G07", "G16"],
    color: "#E8A598",   // warm salmon
    gradient: "#D8907A",
  },
];

function scaleGroupFor(treeNum) {
  return SCALE_GROUPS.find(g => g.branches.includes(treeNum));
}

// ── DATA HOOK ─────────────────────────────────────────────────────────────
function useGData() {
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

      const raw = (childrenMap.get("G") || []).sort((a, b) =>
        a.treeNum.localeCompare(b.treeNum, undefined, { numeric: true })
      );

      const branches = raw.map(({ term, treeNum }) => ({
        term, treeNum,
        directCount: childrenMap.get(treeNum)?.length ?? 0,
        totalCount:  countAll(treeNum),
        scaleGroup:  scaleGroupFor(treeNum),
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
// SKETCH 1 — SCALE OF OBSERVATION
// Vertical ladder showing phenomena at different scales.
// Left: scale level labels. Right: branch chips at their level.
// Color from cool (physics) to warm (biological).
// ═══════════════════════════════════════════════════════════════════════════
function ScaleOfObservation({ data }) {
  const [selected, setSelected] = useState(null);
  const [selectedTag, setSelectedTag] = useState(null);
  const [expandedNodes, setExpandedNodes] = useState([]);
  const { branches, childrenMap } = data;
  const queryBuilder = usePersistentMeshQueries();

  const treeIndex = new Map();
  for (const b of branches) treeIndex.set(b.treeNum, { term: b.term, treeNum: b.treeNum });
  for (const entries of childrenMap.values()) {
    for (const entry of entries) treeIndex.set(entry.treeNum, entry);
  }

  function getChildren(treeNum) {
    return (childrenMap.get(treeNum) || []).sort((a, b) =>
      a.treeNum.localeCompare(b.treeNum, undefined, { numeric: true })
    );
  }

  function isExpanded(treeNum) {
    return expandedNodes.includes(treeNum);
  }

  function toggleExpanded(treeNum) {
    const dot = treeNum.lastIndexOf(".");
    const parentTreeNum = dot === -1 ? treeNum[0] : treeNum.slice(0, dot);
    const siblingTreeNums = getChildren(parentTreeNum)
      .map(({ treeNum: siblingTreeNum }) => siblingTreeNum)
      .filter(siblingTreeNum => siblingTreeNum !== treeNum);

    setExpandedNodes(nodes => {
      if (nodes.includes(treeNum)) {
        return nodes.filter(n => n !== treeNum && !n.startsWith(treeNum + "."));
      }

      return [
        ...nodes.filter(n =>
          !siblingTreeNums.some(siblingTreeNum =>
            n === siblingTreeNum || n.startsWith(siblingTreeNum + ".")
          )
        ),
        treeNum,
      ];
    });
  }

  function renderChildTags(treeNum, color, depth = 0) {
    const children = getChildren(treeNum);
    if (children.length === 0) {
      return (
        <div style={{ fontFamily: mono, fontSize: 8, color: "#ffffff30", padding: "7px 10px" }}>
          No child terms.
        </div>
      );
    }

    const openChild = children.find(({ treeNum: childTreeNum }) => isExpanded(childTreeNum));

    return (
      <>
        {children.map(({ term, treeNum: childTreeNum }) => {
          const childTerms = getChildren(childTreeNum);
          const hasChildren = childTerms.length > 0;
          const open = isExpanded(childTreeNum);
          const active = selectedTag === childTreeNum;
          const collected = queryBuilder.allIds.has(term.name);
          return (
            <button
              key={childTreeNum}
              type="button"
              title={childTreeNum}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedTag(active ? null : childTreeNum);
                if (hasChildren) toggleExpanded(childTreeNum);
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                minHeight: 22,
                width: "fit-content",
                maxWidth: "100%",
                padding: "4px 8px",
                marginTop: 5,
                background: active ? color + "30" : open ? color + "22" : collected ? color + "1d" : color + "11",
                border: `1px solid ${active || open ? color + "88" : collected ? color + "66" : color + "30"}`,
                borderRadius: 999,
                cursor: "pointer",
              }}
            >
              <div style={{ fontFamily: mono, fontSize: 8, color: active ? "#fff" : collected ? color : "#ffffffb8", lineHeight: 1.25, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{term.name}</div>
              {hasChildren && (
                <div style={{ fontFamily: mono, fontSize: 7, color: color + "77" }}>
                  {childTerms.length}
                </div>
              )}
            </button>
          );
        })}
        {openChild && (
          <div style={{
            flexBasis: "100%",
            marginTop: 3,
            marginLeft: Math.min(10 + depth * 8, 34),
            padding: "4px 0 2px 10px",
            borderLeft: `1px solid ${color + "28"}`,
            display: "flex",
            flexWrap: "wrap",
            alignItems: "flex-start",
            gap: 4,
          }}>
            {renderChildTags(openChild.treeNum, color, depth + 1)}
          </div>
        )}
      </>
    );
  }

  function renderSelectedDetail(color) {
    const activeTreeNum = selectedTag || selected;
    const detailBox = {
      boxSizing: "border-box",
      height: 158,
      minHeight: 158,
      maxHeight: 158,
      flexShrink: 0,
      marginBottom: 16,
      padding: 12,
      background: "#ffffff06",
      border: `1px solid ${color + "28"}`,
      borderRadius: 8,
      overflow: "hidden",
    };

    if (!activeTreeNum) {
      return (
        <div style={detailBox}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: mono, fontSize: 7, color: color + "aa", letterSpacing: 1.5, marginBottom: 3 }}>
                TREE G OVERVIEW
              </div>
              <div style={{ fontFamily: mono, fontSize: 13, color: "#ffffffdd", fontWeight: 700, lineHeight: 1.25 }}>
                Phenomena and Processes
              </div>
            </div>
            <div style={{ fontFamily: mono, fontSize: 8, color, whiteSpace: "nowrap" }}>
              {branches.length} top branches
            </div>
          </div>
          <div style={{ fontFamily: mono, fontSize: 9, color: "#ffffff70", lineHeight: 1.55, marginTop: 9 }}>
            Top-level G branches are arranged here by scale of observation, from physical and chemical phenomena through cellular, organ-system, and whole-organism processes.
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 10 }}>
            {SCALE_GROUPS.map(group => (
              <span key={group.id} style={{ fontFamily: mono, fontSize: 7.5, color: group.color, background: group.color + "12", border: `1px solid ${group.color + "30"}`, borderRadius: 999, padding: "3px 7px" }}>
                {group.label}
              </span>
            ))}
          </div>
        </div>
      );
    }

    const entry = treeIndex.get(activeTreeNum);
    if (!entry) return null;
    const { term } = entry;
    const childCount = getChildren(activeTreeNum).length;
    const gPlacements = (term.treeNums || []).filter(tn => tn.startsWith("G"));

    return (
      <div style={detailBox}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: mono, fontSize: 7, color: color + "aa", letterSpacing: 1.5, marginBottom: 3 }}>
              SELECTED TERM
            </div>
            <div style={{ fontFamily: mono, fontSize: 13, color: "#ffffffdd", fontWeight: 700, lineHeight: 1.25 }}>
              {term.name}
            </div>
          </div>
          <div style={{ fontFamily: mono, fontSize: 8, color: color, whiteSpace: "nowrap" }}>
            {childCount === 0 ? "leaf" : `${childCount} children`}
          </div>
        </div>

        {term.note && (
          <div style={{ fontFamily: mono, fontSize: 9, color: "#ffffff70", lineHeight: 1.55, marginTop: 9, maxWidth: 980, maxHeight: 58, overflowY: "auto" }}>
            {term.note}
          </div>
        )}

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10, fontFamily: mono, fontSize: 7.5, color: "#ffffff42" }}>
          <span>{term.ui}</span>
          <span>{activeTreeNum}</span>
          {gPlacements.length > 1 && <span>{gPlacements.length} G placements</span>}
        </div>
      </div>
    );
  }

  // Uncategorized branches (safety net)
  const ungrouped = branches.filter(b => !scaleGroupFor(b.treeNum));
  const activeGroup = selected ? scaleGroupFor(selected) : null;
  const detailColor = activeGroup?.color || TREE_COLOR;
  const activeTreeNum = selectedTag || selected;
  const activeEntry = activeTreeNum ? treeIndex.get(activeTreeNum) : null;
  const selectedDetail = activeEntry ? {
    id: activeEntry.term.name,
    branch: "g",
    color: detailColor,
    treeNum: activeTreeNum,
    ui: activeEntry.term.ui,
    note: activeEntry.term.note || activeEntry.term.scopeNote,
  } : null;

  return (
    <div style={{ height: "100%", overflow: "hidden" }}>
      <div style={{ height: "100%", padding: "24px 24px 230px", boxSizing: "border-box", overflowY: "auto", display: "flex", flexDirection: "column", gap: 0 }}>
        <div style={{ fontFamily: mono, fontSize: 8, color: "#ffffff33", letterSpacing: 2, marginBottom: 16 }}>
          SCALE OF OBSERVATION — from abstract/physical to whole organism
        </div>
        {renderSelectedDetail(detailColor)}

        {SCALE_GROUPS.map((group, gi) => {
          const groupBranches = branches.filter(b => group.branches.includes(b.treeNum));
          const isLast = gi === SCALE_GROUPS.length - 1;
          return (
            <div key={group.id} style={{ display: "flex", gap: 0, position: "relative" }}>
              {/* Vertical connector line */}
              {!isLast && (
                <div style={{ position: "absolute", left: 139, top: "100%", width: 2, height: 16, background: group.color + "33", zIndex: 1 }} />
              )}
              {/* Scale label */}
              <div style={{
                width: 140,
                flexShrink: 0,
                padding: "16px 16px 16px 0",
                borderRight: `3px solid ${group.color}`,
                marginBottom: 16,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
              }}>
                <div style={{ fontFamily: mono, fontSize: 9, color: group.color, fontWeight: 700, letterSpacing: 2, textAlign: "right" }}>{group.label}</div>
                <div style={{ fontFamily: mono, fontSize: 7.5, color: group.color + "77", textAlign: "right", marginTop: 2 }}>{group.sublabel}</div>
              </div>
              {/* Branch chips */}
              <div style={{ flex: 1, padding: "16px 0 16px 16px", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginBottom: 0 }}>
                {groupBranches.map(b => {
                  const isSel = selected === b.treeNum;
                  const collected = queryBuilder.allIds.has(b.term.name);
                  return (
                    <button
                      key={b.treeNum}
                      type="button"
                      onClick={() => {
                        setSelected(isSel ? null : b.treeNum);
                        setSelectedTag(null);
                        setExpandedNodes([]);
                      }}
                      style={{
                        fontFamily: mono,
                        fontSize: 9.5,
                        color: isSel ? "#fff" : collected ? group.color : group.color,
                        background: isSel ? group.color + "28" : collected ? group.color + "1d" : group.color + "12",
                        border: `1px solid ${isSel ? group.color : collected ? group.color + "66" : group.color + "44"}`,
                        borderRadius: 6,
                        padding: "7px 12px",
                        cursor: "pointer",
                        transition: "background 0.15s, border-color 0.15s, color 0.15s",
                      }}
                    >
                      <span style={{ fontSize: 7, opacity: 0.6, marginRight: 5 }}>{b.treeNum}</span>
                      {b.term.name}
                      <span style={{ fontSize: 7.5, marginLeft: 8, opacity: 0.55 }}>{b.totalCount.toLocaleString()}</span>
                    </button>
                  );
                })}
                {groupBranches.length === 0 && (
                  <div style={{ fontFamily: mono, fontSize: 8, color: "#ffffff22" }}>—</div>
                )}
                {groupBranches.some(b => b.treeNum === selected) && (
                  <div
                    style={{
                      flexBasis: "100%",
                      marginTop: 8,
                      padding: 12,
                      background: group.color + "08",
                      border: `1px solid ${group.color + "24"}`,
                      borderRadius: 8,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 8 }}>
                      <div style={{ fontFamily: mono, fontSize: 7, color: group.color + "aa", letterSpacing: 1.5 }}>
                        EXPANDED TERMS
                      </div>
                      <div style={{ fontFamily: mono, fontSize: 8, color: "#ffffff42" }}>
                        {selected}
                      </div>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", gap: 3 }}>
                      {renderChildTags(selected, group.color)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {ungrouped.length > 0 && (
          <div style={{ marginTop: 16, padding: "12px 0", borderTop: "1px solid #ffffff08" }}>
            <div style={{ fontFamily: mono, fontSize: 7, color: "#ffffff22", letterSpacing: 2, marginBottom: 8 }}>UNCATEGORIZED</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {ungrouped.map(b => (
                <div key={b.treeNum} style={{ fontFamily: mono, fontSize: 9, color: "#ffffff44", background: "#ffffff06", border: "1px solid #ffffff0a", borderRadius: 6, padding: "5px 10px" }}>
                  {b.treeNum} · {b.term.name}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <FloatingMeshDetailPanel selected={selectedDetail} query={queryBuilder} />
      <FloatingMeshQueryPanel query={queryBuilder} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SKETCH 2 — BRANCH SIZE BARS
// Horizontal sorted bar chart of all G branches by totalCount.
// Toggle between totalCount and directCount. Click bar to see top 8 children.
// ═══════════════════════════════════════════════════════════════════════════
function BranchSizeBars({ data }) {
  const [metric, setMetric] = useState("total");
  const [selected, setSelected] = useState(null);
  const { branches, childrenMap } = data;

  const getValue = b => metric === "total" ? b.totalCount : b.directCount;
  const sorted = [...branches].sort((a, b) => getValue(b) - getValue(a));
  const max = sorted.length > 0 ? getValue(sorted[0]) : 1;

  const selBranch = selected ? branches.find(b => b.treeNum === selected) : null;
  const top8 = selected
    ? (childrenMap.get(selected) || [])
        .map(({ term, treeNum }) => ({ term, treeNum, count: childrenMap.get(treeNum)?.length ?? 0 }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8)
    : [];

  return (
    <div style={{ height: "100%", display: "flex", overflow: "hidden" }}>
      {/* Bar chart */}
      <div style={{ flex: 1, padding: 24, overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
          <div style={{ fontFamily: mono, fontSize: 8, color: "#ffffff33", letterSpacing: 2 }}>SORT BY</div>
          {[
            { id: "total", label: "Total Terms" },
            { id: "direct", label: "Direct Children" },
          ].map(m => (
            <button
              key={m.id}
              onClick={() => setMetric(m.id)}
              style={{
                fontFamily: mono, fontSize: 9, padding: "5px 12px",
                background: metric === m.id ? TREE_COLOR + "20" : "#ffffff06",
                border: `1px solid ${metric === m.id ? TREE_COLOR : "#ffffff12"}`,
                borderRadius: 5, color: metric === m.id ? TREE_COLOR : "#ffffff55",
                cursor: "pointer", transition: "all 0.15s",
              }}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {sorted.map(b => {
            const val = getValue(b);
            const pct = max > 0 ? (val / max) * 100 : 0;
            const isSel = selected === b.treeNum;
            const sg = scaleGroupFor(b.treeNum);
            const color = sg ? sg.color : TREE_COLOR;
            return (
              <div
                key={b.treeNum}
                onClick={() => setSelected(isSel ? null : b.treeNum)}
                style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", padding: "3px 0" }}
              >
                <div style={{ fontFamily: mono, fontSize: 7.5, color: color + "99", width: 32, textAlign: "right", flexShrink: 0 }}>{b.treeNum}</div>
                <div style={{ flex: 1, position: "relative", height: 22, background: "#ffffff06", borderRadius: 4, overflow: "hidden", border: isSel ? `1px solid ${color}` : "1px solid transparent" }}>
                  <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${pct}%`, background: isSel ? color + "55" : color + "30", borderRadius: 4, transition: "width 0.3s, background 0.15s" }} />
                  <div style={{ position: "absolute", left: 8, top: 0, height: "100%", display: "flex", alignItems: "center", fontFamily: mono, fontSize: 9, color: isSel ? "#fff" : "#ffffffaa", zIndex: 1, whiteSpace: "nowrap" }}>
                    {b.term.name}
                  </div>
                </div>
                <div style={{ fontFamily: mono, fontSize: 9, color: color, width: 56, textAlign: "right", flexShrink: 0 }}>{val.toLocaleString()}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detail panel */}
      <div style={{ width: 300, borderLeft: "1px solid #ffffff0a", padding: 20, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
        {!selBranch ? (
          <div style={{ fontFamily: mono, fontSize: 9, color: "#ffffff22", marginTop: 40, textAlign: "center", lineHeight: 2 }}>
            Click a bar<br/>to see top children
          </div>
        ) : (
          <>
            <div style={{ fontFamily: mono, fontSize: 8, color: "#ffffff33", letterSpacing: 2 }}>{selBranch.treeNum}</div>
            <div style={{ fontFamily: mono, fontSize: 12, color: "#ffffffcc", fontWeight: 600, marginBottom: 4 }}>{selBranch.term.name}</div>
            {selBranch.term.scopeNote && (
              <div style={{ fontFamily: mono, fontSize: 8.5, color: "#ffffff55", lineHeight: 1.7, fontStyle: "italic", marginBottom: 8 }}>
                {selBranch.term.scopeNote.slice(0, 200)}{selBranch.term.scopeNote.length > 200 ? "…" : ""}
              </div>
            )}
            <div style={{ display: "flex", gap: 20, marginBottom: 12 }}>
              <div>
                <div style={{ fontFamily: mono, fontSize: 18, color: TREE_COLOR, fontWeight: 700 }}>{selBranch.totalCount.toLocaleString()}</div>
                <div style={{ fontFamily: mono, fontSize: 6.5, color: "#ffffff33", letterSpacing: 1 }}>TOTAL TERMS</div>
              </div>
              <div>
                <div style={{ fontFamily: mono, fontSize: 18, color: "#ffffff55", fontWeight: 700 }}>{selBranch.directCount}</div>
                <div style={{ fontFamily: mono, fontSize: 6.5, color: "#ffffff33", letterSpacing: 1 }}>DIRECT CHILDREN</div>
              </div>
            </div>
            <div style={{ fontFamily: mono, fontSize: 7.5, color: "#ffffff33", letterSpacing: 1, marginBottom: 6 }}>TOP 8 CHILDREN</div>
            {top8.map(({ term, treeNum, count }) => (
              <div key={treeNum} style={{ padding: "6px 10px", background: "#ffffff06", border: "1px solid #ffffff0a", borderRadius: 5, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontFamily: mono, fontSize: 6.5, color: TREE_COLOR + "77", letterSpacing: 1, marginBottom: 1 }}>{treeNum}</div>
                  <div style={{ fontFamily: mono, fontSize: 9.5, color: "#ffffffaa" }}>{term.name}</div>
                </div>
                <div style={{ fontFamily: mono, fontSize: 9, color: "#ffffff44", flexShrink: 0, marginLeft: 8 }}>{count}</div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SKETCH 3 — PROCESS FLOW
// G03 Metabolism + G04 Cell + G05 Genetic as overlapping circles (Venn-style).
// Key sub-terms shown inside each circle. Rest of G as supporting cards below.
// ═══════════════════════════════════════════════════════════════════════════
const PROCESS_CIRCLES = [
  { treeNum: "G03", label: "Metabolism",    color: "#81D4A4", cx: 220, cy: 130, r: 110 },
  { treeNum: "G04", label: "Cell Physiol.", color: "#7EC8E3", cx: 360, cy: 130, r: 110 },
  { treeNum: "G05", label: "Genetic",       color: "#C9B1FF", cx: 290, cy: 240, r: 110 },
];

function ProcessFlow({ data }) {
  const [hovered, setHovered] = useState(null);
  const { branches, childrenMap } = data;

  const mainTNs = new Set(PROCESS_CIRCLES.map(p => p.treeNum));
  const otherBranches = branches.filter(b => !mainTNs.has(b.treeNum));

  function getCircleBranch(treeNum) {
    return branches.find(b => b.treeNum === treeNum);
  }
  function getChildren(treeNum) {
    return (childrenMap.get(treeNum) || []).slice(0, 5);
  }

  const hovCircle = hovered ? PROCESS_CIRCLES.find(p => p.treeNum === hovered) : null;
  const hovBranch = hovered ? getCircleBranch(hovered) : null;

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "16px 24px 12px", borderBottom: "1px solid #ffffff0a", flexShrink: 0 }}>
        <div style={{ fontFamily: mono, fontSize: 8, color: "#ffffff33", letterSpacing: 2 }}>G PROCESS FLOW</div>
        <div style={{ fontFamily: mono, fontSize: 11, color: "#ffffffaa", marginTop: 2 }}>
          How biological processes nest and connect: Metabolism · Cell · Genetics
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Venn diagram */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 0" }}>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <svg width={580} height={380} style={{ overflow: "visible" }}>
              {/* Circle fills */}
              {PROCESS_CIRCLES.map(p => {
                const b = getCircleBranch(p.treeNum);
                const isHov = hovered === p.treeNum;
                return (
                  <g key={p.treeNum}>
                    <circle
                      cx={p.cx} cy={p.cy} r={p.r}
                      fill={isHov ? p.color + "28" : p.color + "10"}
                      stroke={p.color}
                      strokeWidth={isHov ? 2 : 1}
                      style={{ transition: "all 0.2s", cursor: "pointer" }}
                      onMouseEnter={() => setHovered(p.treeNum)}
                      onMouseLeave={() => setHovered(null)}
                    />
                    {/* Circle label */}
                    <text
                      x={p.cx}
                      y={p.cy - p.r + 22}
                      textAnchor="middle"
                      style={{ fontFamily: mono, fontSize: 9, fill: p.color, fontWeight: 600, pointerEvents: "none" }}
                    >
                      {p.treeNum}
                    </text>
                    <text
                      x={p.cx}
                      y={p.cy - p.r + 35}
                      textAnchor="middle"
                      style={{ fontFamily: mono, fontSize: 8, fill: p.color + "cc", pointerEvents: "none" }}
                    >
                      {p.label}
                    </text>
                    {/* Count badge */}
                    <text
                      x={p.cx}
                      y={p.cy - p.r + 50}
                      textAnchor="middle"
                      style={{ fontFamily: mono, fontSize: 7, fill: p.color + "88", pointerEvents: "none" }}
                    >
                      {b ? b.totalCount.toLocaleString() + " terms" : ""}
                    </text>
                    {/* Sub-terms inside circle */}
                    {getChildren(p.treeNum).map(({ term, treeNum: ctn }, i) => (
                      <text
                        key={ctn}
                        x={p.cx}
                        y={p.cy + (i - 2) * 16}
                        textAnchor="middle"
                        style={{ fontFamily: mono, fontSize: 7.5, fill: p.color + "bb", pointerEvents: "none" }}
                      >
                        {term.name.length > 28 ? term.name.slice(0, 28) + "…" : term.name}
                      </text>
                    ))}
                  </g>
                );
              })}
              {/* Center overlap label */}
              <text x={290} y={180} textAnchor="middle" style={{ fontFamily: mono, fontSize: 7, fill: "#ffffff22", pointerEvents: "none" }}>
                biological
              </text>
              <text x={290} y={192} textAnchor="middle" style={{ fontFamily: mono, fontSize: 7, fill: "#ffffff22", pointerEvents: "none" }}>
                processes
              </text>
            </svg>
          </div>

          {/* Hover tooltip */}
          <div style={{ margin: "0 24px 16px", padding: "12px 16px", background: "#ffffff06", border: `1px solid ${hovCircle ? hovCircle.color + "44" : "#ffffff0a"}`, borderRadius: 8, transition: "all 0.15s", minHeight: 60 }}>
            {hovBranch && hovCircle ? (
              <>
                <div style={{ fontFamily: mono, fontSize: 8, color: hovCircle.color + "88", letterSpacing: 2, marginBottom: 4 }}>{hovBranch.treeNum}</div>
                <div style={{ fontFamily: mono, fontSize: 11, color: "#ffffffcc", fontWeight: 600 }}>{hovBranch.term.name}</div>
                {hovBranch.term.scopeNote && (
                  <div style={{ fontFamily: mono, fontSize: 9, color: "#ffffff66", marginTop: 6, lineHeight: 1.6, fontStyle: "italic" }}>
                    {hovBranch.term.scopeNote.slice(0, 240)}{hovBranch.term.scopeNote.length > 240 ? "…" : ""}
                  </div>
                )}
                <div style={{ fontFamily: mono, fontSize: 7.5, color: "#ffffff33", marginTop: 6, letterSpacing: 1 }}>
                  {hovBranch.totalCount.toLocaleString()} total terms · {hovBranch.directCount} direct children
                </div>
              </>
            ) : (
              <div style={{ fontFamily: mono, fontSize: 8, color: "#ffffff22" }}>Hover a circle to see details</div>
            )}
          </div>

          {/* Supporting cards */}
          <div style={{ padding: "0 24px 24px" }}>
            <div style={{ fontFamily: mono, fontSize: 8, color: "#ffffff33", letterSpacing: 2, marginBottom: 12 }}>REST OF TREE G</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8 }}>
              {otherBranches.map(b => {
                const sg = scaleGroupFor(b.treeNum);
                const color = sg ? sg.color : TREE_COLOR;
                return (
                  <div key={b.treeNum} style={{ padding: "10px 14px", background: "#ffffff06", border: "1px solid #ffffff0a", borderRadius: 7 }}>
                    <div style={{ fontFamily: mono, fontSize: 7, color: color + "88", letterSpacing: 2, marginBottom: 3 }}>{b.treeNum}</div>
                    <div style={{ fontFamily: mono, fontSize: 10, color: "#ffffffaa", fontWeight: 600, lineHeight: 1.3 }}>{b.term.name}</div>
                    <div style={{ fontFamily: mono, fontSize: 7.5, color: "#ffffff44", marginTop: 4 }}>{b.totalCount.toLocaleString()} terms</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── APP ────────────────────────────────────────────────────────────────────
const VIEWS = [
  { id: "scale",   label: "1. Scale of Observation" },
  { id: "bars",    label: "2. Branch Size Bars" },
  { id: "process", label: "3. Process Flow" },
];

export default function MeshGConcepts() {
  const { data, loading } = useGData();

  return (
    <div style={{ width: "100%", height: "100vh", display: "flex", flexDirection: "column", background: BG }}>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&display=swap" rel="stylesheet" />

      <MeshPageHeader
        letter="G"
        title="Phenomena"
        description="A scale-of-observation tree spanning abstract physical phenomena, molecular and cellular processes, organ systems, and whole-organism phenomena."
        color={TREE_COLOR}
      />

      <div style={{ flex: 1, overflow: "hidden" }}>
        {loading ? <Loading /> : <ScaleOfObservation data={data} />}
      </div>
    </div>
  );
}
