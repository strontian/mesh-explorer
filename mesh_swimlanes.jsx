import { useState, useCallback } from "react";

// ── DATA ───────────────────────────────────────────────────────────────────

// Age ranges in years (start, end) for the Gantt bars
// null end = open-ended
const AGE_GROUPS = [
  { id:"Infant, Newborn",    label:"Infant, Newborn",    note:"Birth–1 month",     ageStart:0,   ageEnd:0.08,  depth:3, parent:"Infant" },
  { id:"Infant, Premature",  label:"Infant, Premature",  note:"< 37 weeks gestation", ageStart:null, ageEnd:null, depth:3, parent:"Infant", special:true },
  { id:"Infant",             label:"Infant",             note:"Birth–23 months",   ageStart:0,   ageEnd:2,     depth:2 },
  { id:"Child, Preschool",   label:"Child, Preschool",   note:"2–5 years",         ageStart:2,   ageEnd:5,     depth:3, parent:"Child" },
  { id:"Child",              label:"Child",              note:"2–12 years",         ageStart:2,   ageEnd:12,    depth:2 },
  { id:"Birth Cohort",       label:"Birth Cohort",       note:"Same birth year — cross-sectional", ageStart:null, ageEnd:null, depth:2, special:true },
  { id:"Adolescent",         label:"Adolescent",         note:"13–18 years",        ageStart:13,  ageEnd:18,    depth:2 },
  { id:"Young Adult",        label:"Young Adult",        note:"19–24 years",        ageStart:19,  ageEnd:24,    depth:3, parent:"Adult" },
  { id:"Adult",              label:"Adult",              note:"19+ years",           ageStart:19,  ageEnd:null,  depth:2 },
  { id:"Middle Aged",        label:"Middle Aged",        note:"45–64 years",        ageStart:45,  ageEnd:64,    depth:3, parent:"Adult" },
  { id:"Aged",               label:"Aged",               note:"65–79 years",        ageStart:65,  ageEnd:79,    depth:3, parent:"Adult" },
  { id:"Aged, 80 and over",  label:"Aged, 80 and over",  note:"80+",               ageStart:80,  ageEnd:null,  depth:4, parent:"Aged" },
];

// Cross-lane relationships: which age terms relate to which person-direct terms
const AGE_RELATIONS = {
  "Athletes":          ["Adolescent","Young Adult","Adult"],
  "Students":          ["Child","Adolescent","Young Adult","Adult"],
  "Veterans":          ["Adult","Middle Aged","Aged"],
  "Grandparents":      ["Middle Aged","Aged","Aged, 80 and over"],
  "Minors":            ["Infant","Child","Adolescent"],
  "Terminally Ill":    ["Aged","Aged, 80 and over"],
  "Caregivers":        ["Adult","Middle Aged","Aged"],
  "Patients":          ["Infant","Child","Adolescent","Adult","Middle Aged","Aged"],
  "Prisoners":         ["Adolescent","Adult","Middle Aged"],
  "Homebound Persons": ["Aged","Aged, 80 and over"],
};

