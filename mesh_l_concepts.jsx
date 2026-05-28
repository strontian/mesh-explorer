import { useState, useEffect } from "react";
import { OverviewConceptShell } from "./mesh_overview_concept.jsx";

const mono = "'IBM Plex Mono', monospace";
const BG = "#0f1117";
const TREE_COLOR = "#A8C8E8";

// ── DATA HOOK ─────────────────────────────────────────────────────────────
function useLData() {
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

      const raw = (childrenMap.get("L") || []).sort((a, b) =>
        a.treeNum.localeCompare(b.treeNum, undefined, { numeric: true })
      );

      const branches = raw.map(({ term, treeNum }) => ({
        term, treeNum,
        directCount: childrenMap.get(treeNum)?.length ?? 0,
        totalCount: countAll(treeNum),
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

// ── BRANCH COLORS ─────────────────────────────────────────────────────────
const BRANCH_COLORS = [
  "#A8C8E8", "#7EB4DC", "#5AA0D0", "#368CC4", "#1278B8",
  "#C0D8F0", "#90BEE4", "#60A4D8", "#308ACC", "#0070C0",
  "#B4D4EC", "#84BAE0", "#54A0D4", "#2486C8", "#006CBC",
];

const INFO_GROUPS = [
  {
    id: "organize",
    label: "ORGANIZE + RETRIEVE",
    desc: "classification, sources, storage, retrieval, and libraries",
    color: "#A8C8E8",
    branches: ["L01.100", "L01.399", "L01.462", "L01.470", "L01.583"],
  },
  {
    id: "compute",
    label: "COMPUTE + REPRESENT",
    desc: "computing methods, informatics, data science, display, and systems",
    color: "#7EB4DC",
    branches: ["L01.224", "L01.296", "L01.305", "L01.313", "L01.479", "L01.906"],
  },
  {
    id: "communicate",
    label: "COMMUNICATE + PUBLISH",
    desc: "communication, language, copying, publishing, and information theory",
    color: "#C0D8F0",
    branches: ["L01.143", "L01.280", "L01.488", "L01.559", "L01.731", "L01.737"],
  },
];

function infoGroupFor(treeNum) {
  return INFO_GROUPS.find(group => group.branches.some(branch => treeNum === branch || treeNum.startsWith(branch + ".")));
}

function InformationMap({ data }) {
  const { branches, childrenMap } = data;
  const [selectedRoot, setSelectedRoot] = useState("L01.462");
  const [selectedTag, setSelectedTag] = useState(null);
  const [expandedNodes, setExpandedNodes] = useState([]);

  const root = branches[0];
  const treeIndex = new Map();
  if (root) treeIndex.set(root.treeNum, { term: root.term, treeNum: root.treeNum });
  for (const entries of childrenMap.values()) {
    for (const entry of entries) treeIndex.set(entry.treeNum, entry);
  }

  function getChildren(treeNum) {
    return (childrenMap.get(treeNum) || []).sort((a, b) =>
      a.treeNum.localeCompare(b.treeNum, undefined, { numeric: true })
    );
  }

  function countDescendants(treeNum) {
    let n = 0;
    const queue = [...getChildren(treeNum)];
    while (queue.length) {
      const item = queue.shift();
      n += 1;
      queue.push(...getChildren(item.treeNum));
    }
    return n;
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

  function selectRoot(treeNum) {
    setSelectedRoot(treeNum);
    setSelectedTag(null);
    setExpandedNodes([]);
  }

  function renderDetail(color) {
    const activeTreeNum = selectedTag || selectedRoot;
    const entry = treeIndex.get(activeTreeNum);
    if (!entry) return null;
    const childCount = getChildren(activeTreeNum).length;
    const descendants = countDescendants(activeTreeNum);
    return (
      <div style={{ marginBottom: 12, padding: 12, background: "#ffffff06", border: `1px solid ${color}2f`, borderRadius: 8 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: mono, fontSize: 7, color: color + "aa", letterSpacing: 1.5, marginBottom: 3 }}>
              SELECTED TERM
            </div>
            <div style={{ fontFamily: mono, fontSize: 13, color: "#ffffffdd", fontWeight: 700, lineHeight: 1.25 }}>
              {entry.term.name}
            </div>
          </div>
          <div style={{ fontFamily: mono, fontSize: 8, color, whiteSpace: "nowrap" }}>
            {childCount === 0 ? "leaf" : `${childCount} children`}
          </div>
        </div>
        {entry.term.note && (
          <div style={{ fontFamily: mono, fontSize: 9, color: "#ffffff70", lineHeight: 1.55, marginTop: 9, maxWidth: 980 }}>
            {entry.term.note}
          </div>
        )}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10, fontFamily: mono, fontSize: 7.5, color: "#ffffff42" }}>
          <span>{entry.term.ui}</span>
          {descendants > 0 && <span>{descendants.toLocaleString()} narrower terms</span>}
        </div>
      </div>
    );
  }

  function renderTags(parentTreeNum, color, depth = 0) {
    const children = getChildren(parentTreeNum);
    if (children.length === 0) {
      return <div style={{ fontFamily: mono, fontSize: 8, color: "#ffffff35" }}>No child terms.</div>;
    }

    return children.map(({ term, treeNum }) => {
      const childCount = getChildren(treeNum).length;
      const open = isExpanded(treeNum);
      const active = selectedTag === treeNum;
      return (
        <div key={treeNum} style={{ display: "contents" }}>
          <button
            type="button"
            title={treeNum}
            onClick={(event) => {
              event.stopPropagation();
              setSelectedTag(active ? null : treeNum);
              if (childCount > 0) toggleExpanded(treeNum);
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              minHeight: 22,
              width: "fit-content",
              maxWidth: "100%",
              padding: "4px 8px",
              background: active ? color + "30" : open ? color + "22" : color + "11",
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
            {childCount > 0 && <span style={{ color: color + "77", fontSize: 7 }}>{childCount}</span>}
          </button>
          {open && (
            <div style={{
              flexBasis: "100%",
              marginTop: 3,
              marginLeft: Math.min(10 + depth * 8, 34),
              padding: "4px 0 2px 10px",
              borderLeft: `1px solid ${color}28`,
              display: "flex",
              flexWrap: "wrap",
              alignItems: "flex-start",
              gap: 4,
            }}>
              {renderTags(treeNum, color, depth + 1)}
            </div>
          )}
        </div>
      );
    });
  }

  const selectedGroup = infoGroupFor(selectedRoot) || INFO_GROUPS[0];
  const allCategories = getChildren("L01");

  return (
    <div style={{ height: "100%", overflowY: "auto", padding: 24 }}>
      <div style={{ fontFamily: mono, fontSize: 8, color: "#ffffff33", letterSpacing: 2, marginBottom: 16 }}>
        INFORMATION — ORGANIZING, COMPUTING, RETRIEVING, AND COMMUNICATING KNOWLEDGE
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12, marginBottom: 16 }}>
        {INFO_GROUPS.map(group => (
          <div key={group.id} style={{ minWidth: 0 }}>
            <div style={{ fontFamily: mono, fontSize: 8, color: group.color, letterSpacing: 1.6, marginBottom: 4 }}>
              {group.label}
            </div>
            <div style={{ fontFamily: mono, fontSize: 7.5, color: "#ffffff3f", lineHeight: 1.45, minHeight: 32, marginBottom: 7 }}>
              {group.desc}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {group.branches.map(treeNum => {
                const entry = allCategories.find(item => item.treeNum === treeNum);
                if (!entry) return null;
                const active = selectedRoot === treeNum;
                const direct = getChildren(treeNum).length;
                const total = countDescendants(treeNum);
                return (
                  <button
                    key={treeNum}
                    type="button"
                    onClick={() => selectRoot(treeNum)}
                    style={{
                      textAlign: "left",
                      minHeight: 58,
                      padding: "9px 10px",
                      background: active ? group.color + "20" : group.color + "0d",
                      border: `1px solid ${active ? group.color + "88" : group.color + "2e"}`,
                      borderRadius: 7,
                      cursor: "pointer",
                      fontFamily: mono,
                    }}
                  >
                    <div style={{ fontSize: 10, color: active ? "#fff" : group.color, fontWeight: 700, lineHeight: 1.25 }}>
                      {entry.term.name}
                    </div>
                    <div style={{ fontSize: 7.5, color: "#ffffff45", marginTop: 6 }}>
                      {direct} direct · {total.toLocaleString()} total
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div style={{
        padding: 12,
        background: selectedGroup.color + "08",
        border: `1px solid ${selectedGroup.color + "24"}`,
        borderRadius: 8,
      }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 10 }}>
          <div style={{ fontFamily: mono, fontSize: 7, color: selectedGroup.color + "aa", letterSpacing: 1.5 }}>
            EXPLORE {selectedRoot}
          </div>
          <div style={{ fontFamily: mono, fontSize: 8, color: "#ffffff42" }}>
            {treeIndex.get(selectedRoot)?.term.name}
          </div>
        </div>
        {renderDetail(selectedGroup.color)}
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", gap: 4 }}>
          {renderTags(selectedRoot, selectedGroup.color)}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SKETCH 1 — INFORMATION ECOSYSTEM
// Cards for L01's direct children in a grid, with connector accent lines
// ═══════════════════════════════════════════════════════════════════════════
function InfoEcosystem({ data }) {
  const { branches, childrenMap } = data;
  const [selected, setSelected] = useState(null);

  // For each top-level L branch, get its direct children
  const cards = branches.map((b, bi) => {
    const children = (childrenMap.get(b.treeNum) || [])
      .sort((a, b2) => a.treeNum.localeCompare(b2.treeNum, undefined, { numeric: true }))
      .slice(0, 5);
    return { ...b, children, color: BRANCH_COLORS[bi % BRANCH_COLORS.length] };
  });

  const selCard = selected ? cards.find(c => c.treeNum === selected) : null;

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", overflowY: "auto" }}>
      {/* Header accent line */}
      <div style={{
        height: 3, background: `linear-gradient(90deg, ${TREE_COLOR}00, ${TREE_COLOR}, ${TREE_COLOR}00)`,
        flexShrink: 0,
      }} />

      <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20, flex: 1 }}>
        <div style={{ fontFamily: mono, fontSize: 9, color: "#ffffff22", letterSpacing: 2 }}>
          L · INFORMATION SCIENCE — ECOSYSTEM MAP
        </div>

        {/* Cards grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 14,
        }}>
          {cards.map(card => {
            const isSel = selected === card.treeNum;
            return (
              <div
                key={card.treeNum}
                onClick={() => setSelected(isSel ? null : card.treeNum)}
                style={{
                  background: isSel ? card.color + "18" : "#ffffff07",
                  border: `1px solid ${isSel ? card.color + "88" : "#ffffff14"}`,
                  borderRadius: 10,
                  padding: "16px 18px",
                  cursor: "pointer",
                  transition: "all 0.15s",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {/* Color accent bar */}
                <div style={{
                  position: "absolute", top: 0, left: 0, right: 0, height: 2,
                  background: `linear-gradient(90deg, ${card.color}88, ${card.color}00)`,
                }} />

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div>
                    <div style={{ fontFamily: mono, fontSize: 8, color: card.color + "99", marginBottom: 4 }}>
                      {card.treeNum}
                    </div>
                    <div style={{ fontFamily: mono, fontSize: 11, color: card.color, fontWeight: 600, lineHeight: 1.3 }}>
                      {card.term.name}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 10 }}>
                    <div style={{ fontFamily: mono, fontSize: 14, color: card.color }}>{card.totalCount}</div>
                    <div style={{ fontFamily: mono, fontSize: 7, color: "#ffffff22" }}>terms</div>
                  </div>
                </div>

                {/* Top 5 children chips */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
                  {card.children.map(({ term: ct, treeNum: ctn }) => (
                    <div key={ctn} style={{
                      padding: "2px 7px",
                      background: card.color + "14",
                      border: `1px solid ${card.color}33`,
                      borderRadius: 12,
                      fontFamily: mono, fontSize: 7.5, color: card.color + "cc",
                    }}>
                      {ct.name}
                    </div>
                  ))}
                  {card.directCount > 5 && (
                    <div style={{
                      padding: "2px 7px",
                      background: "#ffffff08",
                      border: "1px solid #ffffff15",
                      borderRadius: 12,
                      fontFamily: mono, fontSize: 7.5, color: "#ffffff33",
                    }}>
                      +{card.directCount - 5} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Detail panel for selected card */}
        {selCard && (
          <div style={{
            background: selCard.color + "0c",
            border: `1px solid ${selCard.color}44`,
            borderRadius: 10,
            padding: 18,
          }}>
            <div style={{ fontFamily: mono, fontSize: 11, color: selCard.color, fontWeight: 600, marginBottom: 8 }}>
              {selCard.term.name}
            </div>
            {selCard.term.note && (
              <div style={{ fontFamily: mono, fontSize: 8.5, color: "#ffffff55", lineHeight: 1.7, marginBottom: 12 }}>
                {selCard.term.note}
              </div>
            )}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {(childrenMap.get(selCard.treeNum) || [])
                .sort((a, b) => a.treeNum.localeCompare(b.treeNum, undefined, { numeric: true }))
                .map(({ term: ct, treeNum: ctn }) => (
                  <div key={ctn} style={{
                    padding: "3px 9px",
                    background: selCard.color + "14",
                    border: `1px solid ${selCard.color}33`,
                    borderRadius: 14,
                    fontFamily: mono, fontSize: 8.5, color: selCard.color + "cc",
                  }}>
                    {ct.name}
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SKETCH 2 — TERM BROWSER (two-panel: tree left, detail right)
// ═══════════════════════════════════════════════════════════════════════════
function TermBrowser({ data }) {
  const { branches, childrenMap } = data;
  const [expanded, setExpanded] = useState(new Set());
  const [selected, setSelected] = useState(null);

  function toggleExpand(tn) {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(tn)) next.delete(tn);
      else next.add(tn);
      return next;
    });
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

  function renderNode(term, treeNum, depth) {
    const children = (childrenMap.get(treeNum) || []).sort((a, b) =>
      a.treeNum.localeCompare(b.treeNum, undefined, { numeric: true })
    );
    const hasChildren = children.length > 0;
    const isExp = expanded.has(treeNum);
    const isSel = selected?.treeNum === treeNum;
    const colorIdx = branches.findIndex(b => b.treeNum === treeNum || treeNum.startsWith(b.treeNum + "."));
    const color = BRANCH_COLORS[Math.max(0, colorIdx) % BRANCH_COLORS.length];

    return (
      <div key={treeNum}>
        <div
          onClick={() => {
            setSelected({ term, treeNum });
            if (hasChildren) toggleExpand(treeNum);
          }}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: `4px ${4 + depth * 16}px 4px ${8 + depth * 16}px`,
            cursor: "pointer",
            background: isSel ? color + "18" : "transparent",
            borderRadius: 4,
            transition: "background 0.1s",
          }}
        >
          <span style={{
            fontFamily: mono, fontSize: 8.5,
            color: hasChildren ? (isExp ? color : color + "99") : "#ffffff22",
            width: 10, flexShrink: 0,
          }}>
            {hasChildren ? (isExp ? "▾" : "▸") : "·"}
          </span>
          <span style={{ fontFamily: mono, fontSize: 8.5 + (depth === 0 ? 1.5 : 0), color: isSel ? color : color + "bb", flex: 1, lineHeight: 1.4 }}>
            {term.name}
          </span>
          {hasChildren && (
            <span style={{ fontFamily: mono, fontSize: 7, color: "#ffffff22" }}>
              {countAll(treeNum)}
            </span>
          )}
        </div>
        {isExp && depth < 2 && children.map(({ term: ct, treeNum: ctn }) =>
          renderNode(ct, ctn, depth + 1)
        )}
      </div>
    );
  }

  const selChildren = selected ? (childrenMap.get(selected.treeNum) || [])
    .sort((a, b) => a.treeNum.localeCompare(b.treeNum, undefined, { numeric: true })) : [];
  const colorIdx = selected ? branches.findIndex(b => b.treeNum === selected.treeNum || selected.treeNum.startsWith(b.treeNum + ".")) : 0;
  const selColor = BRANCH_COLORS[Math.max(0, colorIdx) % BRANCH_COLORS.length];

  return (
    <div style={{ height: "100%", display: "flex" }}>
      {/* Left: tree */}
      <div style={{
        width: 320, flexShrink: 0, borderRight: "1px solid #ffffff0e",
        overflowY: "auto", padding: "16px 8px",
      }}>
        <div style={{ fontFamily: mono, fontSize: 8, color: "#ffffff22", letterSpacing: 2, padding: "0 8px 12px" }}>
          L · TREE BROWSER
        </div>
        {branches.map(({ term, treeNum }) => renderNode(term, treeNum, 0))}
      </div>

      {/* Right: detail */}
      <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
        {selected ? (
          <div>
            <div style={{ fontFamily: mono, fontSize: 8, color: selColor + "88", marginBottom: 6 }}>
              {selected.treeNum}
            </div>
            <div style={{ fontFamily: mono, fontSize: 16, color: selColor, fontWeight: 700, marginBottom: 12, lineHeight: 1.3 }}>
              {selected.term.name}
            </div>
            {selected.term.note && (
              <div style={{
                fontFamily: mono, fontSize: 9, color: "#ffffff55", lineHeight: 1.8,
                marginBottom: 20, padding: "12px 16px",
                background: "#ffffff06", borderRadius: 8,
                border: `1px solid ${selColor}22`,
              }}>
                {selected.term.note}
              </div>
            )}
            {selChildren.length > 0 && (
              <>
                <div style={{ fontFamily: mono, fontSize: 8, color: "#ffffff22", letterSpacing: 1, marginBottom: 10 }}>
                  CHILDREN ({selChildren.length})
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {selChildren.map(({ term: ct, treeNum: ctn }) => {
                    const grandCount = childrenMap.get(ctn)?.length ?? 0;
                    return (
                      <div
                        key={ctn}
                        onClick={() => setSelected({ term: ct, treeNum: ctn })}
                        style={{
                          display: "flex", alignItems: "center", gap: 10,
                          padding: "7px 12px",
                          background: "#ffffff06", border: `1px solid ${selColor}22`,
                          borderRadius: 6, cursor: "pointer",
                          transition: "background 0.1s",
                        }}
                      >
                        <div style={{ fontFamily: mono, fontSize: 7.5, color: "#ffffff33", width: 80 }}>{ctn}</div>
                        <div style={{ fontFamily: mono, fontSize: 9.5, color: selColor + "cc", flex: 1 }}>{ct.name}</div>
                        {grandCount > 0 && (
                          <div style={{ fontFamily: mono, fontSize: 7.5, color: "#ffffff33" }}>+{grandCount}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        ) : (
          <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ fontFamily: mono, fontSize: 10, color: "#ffffff22", textAlign: "center", lineHeight: 2 }}>
              select a term in the tree<br />
              <span style={{ color: "#ffffff11" }}>to see details</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MeshLConcepts() {
  return (
    <OverviewConceptShell
      treeLetter="L"
      navLabel="L · INFORMATION"
      eyebrow="INFORMATION — ORGANIZING, COMPUTING, RETRIEVING, AND COMMUNICATING KNOWLEDGE"
      treeColor={TREE_COLOR}
      branchColors={{ L01: TREE_COLOR }}
      defaultCluster="L01.462"
    />
  );
}
