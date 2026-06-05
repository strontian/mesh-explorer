import { useState, useEffect, useRef } from "react";
import { MeshPageHeader } from "./mesh_page_header.jsx";

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

// ═══════════════════════════════════════════════════════════════════════════
// SKETCH 4 — CHEMICAL EXPLORER
// Search-first interface with identity branches, term detail, and D27 actions.
// ═══════════════════════════════════════════════════════════════════════════
function ChemicalExplorer({ data }) {
  const [query, setQuery] = useState("");
  const [activeBranch, setActiveBranch] = useState("D12");
  const [activeAction, setActiveAction] = useState(null);
  const [selected, setSelected] = useState(null);
  const { branches, childrenMap, allDTerms } = data;

  const branchById = new Map(branches.map(b => [b.treeNum, b]));
  const q = query.trim().toLowerCase();

  function countAll(treeNum) {
    let n = 0;
    const queue = [treeNum];
    while (queue.length) {
      const key = queue.shift();
      const kids = childrenMap.get(key) || [];
      n += kids.length;
      for (const c of kids) queue.push(c.treeNum);
    }
    return n;
  }

  function branchName(treeNum) {
    const branch = branchById.get(treeNum.slice(0, 3));
    return branch?.term.name || treeNum.slice(0, 3);
  }

  function firstDPath(term) {
    return term.treeNums.find(n => n.startsWith("D")) || "";
  }

  function visibleTerms() {
    let terms = allDTerms;
    if (activeAction) {
      terms = terms.filter(t => t.treeNums.some(n => n === activeAction || n.startsWith(activeAction + ".")));
    } else if (activeBranch) {
      terms = terms.filter(t => t.treeNums.some(n => n === activeBranch || n.startsWith(activeBranch + ".")));
    }
    if (q.length >= 2) {
      terms = terms.filter(t => t.name.toLowerCase().includes(q));
    }
    return terms.slice(0, 90);
  }

  function termColor(term) {
    const tn = firstDPath(term);
    return chemColor(tn.slice(0, 3));
  }

  const actionRoots = (childrenMap.get("D27") || []).map(({ term, treeNum }) => ({
    term,
    treeNum,
    totalCount: countAll(treeNum),
    color: treeNum === "D27.505" ? "#C3A6FF" : treeNum === "D27.888" ? "#F87171" : "#FB923C",
  })).sort((a, b) => b.totalCount - a.totalCount);

  const results = visibleTerms();
  const selectedDPaths = selected?.treeNums.filter(n => n.startsWith("D")) || [];
  const selectedActionPaths = selectedDPaths.filter(n => n.startsWith("D27"));
  const selectedIdentityPaths = selectedDPaths.filter(n => !n.startsWith("D27"));

  return (
    <div style={{ background: BG, height: "100%", overflow: "hidden", display: "grid", gridTemplateColumns: "250px minmax(360px, 1fr) 310px" }}>
      {/* Left: identity map */}
      <aside style={{ borderRight: "1px solid #ffffff0d", overflowY: "auto", padding: "18px 16px 22px" }}>
        <div style={{ fontFamily: mono, fontSize: 11, color: TREE_COLOR, letterSpacing: 3, marginBottom: 5 }}>CHEMICAL EXPLORER</div>
        <div style={{ fontFamily: mono, fontSize: 8, color: "#ffffff33", lineHeight: 1.6, marginBottom: 16 }}>
          Search across D, then read each term through two lenses: what it is and what it does.
        </div>

        <div style={{ fontFamily: mono, fontSize: 7, color: "#ffffff25", letterSpacing: 2, marginBottom: 8 }}>IDENTITY BRANCHES</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {CHEM_GROUPS.map(group => {
            const total = branches.filter(b => group.branches.includes(b.treeNum)).reduce((sum, b) => sum + b.totalCount, 0);
            return (
              <div key={group.id} style={{ border: `1px solid ${group.color}18`, background: group.color + "08", borderRadius: 6, overflow: "hidden" }}>
                <button
                  onClick={() => { setActiveBranch(null); setActiveAction(null); setQuery(""); }}
                  style={{ width: "100%", padding: "8px 9px", background: "transparent", border: "none", display: "flex", justifyContent: "space-between", cursor: "pointer", fontFamily: mono }}
                >
                  <span style={{ fontSize: 8.5, color: group.color }}>{group.label}</span>
                  <span style={{ fontSize: 7.5, color: "#ffffff33" }}>{total.toLocaleString()}</span>
                </button>
                <div style={{ padding: "0 7px 7px", display: "flex", flexDirection: "column", gap: 3 }}>
                  {group.branches.map(tn => {
                    const branch = branchById.get(tn);
                    if (!branch) return null;
                    const active = activeBranch === tn && !activeAction;
                    return (
                      <button
                        key={tn}
                        onClick={() => { setActiveBranch(tn); setActiveAction(null); setQuery(""); }}
                        style={{
                          display: "grid", gridTemplateColumns: "34px 1fr auto", gap: 6, alignItems: "center",
                          padding: "5px 6px", background: active ? group.color + "18" : "#00000018",
                          border: `1px solid ${active ? group.color + "66" : "transparent"}`,
                          borderRadius: 4, color: active ? "#ffffffdd" : "#ffffff66",
                          cursor: "pointer", fontFamily: mono, textAlign: "left",
                        }}
                      >
                        <span style={{ fontSize: 7, color: group.color }}>{tn}</span>
                        <span style={{ fontSize: 7.8, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{branch.term.name}</span>
                        <span style={{ fontSize: 7, color: "#ffffff2d" }}>{branch.totalCount.toLocaleString()}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      {/* Center: search and results */}
      <main style={{ overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "18px 20px 12px", borderBottom: "1px solid #ffffff0d", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", background: "#ffffff0a", border: `1px solid ${q.length >= 2 ? TREE_COLOR + "88" : "#ffffff18"}`, borderRadius: 5, padding: "0 10px" }}>
            <span style={{ fontFamily: mono, fontSize: 10, color: "#ffffff33", marginRight: 8 }}>⌕</span>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="search chemicals, proteins, drugs, actions..."
              style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontFamily: mono, fontSize: 10.5, color: "#fff", padding: "10px 0", caretColor: TREE_COLOR }}
            />
            {(query || activeAction) && (
              <button
                onClick={() => { setQuery(""); setActiveAction(null); }}
                style={{ background: "transparent", border: "none", color: "#ffffff44", cursor: "pointer", fontFamily: mono, fontSize: 11 }}
              >
                x
              </button>
            )}
          </div>
          <div style={{ marginTop: 9, display: "flex", alignItems: "center", gap: 8, fontFamily: mono, fontSize: 7.5, color: "#ffffff35" }}>
            <span>{results.length >= 90 ? "90+" : results.length} visible</span>
            <span>·</span>
            <span>{activeAction ? activeAction + " actions lens" : activeBranch ? activeBranch + " " + branchName(activeBranch) : "all D terms"}</span>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "14px 20px 22px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 7 }}>
            {results.map((term, i) => {
              const color = termColor(term);
              const path = firstDPath(term);
              const active = selected?.ui === term.ui;
              const actionCount = term.treeNums.filter(n => n.startsWith("D27")).length;
              return (
                <button
                  key={term.ui + i}
                  onClick={() => setSelected(term)}
                  style={{
                    textAlign: "left", padding: "9px 10px", minHeight: 66,
                    background: active ? color + "18" : "#ffffff06",
                    border: `1px solid ${active ? color : "#ffffff0f"}`,
                    borderRadius: 6, cursor: "pointer", fontFamily: mono,
                    display: "flex", flexDirection: "column", gap: 5,
                  }}
                >
                  <span style={{ fontSize: 9, color: active ? "#ffffff" : "#ffffffc8", lineHeight: 1.35 }}>{term.name}</span>
                  <span style={{ fontSize: 7.2, color: color + "bb" }}>{path || "D"}</span>
                  <span style={{ fontSize: 7, color: "#ffffff2d" }}>
                    {term.treeNums.filter(n => n.startsWith("D")).length} D path{term.treeNums.filter(n => n.startsWith("D")).length === 1 ? "" : "s"}
                    {actionCount ? ` · ${actionCount} action path${actionCount === 1 ? "" : "s"}` : ""}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </main>

      {/* Right: function lens and selected term */}
      <aside style={{ borderLeft: "1px solid #ffffff0d", overflowY: "auto", padding: "18px 16px 22px" }}>
        <div style={{ fontFamily: mono, fontSize: 7, color: "#ffffff25", letterSpacing: 2, marginBottom: 8 }}>D27 FUNCTION LENS</div>
        <div style={{ display: "grid", gap: 6, marginBottom: 16 }}>
          {actionRoots.map(action => {
            const active = activeAction === action.treeNum;
            return (
              <button
                key={action.treeNum}
                onClick={() => { setActiveAction(active ? null : action.treeNum); setActiveBranch(null); setQuery(""); }}
                style={{
                  padding: "9px 10px", background: active ? action.color + "18" : action.color + "09",
                  border: `1px solid ${active ? action.color + "88" : action.color + "22"}`,
                  borderRadius: 6, cursor: "pointer", fontFamily: mono, textAlign: "left",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 3 }}>
                  <span style={{ fontSize: 8.5, color: active ? action.color : "#ffffffc0" }}>{action.term.name}</span>
                  <span style={{ fontSize: 7.5, color: action.color }}>{action.totalCount.toLocaleString()}</span>
                </div>
                <div style={{ fontSize: 7, color: "#ffffff33" }}>{action.treeNum}</div>
              </button>
            );
          })}
        </div>

        <div style={{ height: 1, background: "#ffffff0d", marginBottom: 15 }} />

        {!selected ? (
          <div style={{ fontFamily: mono, fontSize: 8, color: "#ffffff32", lineHeight: 1.7 }}>
            Select a term to see whether MeSH treats it mainly as an identity, an action, or both. This is the key distinction D needs to teach.
          </div>
        ) : (
          <div style={{ fontFamily: mono }}>
            <div style={{ fontSize: 12, color: "#fff", lineHeight: 1.35, marginBottom: 6 }}>{selected.name}</div>
            <div style={{ fontSize: 7.5, color: "#ffffff33", marginBottom: 12 }}>{selected.ui}</div>

            {selected.note && (
              <div style={{ fontSize: 8, color: "#ffffff66", lineHeight: 1.55, background: "#ffffff06", border: "1px solid #ffffff0f", borderRadius: 6, padding: 10, marginBottom: 13 }}>
                {selected.note}
              </div>
            )}

            <div style={{ fontSize: 7, color: "#ffffff25", letterSpacing: 2, marginBottom: 7 }}>WHAT IT IS</div>
            <div style={{ display: "grid", gap: 5, marginBottom: 13 }}>
              {(selectedIdentityPaths.length ? selectedIdentityPaths : selectedDPaths).map(path => {
                const color = chemColor(path.slice(0, 3));
                return (
                  <div key={path} style={{ padding: "6px 7px", background: color + "0d", border: `1px solid ${color}24`, borderRadius: 4 }}>
                    <div style={{ fontSize: 7.5, color }}>{path}</div>
                    <div style={{ fontSize: 7.5, color: "#ffffff50", marginTop: 2 }}>{branchName(path)}</div>
                  </div>
                );
              })}
            </div>

            <div style={{ fontSize: 7, color: "#ffffff25", letterSpacing: 2, marginBottom: 7 }}>WHAT IT DOES</div>
            {selectedActionPaths.length ? (
              <div style={{ display: "grid", gap: 5 }}>
                {selectedActionPaths.map(path => (
                  <div key={path} style={{ padding: "6px 7px", background: "#FB923C0d", border: "1px solid #FB923C24", borderRadius: 4 }}>
                    <div style={{ fontSize: 7.5, color: "#FB923C" }}>{path}</div>
                    <div style={{ fontSize: 7.5, color: "#ffffff50", marginTop: 2 }}>Chemical Actions and Uses</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 8, color: "#ffffff30", lineHeight: 1.5 }}>
                No D27 action path on this descriptor.
              </div>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SKETCH 5 — PATH LENSES
// Shows MeSH as descriptor concepts placed into multiple tree positions.
// ═══════════════════════════════════════════════════════════════════════════
function PathLenses({ data }) {
  const { branches, childrenMap, allDTerms } = data;
  const defaultTerm = allDTerms.find(t => t.name === "Amido Black") || allDTerms[0];
  const [query, setQuery] = useState(defaultTerm?.name || "");
  const [selectedUi, setSelectedUi] = useState(defaultTerm?.ui || null);

  const treeName = new Map();
  for (const branch of branches) treeName.set(branch.treeNum, branch.term.name);
  for (const kids of childrenMap.values()) {
    for (const { term, treeNum } of kids) treeName.set(treeNum, term.name);
  }

  const selected = allDTerms.find(t => t.ui === selectedUi) || defaultTerm;
  const q = query.trim().toLowerCase();
  const matches = q.length >= 2
    ? allDTerms.filter(t => t.name.toLowerCase().includes(q)).slice(0, 40)
    : allDTerms.filter(t => ["Amido Black", "Calcium-Transporting ATPases", "Histamine", "Acaricides"].includes(t.name));

  function lineage(path) {
    const parts = path.split(".");
    return parts.map((_, i) => {
      const treeNum = parts.slice(0, i + 1).join(".");
      return { treeNum, name: treeName.get(treeNum) || treeNum };
    });
  }

  const dPaths = (selected?.treeNums || []).filter(n => n.startsWith("D")).sort();
  const grouped = dPaths.reduce((acc, path) => {
    const root = path.slice(0, 3);
    if (!acc[root]) acc[root] = [];
    acc[root].push(path);
    return acc;
  }, {});

  const rootEntries = Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }));
  const placementCount = dPaths.length;
  const topBranchCount = rootEntries.length;
  const maxDepth = dPaths.reduce((m, path) => Math.max(m, path.split(".").length), 0);

  return (
    <div style={{ background: BG, height: "100%", overflow: "hidden", display: "grid", gridTemplateColumns: "290px minmax(420px, 1fr) 280px" }}>
      <aside style={{ borderRight: "1px solid #ffffff0d", padding: "18px 16px 22px", overflowY: "auto" }}>
        <div style={{ fontFamily: mono, fontSize: 11, color: TREE_COLOR, letterSpacing: 3, marginBottom: 5 }}>PATH LENSES</div>
        <div style={{ fontFamily: mono, fontSize: 8, color: "#ffffff38", lineHeight: 1.6, marginBottom: 15 }}>
          A descriptor is one concept. Tree numbers are positions where MeSH places that concept.
        </div>

        <div style={{ display: "flex", alignItems: "center", background: "#ffffff0a", border: `1px solid ${q.length >= 2 ? TREE_COLOR + "77" : "#ffffff18"}`, borderRadius: 5, padding: "0 9px", marginBottom: 12 }}>
          <span style={{ fontFamily: mono, fontSize: 10, color: "#ffffff33", marginRight: 7 }}>⌕</span>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="search D descriptor..."
            style={{ flex: 1, minWidth: 0, background: "transparent", border: "none", outline: "none", fontFamily: mono, fontSize: 10, color: "#fff", padding: "9px 0", caretColor: TREE_COLOR }}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {matches.map(term => {
            const active = term.ui === selected?.ui;
            const paths = term.treeNums.filter(n => n.startsWith("D"));
            const color = chemColor(paths[0]?.slice(0, 3) || "D27");
            return (
              <button
                key={term.ui}
                onClick={() => { setSelectedUi(term.ui); setQuery(term.name); }}
                style={{
                  textAlign: "left", padding: "8px 9px", background: active ? color + "18" : "#ffffff06",
                  border: `1px solid ${active ? color : "#ffffff0f"}`,
                  borderRadius: 5, cursor: "pointer", fontFamily: mono,
                }}
              >
                <div style={{ fontSize: 8.8, color: active ? "#fff" : "#ffffffc8", lineHeight: 1.35 }}>{term.name}</div>
                <div style={{ fontSize: 7, color: "#ffffff33", marginTop: 4 }}>
                  {paths.length} D placement{paths.length === 1 ? "" : "s"}
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      <main style={{ overflowY: "auto", padding: "18px 22px 24px" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 18, marginBottom: 14 }}>
          <div>
            <div style={{ fontFamily: mono, fontSize: 16, color: "#fff", lineHeight: 1.3 }}>{selected?.name}</div>
            <div style={{ fontFamily: mono, fontSize: 8, color: "#ffffff33", marginTop: 4 }}>{selected?.ui}</div>
          </div>
          <div style={{ display: "flex", gap: 7, flexShrink: 0 }}>
            {[
              ["placements", placementCount],
              ["top branches", topBranchCount],
              ["max depth", maxDepth],
            ].map(([label, value]) => (
              <div key={label} style={{ minWidth: 72, padding: "8px 10px", background: "#ffffff06", border: "1px solid #ffffff0f", borderRadius: 5, fontFamily: mono, textAlign: "center" }}>
                <div style={{ fontSize: 12, color: TREE_COLOR }}>{value}</div>
                <div style={{ fontSize: 7, color: "#ffffff33", marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {selected?.note && (
          <div style={{ fontFamily: mono, fontSize: 8.3, color: "#ffffff66", lineHeight: 1.6, background: "#ffffff06", border: "1px solid #ffffff10", borderRadius: 6, padding: "10px 12px", marginBottom: 14 }}>
            {selected.note}
          </div>
        )}

        <div style={{ display: "grid", gap: 12 }}>
          {rootEntries.map(([root, paths]) => {
            const color = chemColor(root);
            return (
              <section key={root} style={{ background: color + "07", border: `1px solid ${color}24`, borderRadius: 7, overflow: "hidden" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "10px 12px", borderBottom: `1px solid ${color}1f`, fontFamily: mono }}>
                  <div>
                    <span style={{ fontSize: 8, color }}>{root}</span>
                    <span style={{ fontSize: 9, color: "#ffffffd0", marginLeft: 8 }}>{treeName.get(root)}</span>
                  </div>
                  <div style={{ fontSize: 7.5, color: "#ffffff35" }}>
                    {paths.length} placement{paths.length === 1 ? "" : "s"} in this branch
                  </div>
                </div>

                <div style={{ display: "grid", gap: 8, padding: "10px 12px 12px" }}>
                  {paths.map(path => {
                    const chain = lineage(path);
                    return (
                      <div key={path} style={{ background: "#00000018", border: "1px solid #ffffff0c", borderRadius: 5, padding: "9px 10px", fontFamily: mono }}>
                        <div style={{ fontSize: 7.2, color: color + "bb", marginBottom: 7 }}>{path}</div>
                        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 5 }}>
                          {chain.map((node, i) => {
                            const isLeaf = i === chain.length - 1;
                            return (
                              <span key={node.treeNum} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                                <span style={{
                                  padding: "3px 6px", borderRadius: 4,
                                  background: isLeaf ? color + "1e" : "#ffffff08",
                                  border: `1px solid ${isLeaf ? color + "55" : "#ffffff12"}`,
                                  color: isLeaf ? "#fff" : "#ffffff8a",
                                  fontSize: isLeaf ? 8.2 : 7.6,
                                }}>
                                  {node.name}
                                </span>
                                {!isLeaf && <span style={{ color: "#ffffff22", fontSize: 8 }}>/</span>}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </main>

      <aside style={{ borderLeft: "1px solid #ffffff0d", padding: "18px 16px 22px", overflowY: "auto", fontFamily: mono }}>
        <div style={{ fontSize: 7, color: "#ffffff25", letterSpacing: 2, marginBottom: 8 }}>STRUCTURE READ</div>
        <div style={{ display: "grid", gap: 10 }}>
          {[
            ["Tree positions are acyclic", "A tree number has one prefix parent, so each displayed path runs downward without loops."],
            ["Descriptors can repeat", "The same concept can be assigned to several positions, even inside the same top branch."],
            ["Branches mix principles", "Some paths encode structure, some biochemical class, some material form, and D27 encodes action/use."],
            ["The graph is implicit", "The graph-like part comes from one descriptor tying multiple tree positions together."],
          ].map(([title, body]) => (
            <div key={title} style={{ background: "#ffffff06", border: "1px solid #ffffff0f", borderRadius: 6, padding: "10px 11px" }}>
              <div style={{ fontSize: 8.5, color: TREE_COLOR, marginBottom: 5 }}>{title}</div>
              <div style={{ fontSize: 7.8, color: "#ffffff58", lineHeight: 1.55 }}>{body}</div>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SKETCH 6 — TREE SWITCHER
// A true tree navigator for one placement, with jumps to sibling placements.
// ═══════════════════════════════════════════════════════════════════════════
function TreeSwitcher({ data }) {
  const { branches, childrenMap, allDTerms } = data;
  const defaultTerm = allDTerms.find(t => t.name === "Fibrinopeptide A") || allDTerms[0];
  const [currentPath, setCurrentPath] = useState(defaultTerm?.treeNums.find(n => n.startsWith("D")) || "D");
  const [selectedPath, setSelectedPath] = useState(defaultTerm?.treeNums.find(n => n.startsWith("D")) || "D");
  const [query, setQuery] = useState("");

  const nodeByPath = new Map();
  for (const branch of branches) nodeByPath.set(branch.treeNum, branch.term);
  for (const kids of childrenMap.values()) {
    for (const { term, treeNum } of kids) nodeByPath.set(treeNum, term);
  }

  function parentOf(path) {
    if (!path || path === "D") return null;
    const dot = path.lastIndexOf(".");
    return dot === -1 ? "D" : path.slice(0, dot);
  }

  function lineage(path) {
    if (!path || path === "D") return [{ treeNum: "D", name: "Chemicals and Drugs" }];
    const parts = path.split(".");
    const nodes = [{ treeNum: "D", name: "Chemicals and Drugs" }];
    for (let i = 1; i <= parts.length; i++) {
      const treeNum = parts.slice(0, i).join(".");
      nodes.push({ treeNum, name: nodeByPath.get(treeNum)?.name || treeNum });
    }
    return nodes;
  }

  function navigateTo(path) {
    setCurrentPath(path);
    setSelectedPath(path);
  }

  const currentTerm = nodeByPath.get(currentPath);
  const currentLineage = lineage(currentPath);
  const selectedTerm = nodeByPath.get(selectedPath);
  const selectedColor = selectedPath === "D" ? TREE_COLOR : chemColor(selectedPath.slice(0, 3));
  const selectedParentPath = parentOf(selectedPath);
  const selectedChildren = (childrenMap.get(selectedPath) || []).sort((a, b) =>
    a.term.name.localeCompare(b.term.name)
  );
  const selectedSiblings = selectedParentPath ? (childrenMap.get(selectedParentPath) || []).sort((a, b) =>
    a.term.name.localeCompare(b.term.name)
  ) : [];
  const selectedPlacements = selectedTerm
    ? selectedTerm.treeNums.filter(n => n.startsWith("D")).sort()
    : [];
  const navigationPlacements = currentTerm
    ? currentTerm.treeNums.filter(n => n.startsWith("D")).sort()
    : [];
  const q = query.trim().toLowerCase();
  const searchResults = q.length >= 2
    ? allDTerms.filter(t => t.name.toLowerCase().includes(q)).slice(0, 36)
    : [];

  const pathSet = new Set(currentLineage.map(n => n.treeNum));

  function PlacementDag({ paths, orientation = "horizontal" }) {
    const CHIP_W = 126;
    const CHIP_H = 26;
    const GAP_X = 32;
    const ROW_H = 38;
    const LEFT = 12;
    const TOP = 12;
    const SINK_GAP = 42;
    const chains = paths.map(path => ({
      path,
      nodes: lineage(path).slice(0, -1),
    })).sort((a, b) => a.path.localeCompare(b.path, undefined, { numeric: true }));

    const maxDepth = Math.max(...chains.map(c => c.nodes.length), 1);
    const sinkName = currentTerm?.name || "selected descriptor";
    const isVertical = orientation === "vertical";
    const depthGap = isVertical ? 54 : CHIP_W + GAP_X;
    const laneGap = isVertical ? 148 : ROW_H;
    const sinkX = isVertical
      ? LEFT + ((chains.length - 1) * laneGap) / 2
      : LEFT + maxDepth * depthGap + SINK_GAP;
    const sinkY = isVertical
      ? TOP + maxDepth * depthGap + SINK_GAP
      : TOP + ((chains.length - 1) * laneGap) / 2;
    const baseWidth = isVertical
      ? LEFT * 2 + Math.max(chains.length, 1) * laneGap
      : sinkX + CHIP_W + LEFT;
    const baseHeight = isVertical
      ? sinkY + CHIP_H + TOP
      : TOP * 2 + Math.max(chains.length, 1) * laneGap;
    const mergedNodes = new Map();
    const connectors = [];

    function nodeKey(node) {
      if (node.treeNum === "D") return "D";
      return nodeByPath.get(node.treeNum)?.ui || node.treeNum;
    }

    function registerNode(node, depth, row, path) {
      const key = nodeKey(node);
      const term = nodeByPath.get(node.treeNum);
      const existing = mergedNodes.get(key);
      const x = isVertical ? LEFT + row * laneGap : LEFT + depth * depthGap;
      const y = isVertical ? TOP + depth * depthGap : TOP + row * laneGap;
      if (existing) {
        existing.depth = Math.max(existing.depth, depth);
        existing.rows.push(row);
        existing.paths.add(path);
        existing.treeNums.add(node.treeNum);
        const avgRow = existing.rows.reduce((sum, r) => sum + r, 0) / existing.rows.length;
        existing.x = isVertical ? LEFT + avgRow * laneGap : LEFT + existing.depth * depthGap;
        existing.y = isVertical ? TOP + existing.depth * depthGap : TOP + avgRow * laneGap;
        return existing;
      }
      const record = {
        key,
        name: node.name,
        treeNum: node.treeNum,
        depth,
        rows: [row],
        paths: new Set([path]),
        treeNums: new Set([node.treeNum]),
        x,
        y,
        ui: term?.ui,
      };
      mergedNodes.set(key, record);
      return record;
    }

    chains.forEach((chain, row) => {
      let lastVisible = null;
      chain.nodes.forEach((node, depth) => {
        const record = registerNode(node, depth, row, chain.path);
        const prevVisible = lastVisible;
        if (prevVisible) {
          connectors.push({ fromKey: prevVisible.key, toKey: record.key });
        }
        lastVisible = record;
      });
      if (lastVisible) connectors.push({ fromKey: lastVisible.key, toSink: true });
    });

    const uniqueConnectors = [];
    const seenConnectors = new Set();
    for (const c of connectors) {
      const key = c.toSink ? `${c.fromKey}->sink` : `${c.fromKey}->${c.toKey}`;
      if (seenConnectors.has(key)) continue;
      seenConnectors.add(key);
      uniqueConnectors.push({ ...c, key });
    }

    const visibleNodes = [...mergedNodes.values()].sort((a, b) =>
      a.depth - b.depth || a.y - b.y || a.name.localeCompare(b.name)
    );

    for (const node of visibleNodes) {
      const avgRow = node.rows.reduce((sum, r) => sum + r, 0) / node.rows.length;
      node.x = isVertical ? LEFT + avgRow * laneGap : LEFT + node.depth * depthGap;
      node.y = isVertical ? TOP + node.depth * depthGap : TOP + avgRow * laneGap;
    }

    for (const c of uniqueConnectors) {
      c.from = mergedNodes.get(c.fromKey);
      c.to = c.toSink ? { x: sinkX, y: sinkY } : mergedNodes.get(c.toKey);
    }

    const drawableConnectors = uniqueConnectors.filter(c => c.from && c.to);

    const maxNodeX = Math.max(sinkX, ...visibleNodes.map(n => n.x));
    const maxNodeY = Math.max(sinkY, ...visibleNodes.map(n => n.y));
    const svgWidth = Math.max(baseWidth, maxNodeX + CHIP_W + LEFT);
    const svgHeight = Math.max(baseHeight, maxNodeY + CHIP_H + TOP);

    return (
      <div style={{ overflowX: "auto", overflowY: "hidden", paddingBottom: 6, maxHeight: isVertical ? 520 : "none" }}>
        <svg width={svgWidth} height={svgHeight} style={{ display: "block", margin: "0 auto" }}>
          <g>
            {drawableConnectors.map(edge => {
              const sx = isVertical ? edge.from.x + CHIP_W / 2 : edge.from.x + CHIP_W;
              const sy = isVertical ? edge.from.y + CHIP_H : edge.from.y + CHIP_H / 2;
              const tx = isVertical ? edge.to.x + CHIP_W / 2 : edge.to.x;
              const ty = isVertical ? edge.to.y : edge.to.y + CHIP_H / 2;
              const elbow = isVertical
                ? sy + Math.max(16, (ty - sy) / 2)
                : sx + Math.max(16, (tx - sx) / 2);
              return (
                <path
                  key={edge.key}
                  d={isVertical
                    ? `M ${sx} ${sy} V ${elbow} H ${tx} V ${ty}`
                    : `M ${sx} ${sy} H ${elbow} V ${ty} H ${tx}`}
                  fill="none"
                  stroke="#ffffff24"
                  strokeWidth="1.2"
                />
              );
            })}
          </g>
          <g>
            {visibleNodes.map(node => {
              const primaryTreeNum = [...node.treeNums][0];
              const active = node.treeNums.has(currentPath) || [...node.treeNums].some(treeNum => pathSet.has(treeNum));
              const selected = node.treeNums.has(selectedPath);
              const color = primaryTreeNum === "D" ? TREE_COLOR : chemColor(primaryTreeNum.slice(0, 3));
              const canNavigate = node.treeNum !== "D";
              return (
                <g key={node.key} transform={`translate(${node.x}, ${node.y})`} style={{ cursor: canNavigate ? "pointer" : "default" }} onClick={() => canNavigate && setSelectedPath(primaryTreeNum)}>
                  <rect
                    width={CHIP_W}
                    height={CHIP_H}
                    rx="4"
                    fill={selected ? color + "36" : active ? color + "22" : "#151922"}
                    stroke={selected ? color : active ? color + "aa" : color + "55"}
                    strokeWidth={selected ? "1.4" : "1"}
                  />
                  <text x="8" y="11" fill={active ? "#ffffff" : "#ffffffc8"} fontFamily="IBM Plex Mono, monospace" fontSize="7.4">
                    {node.name.length > 20 ? node.name.slice(0, 18) + "..." : node.name}
                  </text>
                  <text x="8" y="21" fill={color} fontFamily="IBM Plex Mono, monospace" fontSize="6.2">
                    {node.treeNums.size > 1 ? `${node.treeNums.size} placements` : node.treeNum}
                  </text>
                </g>
              );
            })}
            <g transform={`translate(${sinkX}, ${sinkY})`} style={{ cursor: "pointer" }} onClick={() => setSelectedPath(currentPath)}>
              <rect width={CHIP_W} height={CHIP_H} rx="4" fill={selectedPath === currentPath ? TREE_COLOR + "36" : TREE_COLOR + "24"} stroke={TREE_COLOR} strokeWidth={selectedPath === currentPath ? "1.4" : "1"} />
              <text x="8" y="11" fill="#ffffff" fontFamily="IBM Plex Mono, monospace" fontSize="7.4">
                {sinkName.length > 20 ? sinkName.slice(0, 18) + "..." : sinkName}
              </text>
              <text x="8" y="21" fill={TREE_COLOR} fontFamily="IBM Plex Mono, monospace" fontSize="6.2">
                {paths.length} placements
              </text>
            </g>
          </g>
        </svg>
      </div>
    );
  }

  function TreeNode({ item, depth }) {
    const { term, treeNum } = item;
    const active = treeNum === currentPath;
    const onPath = pathSet.has(treeNum);
    const kids = childrenMap.get(treeNum) || [];
    const color = chemColor(treeNum.slice(0, 3));
    const expanded = onPath || active;

    return (
      <div>
        <button
          onClick={() => navigateTo(treeNum)}
          style={{
            width: "100%", display: "grid", gridTemplateColumns: "42px 1fr auto", gap: 7, alignItems: "center",
            padding: "5px 7px", paddingLeft: 7 + depth * 12,
            background: active ? color + "1d" : onPath ? color + "0d" : "transparent",
            border: `1px solid ${active ? color + "77" : "transparent"}`,
            borderRadius: 4, cursor: "pointer", fontFamily: mono, textAlign: "left",
          }}
        >
          <span style={{ fontSize: 7, color: active || onPath ? color : "#ffffff2d" }}>{treeNum.split(".").at(-1)}</span>
          <span style={{ fontSize: 8, color: active ? "#fff" : onPath ? "#ffffffc8" : "#ffffff68", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{term.name}</span>
          <span style={{ fontSize: 7, color: "#ffffff2d" }}>{kids.length || ""}</span>
        </button>
        {expanded && kids.length > 0 && (
          <div style={{ marginTop: 2 }}>
            {kids
              .slice()
              .sort((a, b) => a.term.name.localeCompare(b.term.name))
              .slice(0, active ? 80 : 40)
              .map(child => <TreeNode key={child.treeNum} item={child} depth={depth + 1} />)}
            {kids.length > (active ? 80 : 40) && (
              <div style={{ marginLeft: 7 + (depth + 1) * 12, padding: "4px 7px", fontFamily: mono, fontSize: 7, color: "#ffffff28" }}>
                +{kids.length - (active ? 80 : 40)} more children
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ background: BG, height: "100%", overflow: "hidden", display: "grid", gridTemplateColumns: "330px minmax(430px, 1fr) 310px" }}>
      <aside style={{ borderRight: "1px solid #ffffff0d", padding: "16px 14px 22px", overflowY: "auto" }}>
        <div style={{ fontFamily: mono, fontSize: 11, color: TREE_COLOR, letterSpacing: 3, marginBottom: 5 }}>TREE SWITCHER</div>
        <div style={{ fontFamily: mono, fontSize: 8, color: "#ffffff38", lineHeight: 1.55, marginBottom: 13 }}>
          Follow one acyclic tree placement. When a descriptor appears elsewhere, jump to that placement.
        </div>

        <div style={{ display: "grid", gap: 3 }}>
          {(childrenMap.get("D") || []).sort((a, b) => a.treeNum.localeCompare(b.treeNum, undefined, { numeric: true })).map(root => (
            <TreeNode key={root.treeNum} item={root} depth={0} />
          ))}
        </div>
      </aside>

      <main style={{ overflowY: "auto", padding: "18px 22px 24px" }}>
        <section style={{ background: "#ffffff06", border: "1px solid #ffffff10", borderRadius: 7, padding: "14px 15px", marginBottom: 14, fontFamily: mono, height: 142, minHeight: 142, maxHeight: 142, boxSizing: "border-box", overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 14, alignItems: "start" }}>
            <div>
              <div style={{ fontSize: 7, color: "#ffffff25", letterSpacing: 2, marginBottom: 6 }}>SELECTED NODE</div>
              <div style={{ fontSize: 15, color: "#fff", lineHeight: 1.3 }}>{selectedTerm?.name || "Chemicals and Drugs"}</div>
              <div style={{ fontSize: 8, color: selectedColor, marginTop: 5 }}>{selectedPath}</div>
            </div>
            <div style={{ display: "flex", gap: 7, flexShrink: 0 }}>
              {[
                ["children", selectedChildren.length],
                ["siblings", selectedSiblings.length],
                ["placements", selectedPlacements.length || 1],
              ].map(([label, value]) => (
                <div key={label} style={{ minWidth: 68, padding: "7px 8px", background: "#00000022", border: "1px solid #ffffff0d", borderRadius: 5, textAlign: "center" }}>
                  <div style={{ fontSize: 12, color: TREE_COLOR }}>{value}</div>
                  <div style={{ fontSize: 7, color: "#ffffff33", marginTop: 2 }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
          {selectedTerm?.note && (
            <div style={{ fontSize: 8.2, color: "#ffffff62", lineHeight: 1.55, marginTop: 11, maxWidth: 760, maxHeight: 54, overflowY: "auto" }}>
              {selectedTerm.note}
            </div>
          )}
        </section>

        <section style={{ marginBottom: 14 }}>
          <div style={{ fontFamily: mono, fontSize: 7, color: "#ffffff25", letterSpacing: 2, marginBottom: 8 }}>PLACEMENT GRAPH · TOP TO BOTTOM</div>
          <div style={{ background: "#ffffff04", border: "1px solid #ffffff0d", borderRadius: 7, padding: "10px 11px" }}>
            <PlacementDag paths={navigationPlacements.length ? navigationPlacements : [currentPath]} orientation="vertical" />
          </div>
        </section>
      </main>

      <aside style={{ borderLeft: "1px solid #ffffff0d", padding: "16px 14px 22px", overflowY: "auto", fontFamily: mono }}>
        <div style={{ fontSize: 7, color: "#ffffff25", letterSpacing: 2, marginBottom: 8 }}>JUMP BY DESCRIPTOR</div>
        <div style={{ display: "flex", alignItems: "center", background: "#ffffff0a", border: `1px solid ${q.length >= 2 ? TREE_COLOR + "77" : "#ffffff18"}`, borderRadius: 5, padding: "0 9px", marginBottom: 11 }}>
          <span style={{ fontSize: 10, color: "#ffffff33", marginRight: 7 }}>⌕</span>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="search term..."
            style={{ flex: 1, minWidth: 0, background: "transparent", border: "none", outline: "none", fontFamily: mono, fontSize: 10, color: "#fff", padding: "9px 0", caretColor: TREE_COLOR }}
          />
        </div>
        <div style={{ display: "grid", gap: 5 }}>
          {searchResults.map(term => {
            const paths = term.treeNums.filter(n => n.startsWith("D")).sort();
            const firstPath = paths[0];
            return (
              <button
                key={term.ui}
                onClick={() => { if (firstPath) navigateTo(firstPath); setQuery(term.name); }}
                style={{ textAlign: "left", padding: "8px 9px", background: "#ffffff06", border: "1px solid #ffffff0f", borderRadius: 5, cursor: "pointer", fontFamily: mono }}
              >
                <div style={{ fontSize: 8.5, color: "#ffffffc8", lineHeight: 1.35 }}>{term.name}</div>
                <div style={{ fontSize: 7, color: "#ffffff33", marginTop: 4 }}>{paths.length} D placement{paths.length === 1 ? "" : "s"}</div>
              </button>
            );
          })}
        </div>
      </aside>
    </div>
  );
}

function CategoryDagSwitcher({ data }) {
  const { branches, childrenMap, allDTerms } = data;
  const [currentPath, setCurrentPath] = useState("D");
  const [query, setQuery] = useState("");

  const nodeByPath = new Map();
  for (const branch of branches) nodeByPath.set(branch.treeNum, branch.term);
  for (const kids of childrenMap.values()) {
    for (const { term, treeNum } of kids) nodeByPath.set(treeNum, term);
  }

  function parentOf(path) {
    if (!path || path === "D") return null;
    const dot = path.lastIndexOf(".");
    return dot === -1 ? "D" : path.slice(0, dot);
  }

  function lineage(path) {
    if (!path || path === "D") return [{ treeNum: "D", name: "Chemicals and Drugs" }];
    const parts = path.split(".");
    const nodes = [{ treeNum: "D", name: "Chemicals and Drugs" }];
    for (let i = 1; i <= parts.length; i++) {
      const treeNum = parts.slice(0, i).join(".");
      nodes.push({ treeNum, name: nodeByPath.get(treeNum)?.name || treeNum });
    }
    return nodes;
  }

  function countDescendants(path) {
    let n = 0;
    const queue = [...(childrenMap.get(path) || [])];
    while (queue.length) {
      const item = queue.shift();
      n += 1;
      queue.push(...(childrenMap.get(item.treeNum) || []));
    }
    return n;
  }

  const currentTerm = nodeByPath.get(currentPath);
  const currentTitle = currentTerm?.name || "Chemicals and Drugs";
  const currentDescription = currentTerm?.note || "The top-level MeSH category for chemical substances, drugs, biological molecules, materials, mixtures, and functional chemical actions or uses. Its branches mix structural identity, biochemical class, material form, pharmaceutical preparation, and D27 action/use categories.";
  const currentColor = currentPath === "D" ? TREE_COLOR : chemColor(currentPath.slice(0, 3));
  const children = (childrenMap.get(currentPath) || []).sort((a, b) =>
    a.term.name.localeCompare(b.term.name)
  );
  const parentPath = parentOf(currentPath);
  const siblings = parentPath ? (childrenMap.get(parentPath) || []).sort((a, b) =>
    a.term.name.localeCompare(b.term.name)
  ) : [];
  const q = query.trim().toLowerCase();
  const searchResults = q.length >= 2
    ? allDTerms.filter(t => t.name.toLowerCase().includes(q)).slice(0, 36)
    : [];
  const pathSet = new Set(lineage(currentPath).map(n => n.treeNum));
  const descriptorPlacements = currentTerm
    ? currentTerm.treeNums.filter(n => n.startsWith("D")).sort()
    : [currentPath];

  function TreeNode({ item, depth }) {
    const { term, treeNum } = item;
    const active = treeNum === currentPath;
    const onPath = pathSet.has(treeNum);
    const kids = childrenMap.get(treeNum) || [];
    const color = chemColor(treeNum.slice(0, 3));
    const expanded = onPath || active;

    return (
      <div>
        <button
          onClick={() => setCurrentPath(treeNum)}
          style={{
            width: "100%", display: "grid", gridTemplateColumns: "42px 1fr auto", gap: 7, alignItems: "center",
            padding: "5px 7px", paddingLeft: 7 + depth * 12,
            background: active ? color + "1d" : onPath ? color + "0d" : "transparent",
            border: `1px solid ${active ? color + "77" : "transparent"}`,
            borderRadius: 4, cursor: "pointer", fontFamily: mono, textAlign: "left",
          }}
        >
          <span style={{ fontSize: 7, color: active || onPath ? color : "#ffffff2d" }}>{treeNum.split(".").at(-1)}</span>
          <span style={{ fontSize: 8, color: active ? "#fff" : onPath ? "#ffffffc8" : "#ffffff68", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{term.name}</span>
          <span style={{ fontSize: 7, color: "#ffffff2d" }}>{kids.length || ""}</span>
        </button>
        {expanded && kids.length > 0 && (
          <div style={{ marginTop: 2 }}>
            {kids
              .slice()
              .sort((a, b) => a.term.name.localeCompare(b.term.name))
              .slice(0, active ? 80 : 40)
              .map(child => <TreeNode key={child.treeNum} item={child} depth={depth + 1} />)}
            {kids.length > (active ? 80 : 40) && (
              <div style={{ marginLeft: 7 + (depth + 1) * 12, padding: "4px 7px", fontFamily: mono, fontSize: 7, color: "#ffffff28" }}>
                +{kids.length - (active ? 80 : 40)} more children
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  function ChildDag() {
    const CHIP_W = 140;
    const CHIP_H = 30;
    const GAP_X = 18;
    const ROW_H = 60;
    const PATH_GAP = 58;
    const LANE_GAP = 158;
    const LEFT = 16;
    const TOP = 14;
    const visibleChildren = children.slice(0, 80);
    const cols = Math.max(1, Math.min(5, Math.ceil(Math.sqrt(Math.max(visibleChildren.length, 1)))));
    const rows = Math.max(1, Math.ceil(visibleChildren.length / cols));
    const placementPaths = descriptorPlacements.length ? descriptorPlacements : [currentPath];
    const pathChains = placementPaths.map(path => lineage(path));
    const maxPathDepth = Math.max(...pathChains.map(chain => chain.length), 1);
    const mergedNodes = new Map();
    const edgeMap = new Map();

    function nodeKey(node) {
      if (node.treeNum === "D") return "D";
      return nodeByPath.get(node.treeNum)?.ui || node.treeNum;
    }

    function registerNode(node, depth) {
      const key = nodeKey(node);
      const term = nodeByPath.get(node.treeNum);
      if (!mergedNodes.has(key)) {
        mergedNodes.set(key, {
          key,
          name: node.name,
          treeNum: node.treeNum,
          treeNums: new Set([node.treeNum]),
          depth,
          ui: term?.ui,
        });
      } else {
        const record = mergedNodes.get(key);
        record.treeNums.add(node.treeNum);
        record.depth = Math.min(record.depth, depth);
      }
      return mergedNodes.get(key);
    }

    for (const chain of pathChains) {
      let previous = null;
      chain.slice(0, -1).forEach((node, index) => {
        const record = registerNode(node, index);
        if (previous) edgeMap.set(`${previous.key}->${record.key}`, { fromKey: previous.key, toKey: record.key });
        previous = record;
      });
      if (previous) edgeMap.set(`${previous.key}->sink`, { fromKey: previous.key, toSink: true });
    }

    const nodesByDepth = new Map();
    for (const node of mergedNodes.values()) {
      if (!nodesByDepth.has(node.depth)) nodesByDepth.set(node.depth, []);
      nodesByDepth.get(node.depth).push(node);
    }
    for (const nodes of nodesByDepth.values()) {
      nodes.sort((a, b) => a.name.localeCompare(b.name));
    }

    const graphW = cols * CHIP_W + (cols - 1) * GAP_X;
    const minGraphW = 720;
    const widestPathRow = Math.max(1, ...[...nodesByDepth.values()].map(nodes => nodes.length));
    const pathW = widestPathRow * CHIP_W + (widestPathRow - 1) * (LANE_GAP - CHIP_W);
    const svgWidth = LEFT * 2 + Math.max(graphW, pathW, minGraphW);
    const centerX = Math.max(LEFT, (svgWidth - CHIP_W) / 2);
    const childStartX = LEFT + Math.max(0, (svgWidth - LEFT * 2 - graphW) / 2);
    const parentX = centerX;
    const parentY = TOP + (maxPathDepth - 1) * PATH_GAP;
    const childY = parentY + ROW_H;
    const svgHeight = childY + rows * 52 + TOP + (children.length > visibleChildren.length ? 24 : 0);

    for (const [depth, nodes] of nodesByDepth.entries()) {
      const rowStartX = Math.max(LEFT, centerX - ((nodes.length - 1) * LANE_GAP) / 2);
      nodes.forEach((node, index) => {
        node.x = rowStartX + index * LANE_GAP;
        node.y = TOP + depth * PATH_GAP;
      });
    }

    const edges = [...edgeMap.values()]
      .map(edge => ({
        ...edge,
        from: mergedNodes.get(edge.fromKey),
        to: edge.toSink ? { x: centerX, y: parentY } : mergedNodes.get(edge.toKey),
      }))
      .filter(edge => edge.from && edge.to);

    function nodeRect({ x, y, name, treeNum, color, active = false, count, keyId = treeNum }) {
      return (
        <g key={keyId} transform={`translate(${x}, ${y})`} style={{ cursor: treeNum === currentPath ? "default" : "pointer" }} onClick={() => treeNum !== currentPath && setCurrentPath(treeNum)}>
          <title>{name} · {treeNum}</title>
          <rect width={CHIP_W} height={CHIP_H} rx="5" fill={active ? color + "30" : "#151922"} stroke={active ? color : color + "55"} strokeWidth="1" />
          <text x="8" y="11" fill={active ? "#ffffff" : "#ffffffc8"} fontFamily="IBM Plex Mono, monospace" fontSize="7.5">
            {name.length > 22 ? name.slice(0, 20) + "..." : name}
          </text>
          <text x="8" y="23" fill={color} fontFamily="IBM Plex Mono, monospace" fontSize="6.3">
            {treeNum}{count > 0 ? ` · ${count} children` : ""}
          </text>
        </g>
      );
    }

    return (
      <div style={{ overflowX: "auto", paddingBottom: 6 }}>
        <svg width={svgWidth} height={svgHeight} style={{ display: "block", margin: "0 auto" }}>
          {edges.map(edge => {
            const fromX = edge.from.x + CHIP_W / 2;
            const fromY = edge.from.y + CHIP_H;
            const toX = edge.to.x + CHIP_W / 2;
            const toY = edge.to.y;
            const elbow = fromY + Math.max(14, (toY - fromY) / 2);
            return (
              <path
                key={edge.toSink ? `${edge.fromKey}->sink` : `${edge.fromKey}->${edge.toKey}`}
                d={`M ${fromX} ${fromY} V ${elbow} H ${toX} V ${toY}`}
                fill="none"
                stroke="#ffffff2a"
                strokeWidth="1.2"
              />
            );
          })}
          {visibleChildren.map((child, index) => {
            const col = index % cols;
            const row = Math.floor(index / cols);
            const x = childStartX + col * (CHIP_W + GAP_X);
            const y = childY + row * 52;
            const sx = parentX + CHIP_W / 2;
            const sy = parentY + CHIP_H;
            const tx = x + CHIP_W / 2;
            const ty = y;
            const elbow = sy + 18;
            return (
              <path
                key={`${child.treeNum}-edge`}
                d={`M ${sx} ${sy} V ${elbow} H ${tx} V ${ty}`}
                fill="none"
                stroke="#ffffff22"
                strokeWidth="1.1"
              />
            );
          })}
          {[...mergedNodes.values()].map(node => {
            const primaryTreeNum = [...node.treeNums][0];
            return nodeRect({
              x: node.x,
              y: node.y,
              name: node.name,
              treeNum: primaryTreeNum,
              color: primaryTreeNum === "D" ? TREE_COLOR : chemColor(primaryTreeNum.slice(0, 3)),
              active: node.treeNums.has(currentPath),
              count: node.treeNums.size > 1 ? 0 : (childrenMap.get(primaryTreeNum) || []).length,
              keyId: node.key,
            });
          })}
          {nodeRect({
            x: centerX,
            y: parentY,
            name: currentTitle,
            treeNum: currentPath,
            color: currentColor,
            active: true,
            count: children.length,
            keyId: "selected-sink",
          })}
          {visibleChildren.map((child, index) => {
            const col = index % cols;
            const row = Math.floor(index / cols);
            return nodeRect({
              x: childStartX + col * (CHIP_W + GAP_X),
              y: childY + row * 52,
              name: child.term.name,
              treeNum: child.treeNum,
              color: chemColor(child.treeNum.slice(0, 3)),
              count: (childrenMap.get(child.treeNum) || []).length,
              keyId: `child-${child.treeNum}`,
            });
          })}
          {children.length > visibleChildren.length && (
            <text x={LEFT} y={svgHeight - 8} fill="#ffffff35" fontFamily="IBM Plex Mono, monospace" fontSize="8">
              +{children.length - visibleChildren.length} more children not shown in this graph
            </text>
          )}
        </svg>
      </div>
    );
  }

  return (
    <div style={{ background: BG, height: "100%", overflowY: "auto" }}>
      <main style={{ overflowY: "auto", padding: "18px 22px 24px" }}>
        <div style={{ fontFamily: mono, fontSize: 11, color: TREE_COLOR, letterSpacing: 3, marginBottom: 5 }}>CATEGORY DAG</div>
        <div style={{ fontFamily: mono, fontSize: 8, color: "#ffffff38", lineHeight: 1.55, marginBottom: 14 }}>
          Use the graph to move through the hierarchy. Search can jump to a descriptor placement.
        </div>

        <section style={{ fontFamily: mono, marginBottom: 14 }}>
          <div style={{ fontSize: 7, color: "#ffffff25", letterSpacing: 2, marginBottom: 8 }}>JUMP BY DESCRIPTOR</div>
          <div style={{ display: "flex", alignItems: "center", background: "#ffffff0a", border: `1px solid ${q.length >= 2 ? TREE_COLOR + "77" : "#ffffff18"}`, borderRadius: 5, padding: "0 9px", marginBottom: 8 }}>
            <span style={{ fontSize: 10, color: "#ffffff33", marginRight: 7 }}>⌕</span>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="search term..."
              style={{ flex: 1, minWidth: 0, background: "transparent", border: "none", outline: "none", fontFamily: mono, fontSize: 10, color: "#fff", padding: "9px 0", caretColor: TREE_COLOR }}
            />
          </div>
          {searchResults.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 5 }}>
              {searchResults.map(term => {
                const paths = term.treeNums.filter(n => n.startsWith("D")).sort();
                const firstPath = paths[0];
                return (
                  <button
                    key={term.ui}
                    onClick={() => { if (firstPath) setCurrentPath(firstPath); setQuery(term.name); }}
                    style={{ textAlign: "left", padding: "8px 9px", background: "#ffffff06", border: "1px solid #ffffff0f", borderRadius: 5, cursor: "pointer", fontFamily: mono }}
                  >
                    <div style={{ fontSize: 8.5, color: "#ffffffc8", lineHeight: 1.35 }}>{term.name}</div>
                    <div style={{ fontSize: 7, color: "#ffffff33", marginTop: 4 }}>{paths.length} D placement{paths.length === 1 ? "" : "s"}</div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section style={{ background: "#ffffff06", border: "1px solid #ffffff10", borderRadius: 7, padding: "14px 15px", marginBottom: 14, fontFamily: mono, height: 142, minHeight: 142, maxHeight: 142, boxSizing: "border-box", overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 14, alignItems: "start" }}>
            <div>
              <div style={{ fontSize: 15, color: "#fff", lineHeight: 1.3 }}>{currentTitle}</div>
              <div style={{ fontSize: 8, color: currentColor, marginTop: 5 }}>{currentPath}</div>
            </div>
            <div style={{ display: "flex", gap: 7, flexShrink: 0 }}>
              {[
                ["children", children.length],
                ["siblings", siblings.length],
                ["descendants", countDescendants(currentPath)],
              ].map(([label, value]) => (
                <div key={label} style={{ minWidth: 74, padding: "7px 8px", background: "#00000022", border: "1px solid #ffffff0d", borderRadius: 5, textAlign: "center" }}>
                  <div style={{ fontSize: 12, color: currentColor }}>{value}</div>
                  <div style={{ fontSize: 7, color: "#ffffff33", marginTop: 2 }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ fontSize: 8.2, color: "#ffffff62", lineHeight: 1.55, marginTop: 11, maxWidth: 760, maxHeight: 54, overflowY: "auto" }}>
            {currentDescription}
          </div>
        </section>

        <section style={{ marginBottom: 14 }}>
          <div style={{ fontFamily: mono, fontSize: 7, color: "#ffffff25", letterSpacing: 2, marginBottom: 8 }}>CHILD CATEGORY DAG · TOP TO BOTTOM</div>
          <div style={{ background: "#ffffff04", border: "1px solid #ffffff0d", borderRadius: 7, padding: "10px 11px" }}>
            <ChildDag />
            {children.length === 0 && (
              <div style={{ fontFamily: mono, fontSize: 8.5, color: "#ffffff35", marginTop: 8 }}>
                Leaf node: no child categories at this placement.
              </div>
            )}
          </div>
        </section>

      </main>
    </div>
  );
}

export default function MeshDConcepts() {
  const { data, loading } = useDData();
  const [active, setActive] = useState("tree");
  const views = [
    { id: "tree", label: "Tree Switcher" },
    { id: "categoryDag", label: "Category DAG" },
  ];

  return (
    <div style={{ width: "100%", height: "100vh", display: "flex", flexDirection: "column", background: BG }}>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&display=swap" rel="stylesheet" />

      <MeshPageHeader
        letter="D"
        title="Chemicals & Drugs"
        description="Chemical descriptors can appear in multiple hierarchies at once, so the same molecule may be organized by structure, biological role, pharmacologic use, or action."
        color={TREE_COLOR}
      />
      <nav style={{ display: "flex", alignItems: "center", gap: 0, borderBottom: "2px solid #ffffff12", flexShrink: 0, background: "#0a0c10", overflowX: "auto" }}>
        {views.map(view => (
          <button
            key={view.id}
            type="button"
            onClick={() => setActive(view.id)}
            style={{
              padding: "12px 18px",
              fontFamily: mono,
              fontSize: 10,
              color: active === view.id ? TREE_COLOR : "#ffffff55",
              background: "transparent",
              border: "none",
              borderBottom: active === view.id ? `2px solid ${TREE_COLOR}` : "2px solid transparent",
              marginBottom: "-2px",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            {view.label}
          </button>
        ))}
      </nav>

      <div style={{ flex: 1, overflow: "hidden" }}>
        {loading ? <Loading /> : active === "tree" ? <TreeSwitcher data={data} /> : <CategoryDagSwitcher data={data} />}
      </div>
    </div>
  );
}
