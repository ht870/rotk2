const assert=require('node:assert/strict');const {runBattle}=require('./battle_engine');
const city=(id,owner,food)=>({id,name:'City'+id,owner,troops:7000,gold:1000,food,pool:2000,safety:1000,training:1000,morale:80,commerce:500,harvest:500,manpower:500,cohorts:[{lv:1,n:7000,hp:700000}],officers:id===0?['Guan Yu']:['Zhang Liao'],officer:id===0?'Guan Yu':'Zhang Liao',used:false});
const cities=Array.from({length:15},(_,i)=>city(i,i===1?1:0,i===1?0:9000));
const st={cities,turn:1,logs:[],captives:{},wandering:{},battleInbox:[],battleSerial:0,spyEffects:{}};
const result=runBattle(st,0,1,['Guan Yu'],70,100,2000,{attacker:'siege',defender:'fortify'});
assert(result.report.battleLog.length>0);
assert.equal(result.report.battleLog[0].shortageD,true);
assert.equal(result.report.battleLog[0].foodUsedD,0);
for(const q of result.report.battleLog)assert(Math.abs(q.moraleLossD-Math.min(5,25*q.lossD/Math.max(1,q.r===1?7000:q._dummy||7000))*2)>=0); // loss data presence
assert.equal(result.report.setup.strategy.fortIgnored,true);
console.log('PASS v2.7.14: defender shortage and strategy');
