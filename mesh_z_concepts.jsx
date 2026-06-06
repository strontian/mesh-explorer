import { useState, useEffect } from "react";
import { ComposableMap, Geographies, Geography, Graticule, Marker, Sphere } from "react-simple-maps";
import worldAtlas from "world-atlas/countries-110m.json";
import { MeshPageHeader } from "./mesh_page_header.jsx";
import {
  MeshBottomQueryLayout,
  usePersistentMeshQueries,
} from "./mesh_query_ui.jsx";

const mono = "'IBM Plex Mono', monospace";
const BG = "#0f1117";
const TREE_COLOR = "#88C8D8";

// ── DATA HOOK ─────────────────────────────────────────────────────────────
function useZData() {
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

      const raw = (childrenMap.get("Z") || []).sort((a, b) =>
        a.treeNum.localeCompare(b.treeNum, undefined, { numeric: true })
      );

      const branches = raw.map(({ term, treeNum }) => ({
        term, treeNum,
        directCount: childrenMap.get(treeNum)?.length ?? 0,
        totalCount: countAll(treeNum),
      }));

      // Collect all Z terms for the flat search list
      const allTerms = [];
      const stack = [...(childrenMap.get("Z") || [])];
      while (stack.length) {
        const { term, treeNum } = stack.pop();
        allTerms.push({ term, treeNum });
        const kids = childrenMap.get(treeNum) || [];
        for (const k of kids) stack.push(k);
      }
      allTerms.sort((a, b) => a.term.name.localeCompare(b.term.name));

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

// ── WORLD MAP ─────────────────────────────────────────────────────────────
const REGION_CONFIG = {
  "Z01.058": { label: "Africa", color: "#D8B888" },
  "Z01.107": { label: "Americas", color: "#88C8D8" },
  "Z01.252": { label: "Asia", color: "#D8C888" },
  "Z01.542": { label: "Europe", color: "#A8D8C8" },
  "Z01.678": { label: "Oceania", color: "#C8A8D8" },
};

const SPECIAL_OVERLAYS = {
  "Z01.208": {
    label: "Arctic zone",
    color: "#88A8D8",
    marks: [
      { kind: "label", text: "ARCTIC", top: "11%", left: "46%" },
    ],
  },
  "Z01.158": {
    label: "Antarctic zone",
    color: "#A8C8D8",
    marks: [
      { kind: "label", text: "ANTARCTIC", top: "84%", left: "44%" },
    ],
  },
  "Z01.433": {
    label: "City clusters",
    color: "#D8A8A8",
    marks: [
      { kind: "label", text: "CITIES", top: "13%", left: "72%" },
    ],
  },
  "Z01.639": {
    label: "Island chains",
    color: "#C8D8A8",
    marks: [
      { kind: "label", text: "ISLANDS", top: "68%", left: "68%" },
    ],
  },
  "Z01.756": {
    label: "Oceans and seas",
    color: "#88C8D8",
    marks: [
      { kind: "label", text: "OCEANS + SEAS", top: "72%", left: "39%" },
    ],
  },
  "Z01.586": {
    label: "Historical places",
    color: "#D8D888",
    marks: [
      { kind: "label", text: "HISTORICAL", top: "26%", left: "48%" },
    ],
  },
};

const COUNTRY_REGION = new Map([
  // Americas
  ...[
    "Argentina","Bahamas","Belize","Bolivia","Brazil","Canada","Chile","Colombia","Costa Rica","Cuba",
    "Dominican Rep.","Ecuador","El Salvador","Falkland Is.","Greenland","Guatemala","Guyana","Haiti",
    "Honduras","Jamaica","Mexico","Nicaragua","Panama","Paraguay","Peru","Puerto Rico","Suriname",
    "Trinidad and Tobago","United States of America","Uruguay","Venezuela",
  ].map(name => [name, "Z01.107"]),
  // Africa
  ...[
    "Algeria","Angola","Benin","Botswana","Burkina Faso","Burundi","Cameroon","Central African Rep.",
    "Chad","Congo","Côte d'Ivoire","Dem. Rep. Congo","Djibouti","Egypt","Eq. Guinea","Eritrea",
    "Ethiopia","Gabon","Gambia","Ghana","Guinea","Guinea-Bissau","Kenya","Lesotho","Liberia","Libya",
    "Madagascar","Malawi","Mali","Mauritania","Morocco","Mozambique","Namibia","Niger","Nigeria",
    "Rwanda","S. Sudan","Senegal","Sierra Leone","Somalia","Somaliland","South Africa","Sudan",
    "Tanzania","Togo","Tunisia","Uganda","W. Sahara","Zambia","Zimbabwe",
  ].map(name => [name, "Z01.058"]),
  // Europe
  ...[
    "Albania","Austria","Belarus","Belgium","Bosnia and Herz.","Bulgaria","Croatia","Czechia","Denmark",
    "Estonia","Finland","France","Germany","Greece","Hungary","Iceland","Ireland","Italy","Kosovo",
    "Latvia","Lithuania","Luxembourg","Macedonia","Moldova","Montenegro","Netherlands","Norway","Poland",
    "Portugal","Romania","Russia","Serbia","Slovakia","Slovenia","Spain","Sweden","Switzerland","Ukraine",
    "United Kingdom",
  ].map(name => [name, "Z01.542"]),
  // Asia
  ...[
    "Afghanistan","Armenia","Azerbaijan","Bangladesh","Bhutan","Brunei","Cambodia","China","Cyprus",
    "Georgia","India","Indonesia","Iran","Iraq","Israel","Japan","Jordan","Kazakhstan","Kuwait",
    "Kyrgyzstan","Laos","Lebanon","Malaysia","Mongolia","Myanmar","Nepal","North Korea","Oman","Pakistan",
    "Palestine","Philippines","Qatar","Saudi Arabia","South Korea","Sri Lanka","Syria","Taiwan","Tajikistan",
    "Thailand","Timor-Leste","Turkey","Turkmenistan","United Arab Emirates","Uzbekistan","Vietnam","Yemen",
  ].map(name => [name, "Z01.252"]),
  // Oceania
  ...[
    "Australia","Fiji","New Caledonia","New Zealand","Papua New Guinea","Solomon Is.","Vanuatu",
  ].map(name => [name, "Z01.678"]),
  ["Antarctica", "Z01.158"],
]);

const PLACE_COORDS = {
  Baltimore: [-76.6122, 39.2904],
  Beijing: [116.4074, 39.9042],
  Berlin: [13.4050, 52.5200],
  Boston: [-71.0589, 42.3601],
  Chicago: [-87.6298, 41.8781],
  "District of Columbia": [-77.0369, 38.9072],
  London: [-0.1276, 51.5072],
  "Los Angeles": [-118.2437, 34.0522],
  Moscow: [37.6173, 55.7558],
  "New Orleans": [-90.0715, 29.9511],
  "New York City": [-74.0060, 40.7128],
  Paris: [2.3522, 48.8566],
  Philadelphia: [-75.1652, 39.9526],
  Rome: [12.4964, 41.9028],
  "San Francisco": [-122.4194, 37.7749],
  Seoul: [126.9780, 37.5665],
  Tokyo: [139.6503, 35.6762],

  "Atlantic Islands": [-31.0, 20.0],
  Aruba: [-69.9683, 12.5211],
  Azores: [-28.0, 38.5],
  Bermuda: [-64.7505, 32.3078],
  "Cabo Verde": [-23.6052, 15.1201],
  "Caribbean Netherlands": [-68.2624, 12.2019],
  "Falkland Islands": [-59.5236, -51.7963],
  "Sao Tome and Principe": [6.6131, 0.1864],
  Australia: [133.7751, -25.2744],
  "Australian Capital Territory": [149.0124, -35.4735],
  "New South Wales": [147.0193, -32.7240],
  "Northern Territory": [133.7751, -19.4914],
  Queensland: [142.7028, -20.9176],
  "South Australia": [135.0, -30.0],
  Tasmania: [146.3159, -42.0409],
  Victoria: [144.7852, -37.4713],
  "Western Australia": [121.6283, -27.6728],
  Borneo: [113.9213, 0.9619],
  Greenland: [-42.6043, 71.7069],
  Iceland: [-19.0208, 64.9631],
  "Indian Ocean Islands": [57.0, -15.0],
  Comoros: [43.3333, -11.6455],
  Madagascar: [46.8691, -18.7669],
  Mauritius: [57.5522, -20.3484],
  Reunion: [55.5364, -21.1151],
  Seychelles: [55.4920, -4.6796],
  "Sri Lanka": [80.7718, 7.8731],
  Indonesia: [113.9213, -0.7893],
  Ireland: [-8.2439, 53.4129],
  Japan: [138.2529, 36.2048],
  Macau: [113.5439, 22.1987],
  "Mediterranean Islands": [18.0, 37.0],
  Cyprus: [33.4299, 35.1264],
  Malta: [14.3754, 35.9375],
  Sicily: [14.0154, 37.5999],
  "Pacific Islands": [-165.0, -12.0],
  Kiribati: [-157.3768, 1.8709],
  Melanesia: [155.0, -10.0],
  Fiji: [178.0650, -17.7134],
  "New Caledonia": [165.6180, -20.9043],
  "Papua New Guinea": [143.9555, -6.3150],
  Vanuatu: [166.9592, -15.3767],
  Micronesia: [150.0, 7.0],
  Guam: [144.7937, 13.4443],
  Palau: [134.5825, 7.5150],
  "New Zealand": [174.8860, -40.9006],
  Polynesia: [-155.0, -15.0],
  Hawaii: [-155.5828, 19.8968],
  "Pitcairn Island": [-128.3242, -24.3768],
  Samoa: [-172.1046, -13.7590],
  "American Samoa": [-170.1322, -14.2710],
  "Independent State of Samoa": [-172.1046, -13.7590],
  Tonga: [-175.1982, -21.1790],
  Philippines: [121.7740, 12.8797],
  "Prince Edward Island": [-63.4168, 46.5107],
  Svalbard: [15.8643, 78.2232],
  Taiwan: [120.9605, 23.6978],
  "West Indies": [-70.0, 18.0],
  "Antigua and Barbuda": [-61.7964, 17.0608],
  Bahamas: [-77.3963, 25.0343],
  Barbados: [-59.5432, 13.1939],
  Cuba: [-77.7812, 21.5218],
  Dominica: [-61.3710, 15.4150],
  "Dominican Republic": [-70.1627, 18.7357],
  Grenada: [-61.6790, 12.1165],
  Guadeloupe: [-61.5510, 16.2650],
  Haiti: [-72.2852, 18.9712],
  Jamaica: [-77.2975, 18.1096],
  Martinique: [-61.0242, 14.6415],
  "Puerto Rico": [-66.5901, 18.2208],
  "Saint Kitts and Nevis": [-62.7829, 17.3578],
  "Saint Lucia": [-60.9789, 13.9094],
  "Saint Vincent and the Grenadines": [-61.2872, 12.9843],
  "Trinidad and Tobago": [-61.2225, 10.6918],
  "United States Virgin Islands": [-64.8963, 18.3358],

  "Atlantic Ocean": [-35.0, 2.0],
  "Gulf of America": [-90.0, 25.0],
  "North Sea": [3.0, 56.0],
  "Black Sea": [34.0, 43.0],
  "Indian Ocean": [80.0, -20.0],
  "Mediterranean Sea": [18.0, 35.0],
  "Pacific Ocean": [-150.0, 0.0],

  "Arctic Regions": [0.0, 82.0],
  "Antarctic Regions": [0.0, -82.0],

  "Asia, Central": [67.0, 43.0],
  Kazakhstan: [66.9237, 48.0196],
  Kyrgyzstan: [74.7661, 41.2044],
  Tajikistan: [71.2761, 38.8610],
  Turkmenistan: [59.5563, 38.9697],
  Uzbekistan: [64.5853, 41.3775],
  "Asia, Northern": [90.0, 61.0],
  Russia: [105.3188, 61.5240],
  Siberia: [90.0, 60.0],
  "Asia, Southeastern": [106.0, 12.0],
  Brunei: [114.7277, 4.5353],
  Cambodia: [104.9910, 12.5657],
  Indochina: [103.0, 17.0],
  Laos: [102.4955, 19.8563],
  Malaysia: [101.9758, 4.2105],
  "Mekong Valley": [104.0, 15.0],
  Myanmar: [95.9560, 21.9162],
  Singapore: [103.8198, 1.3521],
  Thailand: [100.9925, 15.8700],
  "Timor-Leste": [125.7275, -8.8742],
  Vietnam: [108.2772, 14.0583],
  "Asia, Western": [43.0, 32.0],
  "Middle East": [43.0, 29.0],
  Bahrain: [50.5577, 26.0667],
  Iran: [53.6880, 32.4279],
  Iraq: [43.6793, 33.2232],
  Israel: [34.8516, 31.0461],
  Jordan: [36.2384, 30.5852],
  Kuwait: [47.4818, 29.3117],
  Lebanon: [35.8623, 33.8547],
  Oman: [55.9233, 21.4735],
  Qatar: [51.1839, 25.3548],
  "Saudi Arabia": [45.0792, 23.8859],
  Syria: [38.9968, 34.8021],
  Turkey: [35.2433, 38.9637],
  "United Arab Emirates": [53.8478, 23.4241],
  Yemen: [48.5164, 15.5527],
  "Asia, Southern": [78.0, 22.0],
  Afghanistan: [67.7100, 33.9391],
  Bangladesh: [90.3563, 23.6850],
  Bhutan: [90.4336, 27.5142],
  Himalayas: [83.0, 29.0],
  India: [78.9629, 20.5937],
  Sikkim: [88.5122, 27.5330],
  Maldives: [73.2207, 3.2028],
  Nepal: [84.1240, 28.3949],
  Pakistan: [69.3451, 30.3753],
  "Asia, Eastern": [113.0, 35.0],
  China: [104.1954, 35.8617],
  "Hong Kong": [114.1694, 22.3193],
  Tibet: [88.7879, 31.6927],
  Mongolia: [103.8467, 46.8625],

  "Ancient Lands": [35.0, 34.0],
  Arabia: [45.0, 23.0],
  Armenia: [44.7, 40.2],
  Byzantium: [28.98, 41.0],
  "Egypt, Ancient": [30.8, 26.8],
  "Greece, Ancient": [22.0, 39.0],
  Mesopotamia: [43.0, 33.0],
  Persia: [53.0, 32.0],
  "Austria-Hungary": [16.4, 47.5],
  "Commonwealth of Independent States": [60.0, 55.0],
  "Confederate States of America": [-84.5, 33.0],
  Czechoslovakia: [15.5, 49.8],
  "Germany, East": [12.4, 52.0],
  "Germany, West": [7.5, 50.5],
  "Holy Roman Empire": [10.5, 49.0],
  Korea: [127.7, 37.8],
  "Netherlands Antilles": [-68.9, 12.2],
  "New Guinea": [143.0, -5.5],
  "Ottoman Empire": [35.0, 39.0],
  "Panama Canal Zone": [-79.7, 9.0],
  Prussia: [20.5, 53.8],
  "Russia (Pre-1917)": [60.0, 58.0],
  USSR: [65.0, 56.0],
  Yugoslavia: [19.5, 44.0],
};

const COUNTRY_TERM_ALIASES = {
  "Bosnia and Herz.": "Bosnia and Herzegovina",
  "Central African Rep.": "Central African Republic",
  "Côte d'Ivoire": "Cote d'Ivoire",
  Czechia: "Czech Republic",
  "Dem. Rep. Congo": "Democratic Republic of the Congo",
  "Dominican Rep.": "Dominican Republic",
  "Eq. Guinea": "Equatorial Guinea",
  "Falkland Is.": "Falkland Islands",
  Georgia: "Georgia (Republic)",
  Macedonia: "Republic of North Macedonia",
  Belarus: "Republic of Belarus",
  "North Korea": "Democratic People's Republic of Korea",
  "S. Sudan": "South Sudan",
  "Solomon Is.": "Solomon Islands",
  "South Korea": "Republic of Korea",
  "United States of America": "United States",
};

function normalizePlaceName(name) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, " ")
    .trim()
    .toLowerCase();
}

