/* ==========================================================================
   SpatialGrid: a static uniform-grid index over boxes.

   The 2D twin of a virtual list's "which rows are on screen?". A list can
   answer that with division (scrollTop / rowHeight) because rows sit on one
   axis. Boxes on a plane can't: we bucket them into square cells once, and a
   viewport query only visits the cells it overlaps. Cost is
   O(cells touched + boxes near the viewport), whatever the total count.

   Why a grid and not a quadtree / R-tree: every card here is the same size
   and the layout is fairly even, which is the grid's best case. A tree
   index earns its keep with wildly mixed sizes or very clumpy data.

   Storage is CSR (compressed sparse rows), built in two passes:
     cellStart[c] .. cellStart[c + 1]  →  slice of `entries` for cell c
   Two typed arrays, no Map, no per-cell array: building 100k boxes takes
   a few milliseconds and the memory is flat.

   An item can own several boxes (`owner`): an L-shaped connector is indexed
   as its straight segments, each a thin strip of cells, instead of one
   bounding box that would cover thousands of empty cells.

   A box overlapping several cells is listed in each of them; queries
   de-duplicate items with a per-item "last seen" stamp instead of a Set.
   ========================================================================== */

export class SpatialGrid {
  readonly cellSize: number;
  readonly cols: number;
  readonly rows: number;
  private readonly boxes: Float32Array;
  private readonly owner: Int32Array | null;
  private readonly cellStart: Int32Array;
  private readonly entries: Int32Array;
  private readonly stamp: Uint32Array;
  private queryId = 0;

  /**
   * @param boxes 4 floats per box (x0, y0, x1, y1). A box whose x0 is NaN is skipped.
   * @param width world width; boxes are expected inside [0, width] × [0, height]
   * @param owner item id of each box, when items have several boxes. Default: box i is item i.
   */
  constructor(boxes: Float32Array, width: number, height: number, cellSize = 256, owner?: Int32Array) {
    const count = boxes.length / 4;
    this.boxes = boxes;
    this.owner = owner ?? null;
    this.cellSize = cellSize;
    const cols = (this.cols = Math.max(1, Math.ceil(width / cellSize)));
    const rows = (this.rows = Math.max(1, Math.ceil(height / cellSize)));
    let items = count;
    if (owner) {
      items = 0;
      for (let i = 0; i < owner.length; i++) if (owner[i] >= items) items = owner[i] + 1;
    }
    this.stamp = new Uint32Array(items);

    const cells = cols * rows;
    const cellStart = new Int32Array(cells + 1);
    const inv = 1 / cellSize;
    const col = (v: number) => Math.min(cols - 1, Math.max(0, Math.floor(v * inv)));
    const row = (v: number) => Math.min(rows - 1, Math.max(0, Math.floor(v * inv)));

    // Pass 1: count entries per cell
    for (let i = 0; i < count; i++) {
      const b = i * 4;
      if (Number.isNaN(boxes[b])) continue;
      const c0 = col(boxes[b]);
      const c1 = col(boxes[b + 2]);
      const r1 = row(boxes[b + 3]);
      for (let r = row(boxes[b + 1]); r <= r1; r++) for (let c = c0; c <= c1; c++) cellStart[r * cols + c + 1]++;
    }
    for (let c = 0; c < cells; c++) cellStart[c + 1] += cellStart[c];

    // Pass 2: fill
    const entries = new Int32Array(cellStart[cells]);
    const cursor = cellStart.slice(0, cells);
    for (let i = 0; i < count; i++) {
      const b = i * 4;
      if (Number.isNaN(boxes[b])) continue;
      const c0 = col(boxes[b]);
      const c1 = col(boxes[b + 2]);
      const r1 = row(boxes[b + 3]);
      for (let r = row(boxes[b + 1]); r <= r1; r++) for (let c = c0; c <= c1; c++) entries[cursor[r * cols + c]++] = i;
    }

    this.cellStart = cellStart;
    this.entries = entries;
  }

  /** Cell columns/rows a world rectangle covers, clamped to the grid. */
  cellRange(x0: number, y0: number, x1: number, y1: number): [number, number, number, number] {
    const s = this.cellSize;
    const clampC = (v: number) => Math.min(this.cols - 1, Math.max(0, v));
    const clampR = (v: number) => Math.min(this.rows - 1, Math.max(0, v));
    return [clampC(Math.floor(x0 / s)), clampR(Math.floor(y0 / s)), clampC(Math.floor(x1 / s)), clampR(Math.floor(y1 / s))];
  }

  /**
   * Items with a box intersecting the rectangle, appended to `out` (cleared first).
   * Returns the number of cells visited (0 when it fell back to a linear scan).
   */
  query(x0: number, y0: number, x1: number, y1: number, out: number[]): number {
    out.length = 0;
    if (x1 < 0 || y1 < 0 || x0 > this.cols * this.cellSize || y0 > this.rows * this.cellSize) return 0;
    // Wrap the stamp before it overflows (after ~4 billion queries)
    if (++this.queryId === 0xffffffff) {
      this.stamp.fill(0);
      this.queryId = 1;
    }
    const id = this.queryId;
    const { boxes, entries, cellStart, stamp, owner } = this;
    const [c0, r0, c1, r1] = this.cellRange(x0, y0, x1, y1);
    const cellsToVisit = (c1 - c0 + 1) * (r1 - r0 + 1);

    // Zoomed far out the rectangle covers most of the world: walking every cell
    // (mostly empty) costs more than checking every box once. Scan instead.
    if (cellsToVisit > boxes.length / 4) {
      for (let e = 0, count = boxes.length / 4; e < count; e++) {
        const b = e * 4;
        if (!(boxes[b] <= x1 && boxes[b + 2] >= x0 && boxes[b + 1] <= y1 && boxes[b + 3] >= y0)) continue; // NaN fails too
        const item = owner ? owner[e] : e;
        if (stamp[item] === id) continue;
        stamp[item] = id;
        out.push(item);
      }
      return 0;
    }

    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        const cell = r * this.cols + c;
        for (let k = cellStart[cell], end = cellStart[cell + 1]; k < end; k++) {
          const e = entries[k];
          const item = owner ? owner[e] : e;
          if (stamp[item] === id) continue;
          // The cell is coarse: confirm the box itself overlaps
          const b = e * 4;
          if (boxes[b] <= x1 && boxes[b + 2] >= x0 && boxes[b + 1] <= y1 && boxes[b + 3] >= y0) {
            stamp[item] = id;
            out.push(item);
          }
        }
      }
    }
    return cellsToVisit;
  }

  /** Number of entries in a cell (for the debug overlay). */
  cellCount(col: number, row: number): number {
    const cell = row * this.cols + col;
    return this.cellStart[cell + 1] - this.cellStart[cell];
  }
}
