import { useState, useEffect } from "react";
import { OverviewConceptShell } from "./mesh_overview_concept.jsx";

const mono = "'IBM Plex Mono', monospace";
const BG = "#0f1117";
const TREE_COLOR = "#F0B8C8";

// ── DATA HOOK ─────────────────────────────────────────────────────────────
function useKData() {
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

      const raw = (childrenMap.get("K") || []).sort((a, b) =>
        a.treeNum.localeCompare(b.treeNum, undefined, { numeric: true })
      );

      const branches = raw.map(({ term, treeNum }) => ({
        term, treeNum,
        directCount: childrenMap.get(treeNum)?.length ?? 0,
        totalCount: countAll(treeNum),
      }));

      // Collect all K terms (top 2 levels) for tag cloud
      const allTerms = [];
      const kRoot = childrenMap.get("K") || [];
      for (const { term, treeNum } of kRoot) {
        const depth = treeNum.split(".").length;
        if (depth <= 2) {
          allTerms.push({ term, treeNum, depth });
          const children = childrenMap.get(treeNum) || [];
          for (const { term: ct, treeNum: ctn } of children) {
            const cdepth = ctn.split(".").length;
            if (cdepth <= 2) allTerms.push({ term: ct, treeNum: ctn, depth: cdepth });
          }
        }
      }

      setState({ data: { branches, childrenMap, allTerms }, loading: false });
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
  "#F0B8C8", "#E8A0B4", "#D488A0", "#C8708C", "#BC5878",
  "#F4C8D8", "#E8B8CC", "#DCA8C0", "#D098B4", "#C488A8",
];
function branchColor(treeNum, branches) {
  const idx = branches.findIndex(b => b.treeNum === treeNum || treeNum.startsWith(b.treeNum + "."));
  return BRANCH_COLORS[idx % BRANCH_COLORS.length] ?? TREE_COLOR;
}

