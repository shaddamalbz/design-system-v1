import type { OrgChartNode } from "./OrgChart";

/* ==========================================================================
   Pure helpers for applying OrgChart edits to your data.

   The chart never changes `nodes` itself: it reports a move (onMove) or a
   drop from outside (onDropExternal), and the app decides. These helpers
   do the common case, returning a new array (old one untouched, so undo is
   just keeping the previous array).

   Order matters: a manager's reports are laid out in data order. `index`
   is the position among the new manager's reports, not counting the moved
   node; the helpers place the node in the array accordingly. O(n).
   ========================================================================== */

export interface OrgChartMove {
  /** Who moves (their whole team comes along). */
  id: string;
  /** New manager; null for the top level. */
  parentId: string | null;
  /** Position among the new manager's reports, counted without the moved node. */
  index: number;
}

export interface OrgChartExternalDrop {
  /** The dragged data for the chart's `externalType` (dataTransfer.getData). */
  data: string;
  /** Manager it was dropped under; null for the top level. */
  parentId: string | null;
  /** Position among that manager's reports. */
  index: number;
}

const parentOf = (n: OrgChartNode) => n.parentId ?? null;

/** Puts `node` into `rest` so it lands at `index` among the reports of `node.parentId`. */
function placeAmongSiblings<T extends OrgChartNode>(rest: T[], node: T, index: number): T[] {
  const parent = parentOf(node);
  let seen = 0;
  let lastSibling = -1;
  for (let i = 0; i < rest.length; i++) {
    if (parentOf(rest[i]) !== parent) continue;
    if (seen === index) return [...rest.slice(0, i), node, ...rest.slice(i)];
    seen++;
    lastSibling = i;
  }
  // Past the last report (or the first one): right after the last sibling, else at the end
  const at = lastSibling === -1 ? rest.length : lastSibling + 1;
  return [...rest.slice(0, at), node, ...rest.slice(at)];
}

/** Applies a move from `onMove`. Returns `nodes` unchanged if the id isn't found. */
export function moveOrgNode<T extends OrgChartNode>(nodes: readonly T[], move: OrgChartMove): T[] {
  const at = nodes.findIndex((n) => n.id === move.id);
  if (at === -1) return nodes as T[];
  const moved = { ...nodes[at], parentId: move.parentId };
  const rest = [...nodes.slice(0, at), ...nodes.slice(at + 1)];
  return placeAmongSiblings(rest, moved, move.index);
}

/** Adds a new node (e.g. from `onDropExternal`) at `index` among its manager's reports. */
export function insertOrgNode<T extends OrgChartNode>(nodes: readonly T[], node: T, index: number): T[] {
  return placeAmongSiblings([...nodes], node, index);
}
