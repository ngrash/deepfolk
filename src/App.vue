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
const cameraZoom = ref(1);
const pointers = new Map<number, { x: number; y: number }>();
let lastPinchDistance = 0;

function clampCamera() {
  if (!stage) return;
  stage.x = Math.min(0, Math.max(840 - 840 * cameraZoom.value, stage.x));
  stage.y = Math.min(0, Math.max(430 - 430 * cameraZoom.value, stage.y));
}

function applyZoom(nextZoom: number, clientX?: number, clientY?: number) {
  if (!stage || !app) return;
  const rect = app.canvas.getBoundingClientRect();
  const focusX = clientX === undefined ? 420 : (clientX - rect.left) * 840 / rect.width;
  const focusY = clientY === undefined ? 215 : (clientY - rect.top) * 430 / rect.height;
  const worldX = (focusX - stage.x) / cameraZoom.value;
  const worldY = (focusY - stage.y) / cameraZoom.value;
  cameraZoom.value = Math.min(3.5, Math.max(1, nextZoom));
  stage.scale.set(cameraZoom.value);
  stage.position.set(focusX - worldX * cameraZoom.value, focusY - worldY * cameraZoom.value);
  clampCamera();
}

function resetCamera() {
  cameraZoom.value = 1;
  stage?.scale.set(1);
  stage?.position.set(0, 0);
}

function onPointerDown(event: PointerEvent) {
  app?.canvas.setPointerCapture(event.pointerId);
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
}

function onPointerMove(event: PointerEvent) {
  const previous = pointers.get(event.pointerId);
  if (!previous || !stage || !app) return;
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  const active = [...pointers.values()];
  if (active.length === 1) {
    const rect = app.canvas.getBoundingClientRect();
    stage.x += (event.clientX - previous.x) * 840 / rect.width;
    stage.y += (event.clientY - previous.y) * 430 / rect.height;
    clampCamera();
  } else if (active.length === 2) {
    const distance = Math.hypot(active[0].x - active[1].x, active[0].y - active[1].y);
    if (lastPinchDistance > 0) {
      applyZoom(
        cameraZoom.value * distance / lastPinchDistance,
        (active[0].x + active[1].x) / 2,
        (active[0].y + active[1].y) / 2,
      );
    }
    lastPinchDistance = distance;
  }
}

function onPointerUp(event: PointerEvent) {
  pointers.delete(event.pointerId);
  lastPinchDistance = 0;
}

function onWheel(event: WheelEvent) {
  event.preventDefault();
  applyZoom(cameraZoom.value * Math.exp(-event.deltaY * 0.0015), event.clientX, event.clientY);
}

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
  app.canvas.addEventListener("pointerdown", onPointerDown);
  app.canvas.addEventListener("pointermove", onPointerMove);
  app.canvas.addEventListener("pointerup", onPointerUp);
  app.canvas.addEventListener("pointercancel", onPointerUp);
  app.canvas.addEventListener("wheel", onWheel, { passive: false });
});
watch(snapshot, draw, { deep: true });
onBeforeUnmount(() => {
  worker.terminate();
  if (app) {
    app.canvas.removeEventListener("pointerdown", onPointerDown);
    app.canvas.removeEventListener("pointermove", onPointerMove);
    app.canvas.removeEventListener("pointerup", onPointerUp);
    app.canvas.removeEventListener("pointercancel", onPointerUp);
    app.canvas.removeEventListener("wheel", onWheel);
    app.destroy(true);
  }
});
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
      <div class="canvas-shell">
        <div ref="canvasHost" class="canvas" aria-label="Interactive mine overview. Drag to pan and pinch or scroll to zoom."></div>
        <div class="camera-controls" aria-label="Map controls">
          <button aria-label="Zoom out" @click="applyZoom(cameraZoom / 1.35)">−</button>
          <button class="zoom-level" aria-label="Reset map view" @click="resetCamera">{{ Math.round(cameraZoom * 100) }}%</button>
          <button aria-label="Zoom in" @click="applyZoom(cameraZoom * 1.35)">+</button>
        </div>
      </div>
      <aside>
        <section class="time-panel"><div class="panel-heading"><h2>Time</h2><span>{{ snapshot.speed === 0 ? 'Paused' : `${snapshot.speed}× speed` }}</span></div><div class="controls"><button v-for="speed in ([0, 1, 4] as Speed[])" :key="speed" :class="{ active: snapshot.speed === speed }" @click="setSpeed(speed)">{{ speed === 0 ? 'Pause' : `${speed}×` }}</button></div><button class="reset" @click="send({ type: 'reset' })">Restart colony</button></section>
        <section class="workers-panel"><div class="panel-heading"><h2>Workers</h2><span>{{ snapshot.workers.length }} residents</span></div><ul><li v-for="dwarf in snapshot.workers" :key="dwarf.id"><i :class="dwarf.shift"></i><span>{{ dwarf.name }}</span><small>{{ dwarf.shift === 'work' ? 'mining' : dwarf.destination === 'work' ? 'commuting' : 'off duty' }}</small></li></ul></section>
      </aside>
    </section>
  </main>
</template>
