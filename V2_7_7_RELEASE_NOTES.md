# ROTK v2.7.7 — Unified Turn Resource Ledger

- `applyCityTurnEconomy()` is the single calculation and mutation path for all per-turn resources: Gold (including conditional Auto Trade), Food, DraftPool, Fortification, Manpower, Commerce, Agriculture, Training EXP, Troops, and Morale.
- `previewCityTurn()` runs the identical function on a deep clone, preventing preview side effects.
- End Turn now calls that function once per city, instead of maintaining a separate formula.
- City Dashboard NET / TURN shows projected actual delta, including Food caps, troop attrition, and conditional Auto Trade.
- Development deltas and troop/morale deltas are visible.
- Normal action expenditures, attacks, espionage, and opponent effects occur separately from passive turn growth.
