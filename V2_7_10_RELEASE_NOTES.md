# v2.7.10 — Shared economy engine

Browser City Dashboard NET/TURN and multiplayer server turn advancement both call `economy_engine.js` (ROTK_ECONOMY.apply / preview). No separate server baseline growth formulas. Auto Trade is applied before per-turn growth when city action is unused, including server-side.

`NET/TURN` is a forecast from the current state, not a guarantee when AI attacks or other actions alter the city before the turn boundary. The shared engine includes normalization of troop cohorts, and each runtime supplies its existing officer-stat functions.
