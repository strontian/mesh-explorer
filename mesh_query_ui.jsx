import { useEffect, useRef, useState } from "react";

const mono = "'JetBrains Mono','Fira Mono',monospace";
const QUERY_STORAGE_KEY = "mesh_query_builder_state";
const QUERY_EVENT = "mesh-query-state-change";
const DEFAULT_BRANCH_COLOR = {
  age:"#6DB8E8",
  occ:"#E8A06D",
  persons:"#7DC48B",
  disciplines:"#B8C8A8",
};
const TREE_META = {
  A:{label:"Anatomy", color:"#A8D8A8"},
  B:{label:"Organisms", color:"#98D8C8"},
  C:{label:"Diseases", color:"#F4A261"},
  D:{label:"Chemicals & Drugs", color:"#C3A6FF"},
  E:{label:"Techniques", color:"#7EC8E3"},
  F:{label:"Psychology", color:"#E8A598"},
  G:{label:"Phenomena", color:"#E8D58A"},
  H:{label:"Disciplines", color:"#B8C8A8"},
  I:{label:"Sociology", color:"#D8A8D8"},
  J:{label:"Technology", color:"#E8C888"},
  K:{label:"Humanities", color:"#F0B8C8"},
  L:{label:"Information", color:"#A8C8E8"},
  M:{label:"Named Groups", color:"#AED6F1"},
  N:{label:"Health Care", color:"#90D0B8"},
  V:{label:"Publications", color:"#C8C8A8"},
  Z:{label:"Geographicals", color:"#88C8D8"},
};

function makeQueryId() {
  return `q${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function inferNextQueryCounter(queries) {
  const highest = queries.reduce((max, query) => {
    const match = /^Query (\d+)$/.exec(query.name || "");
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return highest + 1;
}

function readQueryState() {
  if (typeof window === "undefined") return { queries:[], activeId:null, nextCounter:1 };

  try {
    const parsed = JSON.parse(window.localStorage.getItem(QUERY_STORAGE_KEY) || "null");
    const queries = Array.isArray(parsed?.queries)
      ? parsed.queries.map(query => ({
        id:String(query.id),
        name:String(query.name || "Query"),
        terms:Array.isArray(query.terms)
          ? query.terms
            .filter(term => term?.id)
            .map(term => ({
              id:String(term.id),
              branch:term.branch || "terms",
              major:Boolean(term.major),
              color:term.color,
              treeNum:term.treeNum,
              ui:term.ui,
            }))
          : [],
      }))
      : [];
    const activeId = queries.some(query => query.id === parsed?.activeId) ? parsed.activeId : queries[0]?.id || null;
    const nextCounter = Math.max(
      Number.isFinite(parsed?.nextCounter) ? Number(parsed.nextCounter) : 1,
      inferNextQueryCounter(queries)
    );

    return { queries, activeId, nextCounter };
  } catch {
    return { queries:[], activeId:null, nextCounter:1 };
  }
}

function normalizeQueryTerm(term) {
  return {
    id:String(term.id || term.name),
    branch:term.branch || "terms",
    major:Boolean(term.major),
    color:term.color,
    treeNum:term.treeNum,
    ui:term.ui,
  };
}

function buildPubMedUrl(terms) {
  if (!terms.length) return null;
  const query = terms
    .map(term => `"${String(term.id).replace(/"/g, '\\"')}"[${term.major ? "Majr" : "MeSH Terms"}]`)
    .join(" AND ");
  return `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(query)}`;
}

