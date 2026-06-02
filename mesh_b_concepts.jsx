import { useState, useEffect } from "react";
import { OverviewConceptShell } from "./mesh_overview_concept.jsx";

const mono = "'IBM Plex Mono', monospace";
const BG = "#0f1117";
const TREE_COLOR = "#98D8C8";

// ── KINGDOM CONFIG ────────────────────────────────────────────────────────
const KINGDOM_CFG = [
  { treeNum: "B01", label: "Eukaryota",  color: "#A8D8C8", note: "Animals, plants, fungi, protists — the domain of complex celled life." },
  { treeNum: "B02", label: "Archaea",    color: "#E8D8A8", note: "Single-celled prokaryotes distinct from bacteria; often extremophiles." },
  { treeNum: "B03", label: "Bacteria",   color: "#E8A8A8", note: "Ubiquitous single-celled prokaryotes; pathogens and commensals alike." },
  { treeNum: "B04", label: "Viruses",    color: "#C8C8E8", note: "Obligate intracellular agents; not cells but enormously diverse." },
];

function kingdomColor(treeNum) {
  const k = KINGDOM_CFG.find(c => c.treeNum === treeNum);
  return k ? k.color : TREE_COLOR;
}

// ── DATA HOOK ─────────────────────────────────────────────────────────────
function useBData() {
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

      // BFS depth (max depth from this node)
      function maxDepth(treeNum) {
        let depth = 0;
        const q = [[treeNum, 0]];
        while (q.length) {
          const [k, d] = q.shift();
          if (d > depth) depth = d;
          const kids = childrenMap.get(k) || [];
          for (const c of kids) q.push([c.treeNum, d + 1]);
        }
        return depth;
      }

      const raw = (childrenMap.get("B") || []).sort((a, b) =>
        a.treeNum.localeCompare(b.treeNum, undefined, { numeric: true })
      );

      const branches = raw.map(({ term, treeNum }) => ({
        term, treeNum,
        directCount: childrenMap.get(treeNum)?.length ?? 0,
        totalCount:  countAll(treeNum),
        depth:       maxDepth(treeNum),
        color:       kingdomColor(treeNum),
        cfg:         KINGDOM_CFG.find(c => c.treeNum === treeNum),
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
// SKETCH 1 — KINGDOMS
// Four large cards for B01–B04. Log bar scale so smaller kingdoms are visible.
// Click a card to expand its direct children.
// ═══════════════════════════════════════════════════════════════════════════
function Kingdoms({ data }) {
  const { branches, childrenMap } = data;
  const [expanded, setExpanded] = useState(null);

  // Log scale: map totalCount → bar width 0–100%
  const maxLog = Math.log10(Math.max(...branches.map(b => b.totalCount)) + 1);
  function logPct(n) {
    return (Math.log10(n + 1) / maxLog) * 100;
  }

  return (
    <div style={{ background: BG, height: "100%", overflowY: "auto", padding: "24px 28px" }}>
      <div style={{ fontFamily: mono, fontSize: 9, color: "#ffffff33", letterSpacing: 2, marginBottom: 20 }}>
        TREE B — ORGANISMS · {branches.reduce((s, b) => s + b.totalCount, 0).toLocaleString()} TERMS
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {branches.map(branch => {
          const isExp = expanded === branch.treeNum;
          const kids = (childrenMap.get(branch.treeNum) || [])
            .slice()
            .sort((a, b) => a.treeNum.localeCompare(b.treeNum, undefined, { numeric: true }));
          const top8 = kids.slice(0, 8);
          const pct = logPct(branch.totalCount);
          const color = branch.color;

          return (
            <div
              key={branch.treeNum}
              onClick={() => setExpanded(isExp ? null : branch.treeNum)}
              style={{
                background: isExp ? color + "12" : "#ffffff06",
                border: `1px solid ${isExp ? color + "55" : "#ffffff10"}`,
                borderRadius: 8,
                padding: "20px 22px",
                cursor: "pointer",
                transition: "all 0.18s",
              }}
            >
              {/* Header row */}
              <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 10 }}>
                <span style={{ fontFamily: mono, fontSize: 9, color: color + "aa", letterSpacing: 1 }}>
                  {branch.treeNum}
                </span>
                <span style={{ fontFamily: mono, fontSize: 16, fontWeight: 700, color: color }}>
                  {branch.term.name}
                </span>
                <span style={{ marginLeft: "auto", fontFamily: mono, fontSize: 11, color: "#ffffff55" }}>
                  {branch.totalCount.toLocaleString()} terms
                </span>
                <span style={{ fontFamily: mono, fontSize: 9, color: "#ffffff33" }}>
                  {isExp ? "▲" : "▼"}
                </span>
              </div>

              {/* Log-scale bar */}
              <div style={{ height: 6, background: "#ffffff0a", borderRadius: 3, marginBottom: 12, overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${pct}%`,
                    background: `linear-gradient(90deg, ${color}cc, ${color}44)`,
                    borderRadius: 3,
                    transition: "width 0.4s ease",
                  }}
                />
              </div>

              {/* Scope note */}
              {branch.cfg && (
                <div style={{ fontFamily: mono, fontSize: 9, color: "#ffffff44", marginBottom: 10, lineHeight: 1.6 }}>
                  {branch.cfg.note}
                </div>
              )}

              {/* Top-8 children as chips */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {top8.map(kid => {
                  const kidCount = (childrenMap.get(kid.treeNum) || []).length;
                  return (
                    <span
                      key={kid.treeNum}
                      onClick={e => e.stopPropagation()}
                      style={{
                        fontFamily: mono, fontSize: 8.5,
                        background: color + "18",
                        border: `1px solid ${color}33`,
                        borderRadius: 4,
                        padding: "3px 7px",
                        color: color + "cc",
                      }}
                    >
                      {kid.term.name}
                      {kidCount > 0 && (
                        <span style={{ color: "#ffffff33", marginLeft: 4 }}>{kidCount}</span>
                      )}
                    </span>
                  );
                })}
                {kids.length > 8 && (
                  <span style={{ fontFamily: mono, fontSize: 8, color: "#ffffff22", padding: "3px 4px" }}>
                    +{kids.length - 8} more
                  </span>
                )}
              </div>

              {/* Expanded: all direct children */}
              {isExp && kids.length > 8 && (
                <div style={{ marginTop: 14, borderTop: `1px solid ${color}22`, paddingTop: 14 }}>
                  <div style={{ fontFamily: mono, fontSize: 8, color: "#ffffff22", letterSpacing: 1, marginBottom: 8 }}>
                    ALL DIRECT CHILDREN ({kids.length})
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                    {kids.map(kid => {
                      const kidCount = (childrenMap.get(kid.treeNum) || []).length;
                      return (
                        <span
                          key={kid.treeNum}
                          style={{
                            fontFamily: mono, fontSize: 8,
                            background: color + "10",
                            border: `1px solid ${color}22`,
                            borderRadius: 3,
                            padding: "2px 6px",
                            color: color + "99",
                          }}
                        >
                          {kid.term.name}
                          {kidCount > 0 && (
                            <span style={{ color: "#ffffff22", marginLeft: 3 }}>{kidCount}</span>
                          )}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Log scale note */}
      <div style={{ marginTop: 20, fontFamily: mono, fontSize: 8, color: "#ffffff22", fontStyle: "italic" }}>
        Bar widths use a logarithmic scale — B01 Eukaryota would otherwise dwarf all others.
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SKETCH 2 — TAXONOMY TREE
// Two-panel: left = expandable indented tree (B → branches → children),
// right = detail panel for selected node.
// ═══════════════════════════════════════════════════════════════════════════
function TaxonomyTree({ data }) {
  const { branches, childrenMap } = data;

  // Default selection: B01 Eukaryota
  const defaultNode = branches.find(b => b.treeNum === "B01") || branches[0];
  const [selected, setSelected] = useState(defaultNode
    ? { term: defaultNode.term, treeNum: defaultNode.treeNum, color: defaultNode.color }
    : null
  );
  // Track which tree nodes are open (expanded)
  const [openNodes, setOpenNodes] = useState(() => new Set(["B", "B01"]));

  function toggleNode(treeNum) {
    setOpenNodes(prev => {
      const next = new Set(prev);
      if (next.has(treeNum)) next.delete(treeNum);
      else next.add(treeNum);
      return next;
    });
  }

  function selectNode(term, treeNum, color) {
    setSelected({ term, treeNum, color });
  }

  // Recursively render the tree, depth-limited to 3 levels below B
  function renderTree(key, depth) {
    const kids = (childrenMap.get(key) || []).slice().sort((a, b) =>
      a.treeNum.localeCompare(b.treeNum, undefined, { numeric: true })
    );
    if (kids.length === 0) return null;

    return kids.map(({ term, treeNum }) => {
      const grandkids = childrenMap.get(treeNum) || [];
      const hasKids = grandkids.length > 0;
      const isOpen = openNodes.has(treeNum);
      const isSel = selected?.treeNum === treeNum;
      const color = kingdomColor(treeNum.slice(0, 3));
      const indent = depth * 16;

      return (
        <div key={treeNum}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 8px",
              paddingLeft: 8 + indent,
              background: isSel ? color + "18" : "transparent",
              borderLeft: isSel ? `2px solid ${color}` : "2px solid transparent",
              cursor: "pointer",
              borderRadius: "0 4px 4px 0",
              transition: "background 0.12s",
            }}
            onClick={() => {
              selectNode(term, treeNum, color);
              if (hasKids && depth < 3) toggleNode(treeNum);
            }}
          >
            {/* Expand chevron */}
            <span style={{ fontFamily: mono, fontSize: 7, color: hasKids ? color + "88" : "transparent", width: 10, flexShrink: 0 }}>
              {hasKids ? (isOpen ? "▼" : "▶") : "·"}
            </span>
            <span style={{ fontFamily: mono, fontSize: 8.5, color: isSel ? color : "#ffffffbb", flex: 1 }}>
              {term.name}
            </span>
            <span style={{ fontFamily: mono, fontSize: 7.5, color: "#ffffff33" }}>
              {treeNum}
            </span>
            {hasKids && (
              <span style={{ fontFamily: mono, fontSize: 7, color: "#ffffff22", marginLeft: 4 }}>
                {grandkids.length}
              </span>
            )}
          </div>
          {/* Recurse if open and depth allows */}
          {isOpen && hasKids && depth < 3 && renderTree(treeNum, depth + 1)}
        </div>
      );
    });
  }

  // Detail panel
  const selColor = selected?.color || TREE_COLOR;
  const selKids = selected
    ? (childrenMap.get(selected.treeNum) || []).slice().sort((a, b) =>
        a.treeNum.localeCompare(b.treeNum, undefined, { numeric: true })
      )
    : [];

  // BFS count for selected
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

  const selTotal = selected ? countAll(selected.treeNum) : 0;

  return (
    <div style={{ background: BG, height: "100%", display: "flex", overflow: "hidden" }}>
      {/* Left: tree panel */}
      <div style={{ width: 300, flexShrink: 0, borderRight: "1px solid #ffffff10", overflowY: "auto", padding: "16px 0" }}>
        <div style={{ fontFamily: mono, fontSize: 8, color: "#ffffff22", letterSpacing: 2, padding: "0 14px 12px" }}>
          TREE B — ORGANISMS
        </div>

        {/* Root B row */}
        <div
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "5px 8px",
            borderLeft: "2px solid transparent",
            cursor: "pointer",
          }}
          onClick={() => toggleNode("B")}
        >
          <span style={{ fontFamily: mono, fontSize: 8, color: TREE_COLOR + "88", width: 10 }}>
            {openNodes.has("B") ? "▼" : "▶"}
          </span>
          <span style={{ fontFamily: mono, fontSize: 10, fontWeight: 700, color: TREE_COLOR }}>B</span>
          <span style={{ fontFamily: mono, fontSize: 8.5, color: "#ffffffcc" }}>Organisms</span>
        </div>

        {openNodes.has("B") && renderTree("B", 1)}
      </div>

      {/* Right: detail panel */}
      <div style={{ flex: 1, overflowY: "auto", padding: "28px 32px" }}>
        {selected ? (
          <>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 8 }}>
              <span style={{ fontFamily: mono, fontSize: 9, color: selColor + "aa", letterSpacing: 1 }}>
                {selected.treeNum}
              </span>
              <span style={{ fontFamily: mono, fontSize: 22, fontWeight: 700, color: selColor }}>
                {selected.term.name}
              </span>
            </div>

            <div style={{ display: "flex", gap: 20, marginBottom: 16 }}>
              <div style={{ fontFamily: mono, fontSize: 9, color: "#ffffff44" }}>
                <span style={{ color: selColor + "99" }}>{selKids.length}</span> direct children
              </div>
              <div style={{ fontFamily: mono, fontSize: 9, color: "#ffffff44" }}>
                <span style={{ color: selColor + "99" }}>{selTotal.toLocaleString()}</span> total descendants
              </div>
            </div>

            {selected.term.scopeNote && (
              <div style={{
                fontFamily: mono, fontSize: 9, color: "#ffffff55",
                lineHeight: 1.7, marginBottom: 20,
                borderLeft: `2px solid ${selColor}33`,
                paddingLeft: 12,
                maxWidth: 560,
              }}>
                {selected.term.scopeNote}
              </div>
            )}

            {selKids.length > 0 && (
              <>
                <div style={{ fontFamily: mono, fontSize: 8, color: "#ffffff22", letterSpacing: 2, marginBottom: 10 }}>
                  DIRECT CHILDREN ({selKids.length})
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {selKids.map(kid => {
                    const kidKids = (childrenMap.get(kid.treeNum) || []).length;
                    return (
                      <span
                        key={kid.treeNum}
                        onClick={() => selectNode(kid.term, kid.treeNum, kingdomColor(kid.treeNum.slice(0, 3)))}
                        style={{
                          fontFamily: mono, fontSize: 8.5,
                          background: selColor + "14",
                          border: `1px solid ${selColor}30`,
                          borderRadius: 4,
                          padding: "4px 8px",
                          color: selColor + "bb",
                          cursor: "pointer",
                          transition: "background 0.1s",
                        }}
                      >
                        {kid.term.name}
                        {kidKids > 0 && (
                          <span style={{ color: "#ffffff2a", marginLeft: 5 }}>+{kidKids}</span>
                        )}
                      </span>
                    );
                  })}
                </div>
              </>
            )}
          </>
        ) : (
          <div style={{ fontFamily: mono, fontSize: 9, color: "#ffffff22" }}>
            Select a node in the tree.
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SKETCH 3 — SIZE VS DEPTH SCATTER
// SVG scatter: X = direct children, Y = total descendants (log scale).
// Plots B01–B04 + children of B01. Bubble radius ∝ sqrt(totalCount).
// ═══════════════════════════════════════════════════════════════════════════
function SizeDepthScatter({ data }) {
  const { branches, childrenMap } = data;
  const [hovered, setHovered] = useState(null);

  // BFS count
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

  // Build the data points
  // Primary: B01–B04
  const primary = branches.map(b => ({
    name: b.term.name,
    treeNum: b.treeNum,
    directCount: b.directCount,
    totalCount: b.totalCount,
    color: b.color,
    isPrimary: true,
    kingdom: b.treeNum,
  }));

  // Secondary: children of B01 (Eukaryota), smaller bubbles
  const b01 = branches.find(b => b.treeNum === "B01");
  const b01Kids = b01
    ? (childrenMap.get("B01") || []).map(({ term, treeNum }) => ({
        name: term.name,
        treeNum,
        directCount: (childrenMap.get(treeNum) || []).length,
        totalCount: countAll(treeNum),
        color: "#A8D8C8",
        isPrimary: false,
        kingdom: "B01",
      }))
    : [];

  const points = [...primary, ...b01Kids];

  // SVG layout
  const W = 620, H = 420;
  const PAD = { top: 30, right: 30, bottom: 52, left: 72 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  // X axis: directCount  (linear)
  const maxX = Math.max(...points.map(p => p.directCount), 10);
  function xScale(v) { return (v / maxX) * plotW; }

  // Y axis: totalCount (log scale)
  const minLog = 0; // log10(1) = 0
  const maxLogY = Math.log10(Math.max(...points.map(p => p.totalCount), 10) + 1);
  function yScale(v) {
    const logV = Math.log10(Math.max(v, 1));
    return plotH - (logV / maxLogY) * plotH;
  }

  // Radius: sqrt scale, capped
  const maxSqrt = Math.sqrt(Math.max(...points.map(p => p.totalCount), 1));
  function rScale(v, isPrimary) {
    const base = (Math.sqrt(v) / maxSqrt) * 32;
    return isPrimary ? Math.max(base, 5) : Math.max(base * 0.6, 3);
  }

  // Y axis ticks: powers of 10
  const yTicks = [1, 10, 100, 1000, 10000].filter(v => Math.log10(v) <= maxLogY + 0.1);

  // X axis ticks
  const xStep = maxX <= 20 ? 5 : maxX <= 60 ? 10 : 20;
  const xTicks = [];
  for (let v = 0; v <= maxX; v += xStep) xTicks.push(v);

  return (
    <div style={{ background: BG, height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", overflowY: "auto", padding: "24px 0 16px" }}>
      <div style={{ fontFamily: mono, fontSize: 9, color: "#ffffff33", letterSpacing: 2, marginBottom: 4 }}>
        SIZE vs. DEPTH — ORGANISMS TREE B
      </div>
      <div style={{ fontFamily: mono, fontSize: 8, color: "#ffffff1a", marginBottom: 20 }}>
        X = direct children · Y = total descendants (log) · radius ∝ √total
      </div>

      <svg width={W} height={H} style={{ overflow: "visible" }}>
        {/* Plot area background */}
        <rect
          x={PAD.left} y={PAD.top}
          width={plotW} height={plotH}
          fill="#ffffff04" rx={4}
        />

        {/* Y gridlines + ticks */}
        {yTicks.map(v => {
          const y = PAD.top + yScale(v);
          return (
            <g key={v}>
              <line
                x1={PAD.left} x2={PAD.left + plotW}
                y1={y} y2={y}
                stroke="#ffffff08" strokeWidth={1}
              />
              <text
                x={PAD.left - 6} y={y + 3}
                fontFamily={mono} fontSize={8}
                fill="#ffffff33" textAnchor="end"
              >
                {v >= 1000 ? `${v / 1000}k` : v}
              </text>
            </g>
          );
        })}

        {/* X gridlines + ticks */}
        {xTicks.map(v => {
          const x = PAD.left + xScale(v);
          return (
            <g key={v}>
              <line
                x1={x} x2={x}
                y1={PAD.top} y2={PAD.top + plotH}
                stroke="#ffffff08" strokeWidth={1}
              />
              <text
                x={x} y={PAD.top + plotH + 14}
                fontFamily={mono} fontSize={8}
                fill="#ffffff33" textAnchor="middle"
              >
                {v}
              </text>
            </g>
          );
        })}

        {/* Axis labels */}
        <text
          x={PAD.left + plotW / 2} y={H - 6}
          fontFamily={mono} fontSize={8.5}
          fill="#ffffff44" textAnchor="middle"
        >
          Direct Children
        </text>
        <text
          x={14} y={PAD.top + plotH / 2}
          fontFamily={mono} fontSize={8.5}
          fill="#ffffff44" textAnchor="middle"
          transform={`rotate(-90, 14, ${PAD.top + plotH / 2})`}
        >
          Total Descendants (log)
        </text>

        {/* Axes */}
        <line
          x1={PAD.left} x2={PAD.left + plotW}
          y1={PAD.top + plotH} y2={PAD.top + plotH}
          stroke="#ffffff22" strokeWidth={1}
        />
        <line
          x1={PAD.left} x2={PAD.left}
          y1={PAD.top} y2={PAD.top + plotH}
          stroke="#ffffff22" strokeWidth={1}
        />

        {/* Secondary bubbles (B01 children) — drawn first so primaries are on top */}
        {points
          .filter(p => !p.isPrimary)
          .map(p => {
            const cx = PAD.left + xScale(p.directCount);
            const cy = PAD.top + yScale(p.totalCount);
            const r = rScale(p.totalCount, false);
            const isHov = hovered === p.treeNum;
            return (
              <g key={p.treeNum}>
                <circle
                  cx={cx} cy={cy} r={r}
                  fill={p.color + (isHov ? "88" : "40")}
                  stroke={p.color + (isHov ? "cc" : "55")}
                  strokeWidth={isHov ? 1.5 : 0.8}
                  style={{ cursor: "pointer", transition: "all 0.12s" }}
                  onMouseEnter={() => setHovered(p.treeNum)}
                  onMouseLeave={() => setHovered(null)}
                />
              </g>
            );
          })}

        {/* Primary bubbles (B01–B04) */}
        {points
          .filter(p => p.isPrimary)
          .map(p => {
            const cx = PAD.left + xScale(p.directCount);
            const cy = PAD.top + yScale(p.totalCount);
            const r = rScale(p.totalCount, true);
            const isHov = hovered === p.treeNum;
            return (
              <g key={p.treeNum}>
                <circle
                  cx={cx} cy={cy} r={r}
                  fill={p.color + (isHov ? "cc" : "66")}
                  stroke={p.color}
                  strokeWidth={isHov ? 2 : 1.2}
                  style={{ cursor: "pointer", transition: "all 0.12s" }}
                  onMouseEnter={() => setHovered(p.treeNum)}
                  onMouseLeave={() => setHovered(null)}
                />
                {/* Label */}
                <text
                  x={cx} y={cy - r - 5}
                  fontFamily={mono} fontSize={9}
                  fill={p.color}
                  textAnchor="middle"
                  style={{ pointerEvents: "none" }}
                >
                  {p.treeNum}
                </text>
              </g>
            );
          })}

        {/* Hover tooltip */}
        {hovered && (() => {
          const p = points.find(pt => pt.treeNum === hovered);
          if (!p) return null;
          const cx = PAD.left + xScale(p.directCount);
          const cy = PAD.top + yScale(p.totalCount);
          const tx = cx + 12;
          const ty = cy - 10;
          const lines = [
            p.name,
            `${p.treeNum}`,
            `direct: ${p.directCount}`,
            `total: ${p.totalCount.toLocaleString()}`,
          ];
          const boxW = 150, boxH = lines.length * 13 + 10;
          return (
            <g style={{ pointerEvents: "none" }}>
              <rect
                x={tx - 4} y={ty - 14}
                width={boxW} height={boxH}
                fill="#0f1117ee" stroke={p.color + "66"}
                strokeWidth={1} rx={4}
              />
              {lines.map((line, i) => (
                <text
                  key={i}
                  x={tx + 4} y={ty + i * 13}
                  fontFamily={mono}
                  fontSize={i === 0 ? 9 : 8}
                  fill={i === 0 ? p.color : "#ffffff88"}
                >
                  {line}
                </text>
              ))}
            </g>
          );
        })()}
      </svg>

      {/* Legend */}
      <div style={{ display: "flex", gap: 20, marginTop: 12, flexWrap: "wrap", justifyContent: "center" }}>
        {KINGDOM_CFG.map(k => (
          <div key={k.treeNum} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: k.color + "99", border: `1.5px solid ${k.color}` }} />
            <span style={{ fontFamily: mono, fontSize: 8, color: "#ffffff55" }}>{k.treeNum} {k.label}</span>
          </div>
        ))}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#A8D8C840", border: "1px solid #A8D8C855" }} />
          <span style={{ fontFamily: mono, fontSize: 8, color: "#ffffff33" }}>B01 sub-branches</span>
        </div>
      </div>
    </div>
  );
}

// ── APP ────────────────────────────────────────────────────────────────────
const VIEWS = [
  { id: "kingdoms", label: "1. Kingdoms" },
  { id: "tree",     label: "2. Taxonomy Tree" },
  { id: "scatter",  label: "3. Size vs Depth" },
];

export default function MeshBConcepts() {
  return (
    <OverviewConceptShell
      treeLetter="B"
      navLabel="B · ORGANISMS"
      eyebrow="ORGANISMS — BIOLOGICAL TAXONOMY FROM DOMAINS TO SPECIES"
      treeColor={TREE_COLOR}
      branchColors={{
        B01: "#A8D8C8",
        B02: "#E8D8A8",
        B03: "#E8A8A8",
        B04: "#C8C8E8",
      }}
      defaultCluster="B01"
    />
  );
}
