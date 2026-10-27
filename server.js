
const http=require('http'),fs=require('fs'),path=require('path');
const html=fs.readFileSync(path.join(__dirname,'index.html'));
const lobbyHtml=fs.readFileSync(path.join(__dirname,'lobby.html'));
const crypto=require('crypto');
const rooms=new Map(),PORT=process.env.PORT||3000;
// Shared public lobby: bounded in-memory chat, no account required.
const lobbyChat=[];let lobbyChatSeq=0;const chatRate=new Map();
function lobbyRoomList(){return [...rooms].filter(([,r])=>!r.stopped).map(([code,r])=>({code,started:!!r.started,mode:r.mode,players:SIDES.filter(s=>r.slots[s].kind==='human').length,open:SIDES.filter(s=>r.slots[s].kind==='open').length})).sort((a,b)=>Number(a.started)-Number(b.started)||b.players-a.players).slice(0,60)}

const {runBattle}=require('./battle_engine');
const TREASURE=require('./treasure_engine');
const ROTK_ECONOMY=require('./economy_engine');
function reply(res,status,obj){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(obj))}
function read(req){return new Promise((ok,no)=>{let s='';req.on('data',d=>{s+=d;if(s.length>3000000){req.destroy();no(Error('Too large'))}});req.on('end',()=>{try{ok(JSON.parse(s||'{}'))}catch(e){no(e)}})})}
function room(code){return rooms.get(code)}
// Victory is determined by territorial ownership, never by the elimination of one participant.
function syncVictory(state){if(state&&Array.isArray(state.cities))state.over=new Set(state.cities.map(c=>c.owner)).size===1;}

function token(){return crypto.randomBytes(18).toString('hex')}
function lobbyView(r,code){return {ok:true,code,started:!!r.started,stopped:!!r.stopped,version:r.version,mode:r.mode,accumulated:!!r.accumulated,slots:Object.fromEntries(SIDES.map(s=>[s,{kind:r.slots[s].kind,name:r.slots[s].name||null}])),controllers:r.controllers}}
function authorize(r,side,t){return !!r&&!!r.started&&SIDES.includes(side)&&r.slots[side].kind==='human'&&r.slots[side].token===t}
function requirePlayer(r,side,t){if(!authorize(r,side,t))throw Error('Unauthorized faction: join the lobby first')}
function createRoom(mode,name,accumulated=true){let r={accumulated,bank:{wei:mode,shu:mode,wu:mode},sideDeadline:{},displayDeadline:{},state:null,version:0,phase:1,mode,deadline:null,ready:{wei:false,shu:false,wu:false},pendingTurn:false,stopped:false,log:[],initialized:false,started:false,hostToken:token(),slots:Object.fromEntries(SIDES.map(s=>[s,{kind:'open',name:null,token:null}])),controllers:{wei:'open',shu:'open',wu:'open'}};return r}
function adjacent(id){return EDGES.filter(e=>e.includes(id)).map(e=>e[0]===id?e[1]:e[0])}
function moveWanderers(st){if(!st.wandering)return;for(const [name,id] of Object.entries(st.wandering)){const next=adjacent(Number(id));if(next.length&&Math.random()<.7)st.wandering[name]=next[Math.floor(Math.random()*next.length)]}st.discovered={};st.offerPrices={}}

// Server-authoritative turn boundary. The old client-only pendingTurn could deadlock
// when the Shu browser was absent; transition now happens synchronously on API requests.
function startNextTurn(r){
 if(r.stopped||!r.state||r.state.over)return;
 const st=r.state;
 activeTreasureState=st;TREASURE.ensure(st);
 syncVictory(st);if(st.over)return;
 st.turn=(Number(st.turn)||1)+1;
 st.searchCount={};st.heroAP={};st.stationCooldown??={};for(const n of Object.keys(st.stationCooldown))if(st.stationCooldown[n]>0)st.stationCooldown[n]--;st.moveCD??={};for(const n of Object.keys(st.moveCD))if(st.moveCD[n]>0)st.moveCD[n]--;moveWanderers(st);st.heroAP={};for(const [n,v] of Object.entries(st.moveCD||{}))st.moveCD[n]=Math.max(0,v-1);for(const [id,effects] of Object.entries(st.spyEffects||{})){for(const [key,entry] of Object.entries(effects)){if(entry.until<st.turn)delete effects[key]}}
 const ctx={
  normalize(c){
   if(!Array.isArray(c.cohorts)||!c.cohorts.length)return;
   const oldTotal=c.cohorts.reduce((n,x)=>n+(Number(x.n)||0),0);
   const target=Math.max(0,Math.round(c.troops));
   if(oldTotal===target)return;
   if(target===0){c.cohorts=[];return}
   if(oldTotal<=0){c.cohorts=[{lv:1,n:target,hp:target*100}];return}
   let assigned=0;
   c.cohorts.forEach((co,i)=>{const oldN=Number(co.n)||0;const n=i===c.cohorts.length-1?target-assigned:Math.min(target-assigned,Math.round(oldN*target/oldTotal));co.n=n;co.hp=(Number(co.hp)||oldN*100)*(oldN? n/oldN:0);assigned+=n});
   c.cohorts=c.cohorts.filter(x=>x.n>0);
  },
  stat:officerStat,
  domesticMultiplier(c,k){let bonus=1;for(const n of c.officers||[]){if(!['S','S+','A'].includes(tier(n)))continue;const v=OFFICER_DATA[n]||[55,55,55,55];if(k===2&&v[2]>=85)bonus+=.1;if(k===3&&v[3]>=85)bonus+=.1;if(k===2&&DOMESTIC_PASSIVES[n]==='trade')bonus+=.05;if(k===3&&DOMESTIC_PASSIVES[n]==='farm')bonus+=.05}return Math.min(1.4,bonus)},
  developGain(c){return Math.round(c.commerce*actionMultiplier(c,'farm'))},
  capturedLocked(c){return c.capturedTurn===st.turn-1}
 };
 let trades=0,totalTrade=0;
 for(const c of st.cities){ensureGovernor(c);const result=ROTK_ECONOMY.apply(c,ctx);if(result.trade){trades++;totalTrade+=result.trade}c.used=false}
 if(trades)(st.logs||(st.logs=[])).unshift('Auto Trade: '+trades+' idle cities earned '+totalTrade+' Gold.');
 (st.logs||(st.logs=[])).unshift('T'+st.turn+' · Server advanced turn with officer development multipliers.');
 r.phase++;r.ready=Object.fromEntries(SIDES.map(side=>[side,r.controllers[side]==='surrendered']));r.pendingTurn=false;
 if(r.accumulated){
  const now=Date.now();r.sideDeadline={};r.displayDeadline={};
  for(const side of SIDES){r.bank[side]=Math.max(0,(r.bank[side]??0))+r.mode;if(!r.ready[side])r.sideDeadline[side]=now+r.bank[side]*1000;r.displayDeadline[side]=now+r.bank[side]*1000}
  r.deadline=Math.max(now,...Object.values(r.sideDeadline));
 }else {r.deadline=Date.now()+r.mode*1000;r.displayDeadline=Object.fromEntries(SIDES.map(side=>[side,r.deadline]));}
 r.version++;
 r.log.push({phase:r.phase,side:'system',txt:'Turn '+st.turn+' started (server)'});
}

