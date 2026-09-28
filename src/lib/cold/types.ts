export type Melodic = "piano" | "guitar" | "bass" | "trumpet";
export type Voice = Melodic | "kick" | "snare" | "hat";
export type Solo = "all" | Melodic | "kit";
export type Pocket = "straight" | "light" | "push";

export type Hit = {
  voice: Voice;
  beat: number;
  midi: number;
  gain: number;
  dur: number;
};

export type ChartBar = {
  symbol: string;
  hits: Hit[];
};

export type Flub = {
  bar: number;
  voice: Melodic;
  beat: number;
  clean: number;
  sour: number;
  slip: string;
  detail: string;
};

export type Room = {
  id: string;
  name: string;
  bpm: number;
  key: string;
  blurb: string;
  pocket: Pocket;
  bars: ChartBar[];
  flubs: Flub[];
};