export function usePersistentMeshQueries() {
  const initialState = useRef(null);
  if (!initialState.current) initialState.current = readQueryState();

  const [queries, setQueries] = useState(initialState.current.queries);
  const [activeId, setActiveId] = useState(initialState.current.activeId);
  const counter = useRef(initialState.current.nextCounter);
  const active = queries.find(q => q.id === activeId) || null;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const payload = JSON.stringify({
      queries,
      activeId,
      nextCounter:counter.current,
    });
    if (window.localStorage.getItem(QUERY_STORAGE_KEY) !== payload) {
      window.localStorage.setItem(QUERY_STORAGE_KEY, payload);
      window.dispatchEvent(new Event(QUERY_EVENT));
    }
  }, [queries, activeId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = () => {
      const next = readQueryState();
      setQueries(next.queries);
      setActiveId(next.activeId);
      counter.current = next.nextCounter;
    };
    window.addEventListener(QUERY_EVENT, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(QUERY_EVENT, handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  function create(term) {
    const id = makeQueryId();
    const name = `Query ${counter.current}`;
    counter.current += 1;
    setQueries(qs => [...qs, { id, name, terms:[normalizeQueryTerm(term)] }]);
    setActiveId(id);
  }

  function createEmpty() {
    const id = makeQueryId();
    const name = `Query ${counter.current}`;
    counter.current += 1;
    setQueries(qs => [...qs, { id, name, terms:[] }]);
    setActiveId(id);
  }

  function add(term) {
    if (!activeId) {
      create(term);
      return;
    }
    const nextTerm = normalizeQueryTerm(term);
    setQueries(qs => qs.map(q =>
      q.id === activeId && !q.terms.some(t => t.id === nextTerm.id)
        ? { ...q, terms:[...q.terms, nextTerm] }
        : q
    ));
  }

  function remove(termId) {
    setQueries(qs => qs.map(q => q.id === activeId ? { ...q, terms:q.terms.filter(t => t.id !== termId) } : q));
  }

  function toggleMajor(termId) {
    setQueries(qs => qs.map(q => q.id === activeId
      ? { ...q, terms:q.terms.map(t => t.id === termId ? { ...t, major:!t.major } : t) }
      : q
    ));
  }

  function rename(name) {
    setQueries(qs => qs.map(q => q.id === activeId ? { ...q, name } : q));
  }

  return {
    queries,
    active,
    activeId,
    setActiveId,
    create,
    createEmpty,
    add,
    remove,
    toggleMajor,
    rename,
    allIds:new Set(queries.flatMap(q => q.terms.map(t => t.id))),
    inActive:new Set(active?.terms.map(t => t.id) || []),
  };
}

export function MeshInspectorQueryDock({ selected, query, layout = "side" }) {
  const [editing, setEditing] = useState(false);
  const [open, setOpen] = useState(false);
  const [narrow, setNarrow] = useState(false);
  const inputRef = useRef(null);
  const menuRef = useRef(null);
  const color = selected?.color || DEFAULT_BRANCH_COLOR[selected?.branch] || "#ffffff";
  const alreadyIn = selected && query.inActive.has(selected.id);
  const pubMedUrl = query.active ? buildPubMedUrl(query.active.terms) : null;
  const bottom = layout === "bottom";
  const compactBottom = bottom && narrow;

  function openGlobalSearch() {
    if (typeof window !== "undefined") window.dispatchEvent(new Event("mesh-open-search"));
  }

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus();
  }, [editing]);

  useEffect(() => {
    if (!open) return;
    const handler = event => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const update = () => setNarrow(window.innerWidth < 760);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return (
    <aside style={{
      position:bottom ? "relative" : "sticky",
      top:bottom ? "auto" : 18,
      alignSelf:bottom ? "stretch" : "start",
      maxHeight:compactBottom ? "58vh" : bottom ? "none" : "calc(100vh - 170px)",
      overflowY:compactBottom ? "auto" : bottom ? "visible" : "auto",
      background:"#13161d",
      border:"1px solid #ffffff18",
      borderRadius:10,
      boxShadow:"0 12px 34px rgba(0,0,0,0.34),0 0 0 1px #ffffff05",
      fontFamily:mono,
    }}>
      <div style={{ height:3, background:`linear-gradient(90deg,${color}cc,${color}22,#ffffff0a)` }} />
      <div style={{
        display:bottom ? "grid" : "block",
        gridTemplateColumns:bottom
          ? compactBottom
            ? "minmax(0, 0.85fr) minmax(0, 1fr) 46px"
            : "minmax(360px, 0.78fr) minmax(520px, 1fr) 132px"
          : undefined,
      }}>
      <section style={{
        padding:compactBottom ? "9px 9px 8px" : bottom ? "16px 18px 15px" : "14px 15px 13px",
        borderBottom:bottom && !compactBottom ? "none" : "1px solid #ffffff0d",
        borderRight:bottom ? "1px solid #ffffff0d" : "none",
        minHeight:compactBottom ? 118 : bottom ? 174 : 248,
        boxSizing:"border-box",
        display:"flex",
        flexDirection:"column",
        minWidth:0,
      }}>
        <div style={{ fontSize:7.5, color:color + "aa", letterSpacing:compactBottom ? 1.1 : 1.6, fontWeight:700, marginBottom:compactBottom ? 4 : 8 }}>
          SELECTED TERM
        </div>
        {selected ? (
          <>
            <div style={{ fontSize:compactBottom ? 12 : 16, color:"#f1f3f4", fontWeight:800, lineHeight:1.18, marginBottom:3, minHeight:bottom ? 18 : 39, display:"flex", alignItems:"flex-start", overflow:"hidden" }}>
              {selected.id}
            </div>
            <div style={{ fontSize:8, color:color, marginBottom:compactBottom ? 5 : 10, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
              {selected.treeNum || selected.ui || "MeSH"}
            </div>
            <div style={{ fontSize:compactBottom ? 7.5 : 9, color:"#ffffff9c", lineHeight:1.45, height:compactBottom ? 24 : bottom ? 58 : 98, overflowY:"auto", paddingRight:4, marginBottom:compactBottom ? 6 : 12 }}>
              {selected.note || <span style={{ color:"#ffffff2a", fontStyle:"italic" }}>No scope note on record.</span>}
            </div>
            {!query.active ? (
              <button onClick={() => query.create(selected)} style={{ width:"100%", marginTop:"auto", padding:compactBottom ? "6px 5px" : "8px 10px", fontFamily:mono, fontSize:8.5, fontWeight:800, background:"#ffffff10", border:"1px solid #ffffff28", borderRadius:5, color:"#e8e8e8", cursor:"pointer", letterSpacing:0.5 }}>
                + create query with this term
              </button>
            ) : alreadyIn ? (
              <div style={{ marginTop:"auto", padding:compactBottom ? "6px 5px" : "7px 10px", border:"1px solid #ffffff12", borderRadius:5, color:"#ffffff34", fontSize:8.5, textAlign:"center" }}>
                already in active query
              </div>
            ) : (
              <button onClick={() => query.add(selected)} style={{ width:"100%", marginTop:"auto", padding:compactBottom ? "6px 5px" : "8px 10px", fontFamily:mono, fontSize:8.5, fontWeight:800, background:`${color}18`, border:`1px solid ${color}55`, borderRadius:5, color, cursor:"pointer", letterSpacing:0.5 }}>
                + add to query
              </button>
            )}
          </>
        ) : (
          <div style={{ padding:"18px 0", fontSize:9, color:"#ffffff25", textAlign:"center", lineHeight:1.8 }}>
            select a term to inspect it
          </div>
        )}
      </section>

      <section style={{
        padding:compactBottom ? "9px 9px 8px" : bottom ? "16px 18px 15px" : "13px 15px 15px",
        minHeight:compactBottom ? 118 : bottom ? 174 : undefined,
        boxSizing:"border-box",
        display:"flex",
        flexDirection:"column",
        borderBottom:"none",
        borderRight:compactBottom ? "1px solid #ffffff0d" : "none",
        minWidth:0,
      }}>
        {!query.active ? (
          <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:"auto" }}>
            <button onClick={query.createEmpty} style={{ flex:1, padding:"8px 10px", fontFamily:mono, fontSize:8.5, fontWeight:800, background:"#ffffff0c", border:"1px dashed #ffffff30", borderRadius:5, color:"#ffffff86", cursor:"pointer" }}>
              + new query
            </button>
          </div>
        ) : (
          <>
            <div style={{ display:"flex", alignItems:"center", gap:5, marginBottom:compactBottom ? 6 : 10, position:"relative" }}>
              {query.queries.length > 1 && !editing && (
                <div ref={menuRef} style={{ position:"relative", flexShrink:0 }}>
                  <button onClick={() => setOpen(v => !v)} style={{ background:"#ffffff08", border:"1px solid #ffffff16", borderRadius:4, color:open ? "#fff" : "#ffffff55", cursor:"pointer", padding:"3px 6px", fontFamily:mono, fontSize:9 }}>
                    {open ? "▴" : "▾"}
                  </button>
                  {open && (
                    <div style={{ position:"absolute", top:"calc(100% + 6px)", left:0, background:"#1a1e28", border:"1px solid #ffffff22", borderRadius:6, overflow:"hidden", boxShadow:"0 8px 24px rgba(0,0,0,0.5)", minWidth:190, zIndex:20 }}>
                      {query.queries.map(q => (
                        <div key={q.id} onClick={() => { query.setActiveId(q.id); setOpen(false); }} style={{ padding:"8px 12px", fontSize:9, color:q.id === query.activeId ? "#e8e8e8" : "#888", background:q.id === query.activeId ? "#ffffff0e" : "transparent", cursor:"pointer", display:"flex", alignItems:"center", gap:8, borderBottom:"1px solid #ffffff06" }}>
                          <span style={{ width:4, height:4, borderRadius:"50%", background:q.id === query.activeId ? "#AED6F1" : "transparent", border:q.id === query.activeId ? "none" : "1px solid #ffffff28", flexShrink:0 }} />
                          <span style={{ flex:1 }}>{q.name}</span>
                          <span style={{ fontSize:8, color:"#ffffff28" }}>{q.terms.length}</span>
                        </div>
                      ))}
                      <div onClick={() => { query.createEmpty(); setOpen(false); }} style={{ padding:"8px 12px", fontSize:9, color:"#ffffff55", cursor:"pointer", borderTop:"1px solid #ffffff0a" }}>
                        + new query
                      </div>
                    </div>
                  )}
                </div>
              )}
              {editing ? (
                <input ref={inputRef} defaultValue={query.active.name} onBlur={event => { query.rename(event.target.value.trim() || query.active.name); setEditing(false); }} onKeyDown={event => {
                  if (event.key === "Enter") { query.rename(event.currentTarget.value.trim() || query.active.name); setEditing(false); }
                  if (event.key === "Escape") setEditing(false);
                }} style={{ flex:1, minWidth:0, fontFamily:mono, fontSize:12, fontWeight:800, background:"transparent", border:"none", borderBottom:"1px solid #ffffff44", color:"#e8e8e8", outline:"none", padding:"2px 0" }} />
              ) : (
                <button onClick={query.queries.length > 1 ? () => setOpen(v => !v) : undefined} style={{ flex:"0 1 auto", minWidth:0, maxWidth:compactBottom ? "54%" : "70%", textAlign:"left", background:"transparent", border:"none", padding:0, fontFamily:mono, fontSize:compactBottom ? 10 : 12, color:"#e8e8e8", fontWeight:800, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", cursor:query.queries.length > 1 ? "pointer" : "default" }}>
                  {query.active.name}
                </button>
              )}
              {!editing && (
                <button onClick={() => setEditing(true)} title="Rename query" style={{ background:"transparent", border:"none", color:"#ffffff35", cursor:"pointer", fontSize:11, padding:2 }}>✎</button>
              )}
              <span style={{ flex:1 }} />
              <button onClick={query.createEmpty} title="New query" style={{ background:"#ffffff10", border:"1px solid #ffffff34", borderRadius:5, color:"#ffffff96", cursor:"pointer", fontFamily:mono, fontSize:11, fontWeight:900, padding:compactBottom ? "3px 7px" : "4px 9px", boxShadow:"inset 0 0 0 1px #ffffff08" }}>+</button>
            </div>

            {query.active.terms.length === 0 ? (
              <div style={{ fontSize:8.5, color:"#ffffff24", lineHeight:1.7, padding:"7px 0 4px" }}>
                no terms yet - select a term and add it above
              </div>
            ) : (
              <div style={{ display:"flex", flexWrap:"wrap", gap:compactBottom ? 4 : bottom ? 6 : 5, maxHeight:compactBottom ? 32 : bottom ? 54 : 138, overflowY:"auto", paddingRight:2 }}>
                {query.active.terms.map(term => {
                  const termColor = term.color || DEFAULT_BRANCH_COLOR[term.branch] || "#aaa";
                  return (
                    <div key={term.id} style={{ display:"flex", alignItems:"center", background:"#ffffff0b", border:"1px solid #ffffff18", borderRadius:6, overflow:"hidden", outline:term.major ? "1px solid #FFD70044" : "none" }}>
                      <button onClick={() => query.toggleMajor(term.id)} title={term.major ? "major topic" : "minor topic"} style={{ padding:compactBottom ? "4px 5px" : bottom ? "5px 7px" : "4px 6px", background:"transparent", border:"none", color:term.major ? "#FFD700" : "#ffffff30", cursor:"pointer", fontSize:bottom ? 11 : 10, lineHeight:1, flexShrink:0 }}>
                        {term.major ? "★" : "☆"}
                      </button>
                      <span style={{ fontSize:compactBottom ? 8.5 : bottom ? 9.5 : 8.5, color:term.major ? "#FFD700cc" : termColor + "dd", paddingRight:bottom ? 4 : 2, fontWeight:term.major ? 700 : 500 }}>{term.id}</span>
                      <button onClick={() => query.remove(term.id)} style={{ padding:compactBottom ? "4px 5px" : bottom ? "5px 7px" : "4px 6px", background:"transparent", border:"none", borderLeft:"1px solid #ffffff0e", color:"#ffffff30", cursor:"pointer", fontSize:bottom ? 12 : 11, lineHeight:1, flexShrink:0 }}>x</button>
                    </div>
                  );
                })}
              </div>
            )}

            {query.active.terms.length > 0 && (
              <>
                <a href={pubMedUrl} target="_blank" rel="noreferrer" style={{ marginTop:"auto", padding:compactBottom ? "6px 6px" : bottom ? "9px 10px" : "10px 10px", border:"1px solid #AED6F144", borderRadius:7, background:"linear-gradient(180deg,#AED6F118,#AED6F108)", display:"flex", alignItems:"center", gap:9, textDecoration:"none", cursor:"pointer" }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:7, color:"#AED6F1", letterSpacing:1.3, fontWeight:800 }}>RUN QUERY</div>
                    {!compactBottom && <div style={{ fontSize:7.5, color:"#ffffff48", marginTop:3, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>Open this MeSH filter in PubMed</div>}
                  </div>
                  <span style={{ color:"#091016", background:"#AED6F1", border:"1px solid #D8ECFA", borderRadius:5, padding:compactBottom ? "5px 7px" : "6px 10px", fontSize:8.5, fontWeight:900, letterSpacing:0.4, boxShadow:"0 0 18px #AED6F122", flexShrink:0 }}>
                    PubMed ↗
                  </span>
                </a>
              </>
            )}
          </>
        )}
      </section>
      {bottom && (
        <button
          onClick={openGlobalSearch}
          title="Search all MeSH trees"
          style={{
            margin:0,
            padding:0,
            border:"none",
            borderLeft:compactBottom ? "none" : "1px solid #ffffff0d",
            borderTop:compactBottom ? "1px solid #ffffff0d" : "none",
            background:"#ffffff06",
            color:"#ffffff86",
            cursor:"pointer",
            fontFamily:mono,
            minHeight:compactBottom ? 118 : 174,
            width:compactBottom ? "100%" : "auto",
            display:"grid",
            placeItems:"center",
          }}
        >
          <span style={{ display:"grid", alignItems:"center", gap:compactBottom ? 5 : 7, justifyItems:"center" }}>
            <span style={{ padding:compactBottom ? "6px 9px" : "8px 10px", minWidth:compactBottom ? 42 : 48, border:"1px solid #ffffff24", borderRadius:7, background:"#ffffff0b", color:"#ffffffc0", fontSize:compactBottom ? 11 : 13, fontWeight:900, lineHeight:1, boxShadow:"inset 0 -1px 0 #00000055" }}>⌘K</span>
            <span style={{ fontSize:7.5, fontWeight:800, writingMode:compactBottom ? "vertical-rl" : "horizontal-tb", textTransform:compactBottom ? "uppercase" : "none", letterSpacing:compactBottom ? 1 : 0 }}>{compactBottom ? "Search" : "Search"}</span>
          </span>
        </button>
      )}
      </div>
    </aside>
  );
}

export function MeshBottomQueryLayout({ children, selected, query, contentStyle = {} }) {
  return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column", overflow:"hidden" }}>
      <div style={{ flex:1, minHeight:0, overflowY:"auto", ...contentStyle }}>
        {children}
      </div>
      <div style={{ flexShrink:0, padding:0, background:"linear-gradient(180deg,rgba(15,17,23,0),#0f1117 30%)", boxShadow:"0 -18px 34px rgba(0,0,0,0.34)" }}>
        <MeshInspectorQueryDock selected={selected} query={query} layout="bottom" />
      </div>
    </div>
  );
}

function Highlight({ text, query, color = "#FFD700" }) {
  if (!query.trim()) return <>{text}</>;
  const idx = String(text).toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {String(text).slice(0, idx)}
      <span style={{ color, fontWeight:700 }}>{String(text).slice(idx, idx + query.length)}</span>
      {String(text).slice(idx + query.length)}
    </>
  );
}

function scoreTerm(term, query) {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  const name = term.name.toLowerCase();
  const note = (term.note || term.scopeNote || "").toLowerCase();
  if (name === q) return { score:100, matchType:"exact" };
  if (name.startsWith(q)) return { score:80, matchType:"prefix" };
  if (name.includes(q)) return { score:60, matchType:"name" };
  if (note.includes(q)) return { score:30, matchType:"note" };
  return null;
}

export function GlobalMeshSearchOverlay({ open, onClose, onNavigate, queryBuilder }) {
  const [query, setQuery] = useState("");
  const [terms, setTerms] = useState([]);
  const inputRef = useRef(null);

  useEffect(() => {
    fetch("/mesh-terms.json")
      .then(response => response.json())
      .then(setTerms)
      .catch(() => setTerms([]));
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  if (!open) return null;

  const q = query.trim();
  const results = q
    ? terms.flatMap(term => {
      const scored = scoreTerm(term, q);
      if (!scored) return [];
      const treeNum = term.treeNums?.find(num => TREE_META[num[0]]) || term.treeNums?.[0] || "";
      const tree = treeNum[0] || "?";
      return [{ ...term, ...scored, tree, treeNum }];
    }).sort((a, b) => b.score - a.score || a.name.localeCompare(b.name)).slice(0, 120)
    : [];

  const grouped = {};
  for (const result of results) {
    (grouped[result.tree] ||= []).push(result);
  }
  const bestScore = tree => Math.max(...grouped[tree].map(result => result.score));
  const treeOrder = Object.keys(grouped).sort((a, b) =>
    bestScore(b) - bestScore(a) || grouped[b].length - grouped[a].length || a.localeCompare(b)
  );

  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(5,7,10,0.8)", display:"flex", alignItems:"flex-start", justifyContent:"center", paddingTop:"10vh", zIndex:1000, animation:"fadeIn 0.12s ease", backdropFilter:"blur(2px)" }}>
      <div onClick={event => event.stopPropagation()} style={{ width:580, maxWidth:"90%", background:"#14171e", border:"1px solid #ffffff20", borderRadius:12, boxShadow:"0 20px 60px rgba(0,0,0,0.6)", overflow:"hidden", animation:"slideDown 0.16s ease" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, padding:"14px 16px", borderBottom:"1px solid #ffffff0e" }}>
          <span style={{ color:"#ffffff44", fontSize:14 }}>⌕</span>
          <input
            ref={inputRef}
            value={query}
            onChange={event => setQuery(event.target.value)}
            onKeyDown={event => { if (event.key === "Escape") onClose(); }}
            placeholder="Search across all MeSH trees..."
            style={{ flex:1, background:"transparent", border:"none", outline:"none", color:"#e8e8e8", fontFamily:mono, fontSize:14 }}
          />
          <kbd style={{ fontFamily:mono, fontSize:8, color:"#ffffff33", border:"1px solid #ffffff18", borderRadius:3, padding:"2px 6px" }}>ESC</kbd>
        </div>

        <div style={{ maxHeight:420, overflowY:"auto", padding:"8px 0" }}>
          {results.length === 0 && (
            <div style={{ padding:"32px 16px", textAlign:"center", fontFamily:mono, fontSize:10, color:"#ffffff33" }}>
              {q === "" ? "type to search all trees" : `no terms match "${query}"`}
            </div>
          )}
          {treeOrder.map(tree => {
            const meta = TREE_META[tree] || { label:"Other", color:"#aaaaaa" };
            return (
              <div key={tree} style={{ marginBottom:8 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, padding:"4px 16px", marginBottom:2 }}>
                  <div style={{ width:5, height:5, borderRadius:"50%", background:meta.color }} />
                  <span style={{ fontFamily:mono, fontSize:8.5, color:meta.color, letterSpacing:1, fontWeight:700 }}>{tree} · {meta.label.toUpperCase()}</span>
                  <span style={{ fontFamily:mono, fontSize:8, color:"#ffffff28" }}>{grouped[tree].length}</span>
                  <div style={{ flex:1, height:1, background:meta.color + "18", marginLeft:4 }} />
                </div>
                {grouped[tree].map(result => {
                  const note = result.note || result.scopeNote || "";
                  return (
                    <div
                      key={`${result.ui}-${result.treeNum}`}
                      onClick={() => { onNavigate?.(result); onClose(); }}
                      style={{ display:"flex", alignItems:"center", gap:10, padding:"7px 16px 7px 28px", cursor:"pointer", position:"relative" }}
                      onMouseEnter={event => { event.currentTarget.style.background = "#ffffff0a"; event.currentTarget.querySelector(".acts").style.opacity = 1; }}
                      onMouseLeave={event => { event.currentTarget.style.background = "transparent"; event.currentTarget.querySelector(".acts").style.opacity = 0; }}
                    >
                      <div style={{ flex:1, overflow:"hidden" }}>
                        <div style={{ fontFamily:mono, fontSize:11, color:"#e8e8e8", fontWeight:600 }}>
                          <Highlight text={result.name} query={q} />
                        </div>
                        <div style={{ fontFamily:mono, fontSize:8, color:"#ffffff44", marginTop:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                          {result.matchType === "note" ? <Highlight text={note} query={q} color="#FFD70099" /> : result.treeNum}
                        </div>
                      </div>
                      <div className="acts" style={{ display:"flex", gap:5, flexShrink:0, opacity:0, transition:"opacity 0.1s" }}>
                        <button
                          onClick={event => {
                            event.stopPropagation();
                            queryBuilder.add({ id:result.name, branch:tree.toLowerCase(), color:meta.color, treeNum:result.treeNum, ui:result.ui, note });
                            onClose();
                          }}
                          style={{ padding:"5px 12px", fontFamily:mono, fontSize:9, fontWeight:800, background:meta.color + "22", border:`1px solid ${meta.color}66`, borderRadius:4, color:meta.color, cursor:"pointer" }}
                        >
                          + query
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {results.length > 0 && (
          <div style={{ padding:"7px 16px", borderTop:"1px solid #ffffff0e", fontFamily:mono, fontSize:8, color:"#ffffff33" }}>
            {results.length} result{results.length === 1 ? "" : "s"} across {treeOrder.length} tree{treeOrder.length === 1 ? "" : "s"}
          </div>
        )}
      </div>
    </div>
  );
}
