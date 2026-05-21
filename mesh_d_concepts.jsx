import { useState, useEffect, useRef } from "react";

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

// ═══════════════════════════════════════════════════════════════════════════
// SKETCH 1 — CHEMICAL CLASSES
// Horizontal bars sorted by total term count. Log scale toggle.
// Click a bar to expand its 6 largest direct children inline.
// ═══════════════════════════════════════════════════════════════════════════
function ChemicalClasses({ data }) {
  const [logScale, setLogScale] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const { branches, childrenMap } = data;

  const sorted = [...branches].sort((a, b) => b.totalCount - a.totalCount);
  const max = sorted[0].totalCount;
  const logMax = Math.log10(max + 1);

  function barWidth(count) {
    if (logScale) return (Math.log10(count + 1) / logMax) * 100;
    return (count / max) * 100;
  }

  function getTopChildren(treeNum) {
    const kids = (childrenMap.get(treeNum) || []).map(({ term, treeNum: tn }) => {
      let n = 0;
      const q = [tn];
      while (q.length) {
        const k = q.shift();
        const ch = childrenMap.get(k) || [];
        n += ch.length;
        for (const c of ch) q.push(c.treeNum);
      }
      return { term, treeNum: tn, totalCount: n };
    });
    return kids.sort((a, b) => b.totalCount - a.totalCount).slice(0, 6);
  }

  // Branch short labels
  const SHORT = {
    D01: "Inorganic Chemicals",
    D02: "Organic Chemicals",
    D03: "Heterocyclic Compounds",
    D04: "Polycyclic Compounds",
    D05: "Macromolecular Substances",
    D06: "Hormones & Antagonists",
    D08: "Enzymes & Coenzymes",
    D09: "Carbohydrates",
    D10: "Lipids",
    D11: "Proteins/Peptides (D11)",
    D12: "Amino Acids, Peptides & Proteins",
    D13: "Nucleic Acids & Nucleotides",
    D20: "Complex Mixtures",
    D23: "Biological Factors",
    D25: "Biomedical & Dental Materials",
    D26: "Pharmaceutical Preparations",
    D27: "Chemical Actions & Uses",
  };

  return (
    <div style={{ background: BG, height: "100%", overflowY: "auto", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ padding: "18px 24px 10px", display: "flex", alignItems: "baseline", justifyContent: "space-between", flexShrink: 0 }}>
        <div>
          <div style={{ fontFamily: mono, fontSize: 11, color: TREE_COLOR, letterSpacing: 3, marginBottom: 4 }}>CHEMICAL CLASSES</div>
          <div style={{ fontFamily: mono, fontSize: 8.5, color: "#ffffff33" }}>D tree · 17 top branches · click to expand · log scale for D12</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Legend */}
          {CHEM_GROUPS.map(g => (
            <div key={g.id} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: g.color }} />
              <span style={{ fontFamily: mono, fontSize: 7.5, color: "#ffffff55" }}>{g.label}</span>
            </div>
          ))}
          <button
            onClick={() => setLogScale(v => !v)}
            style={{
              marginLeft: 12, padding: "5px 10px", fontFamily: mono, fontSize: 8.5,
              background: logScale ? TREE_COLOR + "22" : "#ffffff08",
              border: `1px solid ${logScale ? TREE_COLOR : "#ffffff18"}`,
              borderRadius: 4, cursor: "pointer",
              color: logScale ? TREE_COLOR : "#ffffff55",
              transition: "all 0.15s",
            }}
          >
            {logScale ? "LOG" : "LINEAR"}
          </button>
        </div>
      </div>

      {/* Bars */}
      <div style={{ padding: "0 24px 24px", display: "flex", flexDirection: "column", gap: 3 }}>
        {sorted.map(branch => {
          const isExp = expanded === branch.treeNum;
          const children = isExp ? getTopChildren(branch.treeNum) : [];
          const label = SHORT[branch.treeNum] || branch.term.name;

          return (
            <div key={branch.treeNum}>
              {/* Bar row */}
              <div
                onClick={() => setExpanded(isExp ? null : branch.treeNum)}
                style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", padding: "3px 0" }}
              >
                {/* Tree number */}
                <div style={{ fontFamily: mono, fontSize: 8, color: branch.color, width: 28, flexShrink: 0 }}>
                  {branch.treeNum}
                </div>
                {/* Label */}
                <div style={{ fontFamily: mono, fontSize: 8.5, color: isExp ? "#ffffff" : "#ffffffbb", width: 220, flexShrink: 0, transition: "color 0.12s", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {label}
                </div>
                {/* Bar track */}
                <div style={{ flex: 1, height: 14, background: "#ffffff08", borderRadius: 2, overflow: "hidden", position: "relative" }}>
                  <div style={{
                    height: "100%",
                    width: `${barWidth(branch.totalCount)}%`,
                    background: isExp ? branch.color : branch.color + "99",
                    borderRadius: 2,
                    transition: "width 0.4s ease, background 0.15s",
                  }} />
                </div>
                {/* Count */}
                <div style={{ fontFamily: mono, fontSize: 8.5, color: "#ffffff66", width: 52, textAlign: "right", flexShrink: 0 }}>
                  {branch.totalCount.toLocaleString()}
                </div>
                {/* Expand indicator */}
                <div style={{ fontFamily: mono, fontSize: 9, color: "#ffffff22", width: 10, flexShrink: 0 }}>
                  {isExp ? "▾" : "▸"}
                </div>
              </div>

              {/* Inline children */}
              {isExp && (
                <div style={{ marginLeft: 258, marginBottom: 6, display: "flex", flexDirection: "column", gap: 2, borderLeft: `2px solid ${branch.color}33`, paddingLeft: 10 }}>
                  <div style={{ fontFamily: mono, fontSize: 7, color: "#ffffff33", letterSpacing: 1.5, marginBottom: 3 }}>
                    TOP 6 CHILDREN
                  </div>
                  {children.map(c => {
                    const childWidth = barWidth(c.totalCount);
                    return (
                      <div key={c.treeNum} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ fontFamily: mono, fontSize: 7.5, color: "#ffffff55", width: 80, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {c.term.name}
                        </div>
                        <div style={{ flex: 1, height: 8, background: "#ffffff06", borderRadius: 1, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${childWidth}%`, background: branch.color + "55", borderRadius: 1 }} />
                        </div>
                        <div style={{ fontFamily: mono, fontSize: 7.5, color: "#ffffff33", width: 40, textAlign: "right", flexShrink: 0 }}>
                          {c.totalCount.toLocaleString()}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Scale note */}
      <div style={{ padding: "0 24px 16px", fontFamily: mono, fontSize: 7.5, color: "#ffffff22" }}>
        {logScale
          ? "Log scale: D12 Proteins (9,419) vs D26 Pharma (130) still visible"
          : "Linear scale: D12 Proteins dominates — toggle LOG to compare smaller classes"}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SKETCH 2 — SEARCH FIRST
// Search input + chip flow. Category filter pills for top branches.
// ═══════════════════════════════════════════════════════════════════════════
function SearchFirst({ data }) {
  const [query, setQuery] = useState("");
  const [activeBranch, setActiveBranch] = useState(null);
  const inputRef = useRef(null);
  const { branches, allDTerms } = data;

  // Short names for pills
  const PILL_NAMES = {
    D01: "Inorganic",
    D02: "Organic",
    D03: "Heterocyclic",
    D04: "Polycyclic",
    D05: "Macromolecular",
    D06: "Hormones",
    D08: "Enzymes",
    D09: "Carbohydrates",
    D10: "Lipids",
    D11: "Proteins (D11)",
    D12: "AA/Peptides/Proteins",
    D13: "Nucleic Acids",
    D20: "Complex Mixtures",
    D23: "Biological Factors",
    D25: "Dental/Biomedical",
    D26: "Pharma Preps",
    D27: "Actions & Uses",
  };

  const q = query.trim().toLowerCase();

  // Results to show
  let results = [];
  let resultLabel = "";

  if (q.length >= 2) {
    results = allDTerms
      .filter(t => t.name.toLowerCase().includes(q))
      .slice(0, 120);
    resultLabel = `${results.length >= 120 ? "120+" : results.length} matches for "${query}"`;
  } else if (activeBranch) {
    results = allDTerms
      .filter(t => t.treeNums.some(n => n.startsWith(activeBranch + ".")))
      .slice(0, 120);
    resultLabel = `${results.length >= 120 ? "120+" : results.length} terms under ${activeBranch} · ${PILL_NAMES[activeBranch] || ""}`;
  }

  const showDefault = q.length < 2 && !activeBranch;

  function chipColor(term) {
    for (const tn of term.treeNums) {
      const top = tn.slice(0, 3);
      const c = chemColor(top);
      if (c !== TREE_COLOR) return c;
    }
    return TREE_COLOR;
  }

  return (
    <div style={{ background: BG, height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Header + search */}
      <div style={{ padding: "18px 24px 12px", flexShrink: 0 }}>
        <div style={{ fontFamily: mono, fontSize: 11, color: TREE_COLOR, letterSpacing: 3, marginBottom: 6 }}>SEARCH FIRST</div>
        <div style={{ fontFamily: mono, fontSize: 8.5, color: "#ffffff33", marginBottom: 14 }}>
          24k+ terms need search · type to filter · or browse by category
        </div>

        {/* Search input */}
        <div style={{ display: "flex", alignItems: "center", gap: 0, background: "#ffffff0a", border: `1px solid ${q.length >= 2 ? TREE_COLOR + "88" : "#ffffff18"}`, borderRadius: 6, padding: "0 12px", transition: "border-color 0.15s" }}>
          <div style={{ fontFamily: mono, fontSize: 11, color: "#ffffff33", marginRight: 8 }}>⌕</div>
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setActiveBranch(null); }}
            placeholder="search D tree terms…"
            autoFocus
            style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontFamily: mono, fontSize: 11, color: "#ffffff", padding: "10px 0", caretColor: TREE_COLOR }}
          />
          {query && (
            <button onClick={() => setQuery("")} style={{ background: "none", border: "none", color: "#ffffff44", cursor: "pointer", fontFamily: mono, fontSize: 12, padding: "0 0 0 8px" }}>
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Category filter pills */}
      <div style={{ padding: "0 24px 12px", flexShrink: 0 }}>
        <div style={{ fontFamily: mono, fontSize: 7, color: "#ffffff25", letterSpacing: 2, marginBottom: 8 }}>BROWSE BY BRANCH</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
          {branches.map(b => {
            const isActive = activeBranch === b.treeNum;
            const color = b.color;
            return (
              <button
                key={b.treeNum}
                onClick={() => {
                  setQuery("");
                  setActiveBranch(isActive ? null : b.treeNum);
                }}
                style={{
                  padding: "4px 9px", fontFamily: mono, fontSize: 8,
                  background: isActive ? color + "22" : "#ffffff07",
                  border: `1px solid ${isActive ? color : "#ffffff12"}`,
                  borderRadius: 20, cursor: "pointer",
                  color: isActive ? color : "#ffffff55",
                  transition: "all 0.12s",
                  display: "flex", alignItems: "center", gap: 5,
                }}
              >
                <span style={{ color: isActive ? color : color + "88", fontSize: 7 }}>{b.treeNum}</span>
                <span>{PILL_NAMES[b.treeNum] || b.term.name}</span>
                <span style={{ color: isActive ? color + "99" : "#ffffff22", fontSize: 7 }}>{b.totalCount.toLocaleString()}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: "#ffffff0a", flexShrink: 0 }} />

      {/* Results area */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 24px 24px" }}>
        {showDefault && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ fontFamily: mono, fontSize: 8, color: "#ffffff25", letterSpacing: 1.5 }}>D TREE — 10,688 UNIQUE TERMS</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {CHEM_GROUPS.map(g => {
                const total = branches.filter(b => g.branches.includes(b.treeNum)).reduce((s, b) => s + b.totalCount, 0);
                return (
                  <div key={g.id} style={{ padding: "8px 14px", background: g.color + "12", border: `1px solid ${g.color}33`, borderRadius: 8, fontFamily: mono }}>
                    <div style={{ fontSize: 9, color: g.color, marginBottom: 3 }}>{g.label}</div>
                    <div style={{ fontSize: 7.5, color: "#ffffff44" }}>{total.toLocaleString()} terms</div>
                    <div style={{ fontSize: 7, color: "#ffffff22", marginTop: 2 }}>{g.branches.join(" · ")}</div>
                  </div>
                );
              })}
            </div>
            <div style={{ fontFamily: mono, fontSize: 7.5, color: "#ffffff22", marginTop: 4 }}>
              Type at least 2 characters to search · or click a branch pill above
            </div>
          </div>
        )}

        {!showDefault && results.length > 0 && (
          <div>
            <div style={{ fontFamily: mono, fontSize: 7.5, color: "#ffffff33", marginBottom: 10 }}>{resultLabel}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {results.map((t, i) => {
                const color = chipColor(t);
                // Get first D treeNum for display
                const dn = t.treeNums.find(n => n.startsWith("D")) || "";
                // Show abbreviated tree path
                const parts = dn.split(".");
                const shortPath = parts.length > 2 ? parts.slice(0, 2).join(".") + "…" : dn;
                return (
                  <div
                    key={t.ui + i}
                    title={`${t.name}\n${dn}`}
                    style={{
                      padding: "3px 8px", background: color + "10",
                      border: `1px solid ${color}30`,
                      borderRadius: 4, display: "flex", alignItems: "center", gap: 5,
                    }}
                  >
                    <span style={{ fontFamily: mono, fontSize: 7, color: color + "88" }}>{shortPath}</span>
                    <span style={{ fontFamily: mono, fontSize: 8.5, color: "#ffffffcc" }}>{t.name}</span>
                  </div>
                );
              })}
            </div>
            {results.length >= 120 && (
              <div style={{ fontFamily: mono, fontSize: 7.5, color: "#ffffff22", marginTop: 10 }}>
                Showing first 120 matches — refine your query for fewer results
              </div>
            )}
          </div>
        )}

        {!showDefault && results.length === 0 && q.length >= 2 && (
          <div style={{ fontFamily: mono, fontSize: 9, color: "#ffffff22" }}>
            No terms matching "{query}" in tree D
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SKETCH 3 — ACTIONS & USES
// Focus on D27: what do chemicals DO in biomedical research?
// Grid of D27 children cards showing sub-counts and leaf terms.
// ═══════════════════════════════════════════════════════════════════════════
function ActionsAndUses({ data }) {
  const [selected, setSelected] = useState(null);
  const { childrenMap } = data;

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

  function getTopLeafTerms(treeNum, max) {
    // BFS until we hit leaves or max collected
    const leaves = [];
    const q = [treeNum];
    const visited = new Set();
    while (q.length && leaves.length < max) {
      const k = q.shift();
      if (visited.has(k)) continue;
      visited.add(k);
      const kids = childrenMap.get(k) || [];
      if (kids.length === 0 && k !== treeNum) {
        // leaf
        // find term name — it's stored in childrenMap parent entries
        // we need to search the map to find the term name for k
      } else {
        for (const c of kids) q.push(c.treeNum);
      }
    }
    return leaves;
  }

  // We'll get leaf terms differently — from the children entries themselves
  function collectLeafTermNames(treeNum, max) {
    const results = [];
    const q = [treeNum];
    const seen = new Set();
    while (q.length && results.length < max) {
      const k = q.shift();
      if (seen.has(k)) continue;
      seen.add(k);
      const kids = childrenMap.get(k) || [];
      if (kids.length === 0 && k !== treeNum) {
        // Find term name by searching parent's children list
        // Actually we have the term in the children entries
      }
      for (const c of kids) {
        q.push(c.treeNum);
        if (!childrenMap.has(c.treeNum) || childrenMap.get(c.treeNum).length === 0) {
          if (results.length < max) results.push(c.term.name);
        }
      }
    }
    return results;
  }

  // D27 children
  const d27children = (childrenMap.get("D27") || []).map(({ term, treeNum }) => ({
    term,
    treeNum,
    totalCount: countAll(treeNum),
    directChildren: (childrenMap.get(treeNum) || []).map(({ term: t2, treeNum: tn2 }) => ({
      term: t2, treeNum: tn2,
      totalCount: countAll(tn2),
      sampleLeaves: collectLeafTermNames(tn2, 6),
    })).sort((a, b) => b.totalCount - a.totalCount),
  })).sort((a, b) => b.totalCount - a.totalCount);

  // Category configs
  const CATEGORY_CONFIG = {
    "D27.505": { color: "#C3A6FF", icon: "⚗", label: "Pharmacologic Actions" },
    "D27.888": { color: "#F87171", icon: "☠", label: "Toxic Actions" },
    "D27.720": { color: "#FB923C", icon: "⚙", label: "Specialty Uses" },
  };

  const selItem = selected ? d27children.find(c => c.treeNum === selected) : null;

  return (
    <div style={{ background: BG, height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "18px 24px 10px", flexShrink: 0 }}>
        <div style={{ fontFamily: mono, fontSize: 11, color: TREE_COLOR, letterSpacing: 3, marginBottom: 4 }}>ACTIONS & USES</div>
        <div style={{ fontFamily: mono, fontSize: 8.5, color: "#ffffff33" }}>
          D27 Chemical Actions and Uses · what biomedical research cares about chemicals FOR
        </div>
      </div>

      <div style={{ flex: 1, overflow: "hidden", display: "flex", gap: 0 }}>
        {/* Left: D27 category cards */}
        <div style={{ width: 320, flexShrink: 0, overflowY: "auto", padding: "12px 0 24px 24px", display: "flex", flexDirection: "column", gap: 8, borderRight: "1px solid #ffffff0a" }}>
          {d27children.map(cat => {
            const cfg = CATEGORY_CONFIG[cat.treeNum] || { color: TREE_COLOR, icon: "◈", label: cat.term.name };
            const isSelected = selected === cat.treeNum;
            return (
              <div
                key={cat.treeNum}
                onClick={() => setSelected(isSelected ? null : cat.treeNum)}
                style={{
                  background: isSelected ? cfg.color + "14" : "#ffffff06",
                  border: `1px solid ${isSelected ? cfg.color : "#ffffff10"}`,
                  borderRadius: 8,
                  padding: "12px 14px",
                  cursor: "pointer",
                  transition: "all 0.15s",
                  marginRight: 12,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 14 }}>{cfg.icon}</span>
                  <div>
                    <div style={{ fontFamily: mono, fontSize: 9.5, color: isSelected ? cfg.color : "#ffffffcc" }}>{cfg.label}</div>
                    <div style={{ fontFamily: mono, fontSize: 7.5, color: "#ffffff33" }}>{cat.treeNum}</div>
                  </div>
                  <div style={{ marginLeft: "auto", fontFamily: mono, fontSize: 9, color: cfg.color + "cc" }}>
                    {cat.totalCount}
                  </div>
                </div>

                {/* Sub-category chips */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {cat.directChildren.slice(0, 8).map(sub => (
                    <div key={sub.treeNum} style={{ padding: "2px 7px", background: cfg.color + "10", border: `1px solid ${cfg.color}22`, borderRadius: 3 }}>
                      <span style={{ fontFamily: mono, fontSize: 7.5, color: cfg.color + "bb" }}>{sub.term.name}</span>
                      <span style={{ fontFamily: mono, fontSize: 7, color: "#ffffff22", marginLeft: 4 }}>{sub.totalCount}</span>
                    </div>
                  ))}
                  {cat.directChildren.length > 8 && (
                    <div style={{ padding: "2px 7px", background: "#ffffff06", border: "1px solid #ffffff10", borderRadius: 3 }}>
                      <span style={{ fontFamily: mono, fontSize: 7.5, color: "#ffffff33" }}>+{cat.directChildren.length - 8} more</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* D27 total */}
          <div style={{ marginRight: 12, padding: "10px 14px", borderTop: "1px solid #ffffff08", marginTop: 4 }}>
            <div style={{ fontFamily: mono, fontSize: 7.5, color: "#ffffff22" }}>
              D27 total: {d27children.reduce((s, c) => s + c.totalCount, 0).toLocaleString()} terms
            </div>
          </div>
        </div>

        {/* Right: detail panel */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 24px 24px" }}>
          {!selItem ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ fontFamily: mono, fontSize: 8, color: "#ffffff22", letterSpacing: 1.5 }}>
                SELECT A CATEGORY TO EXPLORE
              </div>

              {/* Context: why D27 matters */}
              <div style={{ background: "#ffffff06", border: "1px solid #ffffff0e", borderRadius: 8, padding: "16px 18px", fontFamily: mono }}>
                <div style={{ fontSize: 9, color: TREE_COLOR, marginBottom: 10, letterSpacing: 1 }}>WHY D27?</div>
                <div style={{ fontSize: 8.5, color: "#ffffff66", lineHeight: 1.7 }}>
                  Most MeSH trees classify what things ARE. D27 classifies what chemicals DO.
                  It is the functional lens on the entire D tree — connecting 24k chemical
                  entities to their roles in pharmacology, toxicology, and clinical use.
                </div>
              </div>

              {/* Quick stats radial-style grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                {d27children.map(cat => {
                  const cfg = CATEGORY_CONFIG[cat.treeNum] || { color: TREE_COLOR, icon: "◈" };
                  return (
                    <div key={cat.treeNum} onClick={() => setSelected(cat.treeNum)} style={{ background: cfg.color + "0a", border: `1px solid ${cfg.color}22`, borderRadius: 8, padding: "14px", cursor: "pointer", transition: "all 0.15s" }}>
                      <div style={{ fontFamily: mono, fontSize: 18, textAlign: "center", marginBottom: 6 }}>{cfg.icon}</div>
                      <div style={{ fontFamily: mono, fontSize: 8.5, color: "#ffffffcc", textAlign: "center", marginBottom: 4 }}>{cat.term.name}</div>
                      <div style={{ fontFamily: mono, fontSize: 11, color: cfg.color, textAlign: "center", fontWeight: "bold" }}>{cat.totalCount}</div>
                      <div style={{ fontFamily: mono, fontSize: 7, color: "#ffffff33", textAlign: "center" }}>terms</div>
                    </div>
                  );
                })}
              </div>

              <div style={{ fontFamily: mono, fontSize: 7.5, color: "#ffffff22" }}>
                Pharmacologic Actions alone spans {d27children.find(c => c.treeNum === "D27.505")?.totalCount || 0} terms —
                covering everything from antineoplastic agents to ion channel modulators.
              </div>
            </div>
          ) : (
            <div>
              {/* Category header */}
              {(() => {
                const cfg = CATEGORY_CONFIG[selItem.treeNum] || { color: TREE_COLOR, icon: "◈", label: selItem.term.name };
                return (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                      <span style={{ fontSize: 20 }}>{cfg.icon}</span>
                      <div>
                        <div style={{ fontFamily: mono, fontSize: 12, color: cfg.color }}>{selItem.term.name}</div>
                        <div style={{ fontFamily: mono, fontSize: 7.5, color: "#ffffff33" }}>{selItem.treeNum} · {selItem.totalCount} total terms</div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Sub-category grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8 }}>
                {selItem.directChildren.map(sub => {
                  const cfg = CATEGORY_CONFIG[selItem.treeNum] || { color: TREE_COLOR };
                  return (
                    <div key={sub.treeNum} style={{ background: cfg.color + "08", border: `1px solid ${cfg.color}18`, borderRadius: 6, padding: "10px 12px" }}>
                      <div style={{ fontFamily: mono, fontSize: 8.5, color: "#ffffffcc", marginBottom: 4, lineHeight: 1.4 }}>
                        {sub.term.name}
                      </div>
                      <div style={{ fontFamily: mono, fontSize: 7.5, color: cfg.color + "aa", marginBottom: 6 }}>
                        {sub.totalCount} terms
                      </div>
                      {sub.sampleLeaves.length > 0 && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                          {sub.sampleLeaves.map((leaf, i) => (
                            <div key={i} style={{ fontFamily: mono, fontSize: 7.5, color: "#ffffff33", paddingLeft: 6, borderLeft: `1px solid ${cfg.color}22` }}>
                              {leaf}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── APP ────────────────────────────────────────────────────────────────────
const VIEWS = [
  { id: "classes", label: "1. Chemical Classes" },
  { id: "search",  label: "2. Search First" },
  { id: "actions", label: "3. Actions & Uses" },
];

export default function MeshDConcepts() {
  const [active, setActive] = useState("classes");
  const { data, loading } = useDData();

  const views = { classes: ChemicalClasses, search: SearchFirst, actions: ActionsAndUses };
  const Active = views[active];

  return (
    <div style={{ width: "100%", height: "100vh", display: "flex", flexDirection: "column", background: BG }}>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&display=swap" rel="stylesheet" />

      <nav style={{ display: "flex", alignItems: "center", gap: 0, borderBottom: "2px solid #ffffff12", flexShrink: 0, background: "#0a0c10", overflowX: "auto" }}>
        <div style={{ padding: "12px 20px", fontFamily: mono, fontSize: 9, color: "#ffffff33", letterSpacing: 2, flexShrink: 0 }}>
          D CONCEPTS
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
