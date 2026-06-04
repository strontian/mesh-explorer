import { useState, useEffect } from "react";
import {
  FloatingMeshDetailPanel,
  FloatingMeshQueryPanel,
  usePersistentMeshQueries,
} from "./mesh_query_ui.jsx";

const mono = "'IBM Plex Mono', monospace";
const BG = "#0f1117";
const TREE_COLOR = "#F4A261";

// ── ANATOMY GROUPS ────────────────────────────────────────────────────────
// Manual grouping of C top-level branches by body region / conceptual theme
const ANATOMY_GROUPS = [
  { id: "systemic",  label: "Systemic & Infectious",      color: "#E07A5F", branches: ["C01","C04","C16"] },
  { id: "neuro",     label: "Nervous & Mental",            color: "#9B72CF", branches: ["C10","C25"] },
  { id: "thoracic",  label: "Cardiovascular & Pulmonary", color: "#4ECDC4", branches: ["C08","C14","C15"] },
  { id: "abdominal", label: "Digestive & Urogenital",     color: "#81B29A", branches: ["C06","C12"] },
  { id: "metabolic", label: "Metabolic, Endocrine & Immune", color: "#A8DADC", branches: ["C18","C19","C20"] },
  { id: "structural",label: "Musculoskeletal & Skin",     color: "#DDB892", branches: ["C05","C17"] },
  { id: "headneck",  label: "Head, Neck & Senses",        color: "#FF9A9E", branches: ["C07","C09","C11"] },
  { id: "external",  label: "Contextual & External",      color: "#B5C99A", branches: ["C22","C23","C24","C26","C21"] },
];

function groupColor(treeNum) {
  for (const g of ANATOMY_GROUPS) {
    if (g.branches.includes(treeNum)) return g.color;
  }
  return TREE_COLOR;
}
function groupFor(treeNum) {
  return ANATOMY_GROUPS.find(g => g.branches.includes(treeNum));
}

