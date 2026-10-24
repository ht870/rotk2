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