const SIDES=['wei','shu','wu'];
function controllers(r){return r.controllers||{wei:'human',shu:'human',wu:'ai'}}
// v3.0 AI: deterministic utility planner with legal, server-authoritative actions.
// It deliberately uses no opponent hidden stances, spy intel, or resource grants.
function autoAI(r){
 if(!r.started||!r.state||r.state.over||r.aiBusy)return;
 r.aiBusy=true;
 try{
  for(const side of SIDES){
   if(r.controllers[side]!=='ai'||r.ready[side])continue;
   const owner=SIDES.indexOf(side),st=r.state;
   const own=()=>st.cities.filter(c=>c.owner===owner);
   const adjacentCities=c=>adjacent(c.id).map(i=>st.cities[i]);
   const enemies=c=>adjacentCities(c).filter(x=>x.owner!==owner);
   const frontline=c=>enemies(c).length>0;
   const available=c=>(c.officers||[]).filter(n=>apReady(st,n));
   const stats=n=>OFFICER_DATA[n]||[55,55,55,55];
   const heroValue=n=>{const x=stats(n);return x[0]*.48+x[1]*.42+x[2]*.08+x[3]*.02+({S:24,A:11,B:3,C:0}[tier(n)]||0)};
   const bestHeroes=c=>available(c).slice().sort((a,b)=>heroValue(b)-heroValue(a)).slice(0,3);
   const heroStrength=c=>{const names=(c.officers||[]).slice().sort((a,b)=>heroValue(b)-heroValue(a)).slice(0,3);return 1+names.reduce((sum,n)=>sum+(heroValue(n)-45)/310,0)};
   const strength=c=>Math.max(0,c.troops)*heroStrength(c)*(.52+Math.max(0,Math.min(100,c.morale||0))*.0075)*(1+Math.min(12000,c.safety||0)/50000);
   const incoming=c=>enemies(c).reduce((sum,e)=>sum+strength(e),0);
   const exposure=c=>incoming(c)/Math.max(1,strength(c));
   const foodNeed=(c,pct)=>Math.ceil(Math.floor(c.troops*pct/100)*.03)*8;
   const run=act=>{try{const message=applyAction(r,side,owner,act);r.log.push({phase:r.phase,side,txt:'AI '+message});return true}catch(e){r.log.push({phase:r.phase,side,txt:'AI skipped '+act.type+': '+e.message});return false}};
   const treasuryGold=()=>treasury(st,owner);
   // Set defensive posture for free, based on exposed troop ratios; do not reveal enemy stances.
   for(const c of own().filter(frontline)){
    const risk=exposure(c),stance=risk>1.2?'fortify':risk<.55&&c.morale<65?'counter':'hold';
    if((st.defenseTactics?.[c.id]||'fortify')!==stance)run({type:'defense-tactic',city:c.id,tactic:stance});
   }
   // Reposition officers before planning battles; preserve AP for frontline attackers.
   for(const c of own().filter(c=>!frontline(c)&&available(c).length>1)){
    const targets=adjacentCities(c).filter(t=>t.owner===owner&&frontline(t));
    targets.sort((a,b)=>exposure(b)-exposure(a));
    const t=targets[0];if(!t)continue;
    const heroes=available(c).filter(n=>['S','S+','A'].includes(tier(n))&&(st.moveCD?.[n]||0)===0).sort((a,b)=>heroValue(b)-heroValue(a)).slice(0,Math.max(0,3-(t.officers||[]).length));
    if(heroes.length)run({type:'station',city:c.id,to:t.id,heroes});
   }
   // Reinforce fronts with troop transfers. One city action per donor, no free troops.
   const donors=own().filter(c=>!c.used&&c.troops>3500).sort((a,b)=>b.troops-a.troops);
   for(const c of donors){
    const targets=adjacentCities(c).filter(t=>t.owner===owner&&frontline(t));
    targets.sort((a,b)=>(exposure(b)*2+incoming(b)/15000)-(exposure(a)*2+incoming(a)/15000));
    const t=targets[0];if(!t)continue;
    const reserve=frontline(c)?Math.max(2800,incoming(c)*.8):1800;
    if(c.troops*.5<reserve||c.troops< t.troops*.65)continue;
    run({type:'move',city:c.id,to:t.id});
   }
   // AI v4: two-ply strategic evaluation. No hidden information or free resources.
   // Candidate conquest -> enemy's most dangerous adjacent counterattack.
   const cityWorth=t=>{
    const links=adjacentCities(t),hostile=links.filter(x=>x.owner!==owner).length;
    const ownLinks=links.filter(x=>x.owner===owner).length;
    const economic=Math.min(2.5,(t.commerce+t.harvest+t.manpower)/1600);
    const officers=(t.officers||[]).reduce((v,n)=>v+heroValue(n)/250,0);
    return 2.0+economic+Math.min(1.4,officers)+Math.min(1.5,ownLinks*.42)+Math.min(.8,hostile*.2);
   };
   const twoPlyRisk=(origin,target,sent)=>{
    const reserve=Math.max(0,origin.troops-sent);
    const reservePower=reserve*heroStrength(origin)*(.52+origin.morale*.0075);
    const originEnemies=enemies(origin).filter(x=>x.id!==target.id);
    const worstOrigin=originEnemies.reduce((v,e)=>Math.max(v,strength(e)),0);
    // Occupied city is exposed to immediate enemy retaliation next turn.
    const counter=adjacentCities(target).filter(x=>x.owner!==owner&&x.id!==origin.id&&x.id!==target.id)
      .reduce((v,e)=>Math.max(v,strength(e)),0);
    const capturePower=sent*.62*heroStrength(origin);
    return Math.max(0,worstOrigin/Math.max(1,reservePower)-.7)*2.4
      +Math.max(0,counter/Math.max(1,capturePower)-.85)*1.7;
   };
   const campaignPriority=t=>{
    // Prefer cities that connect friendly territory and isolate enemy territory.
    const friends=adjacentCities(t).filter(x=>x.owner===owner).length;
    const foes=adjacentCities(t).filter(x=>x.owner===t.owner).length;
    return Math.min(1.5,friends*.42)+Math.min(1.1,foes*.26);
   };
   // Compare ALL adjacent battles by expected strategic value and risk, then re-plan after each action.
   // Hard guard against suicide attacks, and protect a reserve when the origin has multiple threats.
   const attacked=new Set();
   for(let iteration=0;iteration<st.cities.length;iteration++){
    const plans=[];
    for(const c of own().filter(c=>frontline(c)&&!c.used&&c.troops>=2300&&c.morale>=42)){
     const heroes=bestHeroes(c),heroFactor=1+heroes.reduce((v,n)=>v+(heroValue(n)-45)/310,0);
     for(const t of enemies(c)){
      if(attacked.has(c.id+':'+t.id))continue;
      const enemySupport=adjacentCities(t).filter(x=>x.owner===t.owner&&x.id!==t.id).reduce((v,x)=>v+strength(x),0);
      const originThreat=enemies(c).filter(x=>x.id!==t.id).reduce((v,x)=>v+strength(x),0);
      for(const pct of [65,80,90]){
       const sent=Math.floor(c.troops*pct/100),food=foodNeed(c,pct);
       if(sent<1500||c.food<food||c.troops-sent<Math.min(1500,originThreat*.22))continue;
       const attack=sent*heroFactor*(.52+Math.min(100,c.morale)*.0075);
       const defense=strength(t);
       const ratio=attack/Math.max(1,defense);
       if(ratio<1.18)continue;
       const value=cityWorth(t)+campaignPriority(t);
       const safety=Math.min(2.2,ratio-1.0);
       const risk=twoPlyRisk(c,t,sent);
       const attrition=Math.min(2.5,1/Math.max(.3,ratio));
       const score=value*1.15+safety*2.5-risk*1.9-attrition*.75
         -enemySupport/110000-(pct===90?.2:0);
       plans.push({c,t,pct,food,heroes,score,ratio});
      }
     }
    }
    plans.sort((a,b)=>b.score-a.score);
    const p=plans[0];if(!p||p.score<2.9)break;
    attacked.add(p.c.id+':'+p.t.id);
    if(!run({type:'attack',city:p.c.id,to:p.t.id,percent:p.pct,food:p.food,heroes:p.heroes,tactic:p.ratio>1.8?'assault':'siege'}))continue;
    if(st.over)break;
   }
   // Development utility: choose the most urgent LEGAL city action, not a fixed if/else ladder.
   for(const c of own().filter(c=>!c.used)){
    if(!available(c).length)continue;
    const risk=exposure(c),border=frontline(c),harvestReady=(st.harvestCooldown?.[c.id]||0)<=st.turn;
    const choices=[];
    const add=(type,score,ok=true)=>{if(ok)choices.push({type,score})};
    const foodTurns=c.food/Math.max(1,c.troops*.08);
    add('food',foodTurns<2?12:foodTurns<4?8:foodTurns<8?4:0,harvestReady);
    add('recruit',border?(risk>.75?12:8):c.troops<4500?7:3,c.gold>=130&&c.pool>=250&&c.troops<(border?24000:13000));
    add('train',border?(c.morale<50?13:c.morale<70?10:c.morale<85?5:1):c.morale<60?7:1,c.gold>=90);
    add('fort',border&&risk>.9?7:1,c.gold>=100&&c.safety<15000);
    add('farm',c.gold<300?9:c.gold<800?5:2);
    choices.sort((a,b)=>b.score-a.score);
    if(choices.length)run({type:choices[0].type,city:c.id});
   }
   // Spend surplus treasury on officer acquisition; never inspect undiscovered wandering officers.
   if(treasuryGold()>1100){
    for(const c of own().slice().sort((a,b)=>b.gold-a.gold)){
     const found=(st.discovered?.[c.id]||[]).slice().sort((a,b)=>heroValue(b)-heroValue(a));
     for(const name of found.slice(0,2))if(treasuryGold()>550&&available(c).length)run({type:'hire',city:c.id,name});
    }
    // Searches use genuine AP, gold, RNG and existing search limits.
    for(const c of own().filter(c=>available(c).length&&treasuryGold()>1500).slice(0,2)){
     if((st.searchCount?.[c.id]||0)<1)run({type:'search',city:c.id});
    }
   }
   stopFactionClock(r,side);
   r.ready[side]=true;r.log.push({phase:r.phase,side,txt:'AI v4 two-ply planning complete'});
  }
 }finally{r.aiBusy=false}
 if(SIDES.every(side=>r.ready[side]))startNextTurn(r);
}
function stopFactionClock(r,side,now=Date.now()){
 if(r.ready[side])return;
 if(r.accumulated){
  const deadline=r.sideDeadline?.[side];
  // Never grant a full-turn carry when a faction has no running deadline.
  r.bank[side]=Number.isFinite(deadline)?Math.max(0,(deadline-now)/1000):0;
  if(r.sideDeadline)delete r.sideDeadline[side];
 }
}
function finishSide(r,side){
 stopFactionClock(r,side);
 r.ready[side]=true;
 const phaseBeforeAI=r.phase;
 autoAI(r);
 // autoAI may already have advanced the turn. Never advance the same turn twice.
 if(r.phase===phaseBeforeAI&&SIDES.every(s=>r.ready[s]))startNextTurn(r)}

