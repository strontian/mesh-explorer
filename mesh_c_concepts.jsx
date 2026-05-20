import { useState, useEffect } from "react";

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
  { id:"head",    label:"Head & Senses",       color:"#FF9A9E", branches:["C07","C09","C10","C11"] },
  { id:"chest",   label:"Chest",               color:"#4ECDC4", branches:["C08","C14","C15"] },
  { id:"abdomen", label:"Abdomen",             color:"#81B29A", branches:["C06","C18","C19"] },
  { id:"pelvis",  label:"Pelvis & Urogenital", color:"#A8DADC", branches:["C12"] },
];
const DIST_REGION = { branches:["C05","C17","C20"] };
const SYSTEMIC_TNS = ["C01","C04","C16","C23"];
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

function BodyMap({ data }) {
  const { branches, childrenMap } = data;
  const [sel, setSel]     = useState({ type:"systemic" });
  const [hovReg, setHovReg] = useState(null);
  const byTN = Object.fromEntries(branches.map(b => [b.treeNum, b]));

  const isSysSel  = () => sel.type === "systemic";
  const isDistSel = () => sel.type === "distributed";
  const isRegSel  = id => sel.type === "region"  && sel.id === id;
  const isSpecSel = tn => sel.type === "special"  && sel.id === tn;

  // SVG helpers — keep transitions on shapes, not on <g>
  const rFill   = (id, c) => isRegSel(id)||hovReg===id ? c+"2e" : "#ffffff0a";
  const rStroke = (id, c) => isRegSel(id) ? c : hovReg===id ? c+"99" : "#ffffff1a";
  const rSW     = id => isRegSel(id) ? 2 : 1;
  const rTxt    = (id, c) => isRegSel(id)||hovReg===id ? c : "#ffffff33";

  // ── Right panel ──────────────────────────────────────────────────────────
  function renderPanel() {

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
        {DIST_REGION.branches.map(tn => {
          const b = byTN[tn]; if (!b) return null;
          const kids = (childrenMap.get(tn)||[]).slice(0,9);
          return (
            <div key={tn} style={{ marginBottom:14, padding:"12px 14px", background:"#ffffff06", borderLeft:"3px solid #DDB89255", borderRadius:4 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                <span style={{ fontFamily:mono, fontSize:8, color:"#DDB892" }}>{tn}</span>
                <span style={{ fontFamily:mono, fontSize:8, color:"#ffffff33" }}>{b.totalCount} terms</span>
              </div>
              <div style={{ fontFamily:mono, fontSize:11, color:"#e8e8e8", fontWeight:700, marginBottom:8 }}>{b.term.name}</div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
                {kids.map(({term:kt,treeNum:ktn}) => (
                  <div key={ktn} style={{ padding:"2px 7px", fontFamily:mono, fontSize:8, color:"#DDB892bb", background:"#DDB89211", border:"1px solid #DDB89222", borderRadius:3 }}>{kt.name}</div>
                ))}
                {(childrenMap.get(tn)||[]).length > 9 && <div style={{ padding:"2px 7px", fontFamily:mono, fontSize:8, color:"#ffffff22" }}>+{(childrenMap.get(tn)||[]).length-9}</div>}
              </div>
            </div>
          );
        })}
      </div>
    );

    if (sel.type === "region") {
      const region = REGIONS.find(r => r.id === sel.id); if (!region) return null;
      return (
        <div style={{ padding:"20px 24px", overflowY:"auto", height:"100%" }}>
          <div style={{ fontFamily:mono, fontSize:8, color:region.color, letterSpacing:2, marginBottom:6 }}>{region.label.toUpperCase()}</div>
          {region.branches.map(tn => {
            const b = byTN[tn]; if (!b) return null;
            const kids = (childrenMap.get(tn)||[]).slice(0,9);
            return (
              <div key={tn} style={{ marginBottom:14, padding:"12px 14px", background:"#ffffff06", borderLeft:`3px solid ${region.color}55`, borderRadius:4 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:4 }}>
                  <div>
                    <span style={{ fontFamily:mono, fontSize:8, color:region.color }}>{tn} · </span>
                    <span style={{ fontFamily:mono, fontSize:11, color:"#e8e8e8", fontWeight:700 }}>{b.term.name}</span>
                  </div>
                  <span style={{ fontFamily:mono, fontSize:8, color:"#ffffff33", flexShrink:0, marginLeft:8 }}>{b.totalCount} terms</span>
                </div>
                {b.term.note && <div style={{ fontFamily:mono, fontSize:8.5, color:"#ffffff44", lineHeight:1.5, marginBottom:8 }}>{b.term.note.slice(0,160)}…</div>}
                <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
                  {kids.map(({term:kt,treeNum:ktn}) => (
                    <div key={ktn} style={{ padding:"2px 7px", fontFamily:mono, fontSize:8, color:region.color+"bb", background:region.color+"11", border:`1px solid ${region.color}22`, borderRadius:3 }}>{kt.name}</div>
                  ))}
                  {(childrenMap.get(tn)||[]).length > 9 && <div style={{ padding:"2px 7px", fontFamily:mono, fontSize:8, color:"#ffffff22" }}>+{(childrenMap.get(tn)||[]).length-9}</div>}
                </div>
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
            Diseases specific to non-human animals. Organized by host species — not used to index human disease papers.
          </div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
            {kids.map(({term:kt,treeNum:ktn}) => {
              const sub = childrenMap.get(ktn)?.length || 0;
              return (
                <div key={ktn} style={{ padding:"8px 10px", borderRadius:6, background:cfg.color+"11", border:`1px solid ${cfg.color}33`, display:"flex", flexDirection:"column", alignItems:"center", gap:3, minWidth:76 }}>
                  <span style={{ fontSize:20 }}>{animalEmoji(kt.name)}</span>
                  <div style={{ fontFamily:mono, fontSize:7.5, color:"#d0d0d0", textAlign:"center", lineHeight:1.3 }}>
                    {kt.name.replace(/\s*Diseases?$/,"")}
                  </div>
                  {sub > 0 && <div style={{ fontFamily:mono, fontSize:7, color:cfg.color+"88" }}>+{sub}</div>}
                </div>
              );
            })}
          </div>
        </div>
      );

      // Chemically-Induced
      if (sel.id === "C25") return (
        <div style={{ padding:"20px 24px", overflowY:"auto", height:"100%" }}>
          <div style={{ fontFamily:mono, fontSize:8, color:cfg.color, letterSpacing:2, marginBottom:4 }}>C25 · CHEMICALLY-INDUCED</div>
          <div style={{ fontFamily:mono, fontSize:12, color:"#e8e8e8", fontWeight:700, marginBottom:8 }}>{b?.totalCount} terms · {kids.length} branches</div>
          <div style={{ fontFamily:mono, fontSize:9, color:"#ffffff44", lineHeight:1.7, marginBottom:16 }}>
            Disorders caused by chemical, drug, or toxic exposure. Organized by substance type rather than organ system.
          </div>
          {kids.map(({term:kt,treeNum:ktn}) => {
            const total = branches.find(x=>x.treeNum===ktn)?.totalCount ?? (childrenMap.get(ktn)||[]).length;
            return (
              <div key={ktn} style={{ marginBottom:10, padding:"12px 14px", background:"#ffffff06", borderLeft:`3px solid ${cfg.color}55`, borderRadius:4 }}>
                <div style={{ fontFamily:mono, fontSize:8, color:cfg.color, marginBottom:2 }}>{ktn}</div>
                <div style={{ fontFamily:mono, fontSize:11, color:"#e8e8e8", fontWeight:700, marginBottom:4 }}>{kt.name}</div>
                <div style={{ fontFamily:mono, fontSize:8, color:"#ffffff33", marginBottom:6 }}>~{total} terms</div>
                {kt.note && <div style={{ fontFamily:mono, fontSize:8.5, color:"#ffffff44", lineHeight:1.5 }}>{kt.note.slice(0,200)}…</div>}
              </div>
            );
          })}
        </div>
      );

      // Occupational Diseases
      if (sel.id === "C24") return (
        <div style={{ padding:"20px 24px", overflowY:"auto", height:"100%" }}>
          <div style={{ fontFamily:mono, fontSize:8, color:cfg.color, letterSpacing:2, marginBottom:4 }}>C24 · OCCUPATIONAL DISEASES</div>
          <div style={{ fontFamily:mono, fontSize:12, color:"#e8e8e8", fontWeight:700, marginBottom:8 }}>{b?.totalCount} terms · {kids.length} categories</div>
          <div style={{ fontFamily:mono, fontSize:9, color:"#ffffff44", lineHeight:1.7, marginBottom:16 }}>
            Diseases arising from workplace exposures. Small but focused — only {b?.totalCount} terms total.
          </div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
            {kids.map(({term:kt,treeNum:ktn}) => (
              <div key={ktn} style={{ padding:"5px 10px", fontFamily:mono, fontSize:9, color:cfg.color+"cc", background:cfg.color+"11", border:`1px solid ${cfg.color}33`, borderRadius:4 }}>{kt.name}</div>
            ))}
          </div>
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
            53 direct children but shallow: most injuries don't sub-classify deeply. Darker tags have sub-terms.
          </div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
            {kids.map(({term:kt,treeNum:ktn}) => {
              const sub = childrenMap.get(ktn)?.length || 0;
              return (
                <div key={ktn} style={{ padding:"4px 9px", fontFamily:mono, fontSize:8.5, color:sub>0?"#e8e8e8":"#666", background:sub>0?cfg.color+"22":"#ffffff06", border:`1px solid ${sub>0?cfg.color+"44":"#ffffff0a"}`, borderRadius:3 }}>
                  {kt.name}{sub>0?` +${sub}`:""}
                </div>
              );
            })}
          </div>
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
          {kids.map(({term:kt,treeNum:ktn}) => (
            <div key={ktn} style={{ marginBottom:8, padding:"10px 14px", background:"#ffffff06", borderLeft:`3px solid ${cfg.color}44`, borderRadius:4 }}>
              <div style={{ fontFamily:mono, fontSize:8, color:cfg.color }}>{ktn}</div>
              <div style={{ fontFamily:mono, fontSize:11, color:"#e8e8e8", marginTop:2 }}>{kt.name}</div>
              {kt.note && <div style={{ fontFamily:mono, fontSize:8.5, color:"#ffffff44", marginTop:4 }}>{kt.note.slice(0,240)}</div>}
            </div>
          ))}
        </div>
      );
    }

    return null;
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ background:BG, height:"100%", display:"flex", flexDirection:"column", overflow:"hidden" }}>
      <div style={{ padding:"16px 24px 12px", borderBottom:"1px solid #ffffff0e", flexShrink:0 }}>
        <div style={{ fontFamily:mono, fontSize:9, color:TREE_COLOR, letterSpacing:3, marginBottom:4 }}>C — DISEASES</div>
        <div style={{ fontFamily:mono, fontSize:15, color:"#e8e8e8", fontWeight:700 }}>Body Map</div>
        <div style={{ fontFamily:mono, fontSize:9, color:"#ffffff44", marginTop:3 }}>Click a body region · systemic, distributed & special categories alongside</div>
      </div>

      <div style={{ flex:1, display:"flex", overflow:"hidden" }}>

        {/* ── Left: body schematic + nav ─────────────────────────────────── */}
        <div style={{ width:210, borderRight:"1px solid #ffffff0a", display:"flex", flexDirection:"column", overflowY:"auto", padding:"12px 10px 16px", flexShrink:0, gap:8 }}>

          <button onClick={() => setSel({type:"systemic"})} style={{ padding:"6px 10px", fontFamily:mono, fontSize:8, letterSpacing:1, background:isSysSel()?TREE_COLOR+"22":"#ffffff08", border:`1px solid ${isSysSel()?TREE_COLOR:"#ffffff11"}`, borderRadius:4, cursor:"pointer", color:isSysSel()?TREE_COLOR:"#ffffff44", transition:"all 0.12s" }}>
            ⟳ SYSTEMIC / CROSS-CUTTING
          </button>

          {/* SVG body */}
          <svg viewBox="0 0 200 365" width={168} style={{ display:"block", margin:"0 auto" }}>
            {/* Arm silhouettes (decorative) */}
            <rect x={22} y={95} width={21} height={72} rx={10} fill="#ffffff05" stroke="#ffffff0e" strokeWidth={1}/>
            <rect x={157} y={95} width={21} height={72} rx={10} fill="#ffffff05" stroke="#ffffff0e" strokeWidth={1}/>
            {/* Leg silhouettes (decorative) */}
            <rect x={61} y={308} width={32} height={48} rx={9} fill="#ffffff05" stroke="#ffffff0e" strokeWidth={1}/>
            <rect x={107} y={308} width={32} height={48} rx={9} fill="#ffffff05" stroke="#ffffff0e" strokeWidth={1}/>

            {/* HEAD */}
            <g onClick={()=>setSel({type:"region",id:"head"})} onMouseEnter={()=>setHovReg("head")} onMouseLeave={()=>setHovReg(null)} style={{cursor:"pointer"}}>
              <ellipse cx={100} cy={44} rx={34} ry={31} fill={rFill("head","#FF9A9E")} stroke={rStroke("head","#FF9A9E")} strokeWidth={rSW("head")} style={{transition:"all 0.15s"}}/>
              <rect x={87} y={75} width={26} height={18} rx={5} fill={rFill("head","#FF9A9E")} stroke={rStroke("head","#FF9A9E")} strokeWidth={rSW("head")} style={{transition:"all 0.15s"}}/>
              <text x={100} y={42} textAnchor="middle" fontFamily={mono} fontSize={8} fontWeight={600} fill={rTxt("head","#FF9A9E")} style={{pointerEvents:"none",transition:"fill 0.15s"}}>HEAD</text>
              <text x={100} y={55} textAnchor="middle" fontFamily={mono} fontSize={7} fill={rTxt("head","#FF9A9E")+"88"} style={{pointerEvents:"none"}}>& SENSES</text>
            </g>

            {/* CHEST */}
            <g onClick={()=>setSel({type:"region",id:"chest"})} onMouseEnter={()=>setHovReg("chest")} onMouseLeave={()=>setHovReg(null)} style={{cursor:"pointer"}}>
              <rect x={44} y={93} width={112} height={92} rx={8} fill={rFill("chest","#4ECDC4")} stroke={rStroke("chest","#4ECDC4")} strokeWidth={rSW("chest")} style={{transition:"all 0.15s"}}/>
              <text x={100} y={133} textAnchor="middle" fontFamily={mono} fontSize={8} fontWeight={600} fill={rTxt("chest","#4ECDC4")} style={{pointerEvents:"none",transition:"fill 0.15s"}}>CHEST</text>
              <text x={100} y={147} textAnchor="middle" fontFamily={mono} fontSize={7} fill={rTxt("chest","#4ECDC4")+"88"} style={{pointerEvents:"none"}}>HEART · LUNGS</text>
            </g>

            {/* ABDOMEN */}
            <g onClick={()=>setSel({type:"region",id:"abdomen"})} onMouseEnter={()=>setHovReg("abdomen")} onMouseLeave={()=>setHovReg(null)} style={{cursor:"pointer"}}>
              <rect x={52} y={185} width={96} height={72} rx={7} fill={rFill("abdomen","#81B29A")} stroke={rStroke("abdomen","#81B29A")} strokeWidth={rSW("abdomen")} style={{transition:"all 0.15s"}}/>
              <text x={100} y={221} textAnchor="middle" fontFamily={mono} fontSize={8} fontWeight={600} fill={rTxt("abdomen","#81B29A")} style={{pointerEvents:"none",transition:"fill 0.15s"}}>ABDOMEN</text>
              <text x={100} y={234} textAnchor="middle" fontFamily={mono} fontSize={7} fill={rTxt("abdomen","#81B29A")+"88"} style={{pointerEvents:"none"}}>GI · METABOLIC</text>
            </g>

            {/* PELVIS */}
            <g onClick={()=>setSel({type:"region",id:"pelvis"})} onMouseEnter={()=>setHovReg("pelvis")} onMouseLeave={()=>setHovReg(null)} style={{cursor:"pointer"}}>
              <rect x={58} y={257} width={84} height={50} rx={6} fill={rFill("pelvis","#A8DADC")} stroke={rStroke("pelvis","#A8DADC")} strokeWidth={rSW("pelvis")} style={{transition:"all 0.15s"}}/>
              <text x={100} y={281} textAnchor="middle" fontFamily={mono} fontSize={8} fontWeight={600} fill={rTxt("pelvis","#A8DADC")} style={{pointerEvents:"none",transition:"fill 0.15s"}}>PELVIS</text>
              <text x={100} y={294} textAnchor="middle" fontFamily={mono} fontSize={7} fill={rTxt("pelvis","#A8DADC")+"88"} style={{pointerEvents:"none"}}>UROGENITAL</text>
            </g>
          </svg>

          <button onClick={() => setSel({type:"distributed"})} style={{ padding:"6px 10px", fontFamily:mono, fontSize:8, letterSpacing:1, background:isDistSel()?"#DDB89222":"#ffffff08", border:`1px solid ${isDistSel()?"#DDB892":"#ffffff11"}`, borderRadius:4, cursor:"pointer", color:isDistSel()?"#DDB892":"#ffffff44", transition:"all 0.12s" }}>
            ≋ DISTRIBUTED SYSTEMS
          </button>

          <div style={{ display:"flex", flexDirection:"column", gap:4, marginTop:4 }}>
            <div style={{ fontFamily:mono, fontSize:7, color:"#ffffff18", letterSpacing:2, paddingLeft:2 }}>SPECIAL CATEGORIES</div>
            {SPECIAL_CFG.map(s => (
              <button key={s.treeNum} onClick={() => setSel({type:"special",id:s.treeNum})} style={{ padding:"5px 9px", display:"flex", alignItems:"center", gap:7, fontFamily:mono, fontSize:8.5, background:isSpecSel(s.treeNum)?s.color+"1e":"#ffffff06", border:`1px solid ${isSpecSel(s.treeNum)?s.color:"#ffffff0a"}`, borderRadius:4, cursor:"pointer", color:isSpecSel(s.treeNum)?s.color:"#ffffff44", transition:"all 0.12s", textAlign:"left" }}>
                <span>{s.emoji}</span>
                <span style={{flex:1}}>{s.label}</span>
                <span style={{color:"#ffffff22",fontSize:7.5}}>{byTN[s.treeNum]?.totalCount}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Right: content panel ──────────────────────────────────────── */}
        <div style={{ flex:1, overflowY:"auto" }}>
          {renderPanel()}
        </div>
      </div>
    </div>
  );
}

// ── APP ────────────────────────────────────────────────────────────────────
const VIEWS = [
  { id: "scale",   label: "1. Scale Map" },
  { id: "scatter", label: "2. Shape Scatter" },
  { id: "lanes",   label: "3. Anatomy Lanes" },
  { id: "treemap", label: "4. Treemap" },
  { id: "bodymap", label: "5. Body Map" },
];

export default function MeshCConcepts() {
  const [active, setActive] = useState("scale");
  const { data, loading } = useCData();

  const views = { scale: ScaleBars, scatter: ShapeScatter, lanes: AnatomyLanes, treemap: Treemap, bodymap: BodyMap };
  const Active = views[active];

  return (
    <div style={{ width: "100%", height: "100vh", display: "flex", flexDirection: "column", background: BG }}>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&display=swap" rel="stylesheet" />

      <nav style={{ display: "flex", alignItems: "center", gap: 0, borderBottom: "2px solid #ffffff12", flexShrink: 0, background: "#0a0c10", overflowX: "auto" }}>
        <div style={{ padding: "12px 20px", fontFamily: mono, fontSize: 9, color: "#ffffff33", letterSpacing: 2, flexShrink: 0 }}>
          C CONCEPTS
        </div>
        {VIEWS.map(v => (
          <button
            key={v.id}
            onClick={() => setActive(v.id)}
            style={{
              padding: "12px 18px", fontFamily: mono, fontSize: 10,
              background: "transparent", border: "none",
              borderBottom: active === v.id ? `2px solid ${TREE_COLOR}` : "2px solid transparent",
              marginBottom: "-2px",
              color: active === v.id ? TREE_COLOR : "#ffffff44",
              cursor: "pointer", flexShrink: 0, transition: "all 0.15s",
            }}
          >
            {v.label}
          </button>
        ))}
      </nav>

      <div style={{ flex: 1, overflow: "hidden" }}>
        {loading ? <Loading /> : <Active data={data} />}
      </div>
    </div>
  );
}
