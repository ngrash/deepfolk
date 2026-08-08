import { describe, expect, it } from "vitest";
import { Simulation } from "./simulation";

describe("Simulation", () => {
  it("is deterministic", () => {
    const a = new Simulation();
    const b = new Simulation();
    for (let i = 0; i < 300; i += 1) { a.step(); b.step(); }
    expect(a.snapshot()).toEqual(b.snapshot());
  });

  it("respects pause", () => {
    const simulation = new Simulation();
    simulation.setSpeed(0);
    simulation.step();
    expect(simulation.snapshot().tick).toBe(0);
  });
});
