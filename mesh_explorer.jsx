import { useState, useRef, useEffect } from "react";

// ── MeSH DATA ──────────────────────────────────────────────────────────────
// Focused subset: trees most relevant to dust mite / allergen research
const TREES = {
  B: {
    label: "Organisms",
    color: "#2D6A4F",
    light: "#D8F3DC",
    children: {
      "B·Invertebrates": {
        label: "Invertebrates", depth: 2,
        children: {
          "B·Arthropods": {
            label: "Arthropods", depth: 3,
            children: {
              "B·Arachnida": {
                label: "Arachnida", depth: 4,
                children: {
                  "B·Mites": {
                    label: "Mites", depth: 5,
                    children: {
                      "B·Pyroglyphidae": {
                        label: "Pyroglyphidae", depth: 6, leaf: true,
                        note: "House dust mites (Dermatophagoides, Euroglyphus). Added 2003."
                      },
                      "B·Sarcoptiformes": { label: "Sarcoptiformes", depth: 6, leaf: true, note: "Scabies mites." }
                    }
                  },
                  "B·Ticks": { label: "Ticks", depth: 5, leaf: true, note: "Ixodida. Lyme disease vectors." },
                  "B·Spiders": { label: "Spiders", depth: 5, leaf: true, note: "Araneae." }
                }
              },
              "B·Insects": {
                label: "Insects", depth: 3,
                children: {
                  "B·Cockroaches": { label: "Cockroaches", depth: 4, leaf: true, note: "Major indoor allergen source." },
                  "B·Moths": { label: "Moths", depth: 4, leaf: true, note: "Lepidoptera." }
                }
              }
            }
          }
        }
      }
    }
  },
  C: {
    label: "Diseases",
    color: "#9B2226",
    light: "#FFE8E8",
    children: {
      "C·Respiratory": {
        label: "Respiratory Tract Diseases", depth: 2,
        children: {
          "C·Asthma": { label: "Asthma", depth: 3, leaf: true, note: "Chronic inflammatory airway disease. C·C08.127.108." },
          "C·Rhinitis": {
            label: "Rhinitis", depth: 3,
            children: {
              "C·AllergicRhinitis": { label: "Rhinitis, Allergic", depth: 4, leaf: true, note: "Hay fever. Includes perennial and seasonal." }
            }
          },
          "C·COPD": { label: "Pulmonary Disease, COPD", depth: 3, leaf: true, note: "Chronic obstructive — sometimes confused with asthma." }
        }
      },
      "C·Immune": {
        label: "Immune System Diseases", depth: 2,
        children: {
          "C·Hypersensitivity": {
            label: "Hypersensitivity", depth: 3,
            children: {
              "C·HypersensitivityImmediate": { label: "Hypersensitivity, Immediate", depth: 4, leaf: true, note: "IgE-mediated. Type I allergy." },
              "C·AtopicDermatitis": { label: "Dermatitis, Atopic", depth: 4, leaf: true, note: "Eczema. Strongly associated with dust mite sensitivity." }
            }
          }
        }
      }
    }
  },
  D: {
    label: "Chemicals & Drugs",
    color: "#5E4B8B",
    light: "#EDE9F8",
    children: {
      "D·Allergens": { label: "Allergens", depth: 2, leaf: true, note: "Broad class. Antigens causing hypersensitivity." },
      "D·Antigens": {
        label: "Antigens", depth: 2,
        children: {
          "D·DermatophagoidesAntigen": { label: "Antigens, Dermatophagoides", depth: 3, leaf: true, note: "Specific mite allergen proteins. Der p 1, Der f 1 etc." }
        }
      },
      "D·Acaricides": { label: "Acaricides", depth: 2, leaf: true, note: "Chemicals that kill mites. Used in bedding treatment studies." },
      "D·IgE": { label: "Immunoglobulin E", depth: 2, leaf: true, note: "IgE. The antibody driving allergic responses." }
    }
  },
  E: {
    label: "Techniques & Study Design",
    color: "#1A5276",
    light: "#D6EAF8",
    children: {
      "E·StudyDesign": {
        label: "Study Design", depth: 2,
        children: {
          "E·RCT": { label: "Randomized Controlled Trial", depth: 3, leaf: true, note: "Gold standard interventional design." },
          "E·CohortStudies": { label: "Cohort Studies", depth: 3, leaf: true, note: "Longitudinal observational." },
          "E·CaseControl": { label: "Case-Control Studies", depth: 3, leaf: true, note: "Retrospective comparison." },
          "E·CrossSectional": { label: "Cross-Sectional Studies", depth: 3, leaf: true, note: "Snapshot / prevalence." },
          "E·MetaAnalysis": { label: "Meta-Analysis", depth: 3, leaf: true, note: "Pooling results across studies." },
          "E·SystematicReview": { label: "Systematic Review", depth: 3, leaf: true, note: "Cochrane-style evidence synthesis." }
        }
      },
      "E·Diagnostic": {
        label: "Diagnostic Techniques", depth: 2,
        children: {
          "E·SkinTest": { label: "Skin Test", depth: 3, leaf: true, note: "Prick test for allergen sensitivity." },
          "E·Spirometry": { label: "Spirometry", depth: 3, leaf: true, note: "Measures lung function. FEV1, FVC." },
          "E·Immunoassay": { label: "Immunoassay", depth: 3, leaf: true, note: "ELISA etc. Measures allergen or antibody levels." }
        }
      },
      "E·Therapeutic": {
        label: "Therapeutic Techniques", depth: 2,
        children: {
          "E·Immunotherapy": { label: "Desensitization, Immunologic", depth: 3, leaf: true, note: "Allergy shots / sublingual immunotherapy." },
          "E·EnvironmentalControl": { label: "Environmental Exposure", depth: 3, leaf: true, note: "Covers avoidance measures, mattress covers etc." }
        }
      }
    }
  },
  M: {
    label: "Named Groups",
    color: "#7D6608",
    light: "#FEF9E7",
    children: {
      "M·AgeGroups": {
        label: "Age Groups", depth: 2,
        children: {
          "M·Infant": { label: "Infant", depth: 3, leaf: true, note: "Birth to 23 months." },
          "M·Child": { label: "Child", depth: 3, leaf: true, note: "2–12 years." },
          "M·Adolescent": { label: "Adolescent", depth: 3, leaf: true, note: "13–18 years." },
          "M·Adult": { label: "Adult", depth: 3, leaf: true, note: "19+ years." },
          "M·Aged": { label: "Aged", depth: 3, leaf: true, note: "65+ years." }
        }
      }
    }
  }
};

