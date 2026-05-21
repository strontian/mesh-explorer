import { useState, useEffect } from "react";

const mono = "'IBM Plex Mono', monospace";
const BG = "#0f1117";
const TREE_COLOR = "#D8A8D8";

const BRANCH_COLORS = {
  "I01": "#C490C4",
  "I02": "#9BB8D8",
  "I03": "#D8B890",
};

// ── DATA HOOK ─────────────────────────────────────────────────────────────
function useIData() {
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

      const raw = (childrenMap.get("I") || []).sort((a, b) =>
        a.treeNum.localeCompare(b.treeNum, undefined, { numeric: true })
      );

      const branches = raw.map(({ term, treeNum }) => ({
        term, treeNum,
        directCount: childrenMap.get(treeNum)?.length ?? 0,
        totalCount: countAll(treeNum),
        color: BRANCH_COLORS[treeNum] || TREE_COLOR,
      }));

      // I01 children for Social Sciences breakdown
      const i01Kids = (childrenMap.get("I01") || [])
        .sort((a, b) => a.treeNum.localeCompare(b.treeNum, undefined, { numeric: true }))
        .map(({ term: t, treeNum: tn }) => ({
          term: t, treeNum: tn,
          directCount: childrenMap.get(tn)?.length ?? 0,
          totalCount: countAll(tn),
        }));

      setState({ data: { branches, childrenMap, i01Kids, countAll }, loading: false });
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
// SKETCH 1 — THREE SPHERES
// Three large cards for I01, I02, I03 with top children chips
// ═══════════════════════════════════════════════════════════════════════════
function ThreeSpheres({ data }) {
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
          I — ANTHROPOLOGY, EDUCATION, SOCIOLOGY &amp; SOCIAL PHENOMENA
        </div>
      </div>
      {/* Cards row */}
      <div style={{ flex: 1, overflowY: "auto", padding: "24px", display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
        {branches.map(b => {
          const color = b.color;
          const pct = Math.round((b.totalCount / maxTotal) * 100);
          const kids = getTopKids(b.treeNum, 8);
          return (
            <div key={b.treeNum} style={{
              flex: "1 1 280px", minWidth: 260, maxWidth: 420,
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
                  {b.term.scopeNote.slice(0, 140)}{b.term.scopeNote.length > 140 ? "…" : ""}
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
// SKETCH 2 — SOCIAL SCIENCES BREAKDOWN
// Treemap-style grid of I01's direct children, area ∝ totalCount
// ═══════════════════════════════════════════════════════════════════════════
function SocialSciences({ data }) {
  const [hovered, setHovered] = useState(null);
  const [selected, setSelected] = useState(null);
  const { i01Kids, childrenMap } = data;

  const maxCount = Math.max(...i01Kids.map(d => d.totalCount), 1);

  // Color palette cycling within I01
  const palette = ["#C490C4", "#A890D0", "#8898D8", "#90B8C4", "#90C4B8", "#B8C490", "#D4B890", "#D490A8"];

  function getKids(treeNum) {
    return (childrenMap.get(treeNum) || [])
      .sort((a, b) => a.treeNum.localeCompare(b.treeNum, undefined, { numeric: true }));
  }

  const selData = selected ? i01Kids.find(d => d.treeNum === selected) : null;
  const selKids = selected ? getKids(selected) : [];

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ padding: "12px 24px", borderBottom: "1px solid #ffffff10", flexShrink: 0, display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ fontFamily: mono, fontSize: 9, color: "#ffffff33", letterSpacing: 1 }}>
          I01 SOCIAL SCIENCES — DIRECT CHILDREN
        </div>
        <div style={{ fontFamily: mono, fontSize: 8, color: "#ffffff22" }}>
          area ∝ total terms · click to drill
        </div>
        {selected && (
          <button
            onClick={() => setSelected(null)}
            style={{ marginLeft: "auto", padding: "4px 10px", fontFamily: mono, fontSize: 8, background: "#ffffff08", border: "1px solid #ffffff22", borderRadius: 4, color: "#ffffff66", cursor: "pointer" }}
          >
            ← back
          </button>
        )}
      </div>

      {!selected ? (
        // Treemap grid
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignContent: "flex-start" }}>
            {i01Kids.map((d, i) => {
              const color = palette[i % palette.length];
              const isHov = hovered === d.treeNum;
              // Width proportional to sqrt of totalCount (treemap heuristic)
              const sizeFactor = Math.max(0.3, Math.sqrt(d.totalCount / maxCount));
              const baseW = 180;
              const w = Math.round(baseW * sizeFactor);

              return (
                <div
                  key={d.treeNum}
                  onMouseEnter={() => setHovered(d.treeNum)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => setSelected(d.treeNum)}
                  style={{
                    width: Math.max(w, 120),
                    padding: "12px 14px",
                    background: isHov ? color + "28" : color + "0e",
                    border: `1px solid ${isHov ? color + "88" : color + "33"}`,
                    borderRadius: 6,
                    cursor: "pointer",
                    transition: "all 0.12s",
                    position: "relative",
                  }}
                >
                  <div style={{ fontFamily: mono, fontSize: 7, color: color + "bb", letterSpacing: 1, marginBottom: 3 }}>
                    {d.treeNum}
                  </div>
                  <div style={{ fontFamily: mono, fontSize: 10, color: isHov ? color : "#ffffffcc", fontWeight: 600, lineHeight: 1.3, marginBottom: 4 }}>
                    {d.term.name}
                  </div>
                  <div style={{ fontFamily: mono, fontSize: 8, color: "#ffffff44" }}>
                    {d.totalCount} terms
                  </div>
                  {/* Mini bar */}
                  <div style={{ marginTop: 6, height: 2, background: "#ffffff08", borderRadius: 1 }}>
                    <div style={{ height: "100%", width: `${Math.round(sizeFactor * 100)}%`, background: color, borderRadius: 1, opacity: 0.6 }} />
                  </div>
                  {isHov && d.term.scopeNote && (
                    <div style={{
                      position: "absolute", top: "calc(100% + 6px)", left: 0,
                      background: "#1a1d24", border: `1px solid ${color}44`,
                      borderRadius: 4, padding: "8px 10px", minWidth: 240, maxWidth: 300, zIndex: 10,
                      fontFamily: mono, fontSize: 8, color: "#ffffffaa", lineHeight: 1.5,
                      boxShadow: "0 4px 16px #00000088",
                      pointerEvents: "none",
                    }}>
                      {d.term.scopeNote.slice(0, 200)}{d.term.scopeNote.length > 200 ? "…" : ""}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        // Drill-down view
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
          {selData && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: mono, fontSize: 8, color: TREE_COLOR, letterSpacing: 2, marginBottom: 4 }}>
                {selData.treeNum}
              </div>
              <div style={{ fontFamily: mono, fontSize: 18, color: "#ffffffcc", fontWeight: 700, marginBottom: 6 }}>
                {selData.term.name}
              </div>
              <div style={{ fontFamily: mono, fontSize: 9, color: "#ffffff44", marginBottom: 12 }}>
                {selData.totalCount} total terms · {selData.directCount} direct children
              </div>
              {selData.term.scopeNote && (
                <div style={{ fontFamily: mono, fontSize: 9, color: "#ffffff55", lineHeight: 1.6, maxWidth: 600, marginBottom: 16, padding: "10px 14px", background: "#ffffff05", borderRadius: 4, borderLeft: `2px solid ${TREE_COLOR}44` }}>
                  {selData.term.scopeNote}
                </div>
              )}
            </div>
          )}
          <div style={{ fontFamily: mono, fontSize: 8, color: "#ffffff22", letterSpacing: 1, marginBottom: 10 }}>
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
                    padding: "6px 12px",
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
  );
}

// ── APP ────────────────────────────────────────────────────────────────────
const VIEWS = [
  { id: "spheres", label: "1. Three Spheres" },
  { id: "social",  label: "2. Social Sciences" },
];

export default function MeshIConcepts() {
  const [active, setActive] = useState("spheres");
  const { data, loading } = useIData();

  const views = { spheres: ThreeSpheres, social: SocialSciences };
  const Active = views[active];

  return (
    <div style={{ width: "100%", height: "100vh", display: "flex", flexDirection: "column", background: BG }}>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&display=swap" rel="stylesheet" />

      <nav style={{ display: "flex", alignItems: "center", gap: 0, borderBottom: "2px solid #ffffff12", flexShrink: 0, background: "#0a0c10", overflowX: "auto" }}>
        <div style={{ padding: "12px 20px", fontFamily: mono, fontSize: 9, color: "#ffffff33", letterSpacing: 2, flexShrink: 0 }}>
          I CONCEPTS
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
