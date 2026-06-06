import { useState, useEffect } from "react";
import {
  MeshBottomQueryLayout,
  usePersistentMeshQueries,
} from "./mesh_query_ui.jsx";
import { MeshPageHeader } from "./mesh_page_header.jsx";

const mono = "'IBM Plex Mono', monospace";
const BG = "#0f1117";
const TREE_COLOR = "#C8C8A8";
const ROOT_DETAIL = {
  term: {
    name: "Publications",
    ui: "V",
    note: "Publication terms describe publication components, publication formats, study characteristics, and types of research support.",
  },
  treeNum: "V",
};

// ── BRANCH CONFIG ─────────────────────────────────────────────────────────
const BRANCH_CFG = {
  "V01": { label: "Publication Components", color: "#C8C8A8", icon: "◫" },
  "V02": { label: "Publication Formats",    color: "#D4C890", icon: "▣" },
  "V03": { label: "Study Characteristics",  color: "#B8D4A8", icon: "⊞" },
  "V04": { label: "Support of Research",    color: "#C8B890", icon: "◈" },
};

function branchCfg(treeNum) {
  const key = treeNum.split(".")[0];
  return BRANCH_CFG[key] ?? { label: key, color: TREE_COLOR, icon: "·" };
}

// ── DATA HOOK ─────────────────────────────────────────────────────────────
function useVData() {
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

      const raw = (childrenMap.get("V") || []).sort((a, b) =>
        a.treeNum.localeCompare(b.treeNum, undefined, { numeric: true })
      );

      const branches = raw.map(({ term, treeNum }) => ({
        term, treeNum,
        directCount: childrenMap.get(treeNum)?.length ?? 0,
        totalCount: countAll(treeNum),
        cfg: BRANCH_CFG[treeNum] ?? { label: treeNum, color: TREE_COLOR, icon: "·" },
      }));

      // Collect all V terms for flat list
      const allTerms = [];
      function collectAll(treeNum, depth) {
        const kids = (childrenMap.get(treeNum) || []).sort((a, b) =>
          a.treeNum.localeCompare(b.treeNum, undefined, { numeric: true })
        );
        for (const { term, treeNum: ctn } of kids) {
          allTerms.push({ term, treeNum: ctn, depth });
          collectAll(ctn, depth + 1);
        }
      }
      collectAll("V", 0);

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

// ═══════════════════════════════════════════════════════════════════════════
// ALL TERMS — filterable chip list grouped by branch
// ═══════════════════════════════════════════════════════════════════════════
function AllTermsV({ data }) {
  const { allTerms, branches } = data;
  const [filter, setFilter] = useState("");
  const [hovered, setHovered] = useState(null);
  const [selected, setSelected] = useState("V");
  const queryBuilder = usePersistentMeshQueries();

  const filtered = allTerms.filter(t =>
    !filter || t.term.name.toLowerCase().includes(filter.toLowerCase())
  );

  // Group by top-level branch
  const groups = {};
  for (const item of filtered) {
    const topKey = item.treeNum.split(".")[0];
    if (!groups[topKey]) groups[topKey] = [];
    groups[topKey].push(item);
  }

  const selectedItem = selected && selected !== "V" ? allTerms.find(t => t.treeNum === selected) : null;
  const hoveredItem = hovered ? allTerms.find(t => t.treeNum === hovered) : null;
  const detailItem = selectedItem || hoveredItem || ROOT_DETAIL;
  const detailColor = detailItem ? branchCfg(detailItem.treeNum).color : TREE_COLOR;
  const selectedDetail = detailItem ? {
    id: detailItem.term.name,
    branch: "v",
    color: detailColor,
    treeNum: detailItem.treeNum,
    ui: detailItem.term.ui,
    note: detailItem.term.note || detailItem.term.scopeNote,
  } : null;

  return (
    <MeshBottomQueryLayout selected={selectedDetail} query={queryBuilder} contentStyle={{ display: "flex", flexDirection: "column", padding: "24px 24px", boxSizing: "border-box", gap: 16 }}>
      <div style={{ margin: "-24px -24px 2px" }}>
        <MeshPageHeader
          letter="V"
          title="Publications"
          description="Publication terms describe components, formats, study characteristics, and research support."
          color={TREE_COLOR}
          onClick={() => setSelected("V")}
          active={selected === "V" && !hovered}
        />
      </div>
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
          {filtered.length} terms
        </div>
      </div>

      <div style={{
        minHeight: 86,
        padding: "10px 14px",
        background: "#ffffff0a",
        border: `1px solid ${detailItem ? branchCfg(detailItem.treeNum).color + "44" : "#ffffff10"}`,
        borderRadius: 8,
        fontFamily: mono,
        fontSize: 9,
        color: "#ffffffbb",
        flexShrink: 0,
      }}>
        {detailItem ? (
          <>
            <div style={{ color: branchCfg(detailItem.treeNum).color, fontSize: 10, marginBottom: 4 }}>
              {detailItem.term.name}
              {selectedItem && <span style={{ color: "#ffffff33", marginLeft: 8, fontSize: 8 }}>selected</span>}
            </div>
            <div style={{ color: "#ffffff44", marginBottom: detailItem.term.note ? 6 : 0 }}>{detailItem.treeNum}</div>
            {detailItem.term.note && (
              <div style={{ color: "#ffffff55", lineHeight: 1.6 }}>
                {detailItem.term.note.slice(0, 200)}{detailItem.term.note.length > 200 ? "…" : ""}
              </div>
            )}
          </>
        ) : (
          <div style={{ color: "#ffffff2d", height: "100%", display: "flex", alignItems: "center" }}>
            hover a term to inspect
          </div>
        )}
      </div>

      {/* Groups */}
      {Object.entries(groups).sort().map(([topKey, items]) => {
        const cfg = BRANCH_CFG[topKey] ?? { label: topKey, color: TREE_COLOR };
        return (
          <div key={topKey}>
            <div style={{
              fontFamily: mono, fontSize: 8, color: cfg.color + "99",
              letterSpacing: 1.5, marginBottom: 8,
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <span>{topKey}</span>
              <span style={{ color: "#ffffff22" }}>·</span>
              <span style={{ color: "#ffffff33" }}>{cfg.label}</span>
              <span style={{ color: "#ffffff22" }}>({items.length})</span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
              {items.map(({ term, treeNum, depth }) => {
                const isHov = hovered === treeNum;
                const isSelected = selected === treeNum;
                const collected = queryBuilder.allIds.has(term.name);
                return (
                  <button
                    key={treeNum}
                    onMouseEnter={() => setHovered(treeNum)}
                    onMouseLeave={() => setHovered(null)}
                    onClick={() => setSelected(isSelected ? null : treeNum)}
                    style={{
                      padding: depth === 0 ? "4px 11px" : "2px 8px",
                      background: isSelected ? cfg.color + "30" : isHov ? cfg.color + "28" : collected ? cfg.color + "1d" : cfg.color + "10",
                      border: `1px solid ${isSelected ? cfg.color + "cc" : isHov ? cfg.color + "88" : collected ? cfg.color + "66" : cfg.color + "33"}`,
                      borderRadius: 16,
                      fontFamily: mono,
                      fontSize: depth === 0 ? 9.5 : 8.5,
                      color: isSelected ? "#fff" : isHov || collected ? cfg.color : cfg.color + "bb",
                      cursor: "pointer",
                      transition: "all 0.1s",
                      fontWeight: depth === 0 ? 600 : 400,
                      outline: "none",
                    }}
                  >
                    {term.name}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {filtered.length === 0 && (
        <div style={{ fontFamily: mono, fontSize: 10, color: "#ffffff22", textAlign: "center", marginTop: 40 }}>
          no terms match "{filter}"
        </div>
      )}
    </MeshBottomQueryLayout>
  );
}

export default function MeshVConcepts() {
  const { data, loading } = useVData();

  return (
    <div style={{ width: "100%", height: "100%", background: BG }}>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&display=swap" rel="stylesheet" />
      {loading ? <Loading /> : <AllTermsV data={data} />}
    </div>
  );
}
