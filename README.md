# Three Kingdoms Classic v2.4.6 — Shared-State Multiplayer Experiment

This is the ORIGINAL classic v2.4.6 HTML UI, not the circular-map prototype.

## Deploy
Upload `index.html`, `server.js`, `package.json` to the root of your GitHub `rotk` repository. Render Node Web Service start command: `npm start`.

## Join
- Wei: `https://rotk.onrender.com/?room=CAOCAO&side=wei&mode=60`
- Shu: `https://rotk.onrender.com/?room=CAOCAO&side=shu&mode=60`
- Modes: 20, 60, 180, 300 (first visitor selects).

## What is implemented
- Original classic v2.4.6 game UI, map, economy, heroes, skill/battle functions remain in browser.
- Both sides use the same shared snapshot in server RAM.
- On action redraw, snapshot POST `/api/save`; GET `/api/state` polling every ~850 ms.
- Optimistic version check to avoid silently overwriting newer snapshots; conflicts reload latest server state.
- Faction-based controls: Wei 0 and Shu 1; Wu remains uncontrolled (AI actions disabled).
- Turn end requires both factions, or deadline expiry. Shu browser processes classic turn-upkeep once, using CAS `/api/turn-applied`.
- `/api/state?code=CAOCAO` returns snapshot, metadata, version, and phase.

## Limitations / important
- EXPERIMENTAL, not fully authoritative: browser calculates outcomes; server stores state and checks version only.
- No anti-cheat or authentication, no hidden information (entire snapshot accessible), no per-action audit log, no GET action command bridge.
- Snapshot writes can conflict if both players click at nearly the same time; loser reloads newer state, and its action may be lost. This is not real simultaneous action processing.
- Both players must be online; Shu browser must be present to apply turn upkeep.
- Server RAM is volatile; Render restarts wipe rooms. Choose a new room code when testing a new deployment.
- Browser timer and state sync need testing on Render with two devices.
- Original battle engine runs on the client, including randomness, so results are authoritative only by convention.
- UI retains original single-player language in some labels.
- Do not use for competitive play without server-side action execution and atomic persistence.

## Smoke tests run
- Node JS syntax checks passed for server and extracted browser script.
- API tests: join, save, second client read, both End Turn, one-time turn-applied passed.
- Browser interaction was not end-to-end tested.
