import { useState, useEffect } from "react";
import { MeshPageHeader } from "./mesh_page_header.jsx";
import {
  MeshInspectorQueryDock,
  usePersistentMeshQueries,
} from "./mesh_query_ui.jsx";

const mono = "'IBM Plex Mono', monospace";
const BG = "#0f1117";
const TREE_COLOR = "#C3A6FF";

// ── CHEMICAL TYPE GROUPS ──────────────────────────────────────────────────
const CHEM_GROUPS = [
  { id: "inorganic",      label: "Inorganic",      color: "#60A5FA", branches: ["D01"] },
  { id: "organic",        label: "Organic",         color: "#4ADE80", branches: ["D02","D03","D04","D09","D10"] },
  { id: "macromolecular", label: "Macromolecular",  color: "#C3A6FF", branches: ["D05","D12","D13"] },
  { id: "biological",     label: "Biological",      color: "#2DD4BF", branches: ["D06","D08","D11","D23"] },
  { id: "pharmaceutical", label: "Pharmaceutical",  color: "#FB923C", branches: ["D20","D25","D26","D27"] },
];

function chemColor(treeNum) {
  for (const g of CHEM_GROUPS) {
    if (g.branches.includes(treeNum)) return g.color;
  }
  return TREE_COLOR;
}

