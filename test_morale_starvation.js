const assert=require('assert');const {moraleLoss}=require('./morale_rules');
assert.deepStrictEqual(moraleLoss(0,1000,false),{battle:0,starvation:0,total:0});
assert.equal(moraleLoss(0,1000,true).total,3);
assert.equal(moraleLoss(0,1000,true,1,1.5).total,4.5);
assert.equal(moraleLoss(1000,1000,false).total,5);
assert.equal(moraleLoss(1000,1000,true).total,8);
assert.equal(moraleLoss(1000,1000,true,1,1.5).total,12);
assert.equal(moraleLoss(20,1000,true,1,1.5).total,5.25);
console.log('starvation morale tests passed');
