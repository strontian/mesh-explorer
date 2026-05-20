#!/usr/bin/env python3
"""
PubMed Explorer — query publication counts and decade breakdowns via NCBI E-utilities.
Usage: python pubmed_explorer.py "dust mite" ["mold allergy"]
"""

import sys
import time
import urllib.request
import urllib.parse
import xml.etree.ElementTree as ET

BASE_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/"
DELAY = 0.4  # seconds between requests (free tier: 3/sec max)

DECADES = [
    (1960, 1969), (1970, 1979), (1980, 1989), (1990, 1999),
    (2000, 2009), (2010, 2019), (2020, 2029),
]


def fetch_xml(url):
    with urllib.request.urlopen(url, timeout=15) as resp:
        return ET.fromstring(resp.read())


def check_db():
    url = BASE_URL + "einfo.fcgi?db=pubmed&retmode=xml"
    root = fetch_xml(url)
    name = root.findtext(".//DbName")
    return name == "pubmed"


def search_count(term, date_filter=None):
    query = term
    if date_filter:
        start, end = date_filter
        query += f" AND {start}:{end}[pdat]"
    params = urllib.parse.urlencode({"db": "pubmed", "term": query, "retmode": "xml", "retmax": 0})
    url = BASE_URL + f"esearch.fcgi?{params}"
    root = fetch_xml(url)
    count_el = root.find("Count")
    return int(count_el.text) if count_el is not None else 0


def get_counts(term):
    total = search_count(term)
    time.sleep(DELAY)
    decade_counts = {}
    for start, end in DECADES:
        count = search_count(term, (start, end))
        decade_counts[(start, end)] = count
        time.sleep(DELAY)
    return total, decade_counts


def bar(count, max_count, width=30):
    if max_count == 0:
        return " " * width
    filled = round(count / max_count * width)
    return "█" * filled + "░" * (width - filled)


def print_results(term, total, decade_counts):
    max_count = max(decade_counts.values()) if decade_counts else 1
    print(f"\n  Term: \"{term}\"")
    print(f"  Total publications: {total:,}")
    print()
    print(f"  {'Decade':<12} {'Count':>7}  {'':30}")
    print(f"  {'──────':<12} {'─────':>7}  {'──────────────────────────────':30}")
    for (start, end), count in decade_counts.items():
        label = f"{start}s"
        b = bar(count, max_count)
        print(f"  {label:<12} {count:>7,}  {b}")


def compare(terms):
    all_data = []
    for i, term in enumerate(terms):
        if i > 0:
            time.sleep(DELAY)
        print(f"  Fetching: \"{term}\"...", end="", flush=True)
        total, decade_counts = get_counts(term)
        all_data.append((term, total, decade_counts))
        print(" done")

    print("\n" + "═" * 60)
    for term, total, decade_counts in all_data:
        print_results(term, total, decade_counts)
        print()

    if len(all_data) == 2:
        term1, total1, _ = all_data[0]
        term2, total2, _ = all_data[1]
        print("─" * 60)
        if total2 > 0:
            ratio = total1 / total2
            print(f"  Ratio: \"{term1}\" has {ratio:.1f}x the publications of \"{term2}\"")
        print("─" * 60)


def main():
    terms = sys.argv[1:]
    if not terms:
        print("Usage: python pubmed_explorer.py \"term1\" [\"term2\"]")
        sys.exit(1)

    print("\nChecking PubMed connection...", end="", flush=True)
    if not check_db():
        print(" FAILED — could not reach PubMed")
        sys.exit(1)
    print(" OK")

    compare(terms)


if __name__ == "__main__":
    main()
