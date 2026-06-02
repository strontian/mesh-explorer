import { useState, useCallback, useEffect, useRef } from "react";

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
const BRANCH_COLOR = { age:"#6DB8E8", occ:"#E8A06D", persons:"#7DC48B" };

const SCOPE_NOTES = {
  "Infant, Newborn": "An infant during the first 28 days after birth.",
  "Infant, Premature": "A human infant born before 37 weeks of GESTATION.",
  "Infant": "A child between 1 and 23 months of age.",
  "Child, Preschool": "A child between the ages of 2 and 5.",
  "Child": "A person 6 to 12 years of age. An individual 2 to 5 years old is CHILD, PRESCHOOL.",
  "Birth Cohort": "A group of people born in the same time period.",
  "Adolescent": "A person 13 to 17 years of age.",
  "Young Adult": "A person between 19 and 24 years of age.",
  "Adult": "A person having attained full growth or maturity. Adults are of 19 through 44 years of age.",
  "Middle Aged": "A person 45 to 64 years of age.",
  "Aged": "A person 65 through 79 years of age. For a person older than 79, AGED, 80 AND OVER is available.",
  "Aged, 80 and over": "A person 80 years of age and older.",
  "Farmers": "Persons who cultivate farm land and other agricultural occupations.",
  "Frontline Workers": "Workers who directly interact with the public or provide essential services, often during public health emergencies.",
  "Health Personnel": "Men and women working in the provision of health services, whether as individual practitioners or employees of health institutions and programs.",
  "Physicians": "Individuals licensed to practice medicine.",
  "Allergists": "Physicians who specialize in the treatment of ALLERGIC DISEASES.",
  "Pediatricians": "Physicians who specialize in the care of infants and children.",
  "Pulmonologists": "Physicians who specialize in PULMONARY MEDICINE.",
  "Laboratory Personnel": "Individuals employed in a laboratory.",
  "Military Personnel": "Persons including soldiers involved with the armed forces.",
  "Miners": "Persons involved in the mining industry.",
  "Research Personnel": "Those individuals engaged in research.",
  "Patients": "Individuals participating in the health care system for the purpose of receiving therapeutic, diagnostic, or preventive procedures.",
  "Caregivers": "Persons who provide care to those who need supervision or assistance in illness or disability.",
  "Homebound Persons": "Those persons who are confined to their homes due to illness or disability.",
  "Bedridden Persons": "Persons who are confined to bed.",
  "Refugees": "Persons fleeing to a place of safety, especially those who flee to a foreign country or power to escape danger or persecution.",
  "Prisoners": "Persons confined in PRISONS.",
  "Smokers": "Persons who smoke tobacco products.",
  "Ex-Smokers": "Former smokers who have quit smoking.",
  "Non-Smokers": "Persons who have never smoked or who are no longer smoking.",
  "Athletes": "Individuals who have developed skills, physical stamina and strength or participants in SPORTS or other activities requiring exertion.",
  "Veterans": "Former members of the armed services.",
  "Students": "Individuals enrolled in a school or formal educational program.",
  "Men": "Human males as cultural, psychological, sociological, political, and economic entities.",
  "Women": "Human females as cultural, psychological, sociological, political, and economic entities.",
  "Survivors": "Persons who have experienced a prolonged survival after serious disease or who continue to live with a usually life-threatening condition.",
  "Siblings": "Persons or animals having at least one parent in common.",
  "Parents": "Persons functioning as natural, adoptive, or substitute parents.",
  "Volunteers": "Persons who donate their services.",
};

const TREE_NUM = {
  "Infant, Newborn":"M01.060.703.520", "Infant, Premature":"M01.060.703.535", "Infant":"M01.060.703",
  "Child, Preschool":"M01.060.406.500", "Child":"M01.060.406", "Birth Cohort":"M01.060.261",
  "Adolescent":"M01.060.057", "Young Adult":"M01.060.116.920", "Adult":"M01.060.116",
  "Middle Aged":"M01.060.116.100", "Aged":"M01.060.116.198", "Aged, 80 and over":"M01.060.116.198.500",
  "Farmers":"M01.526.390", "Frontline Workers":"M01.526.427", "Health Personnel":"M01.526.485",
  "Physicians":"M01.526.485.810", "Allergists":"M01.526.485.810.020", "Pediatricians":"M01.526.485.810.758",
  "Pulmonologists":"M01.526.485.810.865", "Laboratory Personnel":"M01.526.502", "Military Personnel":"M01.526.625",
  "Miners":"M01.526.693", "Research Personnel":"M01.526.839", "Patients":"M01.643", "Caregivers":"M01.085",
  "Homebound Persons":"M01.276", "Bedridden Persons":"M01.079", "Refugees":"M01.755", "Prisoners":"M01.729",
  "Smokers":"M01.808", "Ex-Smokers":"M01.219", "Non-Smokers":"M01.482", "Athletes":"M01.072",
  "Veterans":"M01.930", "Students":"M01.848", "Men":"M01.390", "Women":"M01.975",
  "Survivors":"M01.860", "Siblings":"M01.781", "Parents":"M01.620", "Volunteers":"M01.955",
};

