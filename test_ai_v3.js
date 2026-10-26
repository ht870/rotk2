const assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm'),path=require('path');
const source=fs.readFileSync(path.join(__dirname,'server.js'),'utf8');
const sandbox={require,process:{env:{PORT:0}},__dirname,console,Buffer,setTimeout,clearTimeout,setInterval:()=>({unref(){}})};
// Suppress the HTTP listener; test real AI through real applyAction and battle engine.
const code=source.replace(/\.listen\(PORT,'0\.0\.0\.0',\(\)=>console\.log\('Classic multiplayer snapshot server on',PORT\)\);/,'.on("request",()=>{});')+'\nthis.__test={autoAI,EDGES,SIDES};';
vm.runInNewContext(code,sandbox,{filename:'server.js'});
const {autoAI,EDGES}=sandbox.__test;
const officerNames=['Cao Cao','Xiahou Dun','Zhang Liao','Liu Bei','Guan Yu','Zhang Fei','Sun Quan','Zhou Yu','Gan Ning'];
const cities=Array.from({length:15},(_,i)=>({id:i,name:'City'+i,owner:i<5?0:i<10?1:2,troops:6500,gold:3000,food:11000,pool:8000,safety:1000,training:2000,morale:80,commerce:500,harvest:500,manpower:500,cohorts:[{lv:2,n:6500,hp:650000}],officers:[officerNames[i%officerNames.length]],used:false}));
const state={cities,turn:1,over:false,logs:[],wandering:{},discovered:{},searchCount:{},captives:{},offerPrices:{},battleInbox:[],battleSerial:0,heroAP:{},stationCooldown:{},harvestCooldown:{},defenseTactics:{},spyEffects:{},incidentInbox:[]};
const r={started:true,state,controllers:{wei:'human',shu:'ai',wu:'human'},ready:{wei:false,shu:false,wu:false},log:[],phase:1,mode:300,version:0};
const before=state.cities.reduce((n,c)=>n+c.troops,0);
autoAI(r);
assert.equal(r.ready.shu,true);assert(r.log.some(x=>x.txt==='AI v3 planning complete'));
assert(state.cities.every(c=>Number.isFinite(c.gold)&&c.gold>=0&&Number.isFinite(c.troops)&&c.troops>=0));
assert(state.cities.reduce((n,c)=>n+c.troops,0)<=before+100000);
console.log('PASS: AI turn completes using real server actions, with valid nonnegative state. Actions:',r.log.length);