// ── DATA HOOK ─────────────────────────────────────────────────────────────
function useDData() {
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

      const raw = (childrenMap.get("D") || []).sort((a, b) =>
        a.treeNum.localeCompare(b.treeNum, undefined, { numeric: true })
      );

      const branches = raw.map(({ term, treeNum }) => ({
        term, treeNum,
        directCount: childrenMap.get(treeNum)?.length ?? 0,
        totalCount:  countAll(treeNum),
        color: chemColor(treeNum),
      }));

      // allDTerms: every term with at least one treeNum starting with "D"
      const allDTerms = terms.filter(t => t.treeNums && t.treeNums.some(n => n.startsWith("D")));

      setState({ data: { branches, childrenMap, allDTerms }, loading: false });
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

// ── CHEMICALS TAG SELECTOR DAG ─────────────────────────────────────────────
function ChemicalsPageChrome() {
  return (
    <div style={{ flexShrink: 0 }}>
      <MeshPageHeader
        letter="D"
        title="Chemicals & Drugs"
        description="Chemical descriptors can appear in multiple hierarchies at once, so the same molecule may be organized by structure, biological role, pharmacologic use, or action."
        color={TREE_COLOR}
      />
    </div>
  );
}

function ChemicalsTagSelectorDag({ data, pageChrome }) {
  const { branches, childrenMap, allDTerms } = data;
  const [currentPath, setCurrentPath] = useState("D");
  const [selectedPath, setSelectedPath] = useState("D");
  const [query, setQuery] = useState("");
  const queryBuilder = usePersistentMeshQueries();

  const nodeByPath = new Map();
  for (const branch of branches) nodeByPath.set(branch.treeNum, branch.term);
  for (const kids of childrenMap.values()) {
    for (const { term, treeNum } of kids) nodeByPath.set(treeNum, term);
  }

  function lineage(path) {
    if (!path || path === "D") return [{ treeNum: "D", name: "Chemicals and Drugs" }];
    const parts = path.split(".");
    const nodes = [{ treeNum: "D", name: "Chemicals and Drugs" }];
    for (let i = 1; i <= parts.length; i++) {
      const treeNum = parts.slice(0, i).join(".");
      nodes.push({ treeNum, name: nodeByPath.get(treeNum)?.name || treeNum });
    }
    return nodes;
  }

  function navigateTo(path) {
    setCurrentPath(path);
    setSelectedPath(path);
  }

  const currentTerm = nodeByPath.get(currentPath);
  const currentLineage = lineage(currentPath);
  const selectedTerm = nodeByPath.get(selectedPath);
  const selectedColor = selectedPath === "D" ? TREE_COLOR : chemColor(selectedPath.slice(0, 3));
  const selectedDetail = selectedTerm ? {
    id: selectedTerm.name,
    branch: "d",
    color: selectedColor,
    treeNum: selectedPath,
    ui: selectedTerm.ui,
    note: selectedTerm.note || selectedTerm.scopeNote,
  } : {
    id: "Chemicals and Drugs",
    branch: "d",
    color: TREE_COLOR,
    treeNum: "D",
    note: "Chemical descriptors can appear in multiple hierarchies by structure, biological role, pharmacologic use, or action.",
  };
  const navigationPlacements = currentTerm
    ? currentTerm.treeNums.filter(n => n.startsWith("D")).sort()
    : [];
  const q = query.trim().toLowerCase();
  const searchResults = q.length >= 2
    ? allDTerms.filter(t => t.name.toLowerCase().includes(q)).slice(0, 36)
    : [];

  const pathSet = new Set(currentLineage.map(n => n.treeNum));

  function PlacementDag({ paths }) {
    const CHIP_W = 126;
    const CHIP_H = 26;
    const LEFT = 12;
    const TOP = 12;
    const SINK_GAP = 42;
    const chains = paths.map(path => ({
      path,
      nodes: lineage(path).slice(0, -1),
    })).sort((a, b) => a.path.localeCompare(b.path, undefined, { numeric: true }));

    const maxDepth = Math.max(...chains.map(c => c.nodes.length), 1);
    const sinkName = currentPath === "D" ? "Chemicals and Drugs" : currentTerm?.name || "selected descriptor";
    const PATH_GAP = 58;
    const LANE_GAP = 148;
    const mergedNodes = new Map();
    const edgeMap = new Map();

      function nodeKey(node) {
        if (node.treeNum === "D") return "D";
        return nodeByPath.get(node.treeNum)?.ui || node.treeNum;
      }

      function registerNode(node, depth) {
        const key = nodeKey(node);
        const term = nodeByPath.get(node.treeNum);
        if (!mergedNodes.has(key)) {
          mergedNodes.set(key, {
            key,
            name: node.name,
            treeNum: node.treeNum,
            treeNums: new Set([node.treeNum]),
            depth,
            ui: term?.ui,
          });
        } else {
          const record = mergedNodes.get(key);
          record.treeNums.add(node.treeNum);
          record.depth = Math.min(record.depth, depth);
        }
        return mergedNodes.get(key);
      }

      for (const chain of chains) {
        let previous = null;
        chain.nodes.forEach((node, index) => {
          const record = registerNode(node, index);
          if (previous) edgeMap.set(`${previous.key}->${record.key}`, { fromKey: previous.key, toKey: record.key });
          previous = record;
        });
        if (previous) edgeMap.set(`${previous.key}->sink`, { fromKey: previous.key, toSink: true });
      }

      const nodesByDepth = new Map();
      for (const node of mergedNodes.values()) {
        if (!nodesByDepth.has(node.depth)) nodesByDepth.set(node.depth, []);
        nodesByDepth.get(node.depth).push(node);
      }
      for (const nodes of nodesByDepth.values()) {
        nodes.sort((a, b) => a.name.localeCompare(b.name));
      }

      const widestRow = Math.max(1, ...[...nodesByDepth.values()].map(nodes => nodes.length));
      const svgWidth = LEFT * 2 + Math.max(720, widestRow * CHIP_W + (widestRow - 1) * (LANE_GAP - CHIP_W));
      const centerX = Math.max(LEFT, (svgWidth - CHIP_W) / 2);
      const maxPathDepth = Math.max(...chains.map(chain => chain.nodes.length), 1);
      const sinkX = centerX;
      const sinkY = TOP + maxPathDepth * PATH_GAP + SINK_GAP;
      const svgHeight = sinkY + CHIP_H + TOP;

      for (const [depth, nodes] of nodesByDepth.entries()) {
        const rowStartX = Math.max(LEFT, centerX - ((nodes.length - 1) * LANE_GAP) / 2);
        nodes.forEach((node, index) => {
          node.x = rowStartX + index * LANE_GAP;
          node.y = TOP + depth * PATH_GAP;
        });
      }

      const drawableConnectors = [...edgeMap.values()]
        .map(edge => ({
          ...edge,
          from: mergedNodes.get(edge.fromKey),
          to: edge.toSink ? { x: sinkX, y: sinkY } : mergedNodes.get(edge.toKey),
        }))
        .filter(edge => edge.from && edge.to);

      const visibleNodes = [...mergedNodes.values()].sort((a, b) =>
        a.depth - b.depth || a.x - b.x || a.name.localeCompare(b.name)
      );

      return (
        <div style={{ overflowX: "auto", overflowY: "hidden", paddingBottom: 6, maxHeight: 520 }}>
          <svg width={svgWidth} height={svgHeight} style={{ display: "block", margin: "0 auto" }}>
            <g>
              {drawableConnectors.map(edge => {
                const sx = edge.from.x + CHIP_W / 2;
                const sy = edge.from.y + CHIP_H;
                const tx = edge.to.x + CHIP_W / 2;
                const ty = edge.to.y;
                const elbow = sy + Math.max(16, (ty - sy) / 2);
                return (
                  <path
                    key={edge.toSink ? `${edge.fromKey}->sink` : `${edge.fromKey}->${edge.toKey}`}
                    d={`M ${sx} ${sy} V ${elbow} H ${tx} V ${ty}`}
                    fill="none"
                    stroke="#ffffff24"
                    strokeWidth="1.2"
                  />
                );
              })}
            </g>
            <g>
              {visibleNodes.map(node => {
                const primaryTreeNum = [...node.treeNums][0];
                const active = node.treeNums.has(currentPath) || [...node.treeNums].some(treeNum => pathSet.has(treeNum));
                const selected = node.treeNums.has(selectedPath);
                const color = primaryTreeNum === "D" ? TREE_COLOR : chemColor(primaryTreeNum.slice(0, 3));
                const canNavigate = node.treeNum !== "D";
                return (
                  <g key={node.key} transform={`translate(${node.x}, ${node.y})`} style={{ cursor: canNavigate ? "pointer" : "default" }} onClick={() => canNavigate && setSelectedPath(primaryTreeNum)}>
                    <rect
                      width={CHIP_W}
                      height={CHIP_H}
                      rx="4"
                      fill={selected ? color + "36" : active ? color + "22" : "#151922"}
                      stroke={selected ? color : active ? color + "aa" : color + "55"}
                      strokeWidth={selected ? "1.4" : "1"}
                    />
                    <text x="8" y="11" fill={active ? "#ffffff" : "#ffffffc8"} fontFamily="IBM Plex Mono, monospace" fontSize="7.4">
                      {node.name.length > 20 ? node.name.slice(0, 18) + "..." : node.name}
                    </text>
                    <text x="8" y="21" fill={color} fontFamily="IBM Plex Mono, monospace" fontSize="6.2">
                      {node.treeNums.size > 1 ? `${node.treeNums.size} placements` : node.treeNum}
                    </text>
                  </g>
                );
              })}
              <g transform={`translate(${sinkX}, ${sinkY})`} style={{ cursor: "pointer" }} onClick={() => setSelectedPath(currentPath)}>
                <rect width={CHIP_W} height={CHIP_H} rx="4" fill={selectedPath === currentPath ? TREE_COLOR + "36" : TREE_COLOR + "24"} stroke={TREE_COLOR} strokeWidth={selectedPath === currentPath ? "1.4" : "1"} />
                <text x="8" y="11" fill="#ffffff" fontFamily="IBM Plex Mono, monospace" fontSize="7.4">
                  {sinkName.length > 20 ? sinkName.slice(0, 18) + "..." : sinkName}
                </text>
                <text x="8" y="21" fill={TREE_COLOR} fontFamily="IBM Plex Mono, monospace" fontSize="6.2">
                  {currentPath === "D" ? "D" : `${paths.length} placements`}
                </text>
              </g>
            </g>
          </svg>
        </div>
      );
  }

  function TagChildren({ parentTreeNum, color, depth = 0 }) {
    const kids = (childrenMap.get(parentTreeNum) || []).sort((a, b) =>
      a.term.name.localeCompare(b.term.name)
    );
    if (kids.length === 0) return null;
    const openChild = kids.find(({ treeNum }) => pathSet.has(treeNum));

    return (
      <div style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "flex-start",
        gap: 4,
        marginTop: depth === 0 ? 8 : 4,
        marginLeft: Math.min(depth * 10, 34),
        paddingLeft: depth > 0 ? 10 : 0,
        borderLeft: depth > 0 ? `1px solid ${color}28` : "none",
      }}>
        {kids.map(({ term, treeNum }) => {
          const childCount = (childrenMap.get(treeNum) || []).length;
          const active = treeNum === currentPath;
          const onPath = pathSet.has(treeNum);
          return (
            <button
              key={treeNum}
              type="button"
              title={treeNum}
              onClick={() => navigateTo(treeNum)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                maxWidth: "100%",
                minHeight: 22,
                padding: "4px 8px",
                background: active ? color + "30" : onPath ? color + "20" : color + "10",
                border: `1px solid ${active || onPath ? color + "88" : color + "30"}`,
                borderRadius: 999,
                cursor: "pointer",
                fontFamily: mono,
                fontSize: 8,
                color: active ? "#fff" : onPath ? "#ffffffd8" : "#ffffffb8",
                lineHeight: 1.25,
              }}
            >
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{term.name}</span>
              {childCount > 0 && <span style={{ color: color + "88", fontSize: 7 }}>{childCount}</span>}
            </button>
          );
        })}
        {openChild && (
          <div style={{ flexBasis: "100%" }}>
            <TagChildren parentTreeNum={openChild.treeNum} color={color} depth={depth + 1} />
          </div>
        )}
      </div>
    );
  }

  function TagHierarchySelector() {
    const activeRoot = currentPath === "D" ? null : currentPath.split(".")[0];
    const groupedRoots = new Set(CHEM_GROUPS.flatMap(group => group.branches));
    const otherRoots = (childrenMap.get("D") || [])
      .filter(root => !groupedRoots.has(root.treeNum))
      .map(root => root.treeNum);
    const groups = otherRoots.length
      ? [...CHEM_GROUPS, { id: "other", label: "Other", color: TREE_COLOR, branches: otherRoots }]
      : CHEM_GROUPS;

    return (
      <div style={{ display: "grid", gap: 10 }}>
        {groups.map(group => {
          const roots = group.branches
            .map(treeNum => ({ treeNum, term: nodeByPath.get(treeNum) }))
            .filter(root => root.term);
          const selectedInGroup = activeRoot && roots.some(root => root.treeNum === activeRoot);
          const color = group.color;
          return (
            <section key={group.id} style={{
              padding: 11,
              background: color + "08",
              border: `1px solid ${color}24`,
              borderRadius: 8,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, marginBottom: 8 }}>
                <div style={{ fontFamily: mono, fontSize: 8, color, letterSpacing: 1.4, fontWeight: 700 }}>{group.label.toUpperCase()}</div>
                <div style={{ fontFamily: mono, fontSize: 8, color: "#ffffff35" }}>{roots.length} branches</div>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {roots.map(root => {
                  const childCount = (childrenMap.get(root.treeNum) || []).length;
                  const active = currentPath === root.treeNum;
                  const onPath = pathSet.has(root.treeNum);
                  return (
                    <button
                      key={root.treeNum}
                      type="button"
                      onClick={() => navigateTo(root.treeNum)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "5px 8px",
                        background: active ? color + "26" : onPath ? color + "1d" : color + "10",
                        border: `1px solid ${active || onPath ? color + "88" : color + "32"}`,
                        borderRadius: 999,
                        cursor: "pointer",
                        fontFamily: mono,
                        fontSize: 8,
                        color: active ? "#fff" : onPath ? "#ffffffd8" : "#ffffffb8",
                        lineHeight: 1.25,
                      }}
                    >
                      <span style={{ color }}>{root.treeNum}</span>
                      <span>{root.term.name}</span>
                      <span style={{ color: "#ffffff35", fontSize: 7 }}>{childCount}</span>
                    </button>
                  );
                })}
              </div>
              {selectedInGroup && (
                <div style={{
                  marginTop: 10,
                  padding: 10,
                  background: color + "09",
                  border: `1px solid ${color}24`,
                  borderRadius: 8,
                }}>
                  <TagChildren parentTreeNum={activeRoot} color={color} />
                </div>
              )}
            </section>
          );
        })}
      </div>
    );
  }

  return (
    <div style={{ background: BG, height: "100%", overflow: "hidden", display: "flex", flexDirection: "column" }}>
    <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
      {pageChrome}
      <section style={{ borderBottom: "1px solid #ffffff0d", padding: "12px 16px 10px", fontFamily: mono }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ flex: 1, display: "flex", alignItems: "center", background: "#ffffff0a", border: `1px solid ${q.length >= 2 ? TREE_COLOR + "77" : "#ffffff18"}`, borderRadius: 5, padding: "0 9px" }}>
            <span style={{ fontSize: 10, color: "#ffffff33", marginRight: 7 }}>⌕</span>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="search D tree terms..."
              style={{ flex: 1, minWidth: 0, background: "transparent", border: "none", outline: "none", fontFamily: mono, fontSize: 10, color: "#fff", padding: "9px 0", caretColor: TREE_COLOR }}
            />
          </div>
        </div>
        {searchResults.length > 0 && (
          <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingTop: 8, paddingBottom: 1 }}>
            {searchResults.map(term => {
              const paths = term.treeNums.filter(n => n.startsWith("D")).sort();
              const firstPath = paths[0];
              return (
                <button
                  key={term.ui}
                  onClick={() => { if (firstPath) navigateTo(firstPath); setQuery(""); }}
                  style={{ flex: "0 0 210px", textAlign: "left", padding: "7px 9px", background: "#ffffff06", border: "1px solid #ffffff0f", borderRadius: 5, cursor: "pointer", fontFamily: mono }}
                >
                  <div style={{ fontSize: 8.5, color: "#ffffffc8", lineHeight: 1.35, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{term.name}</div>
                  <div style={{ fontSize: 7, color: "#ffffff33", marginTop: 4 }}>{paths.length} D placement{paths.length === 1 ? "" : "s"}</div>
                </button>
              );
            })}
          </div>
        )}
      </section>
      <div style={{ display: "grid", gridTemplateColumns: "430px minmax(430px, 1fr)", alignItems: "start" }}>
      <aside style={{ borderRight: "1px solid #ffffff0d", padding: "16px 14px 22px" }}>
        <TagHierarchySelector />
      </aside>

      <main style={{ padding: "18px 22px 24px", position: "sticky", top: 0, alignSelf: "start" }}>
        <section style={{ marginBottom: 14 }}>
          <div style={{ background: "#ffffff04", border: "1px solid #ffffff0d", borderRadius: 7, padding: "10px 11px" }}>
            <PlacementDag paths={navigationPlacements.length ? navigationPlacements : [currentPath]} />
          </div>
        </section>
      </main>
      </div>
      </div>
      <div style={{ flexShrink: 0, padding: 0, background: "linear-gradient(180deg,rgba(15,17,23,0),#0f1117 30%)", boxShadow: "0 -18px 34px rgba(0,0,0,0.34)" }}>
        <MeshInspectorQueryDock selected={selectedDetail} query={queryBuilder} layout="bottom" />
      </div>
    </div>
  );
}

export default function MeshDConcepts() {
  const { data, loading } = useDData();
  const pageChrome = <ChemicalsPageChrome />;

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: BG }}>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&display=swap" rel="stylesheet" />

      <div style={{ flex: 1, overflow: "hidden" }}>
        {loading ? <Loading /> : <ChemicalsTagSelectorDag data={data} pageChrome={pageChrome} />}
      </div>
    </div>
  );
}
