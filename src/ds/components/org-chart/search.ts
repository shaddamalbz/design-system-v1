/* ==========================================================================
   Org chart search: runs on the data, never on the DOM.

   With spatial virtualization most cards don't exist as elements, so the
   browser's find-in-page can't see them. Search goes through the node list
   instead; the layout already knows where every match is, so the chart can
   fly there and the virtual window mounts the cards on arrival.

   Matching: every word of the query must appear in the node's search text
   (name + title by default), ignoring case and accents. 100k nodes take a
   few milliseconds per keystroke.

   Ranking, best first:
     0  the name starts with the query        "zo"  → Zoe Zhou
     1  a word starts with the query          "zh"  → Zoe Zhou
     2  the query appears anywhere            "oe"  → Zoe Zhou
   then higher in the org first (smaller depth), then data order.
   Sorted with a counting sort on (rank, depth): O(n), no comparisons.
   ========================================================================== */

/** Lowercase, accents stripped: "Inés" → "ines". */
export function normalize(text: string) {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

export interface SearchResult {
  /** The normalized query this result is for ("" = no search). */
  query: string;
  /** 1 for every matching node. */
  mask: Uint8Array;
  /** Every match, best first. */
  ranked: Int32Array;
}

export const EMPTY_RESULT: SearchResult = { query: "", mask: new Uint8Array(0), ranked: new Int32Array(0) };

/**
 * @param text normalized search text per node (see normalize)
 * @param depth depth per node, for the tie-break
 */
export function runSearch(text: readonly string[], depth: Uint16Array, rawQuery: string): SearchResult {
  const query = normalize(rawQuery).trim().replace(/\s+/g, " ");
  if (!query) return EMPTY_RESULT;
  const words = query.split(" ");
  const first = words[0];
  const n = text.length;
  const mask = new Uint8Array(n);

  let maxDepth = 0;
  for (let i = 0; i < n; i++) if (depth[i] > maxDepth) maxDepth = depth[i];
  const levels = maxDepth + 1;

  // Pass 1: match and key each node; count keys for the counting sort
  const keyOf = new Int32Array(n).fill(-1);
  const counts = new Int32Array(3 * levels + 1);
  let total = 0;
  for (let i = 0; i < n; i++) {
    const s = text[i];
    let ok = true;
    for (let w = 0; w < words.length && ok; w++) ok = s.includes(words[w]);
    if (!ok) continue;
    mask[i] = 1;
    const rank = s.startsWith(first) ? 0 : s.includes(" " + first) ? 1 : 2;
    const key = rank * levels + depth[i];
    keyOf[i] = key;
    counts[key + 1]++;
    total++;
  }

  // Pass 2: prefix sums, then place each match in its slot (stable: data order kept)
  for (let k = 0; k < 3 * levels; k++) counts[k + 1] += counts[k];
  const ranked = new Int32Array(total);
  for (let i = 0; i < n; i++) if (keyOf[i] >= 0) ranked[counts[keyOf[i]]++] = i;

  return { query, mask, ranked };
}

/** Splits `text` around case/accent-insensitive occurrences of the query words, for <mark>. */
export function highlightParts(text: string, query: string): { text: string; hit: boolean }[] {
  if (!query) return [{ text, hit: false }];
  const norm = normalize(text);
  // Positions line up when normalize() keeps the length (precomposed text: "é" → "e").
  // When it doesn't (already decomposed input), skip the highlight rather than mark the wrong letters.
  if (norm.length !== text.length) return [{ text, hit: false }];
  const hits = new Uint8Array(text.length);
  for (const word of query.split(" ")) {
    if (!word) continue;
    for (let at = norm.indexOf(word); at !== -1; at = norm.indexOf(word, at + 1)) hits.fill(1, at, at + word.length);
  }
  const parts: { text: string; hit: boolean }[] = [];
  let start = 0;
  for (let i = 1; i <= text.length; i++) {
    if (i === text.length || hits[i] !== hits[start]) {
      parts.push({ text: text.slice(start, i), hit: hits[start] === 1 });
      start = i;
    }
  }
  return parts;
}
