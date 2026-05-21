import { useState, useEffect, useMemo } from "react";

const mono = "'IBM Plex Mono', monospace";
const BG = "#0f1117";
const TREE_COLOR = "#88C8D8";

// ── DATA HOOK ─────────────────────────────────────────────────────────────
function useZData() {
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

      const raw = (childrenMap.get("Z") || []).sort((a, b) =>
        a.treeNum.localeCompare(b.treeNum, undefined, { numeric: true })
      );

      const branches = raw.map(({ term, treeNum }) => ({
        term, treeNum,
        directCount: childrenMap.get(treeNum)?.length ?? 0,
        totalCount: countAll(treeNum),
      }));

      // Collect all Z terms for the flat search list
      const allTerms = [];
      const stack = [...(childrenMap.get("Z") || [])];
      while (stack.length) {
        const { term, treeNum } = stack.pop();
        allTerms.push({ term, treeNum });
        const kids = childrenMap.get(treeNum) || [];
        for (const k of kids) stack.push(k);
      }
      allTerms.sort((a, b) => a.term.name.localeCompare(b.term.name));

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

// Continent / region color palette
const REGION_COLORS = [
  "#88C8D8", "#A8D8C8", "#D8C888", "#D8A8A8", "#C8A8D8",
  "#88A8D8", "#A8C8D8", "#D8D888", "#C8D8A8", "#D8B888",
];
function regionColor(idx) { return REGION_COLORS[idx % REGION_COLORS.length]; }

// ═══════════════════════════════════════════════════════════════════════════
// SKETCH 1 — REGIONAL CARDS
// Z01's direct children (continents / major regions) shown as expandable cards.
// ═══════════════════════════════════════════════════════════════════════════
function RegionalCards({ data }) {
  const { branches, childrenMap } = data;
  const [expanded, setExpanded] = useState(null);

  // Z usually has one top branch (Z01 Geographic Locations).
  // The interesting children are inside Z01.
  const primary = branches[0];
  const regions = primary
    ? (childrenMap.get(primary.treeNum) || []).sort((a, b) => a.term.name.localeCompare(b.term.name))
    : [];

  return (
    <div style={{ padding: "22px 28px", overflowY: "auto", height: "100%" }}>
      <div style={{ fontFamily: mono, fontSize: 8, color: TREE_COLOR, letterSpacing: 2, marginBottom: 6 }}>
        {primary?.treeNum ?? "Z01"} · GEOGRAPHIC LOCATIONS
      </div>
      <div style={{ fontFamily: mono, fontSize: 13, color: "#e8e8e8", fontWeight: 700, marginBottom: 6 }}>
        Regional Cards
      </div>
      <div style={{ fontFamily: mono, fontSize: 9, color: "#ffffff44", lineHeight: 1.7, marginBottom: 24 }}>
        Continents and major geographic categories. Click a card to see its sub-regions / countries.
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
        {regions.map(({ term, treeNum }, i) => {
          const kids = childrenMap.get(treeNum) || [];
          const color = regionColor(i);
          const isExpanded = expanded === treeNum;
          return (
            <div
              key={treeNum}
              onClick={() => setExpanded(isExpanded ? null : treeNum)}
              style={{
                padding: "12px 14px",
                background: isExpanded ? "#ffffff0c" : "#ffffff06",
                border: `1px solid ${isExpanded ? color + "55" : "#ffffff0e"}`,
                borderLeft: `3px solid ${color}`,
                borderRadius: 4,
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                <span style={{ fontFamily: mono, fontSize: 8, color }}>{treeNum}</span>
                <span style={{ fontFamily: mono, fontSize: 8, color: "#ffffff33" }}>{kids.length} sub</span>
              </div>
              <div style={{ fontFamily: mono, fontSize: 11, color: "#e8e8e8", fontWeight: 700, marginBottom: 8, lineHeight: 1.3 }}>
                {term.name}
              </div>
              {term.note && !isExpanded && (
                <div style={{ fontFamily: mono, fontSize: 8.5, color: "#ffffff44", lineHeight: 1.5 }}>
                  {term.note.slice(0, 120)}…
                </div>
              )}
              {isExpanded && (
                <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {kids.slice(0, 40).map(({ term: kt, treeNum: ktn }) => (
                    <div key={ktn} style={{
                      padding: "2px 7px",
                      fontFamily: mono, fontSize: 8,
                      color: color + "cc",
                      background: color + "11",
                      border: `1px solid ${color}33`,
                      borderRadius: 3,
                    }}>
                      {kt.name}
                    </div>
                  ))}
                  {kids.length > 40 && (
                    <div style={{ padding: "2px 7px", fontFamily: mono, fontSize: 8, color: "#ffffff33" }}>
                      +{kids.length - 40}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SKETCH 2 — ALL PLACES (search-first flat list)
// ═══════════════════════════════════════════════════════════════════════════
function AllPlaces({ data }) {
  const { allTerms, branches, childrenMap } = data;
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allTerms.slice(0, 300);
    return allTerms.filter(({ term }) => term.name.toLowerCase().includes(q)).slice(0, 300);
  }, [query, allTerms]);

  // Build a treeNum → top-region-name index for hierarchy hint
  const regionHint = useMemo(() => {
    const m = new Map();
    const primary = branches[0];
    if (!primary) return m;
    const topRegions = childrenMap.get(primary.treeNum) || [];
    for (const { term: rt, treeNum: rtn } of topRegions) {
      const stack = [rtn];
      while (stack.length) {
        const k = stack.pop();
        m.set(k, rt.name);
        const kids = childrenMap.get(k) || [];
        for (const c of kids) stack.push(c.treeNum);
      }
    }
    return m;
  }, [branches, childrenMap]);

  return (
    <div style={{ padding: "22px 28px", overflowY: "auto", height: "100%" }}>
      <div style={{ fontFamily: mono, fontSize: 8, color: TREE_COLOR, letterSpacing: 2, marginBottom: 6 }}>
        Z · GEOGRAPHIC LOCATIONS
      </div>
      <div style={{ fontFamily: mono, fontSize: 13, color: "#e8e8e8", fontWeight: 700, marginBottom: 6 }}>
        All Places
      </div>
      <div style={{ fontFamily: mono, fontSize: 9, color: "#ffffff44", lineHeight: 1.7, marginBottom: 18 }}>
        {allTerms.length.toLocaleString()} geographic terms · search by name
      </div>

      <input
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="search for a place…"
        style={{
          width: "100%",
          padding: "10px 14px",
          fontFamily: mono,
          fontSize: 11,
          background: "#ffffff06",
          border: `1px solid ${TREE_COLOR}22`,
          borderRadius: 4,
          color: "#e8e8e8",
          marginBottom: 16,
          outline: "none",
        }}
      />

      <div style={{ fontFamily: mono, fontSize: 8, color: "#ffffff33", marginBottom: 10 }}>
        {filtered.length === allTerms.length || (query.trim() === "" && allTerms.length > 300)
          ? `showing first ${filtered.length} of ${allTerms.length.toLocaleString()}`
          : `${filtered.length} match${filtered.length === 1 ? "" : "es"}`}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
        {filtered.map(({ term, treeNum }) => {
          const hint = regionHint.get(treeNum);
          return (
            <div key={treeNum + term.ui} style={{
              padding: "4px 9px",
              fontFamily: mono, fontSize: 8.5,
              color: "#d0d0d0",
              background: "#ffffff06",
              border: "1px solid #ffffff0e",
              borderRadius: 3,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}>
              {hint && hint !== term.name && (
                <span style={{ color: TREE_COLOR + "88", fontSize: 7.5 }}>{hint} ›</span>
              )}
              <span>{term.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── APP ───────────────────────────────────────────────────────────────────
const VIEWS = [
  { id: "regions", label: "1. Regional Cards" },
  { id: "all",     label: "2. All Places" },
];

export default function MeshZConcepts() {
  const [active, setActive] = useState("regions");
  const { data, loading } = useZData();

  const views = { regions: RegionalCards, all: AllPlaces };
  const Active = views[active];

  return (
    <div style={{ width: "100%", height: "100vh", display: "flex", flexDirection: "column", background: BG }}>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&display=swap" rel="stylesheet" />

      <nav style={{ display: "flex", alignItems: "center", gap: 0, borderBottom: "2px solid #ffffff12", flexShrink: 0, background: "#0a0c10", overflowX: "auto" }}>
        <div style={{ padding: "12px 20px", fontFamily: mono, fontSize: 9, color: "#ffffff33", letterSpacing: 2, flexShrink: 0 }}>
          Z CONCEPTS
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
