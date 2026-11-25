/* ==========================================================================
   Org chart layout: a tidy tree with three arrangements, computed in O(n)
   with no recursion (100k nodes, any depth).

   Every card has the SAME size. That is what makes the chart virtualizable,
   exactly like a fixed row height in a virtual list: positions come from
   arithmetic, never from measuring the DOM, so a node that isn't rendered
   still has a known box.

   How a manager's reports are arranged:
     stack  all reports are leaves (≥ 2): a column under the manager,
            indented, joined by a spine on the left. The usual "team".
     row    up to WRAP reports: side by side, the manager centered above.
     grid   more than WRAP reports: rows of subtrees split around a center
            corridor, so the trunk runs straight down without crossing a
            card. The column count is the one that brings the block closest
            to TARGET_ASPECT, so big orgs fill a screen-shaped area instead
            of a strip millions of pixels wide.
   ========================================================================== */

export const NODE_W = 208;
export const NODE_H = 60;
const GAP_X = 20; // between sibling subtrees
const LEVEL_GAP = 48; // manager card bottom → report card top
const ROW_GAP = 48; // between grid rows (room for the bus line)
const CORRIDOR = 40; // center channel in a grid, for the trunk
const STACK_INDENT = 20;
const STACK_TOP = 12;
const STACK_GAP = 8;
const WRAP = 4;
const TARGET_ASPECT = 1.6; // width : height a grid block aims for
const MAX_COLS = 64; // columns tried per manager (keeps huge teams O(k · 64))

export const MODE_LEAF = 0;
export const MODE_STACK = 1;
export const MODE_ROW = 2;
export const MODE_GRID = 3;

export interface TreeLayout {
  count: number;
  /** Card top-left, world units. */
  x: Float64Array;
  y: Float64Array;
  /** Parent index, -1 for a root. Cycles in the input are cut. */
  parent: Int32Array;
  /** Children of i: childList[childStart[i] .. childStart[i + 1]) */
  childStart: Int32Array;
  childList: Int32Array;
  /** How i arranges its children (MODE_*). */
  mode: Uint8Array;
  /** Depth from the root, 0-based. */
  depth: Uint16Array;
  /** World bounds of everything drawn. */
  width: number;
  height: number;
  /** Number of parent links cut to break cycles (0 for valid input). */
  cyclesCut: number;
}

