const assert=require('node:assert/strict');const {runBattle}=require('./battle_engine');
const city=(id,owner,heroes)=>({id,name:'City'+id,owner,troops:7000,gold:1000,food:9000,pool:2000,safety:1000,training:1000,morale:80,commerce:500,harvest:500,manpower:500,cohorts:[{lv:1,n:7000,hp:700000}],officers:heroes,officer:heroes[0]||'None',used:false});
for(const [atk,def] of [['assault','hold'],['siege','fortify'],['ambush','counter']]){
const cities=Array.from({length:15},(_,i)=>city(i,i===1?1:0,i===0?['Guan Yu']:i===1?['Zhang Liao']:[]));const st={cities,turn:1,logs:[],captives:{},wandering:{},battleInbox:[],battleSerial:0,spyEffects:{1:{sabotage:{until:2,amount:.25}}}};
const r=runBattle(st,0,1,['Guan Yu'],70,100,2000,{attacker:atk,defender:def});assert.equal(r.report.tactics.attacker,atk);assert.equal(r.report.tactics.defender,def);assert.equal(r.report.tactics.spyDefenseFactor,.75);assert(r.report.battleLog.length<=8);assert(r.report.resolution);console.log('PASS',atk,def,r.report.resolution,r.report.battleLog.length);
}
