# ROTK Classic — Full GET Actions + Classic Combat (experimental)

Deploy the entire directory contents at the repository root, then restart the Node server (`npm start`). Existing in-memory rooms will reset on redeploy; the patch does not itself call `/api/restart` or reset any room.

## GET API

All UI action types are now exposed: `farm`, `food`, `recruit`, `fort`, `train`, `intel`, `move`, `search`, `hire`, `station`, and `attack`. Existing `GET /api/turn` batch syntax continues working for basic actions.

Simple example:

`/api/turn?code=CAOCAO301&side=shu&version=53&actions=farm:4,recruit:5,food:6&end=1`

Advanced actions use the `batch` query parameter containing a **URL-encoded JSON array**. This allows selecting 1–3 heroes, troop percentage, gold and food amounts, and transferring multiple officers:

```json
[
  {"type":"station","city":5,"to":4,"heroes":["Liu Bei"]},
  {"type":"attack","city":4,"to":0,"percent":70,"gold":100,"food":1000,"heroes":["Zhang Fei"]}
]
```

Use `encodeURIComponent(JSON.stringify(actions))` to create `batch`. Full URL structure:

`/api/turn?code=ROOM&side=shu&version=NN&batch=URL_ENCODED_JSON&end=1`

Single action:

`/api/action?code=ROOM&side=shu&version=NN&type=attack&city=4&to=0&percent=70&gold=100&food=1000&heroes=Zhang%20Fei`

`station` transfers officers between adjacent friendly cities, is free, does not use the city's turn action, and applies the original two-turn cooldown. `attack` validates adjacency, selected officers, deployment percentage, and expedition food and gold, then executes the classic client's combat formulas, S/A hero passives, round-3 ultimates, casualties, retreats, captures, and battle inbox. The response includes `state.lastBattle` and `state.battleInbox`. `farm` is the UI's Commerce/Trade action.

Batch processing is atomic on validation errors (`rolledBack:true`), version locked, and returns updated server state. Random search, persuasion, and battle outcomes can change if a failed batch is retried; avoid combining risky random actions with actions likely to fail.

## Testing and limitations

Run `node test_api.js` for integration tests of attack, station, rollback, locking, and economy. Syntax checks and these local integration tests passed; **Render deployment and full browser-versus-API equivalence tests have not been performed**. The original combat algorithm is copied from the bundled browser client into `battle_engine.js`; this is not yet one shared runtime function between browser and server. Server turn economy is still provisional and may differ from the original browser economy. Server data is in RAM; redeploy resets rooms. GET state mutation has no authentication; use only in trusted game rooms. The existing browser `/api/save` snapshot flow can race with GET actions; version locking prevents stale overwrites but requires refresh.

**Do not redeploy during a valuable game without a durable room-state backup.**

## vNext experimental changes (2026-10-25)

- Expedition food requirement and per-round consumption: 1.5% of deployed troops (previously 2%).
- Passive food production: +30%; manual harvest: 1.5x yield and three-turn cooldown per city (stored in snapshot).
- A/S domestic bonuses: +10% commerce development for INT >=85, +10% harvest development for POL >=85; server also adds +10% manpower development for high INT/POL specialists. Bonuses capped at +40%.
- Wandering officers relocate to an adjacent city each turn, rather than teleporting to any city.
- Captives belonging to the player's faction are visible in the recruitment market. Server `hire` accepts captive officer names with persuasion; client `persuade` uses current player faction.
- Only selected attacking heroes relocate to captured city; unselected officers remain at origin.
- Battle report casualties are displayed as losses *of the named side*, not enemy kills.
- Deprecated design: server room controllers were previously set on first `POST /api/join`: `{"controllers":{"wei":"human","shu":"ai","wu":"ai"}}`. Other valid combinations: 2 human + 1 AI, or all human. Defaults: Wei human, Shu human, Wu AI. AI takes simple economy/recruit actions and ends its turn automatically when a state snapshot is saved or a human ends turn. This is **not** a complete tactical AI and **not** a full 3-player browser lobby; Wu API actions are supported.

Important: The browser still has legacy local turn/AI handling; authoritative server mode and offline mode have different orchestration. This build is experimental. Test in a new room; do not overwrite live rooms. Existing tests cover core API actions but do not fully test all new gameplay flows or multiplayer browser concurrency.

## StarCraft-style lobby build

Open `/` (or `/lobby`) to create a room. The host chooses any open faction, invites other players using the room URL, assigns remaining open factions to AI, then clicks **Start Game**. Supported configurations: 1H+2AI, 2H+1AI, 3H. Each player claims a faction and receives a browser-local faction token. The host's token is stored in the browser's localStorage. A different browser will need the host's original browser to configure the room. The lobby polls every 1.3 seconds.

The game is served at `/classic?code=ROOM&side=wei|shu|wu&token=...`; use **Enter Game** from the lobby instead of constructing links manually. The server validates the faction token for `/api/join`, `/api/save`, `/api/end`, `/api/action`, `/api/turn`, and `/api/end-turn`. Old unprotected `/api/stop` and `/api/restart` routes are legacy and should not be exposed to untrusted public players; protect them or remove them before production deployment. Rooms remain in memory only, so restart/redeploy loses room state and player tokens. The first human browser to enter bootstraps the game snapshot.

The built-in AI now considers adjacent enemies, numerical attack odds, food, recruiting, transferring reinforcements to the frontline, morale, economy, searching and hiring officers. It uses the same `applyAction` / `runBattle` routines as server API actions, but it is **heuristic AI, not a thoroughly tuned opponent**. Combat tactics and long-horizon strategy need playtesting. In particular, the legacy browser snapshot engine still performs local actions before server commit, and may have discrepancies with server-side AI; this is an experimental playable prototype, not production-ready.

## AI + Mac music patch (2026-10-25)
- AI now evaluates S/A hero combat strength, uses 8-round food budgets, prioritizes attacks, moves rear troops and elite officers to adjacent fronts, and searches several cities for heroes. It still uses heuristic combat estimates, not perfect battle simulation.
- Mac music: explicit Music button playback with visible blocked/error state and audio element diagnostics. Safari and Chrome require a user click before playing sound. Check `/assets/Music_04_Siege_at_Red_Cliffs.mp3` returns HTTP 200, and the tab/site is not muted.
- No existing live room is modified by packaging this ZIP; deploying restarts in-memory rooms. Test in a new room.
