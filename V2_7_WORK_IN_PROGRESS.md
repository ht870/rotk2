# ROTK v2.7 — experimental server-side patch (NOT complete release)

Source: v2.6.1 balancing test ZIP.

Implemented in server API (not yet wired into classic browser UI):
- Wandering officers 70% adjacent move / 30% stay per turn.
- Per-hero AP for spy, officer movement, participating attackers; reset on turn advance. Movement cooldown decrements separately, 2 -> 1 -> 0, without disabling other actions.
- Espionage operations: steal Gold, poison Food, sabotage defense (2 turns), morale desertion. Server-authoritative preview endpoint `/api/spy-preview` returns success chance and cost before execution. Adjacent enemy cities only.
- Defense stance can be set by owner with action `defense-tactic`, `tactic=hold|fortify|counter`; attacker picks `tactic=assault|siege|ambush`.
- Battle engine actual morale damage multiplier, per-round morale losses, rout and 3x resolution, tactical modifiers, sabotage in battle report metadata.

Known missing work before a real v2.7 release:
- Classic browser UI still uses local/snapshot actions, so new server-only AP, espionage and tactics are not integrated with its controls. Do not deploy this as finished.
- Earlier backlog #3 Select All, #4 hero tier/passive audit, #5 original Gold icon, #6 city growth parity, #7 Back/Cancel flow not fixed in this patch.
- Existing integration test uses an obsolete lobby API and fails. Only isolated battle core smoke test passes.
- Hero AP not yet consistently enforced for all domestic/hire/search actions; no fully integrated multiplayer/AI test.
- Morale and 3x mechanics are a first implementation and require combat-balance tests and browser verification.
- Server has no persistence across restarts; state snapshot sync may overwrite new fields if a client sends stale state.

Run `node test_v27_core.js` for a limited battle smoke test. `node server.js` serves local lobby and API.
