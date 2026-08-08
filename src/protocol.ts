export type Speed = 0 | 1 | 4;
export type SiteKind = "home" | "work";

export interface WorkerView {
  id: number;
  name: string;
  x: number;
  y: number;
  destination: SiteKind;
  shift: "rest" | "work";
}

export interface Snapshot {
  tick: number;
  hour: number;
  speed: Speed;
  ore: number;
  workers: WorkerView[];
}

export type Command = { type: "speed"; value: Speed } | { type: "reset" };
