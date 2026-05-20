import { useState } from "react";

// ── DATA ───────────────────────────────────────────────────────────────────
const AGE_GROUPS = [
  { id:"Infant, Newborn", label:"Infant, Newborn", depth:3, note:"Birth–1 month" },
  { id:"Infant, Premature", label:"Infant, Premature", depth:3, note:"< 37 weeks" },
  { id:"Infant", label:"Infant", depth:2, note:"Birth–23 months" },
  { id:"Child, Preschool", label:"Child, Preschool", depth:3, note:"2–5 years" },
  { id:"Child", label:"Child", depth:2, note:"2–12 years" },
  { id:"Adolescent", label:"Adolescent", depth:2, note:"13–18 years" },
  { id:"Young Adult", label:"Young Adult", depth:3, note:"19–24 years" },
  { id:"Adult", label:"Adult", depth:2, note:"19+ years" },
  { id:"Middle Aged", label:"Middle Aged", depth:3, note:"45–64 years" },
  { id:"Aged", label:"Aged", depth:3, note:"65–79 years" },
  { id:"Aged, 80 and over", label:"Aged, 80 and over", depth:4, note:"80+" },
  { id:"Birth Cohort", label:"Birth Cohort", depth:2, note:"Same birth year group" },
];

const OCC_GROUPS = [
  { id:"Administrative Personnel", label:"Administrative Personnel", depth:2 },
  { id:"Astronauts", label:"Astronauts", depth:2 },
  { id:"Correctional Facilities Personnel", label:"Correctional Facilities Personnel", depth:2 },
  { id:"Counselors", label:"Counselors", depth:2 },
  { id:"Ethicists", label:"Ethicists", depth:2 },
  { id:"Farmers", label:"Farmers", depth:2 },
  { id:"Foreign Professional Personnel", label:"Foreign Professional Personnel", depth:2 },
  { id:"Frontline Workers", label:"Frontline Workers", depth:2,
    children:["Emergency Responders","EMTs","Firefighters","Paramedics","Police"] },
  { id:"Government Employees", label:"Government Employees", depth:2 },
  { id:"Health Personnel", label:"Health Personnel", depth:2,
    children:["Nurses","Pharmacists","Allied Health","Physicians →"] },
  { id:"Physicians", label:"Physicians", depth:3,
    children:["Allergists","Pediatricians","Pulmonologists","Dermatologists","+ 27 more"] },
  { id:"Inventors", label:"Inventors", depth:2 },
  { id:"Laboratory Personnel", label:"Laboratory Personnel", depth:2 },
  { id:"Lawyers", label:"Lawyers", depth:2 },
  { id:"Librarians", label:"Librarians", depth:2 },
  { id:"Metal Workers", label:"Metal Workers", depth:2 },
  { id:"Military Personnel", label:"Military Personnel", depth:2 },
  { id:"Miners", label:"Miners", depth:2 },
  { id:"Educational Personnel", label:"Educational Personnel", depth:2 },
  { id:"Personal Trainers", label:"Personal Trainers", depth:2 },
  { id:"Pilots", label:"Pilots", depth:2 },
  { id:"Power Plant Operators", label:"Power Plant Operators", depth:2 },
  { id:"Religious Personnel", label:"Religious Personnel", depth:2 },
  { id:"Research Personnel", label:"Research Personnel", depth:2 },
  { id:"Social Workers", label:"Social Workers", depth:2 },
  { id:"Truck Drivers", label:"Truck Drivers", depth:2 },
];

