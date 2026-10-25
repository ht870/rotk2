# Backlog 1–6 experimental test build

Based on `rotk_dynamic_bgm_1_to_20.zip`. This is a **server-side mechanics prototype**, not yet a fully synchronized client UI release. The existing classic UI retains older local action calculations and its `/api/save` snapshot path; consequently, UI actions can override server calculations. Use the GET `/api/action` interface or the unit test for checking the new mechanics; do not treat the UI as authoritative for this test build.

## Implemented in server mechanics
- #1: S-curve `1+2*S*S/(S*S+250*250)`, unlimited effective stat, weighted officer ranking 100%,90%,80%... and 100% additional governor stats; production based on city development stats.
- #2: Search requires wandering hero, random 0–60% base per attempt, additional bonus up to 40pp as S approaches infinity; search cost discounted.
- #3: Hero cost `TierBase+3*sum(stats)` with random 0.4–1.6 offer fixed per hero/city, captured 30% discount; persuasion fee discounted separately; price divided by officer multiplier.
- #4: Drill training EXP city baseline 220 multiplied by weighted LDR/WAR, with level 2 threshold 1000.
- #5: Governor gives additional 100% all four stats, defaults to first stationed hero; `type=governor&name=...` manually assigns governor.
- #6: Attack is not blocked by, and does not consume, domestic city action; repeat attacks allowed subject to normal battle resource constraints.

## Limitations / TODO before live play
- Client action math and UI lock buttons are **not updated**; they still use the legacy calculations. Server and UI are not yet end-to-end consistent.
- The latest source contains only some of the development action types; full Commerce/Agriculture/Manpower development buttons are not yet ported to this server API.
- Search bonus formula uses asymptotic 40pp rather than +40pp exactly at 500 (because there is no stat cap).
- Other prior gameplay features remain from the supplied base build; they were not comprehensively regression-tested.

## Smoke test
`node test_backlog_1_6.js`