const QUERY_STORAGE_KEY = "mesh_query_builder_state";

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
              branch:term.branch || "persons",
              major:Boolean(term.major),
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

function buildPubMedUrl(terms) {
  if (!terms.length) return null;
  const query = terms
    .map(term => `"${String(term.id).replace(/"/g, '\\"')}"[${term.major ? "Majr" : "MeSH Terms"}]`)
    .join(" AND ");
  return `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(query)}`;
}

// ── AGE GANTT LANE ─────────────────────────────────────────────────────────
const MAX_AGE = 90;

// Fixed column layout: 140px label | 1fr bar | 72px note
// Every row shares the same grid so bars are perfectly aligned
const AGE_ROW_GRID = "140px 1fr 72px";
const AGE_ROW_GAP  = 6;

function AgeBar({ term, hovered, relatedHighlight, onHover, selected, onSelect, collectedIds }) {
  const pct = (v) => `${(v / MAX_AGE) * 100}%`;
  const isHov     = hovered === term.id;
  const isSelected = selected?.id === term.id;
  const collected = collectedIds.has(term.id);
  const isRelated = relatedHighlight && relatedHighlight.includes(term.id);
  const dimmed    = relatedHighlight && !isRelated && !isHov;
  const color     = "#6DB8E8";
  const indent    = term.depth === 4 ? 18 : term.depth === 3 ? 10 : 0;

  return (
    <div
      onMouseEnter={() => onHover(term.id)}
      onMouseLeave={() => onHover(null)}
      onClick={() => onSelect({ id:term.id, branch:"age" })}
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
        color: isSelected ? "#fff" : isHov ? "#e8e8e8" : collected ? color : isRelated ? color : "#999",
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
            background: `${color}${isSelected ? "cc" : isHov ? "aa" : collected ? "77" : isRelated ? "88" : "44"}`,
            borderRadius:2,
            border:`1px solid ${color}${isSelected ? "ff" : isHov ? "dd" : "66"}`,
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
function OccNode({ node, depth, expanded, onToggle, hovered, onHover, selected, onSelect, collectedIds }) {
  const isExp = expanded.has(node.id);
  const isHov = hovered === node.id;
  const isSelected = selected?.id === node.id;
  const collected = collectedIds.has(node.id);
  const hasChildren = node.children && node.children.length > 0;
  const color = "#E8A06D";
  const indent = depth * 14;

  return (
    <div>
      <div
        onMouseEnter={() => onHover(node.id)}
        onMouseLeave={() => onHover(null)}
        onClick={() => {
          onSelect({ id:node.id, branch:"occ" });
          if (hasChildren) onToggle(node.id);
        }}
        style={{
          display:"flex", alignItems:"center", gap:6,
          padding:`4px 8px 4px ${8 + indent}px`,
          cursor: hasChildren ? "pointer" : "default",
          background: isSelected ? `${color}22` : isHov ? `${color}18` : "transparent",
          borderLeft: `2px solid ${isSelected ? color : collected ? color+"aa" : isHov ? color : depth === 0 ? color+"44" : color+"22"}`,
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
          color: isSelected ? "#fff" : isHov ? "#e8e8e8" : collected ? color : depth === 0 ? "#cccccc" : "#999999",
          fontWeight: collected || depth === 0 ? 600 : 400,
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
              hovered={hovered} onHover={onHover}
              selected={selected} onSelect={onSelect} collectedIds={collectedIds}/>
          ))}
        </div>
      )}
    </div>
  );
}

