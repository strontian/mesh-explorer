import { useState, useEffect } from "react";
import {
  FloatingMeshDetailPanel,
  FloatingMeshQueryPanel,
  usePersistentMeshQueries,
} from "./mesh_query_ui.jsx";

const mono = "'IBM Plex Mono', monospace";
const BG = "#0f1117";
const TREE_COLOR = "#B8C8A8";

const H01_COLOR = "#7EC8A0";
const H02_COLOR = "#A8C4D8";

// ── DATA HOOK ─────────────────────────────────────────────────────────────
function useHData() {
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

      const raw = (childrenMap.get("H") || []).sort((a, b) =>
        a.treeNum.localeCompare(b.treeNum, undefined, { numeric: true })
      );

      const branches = raw.map(({ term, treeNum }) => ({
        term, treeNum,
        directCount: childrenMap.get(treeNum)?.length ?? 0,
        totalCount: countAll(treeNum),
        color: treeNum.startsWith("H01") ? H01_COLOR : H02_COLOR,
      }));

      // Build all level-2 terms (direct children of H01 and H02)
      const level2 = [];
      for (const br of branches) {
        const kids = (childrenMap.get(br.treeNum) || []).sort((a, b) =>
          a.treeNum.localeCompare(b.treeNum, undefined, { numeric: true })
        );
        for (const { term: t, treeNum: tn } of kids) {
          level2.push({
            term: t,
            treeNum: tn,
            parentNum: br.treeNum,
            parentColor: br.color,
            totalCount: countAll(tn),
          });
        }
      }

      setState({ data: { branches, childrenMap, level2 }, loading: false });
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

function DisciplinesProgressiveMap({ data }) {
  const { branches, childrenMap } = data;
  const [selectedCluster, setSelectedCluster] = useState("H01.158");
  const [selectedTag, setSelectedTag] = useState(null);
  const [expandedNodes, setExpandedNodes] = useState([]);

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

  function rootColor(treeNum) {
    return treeNum.startsWith("H02") ? H02_COLOR : H01_COLOR;
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

  function selectCluster(treeNum) {
    setSelectedCluster(treeNum);
    setSelectedTag(null);
    setExpandedNodes([]);
  }

  function renderDetail() {
    const activeTreeNum = selectedTag || selectedCluster;
    const entry = treeIndex.get(activeTreeNum);
    const color = rootColor(activeTreeNum);
    if (!entry) return null;
    const childCount = getChildren(activeTreeNum).length;
    const descendants = countDescendants(activeTreeNum);

    return (
      <div style={{ height: 150, minHeight: 150, maxHeight: 150, boxSizing: "border-box", overflow: "hidden", marginBottom: 14, padding: 12, background: "#ffffff06", border: `1px solid ${color}2f`, borderRadius: 8 }}>
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
          <div style={{ fontFamily: mono, fontSize: 9, color: "#ffffff70", lineHeight: 1.55, marginTop: 9, maxHeight: 58, overflowY: "auto" }}>
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

    const openChild = children.find(({ treeNum }) => isExpanded(treeNum));
    return (
      <>
        {children.map(({ term, treeNum }) => {
          const childCount = getChildren(treeNum).length;
          const open = isExpanded(treeNum);
          const active = selectedTag === treeNum;
          return (
            <button
              key={treeNum}
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
            {renderTags(openChild.treeNum, color, depth + 1)}
          </div>
        )}
      </>
    );
  }

  return (
    <div style={{ height: "100%", overflowY: "auto", padding: 24 }}>
      <div style={{ fontFamily: mono, fontSize: 8, color: "#ffffff33", letterSpacing: 2, marginBottom: 16 }}>
        DISCIPLINES — KNOWLEDGE DOMAINS AND HEALTH PROFESSIONS
      </div>

      {renderDetail()}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {branches.map(branch => {
          const color = branch.color;
          const clusters = getChildren(branch.treeNum);
          const activeColumn = selectedCluster?.startsWith(branch.treeNum + ".");
          return (
            <div key={branch.treeNum} style={{ padding: 14, background: activeColumn ? color + "12" : "#ffffff06", border: `1px solid ${activeColumn ? color + "70" : "#ffffff12"}`, borderRadius: 8 }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, marginBottom: 4 }}>
                <div style={{ fontFamily: mono, fontSize: 8, color, letterSpacing: 1.5 }}>{branch.treeNum}</div>
                <div style={{ fontFamily: mono, fontSize: 8, color: "#ffffff42" }}>{branch.totalCount.toLocaleString()} total</div>
              </div>
              <div style={{ fontFamily: mono, fontSize: 13, color, fontWeight: 700, lineHeight: 1.3 }}>
                  {branch.term.name}
              </div>
              <div style={{ fontFamily: mono, fontSize: 7.5, color: "#ffffff45", marginTop: 4, marginBottom: 12 }}>
                {branch.directCount} top categories
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 6 }}>
                {clusters.map(({ term, treeNum }) => {
                  const active = selectedCluster === treeNum;
                  const childCount = getChildren(treeNum).length;
                  const total = countDescendants(treeNum);
                  return (
                    <button
                      key={treeNum}
                      type="button"
                      onClick={() => selectCluster(treeNum)}
                      style={{
                        textAlign: "left",
                        minHeight: 52,
                        padding: "7px 8px",
                        background: active ? color + "24" : color + "0c",
                        border: `1px solid ${active ? color + "88" : color + "2c"}`,
                        borderRadius: 6,
                        cursor: "pointer",
                        fontFamily: mono,
                      }}
                    >
                      <div style={{ fontSize: 8.5, color: active ? "#fff" : "#ffffffc8", fontWeight: 700, lineHeight: 1.25 }}>
                        {term.name}
                      </div>
                      <div style={{ display: "flex", gap: 7, marginTop: 5, fontSize: 7, color: "#ffffff42" }}>
                        <span>{childCount} direct</span>
                        <span>{total} total</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {selectedCluster && (
        <div style={{
          marginTop: 14,
          padding: 12,
          background: rootColor(selectedCluster) + "08",
          border: `1px solid ${rootColor(selectedCluster) + "24"}`,
          borderRadius: 8,
        }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 8 }}>
            <div style={{ fontFamily: mono, fontSize: 7, color: rootColor(selectedCluster) + "aa", letterSpacing: 1.5 }}>
              EXPLORE {selectedCluster}
            </div>
            <div style={{ fontFamily: mono, fontSize: 8, color: "#ffffff42" }}>
              {treeIndex.get(selectedCluster)?.term.name}
            </div>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", gap: 4 }}>
            {renderTags(selectedCluster, rootColor(selectedCluster))}
          </div>
        </div>
      )}
    </div>
  );
}

function DisciplinesOverviewMap({ data }) {
  const { branches, childrenMap } = data;
  const [selectedLayer, setSelectedLayer] = useState("H01.158");
  const [selectedTag, setSelectedTag] = useState(null);
  const [expandedNodes, setExpandedNodes] = useState([]);
  const queryBuilder = usePersistentMeshQueries();

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

  function rootColor(treeNum) {
    return treeNum.startsWith("H02") ? H02_COLOR : H01_COLOR;
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

  function selectLayer(treeNum) {
    setSelectedLayer(treeNum);
    setSelectedTag(treeNum);
    setExpandedNodes(getChildren(treeNum).length > 0 ? [treeNum] : []);
  }

  function selectTag(treeNum) {
    setSelectedTag(treeNum);
    if (getChildren(treeNum).length > 0) toggleExpanded(treeNum);
  }

  const activeTreeNum = selectedTag || selectedLayer || "H";
  const activeEntry = treeIndex.get(activeTreeNum);
  const activeColor = activeTreeNum.startsWith("H02") ? H02_COLOR : activeTreeNum.startsWith("H01") ? H01_COLOR : TREE_COLOR;
  const selectedDetail = activeEntry ? {
    id:activeEntry.term.name,
    branch:"disciplines",
    color:activeColor,
    treeNum:activeTreeNum,
    ui:activeEntry.term.ui,
    note:activeEntry.term.note || activeEntry.term.scopeNote,
  } : null;

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
          const collected = queryBuilder.allIds.has(term.name);
          return (
            <button
              key={treeNum}
              type="button"
              title={treeNum}
              onClick={(event) => {
                event.stopPropagation();
                selectTag(treeNum);
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                minHeight: 22,
                width: "fit-content",
                maxWidth: "100%",
                padding: "4px 8px",
                background: active ? color + "30" : open ? color + "20" : collected ? color + "1d" : color + "10",
                border: `1px solid ${active || open ? color + "88" : collected ? color + "66" : color + "30"}`,
                borderRadius: 999,
                cursor: "pointer",
                fontFamily: mono,
                fontSize: 8,
                color: active ? "#fff" : collected ? color : "#ffffffb8",
                lineHeight: 1.25,
              }}
            >
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{term.name}</span>
              {childCount > 0 && <span style={{ color: color + "77", fontSize: 7 }}>{childCount}</span>}
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

  return (
    <div style={{ height: "100%", overflowY: "auto", padding: 24, paddingBottom: 230 }}>
      <div style={{ fontFamily: mono, fontSize: 8, color: "#ffffff33", letterSpacing: 2, marginBottom: 16 }}>
        DISCIPLINES — OVERVIEW WITH QUERY BUILDER
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(420px, 1fr)", gap: 16, alignItems: "start" }}>
        <main style={{ display: "grid", gap: 14 }}>
          {branches.map(branch => {
            const color = branch.color;
            const clusters = getChildren(branch.treeNum);
            const activeCluster = selectedLayer?.startsWith(branch.treeNum + ".") ? selectedLayer : null;
            return (
              <section key={branch.treeNum} style={{
                padding: 14,
                background: activeCluster ? color + "12" : "#ffffff05",
                border: `1px solid ${activeCluster ? color + "70" : "#ffffff12"}`,
                borderRadius: 8,
              }}>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
                  <div>
                    <div style={{ fontFamily: mono, fontSize: 8, color, letterSpacing: 1.5, marginBottom: 4 }}>{branch.treeNum}</div>
                    <div style={{ fontFamily: mono, fontSize: 13, color: "#ffffffde", fontWeight: 700 }}>{branch.term.name}</div>
                  </div>
                  <div style={{ fontFamily: mono, fontSize: 8, color: "#ffffff42" }}>{branch.totalCount.toLocaleString()} total</div>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {clusters.map(({ term, treeNum }) => {
                    const active = selectedLayer === treeNum;
                    const childCount = getChildren(treeNum).length;
                    const descendants = countDescendants(treeNum);
                    const collected = queryBuilder.allIds.has(term.name);
                    return (
                      <button
                        key={treeNum}
                        type="button"
                        onClick={() => selectLayer(treeNum)}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          minHeight: 28,
                          maxWidth: "100%",
                          padding: "5px 9px",
                          background: active ? color + "2e" : collected ? color + "1d" : color + "10",
                          border: `1px solid ${active ? color + "90" : collected ? color + "66" : color + "30"}`,
                          borderRadius: 999,
                          cursor: "pointer",
                          fontFamily: mono,
                          fontSize: 8.5,
                          color: active ? "#fff" : collected ? color : "#ffffffc4",
                          lineHeight: 1.2,
                        }}
                      >
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{term.name}</span>
                        <span style={{ color: color + "88", fontSize: 7 }}>{childCount}/{descendants}</span>
                      </button>
                    );
                  })}
                </div>

                {activeCluster && (
                  <div style={{
                    marginTop: 12,
                    padding: 11,
                    background: color + "09",
                    border: `1px solid ${color + "24"}`,
                    borderRadius: 8,
                  }}>
                    <div style={{ fontFamily: mono, fontSize: 7, color: color + "aa", letterSpacing: 1.5, marginBottom: 8 }}>
                      EXPLORE {treeIndex.get(activeCluster)?.term.name}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", gap: 4 }}>
                      {renderTags(activeCluster, color)}
                    </div>
                  </div>
                )}
              </section>
            );
          })}
        </main>
      </div>

      <FloatingMeshDetailPanel selected={selectedDetail} query={queryBuilder} />
      <FloatingMeshQueryPanel query={queryBuilder} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SKETCH 1 — TWO WORLDS
// Side-by-side panels: H01 Natural Sciences vs H02 Health Occupations
// ═══════════════════════════════════════════════════════════════════════════
function TwoWorlds({ data }) {
  const [hovered, setHovered] = useState(null);
  const { branches, childrenMap } = data;

  const h01 = branches.find(b => b.treeNum === "H01");
  const h02 = branches.find(b => b.treeNum === "H02");

  function getChildren(treeNum) {
    return (childrenMap.get(treeNum) || []).sort((a, b) =>
      a.treeNum.localeCompare(b.treeNum, undefined, { numeric: true })
    );
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

  const h01Kids = getChildren("H01");
  const h02Kids = getChildren("H02");

  function Panel({ branch, kids, color, side }) {
    if (!branch) return null;
    return (
      <div style={{
        flex: 1, minWidth: 0, display: "flex", flexDirection: "column",
        borderRight: side === "left" ? "1px solid #ffffff10" : "none",
        padding: "28px 24px",
        overflowY: "auto",
      }}>
        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontFamily: mono, fontSize: 9, color: color, letterSpacing: 2, marginBottom: 6 }}>
            {branch.treeNum}
          </div>
          <div style={{ fontFamily: mono, fontSize: 16, color: "#ffffffcc", fontWeight: 700, marginBottom: 8, lineHeight: 1.3 }}>
            {branch.term.name}
          </div>
          <div style={{ display: "flex", gap: 16 }}>
            <div style={{ fontFamily: mono, fontSize: 9, color: "#ffffff55" }}>
              <span style={{ color: color, fontSize: 13, fontWeight: 700 }}>{branch.directCount}</span> direct children
            </div>
            <div style={{ fontFamily: mono, fontSize: 9, color: "#ffffff55" }}>
              <span style={{ color: color, fontSize: 13, fontWeight: 700 }}>{branch.totalCount}</span> total terms
            </div>
          </div>
          {/* Bar */}
          <div style={{ marginTop: 12, height: 3, background: "#ffffff08", borderRadius: 2 }}>
            <div style={{ height: "100%", width: `${Math.round((branch.totalCount / 500) * 100)}%`, maxWidth: "100%", background: color, borderRadius: 2, opacity: 0.7 }} />
          </div>
        </div>

        {/* Children chips */}
        <div style={{ fontFamily: mono, fontSize: 8, color: "#ffffff33", letterSpacing: 1, marginBottom: 10 }}>
          DIRECT CHILDREN
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {kids.map(({ term: t, treeNum: tn }) => {
            const cnt = countAll(tn);
            const isHov = hovered === tn;
            return (
              <div
                key={tn}
                onMouseEnter={() => setHovered(tn)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  padding: "5px 10px",
                  background: isHov ? color + "22" : "#ffffff06",
                  border: `1px solid ${isHov ? color + "66" : "#ffffff14"}`,
                  borderRadius: 4,
                  cursor: "default",
                  transition: "all 0.12s",
                  position: "relative",
                }}
              >
                <div style={{ fontFamily: mono, fontSize: 9, color: isHov ? color : "#ffffffaa" }}>
                  {t.name}
                </div>
                <div style={{ fontFamily: mono, fontSize: 7, color: "#ffffff44", marginTop: 2 }}>
                  {tn} · {cnt} terms
                </div>
                {isHov && t.scopeNote && (
                  <div style={{
                    position: "absolute", bottom: "calc(100% + 6px)", left: 0,
                    background: "#1a1d24", border: `1px solid ${color}44`,
                    borderRadius: 4, padding: "8px 10px", width: 240, zIndex: 10,
                    fontFamily: mono, fontSize: 8, color: "#ffffffaa", lineHeight: 1.5,
                    boxShadow: "0 4px 16px #00000088",
                    pointerEvents: "none",
                  }}>
                    {t.scopeNote.slice(0, 180)}{t.scopeNote.length > 180 ? "…" : ""}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Legend */}
      <div style={{ padding: "12px 24px", borderBottom: "1px solid #ffffff10", display: "flex", gap: 24, alignItems: "center", flexShrink: 0 }}>
        <div style={{ fontFamily: mono, fontSize: 9, color: "#ffffff33", letterSpacing: 1 }}>H DISCIPLINES &amp; OCCUPATIONS</div>
        <div style={{ display: "flex", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: H01_COLOR }} />
            <span style={{ fontFamily: mono, fontSize: 8, color: "#ffffff55" }}>H01 Natural Sciences</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: H02_COLOR }} />
            <span style={{ fontFamily: mono, fontSize: 8, color: "#ffffff55" }}>H02 Health Occupations</span>
          </div>
        </div>
      </div>
      {/* Two panels */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <Panel branch={h01} kids={h01Kids} color={H01_COLOR} side="left" />
        <Panel branch={h02} kids={h02Kids} color={H02_COLOR} side="right" />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SKETCH 2 — ALL TERMS GRID
// Filterable chip grid of all top-2-level H terms
// ═══════════════════════════════════════════════════════════════════════════
function AllTermsGrid({ data }) {
  const [query, setQuery] = useState("");
  const [hovered, setHovered] = useState(null);
  const { level2, branches } = data;

  const filtered = query.trim()
    ? level2.filter(d => d.term.name.toLowerCase().includes(query.toLowerCase()))
    : level2;

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ padding: "16px 24px", borderBottom: "1px solid #ffffff10", display: "flex", gap: 16, alignItems: "center", flexShrink: 0, flexWrap: "wrap" }}>
        <div style={{ fontFamily: mono, fontSize: 9, color: "#ffffff33", letterSpacing: 1 }}>ALL TERMS GRID</div>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="filter by name…"
          style={{
            background: "#ffffff08", border: "1px solid #ffffff18", borderRadius: 4,
            padding: "5px 10px", fontFamily: mono, fontSize: 10, color: "#ffffffcc",
            outline: "none", width: 200,
          }}
        />
        <div style={{ fontFamily: mono, fontSize: 8, color: "#ffffff33" }}>
          {filtered.length} / {level2.length} terms
        </div>
        {/* Legend */}
        <div style={{ display: "flex", gap: 14, marginLeft: "auto" }}>
          {branches.map(b => (
            <div key={b.treeNum} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: b.color }} />
              <span style={{ fontFamily: mono, fontSize: 8, color: "#ffffff55" }}>{b.treeNum} {b.term.name.split(" ")[0]}</span>
            </div>
          ))}
        </div>
      </div>
      {/* Grid */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignContent: "flex-start" }}>
          {filtered.map(d => {
            const isHov = hovered === d.treeNum;
            return (
              <div
                key={d.treeNum}
                onMouseEnter={() => setHovered(d.treeNum)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  padding: "6px 12px",
                  background: isHov ? d.parentColor + "28" : d.parentColor + "0a",
                  border: `1px solid ${isHov ? d.parentColor + "88" : d.parentColor + "28"}`,
                  borderRadius: 5,
                  cursor: "default",
                  transition: "all 0.12s",
                  position: "relative",
                }}
              >
                <div style={{ fontFamily: mono, fontSize: 9, color: isHov ? d.parentColor : "#ffffffbb" }}>
                  {d.term.name}
                </div>
                <div style={{ fontFamily: mono, fontSize: 7, color: d.parentColor + "88", marginTop: 2 }}>
                  {d.treeNum} · {d.totalCount} terms
                </div>
                {isHov && (
                  <div style={{
                    position: "absolute", bottom: "calc(100% + 6px)", left: 0,
                    background: "#1a1d24", border: `1px solid ${d.parentColor}44`,
                    borderRadius: 4, padding: "8px 10px", width: 260, zIndex: 10,
                    fontFamily: mono, fontSize: 8, color: "#ffffffaa", lineHeight: 1.5,
                    boxShadow: "0 4px 16px #00000088",
                    pointerEvents: "none",
                  }}>
                    <div style={{ color: d.parentColor, marginBottom: 4 }}>{d.treeNum}</div>
                    {d.term.scopeNote
                      ? d.term.scopeNote.slice(0, 200) + (d.term.scopeNote.length > 200 ? "…" : "")
                      : "No scope note available."}
                  </div>
                )}
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div style={{ fontFamily: mono, fontSize: 10, color: "#ffffff22", padding: 20 }}>
              No terms match "{query}"
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MeshHConcepts() {
  const { data, loading } = useHData();

  return (
    <div style={{ width: "100%", height: "100vh", display: "flex", flexDirection: "column", background: BG }}>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&display=swap" rel="stylesheet" />
      <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&display=swap" rel="stylesheet" />

      <nav style={{ display: "flex", alignItems: "center", gap: 0, borderBottom: "2px solid #ffffff12", flexShrink: 0, background: "#0a0c10", overflowX: "auto" }}>
        <div style={{ padding: "12px 20px", fontFamily: mono, fontSize: 9, color: "#ffffff33", letterSpacing: 2, flexShrink: 0 }}>
          H · DISCIPLINES
        </div>
        <div style={{ padding: "12px 18px", fontFamily: mono, fontSize: 10, color: TREE_COLOR, borderBottom: `2px solid ${TREE_COLOR}`, marginBottom: "-2px", flexShrink: 0 }}>
          Overview + Query
        </div>
      </nav>

      <div style={{ flex: 1, overflow: "hidden" }}>
        {loading ? <Loading /> : <DisciplinesOverviewMap data={data} />}
      </div>
    </div>
  );
}
