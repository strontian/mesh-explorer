import { useState, useEffect } from "react";
import { OverviewConceptShell } from "./mesh_overview_concept.jsx";

const mono = "'IBM Plex Mono', monospace";
const BG = "#0f1117";
const TREE_COLOR = "#7EC8E3";

// ── DATA HOOK ─────────────────────────────────────────────────────────────
function useEData() {
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

      const raw = (childrenMap.get("E") || []).sort((a, b) =>
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

// ═══════════════════════════════════════════════════════════════════════════
// SKETCH 1 — CLINICAL PIPELINE
// Horizontal flow: Diagnosis → Therapeutics → Surgery → Anesthesia
// Investigative Techniques as a supporting layer below.
// Equipment & Dentistry as side nodes.
// ═══════════════════════════════════════════════════════════════════════════
function ClinicalPipeline({ data }) {
  const { branches, childrenMap } = data;
  const [hovered, setHovered] = useState(null);

  // Index branches by treeNum
  const byTN = {};
  for (const b of branches) byTN[b.treeNum] = b;

  // Main pipeline order
  const pipeline = ["E01", "E02", "E04", "E03"];
  // Supporting
  const support = ["E05"];
  // Side
  const sides = ["E07", "E06"];

  function getChildren(treeNum) {
    return (childrenMap.get(treeNum) || [])
      .slice(0, 6)
      .map(c => c.term.name);
  }

  function NodeCard({ treeNum, style = {}, accent = TREE_COLOR }) {
    const b = byTN[treeNum];
    if (!b) return null;
    const isHov = hovered === treeNum;
    const children = isHov ? getChildren(treeNum) : [];
    return (
      <div
        onMouseEnter={() => setHovered(treeNum)}
        onMouseLeave={() => setHovered(null)}
        style={{
          position: "relative",
          background: isHov ? accent + "22" : "#ffffff08",
          border: `1px solid ${isHov ? accent : "#ffffff18"}`,
          borderRadius: 10,
          padding: "14px 16px",
          minWidth: 140,
          cursor: "default",
          transition: "all 0.15s",
          zIndex: isHov ? 10 : 1,
          ...style,
        }}
      >
        <div style={{ fontFamily: mono, fontSize: 7.5, color: accent + "99", letterSpacing: 2, marginBottom: 4 }}>
          {treeNum}
        </div>
        <div style={{ fontFamily: mono, fontSize: 10.5, color: "#ffffffcc", fontWeight: 600, lineHeight: 1.3, marginBottom: 6 }}>
          {b.term.name}
        </div>
        <div style={{ fontFamily: mono, fontSize: 8, color: accent, opacity: 0.85 }}>
          {b.totalCount.toLocaleString()} terms
        </div>
        {isHov && children.length > 0 && (
          <div style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            background: "#1a1d26",
            border: `1px solid ${accent}44`,
            borderRadius: 6,
            padding: "8px 10px",
            zIndex: 20,
            minWidth: 200,
            boxShadow: "0 4px 20px #00000066",
          }}>
            <div style={{ fontFamily: mono, fontSize: 7, color: "#ffffff33", letterSpacing: 2, marginBottom: 5 }}>
              TOP CHILDREN
            </div>
            {children.map((name, i) => (
              <div key={i} style={{ fontFamily: mono, fontSize: 8, color: "#ffffffaa", paddingBottom: 3, borderBottom: "1px solid #ffffff08", marginBottom: 3 }}>
                {name}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  function Arrow({ label }) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, flexShrink: 0 }}>
        <div style={{ width: 36, height: 1, background: TREE_COLOR + "55" }} />
        <div style={{ fontFamily: mono, fontSize: 6, color: TREE_COLOR + "55", letterSpacing: 1 }}>{label}</div>
        <svg width={10} height={10} style={{ marginLeft: 26, marginTop: -8 }}>
          <polygon points="0,0 10,5 0,10" fill={TREE_COLOR + "55"} />
        </svg>
      </div>
    );
  }

  return (
    <div style={{ background: BG, width: "100%", height: "100%", overflow: "auto", padding: 32 }}>
      <div style={{ fontFamily: mono, fontSize: 8, color: "#ffffff22", letterSpacing: 3, marginBottom: 24 }}>
        CLINICAL PIPELINE — TREE E BRANCH RELATIONSHIPS
      </div>

      {/* Main pathway */}
      <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 40 }}>
        {pipeline.map((tn, i) => (
          <div key={tn} style={{ display: "flex", alignItems: "center" }}>
            <NodeCard treeNum={tn} />
            {i < pipeline.length - 1 && <Arrow label="" />}
          </div>
        ))}
      </div>

      {/* Supporting layer */}
      <div style={{ marginBottom: 40 }}>
        <div style={{ fontFamily: mono, fontSize: 7, color: "#ffffff22", letterSpacing: 2, marginBottom: 12 }}>
          INVESTIGATIVE SUPPORT LAYER
        </div>
        <div style={{
          display: "flex",
          alignItems: "stretch",
          background: "#7EC8E308",
          border: "1px dashed #7EC8E322",
          borderRadius: 10,
          padding: "12px 16px",
          gap: 12,
        }}>
          {support.map(tn => (
            <NodeCard key={tn} treeNum={tn} accent="#A8DADC" />
          ))}
          <div style={{ fontFamily: mono, fontSize: 8, color: "#ffffff22", alignSelf: "center", maxWidth: 260, lineHeight: 1.7 }}>
            Investigative Techniques underpin all pipeline stages — generating the evidence that guides diagnosis, treatment selection, and outcome measurement.
          </div>
        </div>
      </div>

      {/* Side nodes */}
      <div>
        <div style={{ fontFamily: mono, fontSize: 7, color: "#ffffff22", letterSpacing: 2, marginBottom: 12 }}>
          SPECIALTY &amp; INFRASTRUCTURE
        </div>
        <div style={{ display: "flex", gap: 16 }}>
          {sides.map(tn => (
            <NodeCard key={tn} treeNum={tn} accent="#B0D4E8" />
          ))}
        </div>
      </div>

      {/* Legend */}
      <div style={{ marginTop: 48, display: "flex", gap: 20, flexWrap: "wrap" }}>
        {[
          { color: TREE_COLOR, label: "Core care pathway" },
          { color: "#A8DADC",  label: "Investigative support" },
          { color: "#B0D4E8",  label: "Specialty / Infrastructure" },
        ].map(l => (
          <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: l.color + "66", border: `1px solid ${l.color}` }} />
            <span style={{ fontFamily: mono, fontSize: 8, color: "#ffffff44" }}>{l.label}</span>
          </div>
        ))}
        <span style={{ fontFamily: mono, fontSize: 8, color: "#ffffff22", marginLeft: 8 }}>
          Hover any card to see top children
        </span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SKETCH 2 — BY TYPE GRID
// 3 meta-columns grouping E branches by clinical role.
// ═══════════════════════════════════════════════════════════════════════════

const TYPE_GROUPS = [
  {
    id: "diagnostic",
    label: "DIAGNOSTIC",
    color: "#64B5F6",
    branches: ["E01", "E05"],
    desc: "How we find & measure disease",
  },
  {
    id: "therapeutic",
    label: "THERAPEUTIC & SURGICAL",
    color: "#81C784",
    branches: ["E02", "E03", "E04"],
    desc: "How we treat & intervene",
  },
  {
    id: "equipment",
    label: "EQUIPMENT & SPECIALTY",
    color: "#FFB74D",
    branches: ["E06", "E07"],
    desc: "Tools, devices & dental practice",
  },
];

function ByTypeGrid({ data }) {
  const { branches, childrenMap } = data;
  const [selected, setSelected] = useState(null);

  const byTN = {};
  for (const b of branches) byTN[b.treeNum] = b;

  function getChildren(treeNum, limit = null) {
    const children = (childrenMap.get(treeNum) || []).sort((a, b) =>
      a.treeNum.localeCompare(b.treeNum, undefined, { numeric: true })
    );
    return limit == null ? children : children.slice(0, limit);
  }

  return (
    <div style={{ background: BG, width: "100%", height: "100%", overflow: "auto", padding: 32 }}>
      <div style={{ fontFamily: mono, fontSize: 8, color: "#ffffff22", letterSpacing: 3, marginBottom: 24 }}>
        TECHNIQUES BY TYPE — TREE E BRANCHES GROUPED BY CLINICAL ROLE
      </div>

      <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
        {TYPE_GROUPS.map(group => (
          <div key={group.id} style={{ flex: 1, minWidth: 0 }}>
            {/* Column header */}
            <div style={{
              background: group.color + "18",
              border: `1px solid ${group.color}44`,
              borderRadius: "8px 8px 0 0",
              padding: "10px 14px",
              marginBottom: 0,
              borderBottom: `2px solid ${group.color}`,
            }}>
              <div style={{ fontFamily: mono, fontSize: 9, color: group.color, letterSpacing: 2, fontWeight: 700 }}>
                {group.label}
              </div>
              <div style={{ fontFamily: mono, fontSize: 8, color: "#ffffff44", marginTop: 3 }}>
                {group.desc}
              </div>
              <div style={{ fontFamily: mono, fontSize: 8, color: group.color + "aa", marginTop: 5 }}>
                {group.branches.reduce((sum, tn) => sum + (byTN[tn]?.totalCount ?? 0), 0).toLocaleString()} total terms
              </div>
            </div>

            {/* Branch cards */}
            <div style={{
              background: group.color + "06",
              border: `1px solid ${group.color}22`,
              borderTop: "none",
              borderRadius: "0 0 8px 8px",
              padding: 12,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}>
              {group.branches.map(tn => {
                const b = byTN[tn];
                if (!b) return null;
                const directKids = getChildren(tn);
                const visibleKids = selected === tn || directKids.some(k => k.treeNum === selected)
                  ? directKids
                  : directKids.slice(0, 5);
                const selectedChild = directKids.find(k => k.treeNum === selected);
                const selectedChildKids = selectedChild ? getChildren(selectedChild.treeNum) : [];
                const isSelected = selected === tn;
                return (
                  <div
                    key={tn}
                    onClick={() => setSelected(isSelected ? null : tn)}
                    style={{
                      background: isSelected ? group.color + "1a" : "#ffffff07",
                      border: `1px solid ${isSelected ? group.color + "66" : "#ffffff10"}`,
                      borderRadius: 7,
                      padding: "10px 12px",
                      cursor: "pointer",
                      transition: "background 0.15s, border-color 0.15s",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                      <div>
                        <span style={{ fontFamily: mono, fontSize: 7, color: group.color + "88", letterSpacing: 1 }}>{tn} </span>
                        <span style={{ fontFamily: mono, fontSize: 10, color: "#ffffffcc", fontWeight: 600 }}>{b.term.name}</span>
                      </div>
                      <div style={{ fontFamily: mono, fontSize: 8, color: group.color, flexShrink: 0, marginLeft: 8 }}>
                        {b.totalCount.toLocaleString()}
                      </div>
                    </div>
                    {/* Child chips */}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {visibleKids.map(({ term, treeNum }) => {
                        const childSelected = selected === treeNum;
                        return (
                        <button
                          key={treeNum}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelected(childSelected ? tn : treeNum);
                          }}
                          style={{
                          background: childSelected ? group.color + "28" : group.color + "15",
                          border: `1px solid ${childSelected ? group.color + "88" : group.color + "30"}`,
                          borderRadius: 3,
                          padding: "2px 6px",
                          fontFamily: mono,
                          fontSize: 7,
                          color: childSelected ? "#fff" : "#ffffffaa",
                          maxWidth: "100%",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          cursor: "pointer",
                        }}
                        >
                          {term.name}
                        </button>
                      );
                      })}
                      {selected !== tn && !selectedChild && directKids.length > visibleKids.length && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelected(tn);
                          }}
                          style={{
                            background: "transparent",
                            border: `1px dashed ${group.color}40`,
                            borderRadius: 3,
                            padding: "2px 6px",
                            fontFamily: mono,
                            fontSize: 7,
                            color: group.color + "aa",
                            cursor: "pointer",
                          }}
                        >
                          +{directKids.length - visibleKids.length} more
                        </button>
                      )}
                    </div>
                    {selectedChild && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          marginTop: 10,
                          padding: 10,
                          background: group.color + "08",
                          border: `1px solid ${group.color}24`,
                          borderRadius: 5,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
                          <div style={{ fontFamily: mono, fontSize: 7, color: group.color + "aa", letterSpacing: 1.4 }}>
                            CHILDREN
                          </div>
                          <div style={{ fontFamily: mono, fontSize: 8, color: "#ffffff55" }}>
                            {selectedChild.treeNum}
                          </div>
                        </div>
                        {selectedChildKids.length === 0 ? (
                          <div style={{ fontFamily: mono, fontSize: 8, color: "#ffffff33" }}>
                            No child terms.
                          </div>
                        ) : (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                            {selectedChildKids.map(({ term, treeNum }) => (
                              <div
                                key={treeNum}
                                title={treeNum}
                                style={{
                                  background: "#ffffff07",
                                  border: "1px solid #ffffff12",
                                  borderRadius: 999,
                                  padding: "3px 7px",
                                  fontFamily: mono,
                                  fontSize: 7,
                                  color: "#ffffffaa",
                                  lineHeight: 1.35,
                                }}
                              >
                                {term.name}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 24, fontFamily: mono, fontSize: 8, color: "#ffffff22" }}>
        Click a branch to show all direct sub-categories. Click a tag to show its children.
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SKETCH 3 — DEPTH MAP
// SVG rectangles: width = direct children count, height = totalCount/directCount
// (proxy for average depth). Color intensity = totalCount.
// ═══════════════════════════════════════════════════════════════════════════
function DepthMap({ data }) {
  const { branches } = data;
  const [hovered, setHovered] = useState(null);
  const [tooltip, setTooltip] = useState({ x: 0, y: 0 });

  // Compute per-branch metrics
  const metrics = branches.map(b => ({
    ...b,
    avgDepth: b.directCount > 0 ? b.totalCount / b.directCount : 0,
  }));

  const maxDirect = Math.max(...metrics.map(m => m.directCount), 1);
  const maxAvgDepth = Math.max(...metrics.map(m => m.avgDepth), 1);
  const maxTotal = Math.max(...metrics.map(m => m.totalCount), 1);

  // Layout: pack rectangles left-to-right in a 900×400 canvas
  const CANVAS_W = 860;
  const CANVAS_H = 360;
  const PAD = 6;
  const MARGIN = { top: 50, left: 60, right: 20, bottom: 50 };
  const plotW = CANVAS_W - MARGIN.left - MARGIN.right;
  const plotH = CANVAS_H - MARGIN.top - MARGIN.bottom;

  // Scale: width maps to directCount, height maps to avgDepth
  const maxBoxW = 160;
  const minBoxW = 40;
  const totalBoxW = metrics.reduce((sum, m) =>
    sum + minBoxW + (m.directCount / maxDirect) * (maxBoxW - minBoxW), 0
  ) + (metrics.length - 1) * PAD;

  const scaleW = plotW / totalBoxW;

  let cursor = 0;
  const rects = metrics.map(m => {
    const rawW = (minBoxW + (m.directCount / maxDirect) * (maxBoxW - minBoxW)) * scaleW;
    const rawH = (m.avgDepth / maxAvgDepth) * plotH;
    const x = cursor;
    cursor += rawW + PAD * scaleW;
    return { ...m, x, w: rawW, h: rawH };
  });

  // Color: interpolate from dim to bright based on totalCount
  function rectColor(totalCount) {
    const t = totalCount / maxTotal;
    // From muted teal to bright TREE_COLOR
    const r = Math.round(60 + t * (126 - 60));
    const g = Math.round(130 + t * (200 - 130));
    const b = Math.round(160 + t * (227 - 160));
    return `rgb(${r},${g},${b})`;
  }

  const hovR = hovered ? rects.find(r => r.treeNum === hovered) : null;

  return (
    <div style={{ background: BG, width: "100%", height: "100%", overflow: "auto", padding: 32 }}>
      <div style={{ fontFamily: mono, fontSize: 8, color: "#ffffff22", letterSpacing: 3, marginBottom: 8 }}>
        DEPTH MAP — TREE E: WIDTH = DIRECT CHILDREN · HEIGHT = AVG SUBTREE DEPTH PROXY · COLOR = TOTAL TERMS
      </div>
      <div style={{ fontFamily: mono, fontSize: 8, color: "#ffffff33", marginBottom: 20 }}>
        Tall &amp; narrow = deep hierarchies. Wide &amp; short = broad shallow branching. Bright = more terms.
      </div>

      <svg
        width="100%"
        viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
        style={{ display: "block", maxWidth: 900 }}
        onMouseLeave={() => setHovered(null)}
      >
        {/* Axes */}
        <line
          x1={MARGIN.left} y1={MARGIN.top}
          x2={MARGIN.left} y2={MARGIN.top + plotH}
          stroke="#ffffff18" strokeWidth={0.8}
        />
        <line
          x1={MARGIN.left} y1={MARGIN.top + plotH}
          x2={MARGIN.left + plotW} y2={MARGIN.top + plotH}
          stroke="#ffffff18" strokeWidth={0.8}
        />

        {/* Y-axis label */}
        <text
          x={12} y={MARGIN.top + plotH / 2}
          fontFamily={mono} fontSize={7} fill="#ffffff33"
          transform={`rotate(-90, 12, ${MARGIN.top + plotH / 2})`}
          textAnchor="middle"
        >
          AVG DEPTH PROXY
        </text>

        {/* X-axis label */}
        <text
          x={MARGIN.left + plotW / 2} y={CANVAS_H - 6}
          fontFamily={mono} fontSize={7} fill="#ffffff33"
          textAnchor="middle"
        >
          DIRECT CHILDREN COUNT (→ wider)
        </text>

        {/* Rectangles */}
        {rects.map(r => {
          const isHov = hovered === r.treeNum;
          const x = MARGIN.left + r.x;
          const y = MARGIN.top + plotH - r.h;
          const color = rectColor(r.totalCount);
          return (
            <g
              key={r.treeNum}
              onMouseEnter={e => { setHovered(r.treeNum); setTooltip({ x: e.clientX, y: e.clientY }); }}
              onMouseMove={e => setTooltip({ x: e.clientX, y: e.clientY })}
              style={{ cursor: "default" }}
            >
              <rect
                x={x} y={y} width={r.w} height={r.h}
                rx={4}
                fill={color + (isHov ? "ee" : "88")}
                stroke={isHov ? color : color + "55"}
                strokeWidth={isHov ? 1.5 : 0.8}
                style={{ transition: "all 0.12s" }}
              />
              {/* Branch label inside rect if tall enough */}
              {r.h > 28 && (
                <>
                  <text
                    x={x + r.w / 2} y={y + 14}
                    fontFamily={mono} fontSize={Math.min(9, r.w / 4)}
                    fill={isHov ? "#ffffff" : "#ffffffaa"}
                    textAnchor="middle"
                    style={{ pointerEvents: "none", transition: "fill 0.12s" }}
                  >
                    {r.treeNum}
                  </text>
                  {r.h > 44 && (
                    <text
                      x={x + r.w / 2} y={y + 26}
                      fontFamily={mono} fontSize={Math.min(7, r.w / 6)}
                      fill={isHov ? "#ffffffcc" : "#ffffff66"}
                      textAnchor="middle"
                      style={{ pointerEvents: "none", transition: "fill 0.12s" }}
                    >
                      {r.totalCount.toLocaleString()}
                    </text>
                  )}
                </>
              )}
              {/* Baseline label */}
              <text
                x={x + r.w / 2}
                y={MARGIN.top + plotH + 14}
                fontFamily={mono}
                fontSize={7.5}
                fill={isHov ? TREE_COLOR : "#ffffff44"}
                textAnchor="middle"
                style={{ pointerEvents: "none", transition: "fill 0.12s" }}
              >
                {r.treeNum}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Tooltip */}
      {hovR && (
        <div style={{
          position: "fixed",
          left: tooltip.x + 12,
          top: tooltip.y - 60,
          background: "#1a1d26",
          border: `1px solid ${TREE_COLOR}44`,
          borderRadius: 6,
          padding: "8px 12px",
          fontFamily: mono,
          fontSize: 8,
          pointerEvents: "none",
          zIndex: 100,
          boxShadow: "0 4px 20px #00000066",
          minWidth: 180,
        }}>
          <div style={{ color: TREE_COLOR, fontSize: 9, marginBottom: 4 }}>{hovR.treeNum} — {hovR.term.name}</div>
          <div style={{ color: "#ffffffaa" }}>Total terms: <span style={{ color: "#fff" }}>{hovR.totalCount.toLocaleString()}</span></div>
          <div style={{ color: "#ffffffaa" }}>Direct children: <span style={{ color: "#fff" }}>{hovR.directCount}</span></div>
          <div style={{ color: "#ffffffaa" }}>Avg depth proxy: <span style={{ color: "#fff" }}>{hovR.avgDepth.toFixed(1)}</span></div>
        </div>
      )}

      {/* Color scale legend */}
      <div style={{ marginTop: 24, display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontFamily: mono, fontSize: 8, color: "#ffffff44" }}>FEW TERMS</span>
        <svg width={120} height={12}>
          <defs>
            <linearGradient id="eg-scale" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="rgb(60,130,160)" />
              <stop offset="100%" stopColor={TREE_COLOR} />
            </linearGradient>
          </defs>
          <rect x={0} y={0} width={120} height={12} fill="url(#eg-scale)" rx={3} />
        </svg>
        <span style={{ fontFamily: mono, fontSize: 8, color: "#ffffff44" }}>MANY TERMS</span>
      </div>
    </div>
  );
}

export default function MeshEConcepts({ initialSelection } = {}) {
  return (
    <OverviewConceptShell
      treeLetter="E"
      navLabel="E · TECHNIQUES"
      eyebrow="TECHNIQUES — DIAGNOSIS, THERAPY, SURGERY, EQUIPMENT, AND INVESTIGATION"
      pageTitle="Overview + Detail"
      pageDescription="Methods and tools for clinical care, laboratory investigation, surgery, anesthesia, equipment, dentistry, and therapeutic intervention."
      treeColor={TREE_COLOR}
      branchColors={{
        E01: "#64B5F6",
        E02: "#81C784",
        E03: "#A5D6A7",
        E04: "#8BC34A",
        E05: "#7EC8E3",
        E06: "#FFB74D",
        E07: "#FFD180",
      }}
      defaultCluster="E05"
      initialSelection={initialSelection}
    />
  );
}