// ── PERSONS CLUSTER LANE ───────────────────────────────────────────────────
function PersonsLane({ hovered, onHover, relatedHighlight, selected, onSelect, collectedIds }) {
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
              const isSelected = selected?.id === term;
              const collected = collectedIds.has(term);
              const isRelated = relatedHighlight && relatedHighlight.includes(term);
              const dimmed = relatedHighlight && !isRelated && !isHov;
              return (
                <div
                  key={term}
                  onMouseEnter={() => onHover(term)}
                  onMouseLeave={() => onHover(null)}
                  onClick={() => onSelect({ id:term, branch:"persons" })}
                  style={{
                    padding:"3px 8px",
                    fontFamily:mono, fontSize:9,
                    color: isSelected ? "#111" : isHov ? "#111" : collected ? cluster.color : isRelated ? cluster.color : dimmed ? "#ffffff22" : "#aaa",
                    background: isSelected ? cluster.color : isHov ? cluster.color : collected ? cluster.color+"2a" : isRelated ? cluster.color+"33" : cluster.color+"14",
                    border:`1px solid ${isSelected || isHov ? cluster.color : collected ? cluster.color+"88" : isRelated ? cluster.color+"88" : cluster.color+"33"}`,
                    borderRadius:2, cursor:"pointer",
                    transition:"all 0.12s",
                    opacity: dimmed && !collected && !isSelected ? 0.3 : 1,
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

function useQueries() {
  const initialState = useRef(null);
  if (!initialState.current) initialState.current = readQueryState();

  const [queries, setQueries] = useState(initialState.current.queries);
  const [activeId, setActiveId] = useState(initialState.current.activeId);
  const counter = useRef(initialState.current.nextCounter);
  const active = queries.find(q => q.id === activeId) || null;

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(QUERY_STORAGE_KEY, JSON.stringify({
      queries,
      activeId,
      nextCounter:counter.current,
    }));
  }, [queries, activeId]);

  function create(term) {
    const id = makeQueryId();
    const name = `Query ${counter.current}`;
    counter.current += 1;
    setQueries(qs => [...qs, { id, name, terms:[{ ...term, major:false }] }]);
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
    setQueries(qs => qs.map(q =>
      q.id === activeId && !q.terms.some(t => t.id === term.id)
        ? { ...q, terms:[...q.terms, { ...term, major:false }] }
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

function DetailPanel({ selected, query }) {
  const note = selected ? SCOPE_NOTES[selected.id] : null;
  const treeNum = selected ? TREE_NUM[selected.id] : null;
  const color = selected ? BRANCH_COLOR[selected.branch] : "#ffffff";
  const alreadyIn = selected && query.inActive.has(selected.id);

  return (
    <div style={{ position:"fixed", bottom:16, left:16, width:252, background:"#13161d", border:"1px solid #ffffff18", borderRadius:8, boxShadow:"0 8px 32px rgba(0,0,0,0.55),0 0 0 1px #ffffff06", overflow:"hidden", zIndex:100 }}>
      {selected ? (
        <>
          <div style={{ height:2, background:`linear-gradient(90deg,${color}cc,${color}11)` }} />
          <div style={{ padding:"12px 14px" }}>
            <div style={{ fontFamily:mono, fontSize:13, color:"#e8e8e8", fontWeight:700, lineHeight:1.2, marginBottom:3 }}>{selected.id}</div>
            <div style={{ fontFamily:mono, fontSize:7.5, color:"#ffffff28", letterSpacing:0.5, marginBottom:8 }}>{treeNum || "M01"}</div>
            <div style={{ fontFamily:mono, fontSize:9, color:"#ffffffaa", lineHeight:1.7, marginBottom:12, maxHeight:92, overflowY:"auto" }}>
              {note || <span style={{ color:"#ffffff28", fontStyle:"italic" }}>No scope note on record.</span>}
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

function QueryPanel({ query }) {
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
    <div style={{ position:"fixed", bottom:16, left:284, width:276, background:"#13161d", border:"1px solid #ffffff18", borderRadius:8, boxShadow:"0 8px 32px rgba(0,0,0,0.55),0 0 0 1px #ffffff06", overflow:"visible", zIndex:100, animation:"slideIn 0.18s ease" }}>
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
          <button onClick={query.createEmpty} title="New query" style={{ background:"transparent", border:"1px dashed #ffffff1a", borderRadius:3, color:"#ffffff33", cursor:"pointer", fontFamily:mono, fontSize:9, padding:"1px 7px", flexShrink:0 }}>+</button>
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
              const color = BRANCH_COLOR[term.branch] || "#aaa";
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
          <div style={{ fontFamily:mono, fontSize:7, color:"#ffffff18", marginTop:8, display:"flex", gap:10, alignItems:"center" }}>
            <a href={pubMedUrl} target="_blank" rel="noreferrer" style={{ color:"#AED6F1", textDecoration:"none", border:"1px solid #AED6F144", borderRadius:3, padding:"3px 6px", fontWeight:700 }}>
              PubMed
            </a>
            <span>★ major topic</span>
            <span>☆ minor topic</span>
            <span style={{ marginLeft:"auto" }}>{query.active.terms.length} term{query.active.terms.length === 1 ? "" : "s"}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── MAIN ───────────────────────────────────────────────────────────────────
export default function SwimLanes() {
  const [ageHovered, setAgeHovered]         = useState(null);
  const [occHovered, setOccHovered]         = useState(null);
  const [personsHovered, setPersonsHovered] = useState(null);
  const [selected, setSelected]             = useState(null);
  const [occExpanded, setOccExpanded]       = useState(new Set(["Health Personnel","Physicians","Frontline Workers"]));
  const query = useQueries();

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
      width:"100%", height:"calc(100vh - 78px)",
      background:"#0f1117",
      display:"flex", flexDirection:"column",
      fontFamily:mono, overflow:"hidden"
    }}>
      <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&display=swap" rel="stylesheet"/>
      <style>{`
        @keyframes fadeIn { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
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
        overflow:"hidden",
        position:"relative",
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
                selected={selected}
                onSelect={setSelected}
                collectedIds={query.allIds}
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
                selected={selected}
                onSelect={setSelected}
                collectedIds={query.allIds}
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
            selected={selected}
            onSelect={setSelected}
            collectedIds={query.allIds}
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

        <DetailPanel selected={selected} query={query} />
        <QueryPanel query={query} />

      </div>
    </div>
  );
}
