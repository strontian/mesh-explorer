import { useState } from "react";
import { LoadingMesh, useMeshTreeData } from "./mesh_overview_concept.jsx";
import { BODY_SILHOUETTE_PATH } from "./mesh_c_concepts.jsx";
import {
  FloatingMeshDetailPanel,
  FloatingMeshQueryPanel,
  usePersistentMeshQueries,
} from "./mesh_query_ui.jsx";
import { MeshPageHeader } from "./mesh_page_header.jsx";

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

const NON_SPATIAL_ANATOMY = ["A10", "A11", "A12", "A13", "A16"];
const ANATOMY_OVERVIEW_GROUPS = [
  {
    id: "regions",
    label: "Regions, Structure & Covering",
    branches: ["A01", "A02", "A17"],
    color: "#DDB892",
  },
  {
    id: "systems",
    label: "Organ Systems",
    branches: ["A03", "A04", "A05", "A06", "A07", "A08", "A09", "A14", "A15"],
    color: "#81B29A",
  },
  {
    id: "microscopic",
    label: "Tissues, Cells, Fluids & Development",
    branches: ["A10", "A11", "A12", "A13", "A16"],
    color: "#C3A8D8",
  },
];

function AnatomyBodyMap({ data }) {
  const { branches, childrenMap, countDescendants } = data;
  const [selectedRoot, setSelectedRoot] = useState(null);
  const [selectedTag, setSelectedTag] = useState(null);
  const [expandedNodes, setExpandedNodes] = useState([]);
  const [hovered, setHovered] = useState(null);
  const queryBuilder = usePersistentMeshQueries();

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

  function selectDiagramRoot(event, treeNum) {
    event.stopPropagation();
    selectRoot(treeNum);
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
          const collected = queryBuilder.allIds.has(term.name);
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

  function renderTopLevelOverview() {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {ANATOMY_OVERVIEW_GROUPS.map(group => {
          const groupBranches = group.branches.map(treeNum => byTN.get(treeNum)).filter(Boolean);
          const total = groupBranches.reduce((sum, branch) => sum + branch.totalCount, 0);
          const activeInGroup = selectedRoot && group.branches.includes(selectedRoot);
          const activeBranch = activeInGroup ? byTN.get(selectedRoot) : null;
          const activeColor = activeInGroup ? (A_BRANCH_COLORS[selectedRoot] || group.color) : group.color;
          return (
            <div key={group.id} style={{ padding: 12, background: group.color + "08", border: `1px solid ${group.color}24`, borderRadius: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, marginBottom: 8 }}>
                <div style={{ fontFamily: mono, fontSize: 8, color: group.color, letterSpacing: 1.4, fontWeight: 700 }}>{group.label.toUpperCase()}</div>
                <div style={{ fontFamily: mono, fontSize: 8, color: "#ffffff35" }}>{total.toLocaleString()} terms</div>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {groupBranches.map(branch => {
                  const color = A_BRANCH_COLORS[branch.treeNum] || group.color;
                  const collected = queryBuilder.allIds.has(branch.term.name);
                  const active = selectedRoot === branch.treeNum;
                  return (
                    <button
                      key={branch.treeNum}
                      type="button"
                      onClick={() => selectRoot(branch.treeNum)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "5px 8px",
                        background: active ? color + "24" : collected ? color + "1d" : color + "10",
                        border: `1px solid ${active ? color + "90" : collected ? color + "66" : color + "32"}`,
                        borderRadius: 999,
                        cursor: "pointer",
                        fontFamily: mono,
                        fontSize: 8,
                        color: active ? "#fff" : collected ? color : "#ffffffb8",
                        lineHeight: 1.25,
                      }}
                    >
                      <span style={{ color }}>{branch.treeNum}</span>
                      <span>{branch.term.name}</span>
                      <span style={{ color: "#ffffff35", fontSize: 7 }}>{branch.totalCount}</span>
                    </button>
                  );
                })}
              </div>
              {activeInGroup && (
                <div style={{
                  marginTop: 10,
                  padding: 10,
                  background: activeColor + "09",
                  border: `1px solid ${activeColor + "24"}`,
                  borderRadius: 8,
                }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
                    <div style={{ fontFamily: mono, fontSize: 7, color: activeColor + "aa", letterSpacing: 1.5 }}>{selectedRoot}</div>
                    <div style={{ fontFamily: mono, fontSize: 8, color: "#ffffff42" }}>{activeBranch?.term.name}</div>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", gap: 4 }}>
                    {renderTags(selectedRoot, activeColor)}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {branches.some(branch => !ANATOMY_OVERVIEW_GROUPS.some(group => group.branches.includes(branch.treeNum))) && (
          <div style={{ padding: 12, background: "#ffffff05", border: "1px solid #ffffff10", borderRadius: 8 }}>
            <div style={{ fontFamily: mono, fontSize: 8, color: "#ffffff45", letterSpacing: 1.4, fontWeight: 700, marginBottom: 8 }}>OTHER</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {branches
                .filter(branch => !ANATOMY_OVERVIEW_GROUPS.some(group => group.branches.includes(branch.treeNum)))
                .map(branch => {
                  const color = A_BRANCH_COLORS[branch.treeNum] || TREE_COLOR;
                  const collected = queryBuilder.allIds.has(branch.term.name);
                  const active = selectedRoot === branch.treeNum;
            return (
              <button
                key={branch.treeNum}
                type="button"
                onClick={() => selectRoot(branch.treeNum)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "5px 8px",
                  background: active ? color + "24" : collected ? color + "1d" : color + "10",
                  border: `1px solid ${active ? color + "90" : collected ? color + "66" : color + "32"}`,
                  borderRadius: 999,
                  cursor: "pointer",
                  fontFamily: mono,
                  fontSize: 8,
                  color: active ? "#fff" : collected ? color : "#ffffffb8",
                  lineHeight: 1.25,
                }}
              >
                <span style={{ color }}>{branch.treeNum}</span>
                <span>{branch.term.name}</span>
                <span style={{ color: "#ffffff35", fontSize: 7 }}>{branch.totalCount}</span>
              </button>
            );
                })}
            </div>
            {selectedRoot && !ANATOMY_OVERVIEW_GROUPS.some(group => group.branches.includes(selectedRoot)) && (
              <div style={{
                marginTop: 10,
                padding: 10,
                background: (A_BRANCH_COLORS[selectedRoot] || TREE_COLOR) + "09",
                border: `1px solid ${(A_BRANCH_COLORS[selectedRoot] || TREE_COLOR) + "24"}`,
                borderRadius: 8,
              }}>
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", gap: 4 }}>
                  {renderTags(selectedRoot, A_BRANCH_COLORS[selectedRoot] || TREE_COLOR)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  const activeTreeNum = selectedTag || selectedRoot;
  const activeEntry = activeTreeNum ? treeIndex.get(activeTreeNum) : null;
  const activeBranch = selectedRoot ? byTN.get(selectedRoot) : null;
  const activeColor = A_BRANCH_COLORS[selectedRoot] || TREE_COLOR;
  const activeChildren = activeTreeNum ? getChildren(activeTreeNum) : [];
  const selectedDetail = activeEntry ? {
    id: activeEntry.term.name,
    branch: "a",
    color: activeColor,
    treeNum: activeTreeNum,
    ui: activeEntry.term.ui,
    note: activeEntry.term.note || activeEntry.term.scopeNote,
  } : {
    id: "Anatomy",
    branch: "a",
    color: TREE_COLOR,
    treeNum: "A",
    note: "Body structures and systems, with spatial branches supported by a body-map selector and non-spatial anatomy grouped nearby.",
  };
  const zoneFill = (treeNum) => selectedRoot === treeNum || hovered === treeNum ? (A_BRANCH_COLORS[treeNum] || TREE_COLOR) + "2e" : "#ffffff0a";
  const zoneStroke = (treeNum) => selectedRoot === treeNum ? (A_BRANCH_COLORS[treeNum] || TREE_COLOR) : hovered === treeNum ? (A_BRANCH_COLORS[treeNum] || TREE_COLOR) + "99" : "#ffffff1a";
  const zoneWidth = (treeNum) => selectedRoot === treeNum ? 2 : 1;
  const callouts = [
    ["A08", 112, 116, 232, 126, 18, 120, "A08 Nervous System"],
    ["A09", 112, 143, 238, 130, 18, 147, "A09 Sense Organs"],
    ["A14", 112, 196, 226, 195, 8, 200, "A14 Stomatognathic"],
    ["A04", 112, 252, 180, 252, 18, 256, "A04 Respiratory"],
    ["A07", 388, 247, 291, 247, 396, 251, "A07 Cardiovascular"],
    ["A15", 388, 278, 318, 278, 396, 282, "A15 Hemic & Immune"],
    ["A03", 112, 332, 172, 332, 18, 336, "A03 Digestive"],
    ["A05", 388, 407, 322, 407, 396, 411, "A05 Urogenital"],
    ["A02", 388, 470, 338, 430, 396, 474, "A02 Musculoskeletal"],
    ["A17", 112, 560, 206, 560, 24, 564, "A17 Integumentary"],
  ];

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden", background: BG }}>
      <MeshPageHeader
        letter="A"
        title="Anatomy"
        description="Body structures and systems, with spatial branches supported by a body-map selector and non-spatial anatomy grouped nearby."
        color={TREE_COLOR}
        onClick={() => selectRoot(null)}
        active={!selectedRoot && !selectedTag}
      />
      <div style={{ flex: 1, overflowY: "auto", display: "grid", gridTemplateColumns: "minmax(360px, 0.9fr) minmax(440px, 1.1fr)", alignItems: "start", paddingBottom: 230, boxSizing: "border-box" }}>
        <section style={{ borderRight: "1px solid #ffffff0d", padding: "18px 22px" }}>
        <div style={{ fontFamily: mono, fontSize: 11, color: TREE_COLOR, letterSpacing: 3, marginBottom: 5 }}>BODY MAP</div>
        <div style={{ fontFamily: mono, fontSize: 8, color: "#ffffff38", lineHeight: 1.55, marginBottom: 14 }}>
          Spatial anatomy branches are placed on the figure. Non-spatial branches remain as tags below.
        </div>

        <div style={{ border: "1px solid #ffffff14", borderRadius: 8, background: "linear-gradient(180deg,#ffffff05,transparent)", padding: 10, marginBottom: 12 }}>
          <svg viewBox="0 0 523 740" onClick={() => selectRoot(null)} style={{ display: "block", width: "100%", maxHeight: 590, margin: "0 auto", cursor: "default" }} aria-label="Anatomy body selector">
            <path d={BODY_SILHOUETTE_PATH} fill="#ffffff14" stroke="#ffffff33" strokeWidth={1.5} />
            <path d={BODY_SILHOUETTE_PATH} fill="transparent" stroke={selectedRoot === "A17" || hovered === "A17" ? A_BRANCH_COLORS.A17 : "transparent"} strokeWidth={selectedRoot === "A17" ? 4 : 3} style={{ cursor: "pointer", pointerEvents: "stroke", transition: "stroke 0.15s" }} onClick={(event) => selectDiagramRoot(event, "A17")} onMouseEnter={() => setHovered("A17")} onMouseLeave={() => setHovered(null)} />

            <ellipse onClick={(event) => selectDiagramRoot(event, "A08")} onMouseEnter={() => setHovered("A08")} onMouseLeave={() => setHovered(null)} cx={249} cy={135} rx={34} ry={42} fill={zoneFill("A08")} stroke={zoneStroke("A08")} strokeWidth={zoneWidth("A08")} style={{ cursor:"pointer", transition:"all 0.15s" }} />
            <ellipse onClick={(event) => selectDiagramRoot(event, "A09")} onMouseEnter={() => setHovered("A09")} onMouseLeave={() => setHovered(null)} cx={238} cy={130} rx={11} ry={9} fill={zoneFill("A09")} stroke={zoneStroke("A09")} strokeWidth={zoneWidth("A09")} style={{ cursor:"pointer", transition:"all 0.15s" }} />
            <ellipse onClick={(event) => selectDiagramRoot(event, "A09")} onMouseEnter={() => setHovered("A09")} onMouseLeave={() => setHovered(null)} cx={260} cy={130} rx={11} ry={9} fill={zoneFill("A09")} stroke={zoneStroke("A09")} strokeWidth={zoneWidth("A09")} style={{ cursor:"pointer", transition:"all 0.15s" }} />
            <rect onClick={(event) => selectDiagramRoot(event, "A14")} onMouseEnter={() => setHovered("A14")} onMouseLeave={() => setHovered(null)} x={228} y={178} width={42} height={34} rx={12} fill={zoneFill("A14")} stroke={zoneStroke("A14")} strokeWidth={zoneWidth("A14")} style={{ cursor:"pointer", transition:"all 0.15s" }} />
            <rect onClick={(event) => selectDiagramRoot(event, "A04")} onMouseEnter={() => setHovered("A04")} onMouseLeave={() => setHovered(null)} x={180} y={220} width={66} height={78} rx={18} fill={zoneFill("A04")} stroke={zoneStroke("A04")} strokeWidth={zoneWidth("A04")} style={{ cursor:"pointer", transition:"all 0.15s" }} />
            <rect onClick={(event) => selectDiagramRoot(event, "A07")} onMouseEnter={() => setHovered("A07")} onMouseLeave={() => setHovered(null)} x={247} y={220} width={44} height={78} rx={16} fill={zoneFill("A07")} stroke={zoneStroke("A07")} strokeWidth={zoneWidth("A07")} style={{ cursor:"pointer", transition:"all 0.15s" }} />
            <rect onClick={(event) => selectDiagramRoot(event, "A15")} onMouseEnter={() => setHovered("A15")} onMouseLeave={() => setHovered(null)} x={292} y={220} width={26} height={78} rx={12} fill={zoneFill("A15")} stroke={zoneStroke("A15")} strokeWidth={zoneWidth("A15")} style={{ cursor:"pointer", transition:"all 0.15s" }} />
            <rect onClick={(event) => selectDiagramRoot(event, "A03")} onMouseEnter={() => setHovered("A03")} onMouseLeave={() => setHovered(null)} x={172} y={300} width={78} height={74} rx={18} fill={zoneFill("A03")} stroke={zoneStroke("A03")} strokeWidth={zoneWidth("A03")} style={{ cursor:"pointer", transition:"all 0.15s" }} />
            <rect onClick={(event) => selectDiagramRoot(event, "A05")} onMouseEnter={() => setHovered("A05")} onMouseLeave={() => setHovered(null)} x={176} y={376} width={146} height={62} rx={24} fill={zoneFill("A05")} stroke={zoneStroke("A05")} strokeWidth={zoneWidth("A05")} style={{ cursor:"pointer", transition:"all 0.15s" }} />
            {[
              "M170,232 C162,290 159,350 157,408 C161,420 172,418 174,405 C178,350 182,295 188,240 C184,234 176,231 170,232 Z",
              "M329,232 C337,290 340,350 342,408 C338,420 327,418 325,405 C321,350 317,295 311,240 C315,234 323,231 329,232 Z",
              "M205,442 C193,510 189,590 195,650 C198,668 210,670 214,652 C220,590 224,510 245,446 C232,440 218,440 205,442 Z",
              "M294,442 C306,510 310,590 304,650 C301,668 289,670 285,652 C279,590 275,510 254,446 C267,440 281,440 294,442 Z",
            ].map((d, i) => (
              <path key={i} onClick={(event) => selectDiagramRoot(event, "A02")} onMouseEnter={() => setHovered("A02")} onMouseLeave={() => setHovered(null)} d={d} fill={zoneFill("A02")} stroke={zoneStroke("A02")} strokeWidth={zoneWidth("A02")} style={{ cursor:"pointer", transition:"all 0.15s" }} />
            ))}

            {callouts.map(([id, x1, y1, x2, y2, tx, ty, label]) => {
              const color = A_BRANCH_COLORS[id] || TREE_COLOR;
              const active = selectedRoot === id || hovered === id;
              return (
                <g key={id} onClick={(event) => selectDiagramRoot(event, id)} onMouseEnter={() => setHovered(id)} onMouseLeave={() => setHovered(null)} style={{ cursor:"pointer" }}>
                  <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={active ? color : "#ffffff33"} strokeWidth={1} />
                  <text x={tx} y={ty} fontFamily={mono} fontSize={8.4} fill={active ? color : "#ffffff55"}>{label}</text>
                </g>
              );
            })}
          </svg>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          <button
            type="button"
            onClick={() => selectRoot(null)}
            style={{ padding: "6px 9px", display: "inline-flex", alignItems: "center", gap: 6, fontFamily: mono, fontSize: 8, background: selectedRoot ? "#ffffff06" : TREE_COLOR + "20", border: `1px solid ${selectedRoot ? "#ffffff0f" : TREE_COLOR}`, borderRadius: 999, color: selectedRoot ? "#ffffff70" : TREE_COLOR, cursor: "pointer" }}
          >
            <span>A</span>
            <span>Top Level</span>
          </button>
          {NON_SPATIAL_ANATOMY.map(treeNum => {
            const branch = byTN.get(treeNum);
            const color = A_BRANCH_COLORS[treeNum] || TREE_COLOR;
            const active = selectedRoot === treeNum;
            return (
              <button
                key={treeNum}
                type="button"
                onClick={() => selectRoot(treeNum)}
                style={{ padding: "6px 9px", display: "inline-flex", alignItems: "center", gap: 6, fontFamily: mono, fontSize: 8, background: active ? color + "20" : queryBuilder.allIds.has(branch?.term.name) ? color + "18" : "#ffffff06", border: `1px solid ${active ? color : queryBuilder.allIds.has(branch?.term.name) ? color + "66" : "#ffffff0f"}`, borderRadius: 999, color: active ? "#fff" : queryBuilder.allIds.has(branch?.term.name) ? color : "#ffffff70", cursor: "pointer" }}
              >
                <span style={{ color }}>{treeNum}</span>
                <span>{branch?.term.name || treeNum}</span>
              </button>
            );
          })}
        </div>
        </section>

        <section style={{ padding: "18px 22px" }}>
          {renderTopLevelOverview()}
        </section>
      </div>
      <FloatingMeshDetailPanel selected={selectedDetail} query={queryBuilder} />
      <FloatingMeshQueryPanel query={queryBuilder} />
    </div>
  );
}

export default function MeshAConcepts() {
  const { data, loading } = useMeshTreeData("A", A_BRANCH_COLORS, TREE_COLOR);

  return (
    <div style={{ width: "100%", height: "100vh", display: "flex", flexDirection: "column", background: BG }}>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&display=swap" rel="stylesheet" />
      <div style={{ flex: 1, overflow: "hidden" }}>
        {loading ? <LoadingMesh /> : <AnatomyBodyMap data={data} />}
      </div>
    </div>
  );
}
