import { useRef, useState } from "react";
import { Button, HeartIcon } from "../../ds";
import { Range, Switch } from "../ui";

/* Same like button twice: one waits for the "server", one doesn't. */

type Request = () => Promise<void>;
interface LikeState {
  liked: boolean;
  count: number;
}

const INITIAL: LikeState = { liked: false, count: 41 };
const toggle = (s: LikeState): LikeState => ({ liked: !s.liked, count: s.count + (s.liked ? -1 : 1) });

export function OptimisticDemo() {
  const [latency, setLatency] = useState(1500);
  const [failNext, setFailNext] = useState(false);
  const failRef = useRef(failNext);
  failRef.current = failNext;
  const latencyRef = useRef(latency);
  latencyRef.current = latency;

  // Fake server: resolves after `latency`, or rejects once if "fail next" is on.
  const request: Request = () =>
    new Promise((resolve, reject) => {
      setTimeout(() => {
        if (failRef.current) {
          failRef.current = false;
          setFailNext(false);
          reject(new Error("Network error"));
        } else resolve();
      }, latencyRef.current);
    });

  return (
    <div className="pg-demo">
      <div className="pg-compare">
        <LikeCard mode="pessimistic" request={request} />
        <LikeCard mode="optimistic" request={request} />
      </div>
      <div className="pg-controls pg-demo-controls" role="group" aria-label="Demo controls">
        <Range label="Server delay" value={latency} min={200} max={4000} step={100} unit="ms" onChange={setLatency} />
        <Switch
          label="Make the next request fail"
          description="Turns itself off after one failure"
          checked={failNext}
          onChange={setFailNext}
        />
      </div>
    </div>
  );
}

function LikeCard({ mode, request }: { mode: "pessimistic" | "optimistic"; request: Request }) {
  const [confirmed, setConfirmed] = useState(INITIAL); // what the server has
  const [shown, setShown] = useState(INITIAL); // what the UI shows
  const [inFlight, setInFlight] = useState(0);
  const [status, setStatus] = useState("");
  const confirmedRef = useRef(confirmed);
  confirmedRef.current = confirmed;
  const latestId = useRef(0);

  const pessimistic = mode === "pessimistic";

  const onClick = async () => {
    if (pessimistic) {
      if (inFlight) return; // one at a time, UI waits
      setInFlight(1);
      setStatus("Saving…");
      try {
        await request();
        const next = toggle(confirmedRef.current);
        setConfirmed(next);
        setShown(next);
        setStatus("Saved");
      } catch {
        setStatus("Couldn't save. Try again.");
      } finally {
        setInFlight(0);
      }
      return;
    }

    // Optimistic: update now, confirm or roll back later.
    const next = toggle(shown);
    setShown(next);
    setStatus("");
    const id = ++latestId.current;
    setInFlight((n) => n + 1);
    try {
      await request();
      if (id === latestId.current) {
        setConfirmed(next);
        setStatus("Saved");
      }
    } catch {
      // Only the latest request decides; stale failures are ignored.
      if (id === latestId.current) {
        setShown(confirmedRef.current);
        setStatus("Couldn't save, so it was undone.");
      }
    } finally {
      setInFlight((n) => n - 1);
    }
  };

  const failed = status.startsWith("Couldn't");

  return (
    <figure className="pg-compare-cell pg-like-cell">
      <figcaption>
        <span className="pg-compare-title">{pessimistic ? "Pessimistic" : "Optimistic"}</span>
        <span className="pg-muted">{pessimistic ? "Waits for the server, then updates" : "Updates now, confirms later"}</span>
      </figcaption>
      <div className="pg-compare-stage pg-like-stage">
        <Button
          variant={shown.liked ? "solid" : "outline"}
          size="lg"
          aria-pressed={shown.liked}
          aria-busy={pessimistic && inFlight > 0}
          startIcon={<HeartIcon fill={shown.liked ? "currentColor" : "none"} />}
          onClick={onClick}
        >
          {pessimistic && inFlight ? "Saving…" : shown.liked ? "Liked" : "Like"} · {shown.count}
        </Button>
        <div className="pg-like-meta">
          <span className="pg-like-inflight" data-active={inFlight > 0 ? "" : undefined}>
            {inFlight > 0 ? `${inFlight} request${inFlight > 1 ? "s" : ""} in flight` : "Idle"}
          </span>
          <span role="status" className="pg-like-status" data-failed={failed ? "" : undefined}>
            {status}
          </span>
        </div>
      </div>
    </figure>
  );
}