const OCC_TREE = [
  { id:"Administrative Personnel",         depth:1 },
  { id:"Astronauts",                        depth:1 },
  { id:"Correctional Facilities Personnel", depth:1 },
  { id:"Counselors",                        depth:1 },
  { id:"Ethicists",                         depth:1 },
  { id:"Farmers",                           depth:1 },
  { id:"Foreign Professional Personnel",    depth:1 },
  { id:"Frontline Workers",                 depth:1, children:[
    { id:"Emergency Responders",            depth:2, children:[
      { id:"Emergency Medical Technicians", depth:3 },
      { id:"Firefighters",                  depth:3 },
      { id:"Paramedics",                    depth:3 },
      { id:"Police",                        depth:3 },
    ]},
  ]},
  { id:"Government Employees",              depth:1 },
  { id:"Health Personnel",                  depth:1, children:[
    { id:"Allied Health Personnel",         depth:2 },
    { id:"Nurses",                          depth:2 },
    { id:"Pharmacists",                     depth:2 },
    { id:"Personnel, Hospital",             depth:2 },
    { id:"Physicians",                      depth:2, children:[
      { id:"Allergists",                    depth:3 },
      { id:"Anesthesiologists",             depth:3 },
      { id:"Cardiologists",                 depth:3 },
      { id:"Dermatologists",                depth:3 },
      { id:"Endocrinologists",              depth:3 },
      { id:"Foreign Medical Graduates",     depth:3 },
      { id:"Gastroenterologists",           depth:3 },
      { id:"General Practitioners",         depth:3 },
      { id:"Geriatricians",                 depth:3 },
      { id:"Gynecologists",                 depth:3 },
      { id:"Hospitalists",                  depth:3 },
      { id:"Nephrologists",                 depth:3 },
      { id:"Neurologists",                  depth:3 },
      { id:"Obstetricians",                 depth:3 },
      { id:"Occupational Health Physicians",depth:3 },
      { id:"Oncologists",                   depth:3 },
      { id:"Ophthalmologists",              depth:3 },
      { id:"Osteopathic Physicians",        depth:3 },
      { id:"Otolaryngologists",             depth:3 },
      { id:"Pathologists",                  depth:3 },
      { id:"Pediatricians",                 depth:3 },
      { id:"Physiatrists",                  depth:3 },
      { id:"Physicians, Family",            depth:3 },
      { id:"Physicians, Primary Care",      depth:3 },
      { id:"Physicians, Women",             depth:3 },
      { id:"Psychiatrists",                 depth:3 },
      { id:"Pulmonologists",                depth:3 },
      { id:"Radiologists",                  depth:3 },
      { id:"Rheumatologists",               depth:3 },
      { id:"Surgeons",                      depth:3 },
      { id:"Urologists",                    depth:3 },
    ]},
  ]},
  { id:"Inventors",                         depth:1 },
  { id:"Laboratory Personnel",              depth:1 },
  { id:"Lawyers",                           depth:1 },
  { id:"Librarians",                        depth:1 },
  { id:"Metal Workers",                     depth:1 },
  { id:"Military Personnel",                depth:1 },
  { id:"Miners",                            depth:1 },
  { id:"Educational Personnel",            depth:1 },
  { id:"Personal Trainers",                depth:1 },
  { id:"Pilots",                            depth:1 },
  { id:"Power Plant Operators",            depth:1 },
  { id:"Religious Personnel",              depth:1 },
  { id:"Research Personnel",               depth:1, children:[
    { id:"Scientists",                      depth:2 },
    { id:"Investigators",                   depth:2 },
  ]},
  { id:"Social Workers",                    depth:1 },
  { id:"Truck Drivers",                     depth:1 },
];

const PERSONS_CLUSTERS = [
  { cluster:"Family & Relationships", color:"#C084B8", terms:[
    "Adult Children","Grandparents","Parents","Siblings","Spouses","Friends",
    "Legal Guardians","Multiple Birth Offspring","Single Person","Sexual Partners",
  ]},
  { cluster:"Children (special)", color:"#E8A06D", terms:[
    "Child, Abandoned","Child, Adopted","Child, Exceptional",
    "Child of Impaired Parents","Child, Foster","Child, Orphaned","Child, Unwanted","Minors",
  ]},
  { cluster:"Health Status", color:"#6DB8E8", terms:[
    "Patients","Terminally Ill","Bedridden Persons","Homebound Persons",
    "Persons with Disabilities","Survivors","Tissue Donors","Transplant Recipients",
    "Medically Uninsured","Visitors to Patients",
  ]},
  { cluster:"Social Circumstance", color:"#E8D06D", terms:[
    "Refugees","Prisoners","Ill-Housed Persons","Disaster Victims",
    "Emigrants and Immigrants","Transients and Migrants","Working Poor",
    "Enslaved Persons","Crime Victims","Criminals",
  ]},
  { cluster:"Lifestyle & Behavior", color:"#7DC48B", terms:[
    "Smokers","Ex-Smokers","Non-Smokers","Alcoholics","Drug Users",
    "Athletes","Vegetarians","Sex Workers","Pedestrians",
  ]},
  { cluster:"Identity & Belief", color:"#A084C8", terms:[
    "Men","Women","Transgender Persons","Jehovah's Witnesses","Missionaries",
    "Famous Persons","Veterans","Abortion Applicants",
  ]},
  { cluster:"Research & Care Roles", color:"#84C8B0", terms:[
    "Research Subjects","Volunteers","Caregivers","Consultants",
    "Mentors","Students","Drug Users",
  ]},
  { cluster:"Other", color:"#888888", terms:[
    "Population Groups","Health Disparate Minority and Vulnerable Populations",
    "Unvaccinated Persons","Spouses",
  ]},
];