// ── DATA HOOK ─────────────────────────────────────────────────────────────
function useCData() {
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

      const raw = (childrenMap.get("C") || []).sort((a, b) =>
        a.treeNum.localeCompare(b.treeNum, undefined, { numeric: true })
      );

      const branches = raw.map(({ term, treeNum }) => ({
        term, treeNum,
        directCount: childrenMap.get(treeNum)?.length ?? 0,
        totalCount:  countAll(treeNum),
        group: groupFor(treeNum),
        color: groupColor(treeNum),
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
// SKETCH 1 — SCALE BARS
// Horizontal bars sorted by total term count. Shows the size disparity.
// ═══════════════════════════════════════════════════════════════════════════
function ScaleBars({ data }) {
  const [hovered, setHovered] = useState(null);
  const { branches } = data;
  const sorted = [...branches].sort((a, b) => b.totalCount - a.totalCount);
  const max = sorted[0].totalCount;

  return (
    <div style={{ background: BG, height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ padding: "16px 24px 12px", borderBottom: "1px solid #ffffff0e", flexShrink: 0 }}>
        <div style={{ fontFamily: mono, fontSize: 9, color: TREE_COLOR, letterSpacing: 3, marginBottom: 4 }}>C — DISEASES</div>
        <div style={{ fontFamily: mono, fontSize: 15, color: "#e8e8e8", fontWeight: 700 }}>Scale Map</div>
        <div style={{ fontFamily: mono, fontSize: 9, color: "#ffffff44", marginTop: 3 }}>
          Branches sorted by total term count — bar width = descendants
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
        {sorted.map(b => {
          const isHov = hovered === b.treeNum;
          const pct = (b.totalCount / max) * 100;
          return (
            <div
              key={b.treeNum}
              onMouseEnter={() => setHovered(b.treeNum)}
              onMouseLeave={() => setHovered(null)}
              style={{ marginBottom: 6, cursor: "default" }}
            >
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 3 }}>
                <span style={{ fontFamily: mono, fontSize: 9, color: b.color, width: 28, flexShrink: 0 }}>
                  {b.treeNum}
                </span>
                <span style={{ fontFamily: mono, fontSize: 10, color: isHov ? "#e8e8e8" : "#aaa", flex: 1 }}>
                  {b.term.name}
                </span>
                <span style={{ fontFamily: mono, fontSize: 9, color: b.color, flexShrink: 0 }}>
                  {b.totalCount.toLocaleString()}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 28, flexShrink: 0 }} />
                <div style={{ flex: 1, height: 10, background: "#ffffff08", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{
                    height: "100%",
                    width: `${pct}%`,
                    background: isHov ? b.color : b.color + "88",
                    transition: "all 0.15s",
                    borderRadius: 2,
                  }} />
                </div>
              </div>
              {isHov && b.term.note && (
                <div style={{ fontFamily: mono, fontSize: 8.5, color: "#ffffff55", marginTop: 5, paddingLeft: 36, lineHeight: 1.6 }}>
                  {b.term.note.slice(0, 200)}{b.term.note.length > 200 ? "…" : ""}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{ padding: "10px 24px", borderTop: "1px solid #ffffff0a", display: "flex", flexWrap: "wrap", gap: 10, flexShrink: 0 }}>
        {ANATOMY_GROUPS.map(g => (
          <div key={g.id} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: g.color }} />
            <span style={{ fontFamily: mono, fontSize: 8, color: "#ffffff44" }}>{g.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SKETCH 2 — SHAPE SCATTER
// X = direct children (breadth), Y = total descendants (depth proxy).
// Reveals branches with the same total size but completely different shapes.
// ═══════════════════════════════════════════════════════════════════════════
function ShapeScatter({ data }) {
  const [hovered, setHovered] = useState(null);
  const { branches } = data;

  const PW = 500, PH = 340;
  const ML = 54, MR = 20, MT = 16, MB = 44;
  const W = PW - ML - MR, H = PH - MT - MB;

  const maxX = 60, maxY = 1600;
  const px = v => ML + (v / maxX) * W;
  const py = v => MT + H - (v / maxY) * H;

  const hov = hovered ? branches.find(b => b.treeNum === hovered) : null;

  return (
    <div style={{ background: BG, height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ padding: "16px 24px 12px", borderBottom: "1px solid #ffffff0e", flexShrink: 0 }}>
        <div style={{ fontFamily: mono, fontSize: 9, color: TREE_COLOR, letterSpacing: 3, marginBottom: 4 }}>C — DISEASES</div>
        <div style={{ fontFamily: mono, fontSize: 15, color: "#e8e8e8", fontWeight: 700 }}>Shape Scatter</div>
        <div style={{ fontFamily: mono, fontSize: 9, color: "#ffffff44", marginTop: 3 }}>
          X = direct children (breadth) · Y = total descendants (depth proxy) · same size, different shapes
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Plot */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
          <svg width={PW} height={PH} style={{ overflow: "visible" }}>
            {/* Grid lines */}
            {[0, 400, 800, 1200, 1600].map(v => (
              <line key={v} x1={ML} x2={ML + W} y1={py(v)} y2={py(v)}
                stroke="#ffffff08" strokeWidth={1} />
            ))}
            {[0, 15, 30, 45, 60].map(v => (
              <line key={v} x1={px(v)} x2={px(v)} y1={MT} y2={MT + H}
                stroke="#ffffff08" strokeWidth={1} />
            ))}

            {/* Axes */}
            <line x1={ML} x2={ML + W} y1={MT + H} y2={MT + H} stroke="#ffffff22" strokeWidth={1} />
            <line x1={ML} x2={ML} y1={MT} y2={MT + H} stroke="#ffffff22" strokeWidth={1} />

            {/* Axis labels */}
            {[0, 15, 30, 45, 60].map(v => (
              <text key={v} x={px(v)} y={MT + H + 14} textAnchor="middle"
                fontFamily={mono} fontSize={8} fill="#ffffff44">{v}</text>
            ))}
            {[0, 400, 800, 1200, 1600].map(v => (
              <text key={v} x={ML - 6} y={py(v) + 3} textAnchor="end"
                fontFamily={mono} fontSize={8} fill="#ffffff44">{v}</text>
            ))}
            <text x={ML + W / 2} y={PH - 2} textAnchor="middle"
              fontFamily={mono} fontSize={8} fill="#ffffff33">Direct children</text>
            <text x={10} y={MT + H / 2} textAnchor="middle"
              fontFamily={mono} fontSize={8} fill="#ffffff33"
              transform={`rotate(-90, 10, ${MT + H / 2})`}>Total descendants</text>

            {/* Quadrant labels */}
            <text x={ML + W * 0.72} y={MT + H - 12} fontFamily={mono} fontSize={7.5} fill="#ffffff15">wide · shallow</text>
            <text x={ML + 6} y={MT + 20} fontFamily={mono} fontSize={7.5} fill="#ffffff15">narrow · deep</text>

            {/* Bubbles */}
            {branches.map(b => {
              const x = px(b.directCount);
              const y = py(b.totalCount);
              const r = Math.max(5, Math.sqrt(b.totalCount) * 0.38);
              const isHov = hovered === b.treeNum;
              return (
                <g key={b.treeNum}
                  onMouseEnter={() => setHovered(b.treeNum)}
                  onMouseLeave={() => setHovered(null)}
                  style={{ cursor: "default" }}>
                  <circle cx={x} cy={y} r={isHov ? r + 3 : r}
                    fill={b.color + (isHov ? "cc" : "55")}
                    stroke={b.color} strokeWidth={isHov ? 1.5 : 0.8}
                    style={{ transition: "all 0.12s" }} />
                  {(isHov || b.totalCount > 600) && (
                    <text x={x} y={y - r - 5} textAnchor="middle"
                      fontFamily={mono} fontSize={isHov ? 9 : 8}
                      fill={isHov ? b.color : b.color + "aa"}>
                      {b.treeNum}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Side detail */}
        <div style={{ width: 220, borderLeft: "1px solid #ffffff0a", padding: 20, overflowY: "auto", flexShrink: 0 }}>
          {hov ? (
            <div style={{ animation: "fadeIn 0.12s ease" }}>
              <div style={{ fontFamily: mono, fontSize: 9, color: hov.color, marginBottom: 4 }}>{hov.treeNum}</div>
              <div style={{ fontFamily: mono, fontSize: 12, color: "#e8e8e8", fontWeight: 700, marginBottom: 10, lineHeight: 1.4 }}>{hov.term.name}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
                {[
                  ["Direct children", hov.directCount],
                  ["Total descendants", hov.totalCount],
                  ["Avg depth", (hov.totalCount / Math.max(hov.directCount, 1)).toFixed(1) + "x"],
                ].map(([label, val]) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontFamily: mono, fontSize: 8, color: "#ffffff44" }}>{label}</span>
                    <span style={{ fontFamily: mono, fontSize: 8, color: hov.color }}>{val}</span>
                  </div>
                ))}
              </div>
              {hov.term.note && (
                <div style={{ fontFamily: mono, fontSize: 8.5, color: "#ffffff55", lineHeight: 1.6 }}>
                  {hov.term.note.slice(0, 220)}{hov.term.note.length > 220 ? "…" : ""}
                </div>
              )}
            </div>
          ) : (
            <div style={{ fontFamily: mono, fontSize: 9, color: "#ffffff22", lineHeight: 1.8, marginTop: 40 }}>
              hover a bubble<br/>to inspect
            </div>
          )}
          <style>{`@keyframes fadeIn { from{opacity:0} to{opacity:1} }`}</style>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SKETCH 3 — ANATOMY LANES
// Organizes branches by body region. Each lane is a column.
// Clicking a branch card reveals its direct children.
// ═══════════════════════════════════════════════════════════════════════════
function AnatomyLanes({ data }) {
  const [expanded, setExpanded] = useState(null);
  const { branches, childrenMap } = data;

  const byTN = Object.fromEntries(branches.map(b => [b.treeNum, b]));

  return (
    <div style={{ background: BG, height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ padding: "16px 24px 12px", borderBottom: "1px solid #ffffff0e", flexShrink: 0 }}>
        <div style={{ fontFamily: mono, fontSize: 9, color: TREE_COLOR, letterSpacing: 3, marginBottom: 4 }}>C — DISEASES</div>
        <div style={{ fontFamily: mono, fontSize: 15, color: "#e8e8e8", fontWeight: 700 }}>Anatomy Lanes</div>
        <div style={{ fontFamily: mono, fontSize: 9, color: "#ffffff44", marginTop: 3 }}>
          Branches grouped by body region — click any branch to expand sub-categories
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", overflowX: "auto", overflowY: "hidden" }}>
        {ANATOMY_GROUPS.map(group => (
          <div key={group.id} style={{
            minWidth: 170, maxWidth: 220, flexShrink: 0,
            borderRight: "1px solid #ffffff08",
            display: "flex", flexDirection: "column", overflow: "hidden",
          }}>
            {/* Lane header */}
            <div style={{
              padding: "10px 12px 8px",
              borderBottom: `1px solid ${group.color}33`,
              flexShrink: 0,
            }}>
              <div style={{ fontFamily: mono, fontSize: 7.5, color: group.color, letterSpacing: 1.5, lineHeight: 1.5 }}>
                {group.label.toUpperCase()}
              </div>
              <div style={{ fontFamily: mono, fontSize: 8, color: "#ffffff33", marginTop: 2 }}>
                {group.branches.length} branch{group.branches.length !== 1 ? "es" : ""}
                {" · "}
                {group.branches.reduce((s, tn) => s + (byTN[tn]?.totalCount || 0), 0).toLocaleString()} terms
              </div>
            </div>

            {/* Branch cards */}
            <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
              {group.branches.map(tn => {
                const b = byTN[tn];
                if (!b) return null;
                const isExp = expanded === tn;
                const kids = childrenMap.get(tn) || [];
                return (
                  <div key={tn}>
                    <div
                      onClick={() => setExpanded(isExp ? null : tn)}
                      style={{
                        padding: "8px 12px",
                        cursor: "pointer",
                        background: isExp ? group.color + "18" : "transparent",
                        borderLeft: `3px solid ${isExp ? group.color : group.color + "33"}`,
                        transition: "all 0.12s",
                      }}
                    >
                      <div style={{ fontFamily: mono, fontSize: 8, color: group.color, marginBottom: 2 }}>{tn}</div>
                      <div style={{ fontFamily: mono, fontSize: 10, color: isExp ? "#e8e8e8" : "#bbb", lineHeight: 1.3, marginBottom: 4 }}>
                        {b.term.name}
                      </div>
                      {/* Mini bar: totalCount vs max */}
                      <div style={{ height: 3, background: "#ffffff0a", borderRadius: 1 }}>
                        <div style={{
                          height: "100%",
                          width: `${(b.totalCount / 1500) * 100}%`,
                          background: group.color + "aa",
                          borderRadius: 1,
                        }} />
                      </div>
                      <div style={{ fontFamily: mono, fontSize: 7.5, color: "#ffffff33", marginTop: 3 }}>
                        {b.totalCount} terms · {isExp ? "collapse" : `${b.directCount} sub-branches ▸`}
                      </div>
                    </div>

                    {/* Expanded: list direct children */}
                    {isExp && (
                      <div style={{ background: "#ffffff04", borderLeft: `2px solid ${group.color}22` }}>
                        {kids.slice(0, 12).map(({ term: ct, treeNum: ctn }) => (
                          <div key={ctn} style={{ padding: "5px 12px 5px 14px", borderBottom: "1px solid #ffffff04" }}>
                            <div style={{ fontFamily: mono, fontSize: 7.5, color: group.color + "88", marginBottom: 1 }}>{ctn}</div>
                            <div style={{ fontFamily: mono, fontSize: 9, color: "#888", lineHeight: 1.3 }}>{ct.name}</div>
                          </div>
                        ))}
                        {kids.length > 12 && (
                          <div style={{ padding: "5px 12px", fontFamily: mono, fontSize: 8, color: "#ffffff22" }}>
                            + {kids.length - 12} more
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
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SKETCH 4 — TREEMAP
// Area proportional to total term count. Groups form the outer layer;
// individual branches are the inner rectangles.
// ═══════════════════════════════════════════════════════════════════════════
function Treemap({ data }) {
  const [hovered, setHovered] = useState(null);
  const { branches } = data;

  // Build rows: each row = one anatomy group, height ∝ group total
  const groupTotals = ANATOMY_GROUPS.map(g => ({
    ...g,
    items: g.branches.map(tn => branches.find(b => b.treeNum === tn)).filter(Boolean),
    total: g.branches.reduce((s, tn) => {
      const b = branches.find(x => x.treeNum === tn);
      return s + (b?.totalCount || 0);
    }, 0),
  })).filter(g => g.total > 0);

  const grandTotal = groupTotals.reduce((s, g) => s + g.total, 0);

  const hov = hovered ? branches.find(b => b.treeNum === hovered) : null;

  return (
    <div style={{ background: BG, height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ padding: "16px 24px 10px", borderBottom: "1px solid #ffffff0e", flexShrink: 0 }}>
        <div style={{ fontFamily: mono, fontSize: 9, color: TREE_COLOR, letterSpacing: 3, marginBottom: 4 }}>C — DISEASES</div>
        <div style={{ fontFamily: mono, fontSize: 15, color: "#e8e8e8", fontWeight: 700 }}>Treemap</div>
        <div style={{ fontFamily: mono, fontSize: 9, color: "#ffffff44", marginTop: 3 }}>
          Area proportional to total term count — rows = body-region groups
        </div>
      </div>

      {/* Map */}
      <div style={{ flex: 1, overflow: "hidden", padding: "8px 12px 12px", display: "flex", flexDirection: "column", gap: 2 }}>
        {groupTotals.map(group => {
          const rowPct = group.total / grandTotal;
          return (
            <div key={group.id} style={{
              flex: `${rowPct} 0 0`,
              display: "flex", gap: 2, minHeight: 0,
            }}>
              {group.items.map(b => {
                const colPct = b.totalCount / group.total;
                const isHov = hovered === b.treeNum;
                return (
                  <div
                    key={b.treeNum}
                    onMouseEnter={() => setHovered(b.treeNum)}
                    onMouseLeave={() => setHovered(null)}
                    style={{
                      flex: `${colPct} 0 0`,
                      background: isHov ? group.color + "44" : group.color + "1a",
                      border: `1px solid ${isHov ? group.color + "cc" : group.color + "33"}`,
                      borderRadius: 2,
                      overflow: "hidden",
                      cursor: "default",
                      transition: "all 0.1s",
                      padding: "4px 6px",
                      position: "relative",
                    }}
                  >
                    <div style={{ fontFamily: mono, fontSize: 8, color: group.color, lineHeight: 1 }}>{b.treeNum}</div>
                    {rowPct > 0.06 && (
                      <div style={{
                        fontFamily: mono, fontSize: 9,
                        color: isHov ? "#e8e8e8" : "#888",
                        lineHeight: 1.3, marginTop: 2,
                        overflow: "hidden",
                        display: "-webkit-box",
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: "vertical",
                      }}>
                        {b.term.name}
                      </div>
                    )}
                    {rowPct > 0.1 && colPct > 0.12 && (
                      <div style={{ fontFamily: mono, fontSize: 8, color: group.color + "88", marginTop: 3 }}>
                        {b.totalCount.toLocaleString()}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Status bar */}
      <div style={{
        padding: "8px 16px", borderTop: "1px solid #ffffff0a", flexShrink: 0,
        fontFamily: mono, fontSize: 9, minHeight: 32,
        display: "flex", alignItems: "center", gap: 12,
      }}>
        {hov ? (
          <>
            <span style={{ color: hov.color }}>{hov.treeNum}</span>
            <span style={{ color: "#e8e8e8" }}>{hov.term.name}</span>
            <span style={{ color: "#ffffff44" }}>{hov.totalCount.toLocaleString()} terms total</span>
            <span style={{ color: "#ffffff44" }}>{hov.directCount} direct sub-branches</span>
          </>
        ) : (
          <span style={{ color: "#ffffff22" }}>hover a block to inspect</span>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SKETCH 5 — BODY MAP
// Clickable anatomy schematic for organ-system branches.
// Systemic cross-cutting branches always accessible via top button.
// Distributed whole-body systems via bottom button.
// Special categories (Animal, Chemical, Occupational, Wounds, Environmental)
// each rendered with their own distinct treatment.
// ═══════════════════════════════════════════════════════════════════════════

const REGIONS = [
  { id:"C10", label:"Nervous System",       short:"C10 Nervous",     color:"#9B72CF", branches:["C10"] },
  { id:"C11", label:"Eye Diseases",         short:"C11 Eye",         color:"#FF9A9E", branches:["C11"] },
  { id:"C09", label:"ENT Diseases",         short:"C09 ENT",         color:"#F0B8C8", branches:["C09"] },
  { id:"C07", label:"Mouth & Throat",       short:"C07 Mouth",       color:"#F0B8C8", branches:["C07"] },
  { id:"C08", label:"Respiratory",          short:"C08 Resp",        color:"#4ECDC4", branches:["C08"] },
  { id:"C14", label:"Cardiovascular",       short:"C14 Cardio",      color:"#E07A5F", branches:["C14"] },
  { id:"C15", label:"Blood & Lymph",        short:"C15 Blood",       color:"#F4A261", branches:["C15"] },
  { id:"C06", label:"Digestive",            short:"C06 Digest",      color:"#81B29A", branches:["C06"] },
  { id:"C18", label:"Metabolic",            short:"C18 Metabolic",   color:"#A8DADC", branches:["C18"] },
  { id:"C19", label:"Endocrine",            short:"C19 Endocrine",   color:"#D8A8D8", branches:["C19"] },
  { id:"C20", label:"Immune",               short:"C20 Immune",      color:"#A8D8C8", branches:["C20"] },
  { id:"C12", label:"Urogenital",           short:"C12 Urogen",      color:"#A8DADC", branches:["C12"] },
  { id:"C05", label:"Musculoskeletal",      short:"C05 Skeleton",    color:"#DDB892", branches:["C05"] },
  { id:"C17", label:"Skin",                 short:"C17 Skin",        color:"#E8C888", branches:["C17"] },
];
const DIST_REGION = { branches:["C20"] };
const SYSTEMIC_TNS = ["C01","C04","C16","C23"];
const SYSTEMIC_CFG = [
  { type:"systemicBranch", treeNum:"C01", label:"Infections", color:"#F4A261" },
  { type:"systemicBranch", treeNum:"C04", label:"Neoplasms", color:"#E07A5F" },
  { type:"systemicBranch", treeNum:"C16", label:"Congenital", color:"#D8A8D8" },
  { type:"systemicBranch", treeNum:"C23", label:"Pathological Conditions", color:"#C8B890" },
  { type:"distributed", id:"distributed", label:"Distributed", color:"#DDB892" },
];
const SPECIAL_CFG = [
  { treeNum:"C22", emoji:"🐾", label:"Animal Diseases",      color:"#F7DC6F" },
  { treeNum:"C25", emoji:"⚗️", label:"Chemically-Induced",  color:"#C9B1BD" },
  { treeNum:"C24", emoji:"🏭", label:"Occupational Diseases",color:"#B5C99A" },
  { treeNum:"C26", emoji:"🩹", label:"Wounds & Injuries",    color:"#F4A261" },
  { treeNum:"C21", emoji:"🌿", label:"Environmental Origin", color:"#A8DADC" },
];

const ANIMAL_EMOJIS = {
  Bovine:"🐄", Cat:"🐈", Dog:"🐕", Horse:"🐴", Swine:"🐖",
  Poultry:"🐔", Fish:"🐟", Rodent:"🐭", Sheep:"🐑", Goat:"🐐",
  Rabbit:"🐇", Bird:"🦅", Primate:"🐒", Deer:"🦌", Ferret:"🦦",
};
function animalEmoji(name) {
  for (const [k,v] of Object.entries(ANIMAL_EMOJIS)) if (name.includes(k)) return v;
  return "🐾";
}

export const BODY_SILHOUETTE_PATH = "M 241.0,102.5 C 238.5,103.8 234.6,106.8 232.3,109.3 C 227.8,114.2 226.0,119.9 226.0,129.5 C 226.0,133.4 225.6,134.9 224.8,134.7 C 223.9,134.6 223.4,136.6 223.2,141.6 C 222.9,148.0 223.2,149.1 225.5,151.8 C 226.9,153.4 228.0,156.0 228.0,157.4 C 228.0,158.9 229.1,162.3 230.5,165.0 C 233.2,170.3 233.6,174.9 231.9,179.8 C 231.0,182.6 228.8,183.9 212.6,191.8 C 202.6,196.7 192.1,201.5 189.3,202.4 C 181.3,205.0 176.2,209.3 173.3,215.7 C 171.0,220.8 170.7,222.6 170.5,236.4 C 170.4,244.7 169.8,256.2 169.2,262.0 C 168.5,267.8 168.1,280.1 168.2,289.5 L 168.4,306.5 L 164.6,317.3 C 160.3,329.7 159.1,340.7 159.0,366.6 C 159.0,377.6 158.5,384.4 157.1,391.1 C 153.3,409.8 152.8,415.7 154.6,423.7 C 156.4,431.7 161.2,440.1 167.4,445.9 C 170.3,448.7 171.3,449.1 172.2,448.2 C 173.2,447.2 173.1,446.3 171.6,443.7 C 166.5,435.0 164.4,421.6 167.4,417.5 C 168.6,415.8 168.8,416.0 169.4,420.1 C 170.4,426.5 173.0,432.1 174.9,431.8 C 176.1,431.5 176.4,429.3 176.5,418.5 C 176.5,411.3 176.0,402.6 175.3,399.0 C 174.2,393.4 174.2,391.7 175.9,384.5 C 177.0,380.1 180.3,370.6 183.3,363.5 C 190.1,347.5 191.6,341.8 193.0,327.0 C 193.7,320.7 195.3,308.8 196.7,300.5 C 198.8,288.4 199.2,283.6 198.7,275.0 L 198.1,264.5 L 200.6,274.0 C 201.9,279.2 203.0,285.1 203.0,287.0 C 203.0,288.9 203.5,294.8 204.2,300.1 C 205.7,312.8 203.9,329.5 198.7,351.0 C 192.1,377.7 190.0,400.8 190.0,444.7 C 190.0,476.9 191.1,492.5 194.2,504.9 C 196.7,515.1 196.3,524.0 192.3,542.9 C 190.0,553.3 189.6,558.0 189.6,569.5 C 189.6,581.8 190.2,586.9 194.8,612.5 C 200.8,646.1 201.7,654.7 200.1,660.8 C 198.7,666.0 192.7,675.8 189.4,678.3 C 186.6,680.5 186.5,681.3 188.6,683.4 C 190.9,685.7 219.1,685.7 221.4,683.4 C 222.3,682.6 223.0,681.4 223.0,680.8 C 223.0,679.5 221.2,668.8 219.5,659.5 C 217.3,647.8 219.9,624.0 226.1,600.0 C 227.7,593.7 229.8,582.9 230.7,576.0 C 232.1,565.0 232.1,561.4 231.0,546.5 L 229.7,529.4 L 232.8,518.5 C 236.8,504.2 237.4,501.6 242.1,475.5 C 244.3,463.4 246.8,446.4 247.7,437.7 C 248.7,429.1 249.7,422.0 250.2,422.0 C 250.9,422.0 251.4,424.8 253.0,441.0 C 255.0,460.8 262.5,500.6 267.2,517.0 C 270.2,527.4 270.2,527.6 269.5,543.0 C 268.2,569.0 269.0,578.0 274.6,600.9 C 281.0,627.4 283.3,649.0 280.7,660.5 C 279.9,664.4 278.8,670.9 278.5,675.2 C 277.6,685.0 277.5,685.0 296.2,685.0 C 314.5,685.0 316.2,683.9 309.3,676.4 C 307.2,674.2 304.3,669.9 302.8,666.9 C 298.4,658.4 298.9,650.0 305.6,612.0 C 312.2,574.1 312.6,564.9 308.5,545.5 C 305.1,529.7 304.2,513.1 306.3,505.3 C 311.2,487.3 312.2,420.2 308.1,386.0 C 306.5,373.2 303.0,353.9 300.5,345.0 C 298.1,336.3 295.7,319.4 295.6,310.5 C 295.5,302.1 298.0,280.9 300.1,273.0 L 302.0,265.5 L 301.5,275.2 C 301.1,282.8 301.5,287.8 303.4,298.7 C 304.8,306.3 306.4,317.6 307.0,323.9 C 308.6,340.6 310.4,348.0 316.6,362.4 C 323.5,378.4 326.5,389.7 325.4,395.4 C 324.1,402.3 324.3,431.3 325.7,431.7 C 327.4,432.3 330.0,426.7 330.7,420.8 C 331.3,415.7 331.3,415.7 333.1,417.9 C 334.5,419.6 334.8,421.2 334.4,425.3 C 333.7,431.3 331.3,439.6 329.4,442.5 C 328.0,444.4 327.5,449.0 328.6,449.0 C 330.4,449.0 336.4,443.0 340.0,437.5 C 347.5,425.9 348.5,415.7 343.9,394.5 C 342.2,386.5 341.6,379.1 340.9,358.0 C 340.1,330.2 339.8,327.8 335.4,316.5 C 332.7,309.7 332.6,308.6 331.9,282.5 C 331.5,267.6 330.7,252.6 330.1,249.0 C 329.5,245.4 329.3,238.7 329.6,233.9 C 330.9,216.8 325.0,207.0 310.5,202.1 C 306.6,200.8 299.9,197.8 295.5,195.5 C 291.1,193.2 284.6,190.0 281.0,188.5 C 277.4,186.9 273.0,184.6 271.3,183.3 C 268.2,181.0 268.0,180.6 268.0,174.3 C 268.0,169.6 268.5,166.8 269.9,164.6 C 270.9,162.9 272.1,159.6 272.5,157.2 C 272.9,154.8 273.8,152.6 274.5,152.4 C 276.5,151.6 278.0,146.4 278.0,140.3 C 278.0,135.7 277.7,134.7 276.0,134.3 C 274.3,133.8 274.0,132.9 274.0,127.2 C 274.0,118.8 272.5,113.9 268.3,109.1 C 261.1,100.6 249.8,97.9 241.0,102.5";

function BodyMap({ data }) {
  const { branches, childrenMap } = data;
  const [sel, setSel]       = useState({ type:"overview" });
  const [hovReg, setHovReg] = useState(null);
  const [specialFocus, setSpecialFocus] = useState({});
  const [selectedTag, setSelectedTag] = useState(null);
  const [expandedNodes, setExpandedNodes] = useState([]);
  const queryBuilder = usePersistentMeshQueries();
  const byTN = Object.fromEntries(branches.map(b => [b.treeNum, b]));
  const treeIndex = new Map();
  for (const b of branches) treeIndex.set(b.treeNum, { term:b.term, treeNum:b.treeNum });
  for (const entries of childrenMap.values()) {
    for (const entry of entries) treeIndex.set(entry.treeNum, entry);
  }

  const isOverviewSel = () => sel.type === "overview";
  const isSysSel  = () => sel.type === "systemic";
  const isDistSel = () => sel.type === "distributed";
  const isRegSel  = id => sel.type === "region"  && sel.id === id;
  const isSysBranchSel = tn => sel.type === "systemicBranch" && sel.id === tn;
  const isSpecSel = tn => sel.type === "special"  && sel.id === tn;

  // SVG helpers — keep transitions on shapes, not on <g>
  const rFill   = (id, c) => isRegSel(id)||hovReg===id ? c+"2e" : "#ffffff0a";
  const rStroke = (id, c) => isRegSel(id) ? c : hovReg===id ? c+"99" : "#ffffff1a";
  const rSW     = id => isRegSel(id) ? 2 : 1;
  const rTxt    = (id, c) => isRegSel(id)||hovReg===id ? c : "#ffffff33";
  const diagramLabels = [
    ["C10", "#9B72CF", 112, 116, 232, 126, 10, 120, "C10 Nervous System"],
    ["C11", "#FF9A9E", 112, 143, 238, 130, 24, 147, "C11 Eye Diseases"],
    ["C09", "#F0B8C8", 112, 168, 224, 151, 2, 172, "C09 Otorhinolaryngologic"],
    ["C07", "#F0B8C8", 112, 196, 226, 195, 8, 200, "C07 Stomatognathic"],
    ["C08", "#4ECDC4", 112, 252, 180, 252, 8, 256, "C08 Respiratory"],
    ["C14", "#E07A5F", 388, 247, 291, 247, 396, 251, "C14 Cardiovascular"],
    ["C15", "#F4A261", 388, 278, 318, 278, 396, 282, "C15 Hemic & Lymphatic"],
    ["C06", "#81B29A", 112, 332, 172, 332, 18, 336, "C06 Digestive"],
    ["C18", "#A8DADC", 388, 322, 288, 322, 396, 326, "C18 Nutritional & Metabolic"],
    ["C19", "#D8A8D8", 388, 348, 326, 318, 396, 352, "C19 Endocrine"],
    ["C20", "#A8D8C8", 388, 374, 326, 356, 396, 378, "C20 Immune System"],
    ["C12", "#A8DADC", 388, 407, 322, 407, 396, 411, "C12 Urogenital"],
    ["C05", "#DDB892", 388, 470, 338, 430, 396, 474, "C05 Musculoskeletal"],
    ["C17", "#E8C888", 112, 560, 206, 560, 24, 564, "C17 Skin"],
  ];

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

  function getChildren(treeNum) {
    return (childrenMap.get(treeNum) || []).sort((a, b) =>
      a.treeNum.localeCompare(b.treeNum, undefined, { numeric:true })
    );
  }

  function isExpanded(treeNum) {
    return expandedNodes.includes(treeNum);
  }

  function selectNavigation(nextSel) {
    setSel(nextSel);
    setSelectedTag(null);
    setExpandedNodes([]);
  }

  function toggleExpanded(treeNum) {
    const dot = treeNum.lastIndexOf(".");
    const parentTreeNum = dot === -1 ? treeNum[0] : treeNum.slice(0, dot);
    const siblingTreeNums = getChildren(parentTreeNum)
      .map(({ treeNum:siblingTreeNum }) => siblingTreeNum)
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

  function renderSelectedTagDetail(rootTreeNum, color) {
    const activeTreeNum = selectedTag && selectedTag.startsWith(rootTreeNum + ".") ? selectedTag : rootTreeNum;
    const entry = treeIndex.get(activeTreeNum);
    if (!entry) return null;
    const children = getChildren(activeTreeNum);
    return (
      <div style={{ marginBottom:12, padding:12, background:"#ffffff06", border:`1px solid ${color}28`, borderRadius:8 }}>
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12 }}>
          <div style={{ minWidth:0 }}>
            <div style={{ fontFamily:mono, fontSize:7, color:color+"aa", letterSpacing:1.5, marginBottom:3 }}>SELECTED TERM</div>
            <div style={{ fontFamily:mono, fontSize:13, color:"#e8e8e8", fontWeight:700, lineHeight:1.25 }}>{entry.term.name}</div>
          </div>
          <div style={{ fontFamily:mono, fontSize:8, color, whiteSpace:"nowrap" }}>{children.length === 0 ? "leaf" : `${children.length} children`}</div>
        </div>
        {entry.term.note && (
          <div style={{ fontFamily:mono, fontSize:9, color:"#ffffff70", lineHeight:1.55, marginTop:9, maxWidth:980 }}>{entry.term.note}</div>
        )}
        <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginTop:10, fontFamily:mono, fontSize:7.5, color:"#ffffff42" }}>
          <span>{entry.term.ui}</span>
          {countDescendants(activeTreeNum) > 0 && <span>{countDescendants(activeTreeNum)} narrower terms</span>}
        </div>
      </div>
    );
  }

  function renderTagTree(parentTreeNum, color, depth = 0) {
    const kids = getChildren(parentTreeNum);
    if (kids.length === 0) {
      return <div style={{ fontFamily:mono, fontSize:8, color:"#ffffff35" }}>No child terms.</div>;
    }

    const openChild = kids.find(({ treeNum }) => isExpanded(treeNum));
    return (
      <>
        {kids.map(({ term, treeNum }) => {
          const childCount = getChildren(treeNum).length;
          const open = isExpanded(treeNum);
          const active = selectedTag === treeNum;
          const collected = queryBuilder.allIds.has(term.name);
          return (
          <button
            key={treeNum}
            type="button"
            title={treeNum}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedTag(active ? null : treeNum);
              if (childCount > 0) toggleExpanded(treeNum);
            }}
            style={{
              display:"inline-flex",
              alignItems:"center",
              gap:6,
              minHeight:22,
              width:"fit-content",
              maxWidth:"100%",
              padding:"4px 8px",
              background:active ? color+"30" : open ? color+"22" : collected ? color+"1d" : color+"11",
              border:`1px solid ${active || open ? color+"88" : collected ? color+"66" : color+"30"}`,
              borderRadius:999,
              cursor:"pointer",
              fontFamily:mono,
              fontSize:8,
              color:active ? "#fff" : collected ? color : "#ffffffb8",
              lineHeight:1.25,
            }}
          >
            <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{term.name}</span>
            {childCount > 0 && <span style={{ color:color+"77", fontSize:7 }}>{childCount}</span>}
          </button>
          );
        })}
        {openChild && (
          <div style={{
            flexBasis:"100%",
            marginTop:3,
            marginLeft:Math.min(10 + depth * 8, 34),
            padding:"4px 0 2px 10px",
            borderLeft:`1px solid ${color}28`,
            display:"flex",
            flexWrap:"wrap",
            alignItems:"flex-start",
            gap:4,
          }}>
            {renderTagTree(openChild.treeNum, color, depth + 1)}
          </div>
        )}
      </>
    );
  }

  function renderSpecialExplorer(rootTreeNum, color) {
    return (
      <div>
        {renderSelectedTagDetail(rootTreeNum, color)}
        <div style={{ display:"flex", flexWrap:"wrap", alignItems:"flex-start", gap:4 }}>
          {renderTagTree(rootTreeNum, color)}
        </div>
      </div>
    );
  }

  function renderTree(parentTreeNum, color, depth = 0, limit = Infinity) {
    const kids = childrenMap.get(parentTreeNum) || [];
    const shown = kids.slice(0, limit);
    return (
      <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
        {shown.map(({ term, treeNum }) => {
          const sub = childrenMap.get(treeNum)?.length || 0;
          return (
            <div key={treeNum}>
              <div style={{ padding:"4px 8px", paddingLeft:8 + depth * 14, fontFamily:mono, fontSize:8, color:"#d8d8d8", background:depth === 0 ? color+"10" : "#ffffff05", border:`1px solid ${depth === 0 ? color+"28" : "#ffffff0a"}`, borderLeft:`2px solid ${sub ? color+"88" : "#ffffff16"}`, borderRadius:4 }}>
                <span style={{ color:color, marginRight:6 }}>{treeNum}</span>
                {term.name}
                {sub > 0 && <span style={{ color:"#ffffff33", marginLeft:6 }}>+{sub}</span>}
              </div>
              {sub > 0 && (
                <div style={{ marginTop:3 }}>
                  {renderTree(treeNum, color, depth + 1, limit)}
                </div>
              )}
            </div>
          );
        })}
        {kids.length > limit && (
          <div style={{ padding:"4px 8px", fontFamily:mono, fontSize:8, color:"#ffffff33" }}>+ {kids.length - limit} more</div>
        )}
      </div>
    );
  }

  function renderSelectableSpecialTree(rootTreeNum, color, selectedTreeNum, setSelectedTreeNum) {
    const direct = childrenMap.get(rootTreeNum) || [];
    const active = selectedTreeNum
      ? direct.find(item => item.treeNum === selectedTreeNum) || direct[0]
      : direct[0];
    const activeKids = active ? childrenMap.get(active.treeNum) || [] : [];

    return (
      <div style={{ display:"grid", gridTemplateColumns:"minmax(180px, 0.65fr) minmax(260px, 1fr)", gap:12, alignItems:"start" }}>
        <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
          {direct.map(({ term, treeNum }) => {
            const isActive = active?.treeNum === treeNum;
            const sub = childrenMap.get(treeNum)?.length || 0;
            return (
              <button
                key={treeNum}
                onClick={() => setSelectedTreeNum(treeNum)}
                style={{ padding:"7px 9px", fontFamily:mono, fontSize:8.5, color:isActive ? "#fff" : "#ffffff99", background:isActive ? color+"22" : "#ffffff06", border:`1px solid ${isActive ? color : "#ffffff10"}`, borderRadius:5, cursor:"pointer", textAlign:"left", lineHeight:1.35 }}
              >
                <span style={{ color, marginRight:6 }}>{treeNum}</span>
                {term.name}
                {sub > 0 && <span style={{ color:"#ffffff33", marginLeft:6 }}>+{sub}</span>}
              </button>
            );
          })}
        </div>

        <div style={{ border:"1px solid #ffffff10", borderRadius:6, padding:12, background:"#ffffff04" }}>
          {active ? (
            <>
              <div style={{ fontFamily:mono, fontSize:8, color, marginBottom:4 }}>{active.treeNum}</div>
              <div style={{ fontFamily:mono, fontSize:12, color:"#e8e8e8", fontWeight:700, marginBottom:4 }}>{active.term.name}</div>
              <div style={{ fontFamily:mono, fontSize:8, color:"#ffffff33", marginBottom:10 }}>{countDescendants(active.treeNum)} narrower terms</div>
              {activeKids.length > 0 ? renderTree(active.treeNum, color, 0, Infinity) : (
                <div style={{ fontFamily:mono, fontSize:8, color:"#ffffff44" }}>Leaf term.</div>
              )}
            </>
          ) : null}
        </div>
      </div>
    );
  }

  // ── Right panel ──────────────────────────────────────────────────────────
  function renderPanel() {
    if (isOverviewSel()) return (
      <div style={{ padding:"20px 24px", overflowY:"auto", height:"100%" }}>
        <div style={{ fontFamily:mono, fontSize:8, color:TREE_COLOR, letterSpacing:2, marginBottom:6 }}>TOP-LEVEL C TREE</div>
        <div style={{ fontFamily:mono, fontSize:13, color:"#e8e8e8", fontWeight:700, marginBottom:8 }}>Disease Branch Landscape</div>
        <div style={{ fontFamily:mono, fontSize:9, color:"#ffffff44", lineHeight:1.8, marginBottom:18 }}>
          The C tree starts as broad disease branches. Some are anatomical, some are systemic or causal, and some are contextual. Select any tag below or use the body map.
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {ANATOMY_GROUPS.map(group => {
            const groupBranches = group.branches.map(tn => byTN[tn]).filter(Boolean);
            const total = groupBranches.reduce((sum, branch) => sum + branch.totalCount, 0);
            return (
              <div key={group.id} style={{ padding:12, background:group.color+"08", border:`1px solid ${group.color}24`, borderRadius:8 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", gap:10, marginBottom:8 }}>
                  <div style={{ fontFamily:mono, fontSize:8, color:group.color, letterSpacing:1.4, fontWeight:700 }}>{group.label.toUpperCase()}</div>
                  <div style={{ fontFamily:mono, fontSize:8, color:"#ffffff35" }}>{total.toLocaleString()} terms</div>
                </div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
                  {groupBranches.map(branch => {
                    const region = REGIONS.find(r => r.id === branch.treeNum);
                    const special = SPECIAL_CFG.find(s => s.treeNum === branch.treeNum);
                    const systemic = SYSTEMIC_CFG.find(s => s.treeNum === branch.treeNum);
                    const nextSel = region
                      ? { type:"region", id:branch.treeNum }
                      : special
                        ? { type:"special", id:branch.treeNum }
                        : systemic
                          ? { type:"systemicBranch", id:branch.treeNum }
                          : { type:"region", id:branch.treeNum };
                    return (
                      <button
                        key={branch.treeNum}
                        type="button"
                        onClick={() => selectNavigation(nextSel)}
                        style={{
                          display:"inline-flex",
                          alignItems:"center",
                          gap:6,
                          padding:"5px 8px",
                          background:group.color+"12",
                          border:`1px solid ${group.color}34`,
                          borderRadius:999,
                          cursor:"pointer",
                          fontFamily:mono,
                          fontSize:8,
                          color:"#ffffffb8",
                          lineHeight:1.25,
                        }}
                      >
                        <span style={{ color:group.color }}>{branch.treeNum}</span>
                        <span>{branch.term.name}</span>
                        <span style={{ color:"#ffffff35", fontSize:7 }}>{branch.totalCount}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );

    if (isSysSel()) return (
      <div style={{ padding:"20px 24px", overflowY:"auto", height:"100%" }}>
        <div style={{ fontFamily:mono, fontSize:8, color:TREE_COLOR, letterSpacing:2, marginBottom:6 }}>CROSS-CUTTING BRANCHES</div>
        <div style={{ fontFamily:mono, fontSize:13, color:"#e8e8e8", fontWeight:700, marginBottom:8 }}>Systemic Diseases</div>
        <div style={{ fontFamily:mono, fontSize:9, color:"#ffffff44", lineHeight:1.8, marginBottom:20 }}>
          These four branches span all organ systems — organized by mechanism or etiology rather than anatomy. Together ~37% of all C terms.
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
          {SYSTEMIC_TNS.map(tn => {
            const b = byTN[tn]; if (!b) return null;
            return (
              <div key={tn} style={{ padding:"12px 14px", background:"#ffffff08", border:"1px solid #ffffff0e", borderLeft:`3px solid ${TREE_COLOR}55`, borderRadius:4 }}>
                <div style={{ fontFamily:mono, fontSize:8, color:TREE_COLOR, marginBottom:3 }}>{tn}</div>
                <div style={{ fontFamily:mono, fontSize:11, color:"#e8e8e8", fontWeight:700, marginBottom:4, lineHeight:1.3 }}>{b.term.name}</div>
                <div style={{ fontFamily:mono, fontSize:8, color:"#ffffff33", marginBottom:6 }}>{b.totalCount.toLocaleString()} terms</div>
                {b.term.note && <div style={{ fontFamily:mono, fontSize:8.5, color:"#ffffff44", lineHeight:1.5 }}>{b.term.note.slice(0,130)}…</div>}
              </div>
            );
          })}
        </div>
      </div>
    );

    if (isDistSel()) return (
      <div style={{ padding:"20px 24px", overflowY:"auto", height:"100%" }}>
        <div style={{ fontFamily:mono, fontSize:8, color:"#DDB892", letterSpacing:2, marginBottom:6 }}>DISTRIBUTED SYSTEMS</div>
        <div style={{ fontFamily:mono, fontSize:13, color:"#e8e8e8", fontWeight:700, marginBottom:8 }}>Whole-Body Disease Systems</div>
        <div style={{ fontFamily:mono, fontSize:9, color:"#ffffff44", lineHeight:1.8, marginBottom:16 }}>
          These branches affect the whole body — no single anatomical home.
        </div>
        {DIST_REGION.branches.map(tn => (
          <div key={tn} style={{ marginBottom:14 }}>
            {renderSpecialExplorer(tn, "#DDB892")}
          </div>
        ))}
      </div>
    );

    if (sel.type === "systemicBranch") {
      const cfg = SYSTEMIC_CFG.find(s => s.treeNum === sel.id);
      const b = byTN[sel.id];
      if (!cfg || !b) return null;
      return (
        <div style={{ padding:"20px 24px", overflowY:"auto", height:"100%" }}>
          <div style={{ fontFamily:mono, fontSize:8, color:cfg.color, letterSpacing:2, marginBottom:6 }}>{sel.id} · SYSTEMIC</div>
          <div style={{ fontFamily:mono, fontSize:13, color:"#e8e8e8", fontWeight:700, marginBottom:8 }}>{b.term.name}</div>
          {b.term.note && (
            <div style={{ fontFamily:mono, fontSize:9, color:"#ffffff44", lineHeight:1.7, marginBottom:16 }}>
              {b.term.note}
            </div>
          )}
          <div style={{ fontFamily:mono, fontSize:8, color:"#ffffff33", marginBottom:10 }}>{b.totalCount.toLocaleString()} total terms</div>
          {renderSpecialExplorer(sel.id, cfg.color)}
        </div>
      );
    }

    if (sel.type === "region") {
      const region = REGIONS.find(r => r.id === sel.id); if (!region) return null;
      return (
        <div style={{ padding:"20px 24px", overflowY:"auto", height:"100%" }}>
          <div style={{ fontFamily:mono, fontSize:8, color:region.color, letterSpacing:2, marginBottom:6 }}>{region.label.toUpperCase()}</div>
          {region.branches.map(tn => {
            const b = byTN[tn]; if (!b) return null;
            return (
              <div key={tn} style={{ marginBottom:14 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:4 }}>
                  <div>
                    <span style={{ fontFamily:mono, fontSize:8, color:region.color }}>{tn} · </span>
                    <span style={{ fontFamily:mono, fontSize:11, color:"#e8e8e8", fontWeight:700 }}>{b.term.name}</span>
                  </div>
                  <span style={{ fontFamily:mono, fontSize:8, color:"#ffffff33", flexShrink:0, marginLeft:8 }}>{b.totalCount} terms</span>
                </div>
                {b.term.note && <div style={{ fontFamily:mono, fontSize:8.5, color:"#ffffff44", lineHeight:1.5, marginBottom:8 }}>{b.term.note.slice(0,160)}…</div>}
                {renderSpecialExplorer(tn, region.color)}
              </div>
            );
          })}
          <div style={{ marginTop:4, padding:"8px 12px", background:"#ffffff04", borderRadius:4, fontFamily:mono, fontSize:8, color:"#ffffff22" }}>
            Systemic diseases (infections, neoplasms, congenital) can also manifest in this region
          </div>
        </div>
      );
    }

    if (sel.type === "special") {
      const cfg = SPECIAL_CFG.find(s => s.treeNum === sel.id); if (!cfg) return null;
      const b   = byTN[sel.id];
      const kids = childrenMap.get(sel.id) || [];

      // Animal Diseases
      if (sel.id === "C22") return (
        <div style={{ padding:"20px 24px", overflowY:"auto", height:"100%" }}>
          <div style={{ fontFamily:mono, fontSize:8, color:cfg.color, letterSpacing:2, marginBottom:4 }}>C22 · ANIMAL DISEASES</div>
          <div style={{ fontFamily:mono, fontSize:12, color:"#e8e8e8", fontWeight:700, marginBottom:6 }}>{b?.totalCount} terms across {kids.length} host-species groups</div>
          <div style={{ fontFamily:mono, fontSize:9, color:"#ffffff44", lineHeight:1.7, marginBottom:16 }}>
            Select tags to drill down through host-species disease groups.
          </div>
          {renderSpecialExplorer("C22", cfg.color)}
        </div>
      );

      // Chemically-Induced
      if (sel.id === "C25") return (
        <div style={{ padding:"20px 24px", overflowY:"auto", height:"100%" }}>
          <div style={{ fontFamily:mono, fontSize:8, color:cfg.color, letterSpacing:2, marginBottom:4 }}>C25 · CHEMICALLY-INDUCED</div>
          <div style={{ fontFamily:mono, fontSize:12, color:"#e8e8e8", fontWeight:700, marginBottom:8 }}>{b?.totalCount} terms · {kids.length} branches</div>
          <div style={{ fontFamily:mono, fontSize:9, color:"#ffffff44", lineHeight:1.7, marginBottom:16 }}>
            Select tags to inspect lower-level drug, poisoning, and substance-related terms.
          </div>
          {renderSpecialExplorer("C25", cfg.color)}
        </div>
      );

      // Occupational Diseases
      if (sel.id === "C24") return (
        <div style={{ padding:"20px 24px", overflowY:"auto", height:"100%" }}>
          <div style={{ fontFamily:mono, fontSize:8, color:cfg.color, letterSpacing:2, marginBottom:4 }}>C24 · OCCUPATIONAL DISEASES</div>
          <div style={{ fontFamily:mono, fontSize:12, color:"#e8e8e8", fontWeight:700, marginBottom:8 }}>{b?.totalCount} terms · {kids.length} categories</div>
          <div style={{ fontFamily:mono, fontSize:9, color:"#ffffff44", lineHeight:1.7, marginBottom:16 }}>
            Small branch, but still navigable with the same tag model.
          </div>
          {renderSpecialExplorer("C24", cfg.color)}
        </div>
      );

      // Wounds & Injuries
      if (sel.id === "C26") return (
        <div style={{ padding:"20px 24px", overflowY:"auto", height:"100%" }}>
          <div style={{ fontFamily:mono, fontSize:8, color:cfg.color, letterSpacing:2, marginBottom:4 }}>C26 · WOUNDS & INJURIES</div>
          <div style={{ fontFamily:mono, fontSize:12, color:"#e8e8e8", fontWeight:700, marginBottom:8 }}>
            {b?.totalCount} terms · {kids.length} injury types — widest, flattest branch in C
          </div>
          <div style={{ fontFamily:mono, fontSize:9, color:"#ffffff44", lineHeight:1.7, marginBottom:16 }}>
            Select injury-type tags to see lower-level terms.
          </div>
          {renderSpecialExplorer("C26", cfg.color)}
        </div>
      );

      // Environmental Origin (stub)
      if (sel.id === "C21") return (
        <div style={{ padding:"20px 24px", overflowY:"auto", height:"100%" }}>
          <div style={{ fontFamily:mono, fontSize:8, color:cfg.color, letterSpacing:2, marginBottom:4 }}>C21 · ENVIRONMENTAL ORIGIN</div>
          <div style={{ fontFamily:mono, fontSize:12, color:"#e8e8e8", fontWeight:700, marginBottom:8 }}>Stub — {b?.totalCount} terms only</div>
          <div style={{ fontFamily:mono, fontSize:9, color:"#ffffff44", lineHeight:1.8, marginBottom:16 }}>
            Only 2 direct children and 4 terms total in the 2026 edition — a category that exists in name but remains almost empty.
          </div>
          {renderSpecialExplorer("C21", cfg.color)}
        </div>
      );
    }

    return null;
  }

  const activeDetailTreeNum = selectedTag || (sel.id && treeIndex.has(sel.id) ? sel.id : null);
  const activeDetailEntry = activeDetailTreeNum ? treeIndex.get(activeDetailTreeNum) : null;
  const activeDetailColor = activeDetailTreeNum ? groupColor(activeDetailTreeNum.slice(0, 3)) : TREE_COLOR;
  const selectedDetail = activeDetailEntry ? {
    id: activeDetailEntry.term.name,
    branch: "c",
    color: activeDetailColor,
    treeNum: activeDetailTreeNum,
    ui: activeDetailEntry.term.ui,
    note: activeDetailEntry.term.note || activeDetailEntry.term.scopeNote,
  } : null;

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ background:BG, height:"100%", display:"flex", flexDirection:"column", overflow:"hidden" }}>
      <div style={{ padding:"16px 24px 12px", borderBottom:"1px solid #ffffff0e", flexShrink:0 }}>
        <div style={{ fontFamily:mono, fontSize:9, color:TREE_COLOR, letterSpacing:3, marginBottom:4 }}>C — DISEASES</div>
        <div style={{ fontFamily:mono, fontSize:15, color:"#e8e8e8", fontWeight:700 }}>Body Map</div>
        <div style={{ fontFamily:mono, fontSize:9, color:"#ffffff44", marginTop:3 }}>Body regions act as the top-level selector · selected branches stay visible at right</div>
      </div>

      <div style={{ flex:1, display:"grid", gridTemplateColumns:"minmax(390px, 0.95fr) minmax(420px, 1.05fr)", overflow:"hidden" }}>
        <div style={{ borderRight:"1px solid #ffffff0a", display:"flex", flexDirection:"column", overflowY:"auto", padding:"18px 22px", gap:14 }}>
          <div style={{ border:"1px solid #ffffff14", borderRadius:8, background:"linear-gradient(180deg,#ffffff05,transparent)", padding:"12px 8px 10px" }}>
            <svg viewBox="0 0 523 740" style={{ display:"block", width:"100%", maxHeight:590, margin:"0 auto" }} aria-label="Disease body region selector">
              <path d={BODY_SILHOUETTE_PATH} fill="#ffffff14" stroke="#ffffff33" strokeWidth={1.5} />
              <path
                d={BODY_SILHOUETTE_PATH}
                fill="transparent"
                stroke={isRegSel("C17") || hovReg === "C17" ? "#E8C888" : "transparent"}
                strokeWidth={isRegSel("C17") ? 4 : 3}
                style={{ cursor:"pointer", pointerEvents:"stroke", transition:"stroke 0.15s" }}
                onClick={() => setSel({type:"region",id:"C17"})}
                onMouseEnter={() => setHovReg("C17")}
                onMouseLeave={() => setHovReg(null)}
              />

              <ellipse onClick={() => setSel({type:"region",id:"C10"})} onMouseEnter={() => setHovReg("C10")} onMouseLeave={() => setHovReg(null)} cx={249} cy={135} rx={34} ry={42} fill={rFill("C10","#9B72CF")} stroke={rStroke("C10","#9B72CF")} strokeWidth={rSW("C10")} style={{ cursor:"pointer", transition:"all 0.15s" }} />
              <ellipse onClick={() => setSel({type:"region",id:"C11"})} onMouseEnter={() => setHovReg("C11")} onMouseLeave={() => setHovReg(null)} cx={238} cy={130} rx={11} ry={9} fill={rFill("C11","#FF9A9E")} stroke={rStroke("C11","#FF9A9E")} strokeWidth={rSW("C11")} style={{ cursor:"pointer", transition:"all 0.15s" }} />
              <ellipse onClick={() => setSel({type:"region",id:"C11"})} onMouseEnter={() => setHovReg("C11")} onMouseLeave={() => setHovReg(null)} cx={260} cy={130} rx={11} ry={9} fill={rFill("C11","#FF9A9E")} stroke={rStroke("C11","#FF9A9E")} strokeWidth={rSW("C11")} style={{ cursor:"pointer", transition:"all 0.15s" }} />
              <path onClick={() => setSel({type:"region",id:"C09"})} onMouseEnter={() => setHovReg("C09")} onMouseLeave={() => setHovReg(null)} d="M224,139 C214,143 213,158 225,161 L230,154 C226,150 226,145 229,142 Z M274,139 C284,143 285,158 273,161 L268,154 C272,150 272,145 269,142 Z" fill={rFill("C09","#F0B8C8")} stroke={rStroke("C09","#F0B8C8")} strokeWidth={rSW("C09")} style={{ cursor:"pointer", transition:"all 0.15s" }} />
              <rect onClick={() => setSel({type:"region",id:"C07"})} onMouseEnter={() => setHovReg("C07")} onMouseLeave={() => setHovReg(null)} x={228} y={178} width={42} height={34} rx={12} fill={rFill("C07","#F0B8C8")} stroke={rStroke("C07","#F0B8C8")} strokeWidth={rSW("C07")} style={{ cursor:"pointer", transition:"all 0.15s" }} />
              <rect onClick={() => setSel({type:"region",id:"C08"})} onMouseEnter={() => setHovReg("C08")} onMouseLeave={() => setHovReg(null)} x={180} y={220} width={66} height={78} rx={18} fill={rFill("C08","#4ECDC4")} stroke={rStroke("C08","#4ECDC4")} strokeWidth={rSW("C08")} style={{ cursor:"pointer", transition:"all 0.15s" }} />
              <rect onClick={() => setSel({type:"region",id:"C14"})} onMouseEnter={() => setHovReg("C14")} onMouseLeave={() => setHovReg(null)} x={247} y={220} width={44} height={78} rx={16} fill={rFill("C14","#E07A5F")} stroke={rStroke("C14","#E07A5F")} strokeWidth={rSW("C14")} style={{ cursor:"pointer", transition:"all 0.15s" }} />
              <rect onClick={() => setSel({type:"region",id:"C15"})} onMouseEnter={() => setHovReg("C15")} onMouseLeave={() => setHovReg(null)} x={292} y={220} width={26} height={78} rx={12} fill={rFill("C15","#F4A261")} stroke={rStroke("C15","#F4A261")} strokeWidth={rSW("C15")} style={{ cursor:"pointer", transition:"all 0.15s" }} />
              <rect onClick={() => setSel({type:"region",id:"C06"})} onMouseEnter={() => setHovReg("C06")} onMouseLeave={() => setHovReg(null)} x={172} y={300} width={78} height={74} rx={18} fill={rFill("C06","#81B29A")} stroke={rStroke("C06","#81B29A")} strokeWidth={rSW("C06")} style={{ cursor:"pointer", transition:"all 0.15s" }} />
              <rect onClick={() => setSel({type:"region",id:"C18"})} onMouseEnter={() => setHovReg("C18")} onMouseLeave={() => setHovReg(null)} x={251} y={300} width={37} height={74} rx={14} fill={rFill("C18","#A8DADC")} stroke={rStroke("C18","#A8DADC")} strokeWidth={rSW("C18")} style={{ cursor:"pointer", transition:"all 0.15s" }} />
              <rect onClick={() => setSel({type:"region",id:"C19"})} onMouseEnter={() => setHovReg("C19")} onMouseLeave={() => setHovReg(null)} x={289} y={300} width={37} height={36} rx={12} fill={rFill("C19","#D8A8D8")} stroke={rStroke("C19","#D8A8D8")} strokeWidth={rSW("C19")} style={{ cursor:"pointer", transition:"all 0.15s" }} />
              <rect onClick={() => setSel({type:"region",id:"C20"})} onMouseEnter={() => setHovReg("C20")} onMouseLeave={() => setHovReg(null)} x={289} y={338} width={37} height={36} rx={12} fill={rFill("C20","#A8D8C8")} stroke={rStroke("C20","#A8D8C8")} strokeWidth={rSW("C20")} style={{ cursor:"pointer", transition:"all 0.15s" }} />
              <rect onClick={() => setSel({type:"region",id:"C12"})} onMouseEnter={() => setHovReg("C12")} onMouseLeave={() => setHovReg(null)} x={176} y={376} width={146} height={62} rx={24} fill={rFill("C12","#A8DADC")} stroke={rStroke("C12","#A8DADC")} strokeWidth={rSW("C12")} style={{ cursor:"pointer", transition:"all 0.15s" }} />
              {[
                "M170,232 C162,290 159,350 157,408 C161,420 172,418 174,405 C178,350 182,295 188,240 C184,234 176,231 170,232 Z",
                "M329,232 C337,290 340,350 342,408 C338,420 327,418 325,405 C321,350 317,295 311,240 C315,234 323,231 329,232 Z",
                "M205,442 C193,510 189,590 195,650 C198,668 210,670 214,652 C220,590 224,510 245,446 C232,440 218,440 205,442 Z",
                "M294,442 C306,510 310,590 304,650 C301,668 289,670 285,652 C279,590 275,510 254,446 C267,440 281,440 294,442 Z",
              ].map((d, i) => (
                <path key={i} onClick={() => setSel({type:"region",id:"C05"})} onMouseEnter={() => setHovReg("C05")} onMouseLeave={() => setHovReg(null)} d={d} fill={rFill("C05","#DDB892")} stroke={rStroke("C05","#DDB892")} strokeWidth={rSW("C05")} style={{ cursor:"pointer", transition:"all 0.15s" }} />
              ))}

              {diagramLabels.map(([id, color, x1, y1, x2, y2, tx, ty, label]) => (
                <g
                  key={id}
                  onClick={() => setSel({type:"region",id})}
                  onMouseEnter={() => setHovReg(id)}
                  onMouseLeave={() => setHovReg(null)}
                  style={{ cursor:"pointer" }}
                >
                  <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={(isRegSel(id) || hovReg === id ? color : "#ffffff33")} strokeWidth={1} />
                  <text x={tx} y={ty} fontFamily={mono} fontSize={8.4} fill={isRegSel(id) || hovReg === id ? color : "#ffffff55"}>{label}</text>
                </g>
              ))}
            </svg>
          </div>

          <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
            <button
              type="button"
              onClick={() => selectNavigation({type:"overview"})}
              style={{ padding:"6px 9px", display:"flex", alignItems:"center", gap:6, fontFamily:mono, fontSize:8, background:isOverviewSel()?TREE_COLOR+"1e":"#ffffff06", border:`1px solid ${isOverviewSel()?TREE_COLOR:"#ffffff0a"}`, borderRadius:5, cursor:"pointer", color:isOverviewSel()?TREE_COLOR:"#ffffff55", transition:"all 0.12s", textAlign:"left" }}
            >
              <span>C</span>
              <span>Top Level</span>
            </button>
            {SYSTEMIC_CFG.map(s => {
              const active = s.type === "distributed" ? isDistSel() : isSysBranchSel(s.treeNum);
              const count = s.type === "distributed"
                ? DIST_REGION.branches.reduce((sum, tn) => sum + (byTN[tn]?.totalCount || 0), 0)
                : byTN[s.treeNum]?.totalCount;
              return (
                <button
                  key={s.type === "distributed" ? s.id : s.treeNum}
                  onClick={() => selectNavigation(s.type === "distributed" ? {type:"distributed"} : {type:"systemicBranch", id:s.treeNum})}
                  style={{ padding:"6px 9px", display:"flex", alignItems:"center", gap:6, fontFamily:mono, fontSize:8, background:active?s.color+"1e":"#ffffff06", border:`1px solid ${active?s.color:"#ffffff0a"}`, borderRadius:5, cursor:"pointer", color:active?s.color:"#ffffff55", transition:"all 0.12s", textAlign:"left" }}
                >
                  <span>{s.type === "distributed" ? "≋" : s.treeNum}</span>
                  <span>{s.label}</span>
                  <span style={{ color:"#ffffff22", fontSize:7 }}>{count}</span>
                </button>
              );
            })}
            {SPECIAL_CFG.map(s => (
              <button key={s.treeNum} onClick={() => selectNavigation({type:"special",id:s.treeNum})} style={{ padding:"6px 9px", display:"flex", alignItems:"center", gap:6, fontFamily:mono, fontSize:8, background:isSpecSel(s.treeNum)?s.color+"1e":"#ffffff06", border:`1px solid ${isSpecSel(s.treeNum)?s.color:"#ffffff0a"}`, borderRadius:5, cursor:"pointer", color:isSpecSel(s.treeNum)?s.color:"#ffffff55", transition:"all 0.12s", textAlign:"left" }}>
                <span>{s.emoji}</span>
                <span>{s.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div style={{ overflowY:"auto", minWidth:0 }}>
          {renderPanel()}
        </div>
      </div>
      <FloatingMeshDetailPanel selected={selectedDetail} query={queryBuilder} />
      <FloatingMeshQueryPanel query={queryBuilder} />
    </div>
  );
}

export default function MeshCConcepts() {
  const { data, loading } = useCData();

  return (
    <div style={{ width: "100%", height: "100vh", background: BG }}>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&display=swap" rel="stylesheet" />
      {loading ? <Loading /> : <BodyMap data={data} />}
    </div>
  );
}