/** Turns parent pointers into positions. `parentOf[i]` is -1 for a root. */
export function layoutTree(parentOf: Int32Array): TreeLayout {
  const n = parentOf.length;
  const parent = Int32Array.from(parentOf);

  // 1. Cut cycles: follow parent links; meeting a node of the current walk means a loop.
  let cyclesCut = 0;
  const state = new Uint8Array(n); // 0 new, 1 on current walk, 2 done
  const walk: number[] = [];
  for (let s = 0; s < n; s++) {
    if (state[s]) continue;
    let v = s;
    while (v !== -1 && state[v] === 0) {
      state[v] = 1;
      walk.push(v);
      v = parent[v];
    }
    if (v !== -1 && state[v] === 1) {
      parent[v] = -1;
      cyclesCut++;
    }
    for (const w of walk) state[w] = 2;
    walk.length = 0;
  }

  // 2. Children as CSR arrays. Index n is a virtual root holding the real roots.
  const total = n + 1;
  const childStart = new Int32Array(total + 1);
  for (let i = 0; i < n; i++) childStart[(parent[i] === -1 ? n : parent[i]) + 1]++;
  for (let i = 0; i < total; i++) childStart[i + 1] += childStart[i];
  const fill = childStart.slice(0, total);
  const childList = new Int32Array(n);
  for (let i = 0; i < n; i++) childList[fill[parent[i] === -1 ? n : parent[i]]++] = i;

  // 3. Pre-order from the virtual root; reversed it's a post-order (children first).
  const order = new Int32Array(total);
  const depth = new Uint16Array(total);
  {
    const stack = [n];
    let k = 0;
    while (stack.length) {
      const v = stack.pop()!;
      order[k++] = v;
      for (let c = childStart[v + 1] - 1; c >= childStart[v]; c--) {
        const child = childList[c];
        depth[child] = v === n ? 0 : depth[v] + 1;
        stack.push(child);
      }
    }
  }

  // 4. Post-order: subtree size, card offset inside it, children's offsets.
  const w = new Float64Array(total);
  const h = new Float64Array(total);
  const anchor = new Float64Array(total); // card x inside own subtree box
  const relX = new Float64Array(total); // subtree box offset inside parent's box
  const relY = new Float64Array(total);
  const mode = new Uint8Array(total);

  /** Half-width (one side of the corridor) and total row height of children a..b in rows of `cols`. */
  const measureGrid = (a: number, b: number, cols: number): [number, number] => {
    let half = NODE_W / 2;
    let rowsH = 0;
    for (let r = a; r < b; r += cols) {
      const end = Math.min(r + cols, b);
      const split = r + Math.ceil((end - r) / 2);
      let left = 0;
      let right = 0;
      let rowH = 0;
      for (let c = r; c < end; c++) {
        const child = childList[c];
        if (c < split) left += w[child] + GAP_X;
        else right += w[child] + GAP_X;
        if (h[child] > rowH) rowH = h[child];
      }
      half = Math.max(half, left - GAP_X, right - GAP_X);
      rowsH += rowH + ROW_GAP;
    }
    return [half, rowsH - ROW_GAP];
  };

  for (let o = total - 1; o >= 0; o--) {
    const v = order[o];
    const a = childStart[v];
    const b = childStart[v + 1];
    const k = b - a;
    const virtual = v === n;
    const cardH = virtual ? 0 : NODE_H;
    const gap = virtual ? 0 : LEVEL_GAP;

    if (k === 0) {
      mode[v] = MODE_LEAF;
      w[v] = NODE_W;
      h[v] = NODE_H;
      continue;
    }

    let allLeaves = !virtual && k >= 2;
    for (let c = a; c < b && allLeaves; c++) if (childStart[childList[c] + 1] > childStart[childList[c]]) allLeaves = false;

    if (allLeaves) {
      mode[v] = MODE_STACK;
      for (let j = 0; j < k; j++) {
        const c = childList[a + j];
        relX[c] = STACK_INDENT;
        relY[c] = NODE_H + STACK_TOP + j * (NODE_H + STACK_GAP);
      }
      w[v] = STACK_INDENT + NODE_W;
      h[v] = NODE_H + STACK_TOP + k * (NODE_H + STACK_GAP) - STACK_GAP;
      continue;
    }

    if (k <= WRAP) {
      mode[v] = MODE_ROW;
      let cx = 0;
      let maxH = 0;
      for (let c = a; c < b; c++) {
        const child = childList[c];
        relX[child] = cx;
        relY[child] = cardH + gap;
        cx += w[child] + GAP_X;
        if (h[child] > maxH) maxH = h[child];
      }
      const span = cx - GAP_X;
      const first = childList[a];
      const last = childList[b - 1];
      const mid = (relX[first] + anchor[first] + relX[last] + anchor[last]) / 2; // card-left midpoint = centers' midpoint
      anchor[v] = mid;
      w[v] = Math.max(span, mid + NODE_W);
      h[v] = cardH + gap + maxH;
      continue;
    }

    // Grid: rows of `cols` subtrees, each row split into halves around the corridor.
    mode[v] = MODE_GRID;
    // Pick the column count whose block is closest to a screen-like shape
    let cols = 1;
    let half = 0;
    let bestScore = Infinity;
    for (let tryCols = 1, last = Math.min(k, MAX_COLS); tryCols <= last; tryCols++) {
      const [tryHalf, rowsH] = measureGrid(a, b, tryCols);
      const score = Math.abs(Math.log((tryHalf * 2 + CORRIDOR) / (cardH + gap + rowsH)) - Math.log(TARGET_ASPECT));
      if (score < bestScore) {
        bestScore = score;
        cols = tryCols;
        half = tryHalf;
      }
    }
    const center = half + CORRIDOR / 2;
    let top = cardH + gap;
    for (let r = a; r < b; r += cols) {
      const end = Math.min(r + cols, b);
      const split = r + Math.ceil((end - r) / 2);
      let rowH = 0;
      let x = center - CORRIDOR / 2;
      for (let c = split - 1; c >= r; c--) {
        const child = childList[c];
        x -= w[child];
        relX[child] = x;
        x -= GAP_X;
      }
      x = center + CORRIDOR / 2;
      for (let c = split; c < end; c++) {
        const child = childList[c];
        relX[child] = x;
        x += w[child] + GAP_X;
      }
      for (let c = r; c < end; c++) {
        const child = childList[c];
        relY[child] = top;
        if (h[child] > rowH) rowH = h[child];
      }
      top += rowH + ROW_GAP;
    }
    anchor[v] = center - NODE_W / 2;
    w[v] = center * 2;
    h[v] = top - ROW_GAP;
  }

  // 5. Pre-order: absolute positions.
  const left = new Float64Array(total);
  const topY = new Float64Array(total);
  const x = new Float64Array(n);
  const y = new Float64Array(n);
  let maxX = 0;
  let maxY = 0;
  for (let o = 0; o < total; o++) {
    const v = order[o];
    if (v !== n) {
      const p = parent[v] === -1 ? n : parent[v];
      left[v] = left[p] + relX[v];
      topY[v] = topY[p] + relY[v];
      x[v] = left[v] + anchor[v];
      y[v] = topY[v];
      if (x[v] + NODE_W > maxX) maxX = x[v] + NODE_W;
      if (y[v] + NODE_H > maxY) maxY = y[v] + NODE_H;
    }
  }

  return {
    count: n,
    x,
    y,
    parent,
    childStart: childStart.slice(0, n + 1),
    childList,
    mode: mode.slice(0, n),
    depth: depth.slice(0, n),
    width: maxX,
    height: maxY,
    cyclesCut,
  };
}