// ── HELPERS ────────────────────────────────────────────────────────────────
function flattenTree(trees) {
  const result = {};
  function walk(node, treeKey) {
    if (!node || typeof node !== "object") return;
    Object.entries(node).forEach(([key, val]) => {
      if (key === "label" || key === "depth" || key === "leaf" || key === "note" || key === "color" || key === "light" || key === "children") return;
      if (typeof val === "object" && val.label) {
        result[key] = { ...val, treeKey };
        if (val.children) walk(val.children, treeKey);
      }
    });
  }
  Object.entries(trees).forEach(([k, v]) => {
    result[k] = { label: v.label, depth: 1, treeKey: k, color: v.color, light: v.light };
    if (v.children) walk(v.children, k);
  });
  return result;
}

const ALL_NODES = flattenTree(TREES);

function getTreeColor(treeKey) {
  return TREES[treeKey]?.color || "#555";
}
function getTreeLight(treeKey) {
  return TREES[treeKey]?.light || "#eee";
}
function getTreeLabel(treeKey) {
  return TREES[treeKey]?.label || treeKey;
}

function buildQueryString(tags) {
  if (tags.length === 0) return "";
  return tags.map(t => {
    const node = ALL_NODES[t.id];
    const label = node?.label || t.id;
    return `${t.major ? "* " : ""}${label}[MeSH]`;
  }).join(" AND ");
}

