# ROTK v2.7.6 — Captured City Lock + Auto Trade

1. A city captured in the current turn gets `capturedTurn=turn` and cannot perform any actions (city actions, espionage, hire/search, defense stance changes, officer moves, troop moves, or attacks) until the next turn. Both the UI and battle execution paths check the lock. Incoming officer/troop transfers into a newly captured city are also blocked during the same turn.
2. When End Turn runs, any city that has not used its domestic city action and was not captured this turn automatically performs Trade, using the same `Math.round(developGain(c)*.44)` gain as manual Trade. Auto Trade happens before normal turn growth and reset. Cities with `used=true` are not traded again. Auto Trade is logged with total cities and Gold.

Validation: extracted inline JavaScript passes `node --check`; ZIP integrity checked. Not browser multiplayer end-to-end tested.
