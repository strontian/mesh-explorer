# MeSH Explorer — Project Handoff

## What this project is

A data visualization and exploration tool for the **NIH National Library of Medicine MeSH (Medical Subject Headings)** taxonomy, built as a stepping stone toward a longer-form article comparing the volume and nature of biomedical research across different topics (originally motivated by dust mites vs. mold, but the tool is intentionally topic-agnostic).

The end goal is an interactive article or tool that lets readers explore *how much* research exists on various topics in PubMed, *what* that research studies (via MeSH tag co-occurrence), and *how* that research is structured (study types, populations, time trends).

## What we've built so far

### Four React components (JSX, no external dependencies beyond React + Recharts if needed)

| File | What it is | Status |
|------|-----------|--------|
| `mesh_cosmos.jsx` | Full 16-tree MeSH explorer with 3 zoom levels: Galaxy (all trees as cards), Planet (branches within a tree), Surface (individual terms + detail). M tree has real NLM data. | Working, good foundation |
| `mesh_explorer.jsx` | Earlier filter-builder UI — lets you pick MeSH tags and generates a PubMed query string. Less polished, mostly superseded. | Keep for reference |
| `mesh_m_concepts.jsx` | Five layout concept sketches for the M01 Named Groups page, switchable via tabs: Census Grid, Concentric Rings, Tag Cloud, Swim Lanes, Card Wall. | Working |
| `mesh_swimlanes.jsx` | The polished Swim Lanes view for M01 Named Groups — the direction we decided to pursue. See details below. | Working, main deliverable |

### The Swim Lanes pattern (our design direction)

`mesh_swimlanes.jsx` is the most developed piece. Key design decisions:

- **Each lane gets a layout that matches its data's nature** — this is the core insight
- **Lane 1 — Age Groups:** Gantt-style horizontal bars on a 0–90 year axis. All rows use CSS grid (`140px 1fr 72px`) so bars are pixel-perfectly aligned regardless of label length
- **Lane 2 — Occupational Groups:** Expandable nested tree. Click to expand/collapse. Health Personnel → Physicians → all 31 specialties are in there with real tree numbers
- **Lane 3 — Persons (other):** 64 terms softly clustered by theme (Family, Health Status, Social Circumstance, Lifestyle, Identity, etc.) with per-cluster colors
- **Cross-lane relationships:** Hover a Persons term and related Age Groups highlight (and vice versa). Powered by a hand-curated `AGE_RELATIONS` map
- **Header context strip:** Tree number, description, term counts before you dive in
- **Status bar:** When hovering, shows the MeSH tree path or related terms

### Data notes

- M01 (Named Groups) has **real NLM data** pulled directly from meshb.nlm.nih.gov — all term names, tree numbers, and hierarchy are accurate
- The other 15 trees in `mesh_cosmos.jsx` have **curated/approximated data** — structure is real but term lists are representative subsets, not complete
- Tree numbers format: `M01.526.485.810.020` = Persons > Occupational Groups > Health Personnel > Physicians > Allergists

## What comes next

### Immediate next steps
1. **Build custom lane layouts for the remaining high-priority trees** — suggested order:
   - **C (Diseases)** — wide, not deep; good candidate for a treemap or grouped card view
   - **E (Techniques/Study Design)** — flat enough for a simple categorical view; important for the article's "what kind of research" angle
   - **B (Organisms)** — very deep biological taxonomy; the drill-down / zoom metaphor works well here
   - **D (Chemicals & Drugs)** — enormous; needs search-first rather than browse-first

2. **Plug in real MeSH data via the NLM API**
   - MeSH data is freely downloadable in XML/RDF from nlm.nih.gov
   - The E-utilities API can also return MeSH terms for any PubMed search
   - No API key needed for low-volume use; free key available at ncbi.nlm.nih.gov/account/ for higher volume (10 req/sec vs 3)

3. **PubMed integration** — a working script already exists (from an earlier Claude Code session) that:
   - Queries PubMed E-utilities API
   - Returns publication counts for any search term
   - Breaks counts down by decade
   - Compares two terms side by side (e.g. "dust mites" vs "mold allergy")
   - Found: dust mites ~10,300 papers, mold allergy ~13,667 — mold has ~1.3x more
   - Interesting historical finding: dust mite research barely existed in the 1960s (19 papers) vs mold (492)

4. **MeSH co-occurrence analysis** — next big analytical goal:
   - Use EFetch to pull MeSH tags from a large set of PubMed papers
   - Count which tags co-occur most frequently with a given term
   - This answers "what are researchers studying dust mites *against*?"
   - Needs: ESearch (get PMIDs) → EFetch (get full records with MeSH) → parse tags

## Design principles established

- **Dark theme** (`#0f1117` background, `#e8e8e8` primary text, colored accents per tree)
- **Font:** JetBrains Mono throughout (monospace feels right for a taxonomy/data tool)
- **Each tree has a color:** B=`#81B29A`, C=`#F2CC8F`/`#F4A261`, D=`#9B72CF`, E=`#4ECDC4`, M=`#AED6F1`, etc.
- **No dust-mite-specific UI** — the explorer is topic-agnostic; the article layer comes later
- **Exploration over query-building** — the primary UX goal is learning and discovery, not constructing search strings

## Key facts about MeSH (for context)

- 30,764 main headings as of 2024, updated annually by NLM
- 16 top-level trees (A–Z with gaps): Anatomy, Organisms, Diseases, Chemicals, Techniques, Psychology, Phenomena, Disciplines, Sociology, Technology, Humanities, Information Science, Named Groups, Health Care, Publication Types, Geographicals
- Tags are assigned by trained NLM indexers (not authors) after publication
- The asterisk (*) on a tag = "major topic" — the paper is *primarily* about this concept
- Tree numbers encode the full path: each dot-separated segment = one level deeper
- "Explosion" = searching a broad term automatically includes all child terms
- MeSH is used by PubMed, ClinicalTrials.gov, Cochrane, WHO IRIS, and many institutional libraries
- Data is freely available, US government, essentially public domain (abstracts may have journal copyright)

## PubMed API notes

- Base URL: `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/`
- Key endpoints: `esearch.fcgi` (counts + IDs), `efetch.fcgi` (full records), `elink.fcgi` (related records), `egquery.fcgi` (cross-database counts)
- Rate limit: 3 req/sec without key, 10/sec with (free key)
- EFetch can return MeSH tags, abstracts, authors, journal, date for any PMID
- Max 10,000 records per ESearch query; use date-range batching for larger sets
