
const http=require('http'),fs=require('fs'),path=require('path');
const html=fs.readFileSync(path.join(__dirname,'index.html'));
const rooms=new Map(),PORT=process.env.PORT||3000;
const {runBattle}=require('./battle_engine');
function reply(res,status,obj){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(obj))}
function read(req){return new Promise((ok,no)=>{let s='';req.on('data',d=>{s+=d;if(s.length>3000000){req.destroy();no(Error('Too large'))}});req.on('end',()=>{try{ok(JSON.parse(s||'{}'))}catch(e){no(e)}})})}
function room(code){return rooms.get(code)}
// Server-authoritative turn boundary. The old client-only pendingTurn could deadlock
// when the Shu browser was absent; transition now happens synchronously on API requests.
function startNextTurn(r){
 if(r.stopped||!r.state||r.state.over)return;
 const st=r.state;
 st.turn=(Number(st.turn)||1)+1;
 st.searchCount={};
 for(const c of st.cities){
  c.used=false;
  const n=(c.officers||[]).length;
  // Baseline development until the classic officer-stat engine is ported.
  const stat=Math.min(110,65+n*4);
  c.manpower=(c.manpower||0)+stat;
  c.pool=(c.pool||0)+c.manpower*.04;
  c.safety=(c.safety||0)+stat;
  c.commerce=(c.commerce||0)+stat;
  c.harvest=(c.harvest||0)+stat;
  c.training=(c.training||0)+stat;
  c.gold=(c.gold||0)+Math.max(1,Math.floor(c.commerce*.005));
  c.food=Math.max(0,(c.food||0)+Math.max(1,Math.floor(c.harvest*.01))-Math.ceil(c.troops*.08));
  if(c.food===0){c.troops=Math.max(300,Math.floor(c.troops*.94));c.morale=Math.max(20,(c.morale||65)-10)}
  else{c.troops=Math.max(300,Math.round(c.troops*.996));c.morale=Math.min(100,(c.morale||65)+2)}
  if(Array.isArray(c.cohorts)&&c.cohorts.length===1){
   const cohort=c.cohorts[0],oldN=cohort.n||c.troops;
   cohort.hp=(cohort.hp||oldN*100)*(c.troops/oldN);
   cohort.n=c.troops;
  }
 }
 (st.logs||(st.logs=[])).unshift('T'+st.turn+' · Server advanced turn; economy uses provisional officer bonuses.');
 r.phase++;r.ready={wei:false,shu:false};r.pendingTurn=false;
 r.deadline=Date.now()+r.mode*1000;r.version++;
 r.log.push({phase:r.phase,side:'system',txt:'Turn '+st.turn+' started (server)'});
}
function advance(r){
 if(r.stopped||!r.state)return;
 if(Date.now()>=r.deadline)startNextTurn(r);
}
setInterval(()=>{for(const r of rooms.values())advance(r)},500).unref();
function view(r){advance(r);return {stopped:!!r.stopped,version:r.version,phase:r.phase,deadline:r.deadline,mode:r.mode,ready:r.ready,pendingTurn:r.pendingTurn,state:r.state,log:r.log.slice(-25)}}
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
const HERO_TIERS={"Guan Yu":"S","Zhang Fei":"S","Zhao Yun":"S","Ma Chao":"S","Huang Zhong":"S","Zhuge Liang":"S","Cao Cao":"S","Sima Yi":"S","Zhou Yu":"S","Lu Xun":"S","Zhang Liao":"S","Lü Bu":"S","Pang Tong":"S","Guo Jia":"S","Jia Xu":"S","Xun Yu":"S","Sun Ce":"S","Sun Jian":"S","Jiang Wei":"S","Zhang He":"S","Liu Bei":"S","Sun Quan":"S","Xiahou Dun":"A","Xiahou Yuan":"A","Xu Huang":"A","Dian Wei":"A","Xu Chu":"A","Cao Ren":"A","Gan Ning":"A","Taishi Ci":"A","Wei Yan":"A","Pang De":"A","Lu Meng":"A","Lu Su":"A","Xu Shu":"A","Fa Zheng":"A","Yu Jin":"A","Gao Shun":"A","Chen Gong":"A","Zhang Ren":"A","Yan Yan":"A","Zhou Tai":"A","Zhuge Jin":"A","Huang Gai":"A","Cheng Pu":"A","Wang Ping":"A","Guan Ping":"A","Zhang Bao":"A","Ding Feng":"A","Xun You":"A","Zhuge Dan":"A","Deng Ai":"A","Zhong Hui":"A","Wen Yang":"A","Liao Hua":"B","Cao Hong":"B","Zhu Huan":"B","Li Dian":"B","Yue Jin":"B","Han Dang":"B","Ma Dai":"B","Guan Xing":"B","Zhang Yi":"B","Zhang Ni":"B","Wu Yi":"B","Fei Yi":"B","Dong Yun":"B","Jiang Wan":"B","Liu Feng":"B","Meng Huo":"B","Zhu Rong":"B","Cao Pi":"B","Cao Zhi":"B","Cao Zhang":"B","Sima Shi":"B","Sima Zhao":"B","Man Chong":"B","Tian Yu":"B","Wen Ping":"B","Zang Ba":"B","Xu Sheng":"B","Pan Zhang":"B","Jiang Qin":"B","Ling Tong":"B","He Qi":"B","Bu Zhi":"B","Zhang Zhao":"B","Zhang Hong":"B","Kan Ze":"B","Lu Fan":"B","Cao Bao":"C","Han Xuan":"C","Yang Song":"C","Liu Xian":"C","Fu Shiren":"C","Mi Fang":"C","Han Hao":"C","Mi Zhu":"C","Liu Zhang":"C","Liu Biao":"C","Liu Qi":"C","Huang Zu":"C","Cai Mao":"C","Zhang Yun":"C","Chen Deng":"C","Chen Gui":"C","Tao Qian":"C","Kong Rong":"C","Kong Zhou":"C","Han Fu":"C","Liu Dai":"C","Wang Lang":"C","Yan Baihu":"C","Xu Gong":"C","Zhang Lu":"C","Yang Ren":"C","Yang Ang":"C","Hou Cheng":"C","Song Xian":"C","Wei Xu":"C","Li Jue":"C","Guo Si":"C","Fan Chou":"C","Zhang Ji":"C","Ji Ling":"C","Lei Bo":"C","Liu Du":"C","Zhao Fan":"C","Liu Yan":"C","Gongsun Zan":"C"};
const EDGES=[[0,1],[0,4],[1,2],[1,3],[1,4],[2,3],[2,9],[3,4],[3,7],[3,9],[4,5],[4,6],[4,7],[5,6],[6,7],[7,10],[7,9],[8,9],[8,10],[8,11],[9,10],[10,11],[12,0],[12,4],[13,2],[13,9],[14,10],[14,11],[14,7]];
function officerStat(c,k){return (c.officers||[]).map(n=>(OFFICER_DATA[n]||[55,55,55,55])[k]).sort((a,b)=>b-a).reduce((sum,value,i)=>sum+value/(1+i*.1),0)}
function treasury(st,owner){return st.cities.filter(c=>c.owner===owner).reduce((n,c)=>n+c.gold,0)}
function spend(st,owner,cost){if(treasury(st,owner)<cost)return false;for(const c of st.cities.filter(c=>c.owner===owner).sort((a,b)=>b.gold-a.gold)){const v=Math.min(c.gold,cost);c.gold-=v;cost-=v;if(!cost)break}return true}
function tier(n){return HERO_TIERS[n]||'C'}
function mergeCohort(c,number,level){if(number<=0)return;let x=c.cohorts.find(x=>x.lv===level);if(!x){x={lv:level,n:0,hp:0};c.cohorts.push(x)}x.n+=number;x.hp+=number*100;c.troops=c.cohorts.reduce((v,x)=>v+x.n,0)}
function moveCohorts(a,b,n){let remaining=n,original=a.troops;for(const x of [...a.cohorts]){let take=Math.min(x.n,Math.floor(n*x.n/original));if(take){let hp=x.hp*take/x.n;x.n-=take;x.hp-=hp;let dst=b.cohorts.find(z=>z.lv===x.lv);if(dst){dst.n+=take;dst.hp+=hp}else b.cohorts.push({lv:x.lv,n:take,hp});remaining-=take}}for(const x of [...a.cohorts]){if(!remaining)break;let take=Math.min(x.n,remaining);if(take){let hp=x.hp*take/x.n;x.n-=take;x.hp-=hp;let dst=b.cohorts.find(z=>z.lv===x.lv);if(dst){dst.n+=take;dst.hp+=hp}else b.cohorts.push({lv:x.lv,n:take,hp});remaining-=take}}a.cohorts=a.cohorts.filter(x=>x.n>0);a.troops=a.cohorts.reduce((v,x)=>v+x.n,0);b.troops=b.cohorts.reduce((v,x)=>v+x.n,0)}
function applyAction(r,side,owner,act){
 const st=r.state,type=act.type,id=Number(act.city??act.from),c=st.cities[id];
 if(!Number.isInteger(id)||!c||c.owner!==owner)throw Error('Invalid or unowned city');
 const special=['search','hire','station'];
 if(!special.includes(type)&&c.used)throw Error('City already used this turn');
 let msg='',n=0;
 if(type==='farm'){n=Math.round(c.commerce*.44);c.gold+=n;msg=c.name+' meningkatkan perdagangan (+'+n+' gold, INT bonus).'}
 else if(type==='food'){n=Math.round(c.harvest);c.food+=n;msg=c.name+' memanen '+n+' food (POL bonus).'}
 else if(type==='recruit'){if(c.gold<130)throw Error('Need 130 gold');n=Math.min(Math.floor(c.pool),Math.round(450+officerStat(c,0)*9));if(n<1)throw Error('POOL exhausted');c.gold-=130;c.pool-=n;let level=c.training>=9000?5:c.training>=5000?4:c.training>=2500?3:c.training>=1000?2:1;mergeCohort(c,n,level);msg=c.name+' merekrut '+n+' prajurit (LDR bonus).'}
 else if(type==='fort'){if(c.gold<100)throw Error('Need 100 gold');c.gold-=100;c.safety+=Math.round(300+officerStat(c,1)*1.5);msg='Fortified '+c.name}
 else if(type==='train'){if(c.gold<90)throw Error('Need 90 gold');c.gold-=90;c.morale=Math.min(100,c.morale+25);c.training+=Math.round(220+(officerStat(c,0)+officerStat(c,1))*1.8);msg='Trained '+c.name}
 else if(type==='intel'){const adjacent=EDGES.filter(e=>e.includes(id)).map(e=>st.cities[e[0]===id?e[1]:e[0]]).filter(t=>t.owner!==owner);if(!adjacent.length)throw Error('No neighboring enemy');const t=adjacent.sort((a,b)=>b.troops-a.troops)[0];msg='Intel '+c.name+': '+t.name+' has '+t.troops+' troops, morale '+t.morale+', food '+t.food+'.'}
 else if(type==='move'){const dst=Number(act.to),t=st.cities[dst];if(!Number.isInteger(dst)||!t||t.owner!==owner)throw Error('Invalid friendly destination');if(!EDGES.some(e=>e.includes(id)&&e.includes(dst)))throw Error('Not adjacent');n=Math.floor(c.troops*.5);if(n<1)throw Error('No troops');moveCohorts(c,t,n);msg='Moved '+n+' troops '+c.name+' → '+t.name}
 else if(type==='search'){const used=st.searchCount[id]||0;if(used>=3)throw Error('Search limit 3 per city per turn');if(!spend(st,owner,100))throw Error('Need 100 treasury gold');st.searchCount[id]=used+1;const found=[];for(const [name,loc] of Object.entries(st.wandering||{})){if(Number(loc)!==id||(st.discovered[id]||[]).includes(name)||st.cities.some(city=>(city.officers||[]).includes(name)))continue;const chance={S:.05,A:.15,B:.35,C:.60}[tier(name)];if(Math.random()<chance){(st.discovered[id]??=[]).push(name);found.push(name);const key=name+'@'+id;if(st.offerPrices[key]==null){const stats=OFFICER_DATA[name]||[55,55,55,55];const base=Math.round((210+stats[0]*2+stats[1]*2+stats[2])*1.25);st.offerPrices[key]=Math.max(50,Math.round(base*(.5+Math.random()*2.5)))}}}msg=c.name+' Search #'+st.searchCount[id]+': '+(found.length?'found '+found.join(', '):'no officers found')}
 else if(type==='hire'){const name=act.name;if(!name||st.wandering[name]!==id||!(st.discovered[id]||[]).includes(name))throw Error('Officer not discovered at this city');const price=st.offerPrices[name+'@'+id];if(!Number.isFinite(price))throw Error('Missing hire price');const fee={S:200,A:120,B:60,C:25}[tier(name)];if(treasury(st,owner)<fee+price)throw Error('Not enough treasury for persuasion and hire');spend(st,owner,fee);const chance=Math.max(.04,Math.min(.92,{S:.15,A:.35,B:.60,C:.85}[tier(name)]+Math.min(.12,(officerStat(c,2)+officerStat(c,3))/2500)));if(Math.random()<chance){spend(st,owner,price);c.officers.push(name);c.officer=c.officers[0];delete st.wandering[name];st.discovered[id]=st.discovered[id].filter(x=>x!==name);msg=name+' hired in '+c.name+' for '+price+' gold'}else msg=name+' rejected persuasion ('+fee+' gold)'}
 else if(type==='station'){
 const dst=Number(act.to),t=st.cities[dst],names=act.heroes;
 if(!Number.isInteger(dst)||!t||t.owner!==owner||!EDGES.some(e=>e.includes(id)&&e.includes(dst)))throw Error('Station requires adjacent friendly city');
 if(!Array.isArray(names)||!names.length||new Set(names).size!==names.length)throw Error('Select officers to station');
 st.stationCooldown??={};
 if(names.some(n=>!(c.officers||[]).includes(n)||(st.stationCooldown[n]||0)>st.turn))throw Error('Officer missing or on station cooldown');
 t.officers??=[];
 for(const name of names){c.officers.splice(c.officers.indexOf(name),1);t.officers.push(name);st.stationCooldown[name]=st.turn+2}
 c.officer=c.officers[0]||'None';t.officer=t.officers[0]||'None';
 msg=names.join(', ')+' moved '+c.name+' → '+t.name+' (2-turn cooldown, free action)';
 }
 else if(type==='attack'){
 const dst=Number(act.to),t=st.cities[dst];
 if(!Number.isInteger(dst)||!t||t.owner===owner||!EDGES.some(e=>e.includes(id)&&e.includes(dst)))throw Error('Attack requires adjacent enemy city');
 const pct=act.percent==null?70:Number(act.percent),sent=Math.floor(c.troops*pct/100);
 const gold=act.gold==null?Math.floor(c.gold*.3):Number(act.gold);
 const food=act.food==null?Math.ceil(sent*.02)*8:Number(act.food);
 const heroes=act.heroes??(c.officers||[]).slice(0,3);
 const result=runBattle(st,id,dst,heroes,pct,gold,food);
 msg='Battle '+c.name+' → '+t.name+': '+(result.won?'captured':'defended')+' ('+result.report.battleLog.length+' rounds)';
 }
 else throw Error('Unsupported action: '+type);
 if(!special.includes(type))c.used=true;
 st.logs.unshift('T'+st.turn+' · '+msg);return msg;
}

