import { useEffect, useMemo, useState } from "react";

const mono = "'IBM Plex Mono', monospace";
const BG = "#0f1117";

export function LoadingMesh() {
  return (
    <div style={{ background: BG, height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontFamily: mono, fontSize: 10, color: "#ffffff44" }}>Loading MeSH...</div>
    </div>
  );
}

export function useMeshTreeData(treeLetter, branchColors = {}, fallbackColor = "#ffffff") {
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

      for (const children of childrenMap.values()) {
        children.sort((a, b) =>
          a.treeNum.localeCompare(b.treeNum, undefined, { numeric: true })
        );
      }

      function countDescendants(treeNum) {
        let n = 0;
        const queue = [...(childrenMap.get(treeNum) || [])];
        while (queue.length) {
          const item = queue.shift();
          n += 1;
          queue.push(...(childrenMap.get(item.treeNum) || []));
        }
        return n;
      }

      const raw = childrenMap.get(treeLetter) || [];
      const branches = raw.map(({ term, treeNum }, index) => ({
        term,
        treeNum,
        directCount: childrenMap.get(treeNum)?.length ?? 0,
        totalCount: countDescendants(treeNum),
        color: branchColors[treeNum] || branchColors[index] || fallbackColor,
      }));

      setState({ data: { branches, childrenMap, countDescendants }, loading: false });
    });
  }, [treeLetter, fallbackColor]);

  return state;
}

export function OverviewDetailExplorer({
  data,
  treeLetter,
  navLabel,
  eyebrow,
  treeColor,
  defaultCluster,
}) {
  const { branches, childrenMap, countDescendants } = data;
  const firstCluster = useMemo(() => {
    for (const branch of branches) {
      const children = childrenMap.get(branch.treeNum) || [];
      if (children[0]) return children[0].treeNum;
    }
    return branches[0]?.treeNum || null;
  }, [branches, childrenMap]);

  const [selectedLayer, setSelectedLayer] = useState(defaultCluster || firstCluster);
  const [selectedTag, setSelectedTag] = useState(null);
  const [expandedNodes, setExpandedNodes] = useState([]);

  useEffect(() => {
    if (!selectedLayer && firstCluster) setSelectedLayer(defaultCluster || firstCluster);
  }, [defaultCluster, firstCluster, selectedLayer]);

  const treeIndex = new Map();
  for (const branch of branches) treeIndex.set(branch.treeNum, { term: branch.term, treeNum: branch.treeNum });
  for (const entries of childrenMap.values()) {
    for (const entry of entries) treeIndex.set(entry.treeNum, entry);
  }

  function getChildren(treeNum) {
    return childrenMap.get(treeNum) || [];
  }

  function rootColor(treeNum) {
    const branch = branches.find(item => treeNum === item.treeNum || treeNum.startsWith(item.treeNum + "."));
    return branch?.color || treeColor;
  }

  function isExpanded(treeNum) {
    return expandedNodes.includes(treeNum);
  }

  function toggleExpanded(treeNum) {
    const dot = treeNum.lastIndexOf(".");
    const parentTreeNum = dot === -1 ? treeLetter : treeNum.slice(0, dot);
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

  function renderDetail() {
    const activeTreeNum = selectedTag || selectedLayer || branches[0]?.treeNum;
    const entry = treeIndex.get(activeTreeNum);
    const color = activeTreeNum ? rootColor(activeTreeNum) : treeColor;
    if (!entry) return null;
    const childCount = getChildren(activeTreeNum).length;
    const descendants = countDescendants(activeTreeNum);
    const note = entry.term.note || entry.term.scopeNote;

    return (
      <aside style={{
        padding: 16,
        background: "#ffffff06",
        border: `1px solid ${color}36`,
        borderRadius: 8,
        height: "fit-content",
        position: "sticky",
        top: 18,
      }}>
        <div style={{ fontFamily: mono, fontSize: 7, color: color + "aa", letterSpacing: 1.6, marginBottom: 8 }}>
          SELECTED TERM
        </div>
        <div style={{ fontFamily: mono, fontSize: 18, color: "#ffffffee", fontWeight: 700, lineHeight: 1.2 }}>
          {entry.term.name}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12, fontFamily: mono, fontSize: 8, color: "#ffffff50" }}>
          <span>{activeTreeNum}</span>
          <span>{entry.term.ui}</span>
          <span>{childCount === 0 ? "leaf" : `${childCount} children`}</span>
          {descendants > 0 && <span>{descendants.toLocaleString()} narrower</span>}
        </div>
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #ffffff10", fontFamily: mono, fontSize: 9.5, color: "#ffffff82", lineHeight: 1.6 }}>
          {note || "No scope note available for this term."}
        </div>
      </aside>
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
          const active = selectedTag === treeNum;
          const open = isExpanded(treeNum);
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
    <div style={{ height: "100%", overflowY: "auto", padding: 24 }}>
      <div style={{ fontFamily: mono, fontSize: 8, color: "#ffffff33", letterSpacing: 2, marginBottom: 16 }}>
        {eyebrow}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "320px minmax(420px, 1fr)", gap: 16, alignItems: "start" }}>
        {renderDetail()}

        <main style={{ display: "grid", gap: 14 }}>
          {branches.map(branch => {
            const color = branch.color;
            const clusters = getChildren(branch.treeNum);
            const activeCluster = selectedLayer?.startsWith(branch.treeNum + ".") ? selectedLayer : selectedLayer === branch.treeNum ? branch.treeNum : null;
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
                  {(clusters.length > 0 ? clusters : [branch]).map(({ term, treeNum }) => {
                    const active = selectedLayer === treeNum;
                    const childCount = getChildren(treeNum).length;
                    const descendants = countDescendants(treeNum);
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
                          background: active ? color + "2e" : color + "10",
                          border: `1px solid ${active ? color + "90" : color + "30"}`,
                          borderRadius: 999,
                          cursor: "pointer",
                          fontFamily: mono,
                          fontSize: 8.5,
                          color: active ? "#fff" : "#ffffffc4",
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
    </div>
  );
}

export function OverviewConceptShell({
  treeLetter,
  navLabel,
  eyebrow,
  treeColor,
  branchColors,
  defaultCluster,
}) {
  const { data, loading } = useMeshTreeData(treeLetter, branchColors, treeColor);

  return (
    <div style={{ width: "100%", height: "100vh", display: "flex", flexDirection: "column", background: BG }}>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&display=swap" rel="stylesheet" />

      <nav style={{ display: "flex", alignItems: "center", gap: 0, borderBottom: "2px solid #ffffff12", flexShrink: 0, background: "#0a0c10", overflowX: "auto" }}>
        <div style={{ padding: "12px 20px", fontFamily: mono, fontSize: 9, color: "#ffffff33", letterSpacing: 2, flexShrink: 0 }}>
          {navLabel}
        </div>
        <div style={{ padding: "12px 18px", fontFamily: mono, fontSize: 10, color: treeColor, borderBottom: `2px solid ${treeColor}`, marginBottom: "-2px", flexShrink: 0 }}>
          Overview + Detail
        </div>
      </nav>

      <div style={{ flex: 1, overflow: "hidden" }}>
        {loading ? <LoadingMesh /> : (
          <OverviewDetailExplorer
            data={data}
            treeLetter={treeLetter}
            navLabel={navLabel}
            eyebrow={eyebrow}
            treeColor={treeColor}
            defaultCluster={defaultCluster}
          />
        )}
      </div>
    </div>
  );
}
