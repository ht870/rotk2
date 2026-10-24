# ROTK Classic v2.4.6 multiplayer — Lobby + GET action bridge (experimental)
Deploy files in this zip at repository root, Render start `npm start`.

Lobby button at top-right: Stop Game, Start New Game, select 20/60/180/300 seconds.
Room endpoints:
GET /api/rooms
GET /api/state?code=CAOCAO
GET /api/stop?code=CAOCAO
GET /api/restart?code=CAOCAO&mode=300
GET /api/action?code=CAOCAO&side=shu&type=fort&city=5
GET /api/action?code=CAOCAO&side=shu&type=train&city=6
GET /api/action?code=CAOCAO&side=shu&type=move&from=5&to=6
GET /api/end-turn?code=CAOCAO&side=shu

IMPORTANT: GET action bridge currently implements only fort, train and move. The original classic recruitment, combat, hiring, and search depend on browser-side mechanics and are NOT implemented on GET API. GET action train/fort use simplified officer bonuses; move simplifies cohort composition. This is not yet mechanically identical to classic actions. Browser controls retain original mechanics.

Limitations: rooms stored only in RAM, anyone with URL can stop/restart, browser is still the engine for economy/upkeep and combat, browser Shu must be online to process upkeep, simultaneous snapshot collisions can lose actions. GET mutates state and refreshing a URL can repeat an action if city is not marked used, so do not use automatic link prefetching.
Tests: JS syntax checks and server join/save/fort/stop/restart smoke tests passed. Not yet tested on Render or a Mac browser.

## Atomic one-click batch GET (new)
GET /api/turn?code=CAOCAO300&side=shu&version=7&actions=fort:5,train:6,move:7:6&end=1

`version` MUST equal current /api/state version. The batch applies in order to a cloned state, and if any action fails, nothing is committed. `end=1` ends Shu's turn in the same transaction. A successful request increments version once, not once per action. Duplicate clicks will be rejected because the version changes / side has ended.

Action grammar: `fort:city`, `train:city`, `move:from:to`. At most 15 actions. Each city can only act once per turn. Currently only these three simplified actions are supported, not recruit, attack, search or hire. Original classic engine has NOT been ported to server. Room admin GET endpoints have no auth; do not expose publicly for serious use.
