import type { ChartBar, Flub, Hit, Pocket, Room, Voice } from "./types";

const NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] as const;

export function noteName(midi: number): string {
  const name = NAMES[((midi % 12) + 12) % 12];
  const oct = Math.floor(midi / 12) - 1;
  return `${name}${oct}`;
}

export const CHAIR_LABEL: Record<"piano" | "guitar" | "bass" | "trumpet", string> = {
  piano: "Grand piano",
  guitar: "Nylon guitar",
  bass: "Upright bass",
  trumpet: "Trumpet",
};

function hit(voice: Voice, beat: number, midi: number, gain: number, dur: number): Hit {
  return { voice, beat, midi, gain, dur };
}

function kit(pocket: Pocket): Hit[] {
  const hits: Hit[] = [];
  const add = (voice: Voice, beat: number, gain: number) => {
    hits.push(hit(voice, beat, 0, gain, 0.2));
  };
  if (pocket === "light") {
    add("kick", 0, 0.46);
    add("kick", 2.5, 0.26);
    add("snare", 3, 0.2);
  } else if (pocket === "push") {
    add("kick", 0, 0.64);
    add("kick", 2.5, 0.4);
    add("snare", 1, 0.32);
    add("snare", 3, 0.28);
  } else {
    add("kick", 0, 0.6);
    add("kick", 2, 0.38);
    add("snare", 1, 0.34);
    add("snare", 3, 0.3);
  }
  for (let step = 0; step < 8; step++) {
    add("hat", step * 0.5, step % 2 === 0 ? 0.06 : 0.032);
  }
  return hits;
}

function makeBar(
  symbol: string,
  piano: number[],
  guitar: number[],
  bass: [number, number],
  lead: { beat: number; midi: number }[],
  pocket: Pocket,
): ChartBar {
  const hits: Hit[] = [];
  piano.forEach((midi) => hits.push(hit("piano", 0, midi, 0.15, 1.15)));
  const top = piano[piano.length - 1] ?? 60;
  hits.push(hit("piano", 2, top, 0.08, 0.7));
  guitar.forEach((midi, index) => {
    hits.push(hit("guitar", index * 0.5, midi, index % 2 === 0 ? 0.2 : 0.12, 0.38));
  });
  hits.push(hit("bass", 0, bass[0], 0.48, 0.62));
  hits.push(hit("bass", 2, bass[1], 0.32, 0.48));
  lead.forEach((note) => hits.push(hit("trumpet", note.beat, note.midi, 0.22, 0.6)));
  hits.push(...kit(pocket));
  return { symbol, hits };
}

function room(
  id: string,
  name: string,
  bpm: number,
  key: string,
  blurb: string,
  pocket: Pocket,
  specs: Array<[string, number[], number[], [number, number], { beat: number; midi: number }[]]>,
  flubs: Flub[],
): Room {
  return {
    id,
    name,
    bpm,
    key,
    blurb,
    pocket,
    bars: specs.map(([symbol, piano, guitar, bass, lead]) =>
      makeBar(symbol, piano, guitar, bass, lead, pocket),
    ),
    flubs,
  };
}

const amber = room(
  "amber",
  "Amber Room",
  92,
  "A minor",
  "Eight bars in A minor. One pitch sits a half-step off its chord.",
  "straight",
  [
    ["Am", [57, 60, 64], [69, 64, 60, 64, 69, 64, 60, 64], [45, 52], [{ beat: 0, midi: 69 }, { beat: 2, midi: 72 }]],
    ["F", [53, 57, 60], [65, 60, 57, 60, 65, 60, 57, 60], [41, 48], [{ beat: 0, midi: 65 }, { beat: 2, midi: 69 }]],
    ["C", [48, 52, 55], [67, 64, 60, 64, 67, 64, 60, 64], [36, 43], [{ beat: 0, midi: 67 }, { beat: 2, midi: 64 }]],
    ["G", [43, 47, 50, 55], [67, 62, 59, 62, 67, 62, 59, 62], [43, 50], [{ beat: 0, midi: 67 }, { beat: 2, midi: 71 }]],
    ["Am", [57, 60, 64], [69, 64, 60, 64, 69, 64, 60, 64], [45, 52], [{ beat: 0, midi: 76 }, { beat: 2, midi: 72 }]],
    ["F", [53, 57, 60], [65, 60, 57, 60, 65, 60, 57, 60], [41, 48], [{ beat: 0, midi: 65 }, { beat: 2, midi: 69 }]],
    ["E7", [52, 56, 59, 62], [64, 59, 56, 62, 64, 59, 56, 62], [40, 47], [{ beat: 0, midi: 68 }, { beat: 2, midi: 71 }]],
    ["Am", [57, 60, 64], [69, 64, 60, 64, 69, 64, 60, 64], [45, 52], [{ beat: 0, midi: 69 }, { beat: 2, midi: 64 }]],
  ],
  [
    {
      bar: 5,
      voice: "guitar",
      beat: 2,
      clean: 65,
      sour: 66,
      slip: "Bar 6 · nylon guitar · F#4 should be F4",
      detail: "The nylon’s second F in the bar is a half-step sharp. The downbeat F is clean.",
    },
    {
      bar: 6,
      voice: "trumpet",
      beat: 0,
      clean: 68,
      sour: 67,
      slip: "Bar 7 · trumpet · G4 should be G#4",
      detail: "The trumpet forgot the major third of E7 and sat on G natural.",
    },
  ],
);

