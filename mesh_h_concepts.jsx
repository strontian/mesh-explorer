import { useState, useEffect } from "react";

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

// ── APP ────────────────────────────────────────────────────────────────────
const VIEWS = [
  { id: "worlds", label: "1. Two Worlds" },
  { id: "grid",   label: "2. All Terms Grid" },
];

export default function MeshHConcepts() {
  const [active, setActive] = useState("worlds");
  const { data, loading } = useHData();

  const views = { worlds: TwoWorlds, grid: AllTermsGrid };
  const Active = views[active];

  return (
    <div style={{ width: "100%", height: "100vh", display: "flex", flexDirection: "column", background: BG }}>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&display=swap" rel="stylesheet" />

      <nav style={{ display: "flex", alignItems: "center", gap: 0, borderBottom: "2px solid #ffffff12", flexShrink: 0, background: "#0a0c10", overflowX: "auto" }}>
        <div style={{ padding: "12px 20px", fontFamily: mono, fontSize: 9, color: "#ffffff33", letterSpacing: 2, flexShrink: 0 }}>
          H CONCEPTS
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