const ALL_PERSON_TERMS = PERSONS_CLUSTERS.flatMap(c => c.terms.map(t => ({ term:t, cluster:c.cluster, color:c.color })));

const mono = "'JetBrains Mono','Fira Mono',monospace";

// ── AGE GANTT LANE ─────────────────────────────────────────────────────────
const MAX_AGE = 90;

// Fixed column layout: 140px label | 1fr bar | 72px note
// Every row shares the same grid so bars are perfectly aligned
const AGE_ROW_GRID = "140px 1fr 72px";
const AGE_ROW_GAP  = 6;

function AgeBar({ term, hovered, relatedHighlight, onHover }) {
  const pct = (v) => `${(v / MAX_AGE) * 100}%`;
  const isHov     = hovered === term.id;
  const isRelated = relatedHighlight && relatedHighlight.includes(term.id);
  const dimmed    = relatedHighlight && !isRelated && !isHov;
  const color     = "#6DB8E8";
  const indent    = term.depth === 4 ? 18 : term.depth === 3 ? 10 : 0;

  return (
    <div
      onMouseEnter={() => onHover(term.id)}
      onMouseLeave={() => onHover(null)}
      style={{
        display:"grid",
        gridTemplateColumns: AGE_ROW_GRID,
        columnGap: AGE_ROW_GAP,
        alignItems:"center",
        marginBottom:5,
        opacity: dimmed ? 0.25 : 1,
        transition:"opacity 0.15s",
        cursor:"pointer",
      }}
    >
      {/* Label — indentation lives only here, inside the fixed-width cell */}
      <div style={{
        fontFamily:mono, fontSize:9.5,
        color: isHov ? "#e8e8e8" : isRelated ? color : "#999",
        textAlign:"right", lineHeight:1.3,
        fontWeight: term.depth === 2 ? 600 : 400,
        transition:"color 0.12s",
        paddingRight: indent,   // push label left for child terms
      }}>{term.label}</div>

      {/* Bar track — always same width because it's a grid cell */}
      <div style={{ position:"relative", height:20 }}>
        {/* baseline */}
        <div style={{
          position:"absolute", top:"50%", left:0, right:0,
          height:1, background:"#ffffff08", transform:"translateY(-50%)"
        }}/>
        {term.special ? (
          <div style={{
            position:"absolute", top:"50%", left:"5%",
            transform:"translateY(-50%)",
            fontFamily:mono, fontSize:8, color:color+"55", fontStyle:"italic"
          }}>not age-bounded</div>
        ) : (
          <div style={{
            position:"absolute",
            left:  pct(term.ageStart ?? 0),
            right: term.ageEnd === null ? 0 : `${100 - (term.ageEnd / MAX_AGE) * 100}%`,
            top:3, bottom:3,
            background: `${color}${isHov ? "cc" : isRelated ? "88" : "44"}`,
            borderRadius:2,
            border:`1px solid ${color}${isHov ? "ff" : "66"}`,
            transition:"all 0.12s",
          }}/>
        )}
      </div>

      {/* Note */}
      <div style={{
        fontFamily:mono, fontSize:8, lineHeight:1.3,
        color: isHov ? color : "#ffffff33"
      }}>{term.note}</div>
    </div>
  );
}