const PERSONS_DIRECT = [
  "Abortion Applicants","Adult Children","Alcoholics","Athletes","Bedridden Persons",
  "Caregivers","Child, Abandoned","Child, Adopted","Child, Exceptional",
  "Child of Impaired Parents","Child, Foster","Child, Orphaned","Child, Unwanted",
  "Consultants","Crime Victims","Criminals","Persons with Disabilities",
  "Disaster Victims","Drug Users","Emigrants and Immigrants","Enslaved Persons",
  "Ex-Smokers","Famous Persons","Friends","Grandparents",
  "Health Disparate Minority and Vulnerable Populations","Homebound Persons",
  "Ill-Housed Persons","Jehovah's Witnesses","Legal Guardians","Medically Uninsured",
  "Men","Mentors","Minors","Missionaries","Multiple Birth Offspring","Non-Smokers",
  "Parents","Patients","Pedestrians","Population Groups","Prisoners","Refugees",
  "Research Subjects","Sex Workers","Sexual Partners","Siblings","Single Person",
  "Smokers","Spouses","Students","Survivors","Terminally Ill","Tissue Donors",
  "Transgender Persons","Transients and Migrants","Transplant Recipients",
  "Unvaccinated Persons","Vegetarians","Veterans","Visitors to Patients",
  "Volunteers","Women","Working Poor",
];

const BRANCHES = [
  { id:"age", label:"Age Groups", color:"#6DB8E8", count: AGE_GROUPS.length, note:"Sequential, biological" },
  { id:"occ", label:"Occupational Groups", color:"#E8A06D", count: OCC_GROUPS.length, note:"Hierarchical, deep" },
  { id:"direct", label:"Persons (other)", color:"#7DC48B", count: PERSONS_DIRECT.length, note:"Flat, varied" },
];

const VIEWS = [
  { id:"census", label:"1. Census Grid" },
  { id:"rings", label:"2. Concentric Rings" },
  { id:"tagcloud", label:"3. Tag Cloud" },
  { id:"swimlanes", label:"4. Swim Lanes" },
  { id:"cardwall", label:"5. Card Wall" },
];

// ── SHARED STYLES ──────────────────────────────────────────────────────────
const mono = "'JetBrains Mono', 'Fira Mono', monospace";
const sans = "'DM Sans', 'Inter', sans-serif";

