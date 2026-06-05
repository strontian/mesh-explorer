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

export function FloatingMeshDetailPanel({ selected, query, left = 16, bottom = 16 }) {
  const color = selected?.color || DEFAULT_BRANCH_COLOR[selected?.branch] || "#ffffff";
  const alreadyIn = selected && query.inActive.has(selected.id);

  return (
    <div style={{ position:"fixed", bottom, left, width:252, background:"#13161d", border:"1px solid #ffffff18", borderRadius:8, boxShadow:"0 8px 32px rgba(0,0,0,0.55),0 0 0 1px #ffffff06", overflow:"hidden", zIndex:100 }}>
      {selected ? (
        <>
          <div style={{ height:2, background:`linear-gradient(90deg,${color}cc,${color}11)` }} />
          <div style={{ padding:"12px 14px" }}>
            <div style={{ fontFamily:mono, fontSize:13, color:"#e8e8e8", fontWeight:700, lineHeight:1.2, marginBottom:3 }}>{selected.id}</div>
            <div style={{ fontFamily:mono, fontSize:7.5, color:"#ffffff28", letterSpacing:0.5, marginBottom:8 }}>{selected.treeNum || selected.ui || "MeSH"}</div>
            <div style={{ fontFamily:mono, fontSize:9, color:"#ffffffaa", lineHeight:1.7, marginBottom:12, maxHeight:92, overflowY:"auto" }}>
              {selected.note || <span style={{ color:"#ffffff28", fontStyle:"italic" }}>No scope note on record.</span>}
            </div>
            {!query.active ? (
              <button onClick={() => query.create(selected)} style={{ width:"100%", padding:"6px 0", fontFamily:mono, fontSize:8.5, fontWeight:700, background:"#ffffff10", border:"1px solid #ffffff28", borderRadius:4, color:"#e8e8e8", cursor:"pointer", letterSpacing:0.5 }}>
                + create query with this term
              </button>
            ) : alreadyIn ? (
              <div style={{ fontFamily:mono, fontSize:8, color:"#ffffff28", textAlign:"center", padding:"4px 0" }}>already in query</div>
            ) : (
              <button onClick={() => query.add(selected)} style={{ width:"100%", padding:"6px 0", fontFamily:mono, fontSize:8.5, fontWeight:700, background:`${color}18`, border:`1px solid ${color}44`, borderRadius:4, color, cursor:"pointer", letterSpacing:0.5 }}>
                + add to query
              </button>
            )}
          </div>
        </>
      ) : (
        <div style={{ padding:"16px 14px", fontFamily:mono, fontSize:9, color:"#ffffff1a", textAlign:"center", lineHeight:1.9 }}>
          click any term<br />to inspect it
        </div>
      )}
    </div>
  );
}