function placeNameMatches(mapName, termName) {
  const alias = COUNTRY_TERM_ALIASES[mapName] || mapName;
  return normalizePlaceName(termName) === normalizePlaceName(alias)
    || normalizePlaceName(termName) === normalizePlaceName(mapName);
}

function WorldMap({ data }) {
  const { branches, childrenMap } = data;
  const primary = branches[0];
  const queryBuilder = usePersistentMeshQueries();
  const [selected, setSelected] = useState("Z01.107");
  const [selectedChild, setSelectedChild] = useState(null);
  const [hoveredCountry, setHoveredCountry] = useState(null);
  const [hoveredMarker, setHoveredMarker] = useState(null);

  const regions = primary
    ? (childrenMap.get(primary.treeNum) || []).sort((a, b) => a.treeNum.localeCompare(b.treeNum, undefined, { numeric: true }))
    : [];
  const byPath = new Map(regions.map(r => [r.treeNum, r]));
  const selectedRegion = byPath.get(selected) || regions[0];
  const selectedKids = selectedRegion
    ? (childrenMap.get(selectedRegion.treeNum) || []).sort((a, b) => a.term.name.localeCompare(b.term.name))
    : [];
  function collectDescendants(treeNum) {
    const found = [];
    const queue = [...(childrenMap.get(treeNum) || [])];
    while (queue.length) {
      const item = queue.shift();
      found.push(item);
      queue.push(...(childrenMap.get(item.treeNum) || []));
    }
    return found;
  }

  const selectedDescendants = selectedRegion ? collectDescendants(selectedRegion.treeNum) : [];
  const selectedChildItem = selectedChild
    ? selectedDescendants.find(item => item.treeNum === selectedChild)
    : null;
  const selectedGrandkids = selectedChild
    ? (childrenMap.get(selectedChild) || []).sort((a, b) => a.term.name.localeCompare(b.term.name))
    : [];
  const selectedPath = selectedChildItem
    ? [
        ...selectedDescendants
          .filter(item => selectedChildItem.treeNum === item.treeNum || selectedChildItem.treeNum.startsWith(item.treeNum + "."))
          .sort((a, b) => a.treeNum.length - b.treeNum.length),
      ]
    : [];
  const activeOverlay = SPECIAL_OVERLAYS[selected];
  const canProjectSelected = !!REGION_CONFIG[selected] || !!SPECIAL_OVERLAYS[selected];
  const markerSource = canProjectSelected
    ? selectedChildItem
      ? [selectedChildItem, ...selectedGrandkids]
      : selectedKids.length ? selectedKids : selectedRegion ? [selectedRegion] : []
    : [];
  const polarMarkers = ["Z01.208", "Z01.158"]
    .map(treeNum => byPath.get(treeNum))
    .filter(item => item && !markerSource.some(marker => marker.treeNum === item.treeNum));
  const locationMarkers = [...markerSource, ...polarMarkers]
    .map(item => ({
      ...item,
      coords: PLACE_COORDS[item.term.name],
      markerColor: SPECIAL_OVERLAYS[item.treeNum]?.color || activeOverlay?.color || REGION_CONFIG[selected]?.color || TREE_COLOR,
    }))
    .filter(item => item.coords);
  const detailItem = selectedChildItem || selectedRegion;
  const selectedColor = activeOverlay?.color || REGION_CONFIG[selected]?.color || TREE_COLOR;
  const selectedDetail = detailItem ? {
    id: detailItem.term.name,
    branch: "z",
    color: selectedColor,
    treeNum: detailItem.treeNum,
    ui: detailItem.term.ui,
    note: detailItem.term.note || detailItem.term.scopeNote,
  } : null;

  function selectRegion(treeNum) {
    setSelected(treeNum);
    setSelectedChild(null);
  }

  function findCountryTerm(mapName, regionId) {
    const region = byPath.get(regionId);
    if (!region) return null;
    return collectDescendants(region.treeNum).find(item => placeNameMatches(mapName, item.term.name));
  }

  function handleCountryClick(mapName, regionId) {
    if (!regionId) return;
    if (selected !== regionId) {
      selectRegion(regionId);
      return;
    }

    const country = findCountryTerm(mapName, regionId);
    if (country) setSelectedChild(country.treeNum);
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

  const SPECIAL = [
    { treeNum: "Z01.208", label: "Arctic Regions", color: "#88A8D8" },
    { treeNum: "Z01.158", label: "Antarctic Regions", color: "#A8C8D8" },
    { treeNum: "Z01.433", label: "Cities", color: "#D8A8A8" },
    { treeNum: "Z01.639", label: "Islands", color: "#C8D8A8" },
    { treeNum: "Z01.756", label: "Oceans and Seas", color: "#88C8D8" },
    { treeNum: "Z01.586", label: "Historical Locations", color: "#D8D888" },
  ];

  const regionTotals = Object.entries(REGION_CONFIG).map(([treeNum, cfg]) => ({
    treeNum,
    ...cfg,
    total: byPath.has(treeNum) ? countAll(treeNum) : 0,
  }));
  const topLevelTags = [
    ...regionTotals.map(region => ({
      treeNum: region.treeNum,
      label: region.label,
      color: region.color,
      total: region.total,
    })),
    ...SPECIAL.map(item => {
      const region = byPath.get(item.treeNum);
      return region ? {
        treeNum: item.treeNum,
        label: item.label,
        color: item.color,
        total: countAll(item.treeNum),
      } : null;
    }).filter(Boolean),
  ].sort((a, b) => a.label.localeCompare(b.label));

  function renderChildRow(parentTreeNum, color, label) {
    const kids = (childrenMap.get(parentTreeNum) || []).sort((a, b) => a.term.name.localeCompare(b.term.name));
    if (kids.length === 0) return null;
    return (
      <div style={{ marginTop: 14 }}>
        <div style={{ fontFamily: mono, fontSize: 7, color: "#ffffff33", letterSpacing: 2, marginBottom: 8 }}>
          {label} · {kids.length}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
          {kids.map(({ term, treeNum }) => {
            const active = selectedChild === treeNum || !!(selectedChild && selectedChild.startsWith(treeNum + "."));
            return (
              <button
                key={treeNum}
                onClick={() => setSelectedChild(treeNum)}
                style={{
                  fontFamily: mono,
                  fontSize: 7.5,
                  color: active ? "#fff" : color + "dd",
                  background: active ? color + "24" : color + "10",
                  border: `1px solid ${active ? color : color + "2a"}`,
                  borderRadius: 999,
                  padding: "3px 7px",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                {term.name}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <MeshBottomQueryLayout selected={selectedDetail} query={queryBuilder} contentStyle={{ padding: "22px 28px 24px", boxSizing: "border-box" }}>
        <div style={{ margin: "-22px -28px 18px" }}>
          <MeshPageHeader
            letter="Z"
            title="Geographic Locations"
            description="Geographic branches cover continents, countries, regions, cities, oceans, seas, and historical locations."
            color={TREE_COLOR}
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(520px, 1fr) minmax(320px, 380px)", gap: 14, alignItems: "start" }}>
        <div style={{ position: "relative", background: "linear-gradient(180deg, #101822 0%, #0d1319 100%)", border: "1px solid #ffffff10", borderRadius: 8, overflow: "hidden" }}>
          <ComposableMap
            projection="geoEqualEarth"
            projectionConfig={{ scale: 155 }}
            width={980}
            height={500}
            style={{ width: "100%", height: "auto", display: "block" }}
          >
            <Sphere stroke="#88C8D814" strokeWidth={0.8} fill="transparent" />
            <Graticule stroke="#ffffff0b" strokeWidth={0.6} />
            <Geographies geography={worldAtlas}>
              {({ geographies }) =>
                geographies.map((geo) => {
                  const name = geo.properties?.name;
                  const regionId = COUNTRY_REGION.get(name);
                  const cfg = regionId ? (REGION_CONFIG[regionId] || SPECIAL_OVERLAYS[regionId]) : null;
                  const active = regionId && selected === regionId;
                  const countryActive = active && selectedChildItem && placeNameMatches(name, selectedChildItem.term.name);
                  const hovered = hoveredCountry === name;
                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      onMouseEnter={() => setHoveredCountry(name)}
                      onMouseLeave={() => setHoveredCountry(null)}
                      onClick={() => handleCountryClick(name, regionId)}
                      style={{
                        default: {
                          fill: cfg ? (countryActive ? cfg.color : active ? cfg.color + "bb" : cfg.color + "55") : "#ffffff10",
                          stroke: countryActive ? "#fff" : active || hovered ? "#ffffffaa" : "#0f1117",
                          strokeWidth: countryActive ? 1.35 : active || hovered ? 0.7 : 0.35,
                          outline: "none",
                          cursor: regionId ? "pointer" : "default",
                        },
                        hover: {
                          fill: cfg ? (countryActive ? cfg.color : cfg.color + "cc") : "#ffffff18",
                          stroke: countryActive ? "#fff" : "#ffffffaa",
                          strokeWidth: countryActive ? 1.35 : 0.7,
                          outline: "none",
                          cursor: regionId ? "pointer" : "default",
                        },
                        pressed: {
                          fill: cfg ? cfg.color : "#ffffff22",
                          outline: "none",
                        },
                      }}
                    />
                  );
                })
              }
            </Geographies>
            {locationMarkers.map(({ term, treeNum, coords, markerColor }) => {
              const isDirectChild = selectedKids.some(kid => kid.treeNum === treeNum);
              const isTopRegion = byPath.has(treeNum);
              const isActive = selected === treeNum || selectedChild === treeNum || hoveredMarker === treeNum;
              const isOcean = selected === "Z01.756";
              const isHistorical = selected === "Z01.586";
              const isRegionalAnchor = !!REGION_CONFIG[selected] && !isTopRegion;
              return (
                <Marker
                  key={treeNum}
                  coordinates={coords}
                  onMouseEnter={() => setHoveredMarker(treeNum)}
                  onMouseLeave={() => setHoveredMarker(null)}
                  onClick={() => isTopRegion ? selectRegion(treeNum) : (isDirectChild || selectedChildItem) && setSelectedChild(treeNum)}
                >
                  {isHistorical ? (
                    <>
                      <line
                        x1={isActive ? -13 : -9}
                        x2={isActive ? 13 : 9}
                        y1={0}
                        y2={0}
                        stroke={markerColor}
                        strokeWidth={isActive ? 1.6 : 1}
                        strokeDasharray="2 2"
                        opacity={isActive ? 0.85 : 0.5}
                        style={{ pointerEvents: "none" }}
                      />
                      <path
                        d={isActive ? "M 0 -7 L 7 0 L 0 7 L -7 0 Z" : "M 0 -5 L 5 0 L 0 5 L -5 0 Z"}
                        fill={markerColor + (isActive ? "44" : "24")}
                        stroke="#fff"
                        strokeWidth={isActive ? 1.3 : 0.8}
                        style={{ cursor: isDirectChild ? "pointer" : "default", filter: `drop-shadow(0 0 5px ${markerColor})` }}
                      />
                    </>
                  ) : (
                    <circle
                      r={isOcean || isRegionalAnchor ? (isActive ? 8 : 5.5) : (isActive ? 5 : 3.4)}
                      fill={isOcean || isRegionalAnchor ? markerColor + (isActive ? "36" : "1c") : markerColor}
                      stroke="#fff"
                      strokeWidth={isActive ? 1.4 : 0.8}
                      strokeDasharray={isOcean || isRegionalAnchor ? "2 2" : undefined}
                      style={{ cursor: isTopRegion || isDirectChild || selectedChildItem ? "pointer" : "default", filter: `drop-shadow(0 0 5px ${markerColor})` }}
                    />
                  )}
                  {(isOcean || isRegionalAnchor) && (
                    <circle
                      r={isActive ? 15 : 10}
                      fill="transparent"
                      stroke={markerColor}
                      strokeWidth={isActive ? 1.2 : 0.7}
                      opacity={isActive ? 0.7 : 0.38}
                      style={{ pointerEvents: "none" }}
                    />
                  )}
                  <text
                    x={isOcean || isHistorical || isRegionalAnchor ? 10 : 6}
                    y={3}
                    style={{ fontFamily: mono, fontSize: isActive ? 8 : 6.5, fill: isActive ? "#fff" : markerColor, paintOrder: "stroke", stroke: "#0d1319", strokeWidth: 2.4, strokeLinejoin: "round", pointerEvents: "none" }}
                  >
                    {term.name}
                  </text>
                </Marker>
              );
            })}
          </ComposableMap>

          {activeOverlay && (
            <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
              {activeOverlay.marks.map((mark, index) => {
                if (mark.kind === "label") {
                  return (
                    <div key={index} style={{ position: "absolute", top: mark.top, left: mark.left, transform: "translate(-50%, -50%)", fontFamily: mono, fontSize: 8, letterSpacing: 2, color: activeOverlay.color, background: "#0f1117cc", border: `1px solid ${activeOverlay.color}55`, borderRadius: 4, padding: "4px 7px" }}>
                      {mark.text}
                    </div>
                  );
                }
                return (
                  <div key={index} style={{ position: "absolute", top: mark.top, left: mark.left, width: mark.width, height: mark.height, borderRadius: mark.radius, background: activeOverlay.color, opacity: mark.opacity, filter: "blur(1px)", boxShadow: `0 0 30px ${activeOverlay.color}66` }} />
                );
              })}
            </div>
          )}
          {hoveredCountry && (
            <div style={{ position: "absolute", right: 12, top: 10, fontFamily: mono, fontSize: 8, color: "#ffffff88", background: "#0f1117cc", border: "1px solid #ffffff12", borderRadius: 4, padding: "5px 8px" }}>
              {hoveredCountry}
            </div>
          )}
        </div>

        <section style={{ border: "1px solid #ffffff10", borderRadius: 8, background: "#ffffff04", padding: "14px 16px 16px", maxHeight: "min(620px, calc(100vh - 340px))", overflowY: "auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline", marginBottom: 10 }}>
            <div style={{ fontFamily: mono, fontSize: 8, color: TREE_COLOR, letterSpacing: 2 }}>
              GEOGRAPHIC LOCATIONS
            </div>
            <div style={{ fontFamily: mono, fontSize: 8, color: "#ffffff30" }}>
              {topLevelTags.length} top-level branches
            </div>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
            {topLevelTags.map(item => {
              const active = selected === item.treeNum;
              return (
                <button
                  key={item.treeNum}
                  onClick={() => selectRegion(item.treeNum)}
                  style={{
                    fontFamily: mono,
                    fontSize: 8,
                    color: active ? "#fff" : item.color,
                    background: active ? item.color + "24" : item.color + "10",
                    border: `1px solid ${active ? item.color : item.color + "35"}`,
                    borderRadius: 999,
                    padding: "4px 9px",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  {item.label} <span style={{ color: active ? "#ffffff88" : item.color + "88" }}>{item.total}</span>
                </button>
              );
            })}
          </div>
          {renderChildRow(selectedRegion?.treeNum, activeOverlay?.color || REGION_CONFIG[selected]?.color || TREE_COLOR, selectedRegion?.term.name || "Children")}
          {selectedPath.map(item => renderChildRow(item.treeNum, activeOverlay?.color || REGION_CONFIG[selected]?.color || TREE_COLOR, item.term.name))}
        </section>
        </div>
    </MeshBottomQueryLayout>
  );
}

export default function MeshZConcepts() {
  const { data, loading } = useZData();

  return (
    <div style={{ width: "100%", height: "100%", background: BG }}>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&display=swap" rel="stylesheet" />
      {loading ? <Loading /> : <WorldMap data={data} />}
    </div>
  );
}