// ── OCC TREE LANE ──────────────────────────────────────────────────────────
function OccNode({ node, depth, expanded, onToggle, hovered, onHover }) {
  const isExp = expanded.has(node.id);
  const isHov = hovered === node.id;
  const hasChildren = node.children && node.children.length > 0;
  const color = "#E8A06D";
  const indent = depth * 14;

  return (
    <div>
      <div
        onMouseEnter={() => onHover(node.id)}
        onMouseLeave={() => onHover(null)}
        onClick={() => hasChildren && onToggle(node.id)}
        style={{
          display:"flex", alignItems:"center", gap:6,
          padding:`4px 8px 4px ${8 + indent}px`,
          cursor: hasChildren ? "pointer" : "default",
          background: isHov ? `${color}18` : "transparent",
          borderLeft: `2px solid ${isHov ? color : depth === 0 ? color+"44" : color+"22"}`,
          transition:"all 0.1s", marginBottom:1,
        }}
      >
        {/* toggle */}
        <span style={{
          width:10, fontFamily:mono, fontSize:8,
          color: color+"88", flexShrink:0,
          opacity: hasChildren ? 1 : 0
        }}>
          {isExp ? "▾" : "▸"}
        </span>

        <span style={{
          fontFamily:mono,
          fontSize: depth === 0 ? 10.5 : depth === 1 ? 9.5 : 9,
          color: isHov ? "#e8e8e8" : depth === 0 ? "#cccccc" : "#999999",
          fontWeight: depth === 0 ? 600 : 400,
          flex:1, lineHeight:1.3
        }}>{node.id}</span>

        {hasChildren && !isExp && (
          <span style={{ fontFamily:mono, fontSize:7, color:color+"66" }}>
            +{node.children.length}
          </span>
        )}
      </div>

      {hasChildren && isExp && (
        <div style={{ borderLeft:`1px solid ${color}22`, marginLeft: 8 + indent + 6 }}>
          {node.children.map(child => (
            <OccNode key={child.id} node={child} depth={depth+1}
              expanded={expanded} onToggle={onToggle}
              hovered={hovered} onHover={onHover}/>
          ))}
        </div>
      )}
    </div>
  );
}