function advance(r){
 if(r.stopped||!r.state||!r.started)return;
 const now=Date.now();
 if(r.accumulated){
  for(const [side,deadline] of Object.entries(r.sideDeadline||{})){
   if(!r.ready[side]&&now>=deadline){r.bank[side]=0;r.ready[side]=true;delete r.sideDeadline[side];r.log.push({phase:r.phase,side,txt:'Time expired — forced End Turn'})}
  }
 }else if(r.deadline&&now>=r.deadline){
  for(const side of SIDES)if(!r.ready[side]){r.ready[side]=true;r.log.push({phase:r.phase,side,txt:'Time expired — forced End Turn'})}
 }
 if(SIDES.every(side=>r.ready[side])){startNextTurn(r);return}
 // AI uses the same deadline and bank as humans, but executes its moves automatically.
 if(SIDES.some(side=>r.controllers[side]==='ai'&&!r.ready[side]))autoAI(r);
}
setInterval(()=>{for(const r of rooms.values())advance(r)},500).unref();
function view(r){if(r.state)TREASURE.ensure(r.state);if(r.state)syncVictory(r.state);advance(r);return {stopped:!!r.stopped,version:r.version,phase:r.phase,deadline:r.deadline,sideDeadline:r.sideDeadline,displayDeadline:r.displayDeadline,bank:r.bank,accumulated:!!r.accumulated,mode:r.mode,ready:r.ready,pendingTurn:r.pendingTurn,state:r.state,log:r.log.slice(-25)}}
// Extracted from the bundled classic client for parity of officer stats and adjacency.
const OFFICER_DATA={
'Liu Bei':[84,73,78,82],'Guan Yu':[95,97,76,54],'Zhang Fei':[89,98,35,25],'Zhao Yun':[94,96,78,65],'Zhuge Liang':[96,38,100,98],'Ma Chao':[88,97,43,27],'Huang Zhong':[86,93,62,43],'Pang Tong':[84,40,97,82],
'Cao Cao':[96,72,92,95],'Xiahou Dun':[88,90,61,54],'Zhang Liao':[94,92,78,62],'Sima Yi':[96,63,99,92],'Xu Huang':[90,89,70,50],'Guo Jia':[78,22,98,90],
'Sun Quan':[82,65,82,91],'Lu Meng':[92,81,91,80],'Zhou Yu':[96,72,96,85],'Lu Xun':[94,69,96,87],'Gan Ning':[82,95,55,32],'Taishi Ci':[88,94,66,44],
'Wei Yan':[88,91,55,41],'Jiang Wei':[92,89,93,72],'Fa Zheng':[79,42,94,86],'Xu Shu':[82,48,94,88],'Liao Hua':[75,74,59,53],'Wang Ping':[85,78,79,64],'Guan Ping':[82,85,58,50],'Zhang Bao':[80,88,42,38],
'Xiahou Yuan':[88,91,60,48],'Dian Wei':[76,98,39,30],'Xu Chu':[78,97,37,28],'Cao Ren':[91,84,70,65],'Yu Jin':[86,78,71,61],'Zhang He':[92,88,80,67],'Jia Xu':[86,48,98,92],'Xun Yu':[85,18,97,99],
'Sun Ce':[93,94,74,76],'Sun Jian':[92,91,75,76],'Huang Gai':[82,83,65,61],'Cheng Pu':[85,79,74,69],'Zhou Tai':[82,93,48,41],'Ding Feng':[85,86,70,55],'Lu Su':[84,41,92,95],'Zhuge Jin':[78,37,88,93],'Lü Bu':[92,100,35,24]};
const COMMONS=['Cao Bao','Han Xuan','Yang Song','Liu Xian','Fu Shiren','Mi Fang','Han Hao','Mi Zhu','Cao Hong','Zhu Huan','Zhang Ren','Yan Yan','Liu Zhang','Liu Biao','Liu Qi','Huang Zu','Cai Mao','Zhang Yun','Chen Deng','Chen Gui','Tao Qian','Kong Rong','Kong Zhou','Han Fu','Liu Dai','Wang Lang','Yan Baihu','Xu Gong','Zhang Lu','Yang Ren','Yang Ang','Gao Shun','Hou Cheng','Song Xian','Wei Xu','Chen Gong','Li Jue','Guo Si','Fan Chou','Zhang Ji','Ji Ling','Lei Bo'];
for(let i=1;i<=42;i++){const n=COMMONS[i-1];OFFICER_DATA[n]=[38+(i*13)%25,39+(i*17)%24,37+(i*19)%27,40+(i*11)%23]}
Object.assign(OFFICER_DATA,{"Xun You":[85,25,94,92],"Zhuge Dan":[86,73,83,70],"Deng Ai":[93,85,92,80],"Zhong Hui":[85,62,94,79],"Wen Yang":[83,96,67,49],"Ma Dai":[78,84,57,54],"Guan Xing":[80,84,51,48],"Zhang Yi":[81,75,73,67],"Zhang Ni":[82,79,66,62],"Wu Yi":[76,73,64,64],"Fei Yi":[73,34,87,94],"Dong Yun":[68,28,81,93],"Jiang Wan":[74,38,88,96],"Liu Feng":[75,79,49,42],"Meng Huo":[79,86,39,43],"Zhu Rong":[73,89,45,38],"Cao Pi":[77,64,83,89],"Cao Zhi":[45,29,88,66],"Cao Zhang":[82,90,47,41],"Sima Shi":[88,64,91,88],"Sima Zhao":[89,65,90,90],"Man Chong":[83,68,84,81],"Tian Yu":[79,75,71,69],"Wen Ping":[83,82,66,57],"Zang Ba":[81,81,58,55],"Xu Sheng":[82,83,69,58],"Pan Zhang":[76,80,55,44],"Jiang Qin":[80,78,65,56],"Ling Tong":[84,89,66,48],"He Qi":[80,77,73,66],"Bu Zhi":[70,36,81,87],"Zhang Zhao":[66,23,87,97],"Zhang Hong":[65,24,85,94],"Kan Ze":[68,28,85,88],"Lu Fan":[71,42,82,87],"Liu Du":[47,42,48,52],"Zhao Fan":[49,41,52,57],"Liu Yan":[62,47,62,72],"Gongsun Zan":[74,81,53,48],"Pang De":[85,94,53,40],"Han Dang":[80,78,64,58],"Li Dian":[78,75,73,69],"Yue Jin":[84,84,60,51]});
// Fixed named-officer stats must override the generic COMMONS generator.
Object.assign(OFFICER_DATA,{"Zhang Ren":[86,88,76,52],"Gao Shun":[91,90,68,45],"Yan Yan":[82,86,69,52],"Chen Gong":[75,54,94,81],"Cao Zhen":[88,76,79,72],"Guo Huai":[88,75,84,73],"Chen Qun":[45,22,91,96],"Cheng Yu":[70,38,94,88],"Du Yu":[89,62,91,88],"Ma Liang":[52,28,88,93],"Jian Yong":[36,25,76,85],"Zhu Ran":[90,78,79,66],"Lu Kang":[94,78,92,87],"Quan Cong":[82,79,73,72],"Tian Feng":[45,24,95,84],"Ju Shou":[71,34,94,88]});
const HERO_TIERS={"Guan Yu":"S","Zhang Fei":"S","Zhao Yun":"S","Ma Chao":"S","Huang Zhong":"S","Zhuge Liang":"S+","Cao Cao":"S+","Sima Yi":"S+","Zhou Yu":"S+","Lu Xun":"S","Zhang Liao":"S","Lü Bu":"S","Pang Tong":"S","Guo Jia":"S","Jia Xu":"S","Xun Yu":"S","Sun Ce":"S","Sun Jian":"S","Jiang Wei":"S","Zhang He":"S","Liu Bei":"S","Sun Quan":"S","Xiahou Dun":"A","Xiahou Yuan":"A","Xu Huang":"A","Dian Wei":"A","Xu Chu":"A","Cao Ren":"A","Gan Ning":"A","Taishi Ci":"A","Wei Yan":"A","Pang De":"A","Lu Meng":"A","Lu Su":"A","Xu Shu":"A","Fa Zheng":"A","Yu Jin":"A","Gao Shun":"A","Chen Gong":"A","Zhang Ren":"A","Yan Yan":"A","Zhou Tai":"A","Zhuge Jin":"A","Huang Gai":"A","Cheng Pu":"A","Wang Ping":"A","Guan Ping":"A","Zhang Bao":"A","Ding Feng":"A","Xun You":"S","Zhuge Dan":"A","Deng Ai":"A","Zhong Hui":"A","Wen Yang":"A","Liao Hua":"B","Cao Hong":"B","Zhu Huan":"B","Li Dian":"B","Yue Jin":"B","Han Dang":"B","Ma Dai":"B","Guan Xing":"B","Zhang Yi":"B","Zhang Ni":"B","Wu Yi":"B","Fei Yi":"A","Dong Yun":"B","Jiang Wan":"A","Liu Feng":"B","Meng Huo":"B","Zhu Rong":"B","Cao Pi":"B","Cao Zhi":"B","Cao Zhang":"B","Sima Shi":"A","Sima Zhao":"A","Man Chong":"B","Tian Yu":"B","Wen Ping":"B","Zang Ba":"B","Xu Sheng":"B","Pan Zhang":"B","Jiang Qin":"B","Ling Tong":"B","He Qi":"B","Bu Zhi":"B","Zhang Zhao":"A","Zhang Hong":"B","Kan Ze":"B","Lu Fan":"B","Cao Bao":"C","Han Xuan":"C","Yang Song":"C","Liu Xian":"C","Fu Shiren":"C","Mi Fang":"C","Han Hao":"C","Mi Zhu":"C","Liu Zhang":"C","Liu Biao":"C","Liu Qi":"C","Huang Zu":"C","Cai Mao":"C","Zhang Yun":"C","Chen Deng":"C","Chen Gui":"C","Tao Qian":"C","Kong Rong":"C","Kong Zhou":"C","Han Fu":"C","Liu Dai":"C","Wang Lang":"C","Yan Baihu":"C","Xu Gong":"C","Zhang Lu":"C","Yang Ren":"C","Yang Ang":"C","Hou Cheng":"C","Song Xian":"C","Wei Xu":"C","Li Jue":"C","Guo Si":"C","Fan Chou":"C","Zhang Ji":"C","Ji Ling":"C","Lei Bo":"C","Liu Du":"C","Zhao Fan":"C","Liu Yan":"C","Gongsun Zan":"C","Cao Zhen":"B","Guo Huai":"B","Chen Qun":"B","Cheng Yu":"A","Du Yu":"A","Ma Liang":"B","Jian Yong":"B","Zhu Ran":"B","Lu Kang":"S","Quan Cong":"B","Tian Feng":"B","Ju Shou":"A"};
const EDGES=[[0,1],[0,4],[1,2],[1,3],[2,3],[3,4],[3,7],[3,9],[4,5],[4,6],[4,7],[5,6],[6,7],[7,10],[7,9],[8,9],[8,10],[8,11],[9,10],[10,11],[12,0],[12,4],[13,2],[13,9],[14,10],[14,11],[14,7]];
const DOMESTIC_PASSIVES={'Sima Zhao':'trade','Sima Shi':'trade','Jiang Wan':'farm','Fei Yi':'farm','Zhang Zhao':'trade'};
function domesticBonuses(c){let trade=1,farm=1,learning=1;for(const name of c.officers||[]){const st=OFFICER_DATA[name]||[55,55,55,55];if(!['S','A'].includes(HERO_TIERS[name]))continue;if(st[2]>=85)trade+=.10;if(st[3]>=85)farm+=.10;if(DOMESTIC_PASSIVES[name]==='trade')trade+=.05;if(DOMESTIC_PASSIVES[name]==='farm')farm+=.05;if(st[2]>=90&&st[3]>=80)learning+=.10;}return {trade:Math.min(1.4,trade),farm:Math.min(1.4,farm),learning:Math.min(1.4,learning)}}
// v2.6: governor contributes 150% but is EXCLUDED from the officer ranking.
let activeTreasureState=null;
function rankedStat(c,weights){
 const names=(c.officers||[]);
 const gov=names.includes(c.governor)?c.governor:names[0];
 const score=name=>weights.reduce((v,w,i)=>v+w*TREASURE.stats(activeTreasureState||{cities:[]},name,OFFICER_DATA[name]||[55,55,55,55])[i],0);
 const regular=names.filter(n=>n!==gov).sort((a,b)=>score(b)-score(a));
 return regular.reduce((v,n,i)=>v+score(n)*Math.max(0,1-i*.1),0)+(gov?1.5*score(gov):0);
}
function officerStat(c,k){return rankedStat(c,[0,1,2,3].map(i=>i===k?1:0))}
function statFor(c,type){return rankedStat(c,({recruit:[1,0,0,0],food:[0,0,0,1],farm:[0,0,.4,.6],train:[.6,.4,0,0],fort:[0,.6,0,.4],search:[0,0,.6,.4],hire:[0,0,.6,.4],commerce:[0,0,.4,.6],agriculture:[0,0,0,1],manpower:[.4,0,0,.6]})[type]||[0,0,0,0])}
function multiplier(score){return 1+2*Math.pow(score,2.0897)/(Math.pow(score,2.0897)+Math.pow(600,2.0897))}
function actionMultiplier(c,type){return multiplier(statFor(c,type))}
function priceFor(st,name,id){const key=name+'@'+id;if(st.offerPrices[key]==null){const stats=OFFICER_DATA[name]||[55,55,55,55];st.offerPrices[key]=Math.round(({C:300,B:600,A:1200,S:2100}[tier(name)]+3*stats.reduce((a,b)=>a+b,0))*(.4+Math.random()*1.2))}return st.offerPrices[key]}
function costDiscount(c,base){return Math.max(1,Math.round(base/actionMultiplier(c,'hire')))}
function ensureGovernor(c){if(!(c.officers||[]).includes(c.governor))c.governor=(c.officers||[])[0]||null}
function treasury(st,owner){return st.cities.filter(c=>c.owner===owner).reduce((n,c)=>n+c.gold,0)}
function spend(st,owner,cost){if(treasury(st,owner)<cost)return false;for(const c of st.cities.filter(c=>c.owner===owner).sort((a,b)=>b.gold-a.gold)){const v=Math.min(c.gold,cost);c.gold-=v;cost-=v;if(!cost)break}return true}
function tier(n){return HERO_TIERS[n]||'C'}
function mergeCohort(c,number,level){if(number<=0)return;let x=c.cohorts.find(x=>x.lv===level);if(!x){x={lv:level,n:0,hp:0};c.cohorts.push(x)}x.n+=number;x.hp+=number*100;c.troops=c.cohorts.reduce((v,x)=>v+x.n,0)}
function moveCohorts(a,b,n){let remaining=n,original=a.troops;for(const x of [...a.cohorts]){let take=Math.min(x.n,Math.floor(n*x.n/original));if(take){let hp=x.hp*take/x.n;x.n-=take;x.hp-=hp;let dst=b.cohorts.find(z=>z.lv===x.lv);if(dst){dst.n+=take;dst.hp+=hp}else b.cohorts.push({lv:x.lv,n:take,hp});remaining-=take}}for(const x of [...a.cohorts]){if(!remaining)break;let take=Math.min(x.n,remaining);if(take){let hp=x.hp*take/x.n;x.n-=take;x.hp-=hp;let dst=b.cohorts.find(z=>z.lv===x.lv);if(dst){dst.n+=take;dst.hp+=hp}else b.cohorts.push({lv:x.lv,n:take,hp});remaining-=take}}a.cohorts=a.cohorts.filter(x=>x.n>0);a.troops=a.cohorts.reduce((v,x)=>v+x.n,0);b.troops=b.cohorts.reduce((v,x)=>v+x.n,0)}
const SPY_ACTIONS={steal:{base:55,cost:150},poison:{base:60,cost:120},sabotage:{base:55,cost:180},desertion:{base:45,cost:220},scout:{base:70,cost:100}};
function apReady(st,n){return (st.heroAP?.[n]??1)>0}
function useAP(st,n){st.heroAP??={};st.heroAP[n]=0}
function spyPreview(st,owner,city,to,hero,operation){
 const src=st.cities[Number(city)],target=st.cities[Number(to)],op=SPY_ACTIONS[operation];
 if(!src||src.owner!==owner||!target||target.owner===owner||!adjacent(src.id).includes(target.id))throw Error('Spy requires adjacent enemy city');
 if(!op)throw Error('Invalid espionage operation');
 if(!(src.officers||[]).includes(hero))throw Error('Spy hero must be stationed at source city');
 const stats=OFFICER_DATA[hero]||[55,55,55,55];const spy=.6*stats[2]+.4*stats[3];
 const def=Math.max(0,...(target.officers||[]).map(n=>{const d=OFFICER_DATA[n]||[55,55,55,55];return .6*d[2]+.4*d[3]}));
 return {operation,hero,city:src.id,to:target.id,successRate:Math.max(5,Math.min(90,op.base+.05*(spy-def))),goldCost:op.cost,apAvailable:apReady(st,hero)};
}
function applyAction(r,side,owner,act){
 const st=r.state;TREASURE.ensure(st);activeTreasureState=st;const type=act.type,id=Number(act.city??act.from),c=st.cities[id];
 if(!Number.isInteger(id)||!c||c.owner!==owner)throw Error('Invalid or unowned city');
 const special=['search','hire','station','attack','governor','spy','defense-tactic'];
 const heroAction=['farm','food','recruit','fort','train','search','hire'].includes(type);const activeHero=heroAction?(c.officers||[]).find(n=>apReady(st,n)):null;if(heroAction&&!activeHero)throw Error('No hero AP available for '+type);
 if(!special.includes(type)&&c.used)throw Error('City already used this turn');
 let msg='',n=0;
 if(type==='farm'){n=Math.round(c.commerce*.44*actionMultiplier(c,'farm'));c.gold+=n;msg=c.name+' meningkatkan perdagangan (+'+n+' gold, INT bonus).'}
 else if(type==='food'){st.harvestCooldown??={};if((st.harvestCooldown[id]||0)>st.turn)throw Error('Harvest cooldown until turn '+st.harvestCooldown[id]);n=Math.round(c.harvest*actionMultiplier(c,'food'));c.food+=n;st.harvestCooldown[id]=st.turn+3;msg=c.name+' memanen '+n+' food (POL bonus).'}
 else if(type==='recruit'){if(c.gold<130)throw Error('Need 130 gold');n=Math.min(Math.floor(c.pool),Math.round(Math.max(1,c.manpower)*.85*actionMultiplier(c,'recruit')));if(n<1)throw Error('POOL exhausted');c.gold-=130;c.pool-=n;let level=c.training>=9000?5:c.training>=5000?4:c.training>=2500?3:c.training>=1000?2:1;mergeCohort(c,n,level);msg=c.name+' merekrut '+n+' prajurit (LDR bonus).'}
 else if(type==='fort'){if(c.gold<100)throw Error('Need 100 gold');c.gold-=100;c.safety+=Math.round(Math.max(1,c.safety)*.35*actionMultiplier(c,'fort'));msg='Fortified '+c.name}
 else if(type==='train'){if(c.gold<90)throw Error('Need 90 gold');c.gold-=90;c.morale=Math.min(100,c.morale+25);c.training+=Math.round(Math.max(1,c.trainingBase||220)*actionMultiplier(c,'train'));msg='Trained '+c.name}
 else if(type==='intel'){throw Error('Scout removed in v2.6.1');const adjacent=EDGES.filter(e=>e.includes(id)).map(e=>st.cities[e[0]===id?e[1]:e[0]]).filter(t=>t.owner!==owner);if(!adjacent.length)throw Error('No neighboring enemy');const t=adjacent.sort((a,b)=>b.troops-a.troops)[0];msg='Intel '+c.name+': '+t.name+' has '+t.troops+' troops, morale '+t.morale+', food '+t.food+'.'}
 else if(type==='move'){const dst=Number(act.to),t=st.cities[dst];if(!Number.isInteger(dst)||!t||t.owner!==owner)throw Error('Invalid friendly destination');if(!EDGES.some(e=>e.includes(id)&&e.includes(dst)))throw Error('Not adjacent');n=Math.floor(c.troops*.5);if(n<1)throw Error('No troops');moveCohorts(c,t,n);msg='Moved '+n+' troops '+c.name+' → '+t.name}
 else if(type==='search'){
  const used=st.searchCount[id]||0;if(used>=3)throw Error('Search limit 3 per city per turn');
  const cost=costDiscount(c,100);if(!spend(st,owner,cost))throw Error('Need '+cost+' treasury gold');
  st.searchCount[id]=used+1;
  const candidates=Object.entries(st.wandering||{}).filter(([name,loc])=>Number(loc)===id&&!(st.discovered[id]||[]).includes(name)&&!st.cities.some(city=>(city.officers||[]).includes(name)));
  const found=[];const bonus=.4*(1-1/actionMultiplier(c,'search'))/(1-1/3);
  const chance=Math.min(1,Math.random()*.6+bonus);
  for(const [name] of candidates)if(Math.random()<chance){(st.discovered[id]??=[]).push(name);found.push(name);priceFor(st,name,id)}
  const treasure=TREASURE.discover(st,owner);msg=c.name+' Search #'+st.searchCount[id]+' ('+cost+' gold, '+Math.round(chance*100)+'%): '+(found.length?'found '+found.join(', '):'no officers found')+(treasure?' + TREASURE '+treasure.name:'');
 }
 else if(type==='give_item'){const result=TREASURE.give_item(st,owner,act.hero,act.item);msg=result.accepted?'GIVE '+TREASURE.BY_ID[act.item].name+' → '+act.hero+(result.swapped?' (swapped '+TREASURE.BY_ID[result.swapped].name+')':''):'GIVE rejected: '+result.reason;}
 else if(type==='hire'){
  const name=act.name;if(!name||!OFFICER_DATA[name])throw Error('Unknown hero');
  const captured=st.captives?.[name]===owner;
  if(!captured&&(st.wandering[name]!==id||!(st.discovered[id]||[]).includes(name)))throw Error('Officer not discovered at this city');
  const fee=costDiscount(c,{S:200,A:120,B:60,C:25}[tier(name)]);
  const base=priceFor(st,name,id),price=Math.max(1,Math.round(base*(captured?.7:1)/actionMultiplier(c,'hire')));
  if(treasury(st,owner)<fee+price)throw Error('Not enough treasury for persuasion and hire ('+(fee+price)+')');
  spend(st,owner,fee);
  const chance=captured?Math.max(.08,{S:.15,A:.35,B:.60,C:.85}[tier(name)]):Math.max(.04,Math.min(.92,{S:.15,A:.35,B:.60,C:.85}[tier(name)]+Math.min(.12,statFor(c,'hire')/2500)));
  if(Math.random()<chance){spend(st,owner,price);c.officers.push(name);ensureGovernor(c);if(captured)delete st.captives[name];else{delete st.wandering[name];st.discovered[id]=st.discovered[id].filter(x=>x!==name)}c.officer=c.officers[0];msg=name+' hired in '+c.name+' for '+price+' gold (persuasion '+fee+')'}
  else msg=name+' rejected persuasion ('+fee+' gold)';
 }
 else if(type==='governor'){
  const name=act.name;if(!(c.officers||[]).includes(name))throw Error('Governor must be stationed in city');
  c.governor=name;msg=name+' appointed governor of '+c.name;
 }
 else if(type==='defense-tactic'){
  const tactic=act.tactic;if(!['hold','fortify','counter','taunt'].includes(tactic))throw Error('Invalid defense tactic');
  st.defenseTactics??={};st.defenseTactics[id]=tactic;msg=c.name+' defense stance: '+tactic;
 }
 else if(type==='spy'){
  const hero=act.hero||act.name,operation=act.operation||act.op;
  const preview=spyPreview(st,owner,id,act.to,hero,operation);
  if(!preview.apAvailable)throw Error('Hero has no AP');
  if(!spend(st,owner,preview.goldCost))throw Error('Insufficient Gold');
  useAP(st,hero);const target=st.cities[preview.to],success=Math.random()*100<preview.successRate;
  if(success){st.spyEffects??={};st.spyEffects[target.id]??={};
   if(operation==='steal'){const stolen=Math.min(500,Math.floor(target.gold*.1));target.gold-=stolen;c.gold+=stolen;msg=hero+' stole '+stolen+' Gold from '+target.name}
   else if(operation==='poison'){const lost=Math.floor(target.food*.15);target.food=Math.max(0,target.food-lost);msg=hero+' destroyed '+lost+' Food in '+target.name}
   else if(operation==='sabotage'){st.spyEffects[target.id].sabotage={until:st.turn+1,amount:.25};msg=hero+' sabotaged '+target.name+' defense (-25%, 2 turns)'}
   else if(operation==='desertion'){target.morale=Math.max(0,target.morale-12);msg=hero+' reduced '+target.name+' morale by 12'}
   else if(operation==='scout'){st.scoutIntel??={};st.scoutIntel[owner]??={};st.scoutIntel[owner][target.id]={stance:st.defenseTactics?.[target.id]||'fortify',turn:st.turn};msg=hero+' scouted '+target.name+' stance: '+st.scoutIntel[owner][target.id].stance}
  }else msg=hero+' failed '+operation+' against '+target.name;
  st.incidentInbox??=[];st.incidentInbox.unshift({id:'spy-'+st.turn+'-'+Date.now()+'-'+Math.random().toString(36).slice(2),owner:target.owner,city:target.name,kind:'Espionage',turn:st.turn,message:'Enemy espionage activity was detected in '+target.name+'. Review city resources and defenses.'});st.incidentInbox=st.incidentInbox.slice(0,100);
  msg+=' ('+preview.successRate.toFixed(1)+'% success, '+preview.goldCost+' Gold, 1 AP)';
 }
 else if(type==='station'){
 const dst=Number(act.to),t=st.cities[dst],names=act.heroes;
 if(!Number.isInteger(dst)||!t||t.owner!==owner||!EDGES.some(e=>e.includes(id)&&e.includes(dst)))throw Error('Station requires adjacent friendly city');
 if(!Array.isArray(names)||!names.length||new Set(names).size!==names.length)throw Error('Select officers to station');
 st.moveCD??={};
 if(names.some(n=>!(c.officers||[]).includes(n)||(st.moveCD[n]||0)>0||!apReady(st,n)))throw Error('Officer missing, out of AP or on move cooldown');
 t.officers??=[];
 for(const name of names){c.officers.splice(c.officers.indexOf(name),1);t.officers.push(name);st.moveCD[name]=2;useAP(st,name)}
 c.officer=c.officers[0]||'None';t.officer=t.officers[0]||'None';ensureGovernor(c);ensureGovernor(t);
 msg=names.join(', ')+' moved '+c.name+' → '+t.name+' (1 AP each, move cooldown 2)';
 }
 else if(type==='attack'){
 const dst=Number(act.to),t=st.cities[dst];
 if(!Number.isInteger(dst)||!t||t.owner===owner||!EDGES.some(e=>e.includes(id)&&e.includes(dst)))throw Error('Attack requires adjacent enemy city');
 const pct=act.percent==null?70:Number(act.percent),sent=Math.floor(c.troops*pct/100);
 const gold=act.gold==null?Math.floor(c.gold*.3):Number(act.gold);
 const food=act.food==null?Math.ceil(sent*.03)*8:Number(act.food);
 const heroes=act.heroes;
 if(!Array.isArray(heroes)||heroes.length<1||heroes.length>3||new Set(heroes).size!==heroes.length||heroes.some(n=>!(c.officers||[]).includes(n)||!apReady(st,n)))throw Error('Selected attacker hero has no AP');
 const result=runBattle(st,id,dst,heroes,pct,gold,food,{attacker:act.tactic||'assault',defender:st.defenseTactics?.[dst]||'fortify'});
 // Any defender who was attacked must receive the full battle report.
 const item=st.battleInbox?.[0];
 if(item&&item.data===result.report&&result.report.oldOwner!==owner)item.unread=true;

 for(const n of heroes)useAP(st,n);
 msg='Battle '+c.name+' → '+t.name+': '+(result.won?'captured':'defended')+' ('+result.report.battleLog.length+' rounds)';
 }
 else throw Error('Unsupported action: '+type);
 if(heroAction)useAP(st,activeHero);
 if(!special.includes(type))c.used=true;
 st.logs.unshift('T'+st.turn+' · '+msg);return msg;
}

