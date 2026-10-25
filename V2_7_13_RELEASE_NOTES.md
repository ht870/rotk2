# ROTK v2.7.13 — Critical Victory Condition Fix

- Game ends only when exactly one kingdom owns all 15 cities.
- Eliminating Shu, Wei, or Wu alone does not end Wei-vs-Wu or other remaining wars.
- Server recalculates `over` from city ownership when receiving snapshots and serving state, correcting stale client flags.
- Top-left version and multiplayer connected banner updated to v2.7.13.
