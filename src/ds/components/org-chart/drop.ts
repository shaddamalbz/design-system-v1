import { MODE_STACK, NODE_H, NODE_W, type TreeLayout } from "./layout";
import type { SpatialGrid } from "./spatial-grid";

/* ==========================================================================
   Drop targets for restructuring the org.

   Finding what's under the pointer is a spatial-index point query, the same
   one clicks use. It works for DOM cards, canvas boxes, and cards that
   aren't rendered at all, which elementFromPoint can't do here.

   One card has three zones:
     middle            → become a direct report (appended last)
     leading edge      → become a colleague, just before this person
     trailing edge     → become a colleague, just after
   "Edge" follows how the siblings are laid out: left/right in rows and
   grids, top/bottom in a stacked team.
   ========================================================================== */

export type DropKind = "child" | "before" | "after";

export interface Drop {
  /** Card the pointer aims at. */
  target: number;
  kind: DropKind;
  /** New manager (-1: top level). */
  parent: number;
  /** Position among the new manager's reports, counted without the moved node. */
  index: number;
  /** Dropping here changes nothing. */
  noop: boolean;
}

/** Around a card, how far (world units) still counts as aiming at it: covers the gaps between siblings. */
const REACH = 14;
/** Share of a card's length on each end that means "next to" rather than "under". */
const EDGE_ROW = 0.22;
const EDGE_STACK = 0.3;

/** Is `node` inside the subtree rooted at `root` (itself included)? O(depth). */
export function inSubtree(t: TreeLayout, node: number, root: number) {
  for (let v = node; v !== -1; v = t.parent[v]) if (v === root) return true;
  return false;
}

export function childrenOf(t: TreeLayout, roots: readonly number[], parent: number): ArrayLike<number> {
  return parent === -1 ? roots : t.childList.subarray(t.childStart[parent], t.childStart[parent + 1]);
}

/** Siblings run top to bottom (a stacked team) rather than left to right. */
export function stackedSiblings(t: TreeLayout, node: number) {
  const p = t.parent[node];
  return p !== -1 && t.mode[p] === MODE_STACK;
}

/** Turns "this card, this zone" into a new manager and a position. `dragged` is -1 for something new. */
export function resolveDrop(t: TreeLayout, roots: readonly number[], target: number, kind: DropKind, dragged: number): Drop {
  const parent = kind === "child" ? target : t.parent[target];
  const list = childrenOf(t, roots, parent);
  // Count positions with the dragged node taken out, so the index is what the data will hold after the move
  let count = 0;
  let pos = -1;
  let current = -1;
  for (let n = 0; n < list.length; n++) {
    const c = list[n];
    if (c === dragged) {
      current = count;
      continue;
    }
    if (c === target) pos = count;
    count++;
  }
  const index = kind === "child" ? count : kind === "before" ? pos : pos + 1;
  const noop = dragged >= 0 && (target === dragged || (t.parent[dragged] === parent && current === index));
  return { target, kind, parent, index: Math.max(0, index), noop };
}

/** The drop under world point (wx, wy), or null when the pointer isn't near any card. */
export function findDrop(
  t: TreeLayout,
  grid: SpatialGrid,
  roots: readonly number[],
  wx: number,
  wy: number,
  dragged: number,
  scratch: number[],
): Drop | null {
  grid.query(wx - REACH, wy - REACH, wx + REACH, wy + REACH, scratch);
  if (!scratch.length) return null;
  // Nearest card: distance 0 when the pointer is inside it
  let target = -1;
  let best = Infinity;
  for (const i of scratch) {
    const dx = Math.max(t.x[i] - wx, 0, wx - (t.x[i] + NODE_W));
    const dy = Math.max(t.y[i] - wy, 0, wy - (t.y[i] + NODE_H));
    const d = dx * dx + dy * dy;
    if (d < best) {
      best = d;
      target = i;
    }
  }
  const vertical = stackedSiblings(t, target);
  const f = vertical ? (wy - t.y[target]) / NODE_H : (wx - t.x[target]) / NODE_W;
  const edge = vertical ? EDGE_STACK : EDGE_ROW;
  const kind: DropKind = f < edge ? "before" : f > 1 - edge ? "after" : "child";
  return resolveDrop(t, roots, target, kind, dragged);
}
