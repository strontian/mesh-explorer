import { useState, useEffect } from "react";

const mono = "'IBM Plex Mono', monospace";
const BG = "#0f1117";
const TREE_COLOR = "#C8C8A8";

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

// ── DOCUMENT ICON ─────────────────────────────────────────────────────────
function DocIcon({ color }) {
  return (
    <svg width={20} height={24} viewBox="0 0 20 24" fill="none">
      <rect x={1} y={1} width={14} height={22} rx={2} fill={color + "18"} stroke={color + "66"} strokeWidth={1}/>
      <path d="M14 1 L19 6 L14 6 Z" fill={color + "33"} stroke={color + "55"} strokeWidth={0.8}/>
      <line x1={4} y1={10} x2={12} y2={10} stroke={color + "55"} strokeWidth={0.8}/>
      <line x1={4} y1={13} x2={12} y2={13} stroke={color + "44"} strokeWidth={0.8}/>
      <line x1={4} y1={16} x2={9} y2={16} stroke={color + "33"} strokeWidth={0.8}/>
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SKETCH 1 — PUBLICATION TYPES (Format + Study Design columns)
// ═══════════════════════════════════════════════════════════════════════════
function PubTypes({ data }) {
  const { childrenMap, branches } = data;
  const [selected, setSelected] = useState(null);

  // Get V02 (Publication Formats) and V03 (Study Characteristics)
  const v02Branch = branches.find(b => b.treeNum === "V02");
  const v03Branch = branches.find(b => b.treeNum === "V03");

  function getChildren(treeNum) {
    return (childrenMap.get(treeNum) || []).sort((a, b) =>
      a.treeNum.localeCompare(b.treeNum, undefined, { numeric: true })
    );
  }

  const formatTerms = v02Branch ? getChildren("V02") : [];
  const studyTerms = v03Branch ? getChildren("V03") : [];

  const selInfo = selected
    ? { ...selected, children: getChildren(selected.treeNum) }
    : null;

  function TermCard({ term, treeNum, colColor }) {
    const isSel = selected?.treeNum === treeNum;
    const childCount = childrenMap.get(treeNum)?.length ?? 0;
    return (
      <div
        onClick={() => setSelected(isSel ? null : { term, treeNum })}
        style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "8px 12px",
          background: isSel ? colColor + "18" : "#ffffff06",
          border: `1px solid ${isSel ? colColor + "77" : "#ffffff0e"}`,
          borderRadius: 7, cursor: "pointer", transition: "all 0.12s",
        }}
      >
        <DocIcon color={colColor} />
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: mono, fontSize: 9.5, color: isSel ? colColor : colColor + "bb", lineHeight: 1.3 }}>
            {term.name}
          </div>
          <div style={{ fontFamily: mono, fontSize: 7, color: "#ffffff22", marginTop: 2 }}>
            {treeNum}{childCount > 0 ? ` · ${childCount} subtypes` : ""}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", overflowY: "auto" }}>
      <div style={{ padding: "20px 24px 0", fontFamily: mono, fontSize: 9, color: "#ffffff22", letterSpacing: 2 }}>
        V · PUBLICATION CHARACTERISTICS — BIBLIOGRAPHIC CATEGORIES
      </div>

      {/* Two columns */}
      <div style={{ display: "flex", gap: 20, padding: 24, flex: 1, minHeight: 0 }}>
        {/* FORMAT column */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{
            fontFamily: mono, fontSize: 8, letterSpacing: 2,
            color: BRANCH_CFG["V02"].color, paddingBottom: 8,
            borderBottom: `1px solid ${BRANCH_CFG["V02"].color}33`,
          }}>
            ▣ FORMAT &amp; TYPE (V02)
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, overflowY: "auto" }}>
            {formatTerms.map(({ term, treeNum }) => (
              <TermCard key={treeNum} term={term} treeNum={treeNum} colColor={BRANCH_CFG["V02"].color} />
            ))}
            {formatTerms.length === 0 && (
              <div style={{ fontFamily: mono, fontSize: 9, color: "#ffffff22", textAlign: "center", paddingTop: 20 }}>
                V02 not found in data
              </div>
            )}
          </div>
        </div>

        {/* Divider */}
        <div style={{ width: 1, background: "#ffffff0a", flexShrink: 0 }} />

        {/* STUDY DESIGN column */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{
            fontFamily: mono, fontSize: 8, letterSpacing: 2,
            color: BRANCH_CFG["V03"].color, paddingBottom: 8,
            borderBottom: `1px solid ${BRANCH_CFG["V03"].color}33`,
          }}>
            ⊞ STUDY DESIGN (V03)
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, overflowY: "auto" }}>
            {studyTerms.map(({ term, treeNum }) => (
              <TermCard key={treeNum} term={term} treeNum={treeNum} colColor={BRANCH_CFG["V03"].color} />
            ))}
            {studyTerms.length === 0 && (
              <div style={{ fontFamily: mono, fontSize: 9, color: "#ffffff22", textAlign: "center", paddingTop: 20 }}>
                V03 not found in data
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detail strip */}
      {selInfo && (
        <div style={{
          flexShrink: 0,
          margin: "0 24px 24px",
          padding: 16,
          background: "#ffffff08",
          border: `1px solid ${TREE_COLOR}33`,
          borderRadius: 8,
        }}>
          <div style={{ fontFamily: mono, fontSize: 11, color: TREE_COLOR, fontWeight: 600, marginBottom: 6 }}>
            {selInfo.term.name}
          </div>
          {selInfo.term.note && (
            <div style={{ fontFamily: mono, fontSize: 8.5, color: "#ffffff44", lineHeight: 1.7, marginBottom: 10 }}>
              {selInfo.term.note}
            </div>
          )}
          {selInfo.children.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {selInfo.children.map(({ term: ct, treeNum: ctn }) => (
                <div key={ctn} style={{
                  padding: "3px 8px",
                  background: TREE_COLOR + "14", border: `1px solid ${TREE_COLOR}33`,
                  borderRadius: 12, fontFamily: mono, fontSize: 8, color: TREE_COLOR + "cc",
                }}>
                  {ct.name}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SKETCH 2 — ALL TERMS (filterable chip list grouped by branch)
// ═══════════════════════════════════════════════════════════════════════════
function AllTermsV({ data }) {
  const { allTerms, branches } = data;
  const [filter, setFilter] = useState("");
  const [hovered, setHovered] = useState(null);

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

  const hovItem = hovered ? allTerms.find(t => t.treeNum === hovered) : null;

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
          {filtered.length} terms
        </div>
      </div>

      {/* Branch legend */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {Object.entries(BRANCH_CFG).map(([key, cfg]) => (
          <div key={key} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: cfg.color }} />
            <span style={{ fontFamily: mono, fontSize: 8, color: "#ffffff44" }}>{key}</span>
            <span style={{ fontFamily: mono, fontSize: 7.5, color: "#ffffff22" }}>{cfg.label}</span>
          </div>
        ))}
      </div>

      {hovItem && (
        <div style={{
          padding: "10px 14px", background: "#ffffff0a",
          border: `1px solid ${branchCfg(hovItem.treeNum).color}44`,
          borderRadius: 8, fontFamily: mono, fontSize: 9, color: "#ffffffbb",
        }}>
          <div style={{ color: branchCfg(hovItem.treeNum).color, fontSize: 10, marginBottom: 4 }}>{hovItem.term.name}</div>
          <div style={{ color: "#ffffff44", marginBottom: hovItem.term.note ? 6 : 0 }}>{hovItem.treeNum}</div>
          {hovItem.term.note && (
            <div style={{ color: "#ffffff55", lineHeight: 1.6 }}>
              {hovItem.term.note.slice(0, 200)}{hovItem.term.note.length > 200 ? "…" : ""}
            </div>
          )}
        </div>
      )}

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
                return (
                  <div
                    key={treeNum}
                    onMouseEnter={() => setHovered(treeNum)}
                    onMouseLeave={() => setHovered(null)}
                    style={{
                      padding: depth === 0 ? "4px 11px" : "2px 8px",
                      background: isHov ? cfg.color + "28" : cfg.color + "10",
                      border: `1px solid ${cfg.color}${isHov ? "88" : "33"}`,
                      borderRadius: 16,
                      fontFamily: mono,
                      fontSize: depth === 0 ? 9.5 : 8.5,
                      color: isHov ? cfg.color : cfg.color + "bb",
                      cursor: "default",
                      transition: "all 0.1s",
                      fontWeight: depth === 0 ? 600 : 400,
                    }}
                  >
                    {term.name}
                  </div>
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
    </div>
  );
}

// ── APP ────────────────────────────────────────────────────────────────────
const VIEWS = [
  { id: "pubtypes", label: "1. Publication Types" },
  { id: "allterms", label: "2. All Terms" },
];

export default function MeshVConcepts() {
  const [active, setActive] = useState("pubtypes");
  const { data, loading } = useVData();

  const views = { pubtypes: PubTypes, allterms: AllTermsV };
  const Active = views[active];

  return (
    <div style={{ width: "100%", height: "100vh", display: "flex", flexDirection: "column", background: BG }}>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&display=swap" rel="stylesheet" />

      <nav style={{ display: "flex", alignItems: "center", gap: 0, borderBottom: "2px solid #ffffff12", flexShrink: 0, background: "#0a0c10", overflowX: "auto" }}>
        <div style={{ padding: "12px 20px", fontFamily: mono, fontSize: 9, color: "#ffffff33", letterSpacing: 2, flexShrink: 0 }}>
          V CONCEPTS
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
