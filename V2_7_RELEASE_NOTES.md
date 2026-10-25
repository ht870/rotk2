# ROTK v2.7 — integrated candidate (patched from v2.6.1)

## Implemented
- 70% wandering officer movement / 30% stay each turn.
- Actual battle morale damage multiplier and round-by-round morale loss; rout, 3x victory, existing casualty distribution for defeated remaining troops.
- Hero tier audit: Zhang Ren B, Sima Zhao A; existing A/S combat and domestic passive mechanics retained.
- Gold coin icon restored in city dashboard.
- DraftPool net/turn preview aligned with end-turn formula; city defense increments remain tied to WAR.
- Officer Move Select All and Cancel/Back for map destination selection.
- Six War Tactics. Attacker chooses Assault (-15% defender defense), Siege (ignore fortification), Ambush (-10 defender morale). City owner configures hidden-in-UI stance: Hold (+15% defense), Fortify (2x fortification, default), Counter (+10 morale). Battle report shows tactics and sabotage.
- Five Espionage operations: Steal Gold (55%, 150G), Poison Supplies (60%, 120G), Sabotage Defense (55%, 180G), Incite Desertion (45%, 220G), Scout Defense Strategy (70%, 100G). Each shows success chance before execution; chance uses 60% INT + 40% POL comparison. Adjacent enemy cities only.
- One AP per hero per turn for Espionage, officer movement, battle participation, domestic action, Search, and Hire/Persuasion. Officer move cooldown 2->1->0; AP resets every turn independently. Spy -> Attack works with different heroes.
- State snapshot synchronization reused from existing City Lock architecture, including version checks.

## Tests performed
- `node --check` server and browser JavaScript: passed.
- `node test_v27_core.js`: three battle tactic scenarios passed.
- Browser headless smoke test: stance save, spy preview/execution, siege battle, move AP/cooldown, turn reset; no JS exceptions.
- Server API smoke test: lobby create/claim/start, snapshot save, spy preview, stale version rejection 409.

## Known limitations / NOT production-security-ready
- Defense Stance is hidden in the regular opposing player's UI, **but the snapshot API still carries defenseTactics**. A technical player inspecting network data can discover it. True secrecy requires moving battle execution to a server-authoritative command and redacting opposing private state. This is not complete.
- Snapshot-based multiplayer still inherits its existing trust assumptions. Version checks prevent stale writes but do not validate every arbitrary client snapshot field against cheating.
- Multiplayer end-to-end testing with two real browser sessions and all actions was not completed; the tests above are targeted smoke tests.
- The supplied package has only the audio files that were present in the v2.6.1 source; 20 BGM files were not provided.

## Run
`npm start` (or `node server.js`) then open `/lobby`.
