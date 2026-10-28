## v4.0.5 — Starvation morale
- Food shortage independently reduces morale by 3 each battle round.
- Battle casualty morale remains capped at 5 before formation modifiers.
- Encirclement multiplies both components by 1.5 in client battle simulation.
- Removed previous 2x shortage multiplier.
- Battle report labels shortage as +3 starvation rather than 2x.

## v4.0.3-full-hp
- Reset both participating armies to full HP at battle start; no HP reset between rounds.
- Discard temporary battle wounds after resolution; retain existing troop loss/recovery mechanics.
- Add fresh-HP regression tests.

# Changelog

## v3.0.1 — Cleanup
- Removed archived v2.x release notes, obsolete test scripts, and superseded documentation.
- Retained server runtime, combat/economy engines, officer data, UI, lobby, AI smoke test, and the served battle audio asset.
- Updated displayed version to v3.0.1.
- No gameplay, balancing, or AI algorithm changes.

## v3.0 — AI Planner Preview
- Added ranked attack planning, frontline reinforcement, contextual defense and economic action scoring.
- AI still follows server actions and game resource constraints.

## v2.7.18 — Combat modifiers
- Additive base ATK/DEF modifiers; hero damage multipliers retained.

Older detailed release notes are intentionally excluded from the deployment package.

## v3.1 — TAUNT & DUEL
- New TAUNT attacker and defender tactics. Each TAUNT rolls independently per round (up to 8 rounds).
- TAUNT success = clamp(10 + average INT of active challengers − average INT of active targets + opposing tactic modifier, 0, 30) percent.
- Opposing HOLD / AMBUSH: −10%; FORTIFY / SIEGE: −5%.
- Successful TAUNT: highest-WAR active challenger duels uniformly random active enemy officer.
- Duel power = 0.90 WAR + 0.05 INT + 0.05 LDR. Win chance = clamp(50 + 50 × power difference / 9, 0, 100) percent.
- Duel loser withdraws from this battle, immediately losing combat effects. Losing side morale −10.
- Strategy adjustments: HOLD DEF +18%; AMBUSH enemy morale −7; other effects unchanged.
- TAUNT/DUEL implemented in both multiplayer server engine and standalone classic client.

## v4.0.0-phase1
- Extracted faction timer calculations into turn_clock.js without changing intended timing semantics.
- Added deterministic timer regression tests.
- Existing AI, treasure and duel smoke tests pass.
- End Turn Turn-49 root cause not yet proven; long-match tests pending.

## v4.0.3-full-hp
- Added pure public-board strategic planner (`grandmaster_ai.js`) for threat assessment, defensive reserves, connected-territory target ranking and reinforcement selection.
- Integrated with existing legal server-side AI action flow; no resource bonuses or hidden opponent state.
- Added `test_grandmaster_ai.js`; retained previous regression tests.
- Scope: enhanced heuristics, not full multi-turn Monte Carlo search or trained AI. Benchmark win rate not yet measured.
