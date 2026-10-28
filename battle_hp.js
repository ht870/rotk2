'use strict';
// HP is battle-local. Campaign state persists troop counts/levels, never wounds.
const HP_BY_LEVEL = Object.freeze({1:100,2:110,3:120,4:130,5:140});
function freshBattleHP(cohorts) {
  for (const cohort of cohorts) {
    const hp = HP_BY_LEVEL[cohort.lv];
    if (!hp || !Number.isSafeInteger(cohort.n) || cohort.n < 0) throw new Error('Invalid battle cohort');
    cohort.hp = cohort.n * hp;
  }
  return cohorts;
}
module.exports = {HP_BY_LEVEL, freshBattleHP};
