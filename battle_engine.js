const {moraleLoss}=require('./morale_rules');
const {OFFICER_DATA,HERO_TIERS}=require('./game_data');
const TREASURE=require('./treasure_engine');
const {freshBattleHP}=require('./battle_hp');
// Exact combat functions extracted from classic client; no simplified combat replacement.
const officerData=new Proxy(OFFICER_DATA,{get(target,key){const base=target[key];return Array.isArray(base)?TREASURE.stats(currentBattleState||{cities:[]},key,base):base}});
let currentBattleState=null;
const tier=n=>HERO_TIERS[n]||'C';
function runBattle(st,src,dst,heroes,percent,gold,food,tactics={}){
 TREASURE.ensure(st);currentBattleState=st;const attackerTactic=tactics.attacker||'assault',defenderTactic=tactics.defender||'hold';
 if(!['assault','siege','ambush','taunt'].includes(attackerTactic)||!['hold','fortify','counter','taunt'].includes(defenderTactic))throw Error('Invalid war tactic');
 const moraleMult=m=>m<=60?.1+.4*(Math.max(0,m)/60)**2:.5+.71*((Math.min(100,m)-60)/40);
 let cities=st.cities,turn=st.turn,logs=st.logs||[],captives=st.captives||{},wandering=st.wandering||{},battleInbox=st.battleInbox||[],battleSerial=st.battleSerial||0,lastBattle=st.lastBattle||null;
 function log(msg){logs.unshift('T'+turn+' · '+msg);if(logs.length>100)logs.length=100}
const UNIT={1:{atk:10,def:10,hp:100},2:{atk:12,def:12,hp:110},3:{atk:14,def:14,hp:120},4:{atk:16,def:16,hp:130},5:{atk:18,def:18,hp:140}};
const UNIQUE_ULTIMATES={"Guan Yu":["Green Dragon Slash",1.95,0.96,0],"Zhang Fei":["Roar of Changban",1.2,0.67,0],"Zhao Yun":["Dragon of Changban",1.38,0.48,0],"Ma Chao":["Western Cavalry Charge",1.85,0.95,0],"Huang Zhong":["Divine Arrow",2.1,1,0],"Zhuge Liang":["Eight Trigrams",1.15,0.42,0],"Cao Cao":["Grand Mobilization",1.6,0.68,0],"Sima Yi":["Grand Counterstrategy",1.35,0.52,0],"Zhou Yu":["Blazing Inferno",1.9,0.88,0],"Lu Xun":["Burning Camps",1.75,0.75,0],"Zhang Liao":["Raid of Hefei",2.05,0.92,0],"Lü Bu":["Unmatched Warrior",2.35,1,0],"Pang Tong":["Phoenix Stratagem",1.65,0.58,0],"Guo Jia":["Brilliant Gambit",1.7,0.75,0],"Jia Xu":["Poisoned Scheme",1.8,0.82,0],"Xun Yu":["Grand Logistics",1.12,0.72,0.05],"Sun Ce":["Little Conqueror",1.95,0.95,0],"Sun Jian":["Tiger of Jiangdong",1.6,0.75,0],"Jiang Wei":["Northern Expedition",1.7,0.78,0],"Zhang He":["Adaptive Formation",1.45,0.6,0],"Liu Bei":["Oath of Brotherhood",1.4,0.62,0.025],"Sun Quan":["Eastern Mandate",1.35,0.63,0.03]};
// Named, near-unique passive definitions. All combat modifiers are resolved from this registry.
const PASSIVE_SKILLS={};
const PASSIVE_NAMES={
'Guan Yu':['Green Dragon Edge','Oathbound Vanguard'],'Zhang Fei':['Thunderous Roar','Unyielding Fury'],'Zhao Yun':['Dragon Guardian','Silver Spear Discipline'],'Ma Chao':['Western Cavalry','Relentless Charge'],'Huang Zhong':['Veteran Precision','Old General Resolve'],'Zhuge Liang':['Eight Trigrams','Calculated Victory'],'Cao Cao':['Tiger Command','Ambitious Strategist'],'Sima Yi':['Patient Defense','Hidden Counterstroke'],'Zhou Yu':['Crimson Strategy','Naval Command'],'Lu Xun':['Fireline Discipline','Patient Encirclement'],'Zhang Liao':['Fearless Vanguard','Hefei Bulwark'],'Lü Bu':['Peerless Force','Intimidating Presence'],'Pang Tong':['Phoenix Gambit','Unorthodox Plans'],'Guo Jia':['Unseen Calculation','Swift Counsel'],'Jia Xu':['Poisoned Stratagem','Survival Instinct'],'Xun Yu':['Imperial Logistics','Measured Command'],'Sun Ce':['Little Conqueror','Breakthrough Momentum'],'Sun Jian':['Tiger of Jiangdong','Iron Resolve'],'Jiang Wei':['Northern Expedition','Inherited Strategy'],'Zhang He':['Adaptive Formation','Veteran Maneuver'],'Liu Bei':['Benevolent Command','Oath of Unity'],'Sun Quan':['Eastern Resolve','River Dominion'],
'Xiahou Dun':'One-Eyed Resolve','Xiahou Yuan':'Swift March','Xu Huang':'Iron Discipline','Dian Wei':'Bodyguard Wall','Xu Chu':'Tiger Guard','Cao Ren':'Fortress Defender','Gan Ning':'River Raider','Taishi Ci':'Piercing Volley','Wei Yan':'Bold Flanking','Pang De':'Last Stand','Lu Meng':'Scholarly Ambush','Lu Su':'Strategic Support','Xu Shu':'Hidden Insight','Fa Zheng':'Precise Ambush','Yu Jin':'Ordered Ranks','Gao Shun':'Camp Breaker','Chen Gong':'Calculated Resistance','Zhang Ren':'Mountain Defense','Yan Yan':'Old Guard','Zhou Tai':'Scarred Protector','Zhuge Jin':'Diplomatic Logistics','Huang Gai':'Bitter Sacrifice','Cheng Pu':'Seasoned Shield','Wang Ping':'Steady Formation','Guan Ping':'Loyal Vanguard','Zhang Bao':'Thunder Heir','Ding Feng':'Winter Assault','Xun You':'Tactical Foresight','Zhuge Dan':'Disciplined Defense','Deng Ai':'Mountain Advance','Zhong Hui':'Deceptive Plans','Wen Yang':'Young Tempest'};
const PASSIVE_TYPES=['attack','guard','heal','outnumbered','momentum','counter','precision','sustain'];
for(const [name,t] of Object.entries(HERO_TIERS))if(t==='S'||t==='A'){
 const names=PASSIVE_NAMES[name];const count=t==='S'?2:1;
 PASSIVE_SKILLS[name]=Array.from({length:count},(_,i)=>{
  const type=PASSIVE_TYPES[(Object.keys(HERO_TIERS).indexOf(name)*3+i*5)%PASSIVE_TYPES.length];
  const amount=(t==='S'?0.09:0.12)+(i===1?.025:0);
  const skillName=Array.isArray(names)?names[i]:(names||name+' Tactics');
  const desc={attack:`Damage dealt +${Math.round(amount*100)}%`,guard:`Incoming damage −${Math.round(amount*100)}%`,heal:`Troop HP recovery +${Math.round(amount*100)}% per round`,outnumbered:`Damage +${Math.round(amount*100)}% while outnumbered`,momentum:`Damage +${Math.round(amount*100)}% from round 3`,counter:`Incoming damage −${Math.round(amount*100)}% while defending`,precision:`Damage +${Math.round(amount*100)}% against stronger armies`,sustain:`Incoming damage −${Math.round(amount*100)}% from round 3`}[type];
  return {name:skillName,type,amount,desc};
 });
}
function captureChance(n){let d=officerData[n]||[55,55,55,55],s=d[0]+d[1]+d[2];return .30*62500/(s*s+62500)}
function officers(c){return c.officers||[]}
function trainingLevel(c){return c.training>=9000?5:c.training>=5000?4:c.training>=2500?3:c.training>=1000?2:1}
function syncTroops(c){c.troops=c.cohorts.reduce((a,x)=>a+x.n,0)}
function normalize(c){let sum=c.cohorts.reduce((a,x)=>a+x.n,0);if(sum===c.troops)return;if(sum>c.troops){let left=sum-c.troops;for(const x of [...c.cohorts].reverse()){let n=Math.min(x.n,left);x.n-=n;x.hp=Math.min(x.hp,x.n*UNIT[x.lv].hp);left-=n;if(!left)break}}else if(sum<c.troops){addTroops(c,c.troops-sum,1)}c.cohorts=c.cohorts.filter(x=>x.n>0);syncTroops(c)}
function addTroops(c,n,lv){if(n<=0)return;let x=c.cohorts.find(x=>x.lv===lv);if(!x){x={lv,n:0,hp:0};c.cohorts.push(x)}x.n+=n;x.hp+=n*UNIT[lv].hp;syncTroops(c)}
function detach(c,n){normalize(c);let result=[];let total=Math.max(1,c.troops);for(const x of c.cohorts){let take=Math.min(x.n,Math.floor(n*x.n/total));if(take){let hp=x.hp*take/x.n;x.n-=take;x.hp-=hp;result.push({lv:x.lv,n:take,hp})}}let missing=n-result.reduce((a,x)=>a+x.n,0);for(const x of c.cohorts){if(!missing)break;let take=Math.min(missing,x.n);if(take){let hp=x.hp*take/x.n;x.n-=take;x.hp-=hp;result.push({lv:x.lv,n:take,hp});missing-=take}}c.cohorts=c.cohorts.filter(x=>x.n>0);syncTroops(c);return result}
function expeditionCounts(c,pct){normalize(c);let exact=c.cohorts.map(x=>x.n*pct/100),nums=exact.map(Math.floor),target=Math.floor(c.troops*pct/100);let remain=target-nums.reduce((a,b)=>a+b,0);let order=exact.map((v,i)=>({i,frac:v-Math.floor(v)})).sort((a,b)=>b.frac-a.frac);for(const x of order){if(remain--<=0)break;nums[x.i]++}return nums}
function detachPercent(c,pct){let nums=expeditionCounts(c,pct),arr=[];c.cohorts.forEach((x,i)=>{let n=nums[i];if(n){let hp=x.hp*n/x.n;arr.push({lv:x.lv,n,hp});x.n-=n;x.hp-=hp}});c.cohorts=c.cohorts.filter(x=>x.n>0);syncTroops(c);return arr}
function merge(c,arr){for(const x of arr){let y=c.cohorts.find(y=>y.lv===x.lv);if(y){y.n+=x.n;y.hp+=x.hp}else c.cohorts.push({...x})}syncTroops(c)}
function takeDamage(arr,dmg){let lost=0;let total=arr.reduce((s,x)=>s+x.n*UNIT[x.lv].def,0)||1;for(const x of arr){let portion=dmg*(x.n*UNIT[x.lv].def/total),old=x.n;x.hp=Math.max(0,x.hp-portion);x.n=Math.min(old,Math.ceil(x.hp/UNIT[x.lv].hp));lost+=old-x.n}return lost}
function armyStats(arr,heroes,defending=false,safety=0){let totals=[0,0,0,0];heroes.forEach(n=>officerData[n]?.forEach((v,i)=>totals[i]+=v));let atk=arr.reduce((a,x)=>a+x.n*UNIT[x.lv].atk,0),def=arr.reduce((a,x)=>a+x.n*UNIT[x.lv].def,0),n=arr.reduce((a,x)=>a+x.n,0);return {atk:atk*(1+totals[1]/300),def:(def/Math.max(1,n))*(1+totals[0]/300)*(defending?1+safety/10000:1),crit:Math.min(.35,totals[2]/1800),heal:Math.min(.012,totals[3]/30000),n,totals}}
function heroScore(n,defending=false){let d=officerData[n],t=tier(n);return (defending?d[0]*1.7+d[1]*.7:d[1]*1.7+d[0]*.7)+d[2]*.5+d[3]*.3+(t==='S'?85:t==='A'?30:0)}

// ROTK 3.1: independent TAUNT rolls, average INT resistance, deterministic duel extremes.
function duelPower(n){const d=officerData[n]||[0,0,0,0];return .90*d[1]+.05*d[2]+.05*d[0]}
function averageBattleINT(ns){return ns.length?ns.reduce((s,n)=>s+(officerData[n]?.[2]||0),0)/ns.length:0}
function tauntChance(challengers,targets,otherTactic){const modifier=otherTactic==='hold'||otherTactic==='ambush'?-10:otherTactic==='fortify'||otherTactic==='siege'?-5:0;return Math.max(0,Math.min(30,10+averageBattleINT(challengers)-averageBattleINT(targets)+modifier))}
function resolveRoundDuels(attHeroes,defHeroes,atkTactic,defTactic,round){const events=[];let moralePenaltyA=0,moralePenaltyD=0;
 const attempts=[{side:'attacker',own:attHeroes,enemy:defHeroes,active:atkTactic==='taunt',opponent:defTactic},{side:'defender',own:defHeroes,enemy:attHeroes,active:defTactic==='taunt',opponent:atkTactic}];
 // Shuffle order: no permanent first-mover advantage for attacker or defender.
 if(Math.random()<.5)attempts.reverse();
 for(const attempt of attempts){if(!attempt.active||!attempt.own.length||!attempt.enemy.length)continue;
  const chance=tauntChance(attempt.own,attempt.enemy,attempt.opponent);
  if(Math.random()*100>=chance){events.push('🗣 '+attempt.side+' TAUNT resisted ('+chance.toFixed(1)+'%)');continue}
  const challenger=attempt.own.slice().sort((a,b)=>(officerData[b]?.[1]||0)-(officerData[a]?.[1]||0))[0];
  const challenged=attempt.enemy[Math.floor(Math.random()*attempt.enemy.length)];
  const winChance=Math.max(0,Math.min(100,50+50*(duelPower(challenger)-duelPower(challenged))/9));
  const challengerWon=Math.random()*100<winChance;
  const loser=challengerWon?challenged:challenger;
  const loserRoster=challengerWon?attempt.enemy:attempt.own;
  loserRoster.splice(loserRoster.indexOf(loser),1);
  if((challengerWon&&attempt.side==='attacker')||(!challengerWon&&attempt.side==='defender'))moralePenaltyD+=10;else moralePenaltyA+=10;
  events.push('⚔ DUEL '+challenger+' vs '+challenged+' — '+(challengerWon?challenger:challenged)+' wins; '+loser+' retreats (−10 morale) [TAUNT '+chance.toFixed(1)+'%, duel '+winChance.toFixed(1)+'%]');
 }
 return {events,moralePenaltyA,moralePenaltyD};
}
function battleHeroes(c,defending=false){return officers(c).slice().sort((a,b)=>heroScore(b,defending)-heroScore(a,defending)).slice(0,3)}
function heroEffects(heroes,round,side,ownN=0,enemyN=0){let dmg=1,guard=1,events=[],heal=0;
 for(const n of heroes){let t=tier(n);if(t!=='S'&&t!=='A')continue;
  for(const sk of PASSIVE_SKILLS[n]||[]){let active=true;
   switch(sk.type){case 'attack':dmg*=1+sk.amount;break;case 'guard':guard*=1-sk.amount;break;case 'heal':heal+=sk.amount;break;
   case 'outnumbered':active=ownN<enemyN;if(active)dmg*=1+sk.amount;break;
   case 'momentum':active=round>=3;if(active)dmg*=1+sk.amount;break;
   case 'counter':active=side==='defender';if(active)guard*=1-sk.amount;break;
   case 'precision':active=enemyN>ownN;if(active)dmg*=1+sk.amount;break;
   case 'sustain':active=round>=3;if(active)guard*=1-sk.amount;break;}
   if(active&&(round===1||sk.type==='momentum'&&round===3||sk.type==='sustain'&&round===3||sk.type==='outnumbered'||sk.type==='precision'))events.push(`🟣 ${n} — ${sk.name} (Passive): ${sk.desc}`);
  }
  if(t==='S'&&round===3){let u=UNIQUE_ULTIMATES[n];if(u){let [name,attack,defense,recovery]=u;dmg*=attack;guard*=defense;heal+=recovery;events.push('✨ '+n+' — '+name+' (Ultimate): DMG ×'+attack.toFixed(2)+' · incoming DMG ×'+defense.toFixed(2)+(recovery?' · healing bonus':'') )}}
 }
 return {dmg,guard,heal,events};
}
function simulateBattle(src,dst,attHeroes,ai=false,expedition=null){let a=cities[src],b=cities[dst],originBefore={troops:a.troops,pool:a.pool},targetBefore={troops:b.troops,pool:b.pool},sent=expedition?expedition.sent:Math.floor(a.troops*.82),atkArmy=expedition?detachPercent(a,expedition.percent):detach(a,sent),defArmy=b.cohorts.map(x=>({...x})),battleLog=[],oldOwner=b.owner,originalAtk=sent,originalDef=b.troops,defHeroes=battleHeroes(b,true),maxRounds=8;
// Both sides enter EVERY battle at full HP, including repeat battles.
// This happens once per battle, never between combat rounds.
freshBattleHP(atkArmy);
freshBattleHP(defArmy);
let tacticalMoraleA=Math.min(100,Math.max(0,a.morale||65)),tacticalMoraleD=Math.min(100,Math.max(0,(b.morale||65)+(attackerTactic==='ambush'?-7:0)+(defenderTactic==='counter'?10:0)));
const sabotage=st.spyEffects?.[dst]?.sabotage,spyDefenseFactor=sabotage&&sabotage.until>=turn?.75:1;
const fortMultiplier=attackerTactic==='siege'?0:defenderTactic==='fortify'?2:1;
const defensePenalty=(attackerTactic==='assault'?.25:0)+(defenderTactic==='hold'?-.18:0)+(spyDefenseFactor===.75?.25:0);
const effectiveSafety=b.safety*fortMultiplier;
let setup={atk:initialSide(atkArmy,attHeroes,false,0,defArmy.reduce((v,z)=>v+z.n,0)),def:initialSide(defArmy,defHeroes,true,effectiveSafety,atkArmy.reduce((v,z)=>v+z.n,0))};
setup.strategy={fortBasePct:b.safety/100,fortifyExtraPct:defenderTactic==='fortify'?b.safety/100:0,fortIgnored:attackerTactic==='siege',spyPct:spyDefenseFactor===.75?25:0,assaultPct:attackerTactic==='assault'?-25:0,holdPct:defenderTactic==='hold'?18:0};setup.tactics={attacker:attackerTactic,defender:defenderTactic,moraleDefender:tacticalMoraleD,spyDefenseFactor,fortMultiplier,defensePenalty};setup.def.effectiveDEF=Math.max(.01,setup.def.baseDEF*(1+setup.def.ldrPct/100+effectiveSafety/10000-defensePenalty))* (1-setup.def.passiveGuardPct/100);setup.atk.initialMorale=tacticalMoraleA;setup.def.initialMorale=tacticalMoraleD;setup.atk.initialMoraleMultiplier=moraleMult(tacticalMoraleA);setup.def.initialMoraleMultiplier=moraleMult(tacticalMoraleD);
let shownSkillA=new Set(setup.atk.passives.map(p=>p.hero+' — '+p.name)),shownSkillD=new Set(setup.def.passives.map(p=>p.hero+' — '+p.name));
let warGold=expedition?expedition.gold:Math.floor(a.gold*.8),warFood=expedition?expedition.food:Math.floor(a.food*.8);a.gold-=warGold;a.food-=warFood;let aStart=atkArmy.reduce((s,x)=>s+x.n,0),dStart=defArmy.reduce((s,x)=>s+x.n,0),foodSpent=0,foodPerRound=Math.ceil(sent*.03);
for(let r=1;r<=maxRounds;r++){if(atkArmy.every(c=>!c.n)||defArmy.every(c=>!c.n))break;if(tacticalMoraleA<=15||tacticalMoraleD<=15||atkArmy.reduce((v,z)=>v+z.n,0)<=originalAtk*.15||defArmy.reduce((v,z)=>v+z.n,0)<=originalDef*.15)break;let duels=resolveRoundDuels(attHeroes,defHeroes,attackerTactic,defenderTactic,r);tacticalMoraleA=Math.max(0,tacticalMoraleA-duels.moralePenaltyA);tacticalMoraleD=Math.max(0,tacticalMoraleD-duels.moralePenaltyD);let na=atkArmy.reduce((v,z)=>v+z.n,0),nd=defArmy.reduce((v,z)=>v+z.n,0),needA=Math.ceil(na*.03),needD=Math.ceil(nd*.03),shortageA=warFood<needA,shortageD=b.food<needD;let spent=Math.min(warFood,needA),spentD=Math.min(b.food,needD);warFood-=spent;b.food-=spentD;foodSpent+=spent;let x=armyStats(atkArmy,attHeroes),y=armyStats(defArmy,defHeroes,true,effectiveSafety),fx=heroEffects(attHeroes,r,'attacker',x.n,y.n),fy=heroEffects(defHeroes,r,'defender',y.n,x.n);if(x.n===0||y.n===0)break;
let critA=Math.random()<x.crit?1.35:1,critB=Math.random()<y.crit?1.35:1;
let effectiveYDef=Math.max(.01,y.def-(y.def/(1+y.totals[0]/300+effectiveSafety/10000))*defensePenalty);let dmgA=x.atk*(1+((moraleMult(tacticalMoraleA)-1)/(1+x.totals[1]/300)))*1.05*(12/(12+effectiveYDef))*fx.dmg*fy.guard*critA*(warFood>0?1:.75),dmgB=y.atk*(1+(moraleMult(tacticalMoraleD)-1)/(1+y.totals[1]/300))*1.05*(12/(12+x.def))*fy.dmg*fx.guard*critB;
let lossD=takeDamage(defArmy,dmgA),lossA=takeDamage(atkArmy,dmgB);let moraleLossA=moraleLoss(lossA,x.n,shortageA).total,moraleLossD=moraleLoss(lossD,y.n,shortageD).total;tacticalMoraleA=Math.max(0,tacticalMoraleA-moraleLossA);tacticalMoraleD=Math.max(0,tacticalMoraleD-moraleLossD);
for(const [army,st] of [[atkArmy,x],[defArmy,y]]){let recover=army.reduce((s,c)=>s+c.n*UNIT[c.lv].hp-c.hp,0)*(st.heal+(army===atkArmy?fx.heal:fy.heal));let remaining=recover;for(const c of army){let gap=c.n*UNIT[c.lv].hp-c.hp,add=Math.min(gap,remaining);c.hp+=add;remaining-=add}}
battleLog.push({r,shortageA,shortageD,moraleLossA,moraleLossD,foodUsedA:spent,foodUsedD:spentD,atk:Math.round(dmgA),def:Math.round(dmgB),lossA,lossD,moraleA:tacticalMoraleA,moraleD:tacticalMoraleD,remainA:atkArmy.reduce((s,z)=>s+z.n,0),remainD:defArmy.reduce((s,z)=>s+z.n,0),eventsA:fx.events.filter(e=>{let key=e.split(' (Passive)')[0].replace(/^🟣 /,'');if(shownSkillA.has(key))return false;shownSkillA.add(key);return true}),eventsD:fy.events.filter(e=>{let key=e.split(' (Passive)')[0].replace(/^🟣 /,'');if(shownSkillD.has(key))return false;shownSkillD.add(key);return true}),events:[...duels.events,...fx.events,...fy.events,critA>1?'🧠 Attacker tactical critical!':'',critB>1?'🧠 Defender tactical critical!':''].filter(Boolean)});
if(!battleLog.at(-1).remainA||!battleLog.at(-1).remainD)break;
}
let survivorsA=atkArmy.reduce((s,x)=>s+x.n,0),survivorsD=defArmy.reduce((s,x)=>s+x.n,0);
let attackerRout=tacticalMoraleA<=15||survivorsA<=originalAtk*.15,defenderRout=tacticalMoraleD<=15||survivorsD<=originalDef*.15;
let won=defenderRout&&!attackerRout?true:attackerRout?false:survivorsD===0?true:survivorsA>=3*survivorsD;
let resolution=defenderRout&&!attackerRout?'Defender rout':attackerRout?'Attacker rout':won?'3x superiority':survivorsD>=3*survivorsA?'Defender victory (3x superiority)':'Attack repelled — stalemate (no 3x superiority)';
let repelled=!won&&survivorsA>=1.5*survivorsD;
let attackerOutcome=won?'attacker_victory':repelled?'attacker_repelled':'attacker_routed';
a.morale=Math.max(25,a.morale-9);b.morale=Math.max(25,b.morale-7);
let casualtyRate=((originalAtk-survivorsA)+(originalDef-survivorsD))/Math.max(1,originalAtk+originalDef);let roundFactor=Math.min(1,(battleLog.length-1)/9);let brutality=Math.max(.10,Math.min(.35,.10+.15*casualtyRate+.10*roundFactor));
let recoverable=1-2*brutality;
const split=(loss,isWinner)=>{let recovered=Math.floor(Math.max(0,loss)*recoverable),troops=Math.floor(recovered*(isWinner?.6:.3));return {troops,pool:recovered-troops,lost:Math.max(0,loss)-recovered}};
let aLoss=originalAtk-survivorsA,dLoss=originalDef-survivorsD;
// Routing affects only surviving soldiers. Casualty recovery stays independent.
let routedA=won?0:Math.floor(survivorsA*(repelled?.20:.80));
let routedD=won?survivorsD:0;
let aRec=split(aLoss,won),dRec=split(dLoss,!won);
const distributeRouted=(rec,routed,isWinner)=>{
  const troops=Math.floor(routed*(isWinner?.6:.3));
  rec.troops+=troops;rec.pool+=routed-troops;
  rec.routed=routed;rec.demoralized=routed;return rec;
};
aRec.activeSurvivors=won?0:survivorsA-routedA;
distributeRouted(aRec,routedA,won);
distributeRouted(dRec,routedD,!won);
// Non-routed attacker survivors return to the source city directly.
const activeSurvivorsA=won?0:survivorsA-routedA;
if(!won)aRec.troops+=activeSurvivorsA;
if(aRec.troops+aRec.pool!==aLoss+(won?0:survivorsA)-aRec.lost||dRec.troops+dRec.pool!==dLoss+routedD-dRec.lost)throw Error('Battle troop conservation invariant violated');
let lootGold=0,lootFood=0;
// Winner receives remaining supplies of defeated force; attacker victory captures city's stored resources.
if(won){let old=b.owner,marching=attHeroes.slice(),defending=officers(b).slice(),retreat=cities.filter(x=>x.owner===old&&x.id!==b.id).sort((x,y)=>y.troops-x.troops)[0];
lootGold=b.gold;lootFood=b.food;
b.owner=a.owner;b.cohorts=atkArmy.filter(x=>x.n>0);syncTroops(b);b.used=true;
b.gold+=warGold;b.food+=warFood;b.morale=Math.max(35,a.morale);
// Attacker's wounded survivors return instantly to source; defenders' captives join newly occupied city.
a.pool+=aRec.pool;addTroops(a,aRec.troops,trainingLevel(a));
b.pool+=dRec.pool;addTroops(b,dRec.troops,trainingLevel(b));
for(const k of ['commerce','harvest','manpower','safety','training'])if(b[k]!=null)b[k]=Math.round(b[k]*(1-brutality));
for(const n of defending){if(Math.random()<captureChance(n)){captives[n]=a.owner;log('⛓ '+n+' captured!')}else if(retreat){retreat.officers.push(n)}else{wandering[n]=Math.floor(Math.random()*cities.length)}}if(retreat){retreat.officer=retreat.officers[0]||'None';}a.officers=officers(a).filter(n=>!marching.includes(n));a.officer=a.officers[0]||'None';b.officers=marching;b.officer=marching[0]||'None';log('🏆 '+a.name+' captured '+b.name+' after '+battleLog.length+' rounds!')
}else{b.cohorts=defArmy.filter(x=>x.n>0);syncTroops(b);addTroops(a,aRec.troops,trainingLevel(a));a.pool+=aRec.pool;addTroops(b,dRec.troops,trainingLevel(b));b.pool+=dRec.pool;lootGold=repelled?0:warGold;lootFood=repelled?0:warFood;if(repelled){a.gold+=warGold;a.food+=warFood}else{b.gold+=warGold;b.food+=warFood}for(const k of ['commerce','harvest','manpower','safety','training'])if(b[k]!=null)b[k]=Math.round(b[k]*(1-brutality));for(const n of repelled?[]:attHeroes){if(!officers(a).includes(n))continue;if(Math.random()<captureChance(n)){a.officers=a.officers.filter(x=>x!==n);captives[n]=b.owner;log('⛓ '+n+' captured after failed attack!')}}a.officer=a.officers[0]||'None';if(!a.officers.includes(a.governor))a.governor=a.officers[0]||null;log((repelled?'↩ Attack repelled / stalemate; survivors returned to ':'🛡 Attacker routed; '+b.name+' defended against ')+a.name+' ('+battleLog.length+' rounds).')}
const losingHeroes=won?defHeroes:attHeroes;const winningHeroes=won?attHeroes:defHeroes;const itemsAcquired=repelled?[]:TREASURE.dropAndLoot(st,losingHeroes,won?a.owner:b.owner,winningHeroes);
lastBattle={itemsAcquired,attackerOutcome,capturedHeroes:Object.keys(captives).filter(n=>losingHeroes.includes(n)),repelled,setup,tactics:setup.tactics,resolution,won,foodSpent,foodPerRound,expeditionPercent:expedition?.percent??82,src,dst,attHeroes,defHeroes,battleLog,originalAtk,originalDef,survivorsA,survivorsD,oldOwner,brutality,aRec,dRec,lootGold,lootFood,originName:a.name,targetName:b.name,attackerOwner:a.owner,originDelta:{troops:a.troops-originBefore.troops,pool:a.pool-originBefore.pool},targetDelta:{troops:b.troops-targetBefore.troops,pool:b.pool-targetBefore.pool},turn};battleInbox.unshift({id:++battleSerial,data:lastBattle,unread:ai&&oldOwner===1});if(battleInbox.length>100)battleInbox.length=100;return won}
function initialSide(arr,heroes,defending,safety,enemyN){let st=armyStats(arr,heroes,defending,safety),rawHP=arr.reduce((v,c)=>v+c.n*UNIT[c.lv].hp,0),rawATK=arr.reduce((v,c)=>v+c.n*UNIT[c.lv].atk,0),rawDEF=arr.reduce((v,c)=>v+c.n*UNIT[c.lv].def,0),fx=heroEffects(heroes,1,defending?'defender':'attacker',st.n,enemyN);
 let passives=[];for(const n of heroes){for(const sk of PASSIVE_SKILLS[n]||[]){let active=!['momentum','sustain'].includes(sk.type)&&(!['outnumbered','precision'].includes(sk.type)||st.n<enemyN)&&(sk.type!=='counter'||defending);if(active)passives.push({hero:n,tier:tier(n),name:sk.name,desc:sk.desc});}}
 return {n:st.n,rawHP,rawATK,rawDEF,hp:rawHP,atk:st.atk*fx.dmg,def:st.def*fx.guard,effectiveDEF:st.def*fx.guard,baseDEF:rawDEF/Math.max(1,st.n),warPct:st.totals[1]/300*100,ldrPct:st.totals[0]/300*100,fortPct:defending?safety/100:0,critPct:st.crit*100,healPct:st.heal*100,passiveAtkPct:(fx.dmg-1)*100,passiveGuardPct:(1-fx.guard)*100,passives};}
 const a=cities[src],b=cities[dst];
 if(!a||!b)throw Error('Invalid battle city');
 const sent=Math.floor(a.troops*percent/100);
 if(!Number.isInteger(percent)||percent<1||percent>100||sent<1000)throw Error('Need at least 1000 troops');
 if(!Number.isInteger(gold)||gold<0||gold>a.gold)throw Error('Invalid expedition gold');
 if(!Number.isInteger(food)||food<Math.ceil(sent*.03)*8||food>a.food)throw Error('Insufficient expedition food');
 if(!Array.isArray(heroes)||heroes.length<1||heroes.length>3||new Set(heroes).size!==heroes.length||heroes.some(n=>!a.officers.includes(n)))throw Error('Invalid selected heroes');
 const won=simulateBattle(src,dst,heroes,false,{percent,sent,gold,food});
 // Persist soldier counts/levels only; discard temporary battle wounds.
 freshBattleHP(a.cohorts);
 freshBattleHP(b.cohorts);
 st.logs=logs;st.captives=captives;st.wandering=wandering;st.battleInbox=battleInbox;st.battleSerial=battleSerial;st.lastBattle=lastBattle;
 return {won,report:lastBattle};
}
module.exports={runBattle};