http.createServer(async(req,res)=>{try{
 const u=new URL(req.url,'http://localhost'),code=String(u.searchParams.get('code')||'CAOCAO').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,12);
 if(req.method==='GET'&&/^\/SFX\/(?:DRILL|RECRUIT|PATROL|TRADE|HARVEST)\.wav$/.test(u.pathname)){
  const filename=path.basename(u.pathname),file=path.join(__dirname,'SFX',filename);
  try{
   const stat=fs.statSync(file);
   res.writeHead(200,{'Content-Type':'audio/wav','Content-Length':stat.size,'Cache-Control':'public, max-age=3600'});
   return fs.createReadStream(file).pipe(res);
  }catch(e){res.writeHead(404);return res.end('SFX not found')}
 }
 if(req.method==='GET'&&/^\/Music\/backmusic(?:[1-9]|1[0-9]|20)\.mp3$/.test(u.pathname)){
  const filename=path.basename(u.pathname),file=path.join(__dirname,'Music',filename);
  try{const stat=fs.statSync(file);if(!stat.isFile())throw Error('Not a file');
   res.writeHead(200,{'Content-Type':'audio/mpeg','Content-Length':stat.size,'Cache-Control':'public, max-age=3600'});
   return fs.createReadStream(file).pipe(res);
  }catch(e){res.writeHead(404,{'Content-Type':'text/plain'});return res.end('Music track not found: '+filename)}
 }
 if(req.method==='GET'&&u.pathname==='/assets/Music_04_Siege_at_Red_Cliffs.mp3'){res.writeHead(200,{'Content-Type':'audio/mpeg','Cache-Control':'public, max-age=86400'});return fs.createReadStream(path.join(__dirname,'Music_04_Siege_at_Red_Cliffs.mp3')).pipe(res)}
 if(req.method==='GET'&&(u.pathname==='/'||u.pathname==='/lobby')){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});return res.end(lobbyHtml)}
 if(req.method==='GET'&&u.pathname==='/treasure_engine.js'){res.writeHead(200,{'Content-Type':'application/javascript','Cache-Control':'no-store'});return fs.createReadStream(path.join(__dirname,'treasure_engine.js')).pipe(res)}
 if(req.method==='GET'&&u.pathname==='/economy_engine.js'){res.writeHead(200,{'Content-Type':'application/javascript','Cache-Control':'no-store'});return fs.createReadStream(path.join(__dirname,'economy_engine.js')).pipe(res)}
 if(req.method==='GET'&&u.pathname==='/classic'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});return res.end(html)}
 if(req.method==='GET'&&u.pathname==='/api/lobby/community'){
  const since=Math.max(0,Number(u.searchParams.get('since'))||0);
  return reply(res,200,{ok:true,messages:lobbyChat.filter(m=>m.id>since),rooms:lobbyRoomList()});
 }
 if(req.method==='POST'&&u.pathname==='/api/lobby/chat'){
  const b=await read(req),name=String(b.name||'Guest').trim().slice(0,24)||'Guest',message=String(b.message||'').trim().slice(0,280);
  if(!message)return reply(res,400,{error:'Message is empty'});
  const ip=String(req.headers['x-forwarded-for']||req.socket.remoteAddress||'').split(',')[0].trim();
  const now=Date.now(),last=chatRate.get(ip)||0;
  if(now-last<850)return reply(res,429,{error:'Wait a moment before sending again'});
  chatRate.set(ip,now);if(chatRate.size>3000)for(const [k,v] of chatRate)if(now-v>60000)chatRate.delete(k);
  const invite=String(b.invite||'').toUpperCase().trim();
  if(invite&&(!/^[A-Z0-9_-]{1,12}$/.test(invite)||!rooms.has(invite)))return reply(res,400,{error:'Invalid room invite'});
  const entry={id:++lobbyChatSeq,name,message,invite:invite||null,time:now};
  lobbyChat.push(entry);if(lobbyChat.length>120)lobbyChat.shift();
  return reply(res,200,{ok:true,entry});
 }
 if(req.method==='POST'&&u.pathname==='/api/lobby/create'){
  if(room(code))return reply(res,409,{error:'Room name is being used. Please choose another room name.'});
  const b=await read(req),mode=[60,120,180,240,300,600].includes(+b.mode)?+b.mode:300,r=createRoom(mode,code,b.accumulated!==false);
  rooms.set(code,r);return reply(res,200,{...lobbyView(r,code),hostToken:r.hostToken});
 }
 if(req.method==='GET'&&u.pathname==='/api/lobby/state'){
  const r=room(code);return r?reply(res,200,lobbyView(r,code)):reply(res,404,{error:'Room not found'});
 }
 if(req.method==='POST'&&u.pathname==='/api/lobby/claim'){
  const r=room(code),b=await read(req);if(!r)return reply(res,404,{error:'Room not found'});
  if(r.started)return reply(res,409,{error:'Game already started'});
  if(!SIDES.includes(b.side))return reply(res,400,{error:'Invalid faction'});
  const slot=r.slots[b.side];if(slot.kind!=='open')return reply(res,409,{error:'Faction not open'});
  const claimed=SIDES.find(s=>r.slots[s].token===b.playerToken&&b.playerToken);
  // Allow an existing player to switch factions atomically while the target is open.
  // Keep the same player token, so ownership remains valid across the switch.
  const nextToken=claimed?b.playerToken:token();
  if(claimed&&claimed!==b.side)r.slots[claimed]={kind:'open',name:null,token:null};
  slot.kind='human';slot.token=nextToken;slot.name=String(b.name||'Player').trim().slice(0,24)||'Player';r.version++;
  return reply(res,200,{...lobbyView(r,code),playerToken:slot.token,side:b.side});
 }
 if(req.method==='POST'&&u.pathname==='/api/lobby/exit'){
  const r=room(code),b=await read(req);if(!r)return reply(res,404,{error:'Room not found'});
  if(r.started){
   const own=SIDES.find(side=>r.slots[side].kind==='human'&&r.slots[side].token&&r.slots[side].token===b.playerToken);
   if(!own)return reply(res,403,{error:'Not a member of this game'});
   const surrender=b.surrender===true,leavingName=r.slots[own].name||own.toUpperCase();
   r.slots[own]={kind:surrender?'surrendered':'ai',name:null,token:null};
   r.controllers[own]=surrender?'surrendered':'ai';
   r.ready[own]=surrender;
   if(b.hostToken&&b.hostToken===r.hostToken)r.hostToken=token();
   r.version++;
   const remaining=SIDES.filter(side=>r.slots[side].kind==='human');
   const activeAI=SIDES.filter(side=>r.controllers[side]==='ai');
   const post=(message)=>{lobbyChat.push({id:++lobbyChatSeq,name:'SYSTEM',message,invite:null,time:Date.now()});if(lobbyChat.length>120)lobbyChat.shift()};
   const notice='Room '+code+': '+leavingName+' ('+own.toUpperCase()+') '+(surrender?'has surrendered!':'has exited; AI has taken control.');
   post(notice);r.log.push({phase:r.phase,side:'system',txt:notice});
   if(surrender&&remaining.length===1&&activeAI.length===0){
    const victor=remaining[0],winner=r.slots[victor].name||victor.toUpperCase();
    r.stopped=true;if(r.state)r.state.over=true;
    const victory='Room '+code+': '+winner+' ('+victor.toUpperCase()+') has unified the empire! Victory by surrender.';
    post(victory);r.log.push({phase:r.phase,side:'system',txt:victory});
   }else if(surrender&&remaining.length===0&&activeAI.length===0){
    r.stopped=true;if(r.state)r.state.over=true;post('Room '+code+': All commanders surrendered. Campaign ended.');
   }else if(!r.stopped&&r.state){
    // A surrendered faction must never hold up the turn clock.
    autoAI(r);
   }
   return reply(res,200,{ok:true,closed:false,surrender,gameEnded:!!r.stopped});
  }
  const isHost=!!b.hostToken&&b.hostToken===r.hostToken;
  const own=SIDES.find(s=>r.slots[s].kind==='human'&&r.slots[s].token&&r.slots[s].token===b.playerToken);
  if(!isHost&&!own)return reply(res,403,{error:'Not a member of this room'});
  if(own){r.slots[own]={kind:'open',name:null,token:null};r.version++}
  if(isHost){const otherHumans=SIDES.some(s=>r.slots[s].kind==='human');if(!otherHumans){rooms.delete(code);return reply(res,200,{ok:true,closed:true})}
    // A departing host relinquishes host controls. Remaining players keep their slots.
    r.hostToken=token();r.version++;
  }
  return reply(res,200,{ok:true,closed:false});
 }
 if(req.method==='POST'&&u.pathname==='/api/lobby/slot'){
  const r=room(code),b=await read(req);if(!r)return reply(res,404,{error:'Room not found'});
  if(r.started||b.hostToken!==r.hostToken)return reply(res,403,{error:'Host only, before start'});
  if(!SIDES.includes(b.side)||!['ai','open'].includes(b.kind))return reply(res,400,{error:'Invalid slot change'});
  if(r.slots[b.side].kind==='human')return reply(res,409,{error:'Cannot overwrite joined human'});
  r.slots[b.side]={kind:b.kind,name:null,token:null};r.version++;return reply(res,200,lobbyView(r,code));
 }
 if(req.method==='POST'&&u.pathname==='/api/lobby/start'){
  const r=room(code),b=await read(req);if(!r)return reply(res,404,{error:'Room not found'});
  if(b.hostToken!==r.hostToken)return reply(res,403,{error:'Host only'});
  if(r.started)return reply(res,409,{error:'Already started'});
  if(SIDES.some(s=>r.slots[s].kind==='open'))return reply(res,409,{error:'Fill all Open slots before starting'});
  if(!SIDES.some(s=>r.slots[s].kind==='human'))return reply(res,409,{error:'At least one human required'});
  r.started=true;r.controllers=Object.fromEntries(SIDES.map(s=>[s,r.slots[s].kind]));r.version++;
  return reply(res,200,lobbyView(r,code));
 }
 if(req.method==='GET'&&u.pathname==='/api/rooms'){return reply(res,200,{ok:true,rooms:[...rooms].map(([code,r])=>({code,phase:r.phase,mode:r.mode,version:r.version,stopped:!!r.stopped,deadline:r.deadline,hasState:!!r.state}))})}
 if((req.method==='GET'||req.method==='POST')&&u.pathname==='/api/stop'){let r=room(code);if(!r)return reply(res,404,{error:'Room not found'});r.stopped=true;r.version++;return reply(res,200,{ok:true,code,...view(r)})}
 if((req.method==='GET'||req.method==='POST')&&u.pathname==='/api/restart'){let r=room(code);if(!r)return reply(res,404,{error:'Room not found'});const mode=Number(u.searchParams.get('mode'))||r.mode;rooms.set(code,{state:null,version:r.version+1,phase:1,mode:[60,120,180,240,300,600].includes(mode)?mode:300,deadline:null,initialized:false,ready:{wei:false,shu:false,wu:false},pendingTurn:false,stopped:false,log:[],controllers:r.controllers});return reply(res,200,{ok:true,code,...view(room(code))})}
 if(req.method==='GET'&&u.pathname==='/api/turn'){
 const r=room(code),q=u.searchParams,side=q.get('side'),owner=SIDES.indexOf(side);
 if(!r||!r.state)return reply(res,404,{error:'Room not initialized'});
 requirePlayer(r,side,q.get('token'));advance(r);
 if(r.stopped||r.pendingTurn||r.ready[side])return reply(res,409,{error:'Room not accepting actions'});
 if(owner<0)return reply(res,400,{error:'Invalid side'});
 const version=Number(q.get('version'));
 if(!Number.isInteger(version)||version!==r.version)return reply(res,409,{error:'Version mismatch; get fresh state first',currentVersion:r.version});
 const raw=q.get('actions')||'';
 const items=raw?raw.split(','):[];
 if(items.length>15)return reply(res,400,{error:'Too many actions'});
 const copy={...r,state:JSON.parse(JSON.stringify(r.state)),log:[...r.log],ready:{...r.ready},bank:{...r.bank},sideDeadline:{...r.sideDeadline},displayDeadline:{...r.displayDeadline}};
 const messages=[];
 try{
 const json=q.get('batch');
 const parsed=json?JSON.parse(json):items.map(item=>{
 const m=/^(farm|food|recruit|fort|train|intel|move|search|hire|attack|station):(\d+)(?:(?::(\d+))|(?::([A-Za-z_\-]+)))?$/.exec(item);
 if(!m)throw Error('Invalid action syntax: '+item);
 return {type:m[1],city:Number(m[2]),to:m[3]==null?undefined:Number(m[3]),name:m[4]?.replaceAll('_',' ')};
 });
 if(!Array.isArray(parsed)||parsed.length>15)throw Error('Invalid batch length');
 if(r.ready[side])throw Error('Side already ended turn');
 for(const act of parsed)messages.push(applyAction(copy,side,owner,act));
 }
 catch(e){return reply(res,409,{ok:false,error:e.message,rolledBack:true,version:r.version})}
 if(q.get('end')==='1'){messages.push('End Turn '+side);finishSide(copy,side)}
 copy.version=Math.max(copy.version,r.version+1);
 copy.log.push(...messages.map(txt=>({phase:r.phase,side,txt})));
 rooms.set(code,copy);
 return reply(res,200,{ok:true,actions:messages,...view(copy)});
 }
 if(req.method==='GET'&&u.pathname==='/api/spy-preview'){
  const r=room(code),q=u.searchParams;if(!r||!r.state)return reply(res,404,{error:'Room unavailable'});
  requirePlayer(r,q.get('side'),q.get('token'));
  try{return reply(res,200,{ok:true,...spyPreview(r.state,SIDES.indexOf(q.get('side')),q.get('city'),q.get('to'),q.get('hero'),q.get('operation'))})}
  catch(e){return reply(res,400,{error:e.message})}
 }
 if(req.method==='GET'&&u.pathname==='/api/action'){let r=room(code),q=u.searchParams;if(!r)return reply(res,404,{error:'Room not found'});requirePlayer(r,q.get('side'),q.get('token'));advance(r);if(r.stopped||r.pendingTurn||!r.state)return reply(res,409,{error:'Room not active or awaiting turn transition'});let side=q.get('side'),owner=SIDES.indexOf(side);if(owner<0)return reply(res,400,{error:'Invalid side'});if(r.ready[side])return reply(res,409,{error:'Side already ended turn'});
 const v=q.get('version');if(v!==null&&Number(v)!==r.version)return reply(res,409,{error:'Version mismatch',currentVersion:r.version});
 const act={type:q.get('type'),city:q.get('city'),from:q.get('from'),to:q.get('to'),name:q.get('name'),percent:q.get('percent')==null?undefined:Number(q.get('percent')),gold:q.get('gold')==null?undefined:Number(q.get('gold')),food:q.get('food')==null?undefined:Number(q.get('food')),heroes:q.get('heroes')?.split('|'),hero:q.get('hero'),operation:q.get('operation'),tactic:q.get('tactic'),defenderTactic:q.get('defenderTactic'),item:q.get('item')};try{const copy={...r,state:JSON.parse(JSON.stringify(r.state)),log:[...r.log],ready:{...r.ready},bank:{...r.bank},sideDeadline:{...r.sideDeadline},displayDeadline:{...r.displayDeadline}};const msg=applyAction(copy,side,owner,act);syncVictory(copy.state);copy.version++;copy.log.push({phase:r.phase,side,txt:msg});rooms.set(code,copy);return reply(res,200,{ok:true,action:msg,...view(copy)})}catch(e){return reply(res,409,{error:e.message,rolledBack:true,version:r.version})}}
 if(req.method==='GET'&&u.pathname==='/api/end-turn'){let r=room(code),side=u.searchParams.get('side');if(!r||r.stopped)return reply(res,404,{error:'Active room not found'});if(!r.state)return reply(res,409,{error:'Room not initialized'});if(!SIDES.includes(side))return reply(res,400,{error:'Invalid side'});requirePlayer(r,side,u.searchParams.get('token'));advance(r);if(!r.ready[side]){r.log.push({phase:r.phase,side,txt:'End Turn'});finishSide(r,side)}return reply(res,200,{ok:true,...view(r)})}
 if(req.method==='GET'&&u.pathname==='/api/state'){let r=room(code);if(!r)return reply(res,404,{error:'Room not found'});return reply(res,200,{ok:true,...view(r)})}
 if(req.method==='POST'&&u.pathname==='/api/join'){
  const b=await read(req),r=room(code);if(!r)return reply(res,404,{error:'Create room in lobby first'});
  requirePlayer(r,b.side,b.token);return reply(res,200,{ok:true,...view(r)});
 }
 if(req.method==='POST'&&u.pathname==='/api/save'){let r=room(code),b=await read(req);if(!r||r.stopped)throw Error('Room stopped or missing');requirePlayer(r,b.side,b.token);advance(r);
 if(r.version!==b.version)return reply(res,409,{error:'State changed, reload',...view(r)});
 if(!b.state||!Array.isArray(b.state.cities)||b.state.cities.length!==15)throw Error('Invalid snapshot');
 if(r.pendingTurn)throw Error('Turn boundary: reload first');
 if(r.ready[b.side])throw Error('Side already ended turn');
 r.state=b.state;TREASURE.ensure(r.state);syncVictory(r.state);r.state.harvestCooldown??={};r.state.heroAP??={};r.state.stationCooldown??={};r.state.defenseTactics??={};r.state.spyEffects??={};if(!r.initialized){r.initialized=true;const now=Date.now();if(r.accumulated){r.sideDeadline={};r.displayDeadline={};for(const side of SIDES){r.bank[side]=r.mode;if(!r.ready[side])r.sideDeadline[side]=now+r.bank[side]*1000;r.displayDeadline[side]=now+r.bank[side]*1000}r.deadline=Math.max(now,...Object.values(r.sideDeadline));}else {r.deadline=now+r.mode*1000;r.displayDeadline=Object.fromEntries(SIDES.map(side=>[side,r.deadline]));}}r.version++;autoAI(r);syncVictory(r.state);r.log.push({phase:r.phase,side:b.side,txt:b.note||'Classic state updated'});return reply(res,200,{ok:true,...view(r)})}
 if(req.method==='POST'&&u.pathname==='/api/end'){let r=room(code),b=await read(req);if(!r||r.stopped)throw Error('Room stopped or missing');requirePlayer(r,b.side,b.token);advance(r);if(!SIDES.includes(b.side))throw Error('Bad side');if(!r.state)throw Error('Room not initialized');if(!r.ready[b.side]){r.log.push({phase:r.phase,side:b.side,txt:'End Turn'});finishSide(r,b.side);}return reply(res,200,{ok:true,...view(r)})}
 if(req.method==='POST'&&u.pathname==='/api/turn-applied'){let r=room(code),b=await read(req);if(!r||r.stopped)throw Error('Room stopped or missing');return reply(res,410,{error:'Deprecated: turn transitions are server-authoritative',...view(r)})}
 return reply(res,404,{error:'Not found'});
 }catch(e){reply(res,400,{error:e.message})}
}).listen(PORT,'0.0.0.0',()=>console.log('Classic multiplayer snapshot server on',PORT));
