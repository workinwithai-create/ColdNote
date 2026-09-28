import { useMemo, useState } from "react";
import { Copy, Download, Ear, Play, Square } from "lucide-react";
import { bounceClean, isReady, playCompare, playTake, prepare, sampleCount, stop } from "@/lib/cold/engine";
import { CHAIR_LABEL, ROOMS } from "@/lib/cold/rooms";
import type { Melodic, Solo } from "@/lib/cold/types";

type Caught = {
  roomId: string;
  roomName: string;
  keyName: string;
  bpm: number;
  line: string;
  detail: string;
  tries: number;
  revealed: boolean;
};

const CHAIRS: Melodic[] = ["piano", "guitar", "bass", "trumpet"];
const SOLOS: { id: Solo; label: string }[] = [
  { id: "all", label: "Full band" },
  { id: "piano", label: "Piano" },
  { id: "guitar", label: "Nylon" },
  { id: "bass", label: "Upright" },
  { id: "trumpet", label: "Trumpet" },
  { id: "kit", label: "Kit" },
];

function slipText(items: Caught[]): string {
  const body = items
    .map((item) => {
      const how = item.revealed
        ? "shown after four misses"
        : `caught in ${item.tries} ${item.tries === 1 ? "try" : "tries"}`;
      return `${item.roomName} · ${item.bpm} BPM · ${item.keyName}\n${item.line} · ${how}\n${item.detail}`;
    })
    .join("\n\n");
  return [
    "ColdNote slip",
    "The sour notes, named, so version one can leave.",
    "",
    body,
    "",
    "Live chairs: FluidR3 grand piano, nylon guitar, upright bass, trumpet, and kit.",
    "The WAV is already named. Put this version out.",
  ].join("\n");
}