export function FloatingMeshQueryPanel({ query, left = 284, bottom = 16 }) {
  const [editing, setEditing] = useState(false);
  const [open, setOpen] = useState(false);
  const inputRef = useRef(null);
  const menuRef = useRef(null);

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

  if (!query.active) return null;
  const pubMedUrl = buildPubMedUrl(query.active.terms);

  return (
    <div style={{ position:"fixed", bottom, left, width:276, background:"#13161d", border:"1px solid #ffffff18", borderRadius:8, boxShadow:"0 8px 32px rgba(0,0,0,0.55),0 0 0 1px #ffffff06", overflow:"visible", zIndex:100, animation:"slideIn 0.18s ease" }}>
      <div style={{ height:2, background:"linear-gradient(90deg,#ffffff18,#ffffff04)", borderRadius:"8px 8px 0 0" }} />
      <div style={{ padding:"10px 12px 8px", borderBottom:"1px solid #ffffff0a", display:"flex", alignItems:"center", gap:5, position:"relative" }}>
        {query.queries.length > 1 && !editing && (
          <div ref={menuRef} style={{ position:"relative", flexShrink:0 }}>
            <button onClick={() => setOpen(v => !v)} style={{ background:"transparent", border:"none", color:open ? "#e8e8e8" : "#ffffff44", cursor:"pointer", padding:"2px 3px", fontFamily:mono, fontSize:10 }}>
              {open ? "▴" : "▾"}
            </button>
            {open && (
              <div style={{ position:"absolute", bottom:"calc(100% + 6px)", left:0, background:"#1a1e28", border:"1px solid #ffffff22", borderRadius:6, overflow:"hidden", boxShadow:"0 4px 16px rgba(0,0,0,0.5)", minWidth:170, zIndex:200, animation:"fadeIn 0.1s ease" }}>
                {query.queries.map(q => (
                  <div key={q.id} onClick={() => { query.setActiveId(q.id); setOpen(false); }} style={{ padding:"8px 12px", fontFamily:mono, fontSize:9.5, color:q.id === query.activeId ? "#e8e8e8" : "#888", background:q.id === query.activeId ? "#ffffff0e" : "transparent", cursor:"pointer", display:"flex", alignItems:"center", gap:8, borderBottom:"1px solid #ffffff06" }}>
                    <span style={{ width:4, height:4, borderRadius:"50%", background:q.id === query.activeId ? "#AED6F1" : "transparent", border:q.id === query.activeId ? "none" : "1px solid #ffffff28", flexShrink:0 }} />
                    <span style={{ flex:1 }}>{q.name}</span>
                    <span style={{ fontSize:8, color:"#ffffff28" }}>{q.terms.length}</span>
                  </div>
                ))}
                <div onClick={() => { query.createEmpty(); setOpen(false); }} style={{ padding:"7px 12px", fontFamily:mono, fontSize:9, color:"#ffffff44", cursor:"pointer", borderTop:"1px solid #ffffff0a" }}>+ new query</div>
              </div>
            )}
          </div>
        )}
        <div style={{ flex:1, display:"flex", alignItems:"center", gap:4, minWidth:0, overflow:"hidden" }}>
          {editing ? (
            <input ref={inputRef} defaultValue={query.active.name} onBlur={event => { query.rename(event.target.value.trim() || query.active.name); setEditing(false); }} onKeyDown={event => {
              if (event.key === "Enter") { query.rename(event.currentTarget.value.trim() || query.active.name); setEditing(false); }
              if (event.key === "Escape") setEditing(false);
            }} style={{ fontFamily:mono, fontSize:11, fontWeight:700, background:"transparent", border:"none", borderBottom:"1px solid #ffffff44", color:"#e8e8e8", outline:"none", flex:1, padding:"1px 0", minWidth:0 }} />
          ) : (
            <>
              <span onClick={query.queries.length > 1 ? () => setOpen(v => !v) : undefined} style={{ fontFamily:mono, fontSize:11, color:"#e8e8e8", fontWeight:700, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", cursor:query.queries.length > 1 ? "pointer" : "default" }}>{query.active.name}</span>
              <button onClick={() => setEditing(true)} title="Rename query" style={{ background:"transparent", border:"none", color:"#ffffff33", cursor:"pointer", padding:"1px", flexShrink:0 }}>✎</button>
            </>
          )}
        </div>
        {query.queries.length <= 1 && !editing && (
          <button onClick={query.createEmpty} title="New query" style={{ background:"#ffffff08", border:"1px dashed #ffffff2c", borderRadius:3, color:"#ffffff66", cursor:"pointer", fontFamily:mono, fontSize:10, fontWeight:700, padding:"2px 8px", flexShrink:0 }}>+</button>
        )}
      </div>
      <div style={{ padding:"9px 12px 10px" }}>
        {query.active.terms.length === 0 ? (
          <div style={{ fontFamily:mono, fontSize:8, color:"#ffffff18", padding:"4px 0", lineHeight:1.7 }}>
            no terms yet - select a term<br />and add it from the detail panel
          </div>
        ) : (
          <div style={{ display:"flex", flexWrap:"wrap", gap:4, maxHeight:116, overflowY:"auto" }}>
            {query.active.terms.map(term => {
              const color = term.color || DEFAULT_BRANCH_COLOR[term.branch] || "#aaa";
              return (
                <div key={term.id} style={{ display:"flex", alignItems:"center", background:"#ffffff0b", border:"1px solid #ffffff18", borderRadius:4, overflow:"hidden", outline:term.major ? "1px solid #FFD70044" : "none" }}>
                  <button onClick={() => query.toggleMajor(term.id)} title={term.major ? "major topic" : "minor topic"} style={{ padding:"3px 6px", background:"transparent", border:"none", color:term.major ? "#FFD700" : "#ffffff28", cursor:"pointer", fontSize:10, lineHeight:1, flexShrink:0 }}>
                    {term.major ? "★" : "☆"}
                  </button>
                  <span style={{ fontFamily:mono, fontSize:8.5, color:term.major ? "#FFD700cc" : "#cccccc", paddingRight:2, fontWeight:term.major ? 600 : 400 }}>{term.id}</span>
                  <button onClick={() => query.remove(term.id)} style={{ padding:"3px 6px", background:"transparent", border:"none", borderLeft:"1px solid #ffffff0e", color:"#ffffff28", cursor:"pointer", fontSize:11, lineHeight:1, flexShrink:0 }}>x</button>
                </div>
              );
            })}
          </div>
        )}
        {query.active.terms.length > 0 && (
          <>
          <div style={{ marginTop:9, padding:"8px 9px", border:"1px solid #AED6F144", borderRadius:6, background:"linear-gradient(180deg,#AED6F118,#AED6F108)", display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontFamily:mono, fontSize:7, color:"#AED6F1", letterSpacing:1.2, fontWeight:700 }}>RUN QUERY</div>
              <div style={{ fontFamily:mono, fontSize:7.5, color:"#ffffff45", marginTop:2, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>Open this MeSH filter in PubMed</div>
            </div>
            <a href={pubMedUrl} target="_blank" rel="noreferrer" style={{ color:"#091016", background:"#AED6F1", textDecoration:"none", border:"1px solid #D8ECFA", borderRadius:4, padding:"5px 9px", fontFamily:mono, fontSize:8.5, fontWeight:800, letterSpacing:0.4, boxShadow:"0 0 18px #AED6F122", flexShrink:0 }}>
              PubMed ↗
            </a>
          </div>
          <div style={{ fontFamily:mono, fontSize:7, color:"#ffffff18", marginTop:7, display:"flex", gap:10, alignItems:"center" }}>
            <span>★ major topic</span>
            <span>☆ minor topic</span>
            <span style={{ marginLeft:"auto" }}>{query.active.terms.length} term{query.active.terms.length === 1 ? "" : "s"}</span>
          </div>
          </>
        )}
      </div>
    </div>
  );
}

export function MeshInspectorQueryDock({ selected, query }) {
  const [editing, setEditing] = useState(false);
  const [open, setOpen] = useState(false);
  const inputRef = useRef(null);
  const menuRef = useRef(null);
  const color = selected?.color || DEFAULT_BRANCH_COLOR[selected?.branch] || "#ffffff";
  const alreadyIn = selected && query.inActive.has(selected.id);
  const pubMedUrl = query.active ? buildPubMedUrl(query.active.terms) : null;

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

  return (
    <aside style={{
      position:"sticky",
      top:18,
      alignSelf:"start",
      maxHeight:"calc(100vh - 170px)",
      overflowY:"auto",
      background:"#13161d",
      border:"1px solid #ffffff18",
      borderRadius:10,
      boxShadow:"0 12px 34px rgba(0,0,0,0.34),0 0 0 1px #ffffff05",
      fontFamily:mono,
    }}>
      <div style={{ height:3, background:`linear-gradient(90deg,${color}cc,${color}22,#ffffff0a)` }} />

      <section style={{ padding:"14px 15px 13px", borderBottom:"1px solid #ffffff0d", minHeight:248, boxSizing:"border-box", display:"flex", flexDirection:"column" }}>
        <div style={{ fontSize:7.5, color:color + "aa", letterSpacing:1.6, fontWeight:700, marginBottom:8 }}>
          SELECTED TERM
        </div>
        {selected ? (
          <>
            <div style={{ fontSize:16, color:"#f1f3f4", fontWeight:800, lineHeight:1.22, marginBottom:4, minHeight:39, display:"flex", alignItems:"flex-start" }}>
              {selected.id}
            </div>
            <div style={{ fontSize:8, color:color, marginBottom:10 }}>
              {selected.treeNum || selected.ui || "MeSH"}
            </div>
            <div style={{ fontSize:9, color:"#ffffff9c", lineHeight:1.65, height:98, overflowY:"auto", paddingRight:4, marginBottom:12 }}>
              {selected.note || <span style={{ color:"#ffffff2a", fontStyle:"italic" }}>No scope note on record.</span>}
            </div>
            {!query.active ? (
              <button onClick={() => query.create(selected)} style={{ width:"100%", padding:"8px 10px", fontFamily:mono, fontSize:8.5, fontWeight:800, background:"#ffffff10", border:"1px solid #ffffff28", borderRadius:5, color:"#e8e8e8", cursor:"pointer", letterSpacing:0.5 }}>
                + create query with this term
              </button>
            ) : alreadyIn ? (
              <div style={{ padding:"7px 10px", border:"1px solid #ffffff12", borderRadius:5, color:"#ffffff34", fontSize:8.5, textAlign:"center" }}>
                already in active query
              </div>
            ) : (
              <button onClick={() => query.add(selected)} style={{ width:"100%", padding:"8px 10px", fontFamily:mono, fontSize:8.5, fontWeight:800, background:`${color}18`, border:`1px solid ${color}55`, borderRadius:5, color, cursor:"pointer", letterSpacing:0.5 }}>
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

      <section style={{ padding:"13px 15px 15px" }}>
        {!query.active ? (
          <button onClick={query.createEmpty} style={{ width:"100%", padding:"8px 10px", fontFamily:mono, fontSize:8.5, fontWeight:800, background:"#ffffff0c", border:"1px dashed #ffffff30", borderRadius:5, color:"#ffffff86", cursor:"pointer" }}>
            + new query
          </button>
        ) : (
          <>
            <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:10, position:"relative" }}>
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
                <button onClick={query.queries.length > 1 ? () => setOpen(v => !v) : undefined} style={{ flex:1, minWidth:0, textAlign:"left", background:"transparent", border:"none", padding:0, fontFamily:mono, fontSize:12, color:"#e8e8e8", fontWeight:800, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", cursor:query.queries.length > 1 ? "pointer" : "default" }}>
                  {query.active.name}
                </button>
              )}
              {!editing && (
                <button onClick={() => setEditing(true)} title="Rename query" style={{ background:"transparent", border:"none", color:"#ffffff35", cursor:"pointer", fontSize:11, padding:2 }}>✎</button>
              )}
              <button onClick={query.createEmpty} title="New query" style={{ background:"#ffffff08", border:"1px dashed #ffffff32", borderRadius:4, color:"#ffffff74", cursor:"pointer", fontFamily:mono, fontSize:10, fontWeight:800, padding:"3px 8px" }}>+</button>
            </div>

            {query.active.terms.length === 0 ? (
              <div style={{ fontSize:8.5, color:"#ffffff24", lineHeight:1.7, padding:"7px 0 4px" }}>
                no terms yet - select a term and add it above
              </div>
            ) : (
              <div style={{ display:"flex", flexWrap:"wrap", gap:5, maxHeight:138, overflowY:"auto", paddingRight:2 }}>
                {query.active.terms.map(term => {
                  const termColor = term.color || DEFAULT_BRANCH_COLOR[term.branch] || "#aaa";
                  return (
                    <div key={term.id} style={{ display:"flex", alignItems:"center", background:"#ffffff0b", border:"1px solid #ffffff18", borderRadius:5, overflow:"hidden", outline:term.major ? "1px solid #FFD70044" : "none" }}>
                      <button onClick={() => query.toggleMajor(term.id)} title={term.major ? "major topic" : "minor topic"} style={{ padding:"4px 6px", background:"transparent", border:"none", color:term.major ? "#FFD700" : "#ffffff30", cursor:"pointer", fontSize:10, lineHeight:1, flexShrink:0 }}>
                        {term.major ? "★" : "☆"}
                      </button>
                      <span style={{ fontSize:8.5, color:term.major ? "#FFD700cc" : termColor + "dd", paddingRight:2, fontWeight:term.major ? 700 : 500 }}>{term.id}</span>
                      <button onClick={() => query.remove(term.id)} style={{ padding:"4px 6px", background:"transparent", border:"none", borderLeft:"1px solid #ffffff0e", color:"#ffffff30", cursor:"pointer", fontSize:11, lineHeight:1, flexShrink:0 }}>x</button>
                    </div>
                  );
                })}
              </div>
            )}

            {query.active.terms.length > 0 && (
              <>
                <div style={{ marginTop:11, padding:"10px 10px", border:"1px solid #AED6F144", borderRadius:7, background:"linear-gradient(180deg,#AED6F118,#AED6F108)", display:"flex", alignItems:"center", gap:9 }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:7, color:"#AED6F1", letterSpacing:1.3, fontWeight:800 }}>RUN QUERY</div>
                    <div style={{ fontSize:7.5, color:"#ffffff48", marginTop:3, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>Open this MeSH filter in PubMed</div>
                  </div>
                  <a href={pubMedUrl} target="_blank" rel="noreferrer" style={{ color:"#091016", background:"#AED6F1", textDecoration:"none", border:"1px solid #D8ECFA", borderRadius:5, padding:"6px 10px", fontSize:8.5, fontWeight:900, letterSpacing:0.4, boxShadow:"0 0 18px #AED6F122", flexShrink:0 }}>
                    PubMed ↗
                  </a>
                </div>
                <div style={{ fontSize:7, color:"#ffffff20", marginTop:8, display:"flex", gap:10, alignItems:"center" }}>
                  <span>★ major</span>
                  <span>☆ minor</span>
                  <span style={{ marginLeft:"auto" }}>{query.active.terms.length} term{query.active.terms.length === 1 ? "" : "s"}</span>
                </div>
              </>
            )}
          </>
        )}
      </section>
    </aside>
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
    if (open) setTimeout(() => inputRef.current?.focus(), 0);
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
  const treeOrder = Object.keys(grouped).sort((a, b) => grouped[b].length - grouped[a].length || a.localeCompare(b));

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
                        <button onClick={() => { onNavigate?.(result); onClose(); }} style={{ padding:"3px 9px", fontFamily:mono, fontSize:8, background:"#ffffff0e", border:"1px solid #ffffff22", borderRadius:3, color:"#ccc", cursor:"pointer" }}>navigate</button>
                        <button onClick={() => queryBuilder.add({ id:result.name, branch:tree.toLowerCase(), color:meta.color, treeNum:result.treeNum, ui:result.ui, note })} style={{ padding:"3px 9px", fontFamily:mono, fontSize:8, fontWeight:700, background:meta.color + "22", border:`1px solid ${meta.color}55`, borderRadius:3, color:meta.color, cursor:"pointer" }}>+ query</button>
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
