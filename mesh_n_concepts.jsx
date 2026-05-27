import { useState, useEffect } from "react";

const mono = "'IBM Plex Mono', monospace";
const BG = "#0f1117";
const TREE_COLOR = "#90D0B8";

// ── DATA HOOK ─────────────────────────────────────────────────────────────
function useNData() {
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

      const raw = (childrenMap.get("N") || []).sort((a, b) =>
        a.treeNum.localeCompare(b.treeNum, undefined, { numeric: true })
      );

      const branches = raw.map(({ term, treeNum }) => ({
        term,
        treeNum,
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

const HEALTH_GROUPS = [
  { id: "people", label: "PEOPLE + PUBLIC HEALTH", desc: "who care serves, plus environmental and population health", color: "#8FD0B8", branches: ["N01", "N06"] },
  { id: "delivery", label: "CARE DELIVERY", desc: "where services happen and how they are administered", color: "#72C2B0", branches: ["N02", "N04"] },
  { id: "systems", label: "SYSTEM PERFORMANCE", desc: "organizations, economics, access, quality, and evaluation", color: "#B7E3C6", branches: ["N03", "N05"] },
];

function healthGroupFor(treeNum) {
  return HEALTH_GROUPS.find(group => group.branches.some(branch => treeNum === branch || treeNum.startsWith(branch + ".")));
}

function HealthCareMap({ data }) {
  const { branches, childrenMap } = data;
  const [selectedRoot, setSelectedRoot] = useState("N02");
  const [selectedTag, setSelectedTag] = useState(null);
  const [expandedNodes, setExpandedNodes] = useState([]);

  const byTN = Object.fromEntries(branches.map(branch => [branch.treeNum, branch]));
  const treeIndex = new Map();
  for (const branch of branches) treeIndex.set(branch.treeNum, { term: branch.term, treeNum: branch.treeNum });
  for (const entries of childrenMap.values()) {
    for (const entry of entries) treeIndex.set(entry.treeNum, entry);
  }

  const total = branches.reduce((sum, branch) => sum + branch.totalCount, 0);

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
    const kids = getChildren(parentTreeNum);
    if (kids.length === 0) {
      return <div style={{ fontFamily: mono, fontSize: 8, color: "#ffffff35" }}>No child terms.</div>;
    }

    return kids.map(({ term, treeNum }) => {
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

  const selectedGroup = healthGroupFor(selectedRoot) || HEALTH_GROUPS[0];
  const selectedBranch = byTN[selectedRoot];

  return (
    <div style={{ height: "100%", overflowY: "auto", padding: 24 }}>
      <div style={{ fontFamily: mono, fontSize: 8, color: "#ffffff33", letterSpacing: 2, marginBottom: 16 }}>
        HEALTH CARE — PEOPLE, DELIVERY, ORGANIZATIONS, QUALITY, AND PUBLIC HEALTH
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12, marginBottom: 16 }}>
        {HEALTH_GROUPS.map(group => (
          <div key={group.id} style={{ minWidth: 0 }}>
            <div style={{ fontFamily: mono, fontSize: 8, color: group.color, letterSpacing: 1.6, marginBottom: 4 }}>
              {group.label}
            </div>
            <div style={{ fontFamily: mono, fontSize: 7.5, color: "#ffffff3f", lineHeight: 1.45, minHeight: 22, marginBottom: 7 }}>
              {group.desc}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {group.branches.map(treeNum => {
                const branch = byTN[treeNum];
                if (!branch) return null;
                const active = selectedRoot === treeNum;
                const pct = total > 0 ? Math.round((branch.totalCount / total) * 100) : 0;
                return (
                  <button
                    key={treeNum}
                    type="button"
                    onClick={() => selectRoot(treeNum)}
                    style={{
                      textAlign: "left",
                      minHeight: 66,
                      padding: "9px 10px",
                      background: active ? group.color + "20" : group.color + "0d",
                      border: `1px solid ${active ? group.color + "88" : group.color + "2e"}`,
                      borderRadius: 7,
                      cursor: "pointer",
                      fontFamily: mono,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
                      <span style={{ fontSize: 8, color: group.color + "aa" }}>{treeNum}</span>
                      <span style={{ fontSize: 7.5, color: "#ffffff42" }}>{pct}%</span>
                    </div>
                    <div style={{ fontSize: 10, color: active ? "#fff" : group.color, fontWeight: 700, lineHeight: 1.25, marginTop: 3 }}>
                      {branch.term.name}
                    </div>
                    <div style={{ fontSize: 7.5, color: "#ffffff45", marginTop: 6 }}>
                      {branch.directCount} direct · {branch.totalCount.toLocaleString()} total
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {selectedBranch && (
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
              {selectedBranch.term.name}
            </div>
          </div>
          {renderDetail(selectedGroup.color)}
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", gap: 4 }}>
            {renderTags(selectedRoot, selectedGroup.color)}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SKETCH 1 — SYSTEM LAYERS
// Layered cake / stacked diagram from bottom (population) to top (evaluation).
// ═══════════════════════════════════════════════════════════════════════════
const LAYER_CFG = [
  { treeNum: "N01", shortLabel: "POPULATION",   accent: "#7FC4A8", role: "who gets care" },
  { treeNum: "N02", shortLabel: "FACILITIES",   accent: "#5BB8A4", role: "where care happens" },
  { treeNum: "N03", shortLabel: "ECONOMICS",    accent: "#90D0B8", role: "how it's funded" },
  { treeNum: "N04", shortLabel: "ADMINISTRATION", accent: "#A8DFC8", role: "how it's managed" },
  { treeNum: "N05", shortLabel: "QUALITY",      accent: "#C0EDD8", role: "how it's evaluated" },
];

function SystemLayers({ data }) {
  const [hovered, setHovered] = useState(null);
  const { branches, childrenMap } = data;

  const byTN = Object.fromEntries(branches.map(b => [b.treeNum, b]));
  const total = branches.reduce((s, b) => s + b.totalCount, 0);

  // Build layer data bottom-to-top (reverse order for render)
  const layers = LAYER_CFG.map(cfg => {
    const branch = byTN[cfg.treeNum];
    if (!branch) return null;
    const kids = (childrenMap.get(cfg.treeNum) || [])
      .sort((a, b) => a.treeNum.localeCompare(b.treeNum, undefined, { numeric: true }))
      .slice(0, 6);
    return { ...cfg, branch, kids };
  }).filter(Boolean);

  // Reverse so N01 is at the bottom visually
  const bottomToTop = [...layers].reverse();

  const containerH = 520;
  const totalWeight = layers.reduce((s, l) => s + l.branch.totalCount, 0);

  let yOffset = 0;
  const layerRects = bottomToTop.map(l => {
    const pct = l.branch.totalCount / totalWeight;
    const h = Math.max(72, Math.round(pct * containerH));
    const rect = { ...l, y: yOffset, h };
    yOffset += h;
    return rect;
  });
  // Reverse again so we render top-to-bottom (N05 at top of DOM = bottom visually)
  const topToBottom = [...layerRects].reverse();

  return (
    <div style={{ background: BG, height: "100%", display: "flex", overflow: "hidden" }}>
      {/* Vertical spine label */}
      <div style={{
        width: 28,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRight: "1px solid #ffffff08",
      }}>
        <div style={{
          fontFamily: mono,
          fontSize: 7,
          color: TREE_COLOR + "88",
          letterSpacing: 3,
          transform: "rotate(-90deg)",
          whiteSpace: "nowrap",
          userSelect: "none",
        }}>
          POPULATION → SYSTEM → EVALUATION
        </div>
      </div>

      {/* Main layers column */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "16px 20px 16px 12px", gap: 0, overflowY: "auto" }}>
        <div style={{ fontFamily: mono, fontSize: 9, color: "#ffffff22", letterSpacing: 3, marginBottom: 16 }}>
          N · HEALTH CARE SYSTEM LAYERS · {total.toLocaleString()} TERMS
        </div>

        {topToBottom.map((l, i) => {
          const isHov = hovered === l.treeNum;
          return (
            <div
              key={l.treeNum}
              onMouseEnter={() => setHovered(l.treeNum)}
              onMouseLeave={() => setHovered(null)}
              style={{
                minHeight: l.h,
                background: isHov ? l.accent + "22" : l.accent + "0e",
                borderTop: `2px solid ${l.accent}${isHov ? "cc" : "44"}`,
                borderLeft: `3px solid ${l.accent}${isHov ? "ff" : "66"}`,
                borderRight: "1px solid #ffffff08",
                borderBottom: "1px solid #ffffff06",
                padding: "10px 14px",
                display: "flex",
                flexDirection: "column",
                gap: 6,
                transition: "all 0.15s",
                position: "relative",
                cursor: "default",
              }}
            >
              {/* Layer header */}
              <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                <span style={{ fontFamily: mono, fontSize: 8, color: l.accent + "88", letterSpacing: 1 }}>
                  {l.treeNum}
                </span>
                <span style={{ fontFamily: mono, fontSize: 12, fontWeight: 700, color: l.accent, letterSpacing: 1 }}>
                  {l.shortLabel}
                </span>
                <span style={{ fontFamily: mono, fontSize: 8, color: "#ffffff44", fontStyle: "italic" }}>
                  {l.role}
                </span>
                <span style={{ marginLeft: "auto", fontFamily: mono, fontSize: 9, color: l.accent + "cc" }}>
                  {l.branch.totalCount.toLocaleString()} terms
                </span>
                <span style={{ fontFamily: mono, fontSize: 7.5, color: "#ffffff33" }}>
                  {Math.round((l.branch.totalCount / total) * 100)}%
                </span>
              </div>

              {/* Branch full name */}
              <div style={{ fontFamily: mono, fontSize: 8.5, color: "#ffffff66", lineHeight: 1.4 }}>
                {l.branch.term.name}
              </div>

              {/* Progress bar */}
              <div style={{ height: 3, background: "#ffffff08", borderRadius: 2 }}>
                <div style={{
                  height: "100%",
                  width: `${(l.branch.totalCount / total) * 100}%`,
                  background: l.accent + "bb",
                  borderRadius: 2,
                  transition: "width 0.3s",
                }} />
              </div>

              {/* Top-6 children chips */}
              {l.kids.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 2 }}>
                  {l.kids.map(kid => (
                    <span key={kid.treeNum} style={{
                      fontFamily: mono,
                      fontSize: 7.5,
                      color: l.accent + "cc",
                      background: l.accent + "18",
                      border: `1px solid ${l.accent}33`,
                      borderRadius: 3,
                      padding: "2px 6px",
                    }}>
                      {kid.term.name}
                    </span>
                  ))}
                  {l.branch.directCount > 6 && (
                    <span style={{
                      fontFamily: mono,
                      fontSize: 7.5,
                      color: "#ffffff33",
                      background: "#ffffff08",
                      border: "1px solid #ffffff11",
                      borderRadius: 3,
                      padding: "2px 6px",
                    }}>
                      +{l.branch.directCount - 6} more
                    </span>
                  )}
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
// SKETCH 2 — BRANCH CARDS
// 5 cards in a 2-2-1 grid. Each shows name, treeNum, counts, scope note,
// and expandable direct children list.
// ═══════════════════════════════════════════════════════════════════════════
function BranchCards({ data }) {
  const [expanded, setExpanded] = useState(null);
  const { branches, childrenMap } = data;
  const total = branches.reduce((s, b) => s + b.totalCount, 0);

  return (
    <div style={{ background: BG, height: "100%", overflowY: "auto" }}>
      <div style={{ padding: "20px 24px" }}>
        <div style={{ fontFamily: mono, fontSize: 9, color: "#ffffff22", letterSpacing: 3, marginBottom: 20 }}>
          N · HEALTH CARE — BRANCH OVERVIEW · {total.toLocaleString()} TERMS
        </div>

        {/* 2-2-1 grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {branches.map((b, idx) => {
            const isExp = expanded === b.treeNum;
            const kids = (childrenMap.get(b.treeNum) || []).sort((a, c) =>
              a.treeNum.localeCompare(c.treeNum, undefined, { numeric: true })
            );
            const scopeNote = b.term.scopeNote || "";
            const preview = scopeNote.slice(0, 180) + (scopeNote.length > 180 ? "…" : "");
            const pct = Math.round((b.totalCount / total) * 100);

            // Last card (idx=4) spans both columns
            const isLast = idx === branches.length - 1 && branches.length % 2 === 1;

            return (
              <div
                key={b.treeNum}
                onClick={() => setExpanded(isExp ? null : b.treeNum)}
                style={{
                  gridColumn: isLast ? "1 / -1" : undefined,
                  background: isExp ? TREE_COLOR + "18" : "#ffffff07",
                  border: `1px solid ${isExp ? TREE_COLOR + "66" : "#ffffff11"}`,
                  borderRadius: 8,
                  padding: "14px 16px",
                  cursor: "pointer",
                  transition: "all 0.15s",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                {/* Card header */}
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <div style={{
                    fontFamily: mono, fontSize: 8, color: TREE_COLOR + "99",
                    background: TREE_COLOR + "1a",
                    border: `1px solid ${TREE_COLOR}33`,
                    borderRadius: 3, padding: "2px 6px", flexShrink: 0,
                  }}>
                    {b.treeNum}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: mono, fontSize: 11, fontWeight: 700, color: TREE_COLOR, lineHeight: 1.3 }}>
                      {b.term.name}
                    </div>
                  </div>
                  <div style={{ fontFamily: mono, fontSize: 8, color: "#ffffff33", flexShrink: 0 }}>
                    {isExp ? "▲" : "▼"}
                  </div>
                </div>

                {/* Stats row */}
                <div style={{ display: "flex", gap: 16 }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontFamily: mono, fontSize: 16, fontWeight: 700, color: TREE_COLOR }}>
                      {b.totalCount.toLocaleString()}
                    </div>
                    <div style={{ fontFamily: mono, fontSize: 7, color: "#ffffff33", letterSpacing: 1 }}>DESCENDANTS</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontFamily: mono, fontSize: 16, fontWeight: 700, color: TREE_COLOR + "bb" }}>
                      {b.directCount}
                    </div>
                    <div style={{ fontFamily: mono, fontSize: 7, color: "#ffffff33", letterSpacing: 1 }}>DIRECT CHILDREN</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontFamily: mono, fontSize: 16, fontWeight: 700, color: TREE_COLOR + "88" }}>
                      {pct}%
                    </div>
                    <div style={{ fontFamily: mono, fontSize: 7, color: "#ffffff33", letterSpacing: 1 }}>OF TREE N</div>
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{ height: 2, background: "#ffffff08", borderRadius: 2 }}>
                  <div style={{
                    height: "100%", width: `${pct}%`,
                    background: TREE_COLOR + "aa",
                    borderRadius: 2,
                  }} />
                </div>

                {/* Scope note preview */}
                {preview && (
                  <div style={{ fontFamily: mono, fontSize: 8, color: "#ffffff55", lineHeight: 1.6 }}>
                    {preview}
                  </div>
                )}

                {/* Expanded: all direct children */}
                {isExp && (
                  <div style={{ borderTop: "1px solid #ffffff11", paddingTop: 10, display: "flex", flexDirection: "column", gap: 4 }}>
                    <div style={{ fontFamily: mono, fontSize: 7.5, color: "#ffffff33", letterSpacing: 2, marginBottom: 4 }}>
                      DIRECT CHILDREN ({kids.length})
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                      {kids.map(kid => {
                        // Count descendants of this child
                        const kidKids = (childrenMap.get(kid.treeNum) || []).length;
                        return (
                          <span key={kid.treeNum} style={{
                            fontFamily: mono,
                            fontSize: 8,
                            color: TREE_COLOR + "cc",
                            background: TREE_COLOR + "12",
                            border: `1px solid ${TREE_COLOR}2a`,
                            borderRadius: 4,
                            padding: "3px 7px",
                            display: "flex",
                            alignItems: "center",
                            gap: 5,
                          }}>
                            <span style={{ color: "#ffffff33", fontSize: 7 }}>{kid.treeNum}</span>
                            {kid.term.name}
                            {kidKids > 0 && (
                              <span style={{ color: TREE_COLOR + "66", fontSize: 7 }}>·{kidKids}</span>
                            )}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SKETCH 3 — N01 POPULATION BREAKDOWN
// Focus on N01 Population Characteristics — editorial grouping of N01 children
// into DEMOGRAPHIC, SOCIAL, VULNERABLE GROUPS, and GEOGRAPHIC clusters.
// ═══════════════════════════════════════════════════════════════════════════

// Editorial keyword-based grouping for N01 sub-branches
const POP_GROUPS = [
  {
    id: "demographic",
    label: "DEMOGRAPHIC",
    color: "#90D0B8",
    desc: "Age, sex, and biological characteristics",
    keywords: ["age", "sex", "female", "male", "child", "infant", "adult", "aged", "elderly", "adolescent", "newborn", "pediatric", "geriatric"],
  },
  {
    id: "social",
    label: "SOCIAL",
    color: "#70B8A0",
    desc: "Occupation, family, and socioeconomic status",
    keywords: ["occupation", "family", "socioeconomic", "employment", "labor", "workforce", "profession", "household", "marital", "education", "income"],
  },
  {
    id: "vulnerable",
    label: "VULNERABLE GROUPS",
    color: "#F4A47A",
    desc: "Populations with heightened health risk or need",
    keywords: ["vulnerable", "minority", "homeless", "prisoner", "refugee", "immigrant", "disability", "disabled", "poor", "marginalized", "underserved", "uninsured"],
  },
  {
    id: "geographic",
    label: "GEOGRAPHIC",
    color: "#A8DFC8",
    desc: "Location-based population characteristics",
    keywords: ["rural", "urban", "geographic", "region", "population density", "metropolitan", "international", "global", "community", "country"],
  },
];

function classifyN01Child(termName) {
  const lower = termName.toLowerCase();
  for (const g of POP_GROUPS) {
    if (g.keywords.some(kw => lower.includes(kw))) return g.id;
  }
  return "other";
}

function PopBreakdown({ data }) {
  const [activeGroup, setActiveGroup] = useState(null);
  const { branches, childrenMap } = data;

  const n01 = branches.find(b => b.treeNum === "N01");
  if (!n01) return (
    <div style={{ background: BG, height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontFamily: mono, fontSize: 10, color: "#ffffff33" }}>N01 not found</div>
    </div>
  );

  const directKids = (childrenMap.get("N01") || []).sort((a, b) =>
    a.treeNum.localeCompare(b.treeNum, undefined, { numeric: true })
  );

  // BFS descendant count for any node
  function countDesc(treeNum) {
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

  // Classify each direct child
  const classified = directKids.map(kid => ({
    ...kid,
    groupId: classifyN01Child(kid.term.name),
    totalCount: countDesc(kid.treeNum),
    directCount: (childrenMap.get(kid.treeNum) || []).length,
  }));

  // Build group buckets
  const groupMap = {};
  for (const g of POP_GROUPS) {
    groupMap[g.id] = { ...g, items: [] };
  }
  groupMap["other"] = { id: "other", label: "OTHER", color: "#ffffff44", desc: "Uncategorized population terms", items: [] };

  for (const item of classified) {
    groupMap[item.groupId].items.push(item);
  }

  const allGroups = [...POP_GROUPS.map(g => groupMap[g.id]), groupMap["other"]].filter(g => g.items.length > 0);

  const activeGrp = activeGroup ? allGroups.find(g => g.id === activeGroup) : null;
  const displayItems = activeGrp ? activeGrp.items : classified;

  return (
    <div style={{ background: BG, height: "100%", overflowY: "auto" }}>
      <div style={{ padding: "20px 24px" }}>
        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontFamily: mono, fontSize: 9, color: "#ffffff22", letterSpacing: 3 }}>
            N01 · POPULATION CHARACTERISTICS
          </div>
          <div style={{ fontFamily: mono, fontSize: 18, fontWeight: 700, color: TREE_COLOR, marginTop: 4, lineHeight: 1.2 }}>
            {n01.term.name}
          </div>
          <div style={{ fontFamily: mono, fontSize: 8.5, color: "#ffffff44", marginTop: 6, lineHeight: 1.6, maxWidth: 680 }}>
            {n01.term.scopeNote
              ? n01.term.scopeNote.slice(0, 220) + (n01.term.scopeNote.length > 220 ? "…" : "")
              : "The demographic lens of health care research — who receives care and what characterizes them."}
          </div>
          <div style={{ display: "flex", gap: 20, marginTop: 10 }}>
            <div>
              <span style={{ fontFamily: mono, fontSize: 18, fontWeight: 700, color: TREE_COLOR }}>{n01.totalCount.toLocaleString()}</span>
              <span style={{ fontFamily: mono, fontSize: 8, color: "#ffffff33", marginLeft: 6, letterSpacing: 1 }}>TOTAL DESCENDANTS</span>
            </div>
            <div>
              <span style={{ fontFamily: mono, fontSize: 18, fontWeight: 700, color: TREE_COLOR + "aa" }}>{n01.directCount}</span>
              <span style={{ fontFamily: mono, fontSize: 8, color: "#ffffff33", marginLeft: 6, letterSpacing: 1 }}>DIRECT CHILDREN</span>
            </div>
          </div>
        </div>

        {/* Group filter tabs */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 18 }}>
          <button
            onClick={() => setActiveGroup(null)}
            style={{
              fontFamily: mono, fontSize: 8, letterSpacing: 1,
              padding: "5px 10px",
              background: !activeGroup ? TREE_COLOR + "22" : "#ffffff08",
              border: `1px solid ${!activeGroup ? TREE_COLOR + "66" : "#ffffff11"}`,
              borderRadius: 4, cursor: "pointer",
              color: !activeGroup ? TREE_COLOR : "#ffffff44",
              transition: "all 0.12s",
            }}
          >
            ALL ({classified.length})
          </button>
          {allGroups.map(g => (
            <button
              key={g.id}
              onClick={() => setActiveGroup(activeGroup === g.id ? null : g.id)}
              style={{
                fontFamily: mono, fontSize: 8, letterSpacing: 1,
                padding: "5px 10px",
                background: activeGroup === g.id ? g.color + "22" : "#ffffff08",
                border: `1px solid ${activeGroup === g.id ? g.color + "66" : "#ffffff11"}`,
                borderRadius: 4, cursor: "pointer",
                color: activeGroup === g.id ? g.color : "#ffffff44",
                transition: "all 0.12s",
              }}
            >
              {g.label} ({g.items.length})
            </button>
          ))}
        </div>

        {/* Editorial group cards */}
        {!activeGroup && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
            {allGroups.map(g => {
              const groupTotal = g.items.reduce((s, i) => s + i.totalCount, 0);
              return (
                <div
                  key={g.id}
                  onClick={() => setActiveGroup(g.id)}
                  style={{
                    background: g.color + "10",
                    border: `1px solid ${g.color}33`,
                    borderRadius: 7,
                    padding: "10px 14px",
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                    <span style={{ fontFamily: mono, fontSize: 10, fontWeight: 700, color: g.color }}>{g.label}</span>
                    <span style={{ marginLeft: "auto", fontFamily: mono, fontSize: 8, color: g.color + "88" }}>
                      {g.items.length} branches · {groupTotal.toLocaleString()} terms
                    </span>
                  </div>
                  <div style={{ fontFamily: mono, fontSize: 7.5, color: "#ffffff44", marginBottom: 7 }}>{g.desc}</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {g.items.slice(0, 4).map(item => (
                      <span key={item.treeNum} style={{
                        fontFamily: mono, fontSize: 7.5,
                        color: g.color + "cc",
                        background: g.color + "15",
                        border: `1px solid ${g.color}25`,
                        borderRadius: 3, padding: "2px 5px",
                      }}>
                        {item.term.name}
                      </span>
                    ))}
                    {g.items.length > 4 && (
                      <span style={{ fontFamily: mono, fontSize: 7.5, color: "#ffffff33", padding: "2px 4px" }}>
                        +{g.items.length - 4} more
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Tag cloud / chip list */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontFamily: mono, fontSize: 7.5, color: "#ffffff22", letterSpacing: 2, marginBottom: 10 }}>
            {activeGroup ? `${activeGrp.label} — BRANCHES` : "ALL N01 BRANCHES"} · chip size ∝ descendant count
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "flex-end" }}>
            {displayItems.map(item => {
              const grp = allGroups.find(g => g.id === item.groupId) || { color: "#ffffff44" };
              // Scale font 8–15px based on totalCount
              const maxC = Math.max(...displayItems.map(d => d.totalCount), 1);
              const scale = 8 + Math.round((item.totalCount / maxC) * 9);
              return (
                <span key={item.treeNum} style={{
                  fontFamily: mono,
                  fontSize: scale,
                  color: grp.color,
                  background: grp.color + "14",
                  border: `1px solid ${grp.color}30`,
                  borderRadius: 5,
                  padding: "4px 9px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  lineHeight: 1.3,
                  transition: "all 0.12s",
                }}>
                  {item.term.name}
                  <span style={{ fontSize: Math.max(7, scale - 3), color: grp.color + "66" }}>
                    {item.totalCount > 0 ? item.totalCount.toLocaleString() : "·"}
                  </span>
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MeshNConcepts() {
  const { data, loading } = useNData();

  return (
    <div style={{ width: "100%", height: "100vh", display: "flex", flexDirection: "column", background: BG }}>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&display=swap" rel="stylesheet" />

      <nav style={{ display: "flex", alignItems: "center", gap: 0, borderBottom: "2px solid #ffffff12", flexShrink: 0, background: "#0a0c10", overflowX: "auto" }}>
        <div style={{ padding: "12px 20px", fontFamily: mono, fontSize: 9, color: "#ffffff33", letterSpacing: 2, flexShrink: 0 }}>
          N · HEALTH CARE
        </div>
        <div style={{ padding: "12px 18px", fontFamily: mono, fontSize: 10, color: TREE_COLOR, borderBottom: `2px solid ${TREE_COLOR}`, marginBottom: "-2px", flexShrink: 0 }}>
          Health Care Map
        </div>
      </nav>

      <div style={{ flex: 1, overflow: "hidden" }}>
        {loading ? <Loading /> : <HealthCareMap data={data} />}
      </div>
    </div>
  );
}
