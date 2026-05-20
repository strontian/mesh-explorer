#!/usr/bin/env node
// Downloads desc2026.gz from NLM, parses the MeSH descriptor XML, and
// writes a compact flat JSON to public/mesh-terms.json.
//
// Output format per term:
//   { ui, name, treeNums, note? }
//   - ui:       NLM descriptor ID (e.g. "D000001")
//   - name:     preferred term name
//   - treeNums: array of MeSH tree numbers (e.g. ["C08.127.108"])
//   - note:     scope note, truncated to NOTE_MAX chars (omitted if empty)

import { createWriteStream, createReadStream, existsSync } from "node:fs";
import { writeFile, mkdir } from "node:fs/promises";
import { createGunzip } from "node:zlib";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

const GZ_URL =
  "https://nlmpubs.nlm.nih.gov/projects/mesh/MESH_FILES/xmlmesh/desc2026.gz";
const GZ_PATH = "scripts/desc2026.gz";
const OUT_PATH = "public/mesh-terms.json";
const NOTE_MAX = 400;

// ── Download ──────────────────────────────────────────────────────────────
async function download() {
  if (existsSync(GZ_PATH)) {
    console.log("Using cached scripts/desc2026.gz");
    return;
  }
  console.log("Downloading MeSH 2026 XML (~16 MB compressed)...");
  const res = await fetch(GZ_URL);
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  await pipeline(Readable.fromWeb(res.body), createWriteStream(GZ_PATH));
  console.log("Download complete.");
}

// ── Extract fields from one <DescriptorRecord> string ─────────────────────
function extractTerm(xml) {
  const ui = xml.match(/<DescriptorUI>([^<]+)<\/DescriptorUI>/)?.[1];
  const name = xml.match(
    /<DescriptorName>\s*<String>([^<]+)<\/String>/
  )?.[1];
  if (!ui || !name) return null;

  const treeNums = [...xml.matchAll(/<TreeNumber>([^<]+)<\/TreeNumber>/g)].map(
    (m) => m[1]
  );
  if (!treeNums.length) return null; // terms without tree positions are suppressed

  const rawNote = xml
    .match(/<ScopeNote>([\s\S]*?)<\/ScopeNote>/)?.[1]
    ?.replace(/\s+/g, " ")
    ?.replace(/&amp;/g, "&")
    ?.replace(/&lt;/g, "<")
    ?.replace(/&gt;/g, ">")
    ?.replace(/&quot;/g, '"')
    ?.trim();
  const note = rawNote ? rawNote.slice(0, NOTE_MAX) : undefined;

  return note ? { ui, name, treeNums, note } : { ui, name, treeNums };
}

// ── Stream-parse the XML record by record ────────────────────────────────
function parse() {
  console.log("Parsing XML (streaming)...");
  return new Promise((resolve, reject) => {
    const terms = [];
    let buf = "";
    let count = 0;
    const CLOSE = "</DescriptorRecord>";

    // NLM serves the file as plain XML regardless of the .gz extension
    const stream = createReadStream(GZ_PATH);
    stream.setEncoding("utf8");

    stream.on("data", (chunk) => {
      buf += chunk;
      let end;
      while ((end = buf.indexOf(CLOSE)) !== -1) {
        const start = buf.lastIndexOf("<DescriptorRecord", end);
        if (start !== -1) {
          const record = buf.slice(start, end + CLOSE.length);
          const term = extractTerm(record);
          if (term) terms.push(term);
          count++;
          if (count % 5000 === 0)
            process.stdout.write(`  processed ${count} records...\r`);
        }
        buf = buf.slice(end + CLOSE.length);
      }
    });

    stream.on("end", () => {
      process.stdout.write("\n");
      resolve(terms);
    });
    stream.on("error", reject);
  });
}

// ── Main ──────────────────────────────────────────────────────────────────
async function main() {
  await mkdir("scripts", { recursive: true });
  await mkdir("public", { recursive: true });

  await download();
  const terms = await parse();

  console.log(`Parsed ${terms.length} terms with tree positions`);

  const json = JSON.stringify(terms);
  await writeFile(OUT_PATH, json);

  const mb = (json.length / 1e6).toFixed(2);
  const withNotes = terms.filter((t) => t.note).length;
  console.log(`Written: ${OUT_PATH}  (${mb} MB)`);
  console.log(
    `Stats: ${terms.length} terms, ${withNotes} with scope notes, ${NOTE_MAX}-char cap`
  );

  // Per-tree summary
  const treeCounts = {};
  for (const t of terms) {
    for (const tn of t.treeNums) {
      const key = tn[0];
      treeCounts[key] = (treeCounts[key] || 0) + 1;
    }
  }
  console.log("\nTerms per top-level tree:");
  Object.entries(treeCounts)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .forEach(([k, v]) => console.log(`  ${k}: ${v}`));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
