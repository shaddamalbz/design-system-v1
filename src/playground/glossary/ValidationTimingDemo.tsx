import { useEffect, useReducer, useRef, useState } from "react";
import { Button, Field, Input, PlayIcon } from "../../ds";

type Strategy = "keystroke" | "blur" | "reward";

const STRATEGIES: { id: Strategy; title: string; note: string; mark?: "good" | "bad" }[] = [
  { id: "keystroke", title: "On every keystroke", note: "Errors while you're still typing", mark: "bad" },
  { id: "blur", title: "On blur only", note: "Stays red after you fix it", mark: "bad" },
  { id: "reward", title: "Reward early, punish late", note: "Error on blur, cleared as you type", mark: "good" },
];

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

interface S {
  value: string;
  error: boolean;
  /** One entry per keystroke: was an error visible after it? */
  history: boolean[];
}
type A = { type: "input"; value: string } | { type: "blur" } | { type: "reset" };

function reducer(strategy: Strategy) {
  return (s: S, a: A): S => {
    if (a.type === "reset") return { value: "", error: false, history: [] };
    if (a.type === "blur") return { ...s, error: s.value !== "" && !isEmail(s.value) };
    const bad = a.value !== "" && !isEmail(a.value);
    const error =
      strategy === "keystroke"
        ? bad // judge every character
        : strategy === "blur"
          ? s.error // wait for blur, both to show and to clear
          : s.error && bad; // only an existing error is updated
    return { value: a.value, error, history: [...s.history, error].slice(-28) };
  };
}

// The same story for all three: type, leave, come back, finish
const SCRIPT: A[] = [
  ..."ada@acme".split("").map((_, i, arr): A => ({ type: "input", value: arr.slice(0, i + 1).join("") })),
  { type: "blur" },
  ...".com".split("").map((_, i, arr): A => ({ type: "input", value: "ada@acme" + arr.slice(0, i + 1).join("") })),
  { type: "blur" },
];

function Cell({
  strategy,
  title,
  note,
  mark,
  step,
}: {
  strategy: Strategy;
  title: string;
  note: string;
  mark?: "good" | "bad";
  step: A | null;
}) {
  const [s, dispatch] = useReducer(reducer(strategy), { value: "", error: false, history: [] });
  useEffect(() => {
    if (step) dispatch(step);
  }, [step]);

  return (
    <figure className="pg-compare-cell" data-mark={mark}>
      <figcaption>
        <span className="pg-compare-title">{title}</span>
        <span className="pg-muted">{note}</span>
      </figcaption>
      <div className="gd-vt-body">
        <Field label="Email" error={s.error ? "Enter an email like name@example.com" : undefined}>
          <Input
            value={s.value}
            placeholder="you@example.com"
            onChange={(e) => dispatch({ type: "input", value: e.target.value })}
            onBlur={() => dispatch({ type: "blur" })}
          />
        </Field>
        <div className="gd-vt-timeline" aria-label={`${s.history.filter(Boolean).length} of ${s.history.length} keystrokes showed an error`} role="img">
          {s.history.map((e, i) => (
            <span key={i} data-error={e ? "" : undefined} />
          ))}
          {s.history.length === 0 && <span className="pg-muted gd-vt-empty">Keystrokes appear here</span>}
        </div>
      </div>
    </figure>
  );
}

export function ValidationTimingDemo() {
  const [step, setStep] = useState<A | null>(null);
  const [playing, setPlaying] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  const play = () => {
    window.clearInterval(timer.current);
    setStep({ type: "reset" });
    setPlaying(true);
    let i = 0;
    timer.current = window.setInterval(() => {
      if (i >= SCRIPT.length) {
        window.clearInterval(timer.current);
        setPlaying(false);
        return;
      }
      setStep({ ...SCRIPT[i++] }); // new object so the effect runs even for repeated steps
    }, 260);
  };
  useEffect(() => () => window.clearInterval(timer.current), []);

  return (
    <div className="pg-demo">
      <div className="gd-row gd-vt-actions">
        <Button variant="solid" size="sm" startIcon={<PlayIcon />} onClick={play} disabled={playing}>
          {playing ? "Typing…" : "Play the same typing in all three"}
        </Button>
        <span className="pg-muted gd-vt-legend">
          <span className="gd-vt-key" /> fine <span className="gd-vt-key" data-error="" /> error visible
        </span>
      </div>
      <div className="pg-compare gd-vt-grid">
        {STRATEGIES.map((st) => (
          <Cell key={st.id} strategy={st.id} title={st.title} note={st.note} mark={st.mark} step={step} />
        ))}
      </div>
      <p className="gd-stage-note">
        The script types “ada@acme”, leaves the field, comes back and adds “.com”. Each square is one keystroke; red
        means an error was on screen after it. You can also type in each field yourself.
      </p>
    </div>
  );
}
