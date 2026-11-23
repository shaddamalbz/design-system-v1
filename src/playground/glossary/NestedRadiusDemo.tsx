import { useState } from "react";
import { Range, Segmented } from "../ui";

/* --------------------------------------------------------------------------
   Interactive: outer + inner box with their corner circles drawn.
   -------------------------------------------------------------------------- */

type Mode = "concentric" | "same";

export function NestedRadiusDemo() {
  const [outer, setOuter] = useState(32);
  const [pad, setPad] = useState(12);
  const [mode, setMode] = useState<Mode>("same");

  const inner = mode === "same" ? outer : Math.max(0, outer - pad);
  // Gap measured along the corner diagonal, between the two arcs.
  const cornerGap = pad * Math.SQRT2 + (inner - outer) * (Math.SQRT2 - 1);
  const even = Math.abs(cornerGap - pad) < 0.5;

  // Drawing (SVG units = px)
  const W = 480;
  const H = 260;
  const x0 = 40;
  const y0 = 20;
  const w = W - 2 * x0;
  const h = H - 2 * y0;
  const k = Math.SQRT1_2;
  const outerArc = outer * (Math.SQRT2 - 1) * k; // offset of the arc point along each axis
  const innerArc = pad + inner * (Math.SQRT2 - 1) * k;
  const innerCx = x0 + pad + inner;
  const innerCy = y0 + pad + inner;

  return (
    <div className="pg-nest">
      <div className="pg-nest-stage">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="pg-nest-svg"
          role="img"
          aria-label={`Outer radius ${outer}px, padding ${pad}px, inner radius ${inner}px. Corner gap ${cornerGap.toFixed(1)}px versus side gap ${pad}px.`}
        >
          <rect className="pg-nest-outer" x={x0} y={y0} width={w} height={h} rx={outer} />
          <rect className="pg-nest-inner" x={x0 + pad} y={y0 + pad} width={w - 2 * pad} height={h - 2 * pad} rx={inner} />
          <circle className="pg-nest-circle is-outer" cx={x0 + outer} cy={y0 + outer} r={outer} />
          {inner > 0 && <circle className="pg-nest-circle is-inner" cx={innerCx} cy={innerCy} r={inner} />}
          <circle className="pg-nest-dot is-outer" cx={x0 + outer} cy={y0 + outer} r={4.5} />
          <circle className="pg-nest-dot is-inner" cx={innerCx} cy={innerCy} r={3} />
          <line className="pg-nest-gap" x1={x0 + outerArc} y1={y0 + outerArc} x2={x0 + innerArc} y2={y0 + innerArc} />
        </svg>
        <ul className="pg-nest-legend" aria-hidden="true">
          <li>
            <span className="pg-nest-swatch is-outer" /> Outer circle + center
          </li>
          <li>
            <span className="pg-nest-swatch is-inner" /> Inner circle + center
          </li>
          <li>
            <span className="pg-nest-swatch is-gap" /> Corner gap
          </li>
        </ul>
      </div>

      <div className="pg-nest-side">
        <div className="pg-controls pg-nest-controls">
          <Range label="Outer radius" value={outer} min={4} max={64} unit="px" onChange={setOuter} />
          <Range label="Padding" value={pad} min={2} max={40} unit="px" onChange={setPad} />
          <Segmented<Mode>
            label="Inner radius"
            value={mode}
            onChange={setMode}
            options={[
              { value: "same", label: "Same as outer" },
              { value: "concentric", label: "Outer − padding" },
            ]}
          />
        </div>

        <dl className="pg-nest-stats">
          <div>
            <dt>Inner radius</dt>
            <dd>{inner}px</dd>
          </div>
          <div>
            <dt>Gap on the sides</dt>
            <dd>{pad}px</dd>
          </div>
          <div>
            <dt>Gap at the corner</dt>
            <dd>
              {cornerGap.toFixed(1)}px{" "}
              <span className="pg-nest-badge" data-even={even}>
                {even ? "Even" : `${(cornerGap / pad).toFixed(2)}× thicker`}
              </span>
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
