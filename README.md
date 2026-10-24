# ROTK v2.4.6 Online — first port milestone

Run `npm start` (Node 18+). Deploy these files to the same Render Web Service (replace previous files in GitHub).

- `/` — online multiplayer duel using the **v2.4.6 15-city names, map coordinates and road adjacency**, plus initial named officers and officer-stat modifiers to combat.
- `/classic` — **unaltered original v2.4.6** playable in browser as offline single-player. This route does NOT synchronize its game state with the multiplayer server.
- `/api/state?code=CAOCAO&side=shu` — online state.
- `/api/action?code=CAOCAO&side=shu&type=recruit&city=4` — GET action (city IDs now use original v2.4.6 map).
- `/api/end-turn?code=CAOCAO&side=shu` — GET end turn.

IMPORTANT: This is a **partial port**, not yet full multiplayer parity. Online combat still uses a simplified resolution formula with officer modifiers, not the full v2.4.6 multi-round battle simulator; no live officer hiring, hero skills, transfer of officer rosters, advanced reports, sound integration, or original isometric city artwork. Offline `/classic` contains those original systems.

All online rooms are held in RAM, resets on Render restart. No auth. GET action can execute on visit. Existing room state from the old deployment will be lost on restart.
# rotk2
