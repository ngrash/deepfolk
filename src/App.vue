<script setup lang="ts">
import { Application, Container, Graphics, Text } from "pixi.js";
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import type { Command, Snapshot, Speed } from "./protocol";

const canvasHost = ref<HTMLDivElement>();
const snapshot = ref<Snapshot>({ tick: 0, hour: 0, speed: 1, ore: 0, workers: [] });
const worker = new Worker(new URL("./sim.worker.ts", import.meta.url), { type: "module" });
worker.onmessage = ({ data }: MessageEvent<Snapshot>) => { snapshot.value = data; };
const send = (command: Command) => worker.postMessage(command);
const setSpeed = (speed: Speed) => send({ type: "speed", value: speed });
const clock = () => `${String(Math.floor(snapshot.value.hour)).padStart(2, "0")}:${snapshot.value.hour % 1 >= 0.5 ? "30" : "00"}`;

let app: Application | undefined;
let stage: Container | undefined;
function draw() {
  if (!stage) return;
  stage.removeChildren();
  const tunnels = new Graphics().roundRect(70, 130, 700, 220, 32).fill(0x171b20).stroke({ color: 0x40362a, width: 8 });
  tunnels.moveTo(190, 285).lineTo(620, 190).stroke({ color: 0x66523c, width: 54 });
  stage.addChild(tunnels);
  const home = new Graphics().roundRect(110, 245, 120, 90, 10).fill(0x43505a).stroke({ color: 0x9bb0bc, width: 3 });
  const mine = new Graphics().roundRect(595, 135, 130, 100, 10).fill(0x4a3428).stroke({ color: 0xd28755, width: 3 });
  stage.addChild(home, mine, new Text({ text: "QUARTERS", style: { fill: 0xd8e0e5, fontSize: 13 } }), new Text({ text: "ORE FACE", style: { fill: 0xffc69e, fontSize: 13 } }));
  stage.children.at(-2)!.position.set(132, 260); stage.children.at(-1)!.position.set(622, 150);
  for (const dwarf of snapshot.value.workers) {
    const body = new Graphics().circle(dwarf.x, dwarf.y, 9).fill(dwarf.shift === "work" ? 0xffb36b : 0x65c5d4).stroke({ color: 0xffffff, width: 2 });
    stage.addChild(body);
  }
}

onMounted(async () => {
  app = new Application();
  await app.init({ width: 840, height: 430, background: 0x0d1014, antialias: true, resolution: Math.min(window.devicePixelRatio, 2), autoDensity: true });
  canvasHost.value?.appendChild(app.canvas);
  stage = new Container(); app.stage.addChild(stage); draw();
});
watch(snapshot, draw, { deep: true });
onBeforeUnmount(() => { worker.terminate(); app?.destroy(true); });
</script>

<template>
  <main>
    <header>
      <div><span class="eyebrow">DEEPFOLK / SYSTEMS PROTOTYPE</span><h1>Emberdelve</h1></div>
      <div class="clock"><span>Day {{ Math.floor(snapshot.tick / 720) + 1 }}</span><strong>{{ clock() }}</strong></div>
    </header>
    <section class="metrics" aria-label="Colony overview">
      <article><span>ORE</span><strong>{{ snapshot.ore.toFixed(1) }}</strong></article>
      <article><span>FOLK</span><strong>{{ snapshot.workers.length }}</strong></article>
      <article><span>ON SHIFT</span><strong>{{ snapshot.workers.filter(w => w.shift === 'work').length }}</strong></article>
    </section>
    <section class="mine">
      <div ref="canvasHost" class="canvas" aria-label="Mine overview"></div>
      <aside>
        <section class="time-panel"><div class="panel-heading"><h2>Time</h2><span>{{ snapshot.speed === 0 ? 'Paused' : `${snapshot.speed}× speed` }}</span></div><div class="controls"><button v-for="speed in ([0, 1, 4] as Speed[])" :key="speed" :class="{ active: snapshot.speed === speed }" @click="setSpeed(speed)">{{ speed === 0 ? 'Pause' : `${speed}×` }}</button></div><button class="reset" @click="send({ type: 'reset' })">Restart colony</button></section>
        <section class="workers-panel"><div class="panel-heading"><h2>Workers</h2><span>{{ snapshot.workers.length }} residents</span></div><ul><li v-for="dwarf in snapshot.workers" :key="dwarf.id"><i :class="dwarf.shift"></i><span>{{ dwarf.name }}</span><small>{{ dwarf.shift === 'work' ? 'mining' : dwarf.destination === 'work' ? 'commuting' : 'off duty' }}</small></li></ul></section>
      </aside>
    </section>
  </main>
</template>
