import { useState, useEffect } from "react";

const mono = "'IBM Plex Mono', monospace";
const BG = "#0f1117";
const TREE_COLOR = "#F0B8C8";

// ── DATA HOOK ─────────────────────────────────────────────────────────────
function useKData() {
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

      const raw = (childrenMap.get("K") || []).sort((a, b) =>
        a.treeNum.localeCompare(b.treeNum, undefined, { numeric: true })
      );

      const branches = raw.map(({ term, treeNum }) => ({
        term, treeNum,
        directCount: childrenMap.get(treeNum)?.length ?? 0,
        totalCount: countAll(treeNum),
      }));

      // Collect all K terms (top 2 levels) for tag cloud
      const allTerms = [];
      const kRoot = childrenMap.get("K") || [];
      for (const { term, treeNum } of kRoot) {
        const depth = treeNum.split(".").length;
        if (depth <= 2) {
          allTerms.push({ term, treeNum, depth });
          const children = childrenMap.get(treeNum) || [];
          for (const { term: ct, treeNum: ctn } of children) {
            const cdepth = ctn.split(".").length;
            if (cdepth <= 2) allTerms.push({ term: ct, treeNum: ctn, depth: cdepth });
          }
        }
      }

      setState({ data: { branches, childrenMap, allTerms }, loading: false });
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

// ── BRANCH COLORS ─────────────────────────────────────────────────────────
const BRANCH_COLORS = [
  "#F0B8C8", "#E8A0B4", "#D488A0", "#C8708C", "#BC5878",
  "#F4C8D8", "#E8B8CC", "#DCA8C0", "#D098B4", "#C488A8",
];
function branchColor(treeNum, branches) {
  const idx = branches.findIndex(b => b.treeNum === treeNum || treeNum.startsWith(b.treeNum + "."));
  return BRANCH_COLORS[idx % BRANCH_COLORS.length] ?? TREE_COLOR;
}

// ═══════════════════════════════════════════════════════════════════════════
// SKETCH 1 — TAG CLOUD (all K terms, top 2 levels)
// ═══════════════════════════════════════════════════════════════════════════
function TagCloud({ data }) {
  const [filter, setFilter] = useState("");
  const [hovered, setHovered] = useState(null);
  const { allTerms, branches } = data;

  // BFS collect all unique K terms up to depth 2
  const seen = new Set();
  const chips = [];
  for (const { term, treeNum, depth } of allTerms) {
    if (!seen.has(treeNum)) {
      seen.add(treeNum);
      chips.push({ term, treeNum, depth });
    }
  }

  // Also add all descendants for completeness — collect all K terms
  const filtered = chips
    .filter(c => !filter || c.term.name.toLowerCase().includes(filter.toLowerCase()))
    .sort((a, b) => a.treeNum.localeCompare(b.treeNum, undefined, { numeric: true }));

  const hovItem = hovered ? chips.find(c => c.treeNum === hovered) : null;

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", padding: 24, gap: 16, overflowY: "auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <input
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="filter terms…"
          style={{
            fontFamily: mono, fontSize: 10, padding: "6px 12px",
            background: "#ffffff08", border: `1px solid ${TREE_COLOR}44`,
            borderRadius: 6, color: "#ffffffcc", outline: "none", width: 240,
          }}
        />
        <div style={{ fontFamily: mono, fontSize: 9, color: "#ffffff33" }}>
          {filtered.length} terms shown
        </div>
      </div>

      {hovItem && (
        <div style={{
          padding: "10px 14px", background: "#ffffff0a", border: `1px solid ${TREE_COLOR}55`,
          borderRadius: 8, fontFamily: mono, fontSize: 9, color: "#ffffffbb", maxWidth: 520,
        }}>
          <div style={{ color: TREE_COLOR, fontSize: 10, marginBottom: 4 }}>{hovItem.term.name}</div>
          <div style={{ color: "#ffffff55", marginBottom: 4 }}>{hovItem.treeNum}</div>
          {hovItem.term.note && (
            <div style={{ color: "#ffffff66", lineHeight: 1.5 }}>{hovItem.term.note.slice(0, 200)}{hovItem.term.note.length > 200 ? "…" : ""}</div>
          )}
        </div>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {filtered.map(({ term, treeNum, depth }) => {
          const color = branchColor(treeNum, branches);
          const isHov = hovered === treeNum;
          return (
            <div
              key={treeNum}
              onMouseEnter={() => setHovered(treeNum)}
              onMouseLeave={() => setHovered(null)}
              style={{
                padding: depth === 1 ? "5px 12px" : "3px 9px",
                background: isHov ? color + "33" : color + "14",
                border: `1px solid ${color}${isHov ? "99" : "44"}`,
                borderRadius: 20,
                fontFamily: mono,
                fontSize: depth === 1 ? 10 : 9,
                color: isHov ? color : color + "cc",
                cursor: "default",
                transition: "all 0.12s",
                fontWeight: depth === 1 ? 600 : 400,
                letterSpacing: depth === 1 ? 0.5 : 0,
              }}
            >
              {term.name}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div style={{ fontFamily: mono, fontSize: 10, color: "#ffffff22", textAlign: "center", marginTop: 40 }}>
          no terms match "{filter}"
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SKETCH 2 — BRANCH CARDS
// ═══════════════════════════════════════════════════════════════════════════
function BranchCards({ data }) {
  const { branches, childrenMap } = data;
  const [expanded, setExpanded] = useState(null);

  return (
    <div style={{ height: "100%", overflowY: "auto", padding: 24 }}>
      <div style={{ fontFamily: mono, fontSize: 9, color: "#ffffff22", letterSpacing: 2, marginBottom: 16 }}>
        K · HUMANITIES — DIRECT BRANCHES
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {branches.map(({ term, treeNum, directCount, totalCount }, bi) => {
          const color = BRANCH_COLORS[bi % BRANCH_COLORS.length];
          const isOpen = expanded === treeNum;
          const children = (childrenMap.get(treeNum) || []).sort((a, b) =>
            a.treeNum.localeCompare(b.treeNum, undefined, { numeric: true })
          );

          return (
            <div
              key={treeNum}
              style={{
                background: isOpen ? color + "10" : "#ffffff06",
                border: `1px solid ${isOpen ? color + "66" : "#ffffff11"}`,
                borderRadius: 10,
                padding: 18,
                transition: "all 0.15s",
              }}
            >
              <div
                onClick={() => setExpanded(isOpen ? null : treeNum)}
                style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}
              >
                <div style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: color, flexShrink: 0,
                }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: mono, fontSize: 12, color: color, fontWeight: 600 }}>
                    {term.name}
                  </div>
                  <div style={{ fontFamily: mono, fontSize: 8, color: "#ffffff33", marginTop: 3 }}>
                    {treeNum}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 16, fontFamily: mono, fontSize: 9 }}>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ color: color }}>{directCount}</div>
                    <div style={{ color: "#ffffff22", fontSize: 7 }}>direct</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ color: color }}>{totalCount}</div>
                    <div style={{ color: "#ffffff22", fontSize: 7 }}>total</div>
                  </div>
                </div>
                <div style={{ fontFamily: mono, fontSize: 10, color: color + "88" }}>
                  {isOpen ? "▲" : "▼"}
                </div>
              </div>

              {term.note && (
                <div style={{
                  fontFamily: mono, fontSize: 8.5, color: "#ffffff44",
                  marginTop: 10, paddingLeft: 20, lineHeight: 1.6,
                }}>
                  {term.note.slice(0, 180)}{term.note.length > 180 ? "…" : ""}
                </div>
              )}

              {isOpen && (
                <div style={{ marginTop: 14, paddingLeft: 20 }}>
                  <div style={{ fontFamily: mono, fontSize: 8, color: "#ffffff22", letterSpacing: 1, marginBottom: 8 }}>
                    DIRECT CHILDREN ({children.length})
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {children.map(({ term: ct, treeNum: ctn }) => {
                      const grandchildren = childrenMap.get(ctn)?.length ?? 0;
                      return (
                        <div key={ctn} style={{
                          display: "flex", alignItems: "center", gap: 10,
                          padding: "6px 10px", background: color + "0a",
                          borderRadius: 6, border: `1px solid ${color}22`,
                        }}>
                          <div style={{ fontFamily: mono, fontSize: 8, color: "#ffffff33", width: 80 }}>{ctn}</div>
                          <div style={{ fontFamily: mono, fontSize: 9.5, color: "#ffffffcc", flex: 1 }}>{ct.name}</div>
                          {grandchildren > 0 && (
                            <div style={{ fontFamily: mono, fontSize: 7.5, color: color + "88" }}>
                              +{grandchildren}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── APP ────────────────────────────────────────────────────────────────────
const VIEWS = [
  { id: "cloud",   label: "1. All Terms" },
  { id: "cards",   label: "2. Branch Cards" },
];

export default function MeshKConcepts() {
  const [active, setActive] = useState("cloud");
  const { data, loading } = useKData();

  const views = { cloud: TagCloud, cards: BranchCards };
  const Active = views[active];

  return (
    <div style={{ width: "100%", height: "100vh", display: "flex", flexDirection: "column", background: BG }}>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&display=swap" rel="stylesheet" />

      <nav style={{ display: "flex", alignItems: "center", gap: 0, borderBottom: "2px solid #ffffff12", flexShrink: 0, background: "#0a0c10", overflowX: "auto" }}>
        <div style={{ padding: "12px 20px", fontFamily: mono, fontSize: 9, color: "#ffffff33", letterSpacing: 2, flexShrink: 0 }}>
          K CONCEPTS
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