function HumanitiesTree({ data }) {
  const { childrenMap } = data;
  const [selectedCategory, setSelectedCategory] = useState("K01.752");
  const [selectedTag, setSelectedTag] = useState(null);
  const [expandedNodes, setExpandedNodes] = useState([]);

  const treeIndex = new Map();
  for (const entries of childrenMap.values()) {
    for (const entry of entries) treeIndex.set(entry.treeNum, entry);
  }

  function getChildren(treeNum) {
    return (childrenMap.get(treeNum) || []).sort((a, b) =>
      a.treeNum.localeCompare(b.treeNum, undefined, { numeric: true })
    );
  }

  function countAll(treeNum) {
    let n = 0;
    const q = [treeNum];
    while (q.length) {
      const kids = getChildren(q.shift());
      n += kids.length;
      for (const kid of kids) q.push(kid.treeNum);
    }
    return n;
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

  const categories = getChildren("K01");
  const activeEntry = selectedTag ? treeIndex.get(selectedTag) : selectedCategory ? treeIndex.get(selectedCategory) : null;
  const activeChildren = activeEntry ? getChildren(activeEntry.treeNum) : [];
  const activeColor = activeEntry ? branchColor(activeEntry.treeNum, categories.map(c => ({ treeNum: c.treeNum }))) : TREE_COLOR;

  function renderDetail(color) {
    if (!activeEntry) {
      return (
        <div style={{ fontFamily: mono, fontSize: 8, color: "#ffffff30", padding: "8px 10px", border: "1px dashed #ffffff12", borderRadius: 6 }}>
          Select a category or tag to see details.
        </div>
      );
    }

    return (
      <div style={{ marginBottom: 12, padding: 12, background: "#ffffff06", border: `1px solid ${color + "2f"}`, borderRadius: 8 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: mono, fontSize: 7, color: color + "aa", letterSpacing: 1.5, marginBottom: 3 }}>
              SELECTED TERM
            </div>
            <div style={{ fontFamily: mono, fontSize: 13, color: "#ffffffdd", fontWeight: 700, lineHeight: 1.25 }}>
              {activeEntry.term.name}
            </div>
          </div>
          <div style={{ fontFamily: mono, fontSize: 8, color, whiteSpace: "nowrap" }}>
            {activeChildren.length === 0 ? "leaf" : `${activeChildren.length} children`}
          </div>
        </div>
        {activeEntry.term.note && (
          <div style={{ fontFamily: mono, fontSize: 9, color: "#ffffff70", lineHeight: 1.55, marginTop: 9, maxWidth: 980 }}>
            {activeEntry.term.note}
          </div>
        )}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10, fontFamily: mono, fontSize: 7.5, color: "#ffffff42" }}>
          <span>{activeEntry.term.ui}</span>
          {activeEntry.term.treeNums.filter(tn => tn.startsWith("K")).length > 1 && (
            <span>{activeEntry.term.treeNums.filter(tn => tn.startsWith("K")).length} K placements</span>
          )}
        </div>
      </div>
    );
  }

  function renderTags(parentTreeNum, color, depth = 0) {
    const children = getChildren(parentTreeNum);
    if (children.length === 0) {
      return <div style={{ fontFamily: mono, fontSize: 8, color: "#ffffff30" }}>No child terms.</div>;
    }

    return children.map(({ term, treeNum }) => {
      const kids = getChildren(treeNum);
      const hasChildren = kids.length > 0;
      const open = isExpanded(treeNum);
      const active = selectedTag === treeNum;
      return (
        <div key={treeNum} style={{ display: "contents" }}>
          <button
            type="button"
            title={treeNum}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedTag(active ? null : treeNum);
              if (hasChildren) toggleExpanded(treeNum);
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
            }}
          >
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{term.name}</span>
            {hasChildren && <span style={{ color: color + "77", fontSize: 7 }}>{kids.length}</span>}
          </button>
          {open && (
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
              {renderTags(treeNum, color, depth + 1)}
            </div>
          )}
        </div>
      );
    });
  }

  return (
    <div style={{ height: "100%", overflowY: "auto", padding: 24 }}>
      <div style={{ fontFamily: mono, fontSize: 8, color: "#ffffff33", letterSpacing: 2, marginBottom: 16 }}>
        HUMANITIES — TOPICS, WORKS, BELIEF SYSTEMS, AND INTERPRETIVE DOMAINS
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 8, marginBottom: 14 }}>
        {categories.map((entry, i) => {
          const color = BRANCH_COLORS[i % BRANCH_COLORS.length];
          const active = selectedCategory === entry.treeNum;
          const direct = getChildren(entry.treeNum).length;
          const total = countAll(entry.treeNum);
          return (
            <button
              key={entry.treeNum}
              type="button"
              onClick={() => {
                setSelectedCategory(active ? null : entry.treeNum);
                setSelectedTag(null);
                setExpandedNodes([]);
              }}
              style={{
                textAlign: "left",
                minHeight: 68,
                padding: "10px 12px",
                background: active ? color + "20" : color + "0d",
                border: `1px solid ${active ? color + "88" : color + "2e"}`,
                borderRadius: 7,
                cursor: "pointer",
                fontFamily: mono,
                transition: "background 0.15s, border-color 0.15s",
              }}
            >
              <div style={{ fontSize: 10, color: active ? "#fff" : color, fontWeight: 700, lineHeight: 1.3 }}>
                {entry.term.name}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 7, fontSize: 7.5, color: "#ffffff45" }}>
                <span>{direct} direct</span>
                <span>{total} total</span>
              </div>
            </button>
          );
        })}
      </div>

      {selectedCategory && (
        <div style={{
          padding: 12,
          background: activeColor + "08",
          border: `1px solid ${activeColor + "24"}`,
          borderRadius: 8,
        }}>
          {renderDetail(activeColor)}
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", gap: 4 }}>
            {renderTags(selectedCategory, activeColor)}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SKETCH 1 — TAG CLOUD (all K terms, top 2 levels)
// ═══════════════════════════════════════════════════════════════════════════
function TagCloud({ data }) {
  const [filter, setFilter] = useState("");
  const [hovered, setHovered] = useState(null);
  const { allTerms, branches } = data;

  // BFS collect all unique K terms up to depth 2
  const seen = new Set();
  const chips = [];
  for (const { term, treeNum, depth } of allTerms) {
    if (!seen.has(treeNum)) {
      seen.add(treeNum);
      chips.push({ term, treeNum, depth });
    }
  }

  // Also add all descendants for completeness — collect all K terms
  const filtered = chips
    .filter(c => !filter || c.term.name.toLowerCase().includes(filter.toLowerCase()))
    .sort((a, b) => a.treeNum.localeCompare(b.treeNum, undefined, { numeric: true }));

  const hovItem = hovered ? chips.find(c => c.treeNum === hovered) : null;

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", padding: 24, gap: 16, overflowY: "auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <input
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="filter terms…"
          style={{
            fontFamily: mono, fontSize: 10, padding: "6px 12px",
            background: "#ffffff08", border: `1px solid ${TREE_COLOR}44`,
            borderRadius: 6, color: "#ffffffcc", outline: "none", width: 240,
          }}
        />
        <div style={{ fontFamily: mono, fontSize: 9, color: "#ffffff33" }}>
          {filtered.length} terms shown
        </div>
      </div>

      {hovItem && (
        <div style={{
          padding: "10px 14px", background: "#ffffff0a", border: `1px solid ${TREE_COLOR}55`,
          borderRadius: 8, fontFamily: mono, fontSize: 9, color: "#ffffffbb", maxWidth: 520,
        }}>
          <div style={{ color: TREE_COLOR, fontSize: 10, marginBottom: 4 }}>{hovItem.term.name}</div>
          <div style={{ color: "#ffffff55", marginBottom: 4 }}>{hovItem.treeNum}</div>
          {hovItem.term.note && (
            <div style={{ color: "#ffffff66", lineHeight: 1.5 }}>{hovItem.term.note.slice(0, 200)}{hovItem.term.note.length > 200 ? "…" : ""}</div>
          )}
        </div>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {filtered.map(({ term, treeNum, depth }) => {
          const color = branchColor(treeNum, branches);
          const isHov = hovered === treeNum;
          return (
            <div
              key={treeNum}
              onMouseEnter={() => setHovered(treeNum)}
              onMouseLeave={() => setHovered(null)}
              style={{
                padding: depth === 1 ? "5px 12px" : "3px 9px",
                background: isHov ? color + "33" : color + "14",
                border: `1px solid ${color}${isHov ? "99" : "44"}`,
                borderRadius: 20,
                fontFamily: mono,
                fontSize: depth === 1 ? 10 : 9,
                color: isHov ? color : color + "cc",
                cursor: "default",
                transition: "all 0.12s",
                fontWeight: depth === 1 ? 600 : 400,
                letterSpacing: depth === 1 ? 0.5 : 0,
              }}
            >
              {term.name}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div style={{ fontFamily: mono, fontSize: 10, color: "#ffffff22", textAlign: "center", marginTop: 40 }}>
          no terms match "{filter}"
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SKETCH 2 — BRANCH CARDS
// ═══════════════════════════════════════════════════════════════════════════
function BranchCards({ data }) {
  const { branches, childrenMap } = data;
  const [expanded, setExpanded] = useState(null);

  return (
    <div style={{ height: "100%", overflowY: "auto", padding: 24 }}>
      <div style={{ fontFamily: mono, fontSize: 9, color: "#ffffff22", letterSpacing: 2, marginBottom: 16 }}>
        K · HUMANITIES — DIRECT BRANCHES
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {branches.map(({ term, treeNum, directCount, totalCount }, bi) => {
          const color = BRANCH_COLORS[bi % BRANCH_COLORS.length];
          const isOpen = expanded === treeNum;
          const children = (childrenMap.get(treeNum) || []).sort((a, b) =>
            a.treeNum.localeCompare(b.treeNum, undefined, { numeric: true })
          );

          return (
            <div
              key={treeNum}
              style={{
                background: isOpen ? color + "10" : "#ffffff06",
                border: `1px solid ${isOpen ? color + "66" : "#ffffff11"}`,
                borderRadius: 10,
                padding: 18,
                transition: "all 0.15s",
              }}
            >
              <div
                onClick={() => setExpanded(isOpen ? null : treeNum)}
                style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}
              >
                <div style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: color, flexShrink: 0,
                }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: mono, fontSize: 12, color: color, fontWeight: 600 }}>
                    {term.name}
                  </div>
                  <div style={{ fontFamily: mono, fontSize: 8, color: "#ffffff33", marginTop: 3 }}>
                    {treeNum}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 16, fontFamily: mono, fontSize: 9 }}>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ color: color }}>{directCount}</div>
                    <div style={{ color: "#ffffff22", fontSize: 7 }}>direct</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ color: color }}>{totalCount}</div>
                    <div style={{ color: "#ffffff22", fontSize: 7 }}>total</div>
                  </div>
                </div>
                <div style={{ fontFamily: mono, fontSize: 10, color: color + "88" }}>
                  {isOpen ? "▲" : "▼"}
                </div>
              </div>

              {term.note && (
                <div style={{
                  fontFamily: mono, fontSize: 8.5, color: "#ffffff44",
                  marginTop: 10, paddingLeft: 20, lineHeight: 1.6,
                }}>
                  {term.note.slice(0, 180)}{term.note.length > 180 ? "…" : ""}
                </div>
              )}

              {isOpen && (
                <div style={{ marginTop: 14, paddingLeft: 20 }}>
                  <div style={{ fontFamily: mono, fontSize: 8, color: "#ffffff22", letterSpacing: 1, marginBottom: 8 }}>
                    DIRECT CHILDREN ({children.length})
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {children.map(({ term: ct, treeNum: ctn }) => {
                      const grandchildren = childrenMap.get(ctn)?.length ?? 0;
                      return (
                        <div key={ctn} style={{
                          display: "flex", alignItems: "center", gap: 10,
                          padding: "6px 10px", background: color + "0a",
                          borderRadius: 6, border: `1px solid ${color}22`,
                        }}>
                          <div style={{ fontFamily: mono, fontSize: 8, color: "#ffffff33", width: 80 }}>{ctn}</div>
                          <div style={{ fontFamily: mono, fontSize: 9.5, color: "#ffffffcc", flex: 1 }}>{ct.name}</div>
                          {grandchildren > 0 && (
                            <div style={{ fontFamily: mono, fontSize: 7.5, color: color + "88" }}>
                              +{grandchildren}
                            </div>
                          )}
                        </div>
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
  );
}

export default function MeshKConcepts() {
  return (
    <OverviewConceptShell
      treeLetter="K"
      navLabel="K · HUMANITIES"
      eyebrow="HUMANITIES — TOPICS, WORKS, BELIEF SYSTEMS, AND INTERPRETIVE DOMAINS"
      treeColor={TREE_COLOR}
      branchColors={{ K01: TREE_COLOR }}
      defaultCluster="K01.752"
    />
  );
}
