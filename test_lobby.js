const assert=require('assert'),{spawn}=require('child_process');
const port=31931,base=`http://127.0.0.1:${port}`,code='LOBBYTEST';const child=spawn(process.execPath,['server.js'],{cwd:__dirname,env:{...process.env,PORT:String(port)}});
const api=async(route,body,method='POST')=>{const r=await fetch(base+route+'?code='+code,{method,headers:{'Content-Type':'application/json'},body:method==='POST'?JSON.stringify(body):undefined});return {status:r.status,...await r.json()}};
(async()=>{await new Promise(r=>setTimeout(r,500));try{
 const c=await api('/api/lobby/create',{mode:60});assert(c.ok);assert.equal(c.slots.wei.kind,'open');
 const claim=await api('/api/lobby/claim',{side:'wei',name:'Commander'});assert(claim.playerToken);
 const early=await api('/api/lobby/start',{hostToken:c.hostToken});assert.equal(early.status,409);
 await api('/api/lobby/slot',{hostToken:c.hostToken,side:'shu',kind:'ai'});
 await api('/api/lobby/slot',{hostToken:c.hostToken,side:'wu',kind:'ai'});
 const started=await api('/api/lobby/start',{hostToken:c.hostToken});assert(started.ok);
 const unauthorized=await api('/api/join',{side:'wei',token:'wrong'});assert.equal(unauthorized.status,400);
 const authorized=await api('/api/join',{side:'wei',token:claim.playerToken});assert(authorized.ok);
 const lobby=await api('/api/lobby/state',null,'GET');assert(lobby.started);
 console.log('PASS: create, claim, host-only AI slots, start gate, auth, state');
 }finally{child.kill()}})().catch(e=>{console.error(e);process.exitCode=1;child.kill()});
