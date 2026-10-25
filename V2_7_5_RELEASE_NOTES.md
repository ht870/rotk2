# v2.7.5
1. Unhired discovered wandering heroes reset on each new turn; Search required again.
2. Search probability base Uniform(0,60%) independently for each city and attempt; preview uses same cached roll as execution.
3. Remove officer_effect discount text from Espionage popup.
4. Espionage success independently rolls each hero, including failure outcomes.
5. Multi-hero Espionage UI modeled on Move Hero: action, select all, checkbox, probability, effect, per-hero discounted Gold slider, aggregate results. Incite Desertion stacks 12 morale per successful hero to minimum 0.
6. Battle round heading now places morale alongside each side remaining troops, omitting damage multipliers.
