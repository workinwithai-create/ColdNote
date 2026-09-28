import { barSeconds } from "./rooms";
import type { ChartBar, Flub, Hit, Room, Solo, Voice } from "./types";

const CDN = "https://cdn.jsdelivr.net/gh/workinwithai-create/PreEight@main/public/samples";

type Sample = { midi: number; file: string };

const LIBRARY: Record<"piano" | "guitar" | "bass" | "trumpet" | "kick" | "snare" | "hat", Sample[]> = {
  piano: [
    { midi: 36, file: "piano/C2.mp3" },
    { midi: 48, file: "piano/C3.mp3" },
    { midi: 49, file: "piano/Db3.mp3" },
    { midi: 52, file: "piano/E3.mp3" },
    { midi: 54, file: "piano/Gb3.mp3" },
    { midi: 55, file: "piano/G3.mp3" },
    { midi: 56, file: "piano/Ab3.mp3" },
    { midi: 57, file: "piano/A3.mp3" },
    { midi: 58, file: "piano/Bb3.mp3" },
    { midi: 60, file: "piano/C4.mp3" },
    { midi: 61, file: "piano/Db4.mp3" },
    { midi: 64, file: "piano/E4.mp3" },
    { midi: 66, file: "piano/Gb4.mp3" },
    { midi: 67, file: "piano/G4.mp3" },
    { midi: 69, file: "piano/A4.mp3" },
    { midi: 70, file: "piano/Bb4.mp3" },
    { midi: 72, file: "piano/C5.mp3" },
    { midi: 76, file: "piano/E5.mp3" },
  ],
  guitar: [
    { midi: 40, file: "guitar/E2.mp3" },
    { midi: 45, file: "guitar/A2.mp3" },
    { midi: 47, file: "guitar/B2.mp3" },
    { midi: 50, file: "guitar/D3.mp3" },
    { midi: 52, file: "guitar/E3.mp3" },
    { midi: 55, file: "guitar/G3.mp3" },
    { midi: 57, file: "guitar/A3.mp3" },
    { midi: 59, file: "guitar/B3.mp3" },
    { midi: 62, file: "guitar/D4.mp3" },
    { midi: 64, file: "guitar/E4.mp3" },
    { midi: 67, file: "guitar/G4.mp3" },
    { midi: 69, file: "guitar/A4.mp3" },
    { midi: 71, file: "guitar/B4.mp3" },
    { midi: 76, file: "guitar/E5.mp3" },
  ],
  bass: [
    { midi: 28, file: "bass/E1.mp3" },
    { midi: 31, file: "bass/G1.mp3" },
    { midi: 33, file: "bass/A1.mp3" },
    { midi: 34, file: "bass/Bb1.mp3" },
    { midi: 36, file: "bass/C2.mp3" },
    { midi: 40, file: "bass/E2.mp3" },
    { midi: 43, file: "bass/G2.mp3" },
    { midi: 45, file: "bass/A2.mp3" },
    { midi: 46, file: "bass/Bb2.mp3" },
    { midi: 48, file: "bass/C3.mp3" },
    { midi: 52, file: "bass/E3.mp3" },
  ],
  trumpet: [
    { midi: 55, file: "trumpet/G3.mp3" },
    { midi: 57, file: "trumpet/A3.mp3" },
    { midi: 60, file: "trumpet/C4.mp3" },
    { midi: 64, file: "trumpet/E4.mp3" },
    { midi: 67, file: "trumpet/G4.mp3" },
    { midi: 69, file: "trumpet/A4.mp3" },
    { midi: 72, file: "trumpet/C5.mp3" },
    { midi: 76, file: "trumpet/E5.mp3" },
    { midi: 79, file: "trumpet/G5.mp3" },
  ],
  kick: [{ midi: 0, file: "drums/kick.mp3" }],
  snare: [{ midi: 0, file: "drums/snare.mp3" }],
  hat: [{ midi: 0, file: "drums/hihat.mp3" }],
};

const DRUMS = new Set<Voice>(["kick", "snare", "hat"]);