// ── 1. CENSUS GRID ─────────────────────────────────────────────────────────
function CensusGrid() {
  const [hovered, setHovered] = useState(null);

  // Build a grid: rows = ways of categorizing, cols = branches
  const rows = [
    { label:"By Age",         items: AGE_GROUPS.slice(0,6).map(a=>a.label), branch:"age" },
    { label:"By Profession",  items: OCC_GROUPS.slice(0,6).map(o=>o.label), branch:"occ" },
    { label:"By Role",        items: ["Patients","Caregivers","Volunteers","Research Subjects","Consultants","Mentors"], branch:"direct" },
    { label:"By Status",      items: ["Smokers","Ex-Smokers","Non-Smokers","Alcoholics","Drug Users","Veterans"], branch:"direct" },
    { label:"By Circumstance",items: ["Refugees","Prisoners","Ill-Housed Persons","Disaster Victims","Emigrants and Immigrants","Homebound Persons"], branch:"direct" },
    { label:"By Identity",    items: ["Men","Women","Transgender Persons","Siblings","Spouses","Single Person"], branch:"direct" },
  ];

  const branchColor = { age:"#6DB8E8", occ:"#E8A06D", direct:"#7DC48B" };

  return (
    <div style={{ fontFamily: mono, padding:24, height:"100%", overflowY:"auto", background:"#0f1117" }}>
      <div style={{ marginBottom:20 }}>
        <div style={{ fontSize:11, color:"#ffffff33", letterSpacing:3, marginBottom:4 }}>NAMED GROUPS · M01</div>
        <div style={{ fontSize:18, color:"#e8e8e8", fontWeight:700 }}>Census Grid</div>
        <div style={{ fontSize:10, color:"#ffffff44", marginTop:4 }}>Persons organized by how they are classified</div>
      </div>

      {/* Row labels + grid */}
      <div style={{ display:"grid", gridTemplateColumns:"120px repeat(6, 1fr)", gap:3 }}>
        {/* Header */}
        <div/>
        {[1,2,3,4,5,6].map(n => (
          <div key={n} style={{ fontSize:8, color:"#ffffff22", textAlign:"center", padding:"4px 0" }}>col {n}</div>
        ))}

        {rows.map(row => (
          <>
            <div key={row.label+"label"} style={{
              fontSize:9, color: branchColor[row.branch],
              display:"flex", alignItems:"center",
              paddingRight:8, letterSpacing:0.5
            }}>{row.label}</div>
            {row.items.map((item, i) => (
              <div
                key={item}
                onMouseEnter={() => setHovered(item)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  padding:"8px 6px",
                  background: hovered===item ? branchColor[row.branch]+"33" : "#ffffff08",
                  border:`1px solid ${hovered===item ? branchColor[row.branch]+"88" : "#ffffff0a"}`,
                  borderRadius:3,
                  fontSize:8.5,
                  color: hovered===item ? "#e8e8e8" : "#ffffff77",
                  cursor:"pointer",
                  transition:"all 0.12s",
                  lineHeight:1.4,
                  textAlign:"center"
                }}
              >{item}</div>
            ))}
          </>
        ))}
      </div>

      {/* Legend */}
      <div style={{ display:"flex", gap:16, marginTop:20 }}>
        {BRANCHES.map(b => (
          <div key={b.id} style={{ display:"flex", alignItems:"center", gap:6 }}>
            <div style={{ width:10, height:10, borderRadius:2, background:b.color }}/>
            <span style={{ fontSize:9, color:"#ffffff55" }}>{b.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 2. CONCENTRIC RINGS ────────────────────────────────────────────────────
function ConcentricRings() {
  const [hovered, setHovered] = useState(null);
  const cx = 280, cy = 280;
  const rings = [
    { r:52,  items:[{label:"Persons", color:"#ffffff", isMeta:true}] },
    { r:100, items: BRANCHES.map(b=>({label:b.label, color:b.color, count:b.count})) },
    { r:165, items:[
      ...AGE_GROUPS.slice(0,4).map(a=>({label:a.label, color:"#6DB8E8"})),
      ...OCC_GROUPS.slice(0,5).map(o=>({label:o.label, color:"#E8A06D"})),
      ...PERSONS_DIRECT.slice(0,5).map(p=>({label:p, color:"#7DC48B"})),
    ]},
    { r:240, items:[
      ...AGE_GROUPS.slice(4).map(a=>({label:a.label, color:"#6DB8E8"})),
      ...OCC_GROUPS.slice(5,12).map(o=>({label:o.label, color:"#E8A06D"})),
      ...PERSONS_DIRECT.slice(5,18).map(p=>({label:p, color:"#7DC48B"})),
    ]},
  ];

  return (
    <div style={{ background:"#0a0c10", height:"100%", display:"flex", overflow:"hidden" }}>
      <svg width={560} height={560} style={{ flexShrink:0 }}>
        {/* ring circles */}
        {rings.map((ring,ri) => (
          <circle key={ri} cx={cx} cy={cy} r={ring.r}
            fill="none" stroke="#ffffff08" strokeWidth={ri===0?0:1}/>
        ))}

        {/* center */}
        <circle cx={cx} cy={cy} r={48} fill="#ffffff12"/>
        <text x={cx} y={cy-6} textAnchor="middle" fill="#e8e8e8"
          fontFamily={mono} fontSize={11} fontWeight={700}>Persons</text>
        <text x={cx} y={cy+10} textAnchor="middle" fill="#ffffff55"
          fontFamily={mono} fontSize={8}>M01</text>
        <text x={cx} y={cy+24} textAnchor="middle" fill="#ffffff33"
          fontFamily={mono} fontSize={7}>~400 terms</text>

        {/* ring 1: branches */}
        {BRANCHES.map((b,i) => {
          const angle = (i / BRANCHES.length) * Math.PI * 2 - Math.PI/2;
          const x = cx + Math.cos(angle) * 100;
          const y = cy + Math.sin(angle) * 100;
          const isHov = hovered === b.label;
          return (
            <g key={b.id} onMouseEnter={()=>setHovered(b.label)} onMouseLeave={()=>setHovered(null)}
              style={{cursor:"pointer"}}>
              <circle cx={x} cy={y} r={isHov?26:22}
                fill={b.color+(isHov?"44":"22")} stroke={b.color+(isHov?"cc":"66")} strokeWidth={1.5}
                style={{transition:"all 0.15s"}}/>
              <text x={x} y={y-4} textAnchor="middle" fill={b.color}
                fontFamily={mono} fontSize={7} fontWeight={700}>
                {b.label.split(" ").slice(0,1)[0]}
              </text>
              <text x={x} y={y+8} textAnchor="middle" fill={b.color+"aa"}
                fontFamily={mono} fontSize={6}>{b.count} terms</text>
            </g>
          );
        })}

        {/* ring 2: sample terms */}
        {rings[2].items.map((item,i) => {
          const angle = (i / rings[2].items.length) * Math.PI * 2 - Math.PI/2;
          const x = cx + Math.cos(angle) * 165;
          const y = cy + Math.sin(angle) * 165;
          const isHov = hovered === item.label;
          const words = item.label.split(/[ ,]+/);
          return (
            <g key={item.label} onMouseEnter={()=>setHovered(item.label)} onMouseLeave={()=>setHovered(null)}
              style={{cursor:"pointer"}}>
              <circle cx={x} cy={y} r={isHov?18:14}
                fill={item.color+(isHov?"33":"11")} stroke={item.color+(isHov?"aa":"44")} strokeWidth={1}
                style={{transition:"all 0.12s"}}/>
              <text x={x} y={y+3} textAnchor="middle" fill={isHov?"#e8e8e8":item.color+"cc"}
                fontFamily={mono} fontSize={5.5}>
                {words[0]}
              </text>
            </g>
          );
        })}

        {/* ring 3: outer dots */}
        {rings[3].items.map((item,i) => {
          const angle = (i / rings[3].items.length) * Math.PI * 2 - Math.PI/2;
          const x = cx + Math.cos(angle) * 240;
          const y = cy + Math.sin(angle) * 240;
          return (
            <circle key={item.label} cx={x} cy={y} r={5}
              fill={item.color+"55"} stroke={item.color+"88"} strokeWidth={0.5}
              onMouseEnter={()=>setHovered(item.label)} onMouseLeave={()=>setHovered(null)}
              style={{cursor:"pointer", transition:"all 0.1s"}}/>
          );
        })}
      </svg>

      {/* Hover detail */}
      <div style={{ flex:1, padding:24, fontFamily:mono, display:"flex", flexDirection:"column", justifyContent:"center" }}>
        <div style={{ fontSize:9, color:"#ffffff33", letterSpacing:3, marginBottom:16 }}>NAMED GROUPS · M01</div>
        {hovered ? (
          <div style={{ animation:"fadeIn 0.15s ease" }}>
            <div style={{ fontSize:16, color:"#e8e8e8", fontWeight:700, marginBottom:8 }}>{hovered}</div>
            <div style={{ fontSize:9, color:"#ffffff44" }}>MeSH M01 · Named Groups</div>
          </div>
        ) : (
          <div>
            <div style={{ fontSize:16, color:"#e8e8e8", fontWeight:700, marginBottom:8 }}>Concentric Rings</div>
            <div style={{ fontSize:10, color:"#ffffff44", lineHeight:1.8 }}>
              Branches radiate outward from<br/>the Persons root term.<br/><br/>
              Hover any node to inspect.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── 3. TAG CLOUD ───────────────────────────────────────────────────────────
function TagCloud() {
  const [filter, setFilter] = useState("all");
  const [hovered, setHovered] = useState(null);

  // Deterministic positions using golden ratio
  const allTerms = [
    ...AGE_GROUPS.map(a=>({...a, branch:"age", color:"#6DB8E8", size: a.depth===2?14:11})),
    ...OCC_GROUPS.map(o=>({id:o.id, label:o.label, branch:"occ", color:"#E8A06D", size: o.children?14:11})),
    ...PERSONS_DIRECT.map((p,i)=>({id:p, label:p, branch:"direct", color:"#7DC48B", size:10})),
  ];

  // Layout: simple grid-wrapping with jitter
  const seed = (i) => ((i * 2654435761) >>> 0) / 4294967296;

  const visible = filter==="all" ? allTerms : allTerms.filter(t=>t.branch===filter);

  return (
    <div style={{ background:"#0f1117", height:"100%", display:"flex", flexDirection:"column", overflow:"hidden" }}>
      {/* Header */}
      <div style={{ padding:"16px 24px 12px", borderBottom:"1px solid #ffffff0e", flexShrink:0 }}>
        <div style={{ fontSize:9, color:"#ffffff33", letterSpacing:3, fontFamily:mono, marginBottom:4 }}>NAMED GROUPS · M01</div>
        <div style={{ fontSize:16, color:"#e8e8e8", fontFamily:mono, fontWeight:700, marginBottom:10 }}>Tag Cloud</div>
        <div style={{ display:"flex", gap:8 }}>
          {[{id:"all",label:"All",color:"#ffffff"},...BRANCHES.map(b=>({id:b.id,label:b.label,color:b.color}))].map(f=>(
            <button key={f.id} onClick={()=>setFilter(f.id)} style={{
              padding:"4px 12px", fontFamily:mono, fontSize:9,
              background: filter===f.id ? f.color+"33" : "transparent",
              border:`1px solid ${filter===f.id ? f.color : "#ffffff22"}`,
              borderRadius:3, color: filter===f.id ? f.color : "#ffffff55",
              cursor:"pointer"
            }}>{f.label.split(" ")[0]}</button>
          ))}
        </div>
      </div>

      {/* Cloud */}
      <div style={{ flex:1, overflowY:"auto", padding:"16px 20px", display:"flex", flexWrap:"wrap", gap:6, alignContent:"flex-start" }}>
        {visible.map((term, i) => {
          const jitter = seed(i) > 0.5;
          const isHov = hovered===term.id;
          return (
            <div
              key={term.id}
              onMouseEnter={()=>setHovered(term.id)}
              onMouseLeave={()=>setHovered(null)}
              style={{
                padding: term.size >= 14 ? "5px 12px" : "3px 8px",
                fontFamily:mono,
                fontSize:term.size,
                color: isHov ? "#111" : term.color,
                background: isHov ? term.color : term.color+"18",
                border:`1px solid ${term.color}${isHov?"":"44"}`,
                borderRadius:3,
                cursor:"pointer",
                transition:"all 0.12s",
                whiteSpace:"nowrap",
                fontWeight: term.size>=14 ? 700 : 400,
                marginTop: jitter ? 4 : 0,
              }}
            >{term.label}</div>
          );
        })}
      </div>

      {/* Hovered detail */}
      {hovered && (
        <div style={{
          padding:"10px 24px", borderTop:"1px solid #ffffff0e",
          fontFamily:mono, fontSize:9, color:"#ffffff55", flexShrink:0
        }}>
          {hovered} · {allTerms.find(t=>t.id===hovered)?.branch} group
        </div>
      )}
    </div>
  );
}

// ── 4. SWIM LANES ──────────────────────────────────────────────────────────
function SwimLanes() {
  const [hovered, setHovered] = useState(null);

  return (
    <div style={{ background:"#0f1117", height:"100%", display:"flex", flexDirection:"column", overflow:"hidden" }}>
      <div style={{ padding:"16px 24px 12px", borderBottom:"1px solid #ffffff0e", flexShrink:0 }}>
        <div style={{ fontSize:9, color:"#ffffff33", letterSpacing:3, fontFamily:mono, marginBottom:4 }}>NAMED GROUPS · M01</div>
        <div style={{ fontSize:16, color:"#e8e8e8", fontFamily:mono, fontWeight:700 }}>Swim Lanes</div>
        <div style={{ fontSize:9, color:"#ffffff33", fontFamily:mono, marginTop:3 }}>Each branch rendered according to its own structure</div>
      </div>

      <div style={{ flex:1, display:"flex", overflow:"hidden" }}>

        {/* Lane 1: Age Groups — timeline/spectrum */}
        <div style={{ flex:1, borderRight:"1px solid #ffffff0a", display:"flex", flexDirection:"column", overflow:"hidden" }}>
          <div style={{ padding:"12px 16px 8px", borderBottom:"1px solid #6DB8E822", flexShrink:0 }}>
            <div style={{ fontSize:8, color:"#6DB8E8", fontFamily:mono, letterSpacing:2 }}>AGE GROUPS</div>
            <div style={{ fontSize:8, color:"#ffffff33", fontFamily:mono, marginTop:2 }}>Sequential · biological timeline</div>
          </div>
          {/* Timeline spine */}
          <div style={{ flex:1, overflowY:"auto", padding:"16px 16px", position:"relative" }}>
            <div style={{ position:"absolute", left:32, top:24, bottom:24, width:2, background:"#6DB8E833" }}/>
            {AGE_GROUPS.map((term,i) => (
              <div key={term.id}
                onMouseEnter={()=>setHovered(term.id)}
                onMouseLeave={()=>setHovered(null)}
                style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10, cursor:"pointer" }}>
                <div style={{
                  width: 12, height:12, borderRadius:"50%", flexShrink:0, zIndex:1,
                  background: hovered===term.id ? "#6DB8E8" : "#6DB8E855",
                  border:"2px solid #6DB8E8",
                  marginLeft:26,
                  transition:"all 0.12s"
                }}/>
                <div>
                  <div style={{ fontFamily:mono, fontSize:10, color: hovered===term.id?"#e8e8e8":"#aaa", lineHeight:1.3 }}>
                    {term.label}
                  </div>
                  <div style={{ fontFamily:mono, fontSize:8, color:"#ffffff33" }}>{term.note}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Lane 2: Occupational Groups — nested list */}
        <div style={{ flex:1.2, borderRight:"1px solid #ffffff0a", display:"flex", flexDirection:"column", overflow:"hidden" }}>
          <div style={{ padding:"12px 16px 8px", borderBottom:"1px solid #E8A06D22", flexShrink:0 }}>
            <div style={{ fontSize:8, color:"#E8A06D", fontFamily:mono, letterSpacing:2 }}>OCCUPATIONAL GROUPS</div>
            <div style={{ fontSize:8, color:"#ffffff33", fontFamily:mono, marginTop:2 }}>Hierarchical · some terms go 4 levels deep</div>
          </div>
          <div style={{ flex:1, overflowY:"auto", padding:"10px 12px" }}>
            {OCC_GROUPS.map(term => (
              <div key={term.id}>
                <div
                  onMouseEnter={()=>setHovered(term.id)}
                  onMouseLeave={()=>setHovered(null)}
                  style={{
                    padding:"5px 8px",
                    fontFamily:mono, fontSize:10,
                    color: hovered===term.id ? "#E8A06D" : "#aaa",
                    borderLeft:`2px solid ${hovered===term.id?"#E8A06D":"#E8A06D33"}`,
                    marginBottom:2, cursor:"pointer",
                    background: hovered===term.id ? "#E8A06D11" : "transparent",
                    transition:"all 0.1s",
                    display:"flex", alignItems:"center", gap:6
                  }}>
                  <span>{term.label}</span>
                  {term.children && (
                    <span style={{ fontSize:7, color:"#E8A06D55", marginLeft:"auto" }}>
                      +{term.children.length}
                    </span>
                  )}
                </div>
                {term.children && hovered===term.id && (
                  <div style={{ paddingLeft:16, marginBottom:4 }}>
                    {term.children.map(c => (
                      <div key={c} style={{ fontFamily:mono, fontSize:8, color:"#E8A06D88", padding:"2px 6px", borderLeft:"1px solid #E8A06D22" }}>
                        {c}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Lane 3: Persons Direct — tag wrap */}
        <div style={{ flex:1.5, display:"flex", flexDirection:"column", overflow:"hidden" }}>
          <div style={{ padding:"12px 16px 8px", borderBottom:"1px solid #7DC48B22", flexShrink:0 }}>
            <div style={{ fontSize:8, color:"#7DC48B", fontFamily:mono, letterSpacing:2 }}>PERSONS (OTHER)</div>
            <div style={{ fontSize:8, color:"#ffffff33", fontFamily:mono, marginTop:2 }}>Flat · mixed · {PERSONS_DIRECT.length} terms</div>
          </div>
          <div style={{ flex:1, overflowY:"auto", padding:"10px 12px", display:"flex", flexWrap:"wrap", gap:4, alignContent:"flex-start" }}>
            {PERSONS_DIRECT.map(p => (
              <div
                key={p}
                onMouseEnter={()=>setHovered(p)}
                onMouseLeave={()=>setHovered(null)}
                style={{
                  padding:"3px 8px",
                  fontFamily:mono, fontSize:8.5,
                  color: hovered===p ? "#111" : "#7DC48B",
                  background: hovered===p ? "#7DC48B" : "#7DC48B11",
                  border:"1px solid #7DC48B44",
                  borderRadius:2, cursor:"pointer",
                  transition:"all 0.1s",
                  whiteSpace:"nowrap"
                }}
              >{p}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 5. CARD WALL ───────────────────────────────────────────────────────────
function CardWall() {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [hovered, setHovered] = useState(null);

  const allCards = [
    ...AGE_GROUPS.map(a=>({id:a.id, label:a.label, branch:"age", color:"#6DB8E8", note:a.note||"", depth:a.depth})),
    ...OCC_GROUPS.map(o=>({id:o.id, label:o.label, branch:"occ", color:"#E8A06D", note:o.children?`${o.children.length} sub-terms`:"", depth:o.depth})),
    ...PERSONS_DIRECT.map(p=>({id:p, label:p, branch:"direct", color:"#7DC48B", note:"", depth:1})),
  ];

  const visible = allCards
    .filter(c => filter==="all" || c.branch===filter)
    .filter(c => !search || c.label.toLowerCase().includes(search.toLowerCase()));

  const branchLabel = { age:"Age Groups", occ:"Occupational Groups", direct:"Persons (other)" };
  const branchColor = { age:"#6DB8E8", occ:"#E8A06D", direct:"#7DC48B" };

  return (
    <div style={{ background:"#0f1117", height:"100%", display:"flex", flexDirection:"column", overflow:"hidden" }}>
      {/* Header */}
      <div style={{ padding:"14px 20px 10px", borderBottom:"1px solid #ffffff0e", flexShrink:0 }}>
        <div style={{ fontSize:9, color:"#ffffff33", letterSpacing:3, fontFamily:mono, marginBottom:4 }}>NAMED GROUPS · M01</div>
        <div style={{ fontSize:16, color:"#e8e8e8", fontFamily:mono, fontWeight:700, marginBottom:10 }}>Card Wall</div>

        {/* Controls */}
        <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
          <input
            value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="search terms..."
            style={{
              padding:"5px 10px", fontFamily:mono, fontSize:10,
              background:"#ffffff0a", border:"1px solid #ffffff22",
              borderRadius:3, color:"#e8e8e8", outline:"none", width:180
            }}
          />
          {[{id:"all",label:"All",color:"#ffffff"},...BRANCHES.map(b=>({id:b.id,label:b.label,color:b.color}))].map(f=>(
            <button key={f.id} onClick={()=>setFilter(f.id)} style={{
              padding:"4px 12px", fontFamily:mono, fontSize:9,
              background: filter===f.id ? f.color+"22" : "transparent",
              border:`1px solid ${filter===f.id ? f.color : "#ffffff22"}`,
              borderRadius:3, color: filter===f.id ? f.color : "#ffffff44",
              cursor:"pointer"
            }}>{f.id==="all" ? "All" : f.label.split(" ")[0]}</button>
          ))}
          <span style={{ fontFamily:mono, fontSize:9, color:"#ffffff33", marginLeft:"auto" }}>
            {visible.length} terms
          </span>
        </div>
      </div>

      {/* Cards */}
      <div style={{
        flex:1, overflowY:"auto", padding:16,
        display:"grid",
        gridTemplateColumns:"repeat(auto-fill, minmax(160px, 1fr))",
        gap:6,
        alignContent:"flex-start"
      }}>
        {visible.map((card,i) => {
          const isHov = hovered===card.id;
          return (
            <div
              key={card.id}
              onMouseEnter={()=>setHovered(card.id)}
              onMouseLeave={()=>setHovered(null)}
              style={{
                padding:"10px 12px",
                background: isHov ? card.color+"22" : "#ffffff06",
                border:`1px solid ${isHov ? card.color+"88" : "#ffffff0e"}`,
                borderLeft:`3px solid ${card.color}${isHov?"":"55"}`,
                borderRadius:3,
                cursor:"pointer",
                transition:"all 0.12s",
                animation:"fadeIn 0.2s ease",
                animationDelay:`${Math.min(i*0.01, 0.3)}s`,
                animationFillMode:"both"
              }}
            >
              <div style={{ fontFamily:mono, fontSize:10, color: isHov?"#e8e8e8":"#aaa", lineHeight:1.4, marginBottom:4 }}>
                {card.label}
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <span style={{ fontFamily:mono, fontSize:7, color:branchColor[card.branch], letterSpacing:1 }}>
                  {branchLabel[card.branch]?.split(" ")[0].toUpperCase()}
                </span>
                <span style={{ fontFamily:mono, fontSize:7, color:"#ffffff22" }}>
                  L{card.depth}
                </span>
              </div>
              {card.note && isHov && (
                <div style={{ fontFamily:mono, fontSize:8, color:"#ffffff55", marginTop:4, lineHeight:1.4 }}>
                  {card.note}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <style>{`@keyframes fadeIn { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }`}</style>
    </div>
  );
}

// ── APP ────────────────────────────────────────────────────────────────────
export default function MeshConcepts() {
  const [activeView, setActiveView] = useState("census");

  const components = {
    census: CensusGrid,
    rings: ConcentricRings,
    tagcloud: TagCloud,
    swimlanes: SwimLanes,
    cardwall: CardWall,
  };
  const Active = components[activeView];

  return (
    <div style={{ width:"100%", height:"100vh", display:"flex", flexDirection:"column", fontFamily:mono, background:"#0a0c10" }}>
      <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=DM+Sans:wght@400;500&display=swap" rel="stylesheet"/>

      {/* Nav */}
      <div style={{
        display:"flex", alignItems:"center", gap:0,
        borderBottom:"2px solid #ffffff12",
        flexShrink:0, background:"#0a0c10",
        overflowX:"auto"
      }}>
        <div style={{ padding:"12px 20px", fontFamily:mono, fontSize:9, color:"#ffffff33", letterSpacing:2, flexShrink:0 }}>
          M01 CONCEPTS
        </div>
        {VIEWS.map(v => (
          <button
            key={v.id}
            onClick={() => setActiveView(v.id)}
            style={{
              padding:"12px 18px",
              fontFamily:mono, fontSize:10,
              background:"transparent",
              border:"none",
              borderBottom: activeView===v.id ? "2px solid #AED6F1" : "2px solid transparent",
              marginBottom:"-2px",
              color: activeView===v.id ? "#AED6F1" : "#ffffff44",
              cursor:"pointer", flexShrink:0,
              transition:"all 0.15s"
            }}
          >{v.label}</button>
        ))}
      </div>

      {/* View */}
      <div style={{ flex:1, overflow:"hidden" }}>
        <Active/>
      </div>
    </div>
  );
}
