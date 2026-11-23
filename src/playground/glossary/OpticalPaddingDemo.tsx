import { useState } from "react";
import { ArrowRightIcon, Button, PlusIcon } from "../../ds";
import { CompareCell, Segmented } from "../ui";

type Size = "sm" | "md" | "lg";
const PADDING = { sm: [10, 8], md: [12, 10], lg: [16, 12] } as const;

/* Same buttons twice: equal padding vs a trimmed icon side. Hatched = padding. */
export function OpticalPaddingDemo() {
  const [size, setSize] = useState<Size>("md");
  const [label, icon] = PADDING[size];
  return (
    <div className="pg-demo">
      <div className="pg-compare">
        <CompareCell title="Same padding" note={`${label} · ${label}`} mark="bad" off>
          <Button size={size} startIcon={<PlusIcon />}>
            New project
          </Button>
          <Button size={size} endIcon={<ArrowRightIcon />}>
            Continue
          </Button>
        </CompareCell>
        <CompareCell title="Optical padding" note={`${icon} · ${label} (icon side −${label - icon}px)`} mark="good">
          <Button size={size} startIcon={<PlusIcon />}>
            New project
          </Button>
          <Button size={size} endIcon={<ArrowRightIcon />}>
            Continue
          </Button>
        </CompareCell>
      </div>
      <div className="pg-controls pg-demo-controls" role="group" aria-label="Demo controls">
        <Segmented<Size>
          label="Button size"
          value={size}
          onChange={setSize}
          options={[
            { value: "sm", label: "sm" },
            { value: "md", label: "md" },
            { value: "lg", label: "lg" },
          ]}
        />
      </div>
    </div>
  );
}
