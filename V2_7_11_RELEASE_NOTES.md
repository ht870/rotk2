# ROTK v2.7.11 — Demoralized Troops & Conservation

- Losing side remaining soldiers are **Demoralized Troops** for attacker victory, defender victory, attacker rout, defender rout, and stalemate/repel (attacker only).
- Permanent Lost is calculated from casualties only, with existing brutality formula.
- Total recovered = Casualties + Demoralized Troops - Permanent Lost, exactly.
- Recovered units use existing winner 60% / loser 30% troop split, remainder DraftPool.
- Losing survivors are no longer also merged directly into active cohorts (avoids double counting).
- Report replaces Survivors Returned with Demoralized Troops; city Troops/Pool deltas reflect actual state changes.
- Version updated top-left to v2.7.11.
