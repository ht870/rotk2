const assert=require('node:assert/strict');
const fs=require('node:fs');const vm=require('node:vm');
const src=fs.readFileSync(__dirname+'/battle_engine.js','utf8');
const snippet=src.slice(src.indexOf('// ROTK 3.1:'),src.indexOf('function battleHeroes('));
const ctx={officerData:{A:[90,100,90,80],B:[90,60,90,80],C:[90,50,80,80],D:[90,50,70,80],E:[90,50,60,80],F:[90,80,90,80],G:[90,80,90,80],H:[90,80,90,80],I:[90,80,90,80]},Math:Object.create(Math)};
ctx.Math.random=Math.random;vm.createContext(ctx);vm.runInContext(snippet,ctx);
const chance=(a,b,m)=>vm.runInContext(`tauntChance(${JSON.stringify(a)},${JSON.stringify(b)},${JSON.stringify(m)})`,ctx);
assert.equal(chance(['A'],['A'],''),10);
assert.equal(chance(['A'],['E'],''),30);
assert.equal(chance(['E'],['A'],''),0);
assert.equal(chance(['A','E'],['C'],''),5);
assert.equal(chance(['A'],['A'],'hold'),0);
assert.equal(chance(['A'],['A'],'fortify'),5);
assert.equal(vm.runInContext('duelPower("A")-duelPower("B")',ctx),36);
// Force two successful taunts in the same round, with distinct heroes removed.
ctx.Math.random=()=>0;const duel=vm.runInContext('resolveRoundDuels(["F","G"],["H","I"],"taunt","taunt",1)',ctx);
assert.equal(duel.events.filter(x=>x.includes('⚔ DUEL')).length,2);
console.log('ROTK v3.1 TAUNT/DUEL smoke tests passed');
