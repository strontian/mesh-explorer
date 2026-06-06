import { useState, useEffect } from "react";
import { OverviewConceptShell } from "./mesh_overview_concept.jsx";

const mono = "'IBM Plex Mono', monospace";
const BG = "#0f1117";
const TREE_COLOR = "#E8C888";

const BRANCH_COLORS = {
  "J01": "#E8A850",
  "J02": "#A8D888",
  "J03": "#88B8D8",
};

// ── DATA HOOK ─────────────────────────────────────────────────────────────
function useJData() {
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

      const raw = (childrenMap.get("J") || []).sort((a, b) =>
        a.treeNum.localeCompare(b.treeNum, undefined, { numeric: true })
      );

      const branches = raw.map(({ term, treeNum }) => ({
        term, treeNum,
        directCount: childrenMap.get(treeNum)?.length ?? 0,
        totalCount: countAll(treeNum),
        color: BRANCH_COLORS[treeNum] || TREE_COLOR,
      }));

      // J01 direct children for breakdown view
      const j01Kids = (childrenMap.get("J01") || [])
        .sort((a, b) => a.treeNum.localeCompare(b.treeNum, undefined, { numeric: true }))
        .map(({ term: t, treeNum: tn }) => ({
          term: t, treeNum: tn,
          directCount: childrenMap.get(tn)?.length ?? 0,
          totalCount: countAll(tn),
        }))
        .sort((a, b) => b.totalCount - a.totalCount);

      setState({ data: { branches, childrenMap, j01Kids, countAll }, loading: false });
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
// SKETCH 1 — SECTOR CARDS
// Cards for each J top branch with counts and children chips
// ═══════════════════════════════════════════════════════════════════════════
function SectorCards({ data }) {
  const [hovered, setHovered] = useState(null);
  const { branches, childrenMap, countAll } = data;
  const maxTotal = Math.max(...branches.map(b => b.totalCount));

  function getTopKids(treeNum, k = 8) {
    return (childrenMap.get(treeNum) || [])
      .sort((a, b) => a.treeNum.localeCompare(b.treeNum, undefined, { numeric: true }))
      .slice(0, k);
  }

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ padding: "12px 24px", borderBottom: "1px solid #ffffff10", flexShrink: 0 }}>
        <div style={{ fontFamily: mono, fontSize: 9, color: "#ffffff33", letterSpacing: 1 }}>
          J — TECHNOLOGY, INDUSTRY, AGRICULTURE
        </div>
      </div>
      {/* Cards */}
      <div style={{ flex: 1, overflowY: "auto", padding: "24px", display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
        {branches.map(b => {
          const color = b.color;
          const pct = Math.round((b.totalCount / maxTotal) * 100);
          const kids = getTopKids(b.treeNum, 8);
          return (
            <div key={b.treeNum} style={{
              flex: "1 1 280px", minWidth: 260, maxWidth: 480,
              background: "#ffffff05",
              border: `1px solid ${color}33`,
              borderRadius: 8,
              padding: "20px",
              display: "flex", flexDirection: "column", gap: 12,
            }}>
              {/* Card header */}
              <div>
                <div style={{ fontFamily: mono, fontSize: 8, color: color, letterSpacing: 2, marginBottom: 4 }}>
                  {b.treeNum}
                </div>
                <div style={{ fontFamily: mono, fontSize: 15, color: "#ffffffcc", fontWeight: 700, lineHeight: 1.3, marginBottom: 10 }}>
                  {b.term.name}
                </div>
                <div style={{ display: "flex", gap: 20, marginBottom: 8 }}>
                  <div style={{ fontFamily: mono, fontSize: 8, color: "#ffffff44" }}>
                    <span style={{ color, fontSize: 18, fontWeight: 700 }}>{b.directCount}</span> direct
                  </div>
                  <div style={{ fontFamily: mono, fontSize: 8, color: "#ffffff44" }}>
                    <span style={{ color, fontSize: 18, fontWeight: 700 }}>{b.totalCount}</span> total
                  </div>
                </div>
                {/* Progress bar */}
                <div style={{ height: 3, background: "#ffffff08", borderRadius: 2 }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 2, opacity: 0.7 }} />
                </div>
              </div>

              {/* Scope note */}
              {b.term.scopeNote && (
                <div style={{ fontFamily: mono, fontSize: 8, color: "#ffffff44", lineHeight: 1.5 }}>
                  {b.term.scopeNote.slice(0, 160)}{b.term.scopeNote.length > 160 ? "…" : ""}
                </div>
              )}

              {/* Children chips */}
              <div>
                <div style={{ fontFamily: mono, fontSize: 7, color: "#ffffff22", letterSpacing: 1, marginBottom: 6 }}>
                  DIRECT CHILDREN (top 8)
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {kids.map(({ term: t, treeNum: tn }) => {
                    const isHov = hovered === tn;
                    const cnt = countAll(tn);
                    return (
                      <div
                        key={tn}
                        onMouseEnter={() => setHovered(tn)}
                        onMouseLeave={() => setHovered(null)}
                        style={{
                          padding: "4px 8px",
                          background: isHov ? color + "22" : "#ffffff08",
                          border: `1px solid ${isHov ? color + "66" : "#ffffff14"}`,
                          borderRadius: 4,
                          cursor: "default",
                          transition: "all 0.12s",
                          position: "relative",
                        }}
                      >
                        <div style={{ fontFamily: mono, fontSize: 8, color: isHov ? color : "#ffffffaa" }}>
                          {t.name}
                        </div>
                        <div style={{ fontFamily: mono, fontSize: 7, color: "#ffffff33" }}>
                          {tn} · {cnt}
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
                  {kids.length === 0 && (
                    <div style={{ fontFamily: mono, fontSize: 8, color: "#ffffff22" }}>No children.</div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SKETCH 2 — J01 BREAKDOWN
// Horizontal bar chart of J01's direct children sorted by totalCount
// Click bar to see its children
// ═══════════════════════════════════════════════════════════════════════════
function J01Breakdown({ data }) {
  const [selected, setSelected] = useState(null);
  const [hovered, setHovered] = useState(null);
  const { j01Kids, childrenMap } = data;

  const maxCount = Math.max(...j01Kids.map(d => d.totalCount), 1);
  const color = BRANCH_COLORS["J01"];

  const selData = selected ? j01Kids.find(d => d.treeNum === selected) : null;
  const selKids = selected
    ? (childrenMap.get(selected) || []).sort((a, b) =>
        a.treeNum.localeCompare(b.treeNum, undefined, { numeric: true })
      )
    : [];

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ padding: "12px 24px", borderBottom: "1px solid #ffffff10", flexShrink: 0, display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ fontFamily: mono, fontSize: 9, color: "#ffffff33", letterSpacing: 1 }}>
          J01 TECHNOLOGY, INDUSTRY, AGRICULTURE — DIRECT CHILDREN
        </div>
        <div style={{ fontFamily: mono, fontSize: 8, color: "#ffffff22" }}>sorted by total terms · click bar to drill</div>
        {selected && (
          <button
            onClick={() => setSelected(null)}
            style={{ marginLeft: "auto", padding: "4px 10px", fontFamily: mono, fontSize: 8, background: "#ffffff08", border: "1px solid #ffffff22", borderRadius: 4, color: "#ffffff66", cursor: "pointer" }}
          >
            ← back
          </button>
        )}
      </div>

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Bar chart */}
        <div style={{ flex: "0 0 auto", width: selected ? 360 : "100%", overflowY: "auto", padding: "20px 24px", borderRight: selected ? "1px solid #ffffff10" : "none" }}>
          {j01Kids.map((d, i) => {
            const barPct = Math.round((d.totalCount / maxCount) * 100);
            const isSel = selected === d.treeNum;
            const isHov = hovered === d.treeNum;
            const barColor = isSel ? TREE_COLOR : isHov ? color : color + "bb";
            return (
              <div
                key={d.treeNum}
                onMouseEnter={() => setHovered(d.treeNum)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => setSelected(isSel ? null : d.treeNum)}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "7px 10px",
                  marginBottom: 4,
                  background: isSel ? TREE_COLOR + "15" : isHov ? "#ffffff06" : "transparent",
                  borderRadius: 4,
                  cursor: "pointer",
                  transition: "all 0.12s",
                  border: `1px solid ${isSel ? TREE_COLOR + "44" : "transparent"}`,
                }}
              >
                {/* Tree num */}
                <div style={{ fontFamily: mono, fontSize: 8, color: barColor, width: 56, flexShrink: 0 }}>
                  {d.treeNum}
                </div>
                {/* Name */}
                <div style={{ fontFamily: mono, fontSize: 9, color: isSel ? TREE_COLOR : isHov ? "#ffffffdd" : "#ffffffaa", width: selected ? 110 : 220, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {d.term.name}
                </div>
                {/* Bar */}
                <div style={{ flex: 1, height: 14, background: "#ffffff08", borderRadius: 2, overflow: "hidden", minWidth: 40 }}>
                  <div style={{
                    height: "100%",
                    width: `${barPct}%`,
                    background: barColor,
                    borderRadius: 2,
                    transition: "width 0.3s, background 0.12s",
                  }} />
                </div>
                {/* Count */}
                <div style={{ fontFamily: mono, fontSize: 8, color: barColor, width: 40, textAlign: "right", flexShrink: 0 }}>
                  {d.totalCount}
                </div>
              </div>
            );
          })}
          {j01Kids.length === 0 && (
            <div style={{ fontFamily: mono, fontSize: 10, color: "#ffffff22", padding: 20 }}>No J01 children found.</div>
          )}
        </div>

        {/* Detail panel */}
        {selected && selData && (
          <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
            <div style={{ fontFamily: mono, fontSize: 8, color: TREE_COLOR, letterSpacing: 2, marginBottom: 4 }}>
              {selData.treeNum}
            </div>
            <div style={{ fontFamily: mono, fontSize: 18, color: "#ffffffcc", fontWeight: 700, marginBottom: 6 }}>
              {selData.term.name}
            </div>
            <div style={{ fontFamily: mono, fontSize: 9, color: "#ffffff44", marginBottom: 12 }}>
              {selData.totalCount} total · {selData.directCount} direct children
            </div>
            {selData.term.scopeNote && (
              <div style={{
                fontFamily: mono, fontSize: 8, color: "#ffffff55", lineHeight: 1.6,
                maxWidth: 480, marginBottom: 18, padding: "10px 14px",
                background: "#ffffff05", borderRadius: 4, borderLeft: `2px solid ${TREE_COLOR}44`,
              }}>
                {selData.term.scopeNote}
              </div>
            )}
            <div style={{ fontFamily: mono, fontSize: 7, color: "#ffffff22", letterSpacing: 1, marginBottom: 8 }}>
              CHILDREN
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {selKids.map(({ term: t, treeNum: tn }) => {
                const isHov = hovered === tn;
                return (
                  <div
                    key={tn}
                    onMouseEnter={() => setHovered(tn)}
                    onMouseLeave={() => setHovered(null)}
                    style={{
                      padding: "5px 10px",
                      background: isHov ? TREE_COLOR + "22" : "#ffffff06",
                      border: `1px solid ${isHov ? TREE_COLOR + "66" : "#ffffff14"}`,
                      borderRadius: 4,
                      cursor: "default",
                      transition: "all 0.12s",
                      position: "relative",
                    }}
                  >
                    <div style={{ fontFamily: mono, fontSize: 9, color: isHov ? TREE_COLOR : "#ffffffaa" }}>{t.name}</div>
                    <div style={{ fontFamily: mono, fontSize: 7, color: "#ffffff33" }}>{tn}</div>
                    {isHov && t.scopeNote && (
                      <div style={{
                        position: "absolute", bottom: "calc(100% + 6px)", left: 0,
                        background: "#1a1d24", border: `1px solid ${TREE_COLOR}44`,
                        borderRadius: 4, padding: "8px 10px", width: 260, zIndex: 10,
                        fontFamily: mono, fontSize: 8, color: "#ffffffaa", lineHeight: 1.5,
                        boxShadow: "0 4px 16px #00000088",
                        pointerEvents: "none",
                      }}>
                        {t.scopeNote.slice(0, 200)}{t.scopeNote.length > 200 ? "…" : ""}
                      </div>
                    )}
                  </div>
                );
              })}
              {selKids.length === 0 && (
                <div style={{ fontFamily: mono, fontSize: 9, color: "#ffffff22" }}>No further children.</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MeshJConcepts({ initialSelection } = {}) {
  return (
    <OverviewConceptShell
      treeLetter="J"
      navLabel="J · TECHNOLOGY"
      eyebrow="TECHNOLOGY — INDUSTRY, AGRICULTURE, FOOD, AND MANUFACTURED ENVIRONMENTS"
      treeColor={TREE_COLOR}
      branchColors={BRANCH_COLORS}
      defaultCluster="J01.040"
      initialSelection={initialSelection}
    />
  );
}