let ctx: AudioContext | null = null;
let bus: GainNode | null = null;
const buffers = new Map<string, AudioBuffer>();
let ready = false;
let loading: Promise<void> | null = null;
const live: AudioBufferSourceNode[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let playing = false;

function nearest(voice: Voice, midi: number): { key: string; rate: number } {
  const bank = DRUMS.has(voice) ? LIBRARY[voice] : LIBRARY[voice];
  const sample = bank.reduce((best, item) =>
    Math.abs(item.midi - midi) < Math.abs(best.midi - midi) ? item : best,
  );
  const key = `${voice}:${sample.file}`;
  const rate = DRUMS.has(voice) ? 1 : 2 ** ((midi - sample.midi) / 12);
  return { key, rate };
}

export function sampleCount(): number {
  return Object.values(LIBRARY).reduce((sum, bank) => sum + bank.length, 0);
}

export function isReady(): boolean {
  return ready;
}

export async function prepare(onProgress?: (loaded: number, total: number) => void): Promise<void> {
  if (!ctx) {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new Ctx();
    bus = ctx.createGain();
    bus.gain.value = 0.9;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.knee.value = 8;
    comp.ratio.value = 2.2;
    comp.attack.value = 0.008;
    comp.release.value = 0.18;
    bus.connect(comp);
    comp.connect(ctx.destination);
  }
  if (ctx.state === "suspended") await ctx.resume();
  if (ready) return;
  if (loading) return loading;

  const jobs: { key: string; file: string }[] = [];
  (Object.keys(LIBRARY) as Voice[]).forEach((voice) => {
    LIBRARY[voice].forEach((sample) => {
      jobs.push({ key: `${voice}:${sample.file}`, file: sample.file });
    });
  });

  let loaded = 0;
  loading = Promise.all(
    jobs.map(async (job) => {
      const response = await fetch(`${CDN}/${job.file}`);
      if (!response.ok) throw new Error(`Missing live sample ${job.file}`);
      const data = await response.arrayBuffer();
      const audio = await ctx!.decodeAudioData(data.slice(0));
      buffers.set(job.key, audio);
      loaded += 1;
      onProgress?.(loaded, jobs.length);
    }),
  ).then(() => {
    ready = true;
  });
  try {
    await loading;
  } finally {
    loading = null;
  }
}

function audible(voice: Voice, solo: Solo): boolean {
  if (solo === "all") return true;
  if (solo === "kit") return DRUMS.has(voice);
  return voice === solo;
}

function sounded(hit: Hit, flub: Flub | null): Hit {
  if (!flub) return hit;
  if (hit.voice === flub.voice && hit.beat === flub.beat && hit.midi === flub.clean) {
    return { ...hit, midi: flub.sour, gain: hit.gain * 1.15 };
  }
  return hit;
}

function scheduleBar(
  context: BaseAudioContext,
  target: AudioNode,
  when: number,
  bar: ChartBar,
  flub: Flub | null,
  solo: Solo,
  track: boolean,
) {
  bar.hits.forEach((raw) => {
    const note = sounded(raw, flub);
    if (!audible(note.voice, solo)) return;
    const { key, rate } = nearest(note.voice, note.midi);
    const buffer = buffers.get(key);
    if (!buffer) return;
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = rate;
    const gain = context.createGain();
    const level = Math.max(note.gain, 0.0008);
    gain.gain.setValueAtTime(level, when);
    const end = when + Math.max(note.dur, 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, end);
    source.connect(gain);
    gain.connect(target);
    source.start(when);
    if (track) live.push(source);
  });
}

export function stop(): void {
  playing = false;
  if (timer) clearTimeout(timer);
  timer = null;
  live.forEach((source) => {
    try {
      source.stop();
    } catch {
      /* already ended */
    }
  });
  live.length = 0;
}

type PlayArgs = {
  bars: ChartBar[];
  bpm: number;
  flub: Flub | null;
  solo: Solo;
  start: number;
  end: number;
  loop: boolean;
  onBar: (index: number | null) => void;
};

export async function playTake(args: PlayArgs): Promise<void> {
  await prepare();
  stop();
  playing = true;
  const barDur = barSeconds(args.bpm);
  let index = args.start;
  const tick = () => {
    if (!playing || !ctx || !bus) return;
    if (index >= args.end) {
      if (args.loop) index = args.start;
      else {
        stop();
        args.onBar(null);
        return;
      }
    }
    args.onBar(index);
    const flub = args.flub && args.flub.bar === index ? args.flub : null;
    scheduleBar(ctx, bus, ctx.currentTime + 0.06, args.bars[index], flub, args.solo, true);
    index += 1;
    timer = setTimeout(tick, barDur * 1000);
  };
  tick();
}

export async function playCompare(bar: ChartBar, bpm: number, flub: Flub, solo: Solo): Promise<void> {
  await prepare();
  stop();
  if (!ctx || !bus) return;
  const barDur = barSeconds(bpm);
  const start = ctx.currentTime + 0.06;
  scheduleBar(ctx, bus, start, bar, flub, solo, true);
  scheduleBar(ctx, bus, start + barDur + 0.28, bar, null, solo, true);
}

export async function bounceClean(rooms: Room[]): Promise<Blob> {
  await prepare();
  const gap = 0.75;
  const tail = 1.35;
  let seconds = 0.2;
  rooms.forEach((roomChart) => {
    seconds += roomChart.bars.length * barSeconds(roomChart.bpm) + tail + gap;
  });
  const offline = new OfflineAudioContext(2, Math.ceil(seconds * 44100), 44100);
  const gain = offline.createGain();
  gain.gain.value = 0.9;
  const comp = offline.createDynamicsCompressor();
  comp.threshold.value = -16;
  comp.knee.value = 8;
  comp.ratio.value = 2.2;
  comp.attack.value = 0.008;
  comp.release.value = 0.18;
  gain.connect(comp);
  comp.connect(offline.destination);
  let cursor = 0.12;
  rooms.forEach((roomChart) => {
    const dur = barSeconds(roomChart.bpm);
    roomChart.bars.forEach((bar, index) => {
      scheduleBar(offline, gain, cursor + index * dur, bar, null, "all", false);
    });
    cursor += roomChart.bars.length * dur + tail + gap;
  });
  const rendered = await offline.startRendering();
  return encodeWav(rendered);
}

function encodeWav(buffer: AudioBuffer): Blob {
  const channels = buffer.numberOfChannels;
  const rate = buffer.sampleRate;
  const frames = buffer.length;
  const block = channels * 2;
  const dataSize = frames * block;
  const bytes = new ArrayBuffer(44 + dataSize);
  const view = new DataView(bytes);
  const write = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
  };
  write(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  write(8, "WAVE");
  write(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * block, true);
  view.setUint16(32, block, true);
  view.setUint16(34, 16, true);
  write(36, "data");
  view.setUint32(40, dataSize, true);
  const data = Array.from({ length: channels }, (_, channel) => buffer.getChannelData(channel));
  let offset = 44;
  for (let frame = 0; frame < frames; frame++) {
    for (let channel = 0; channel < channels; channel++) {
      const sample = Math.max(-1, Math.min(1, data[channel][frame] ?? 0));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }
  return new Blob([bytes], { type: "audio/wav" });
}
