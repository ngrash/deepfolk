import type { Snapshot, Speed, WorkerView } from "./protocol";

const HOME = { x: 160, y: 290 };
const WORK = { x: 650, y: 180 };
const DAY_TICKS = 720;

export class Simulation {
  private tick = 0;
  private speed: Speed = 1;
  private ore = 0;
  private workers: WorkerView[] = ["Mara", "Borin", "Tavi", "Orrin", "Nessa"].map((name, id) => ({
    id,
    name,
    x: HOME.x + (id % 3) * 20,
    y: HOME.y + Math.floor(id / 3) * 20,
    destination: "home",
    shift: "rest",
  }));

  setSpeed(speed: Speed) { this.speed = speed; }

  step() {
    if (this.speed === 0) return;
    for (let n = 0; n < this.speed; n += 1) this.advance();
  }

  private advance() {
    this.tick += 1;
    const hour = (this.tick % DAY_TICKS) / 30;
    const working = hour >= 7 && hour < 17;
    for (const worker of this.workers) {
      worker.destination = working ? "work" : "home";
      const target = working ? WORK : HOME;
      const dx = target.x - worker.x;
      const dy = target.y - worker.y;
      const distance = Math.hypot(dx, dy);
      if (distance > 3) {
        worker.x += (dx / distance) * 2.2;
        worker.y += (dy / distance) * 2.2;
        worker.shift = "rest";
      } else {
        worker.shift = working ? "work" : "rest";
        if (working) this.ore += 0.02;
      }
    }
  }

  snapshot(): Snapshot {
    return { tick: this.tick, hour: (this.tick % DAY_TICKS) / 30, speed: this.speed, ore: this.ore, workers: structuredClone(this.workers) };
  }
}
