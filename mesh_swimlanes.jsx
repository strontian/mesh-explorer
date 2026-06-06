import { useState, useCallback, useEffect } from "react";
import {
  MeshBottomQueryLayout,
  usePersistentMeshQueries,
} from "./mesh_query_ui.jsx";

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
  "M": "Named Groups gathers terms for named human groups and populations, organized by age, occupation, health status, social role, and life circumstance.",
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
  "M":"M",
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
function OccNode({ node, depth, path, expanded, onSelectNode, hovered, onHover, selected, collectedIds }) {
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
          onSelectNode(node, path, hasChildren);
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
            <OccNode key={child.id} node={child} depth={depth+1} path={[...path, node.id]}
              expanded={expanded} onSelectNode={onSelectNode}
              hovered={hovered} onHover={onHover}
              selected={selected} collectedIds={collectedIds}/>
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
function Header({ selected, onSelect }) {
  const active = selected?.id === "M";
  return (
    <button type="button" onClick={() => onSelect({ id:"M", branch:"persons" })} style={{
      width:"100%",
      padding:"18px 24px 16px",
      border:"none",
      borderBottom:`1px solid ${active ? "#AED6F155" : "#ffffff0e"}`,
      flexShrink:0,
      background:active ? "linear-gradient(180deg,#AED6F112,transparent)" : "linear-gradient(180deg,#ffffff05,transparent)",
      textAlign:"left",
      cursor:"pointer",
      outline:"none",
    }}>
      <div style={{ display:"flex", alignItems:"center", gap:11 }}>
        <div style={{
          width:34,
          height:34,
          display:"grid",
          placeItems:"center",
          fontFamily:mono,
          fontSize:16,
          color:"#AED6F1",
          letterSpacing:1,
          fontWeight:700,
          border:"1px solid #AED6F155",
          background:"linear-gradient(180deg,#AED6F124,#AED6F10b)",
          borderRadius:7,
          lineHeight:1,
          boxShadow:"0 0 22px #AED6F10d",
          flexShrink:0,
        }}>
          M
        </div>
        <div style={{ fontFamily:mono, fontSize:22, color:"#e8e8e8", fontWeight:700, letterSpacing:0.2 }}>
          Named Groups
        </div>
      </div>
      <div style={{
        fontFamily:mono,
        fontSize:10,
        color:"#ffffff62",
        marginTop:9,
        lineHeight:1.65,
        maxWidth:"72ch",
        textWrap:"balance",
      }}>
        Terms for named human groups and populations, organized by age, occupation,
        health status, social role, and life circumstance.
      </div>
    </button>
  );
}

function RootBar({ selected, onSelect, personNote }) {
  const active = selected?.id === "Persons";
  return (
    <button type="button" onClick={() => onSelect({ id:"Persons", branch:"persons" })} style={{
      flexShrink:0,
      width:"100%",
      padding:"8px 24px",
      border:"none",
      borderBottom:"1px solid #ffffff0e",
      background:"linear-gradient(90deg,#AED6F10d,transparent 70%)",
      display:"flex",
      alignItems:"center",
      gap:10,
      fontFamily:mono,
      textAlign:"left",
      cursor:"pointer",
      outline:"none",
      boxShadow:active ? "inset 2px 0 0 #AED6F1" : "none",
    }}>
      <span style={{ fontSize:9, color:"#AED6F1" }}>M01</span>
      <span style={{ fontSize:10, color:"#e8e8e8", fontWeight:700 }}>Persons</span>
      <span style={{ fontSize:8, color:"#ffffff48", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
        {personNote}
      </span>
    </button>
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
          <div key={t} style={{
            position:"absolute",
            left:`${(t/MAX_AGE)*100}%`,
            top:0,
            transform:"translateX(-50%)",
            fontFamily:mono,
            fontSize:7,
            color:"#ffffff22",
          }}>
            {t}
          </div>
        ))}
      </div>
      <div style={{ fontFamily:mono, fontSize:7, color:"#ffffff22" }}>years</div>
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

function useMeshTermLookup() {
  const [termByName, setTermByName] = useState(new Map());

  useEffect(() => {
    let cancelled = false;
    fetch("/mesh-terms.json")
      .then(response => response.json())
      .then(terms => {
        if (cancelled) return;
        const next = new Map();
        for (const term of terms) next.set(term.name, term);
        setTermByName(next);
      })
      .catch(() => {
        if (!cancelled) setTermByName(new Map());
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return termByName;
}

// ── MAIN ───────────────────────────────────────────────────────────────────
export default function SwimLanes() {
  const [ageHovered, setAgeHovered]         = useState(null);
  const [occHovered, setOccHovered]         = useState(null);
  const [personsHovered, setPersonsHovered] = useState(null);
  const [selected, setSelected]             = useState({ id:"M", branch:"persons" });
  const [occExpanded, setOccExpanded]       = useState(new Set());
  const query = usePersistentMeshQueries();
  const termByName = useMeshTermLookup();
  const selectedMeshTerm = selected ? termByName.get(selected.id) : null;
  const selectedDetail = selected ? {
    ...selected,
    color:BRANCH_COLOR[selected.branch],
    note:selectedMeshTerm?.note || SCOPE_NOTES[selected.id],
    treeNum:selectedMeshTerm?.treeNums?.find(treeNum => treeNum.startsWith("M")) || TREE_NUM[selected.id],
    ui:selectedMeshTerm?.ui,
  } : null;

  const selectOccNode = useCallback((node, path, hasChildren) => {
    setSelected({ id:node.id, branch:"occ" });
    setOccExpanded(() => new Set(hasChildren ? [...path, node.id] : path));
  }, []);

  // Cross-lane highlights
  const ageToPersons  = ageHovered     ? getRelations(ageHovered,     "age")     : null;
  const personsToAge  = personsHovered ? getRelations(personsHovered,  "persons") : null;

  return (
    <div style={{
      width:"100%", height:"100%",
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

      <Header selected={selected} onSelect={setSelected}/>
      <RootBar selected={selected} onSelect={setSelected} personNote={termByName.get("Persons")?.note || "Persons as individuals or as members of a group."}/>

      <MeshBottomQueryLayout selected={selectedDetail} query={query} contentStyle={{ display:"flex", flexDirection:"column" }}>
      {/* Lane headers */}
      <div style={{
        display:"grid", gridTemplateColumns:"1fr 1fr 1.4fr",
        borderBottom:"1px solid #ffffff0e", flexShrink:0
      }}>
        {[
          { label:"Age Groups", id:"Age Groups", branch:"age", color:"#6DB8E8", count:12 },
          { label:"Occupational Groups", id:"Occupational Groups", branch:"occ", color:"#E8A06D", count:"26 + subspecialties" },
          { label:"Persons (other)", id:"Persons", branch:"persons", color:"#7DC48B", count:64 },
        ].map((h,i) => (
          <button key={h.label} type="button" onClick={() => setSelected({ id:h.id, branch:h.branch })} style={{
            padding:"10px 16px",
            border:"none",
            borderLeft: i>0 ? "1px solid #ffffff0a" : "none",
            borderRight:"none",
            borderBottom:"none",
            borderTop:`2px solid ${h.color}`,
            background:selected?.id === h.id ? `${h.color}14` : "transparent",
            fontFamily:mono,
            textAlign:"left",
            cursor:"pointer",
            outline:"none",
          }}>
            <div style={{ fontSize:11, color:h.color, fontWeight:700 }}>{h.label}</div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:2 }}>
              <div style={{ fontSize:8, color:h.color+"88" }}>{h.count} terms</div>
            </div>
          </button>
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
                path={[]}
                expanded={occExpanded}
                onSelectNode={selectOccNode}
                hovered={occHovered}
                onHover={setOccHovered}
                selected={selected}
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
      </div>
      </MeshBottomQueryLayout>
    </div>
  );
}
