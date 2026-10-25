# ROTK v2.7.15
- Attacking with zero selected heroes is legal; no automatic replacement heroes. Explicitly selected heroes must pass AP and ownership checks.
- Battle notifications for defending factions are surfaced from incoming multiplayer snapshots, including on conflict refresh. Full battle reports open in a popup and remain accessible from the event inbox.
- Incoming espionage attempts generate a generic target-city warning popup and persistent event inbox entry, without exposing spy identity or success/failure.
- Server API also records defender-facing battle and espionage notifications.
- Version label updated.

Note: Multiplayer concurrent-browser end-to-end test not performed. Server currently uses snapshot-based sync; full atomic action-level concurrency is a separate architectural improvement.
