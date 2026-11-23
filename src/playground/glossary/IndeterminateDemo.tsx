import { useState } from "react";
import { Checkbox } from "../../ds";

const ITEMS = ["Cheese", "Mushrooms", "Olives", "Peppers"];

export function IndeterminateDemo() {
  const [picked, setPicked] = useState<string[]>(["Cheese", "Olives"]);
  const all = picked.length === ITEMS.length;
  const none = picked.length === 0;
  const state = all ? "checked" : none ? "unchecked" : "mixed";

  return (
    <div className="pg-demo">
      <div className="gd-ind">
        <div className="gd-stage gd-ind-stage">
          <div className="gd-ind-list">
            <Checkbox
              label="All toppings"
              checked={all}
              indeterminate={!all && !none}
              // From mixed, a click selects everything (the common convention)
              onCheckedChange={() => setPicked(all ? [] : ITEMS)}
              aria-controls="gd-ind-children"
            />
            <div className="gd-ind-children" id="gd-ind-children" role="group" aria-label="Toppings">
              {ITEMS.map((item) => (
                <Checkbox
                  key={item}
                  label={item}
                  checked={picked.includes(item)}
                  onCheckedChange={(c) => setPicked((p) => (c ? [...p, item] : p.filter((x) => x !== item)))}
                />
              ))}
            </div>
          </div>
        </div>
        <dl className="gd-ind-readout">
          <div>
            <dt>Parent shows</dt>
            <dd>
              <span className="gd-badge" data-tone={state === "mixed" ? "good" : undefined}>
                {state}
              </span>
            </dd>
          </div>
          <div>
            <dt>Screen reader says</dt>
            <dd>
              “All toppings, checkbox, {state === "mixed" ? "half checked" : state === "checked" ? "checked" : "not checked"}”
            </dd>
          </div>
          <div>
            <dt>Clicking the parent</dt>
            <dd>{all ? "clears every topping" : "selects every topping"}</dd>
          </div>
          <div>
            <dt>Selected</dt>
            <dd>
              {picked.length} of {ITEMS.length}
            </dd>
          </div>
        </dl>
      </div>
      <p className="gd-stage-note">
        Toggle the toppings one by one and watch the parent: none → empty, some → dash, all → check.
      </p>
    </div>
  );
}
