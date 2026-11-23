import { useState } from "react";
import { HeartIcon, IconButton, PlayIcon, PlusIcon, SendIcon } from "../../ds";
import { CompareCell, Range } from "../ui";

/* Box-centered vs optically centered, then tune the play icon by hand.
   Crosshair = true center of the button. */

function Icons() {
  return (
    <>
      <IconButton icon={<PlayIcon />} aria-label="Play" variant="outline" size="lg" />
      <IconButton icon={<SendIcon />} aria-label="Send" variant="outline" size="lg" />
      <IconButton icon={<HeartIcon />} aria-label="Like" variant="outline" size="lg" />
      <IconButton icon={<PlusIcon />} aria-label="Add" variant="outline" size="lg" />
    </>
  );
}

export function OpticalCenteringDemo() {
  const [nudge, setNudge] = useState(0);

  return (
    <div className="pg-demo">
      <div className="pg-compare">
        <CompareCell title="Box-centered" note="Play looks left, Send up-right, Heart high" mark="bad" off zoom={2}>
          <Icons />
        </CompareCell>
        <CompareCell title="Optically centered" note="Play +1.5 → · Send −1 ← +1 ↓ · Heart +0.5 ↓ · Plus 0" mark="good" zoom={2}>
          <Icons />
        </CompareCell>
      </div>

      <CompareCell title="Tune it yourself" note="Box center → centroid is 1.8 units; the built-in value is 1.5" zoom={3}>
        <IconButton icon={<PlayIcon nudge={[nudge, 0]} />} aria-label="Play" variant="outline" size="lg" />
      </CompareCell>

      <div className="pg-controls pg-demo-controls" role="group" aria-label="Demo controls">
        <Range label="Play nudge (24-grid units)" value={nudge} min={-2} max={4} step={0.5} onChange={setNudge} />
      </div>
    </div>
  );
}