const porch = room(
  "porch",
  "Porch Light",
  86,
  "E major",
  "Brighter changes in E. One chair is leaning, and the others are telling the truth.",
  "light",
  [
    ["E", [52, 56, 59], [64, 59, 56, 59, 64, 59, 56, 59], [40, 47], [{ beat: 0, midi: 71 }, { beat: 2, midi: 76 }]],
    ["B", [47, 51, 54], [59, 54, 51, 54, 59, 54, 51, 54], [35, 42], [{ beat: 0, midi: 66 }, { beat: 2, midi: 71 }]],
    ["C#m", [49, 52, 56], [61, 56, 52, 56, 61, 56, 52, 56], [37, 44], [{ beat: 0, midi: 68 }, { beat: 2, midi: 73 }]],
    ["A", [57, 61, 64], [69, 64, 61, 64, 69, 64, 61, 64], [45, 52], [{ beat: 0, midi: 69 }, { beat: 2, midi: 73 }]],
    ["E", [52, 56, 59], [64, 59, 56, 59, 64, 59, 56, 59], [40, 47], [{ beat: 0, midi: 76 }, { beat: 2, midi: 71 }]],
    ["B", [47, 51, 54], [59, 54, 51, 54, 59, 54, 51, 54], [35, 42], [{ beat: 0, midi: 66 }, { beat: 2, midi: 71 }]],
    ["C#m", [49, 52, 56], [61, 56, 52, 56, 61, 56, 52, 56], [37, 44], [{ beat: 0, midi: 68 }, { beat: 2, midi: 73 }]],
    ["E", [52, 56, 59], [64, 59, 56, 59, 64, 59, 56, 59], [40, 52], [{ beat: 0, midi: 76 }, { beat: 2, midi: 71 }]],
  ],
  [
    {
      bar: 3,
      voice: "trumpet",
      beat: 0,
      clean: 69,
      sour: 70,
      slip: "Bar 4 · trumpet · A#4 should be A4",
      detail: "Trumpet attacks a half-step sharp. The nylon root on the same beat is the real A.",
    },
    {
      bar: 2,
      voice: "bass",
      beat: 0,
      clean: 37,
      sour: 36,
      slip: "Bar 3 · upright bass · C2 should be C#2",
      detail: "The upright dropped the sharp and parked a C natural under C# minor.",
    },
  ],
);

const fold = room(
  "fold",
  "Fold Night",
  100,
  "D minor",
  "A darker pocket in D minor. Someone remembered the wrong third.",
  "push",
  [
    ["Dm", [50, 53, 57], [62, 57, 53, 57, 62, 57, 53, 57], [38, 45], [{ beat: 0, midi: 69 }, { beat: 2, midi: 65 }]],
    ["Bb", [46, 50, 53], [58, 53, 50, 53, 58, 53, 50, 53], [34, 41], [{ beat: 0, midi: 70 }, { beat: 2, midi: 65 }]],
    ["F", [53, 57, 60], [65, 60, 57, 60, 65, 60, 57, 60], [41, 48], [{ beat: 0, midi: 69 }, { beat: 2, midi: 72 }]],
    ["C", [48, 52, 55], [60, 55, 52, 55, 60, 55, 52, 55], [36, 43], [{ beat: 0, midi: 67 }, { beat: 2, midi: 64 }]],
    ["Gm", [43, 46, 50], [55, 50, 46, 50, 55, 50, 46, 50], [43, 50], [{ beat: 0, midi: 70 }, { beat: 2, midi: 67 }]],
    ["Bb", [46, 50, 53], [58, 53, 50, 53, 58, 53, 50, 53], [34, 41], [{ beat: 0, midi: 70 }, { beat: 2, midi: 65 }]],
    ["A7", [57, 61, 64, 67], [69, 64, 61, 64, 69, 64, 61, 67], [45, 52], [{ beat: 2, midi: 73 }]],
    ["Dm", [50, 53, 57], [62, 57, 53, 57, 62, 57, 53, 57], [38, 45], [{ beat: 0, midi: 69 }, { beat: 2, midi: 62 }]],
  ],
  [
    {
      bar: 6,
      voice: "piano",
      beat: 0,
      clean: 61,
      sour: 60,
      slip: "Bar 7 · grand piano · C4 should be C#4",
      detail: "The piano voiced A7 with a minor third. The trumpet’s C# on beat 3 is the correction.",
    },
    {
      bar: 1,
      voice: "guitar",
      beat: 0,
      clean: 58,
      sour: 59,
      slip: "Bar 2 · nylon guitar · B3 should be Bb3",
      detail: "Nylon went a half-step sharp on the Bb downbeat. Piano still has the flat.",
    },
  ],
);

export const ROOMS: Room[] = [amber, porch, fold];

export function barSeconds(bpm: number): number {
  return (4 * 60) / bpm;
}
