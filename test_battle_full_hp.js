'use strict';
const assert=require('node:assert/strict');
const {freshBattleHP,HP_BY_LEVEL}=require('./battle_hp');
function casualties(cohorts, damage) {
  const total=cohorts.reduce((s,x)=>s+x.n*({1:10,2:12,3:14,4:16,5:18}[x.lv]),0);
  return cohorts.reduce((loss,x)=>{const old=x.n;const part=damage*x.n*({1:10,2:12,3:14,4:16,5:18}[x.lv])/total;x.hp=Math.max(0,x.hp-part);x.n=Math.min(old,Math.ceil(x.hp/HP_BY_LEVEL[x.lv]));return loss+old-x.n},0);
}
for(const lv of [1,2,3,4,5]) {
 const army=[{lv,n:4200,hp:1}];
 freshBattleHP(army);
 assert.equal(army[0].hp,4200*HP_BY_LEVEL[lv]);
 casualties(army,43000);
 const survivors=army[0].n;
 assert(survivors<4200);
 freshBattleHP(army); // second battle, wounds do not carry over
 assert.equal(army[0].hp,survivors*HP_BY_LEVEL[lv]);
}
const defender=[{lv:1,n:4245,hp:356536}];
freshBattleHP(defender);
assert.equal(casualties(defender,43264),432);
assert.equal(defender[0].n,3813);
console.log('PASS: full HP per level, consecutive battles, 43,264 damage = 432 casualties');
