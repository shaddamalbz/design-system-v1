/* ==========================================================================
   Smooth zooming and panning (van Wijk & Nuij, "Smooth and efficient zooming
   and panning", InfoVis 2003).

   Sliding straight from one place to another at a fixed zoom loses you on a
   long jump: the screen fills with motion blur and you never see where you
   went. The optimal path zooms out while it travels and back in as it
   arrives, so the start and the destination share the screen mid-flight.

   A view is (cx, cy, w): the world point at the center and the world width
   that fits on screen. ρ trades zooming for panning; √2 is the value the
   paper's user study found most comfortable. S is the path length in the
   paper's perceptual units, used to scale the duration.
   ========================================================================== */

export type View = [cx: number, cy: number, w: number];

export interface ZoomPath {
  /** Perceived length of the path: longer jumps get more time. */
  S: number;
  /** View at t ∈ [0, 1], moving at constant perceived speed. */
  at(t: number): View;
}

export function zoomPath([x0, y0, w0]: View, [x1, y1, w1]: View, rho = Math.SQRT2): ZoomPath {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const d2 = dx * dx + dy * dy;
  const rho2 = rho * rho;

  // Same center: a pure zoom, exponential in width
  if (d2 < 1e-6) {
    const S = Math.log(w1 / w0) / rho;
    return { S: Math.abs(S), at: (t) => [x0 + t * dx, y0 + t * dy, w0 * Math.exp(rho * t * S)] };
  }

  const d = Math.sqrt(d2);
  const b0 = (w1 * w1 - w0 * w0 + rho2 * rho2 * d2) / (2 * w0 * rho2 * d);
  const b1 = (w1 * w1 - w0 * w0 - rho2 * rho2 * d2) / (2 * w1 * rho2 * d);
  const r0 = Math.log(Math.sqrt(b0 * b0 + 1) - b0);
  const r1 = Math.log(Math.sqrt(b1 * b1 + 1) - b1);
  const S = (r1 - r0) / rho;
  const coshR0 = Math.cosh(r0);
  const sinhR0 = Math.sinh(r0);

  return {
    S,
    at(t) {
      const s = t * S;
      // f: fraction of the distance travelled (the paper's u(s) / d); then the visible width
      const f = (w0 / (rho2 * d)) * (coshR0 * Math.tanh(rho * s + r0) - sinhR0);
      return [x0 + f * dx, y0 + f * dy, (w0 * coshR0) / Math.cosh(rho * s + r0)];
    },
  };
}
