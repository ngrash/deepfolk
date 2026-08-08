/// <reference lib="webworker" />
import type { Command } from "./protocol";
import { Simulation } from "./simulation";

let simulation = new Simulation();

self.onmessage = ({ data }: MessageEvent<Command>) => {
  if (data.type === "reset") simulation = new Simulation();
  if (data.type === "speed") simulation.setSpeed(data.value);
  self.postMessage(simulation.snapshot());
};

setInterval(() => {
  simulation.step();
  self.postMessage(simulation.snapshot());
}, 50);