export function ColdNoteApp() {
  const [round, setRound] = useState(0);
  const [slot, setSlot] = useState(0);
  const [found, setFound] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [tries, setTries] = useState(0);
  const [selectedBar, setSelectedBar] = useState<number | null>(null);
  const [selectedChair, setSelectedChair] = useState<Melodic | null>(null);
  const [solo, setSolo] = useState<Solo>("all");
  const [playhead, setPlayhead] = useState<number | null>(null);
  const [feedback, setFeedback] = useState("Play the take. Solo a chair if the band numbs the pitch.");
  const [status, setStatus] = useState("Live FluidR3 chairs wait until you press play.");
  const [caught, setCaught] = useState<Caught[]>([]);
  const [busy, setBusy] = useState(false);

  const room = ROOMS[round] ?? ROOMS[0];
  const flub = room.flubs[slot] ?? room.flubs[0];
  const done = caught.length >= ROOMS.length;
  const caughtRooms = useMemo(
    () => ROOMS.filter((chart) => caught.some((item) => item.roomId === chart.id)),
    [caught],
  );

  function resetGuess() {
    setFound(false);
    setRevealed(false);
    setTries(0);
    setSelectedBar(null);
    setSelectedChair(null);
    setPlayhead(null);
  }

  async function ensure() {
    setBusy(true);
    try {
      await prepare((loaded, total) => {
        setStatus(`Seating live chairs… ${loaded}/${total}`);
      });
      if (isReady()) setStatus("Chairs seated · live FluidR3 piano, nylon, upright, trumpet, kit");
    } catch {
      setStatus("A chair didn’t load. Press play to seat them again.");
      throw new Error("samples");
    } finally {
      setBusy(false);
    }
  }

  async function onPlay(loop: boolean) {
    try {
      await ensure();
    } catch {
      return;
    }
    const start = loop ? (selectedBar ?? 0) : 0;
    const end = loop ? start + 1 : room.bars.length;
    setFeedback(loop ? `Looping bar ${start + 1}. The score stays hidden.` : "Listening for one sour pitch.");
    await playTake({
      bars: room.bars,
      bpm: room.bpm,
      flub: found ? null : flub,
      solo,
      start,
      end,
      loop,
      onBar: setPlayhead,
    });
  }

  function onStop() {
    stop();
    setPlayhead(null);
  }

  function recordCatch(wasReveal: boolean, attempt: number) {
    const entry: Caught = {
      roomId: room.id,
      roomName: room.name,
      keyName: room.key,
      bpm: room.bpm,
      line: flub.slip,
      detail: flub.detail,
      tries: attempt,
      revealed: wasReveal,
    };
    setCaught((current) => {
      const rest = current.filter((item) => item.roomId !== room.id);
      return [...rest, entry];
    });
    try {
      const next = [...caught.filter((item) => item.roomId !== room.id), entry];
      localStorage.setItem("coldnote-slip", slipText(next));
    } catch {
      /* private mode */
    }
  }

  async function onMark() {
    if (found) return;
    if (selectedBar === null || !selectedChair) {
      setFeedback("Pick the bar, then the chair that played the sour note.");
      return;
    }
    const barOk = selectedBar === flub.bar;
    const chairOk = selectedChair === flub.voice;
    if (barOk && chairOk) {
      const attempt = tries + 1;
      setFound(true);
      setTries(attempt);
      setFeedback(flub.detail);
      recordCatch(false, attempt);
      onStop();
      await playCompare(room.bars[flub.bar], room.bpm, flub, solo);
      return;
    }
    const attempt = tries + 1;
    setTries(attempt);
    if (attempt >= 4) {
      setFound(true);
      setRevealed(true);
      setSelectedBar(flub.bar);
      setSelectedChair(flub.voice);
      setFeedback(`Pencil mark: bar ${flub.bar + 1}, ${CHAIR_LABEL[flub.voice]}. ${flub.detail}`);
      recordCatch(true, attempt);
      onStop();
      await playCompare(room.bars[flub.bar], room.bpm, flub, "all");
      return;
    }
    if (barOk) setFeedback("That bar is uneasy. A different chair.");
    else if (chairOk) setFeedback("Right chair. Wrong bar. Walk the phrase again.");
    else setFeedback("Not yet. Solo one chair and listen for the half-step.");
  }

  function onNext() {
    onStop();
    if (round >= ROOMS.length - 1) return;
    setRound(round + 1);
    setSlot(0);
    setSolo("all");
    resetGuess();
    setFeedback("New chart. Same job: one sour pitch, then it can leave.");
  }

  function onOtherFlub() {
    if (found) return;
    onStop();
    setSlot(slot === 0 ? 1 : 0);
    resetGuess();
    setFeedback("Different sour note. The chart is the same. Your ears start cold again.");
  }

  async function onDownload() {
    const charts = caughtRooms.length > 0 ? caughtRooms : [room];
    try {
      await ensure();
    } catch {
      return;
    }
    setBusy(true);
    setStatus("Bouncing the clean take…");
    try {
      const blob = await bounceClean(charts);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = done ? "ColdNote-version-one.wav" : `ColdNote-${room.id}-clean.wav`;
      link.click();
      URL.revokeObjectURL(url);
      setStatus("Clean WAV is named and downloaded. Version one can leave.");
    } catch {
      setStatus("The bounce didn’t finish. Try once more.");
    } finally {
      setBusy(false);
    }
  }

  async function onCopy() {
    const text = slipText(caught);
    try {
      await navigator.clipboard.writeText(text);
      setFeedback("Slip copied. The file name is already decided.");
    } catch {
      setFeedback(text);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-4 py-8 md:py-12">
      <header className="flex flex-col gap-3">
        <p className="flex items-center gap-2 text-sm font-medium tracking-wide text-muted uppercase">
          <Ear className="size-4 text-pencil" aria-hidden="true" />
          Cold-ear pass
        </p>
        <h1 className="font-display text-4xl leading-none font-semibold text-ink md:text-6xl">
          The note you stopped hearing.
        </h1>
        <p className="max-w-xl text-base text-muted">
          One sour pitch is hiding in a live take. Solo a chair, mark the bar, name the instrument.
          Then the band plays it clean and version one can leave.
        </p>
      </header>

      <section className="rounded-card border border-line bg-surface p-4 md:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm text-muted">
              Chart {round + 1} of {ROOMS.length}
              {found ? " · marked" : ""}
            </p>
            <h2 className="font-display text-2xl text-ink">{room.name}</h2>
            <p className="text-sm text-muted">
              {room.bpm} BPM · {room.key}
            </p>
          </div>
          <p className="max-w-xs text-sm text-ink">{room.blurb}</p>
        </div>

        <div className="mt-5 grid grid-cols-4 gap-2 md:grid-cols-8" role="listbox" aria-label="Bars">
          {room.bars.map((bar, index) => {
            const active = playhead === index;
            const picked = selectedBar === index;
            const marked = found && flub.bar === index;
            return (
              <button
                key={`${room.id}-${bar.symbol}-${index}`}
                type="button"
                role="option"
                aria-selected={picked}
                data-bar={index}
                onClick={() => setSelectedBar(index)}
                className={
                  "relative flex min-h-16 flex-col items-start justify-between rounded-card border px-2 py-2 text-left transition-colors " +
                  (active
                    ? "border-ink bg-ink text-bg"
                    : picked
                      ? "border-pencil bg-bg text-ink"
                      : "border-line bg-bg text-ink")
                }
              >
                <span className={"text-xs " + (active ? "text-bg" : "text-muted")}>{index + 1}</span>
                <span className="font-display text-lg leading-none">{bar.symbol}</span>
                {marked ? (
                  <span className="absolute top-2 right-2 size-3 rounded-full border-2 border-pencil" aria-hidden="true" />
                ) : null}
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            data-action="play"
            disabled={busy}
            onClick={() => void onPlay(false)}
            className="inline-flex min-h-11 items-center gap-2 rounded-card bg-ink px-4 text-sm font-medium text-bg disabled:opacity-50"
          >
            <Play className="size-4" aria-hidden="true" />
            Play the take
          </button>
          <button
            type="button"
            data-action="loop"
            disabled={busy}
            onClick={() => void onPlay(true)}
            className="inline-flex min-h-11 items-center gap-2 rounded-card border border-line bg-bg px-4 text-sm font-medium text-ink"
          >
            Loop this bar
          </button>
          <button
            type="button"
            data-action="stop"
            onClick={onStop}
            className="inline-flex min-h-11 items-center gap-2 rounded-card border border-line bg-bg px-4 text-sm font-medium text-ink"
          >
            <Square className="size-4" aria-hidden="true" />
            Stop
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Solo a chair">
          {SOLOS.map((item) => (
            <button
              key={item.id}
              type="button"
              data-solo={item.id}
              aria-pressed={solo === item.id}
              onClick={() => setSolo(item.id)}
              className={
                "min-h-11 rounded-card border px-3 text-sm font-medium " +
                (solo === item.id
                  ? "border-ink bg-ink text-bg"
                  : "border-line bg-bg text-ink")
              }
            >
              {item.label}
            </button>
          ))}
        </div>
        <p className="mt-3 text-sm text-muted" role="status">
          {status}
        </p>
      </section>

      <section className="rounded-card border border-line bg-surface p-4 md:p-6">
        <h2 className="font-display text-xl text-ink">Mark the sour note</h2>
        <p className="mt-1 text-sm text-muted">
          Bar {selectedBar === null ? "—" : selectedBar + 1}
          {" · "}
          {selectedChair ? CHAIR_LABEL[selectedChair] : "no chair yet"}
          {found
            ? revealed
              ? " · shown"
              : " · caught"
            : tries > 0
              ? ` · ${tries} ${tries === 1 ? "miss" : "misses"}`
              : ""}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {CHAIRS.map((chair) => (
            <button
              key={chair}
              type="button"
              data-chair={chair}
              aria-pressed={selectedChair === chair}
              onClick={() => setSelectedChair(chair)}
              className={
                "min-h-11 rounded-card border px-3 text-sm font-medium " +
                (selectedChair === chair
                  ? "border-pencil bg-bg text-pencil"
                  : "border-line bg-bg text-ink")
              }
            >
              {CHAIR_LABEL[chair]}
            </button>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            data-action="mark"
            disabled={found}
            onClick={() => void onMark()}
            className="inline-flex min-h-11 items-center rounded-card border border-pencil bg-bg px-4 text-sm font-medium text-pencil disabled:opacity-50"
          >
            That’s the sour one
          </button>
          <button
            type="button"
            data-action="other"
            disabled={found}
            onClick={onOtherFlub}
            className="inline-flex min-h-11 items-center rounded-card border border-line bg-bg px-4 text-sm font-medium text-ink disabled:opacity-50"
          >
            Different sour note
          </button>
          {found && round < ROOMS.length - 1 ? (
            <button
              type="button"
              data-action="next"
              onClick={onNext}
              className="inline-flex min-h-11 items-center rounded-card bg-ink px-4 text-sm font-medium text-bg"
            >
              Next chart
            </button>
          ) : null}
        </div>
        <p className="mt-4 text-sm text-ink" role="status">
          {feedback}
        </p>
      </section>

      <section className="rounded-card border border-line bg-surface p-4 md:p-6">
        <h2 className="font-display text-xl text-ink">
          {done ? "Version one can leave." : "Slip"}
        </h2>
        {caught.length === 0 ? (
          <p className="mt-2 text-sm text-muted">Nothing named yet. The first catch writes the slip.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-3">
            {caught.map((item) => (
              <li key={item.roomId} className="border-l-2 border-pencil pl-3">
                <p className="text-sm font-medium text-ink">{item.line}</p>
                <p className="text-sm text-muted">
                  {item.roomName} · {item.revealed ? "shown" : "caught"} 
                </p>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            data-action="download"
            disabled={caught.length === 0 || busy}
            onClick={() => void onDownload()}
            className="inline-flex min-h-11 items-center gap-2 rounded-card bg-ink px-4 text-sm font-medium text-bg disabled:opacity-50"
          >
            <Download className="size-4" aria-hidden="true" />
            {done ? "Download version one" : "Download the clean take"}
          </button>
          <button
            type="button"
            data-action="copy"
            disabled={caught.length === 0}
            onClick={() => void onCopy()}
            className="inline-flex min-h-11 items-center gap-2 rounded-card border border-line bg-bg px-4 text-sm font-medium text-ink disabled:opacity-50"
          >
            <Copy className="size-4" aria-hidden="true" />
            Copy the slip
          </button>
        </div>
        <p className="mt-4 text-xs text-muted">
          {sampleCount()} live notes from the FluidR3 set, pitched from the nearest real sample, not a synth.
        </p>
      </section>
    </main>
  );
}
