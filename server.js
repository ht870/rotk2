
const http=require('http'),fs=require('fs'),path=require('path');
const html=fs.readFileSync(path.join(__dirname,'index.html'));
const rooms=new Map(),PORT=process.env.PORT||3000;
function reply(res,status,obj){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(obj))}
function read(req){return new Promise((ok,no)=>{let s='';req.on('data',d=>{s+=d;if(s.length>3000000){req.destroy();no(Error('Too large'))}});req.on('end',()=>{try{ok(JSON.parse(s||'{}'))}catch(e){no(e)}})})}
function room(code){return rooms.get(code)}
function advance(r){if(r.stopped)return;if(Date.now()>=r.deadline){r.deadline=Date.now()+r.mode*1000;r.ready={wei:false,shu:false};r.phase++;r.pendingTurn=true;r.version++}}
function view(r){advance(r);return {stopped:!!r.stopped,version:r.version,phase:r.phase,deadline:r.deadline,mode:r.mode,ready:r.ready,pendingTurn:r.pendingTurn,state:r.state,log:r.log.slice(-25)}}
function applyAction(r,side,owner,act){
 const type=act.type,id=Number(act.city??act.from),c=r.state.cities[id];if(!Number.isInteger(id)||!c||c.owner!==owner)throw Error('Invalid or unowned city');if(c.used)throw Error('City already used this turn');
 let msg='',n=0;const stat=(c,k)=>{let off=c.officers||[];return Math.min(110,65+off.length*4)}; // stat-dependent bonuses need the classic engine; only safe fixed actions exposed.
 if(type==='fort'){if(c.gold<100)throw Error('Need 100 gold');c.gold-=100;c.safety+=Math.round(300+stat(c,1)*1.5);msg='Fortified '+c.name}
 else if(type==='train'){if(c.gold<90)throw Error('Need 90 gold');c.gold-=90;c.morale=Math.min(100,c.morale+25);c.training+=Math.round(220+(stat(c,0)+stat(c,1))*1.8);msg='Trained '+c.name}
 else if(type==='move'){let dst=Number(act.to),t=r.state.cities[dst];if(!Number.isInteger(dst)||!t||t.owner!==owner)throw Error('Invalid friendly destination');const edges=[[0,1],[0,4],[0,12],[1,2],[1,3],[1,4],[2,3],[2,13],[3,7],[3,9],[4,5],[4,6],[4,12],[5,6],[6,7],[7,9],[7,10],[7,14],[8,9],[8,10],[8,11],[9,10],[10,11],[10,14],[11,14],[6,10],[3,10],[12,1],[8,14]];if(!edges.some(e=>e.includes(id)&&e.includes(dst)))throw Error('Not adjacent');n=Math.floor(c.troops*.5);if(n<1)throw Error('No troops');c.troops-=n;t.troops+=n;c.cohorts=[{lv:1,n:c.troops,hp:c.troops*100}];t.cohorts=[{lv:1,n:t.troops,hp:t.troops*100}];msg='Moved '+n+' troops '+c.name+' → '+t.name}
 else throw Error('Unsupported action: '+type+' (available: fort, train, move)');
 c.used=true;r.state.logs.unshift('T'+r.state.turn+' · '+msg);return msg;}

