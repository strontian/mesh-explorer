import { useEffect, useMemo, useState } from "react";
import {
  MeshInspectorQueryDock,
  usePersistentMeshQueries,
} from "./mesh_query_ui.jsx";
import { MeshPageHeader } from "./mesh_page_header.jsx";

const mono = "'IBM Plex Mono', monospace";
const BG = "#0f1117";

function treeTitleFromNavLabel(navLabel) {
  return (navLabel.split("·")[1] || navLabel)
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase());
}

function sentenceFromEyebrow(eyebrow) {
  const text = (eyebrow.split("—")[1] || eyebrow).trim().toLowerCase();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) + "." : "";
}

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
  pageTitle,
  pageDescription,
  treeColor,
  defaultCluster,
  initialSelection,
}) {
  const { branches, childrenMap, countDescendants } = data;
  const queryBuilder = usePersistentMeshQueries();
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
    if (!selectedLayer && !selectedTag && firstCluster) setSelectedLayer(defaultCluster || firstCluster);
  }, [defaultCluster, firstCluster, selectedLayer, selectedTag]);

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

  function selectRoot() {
    setSelectedLayer(null);
    setSelectedTag(treeLetter);
    setExpandedNodes([]);
  }

  function selectBranch(treeNum) {
    setSelectedLayer(treeNum);
    setSelectedTag(treeNum);
    setExpandedNodes([]);
  }

  function selectTag(treeNum) {
    setSelectedTag(treeNum);
    if (getChildren(treeNum).length > 0) toggleExpanded(treeNum);
  }

  function pathAncestors(treeNum) {
    const parts = treeNum.split(".");
    const ancestors = [];
    for (let i = 1; i <= parts.length; i++) ancestors.push(parts.slice(0, i).join("."));
    return ancestors;
  }

  useEffect(() => {
    const treeNum = initialSelection?.treeNum;
    if (!treeNum || treeNum[0] !== treeLetter || !treeIndex.has(treeNum)) return;

    const ancestors = pathAncestors(treeNum);
    const branchTreeNum = ancestors[0];
    const clusterTreeNum = ancestors.find((ancestor, index) => index > 0 && treeIndex.has(ancestor)) || branchTreeNum;
    setSelectedLayer(clusterTreeNum);
    setSelectedTag(treeNum);
    setExpandedNodes(ancestors.slice(1));
  }, [initialSelection?.navigationKey, initialSelection?.treeNum, treeLetter]);

  const activeTreeNum = selectedTag || selectedLayer || branches[0]?.treeNum;
  const activeEntry = activeTreeNum ? treeIndex.get(activeTreeNum) : null;
  const activeColor = activeTreeNum ? rootColor(activeTreeNum) : treeColor;
  const selectedDetail = activeTreeNum === treeLetter ? {
    id:treeTitleFromNavLabel(navLabel),
    branch:treeLetter.toLowerCase(),
    color:treeColor,
    treeNum:treeLetter,
    note:pageDescription || sentenceFromEyebrow(eyebrow),
  } : activeEntry ? {
    id:activeEntry.term.name,
    branch:treeLetter.toLowerCase(),
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
    <div style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ flex: 1, overflowY: "auto", padding: 24, paddingTop: 0, paddingBottom: 24 }}>
      <div style={{ margin: "0 -24px 20px" }}>
          <MeshPageHeader
            letter={treeLetter}
            title={treeTitleFromNavLabel(navLabel)}
            description={pageDescription || sentenceFromEyebrow(eyebrow)}
            color={treeColor}
            onClick={selectRoot}
            active={selectedTag === treeLetter}
          />
        </div>
      <div style={{
        display: "grid",
        gridTemplateColumns: "minmax(420px, 1fr)",
        gap: 16,
        alignItems: "start",
      }}>
        <main style={{ display: "grid", gap: 14 }}>
          {branches.map(branch => {
            const color = branch.color;
            const clusters = getChildren(branch.treeNum);
            const activeCluster = selectedLayer?.startsWith(branch.treeNum + ".") ? selectedLayer : selectedLayer === branch.treeNum ? branch.treeNum : null;
            return (
              <section key={branch.treeNum} onClick={() => selectBranch(branch.treeNum)} style={{
                padding: 14,
                background: activeCluster ? color + "12" : "#ffffff05",
                border: `1px solid ${activeCluster ? color + "70" : "#ffffff12"}`,
                borderRadius: 8,
                cursor: "pointer",
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
                    const collected = queryBuilder.allIds.has(term.name);
                    return (
                      <button
                        key={treeNum}
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          selectLayer(treeNum);
                        }}
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
                      {treeIndex.get(activeCluster)?.term.name}
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

      <div style={{ flexShrink: 0, padding: 0, background: "linear-gradient(180deg,rgba(15,17,23,0),#0f1117 30%)", boxShadow: "0 -18px 34px rgba(0,0,0,0.34)" }}>
        <MeshInspectorQueryDock selected={selectedDetail} query={queryBuilder} layout="bottom" />
      </div>
    </div>
  );
}

export function OverviewConceptShell({
  treeLetter,
  navLabel,
  eyebrow,
  pageTitle,
  pageDescription,
  treeColor,
  branchColors,
  defaultCluster,
  initialSelection,
}) {
  const { data, loading } = useMeshTreeData(treeLetter, branchColors, treeColor);

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: BG }}>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&display=swap" rel="stylesheet" />

      <div style={{ flex: 1, overflow: "hidden" }}>
        {loading ? <LoadingMesh /> : (
          <OverviewDetailExplorer
            data={data}
            treeLetter={treeLetter}
            navLabel={navLabel}
            eyebrow={eyebrow}
            pageTitle={pageTitle}
            pageDescription={pageDescription}
            treeColor={treeColor}
            defaultCluster={defaultCluster}
            initialSelection={initialSelection}
          />
        )}
      </div>
    </div>
  );
}