// ── PERSONS CLUSTER LANE ───────────────────────────────────────────────────
function PersonsLane({ hovered, onHover, relatedHighlight }) {
  return (
    <div style={{ flex:1, overflowY:"auto", padding:"10px 12px" }}>
      {PERSONS_CLUSTERS.map(cluster => (
        <div key={cluster.cluster} style={{ marginBottom:14 }}>
          <div style={{
            fontFamily:mono, fontSize:8, color:cluster.color,
            letterSpacing:1.5, marginBottom:5, paddingLeft:2
          }}>
            {cluster.cluster.toUpperCase()}
          </div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
            {cluster.terms.map(term => {
              const isHov = hovered === term;
              const isRelated = relatedHighlight && relatedHighlight.includes(term);
              const dimmed = relatedHighlight && !isRelated && !isHov;
              return (
                <div
                  key={term}
                  onMouseEnter={() => onHover(term)}
                  onMouseLeave={() => onHover(null)}
                  style={{
                    padding:"3px 8px",
                    fontFamily:mono, fontSize:9,
                    color: isHov ? "#111" : isRelated ? cluster.color : dimmed ? "#ffffff22" : "#aaa",
                    background: isHov ? cluster.color : isRelated ? cluster.color+"33" : cluster.color+"14",
                    border:`1px solid ${isHov ? cluster.color : isRelated ? cluster.color+"88" : cluster.color+"33"}`,
                    borderRadius:2, cursor:"pointer",
                    transition:"all 0.12s",
                    opacity: dimmed ? 0.3 : 1,
                  }}
                >{term}</div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── HEADER ─────────────────────────────────────────────────────────────────
function Header() {
  return (
    <div style={{
      padding:"18px 24px 14px",
      borderBottom:"1px solid #ffffff0e",
      flexShrink:0,
      display:"flex", gap:32, alignItems:"flex-start"
    }}>
      <div>
        <div style={{ fontFamily:mono, fontSize:9, color:"#ffffff33", letterSpacing:3, marginBottom:4 }}>
          MESH TREE · M01
        </div>
        <div style={{ fontFamily:mono, fontSize:20, color:"#e8e8e8", fontWeight:700, letterSpacing:0.5 }}>
          Named Groups
        </div>
        <div style={{ fontFamily:mono, fontSize:10, color:"#ffffff55", marginTop:5, lineHeight:1.7, maxWidth:420 }}>
          Persons as individuals or members of a group — classified by age, occupation,
          health status, social role, or life circumstance.
          One of the most commonly applied secondary tag trees in clinical research.
        </div>
      </div>

      {/* Stats */}
      <div style={{ display:"flex", gap:20, marginLeft:"auto", flexShrink:0 }}>
        {[
          { label:"Total terms", value:"~400", color:"#ffffff" },
          { label:"Max depth", value:"L6", color:"#ffffff" },
          { label:"Age Groups", value:"12", color:"#6DB8E8" },
          { label:"Occ. Groups", value:"26+", color:"#E8A06D" },
          { label:"Persons (other)", value:"64", color:"#7DC48B" },
        ].map(s => (
          <div key={s.label} style={{ textAlign:"center" }}>
            <div style={{ fontFamily:mono, fontSize:18, fontWeight:700, color:s.color }}>{s.value}</div>
            <div style={{ fontFamily:mono, fontSize:8, color:"#ffffff33", marginTop:2 }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── AGE AXIS ───────────────────────────────────────────────────────────────
function AgeAxis() {
  const ticks = [0,10,20,30,40,50,60,70,80,90];
  return (
    <div style={{
      display:"grid",
      gridTemplateColumns: AGE_ROW_GRID,
      columnGap: AGE_ROW_GAP,
      alignItems:"center",
      marginBottom:8,
    }}>
      {/* empty label cell */}
      <div/>
      {/* bar cell — ticks live here, same width as every bar */}
      <div style={{ position:"relative", height:16 }}>
        <div style={{
          position:"absolute", top:12, left:0, right:0,
          height:1, background:"#ffffff0a"
        }}/>
        {ticks.map(t => (
          <div key={t}>
            <div style={{
              position:"absolute",
              left:`${(t/MAX_AGE)*100}%`,
              top:0,
              fontFamily:mono, fontSize:7, color:"#ffffff33",
              transform:"translateX(-50%)"
            }}>{t}</div>
            <div style={{
              position:"absolute",
              left:`${(t/MAX_AGE)*100}%`,
              top:10, width:1, height:4,
              background:"#ffffff1a"
            }}/>
          </div>
        ))}
      </div>
      {/* empty note cell */}
      <div/>
    </div>
  );
}

// ── CROSS-LANE RELATION LOGIC ──────────────────────────────────────────────
function getRelations(hoveredId, side) {
  // side: "age" = hovered something in age, highlight persons
  // side: "persons" = hovered something in persons, highlight ages
  if (side === "persons") {
    return AGE_RELATIONS[hoveredId] || null;
  }
  if (side === "age") {
    const related = [];
    Object.entries(AGE_RELATIONS).forEach(([person, ages]) => {
      if (ages.includes(hoveredId)) related.push(person);
    });
    return related.length ? related : null;
  }
  return null;
}

// ── MAIN ───────────────────────────────────────────────────────────────────
export default function SwimLanes() {
  const [ageHovered, setAgeHovered]         = useState(null);
  const [occHovered, setOccHovered]         = useState(null);
  const [personsHovered, setPersonsHovered] = useState(null);
  const [occExpanded, setOccExpanded]       = useState(new Set(["Health Personnel","Physicians","Frontline Workers"]));

  const toggleOcc = useCallback((id) => {
    setOccExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  // Cross-lane highlights
  const ageToPersons  = ageHovered     ? getRelations(ageHovered,     "age")     : null;
  const personsToAge  = personsHovered ? getRelations(personsHovered,  "persons") : null;

  return (
    <div style={{
      width:"100%", height:"100vh",
      background:"#0f1117",
      display:"flex", flexDirection:"column",
      fontFamily:mono, overflow:"hidden"
    }}>
      <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&display=swap" rel="stylesheet"/>
      <style>{`
        @keyframes fadeIn { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
        ::-webkit-scrollbar { width:4px; height:4px; }
        ::-webkit-scrollbar-track { background:#ffffff05; }
        ::-webkit-scrollbar-thumb { background:#ffffff22; border-radius:2px; }
      `}</style>

      <Header/>

      {/* Lane headers */}
      <div style={{
        display:"grid", gridTemplateColumns:"1fr 1fr 1.4fr",
        borderBottom:"1px solid #ffffff0e", flexShrink:0
      }}>
        {[
          { label:"Age Groups", sub:"Sequential · age-range bars", color:"#6DB8E8", count:12 },
          { label:"Occupational Groups", sub:"Hierarchical · click to expand", color:"#E8A06D", count:"26 + subspecialties" },
          { label:"Persons (other)", sub:"Softly clustered by theme", color:"#7DC48B", count:64 },
        ].map((h,i) => (
          <div key={h.label} style={{
            padding:"10px 16px",
            borderLeft: i>0 ? "1px solid #ffffff0a" : "none",
            borderTop:`2px solid ${h.color}`
          }}>
            <div style={{ fontSize:11, color:h.color, fontWeight:700 }}>{h.label}</div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:2 }}>
              <div style={{ fontSize:8, color:"#ffffff44" }}>{h.sub}</div>
              <div style={{ fontSize:8, color:h.color+"88" }}>{h.count} terms</div>
            </div>
          </div>
        ))}
      </div>

      {/* Lanes */}
      <div style={{
        flex:1, display:"grid",
        gridTemplateColumns:"1fr 1fr 1.4fr",
        overflow:"hidden"
      }}>

        {/* ── LANE 1: Age Groups ── */}
        <div style={{
          display:"flex", flexDirection:"column", overflow:"hidden",
          borderRight:"1px solid #ffffff0a"
        }}>
          <div style={{ flex:1, overflowY:"auto", padding:"14px 16px 14px 0" }}>
            <AgeAxis/>
            {AGE_GROUPS.map(term => (
              <AgeBar
                key={term.id}
                term={term}
                hovered={ageHovered}
                relatedHighlight={personsToAge}
                onHover={setAgeHovered}
              />
            ))}
          </div>

          {/* Cross-lane hint */}
          {ageHovered && ageToPersons && (
            <div style={{
              padding:"8px 12px", borderTop:"1px solid #6DB8E833",
              fontFamily:mono, fontSize:8, color:"#6DB8E8aa", flexShrink:0,
              animation:"fadeIn 0.15s ease"
            }}>
              ↔ related: {ageToPersons.join(", ")}
            </div>
          )}
        </div>

        {/* ── LANE 2: Occupational Groups ── */}
        <div style={{
          display:"flex", flexDirection:"column", overflow:"hidden",
          borderRight:"1px solid #ffffff0a"
        }}>
          <div style={{ flex:1, overflowY:"auto", padding:"10px 0" }}>
            {OCC_TREE.map(node => (
              <OccNode
                key={node.id}
                node={node}
                depth={0}
                expanded={occExpanded}
                onToggle={toggleOcc}
                hovered={occHovered}
                onHover={setOccHovered}
              />
            ))}
          </div>
          {occHovered && (
            <div style={{
              padding:"8px 12px", borderTop:"1px solid #E8A06D33",
              fontFamily:mono, fontSize:8, color:"#E8A06Daa", flexShrink:0,
              animation:"fadeIn 0.15s ease"
            }}>
              M01.526 · {occHovered}
            </div>
          )}
        </div>

        {/* ── LANE 3: Persons (other) ── */}
        <div style={{ display:"flex", flexDirection:"column", overflow:"hidden" }}>
          <PersonsLane
            hovered={personsHovered}
            onHover={setPersonsHovered}
            relatedHighlight={ageToPersons}
          />
          {personsHovered && personsToAge && (
            <div style={{
              padding:"8px 12px", borderTop:"1px solid #7DC48B33",
              fontFamily:mono, fontSize:8, color:"#7DC48Baa", flexShrink:0,
              animation:"fadeIn 0.15s ease"
            }}>
              ↔ related age groups: {personsToAge.join(", ")}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