// ── TREE NODE COMPONENT ────────────────────────────────────────────────────
function TreeNode({ nodeKey, node, treeKey, depth, onAdd, activeIds, expandedInit }) {
  const [open, setOpen] = useState(expandedInit || depth <= 1);
  const hasChildren = node.children && Object.keys(node.children).length > 0;
  const isActive = activeIds.has(nodeKey);
  const color = getTreeColor(treeKey);
  const light = getTreeLight(treeKey);

  return (
    <div style={{ marginLeft: depth > 0 ? 16 : 0 }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 6, padding: "3px 0",
        cursor: hasChildren ? "pointer" : "default"
      }}>
        {/* expand toggle */}
        <span
          onClick={() => hasChildren && setOpen(o => !o)}
          style={{
            width: 14, height: 14, display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 9, color: "#999", flexShrink: 0,
            opacity: hasChildren ? 1 : 0
          }}
        >
          {open ? "▾" : "▸"}
        </span>

        {/* label */}
        <span
          onClick={() => hasChildren && setOpen(o => !o)}
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 11.5,
            color: isActive ? color : "#333",
            fontWeight: isActive ? 700 : node.leaf ? 400 : 600,
            flex: 1,
            lineHeight: 1.3
          }}
        >
          {node.label}
          {node.note && !isActive && (
            <span style={{ fontWeight: 400, color: "#aaa", fontSize: 10, marginLeft: 5 }}>
              — {node.note}
            </span>
          )}
        </span>

        {/* add button */}
        <button
          onClick={() => onAdd(nodeKey, node)}
          disabled={isActive}
          style={{
            padding: "1px 8px", fontSize: 10, borderRadius: 3, border: "none",
            background: isActive ? light : color,
            color: isActive ? color : "#fff",
            cursor: isActive ? "default" : "pointer",
            fontFamily: "'IBM Plex Mono', monospace",
            flexShrink: 0,
            opacity: isActive ? 0.7 : 1,
            transition: "all 0.15s"
          }}
        >
          {isActive ? "added" : "+ add"}
        </button>
      </div>

      {hasChildren && open && (
        <div style={{ borderLeft: `1.5px solid ${color}22`, marginLeft: 7, paddingLeft: 2 }}>
          {Object.entries(node.children).map(([k, child]) => (
            <TreeNode
              key={k}
              nodeKey={k}
              node={child}
              treeKey={treeKey}
              depth={depth + 1}
              onAdd={onAdd}
              activeIds={activeIds}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── MAIN APP ───────────────────────────────────────────────────────────────
export default function MeshExplorer() {
  const [activeTags, setActiveTags] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [copied, setCopied] = useState(false);
  const activeIds = new Set(activeTags.map(t => t.id));

  const addTag = (id, node) => {
    if (activeIds.has(id)) return;
    setActiveTags(prev => [...prev, { id, major: false }]);
  };

  const removeTag = (id) => {
    setActiveTags(prev => prev.filter(t => t.id !== id));
  };

  const toggleMajor = (id) => {
    setActiveTags(prev => prev.map(t => t.id === id ? { ...t, major: !t.major } : t));
  };

  const queryString = buildQueryString(activeTags);

  const copyQuery = () => {
    navigator.clipboard.writeText(queryString).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  // Search filter
  const searchLower = searchQuery.toLowerCase();
  const searchResults = searchQuery.length > 1
    ? Object.entries(ALL_NODES).filter(([k, v]) =>
        v.label?.toLowerCase().includes(searchLower) ||
        v.note?.toLowerCase().includes(searchLower)
      ).slice(0, 8)
    : [];

  return (
    <div style={{
      fontFamily: "'IBM Plex Sans', 'IBM Plex Mono', monospace",
      background: "#FAFAF8",
      minHeight: "100vh",
      padding: 0,
      display: "flex",
      flexDirection: "column"
    }}>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{
        background: "#111",
        color: "#fff",
        padding: "16px 24px 14px",
        borderBottom: "3px solid #E8C547"
      }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
          <span style={{ fontFamily: "'IBM Plex Mono'", fontWeight: 700, fontSize: 15, letterSpacing: 1, color: "#E8C547" }}>
            MeSH
          </span>
          <span style={{ fontFamily: "'IBM Plex Sans'", fontWeight: 400, fontSize: 13, color: "#aaa", letterSpacing: 0.5 }}>
            Filter Builder — Dust Mite Research Focus
          </span>
        </div>
        <div style={{ marginTop: 4, fontSize: 10, color: "#555", fontFamily: "'IBM Plex Mono'" }}>
          NLM Medical Subject Headings · Selected trees: B · C · D · E · M
        </div>
      </div>

      <div style={{ display: "flex", flex: 1, overflow: "hidden", height: "calc(100vh - 68px)" }}>

        {/* LEFT: Tree browser */}
        <div style={{
          width: 380, flexShrink: 0,
          borderRight: "1px solid #E0E0D8",
          overflowY: "auto",
          background: "#fff",
          padding: "12px 14px"
        }}>
          {/* Search */}
          <div style={{ marginBottom: 14 }}>
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search terms..."
              style={{
                width: "100%", padding: "7px 10px",
                fontFamily: "'IBM Plex Mono'", fontSize: 11,
                border: "1.5px solid #ddd", borderRadius: 4,
                background: "#FAFAF8", outline: "none",
                boxSizing: "border-box"
              }}
            />
            {searchResults.length > 0 && (
              <div style={{
                marginTop: 4, border: "1px solid #E0E0D8",
                borderRadius: 4, background: "#fff",
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)"
              }}>
                {searchResults.map(([key, node]) => (
                  <div key={key} style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "6px 10px", borderBottom: "1px solid #f0f0ec"
                  }}>
                    <span style={{
                      width: 20, height: 20, borderRadius: 3, flexShrink: 0,
                      background: getTreeColor(node.treeKey),
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 9, color: "#fff", fontWeight: 700
                    }}>
                      {node.treeKey}
                    </span>
                    <span style={{ flex: 1, fontSize: 11, fontFamily: "'IBM Plex Mono'" }}>
                      {node.label}
                    </span>
                    <button
                      onClick={() => { addTag(key, node); setSearchQuery(""); }}
                      disabled={activeIds.has(key)}
                      style={{
                        padding: "2px 8px", fontSize: 10, border: "none", borderRadius: 3,
                        background: activeIds.has(key) ? "#eee" : getTreeColor(node.treeKey),
                        color: activeIds.has(key) ? "#aaa" : "#fff",
                        cursor: activeIds.has(key) ? "default" : "pointer",
                        fontFamily: "'IBM Plex Mono'"
                      }}
                    >
                      {activeIds.has(key) ? "added" : "+ add"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Trees */}
          {Object.entries(TREES).map(([treeKey, tree]) => (
            <div key={treeKey} style={{ marginBottom: 16 }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "5px 8px", marginBottom: 4,
                background: tree.color,
                borderRadius: 4
              }}>
                <span style={{
                  fontFamily: "'IBM Plex Mono'", fontWeight: 700,
                  fontSize: 11, color: "#fff", letterSpacing: 1
                }}>
                  {treeKey}
                </span>
                <span style={{ fontFamily: "'IBM Plex Sans'", fontSize: 11, color: "rgba(255,255,255,0.85)" }}>
                  {tree.label}
                </span>
              </div>
              {Object.entries(tree.children).map(([k, child]) => (
                <TreeNode
                  key={k}
                  nodeKey={k}
                  node={child}
                  treeKey={treeKey}
                  depth={0}
                  onAdd={addTag}
                  activeIds={activeIds}
                  expandedInit={false}
                />
              ))}
            </div>
          ))}
        </div>

        {/* RIGHT: Active filter + query */}
        <div style={{
          flex: 1, display: "flex", flexDirection: "column",
          overflowY: "auto", padding: 20, gap: 16
        }}>

          {/* Active tags */}
          <div>
            <div style={{
              fontFamily: "'IBM Plex Mono'", fontSize: 10,
              color: "#999", letterSpacing: 1, marginBottom: 10,
              textTransform: "uppercase"
            }}>
              Active Filter Tags ({activeTags.length})
            </div>

            {activeTags.length === 0 && (
              <div style={{
                padding: "32px 0", textAlign: "center",
                color: "#C0C0B8", fontSize: 12, fontFamily: "'IBM Plex Mono'"
              }}>
                ← Add tags from the tree browser
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {activeTags.map(tag => {
                const node = ALL_NODES[tag.id];
                if (!node) return null;
                const color = getTreeColor(node.treeKey);
                const light = getTreeLight(node.treeKey);
                return (
                  <div key={tag.id} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "8px 12px",
                    background: tag.major ? light : "#fff",
                    border: `1.5px solid ${tag.major ? color : "#E0E0D8"}`,
                    borderRadius: 5,
                    transition: "all 0.15s"
                  }}>
                    {/* tree badge */}
                    <span style={{
                      width: 22, height: 22, borderRadius: 3, flexShrink: 0,
                      background: color,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 9, color: "#fff", fontWeight: 700
                    }}>
                      {node.treeKey}
                    </span>

                    {/* label */}
                    <span style={{
                      flex: 1, fontFamily: "'IBM Plex Mono'",
                      fontSize: 12, fontWeight: tag.major ? 700 : 400,
                      color: tag.major ? color : "#222"
                    }}>
                      {tag.major && <span style={{ marginRight: 4, color: color }}>★</span>}
                      {node.label}
                    </span>

                    {/* depth indicator */}
                    <span style={{
                      fontSize: 9, color: "#bbb",
                      fontFamily: "'IBM Plex Mono'",
                      flexShrink: 0
                    }}>
                      L{node.depth || "?"}
                    </span>

                    {/* major toggle */}
                    <button
                      onClick={() => toggleMajor(tag.id)}
                      title="Toggle major topic (asterisk)"
                      style={{
                        padding: "2px 8px", fontSize: 10, border: `1px solid ${color}`,
                        borderRadius: 3, cursor: "pointer",
                        background: tag.major ? color : "transparent",
                        color: tag.major ? "#fff" : color,
                        fontFamily: "'IBM Plex Mono'",
                        transition: "all 0.15s"
                      }}
                    >
                      {tag.major ? "★ major" : "☆ major"}
                    </button>

                    {/* remove */}
                    <button
                      onClick={() => removeTag(tag.id)}
                      style={{
                        padding: "2px 6px", fontSize: 11, border: "none",
                        borderRadius: 3, cursor: "pointer",
                        background: "transparent", color: "#ccc",
                        fontFamily: "'IBM Plex Mono'",
                        lineHeight: 1
                      }}
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Query output */}
          {activeTags.length > 0 && (
            <div>
              <div style={{
                fontFamily: "'IBM Plex Mono'", fontSize: 10,
                color: "#999", letterSpacing: 1, marginBottom: 8,
                textTransform: "uppercase"
              }}>
                PubMed Query String
              </div>
              <div style={{
                background: "#111", borderRadius: 6,
                padding: "14px 16px",
                fontFamily: "'IBM Plex Mono'", fontSize: 12,
                color: "#E8C547", lineHeight: 1.7,
                wordBreak: "break-all",
                position: "relative"
              }}>
                {queryString}
                <button
                  onClick={copyQuery}
                  style={{
                    position: "absolute", top: 10, right: 10,
                    padding: "3px 10px", fontSize: 10,
                    background: copied ? "#2D6A4F" : "#333",
                    color: copied ? "#D8F3DC" : "#aaa",
                    border: "none", borderRadius: 3,
                    cursor: "pointer", fontFamily: "'IBM Plex Mono'",
                    transition: "all 0.2s"
                  }}
                >
                  {copied ? "copied!" : "copy"}
                </button>
              </div>
              <div style={{
                marginTop: 8, fontSize: 10, color: "#aaa",
                fontFamily: "'IBM Plex Mono'"
              }}>
                ★ = major topic only &nbsp;·&nbsp; Paste into PubMed advanced search or your API query
              </div>
            </div>
          )}

          {/* Legend */}
          <div style={{ marginTop: 8 }}>
            <div style={{
              fontFamily: "'IBM Plex Mono'", fontSize: 10,
              color: "#999", letterSpacing: 1, marginBottom: 8,
              textTransform: "uppercase"
            }}>
              Tree Legend
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {Object.entries(TREES).map(([k, v]) => (
                <div key={k} style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "4px 10px", borderRadius: 4,
                  background: v.color
                }}>
                  <span style={{ fontFamily: "'IBM Plex Mono'", fontWeight: 700, fontSize: 10, color: "#fff" }}>{k}</span>
                  <span style={{ fontFamily: "'IBM Plex Sans'", fontSize: 10, color: "rgba(255,255,255,0.85)" }}>{v.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