http.createServer(async(req,res)=>{try{
 const u=new URL(req.url,'http://localhost'),code=String(u.searchParams.get('code')||'CAOCAO').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,12);
 if(req.method==='GET'&&u.pathname==='/assets/Music_04_Siege_at_Red_Cliffs.mp3'){res.writeHead(200,{'Content-Type':'audio/mpeg','Cache-Control':'public, max-age=86400'});return fs.createReadStream(path.join(__dirname,'Music_04_Siege_at_Red_Cliffs.mp3')).pipe(res)}
 if(req.method==='GET'&&(u.pathname==='/'||u.pathname==='/classic')){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});return res.end(html)}
 if(req.method==='GET'&&u.pathname==='/api/rooms'){return reply(res,200,{ok:true,rooms:[...rooms].map(([code,r])=>({code,phase:r.phase,mode:r.mode,version:r.version,stopped:!!r.stopped,deadline:r.deadline,hasState:!!r.state}))})}
 if((req.method==='GET'||req.method==='POST')&&u.pathname==='/api/stop'){let r=room(code);if(!r)return reply(res,404,{error:'Room not found'});r.stopped=true;r.version++;return reply(res,200,{ok:true,code,...view(r)})}
 if((req.method==='GET'||req.method==='POST')&&u.pathname==='/api/restart'){let r=room(code);if(!r)return reply(res,404,{error:'Room not found'});const mode=Number(u.searchParams.get('mode'))||r.mode;rooms.set(code,{state:null,version:r.version+1,phase:1,mode:[20,60,180,300].includes(mode)?mode:300,deadline:null,initialized:false,ready:{wei:false,shu:false},pendingTurn:false,stopped:false,log:[]});return reply(res,200,{ok:true,code,...view(room(code))})}
 if(req.method==='GET'&&u.pathname==='/api/turn'){
 const r=room(code),q=u.searchParams,side=q.get('side'),owner=side==='shu'?1:side==='wei'?0:-1;
 if(!r||!r.state)return reply(res,404,{error:'Room not initialized'});
 advance(r);
 if(r.stopped||r.pendingTurn||r.ready[side])return reply(res,409,{error:'Room not accepting actions'});
 if(owner<0)return reply(res,400,{error:'Invalid side'});
 const version=Number(q.get('version'));
 if(!Number.isInteger(version)||version!==r.version)return reply(res,409,{error:'Version mismatch; get fresh state first',currentVersion:r.version});
 const raw=q.get('actions')||'';
 const items=raw?raw.split(','):[];
 if(items.length>15)return reply(res,400,{error:'Too many actions'});
 const copy={...r,state:JSON.parse(JSON.stringify(r.state)),log:[...r.log],ready:{...r.ready}};
 const messages=[];
 try{
 const json=q.get('batch');
 const parsed=json?JSON.parse(json):items.map(item=>{
 const m=/^(farm|food|recruit|fort|train|intel|move|search|hire|attack|station):(\d+)(?:(?::(\d+))|(?::([A-Za-z_\-]+)))?$/.exec(item);
 if(!m)throw Error('Invalid action syntax: '+item);
 return {type:m[1],city:Number(m[2]),to:m[3]==null?undefined:Number(m[3]),name:m[4]?.replaceAll('_',' ')};
 });
 if(!Array.isArray(parsed)||parsed.length>15)throw Error('Invalid batch length');
 for(const act of parsed)messages.push(applyAction(copy,side,owner,act));
 }
 catch(e){return reply(res,409,{ok:false,error:e.message,rolledBack:true,version:r.version})}
 if(q.get('end')==='1'){copy.ready[side]=true;messages.push('End Turn '+side);if(copy.ready.wei&&copy.ready.shu)startNextTurn(copy)}
 copy.version=Math.max(copy.version,r.version+1);
 copy.log.push(...messages.map(txt=>({phase:r.phase,side,txt})));
 rooms.set(code,copy);
 return reply(res,200,{ok:true,actions:messages,...view(copy)});
 }
 if(req.method==='GET'&&u.pathname==='/api/action'){let r=room(code),q=u.searchParams;if(!r)return reply(res,404,{error:'Room not found'});advance(r);if(r.stopped||r.pendingTurn||!r.state)return reply(res,409,{error:'Room not active or awaiting turn transition'});let side=q.get('side'),owner=side==='shu'?1:side==='wei'?0:-1;if(owner<0)return reply(res,400,{error:'Invalid side'});if(r.ready[side])return reply(res,409,{error:'Side already ended turn'});
 const v=q.get('version');if(v!==null&&Number(v)!==r.version)return reply(res,409,{error:'Version mismatch',currentVersion:r.version});
 const act={type:q.get('type'),city:q.get('city'),from:q.get('from'),to:q.get('to'),name:q.get('name'),percent:q.get('percent')==null?undefined:Number(q.get('percent')),gold:q.get('gold')==null?undefined:Number(q.get('gold')),food:q.get('food')==null?undefined:Number(q.get('food')),heroes:q.get('heroes')?.split('|')};try{const copy={...r,state:JSON.parse(JSON.stringify(r.state)),log:[...r.log],ready:{...r.ready}};const msg=applyAction(copy,side,owner,act);copy.version++;copy.log.push({phase:r.phase,side,txt:msg});rooms.set(code,copy);return reply(res,200,{ok:true,action:msg,...view(copy)})}catch(e){return reply(res,409,{error:e.message,rolledBack:true,version:r.version})}}
 if(req.method==='GET'&&u.pathname==='/api/end-turn'){let r=room(code),side=u.searchParams.get('side');if(!r||r.stopped)return reply(res,404,{error:'Active room not found'});if(!r.state)return reply(res,409,{error:'Room not initialized'});if(!['wei','shu'].includes(side))return reply(res,400,{error:'Invalid side'});advance(r);if(!r.ready[side]){r.ready[side]=true;r.log.push({phase:r.phase,side,txt:'End Turn'});if(r.ready.wei&&r.ready.shu)startNextTurn(r)}return reply(res,200,{ok:true,...view(r)})}
 if(req.method==='GET'&&u.pathname==='/api/state'){let r=room(code);if(!r)return reply(res,404,{error:'Room not found'});return reply(res,200,{ok:true,...view(r)})}
 if(req.method==='POST'&&u.pathname==='/api/join'){let b=await read(req),r=room(code);if(!r){const mode=[20,60,180,300].includes(+b.mode)?+b.mode:300;r={state:null,version:0,phase:1,mode,deadline:null,ready:{wei:false,shu:false},pendingTurn:false,stopped:false,log:[],initialized:false};rooms.set(code,r)}return reply(res,200,{ok:true,...view(r)})}
 if(req.method==='POST'&&u.pathname==='/api/save'){let r=room(code),b=await read(req);if(!r||r.stopped)throw Error('Room stopped or missing');advance(r);
 if(r.version!==b.version)return reply(res,409,{error:'State changed, reload',...view(r)});
 if(!b.state||!Array.isArray(b.state.cities)||b.state.cities.length!==15)throw Error('Invalid snapshot');
 if(r.pendingTurn)throw Error('Turn boundary: reload first');
 if(r.ready[b.side])throw Error('Side already ended turn');
 r.state=b.state;if(!r.initialized){r.initialized=true;r.deadline=Date.now()+r.mode*1000;}r.version++;r.log.push({phase:r.phase,side:b.side,txt:b.note||'Classic state updated'});return reply(res,200,{ok:true,...view(r)})}
 if(req.method==='POST'&&u.pathname==='/api/end'){let r=room(code),b=await read(req);if(!r||r.stopped)throw Error('Room stopped or missing');advance(r);if(!['wei','shu'].includes(b.side))throw Error('Bad side');if(!r.state)throw Error('Room not initialized');r.ready[b.side]=true;r.log.push({phase:r.phase,side:b.side,txt:'End Turn'});if(r.ready.wei&&r.ready.shu)startNextTurn(r);return reply(res,200,{ok:true,...view(r)})}
 if(req.method==='POST'&&u.pathname==='/api/turn-applied'){let r=room(code),b=await read(req);if(!r||r.stopped)throw Error('Room stopped or missing');return reply(res,410,{error:'Deprecated: turn transitions are server-authoritative',...view(r)})}
 return reply(res,404,{error:'Not found'});
 }catch(e){reply(res,400,{error:e.message})}
}).listen(PORT,'0.0.0.0',()=>console.log('Classic multiplayer snapshot server on',PORT));
