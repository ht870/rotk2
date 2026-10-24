
const http=require('http'),fs=require('fs'),path=require('path');
const html=fs.readFileSync(path.join(__dirname,'index.html'));
const rooms=new Map(),PORT=process.env.PORT||3000;
function reply(res,status,obj){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(obj))}
function read(req){return new Promise((ok,no)=>{let s='';req.on('data',d=>{s+=d;if(s.length>3000000){req.destroy();no(Error('Too large'))}});req.on('end',()=>{try{ok(JSON.parse(s||'{}'))}catch(e){no(e)}})})}
function room(code){return rooms.get(code)}
function advance(r){if(Date.now()>=r.deadline){r.deadline=Date.now()+r.mode*1000;r.ready={wei:false,shu:false};r.phase++;r.pendingTurn=true;r.version++}}
function view(r){advance(r);return {version:r.version,phase:r.phase,deadline:r.deadline,mode:r.mode,ready:r.ready,pendingTurn:r.pendingTurn,state:r.state,log:r.log.slice(-25)}}
http.createServer(async(req,res)=>{try{
 const u=new URL(req.url,'http://localhost'),code=String(u.searchParams.get('code')||'CAOCAO').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,12);
 if(req.method==='GET'&&(u.pathname==='/'||u.pathname==='/classic')){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});return res.end(html)}
 if(req.method==='GET'&&u.pathname==='/api/state'){let r=room(code);if(!r)return reply(res,404,{error:'Room not found'});return reply(res,200,{ok:true,...view(r)})}
 if(req.method==='POST'&&u.pathname==='/api/join'){let b=await read(req),r=room(code);if(!r){r={state:null,version:0,phase:1,mode:[20,60,180,300].includes(+b.mode)?+b.mode:60,deadline:Date.now()+(+b.mode||60)*1000,ready:{wei:false,shu:false},pendingTurn:false,log:[]};rooms.set(code,r)}return reply(res,200,{ok:true,...view(r)})}
 if(req.method==='POST'&&u.pathname==='/api/save'){let r=room(code),b=await read(req);if(!r)throw Error('No room');advance(r);
 if(r.version!==b.version)return reply(res,409,{error:'State changed, reload',...view(r)});
 if(!b.state||!Array.isArray(b.state.cities)||b.state.cities.length!==15)throw Error('Invalid snapshot');
 if(r.pendingTurn)throw Error('Turn boundary: reload first');
 r.state=b.state;r.version++;r.log.push({phase:r.phase,side:b.side,txt:b.note||'Classic state updated'});return reply(res,200,{ok:true,...view(r)})}
 if(req.method==='POST'&&u.pathname==='/api/end'){let r=room(code),b=await read(req);if(!r)throw Error('No room');advance(r);if(!['wei','shu'].includes(b.side))throw Error('Bad side');r.ready[b.side]=true;r.log.push({phase:r.phase,side:b.side,txt:'End Turn'});if(r.ready.wei&&r.ready.shu){r.phase++;r.pendingTurn=true;r.ready={wei:false,shu:false};r.deadline=Date.now()+r.mode*1000;r.version++}return reply(res,200,{ok:true,...view(r)})}
 if(req.method==='POST'&&u.pathname==='/api/turn-applied'){let r=room(code),b=await read(req);if(!r)throw Error('No room');if(r.version!==b.version||!r.pendingTurn)return reply(res,409,{error:'Turn already processed',...view(r)});r.state=b.state;r.pendingTurn=false;r.version++;return reply(res,200,{ok:true,...view(r)})}
 return reply(res,404,{error:'Not found'});
 }catch(e){reply(res,400,{error:e.message})}
}).listen(PORT,'0.0.0.0',()=>console.log('Classic multiplayer snapshot server on',PORT));