export interface EdgeGeometry {
  /** Polyline of the connector into child c: pts[c*8 .. c*8 + len[c]*2) */
  pts: Float32Array;
  /** Points per connector: 3 (stack spine) or 4 (elbow), 0 for a root. */
  len: Uint8Array;
  /** One box per straight segment: 3 per connector, 4 floats each (x0 is NaN when unused). */
  segments: Float32Array;
  /** Connector (child index) each segment belongs to. */
  segmentOwner: Int32Array;
}

/** Connector into each child, precomputed once so drawing never allocates. */
export function buildEdges(t: TreeLayout): EdgeGeometry {
  const n = t.count;
  const pts = new Float32Array(n * 8);
  const len = new Uint8Array(n);
  const segments = new Float32Array(n * 12).fill(NaN);
  const segmentOwner = new Int32Array(n * 3);
  for (let c = 0; c < n; c++) {
    const p = t.parent[c];
    if (p === -1) continue;
    const o = c * 8;
    if (t.mode[p] === MODE_STACK) {
      // Spine down the manager's left, then right into the report
      const sx = t.x[p] + STACK_INDENT / 2;
      const cy = t.y[c] + NODE_H / 2;
      pts.set([sx, t.y[p] + NODE_H, sx, cy, t.x[c], cy], o);
      len[c] = 3;
    } else {
      // Down from the manager, along the bus, down into the report
      const px = t.x[p] + NODE_W / 2;
      const cx = t.x[c] + NODE_W / 2;
      const bus = t.y[c] - LEVEL_GAP / 2;
      pts.set([px, t.y[p] + NODE_H, px, bus, cx, bus, cx, t.y[c]], o);
      len[c] = 4;
    }
    // Axis-aligned segments: each box is a line, so it only touches a strip of cells
    for (let s = 0; s < len[c] - 1; s++) {
      const a = o + s * 2;
      const b = c * 12 + s * 4;
      segments[b] = Math.min(pts[a], pts[a + 2]);
      segments[b + 1] = Math.min(pts[a + 1], pts[a + 3]);
      segments[b + 2] = Math.max(pts[a], pts[a + 2]);
      segments[b + 3] = Math.max(pts[a + 1], pts[a + 3]);
    }
    segmentOwner.fill(c, c * 3, c * 3 + 3);
  }
  return { pts, len, segments, segmentOwner };
}

/** Card boxes, 4 floats per node: x0, y0, x1, y1. */
export function nodeBoxes(t: TreeLayout): Float32Array {
  const boxes = new Float32Array(t.count * 4);
  for (let i = 0; i < t.count; i++) {
    boxes[i * 4] = t.x[i];
    boxes[i * 4 + 1] = t.y[i];
    boxes[i * 4 + 2] = t.x[i] + NODE_W;
    boxes[i * 4 + 3] = t.y[i] + NODE_H;
  }
  return boxes;
}
