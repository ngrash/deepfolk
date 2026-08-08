# Deepfolk tech demo

A web-first vertical slice for a systemic fantasy colony simulator. Five workers follow a deterministic daily schedule, commute between quarters and an ore face, and produce ore while on shift.

## Run locally

```sh
npm install
npm run dev
```

## Architecture

- Vue 3 owns the management UI.
- PixiJS renders the mine and workers.
- A Web Worker runs framework-free deterministic simulation logic.
- Commands go into the worker; read-only snapshots come out.
- Vitest verifies simulation determinism and time controls.

This intentionally small vertical slice is designed to grow through isolated systems rather than a generated all-purpose engine.
