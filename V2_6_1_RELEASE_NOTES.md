# ROTK v2.6.1 — gameplay balancing test build

Built from the previously provided v2.6.0 test ZIP. **Not deployed to Render.** Start a fresh room to test initial pool changes.

Changes:
- Universal multiplier curve shifted: S=400 ~1.6x; S=600 2x; no hard cap. Applies to Search, Hire, Persuasion and domestic yields.
- Governor selection uses the game's shared battle-dialog layout and a hero radio list, not a browser prompt. Governor contributes 150% stats and is excluded from ordinary officer ranking.
- Drill preview now uses the same city-base times officer multiplier expression as the local action.
- Search screen removes base-random 0–60% explanatory label (mechanics unchanged).
- Captures use independent per-hero probability `0.30 * 250^2 / ((LDR+WAR+INT)^2+250^2)`. Defender loss evaluates all stationed officers; failed attacker evaluates selected expedition heroes (max 3).
- Gold dashboard icon uses gold color; Scout button removed; Train Morale button relabeled Drill (Drill action remains).
- Initial draft pool -30%; draft pool turn growth +20%; Harvest action 1x baseline (previously 1.5x); expedition food required per battle round doubled; no-food troop attrition from 6% to 18% and morale loss from 10 to 30.
- Attacking does not consume the domestic action lock in the server battle engine.

## Known limitations / QA
- Server-side isolated smoke test passed (`node test_backlog_1_6.js`). JavaScript syntax checks passed.
- Existing integration test (`test_api.js`) is incompatible with the room join contract and did not pass; full browser/multiplayer end-to-end QA has **not** been completed.
- Client still uses classic snapshot-based synchronization; test with a new room and verify live state is not overwritten by another client.
- Wartime food 2x was interpreted as expedition food consumed per battle round; the ordinary city-turn upkeep remains 1x. The game has no persistent wartime-state flag in this build.
- No visual browser screenshot verification was performed.
