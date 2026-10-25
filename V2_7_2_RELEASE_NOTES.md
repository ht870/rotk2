# ROTK v2.7.2 — Officer Effect / Espionage Gold Boost

- Central `officer_effect(city, action)` for effective city officer contribution. Governor 150%, remaining officers ranked with diminishing contribution, action-specific stat weights.
- `officer_cost` and `officer_performance` helpers; existing actionMultiplier callers now share officer_effect.
- Espionage cost slider uses actual discounted Gold, from rounded baseCost / officer_effect to 3x that discounted minimum. Gold multiplier increases linearly from 1x to 1.5x; chance cap 95% after boost.
- Spy base chances: Scout 20%, Sabotage 15%, Poison 15%, Steal 15%, Desertion 10%. Operation-specific hero stat vs target city effective stat / 10, diff multiplier clamped 0.1x–9x; pre-Gold chance capped 90%.
- Spy preview updates with hero, target, operation and Gold investment; displays estimated effect. Espionage result plays success/failure sound.
- Removed floating bottom-left version label; header now v2.7.2.

Note: this is a targeted integration on top of the available v2.7.1 source. Other v2.7.2 backlog items (battle report per-round troop/morale, Search odds/one-discovery fix, and comprehensive UI/sound audit) have not been completed in this patch.