http.createServer(async(req,res)=>{try{
 const u=new URL(req.url,'http://localhost'),code=String(u.searchParams.get('code')||'CAOCAO').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,12);
 if(req.method==='GET'&&u.pathname==='/assets/Music_04_Siege_at_Red_Cliffs.mp3'){res.writeHead(200,{'Content-Type':'audio/mpeg','Cache-Control':'public, max-age=86400'});return fs.createReadStream(path.join(__dirname,'Music_04_Siege_at_Red_Cliffs.mp3')).pipe(res)}
 if(req.method==='GET'&&(u.pathname==='/'||u.pathname==='/classic')){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});return res.end(html)}
 if(req.method==='GET'&&u.pathname==='/api/rooms'){return reply(res,200,{ok:true,rooms:[...rooms].map(([code,r])=>({code,phase:r.phase,mode:r.mode,version:r.version,stopped:!!r.stopped,deadline:r.deadline,hasState:!!r.state}))})}
 if((req.method==='GET'||req.method==='POST')&&u.pathname==='/api/stop'){let r=room(code);if(!r)return reply(res,404,{error:'Room not found'});r.stopped=true;r.version++;return reply(res,200,{ok:true,code,...view(r)})}
 if((req.method==='GET'||req.method==='POST')&&u.pathname==='/api/restart'){let r=room(code);if(!r)return reply(res,404,{error:'Room not found'});const mode=Number(u.searchParams.get('mode'))||r.mode;rooms.set(code,{state:null,version:r.version+1,phase:1,mode:[20,60,180,300].includes(mode)?mode:300,deadline:Date.now()+([20,60,180,300].includes(mode)?mode:300)*1000,ready:{wei:false,shu:false},pendingTurn:false,stopped:false,log:[]});return reply(res,200,{ok:true,code,...view(room(code))})}
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
 try{for(const item of items){const m=/^(fort|train|move):(\d+)(?::(\d+))?$/.exec(item);if(!m)throw Error('Invalid action syntax: '+item);messages.push(applyAction(copy,side,owner,{type:m[1],city:m[2],from:m[2],to:m[3]}))}}
 catch(e){return reply(res,409,{ok:false,error:e.message,rolledBack:true,version:r.version})}
 if(q.get('end')==='1'){copy.ready[side]=true;messages.push('End Turn '+side);if(copy.ready.wei&&copy.ready.shu){copy.phase++;copy.pendingTurn=true;copy.ready={wei:false,shu:false};copy.deadline=Date.now()+copy.mode*1000}}
 copy.version=r.version+1;
 copy.log.push(...messages.map(txt=>({phase:r.phase,side,txt})));
 rooms.set(code,copy);
 return reply(res,200,{ok:true,actions:messages,...view(copy)});
 }
 if(req.method==='GET'&&u.pathname==='/api/action'){let r=room(code),q=u.searchParams;if(!r)return reply(res,404,{error:'Room not found'});advance(r);if(r.stopped||r.pendingTurn||!r.state)return reply(res,409,{error:'Room not active or awaiting turn transition'});let side=q.get('side'),owner=side==='shu'?1:side==='wei'?0:-1;if(owner<0)return reply(res,400,{error:'Invalid side'});if(r.ready[side])return reply(res,409,{error:'Side already ended turn'});
 const act={type:q.get('type'),city:q.get('city'),from:q.get('from'),to:q.get('to')};try{const msg=applyAction(r,side,owner,act);r.version++;r.log.push({phase:r.phase,side,txt:msg});return reply(res,200,{ok:true,action:msg,...view(r)})}catch(e){return reply(res,409,{error:e.message})}}
 if(req.method==='GET'&&u.pathname==='/api/end-turn'){let r=room(code),side=u.searchParams.get('side');if(!r||r.stopped)return reply(res,404,{error:'Active room not found'});if(!['wei','shu'].includes(side))return reply(res,400,{error:'Invalid side'});advance(r);if(!r.ready[side]){r.ready[side]=true;r.log.push({phase:r.phase,side,txt:'End Turn'});if(r.ready.wei&&r.ready.shu){r.phase++;r.pendingTurn=true;r.ready={wei:false,shu:false};r.deadline=Date.now()+r.mode*1000;r.version++}}return reply(res,200,{ok:true,...view(r)})}
 if(req.method==='GET'&&u.pathname==='/api/state'){let r=room(code);if(!r)return reply(res,404,{error:'Room not found'});return reply(res,200,{ok:true,...view(r)})}
 if(req.method==='POST'&&u.pathname==='/api/join'){let b=await read(req),r=room(code);if(!r){r={state:null,version:0,phase:1,mode:[20,60,180,300].includes(+b.mode)?+b.mode:60,deadline:Date.now()+(+b.mode||60)*1000,ready:{wei:false,shu:false},pendingTurn:false,log:[]};rooms.set(code,r)}return reply(res,200,{ok:true,...view(r)})}
 if(req.method==='POST'&&u.pathname==='/api/save'){let r=room(code),b=await read(req);if(!r||r.stopped)throw Error('Room stopped or missing');advance(r);
 if(r.version!==b.version)return reply(res,409,{error:'State changed, reload',...view(r)});
 if(!b.state||!Array.isArray(b.state.cities)||b.state.cities.length!==15)throw Error('Invalid snapshot');
 if(r.pendingTurn)throw Error('Turn boundary: reload first');
 r.state=b.state;r.version++;r.log.push({phase:r.phase,side:b.side,txt:b.note||'Classic state updated'});return reply(res,200,{ok:true,...view(r)})}
 if(req.method==='POST'&&u.pathname==='/api/end'){let r=room(code),b=await read(req);if(!r||r.stopped)throw Error('Room stopped or missing');advance(r);if(!['wei','shu'].includes(b.side))throw Error('Bad side');r.ready[b.side]=true;r.log.push({phase:r.phase,side:b.side,txt:'End Turn'});if(r.ready.wei&&r.ready.shu){r.phase++;r.pendingTurn=true;r.ready={wei:false,shu:false};r.deadline=Date.now()+r.mode*1000;r.version++}return reply(res,200,{ok:true,...view(r)})}
 if(req.method==='POST'&&u.pathname==='/api/turn-applied'){let r=room(code),b=await read(req);if(!r||r.stopped)throw Error('Room stopped or missing');if(r.version!==b.version||!r.pendingTurn)return reply(res,409,{error:'Turn already processed',...view(r)});r.state=b.state;r.pendingTurn=false;r.version++;return reply(res,200,{ok:true,...view(r)})}
 return reply(res,404,{error:'Not found'});
 }catch(e){reply(res,400,{error:e.message})}
}).listen(PORT,'0.0.0.0',()=>console.log('Classic multiplayer snapshot server on',PORT));
