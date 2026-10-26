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
