// ROTK 2.7.10: one deterministic economy ledger for browser preview and server turn execution.
// Dependency injection keeps the exact arithmetic identical while allowing each runtime
// to supply its existing officer/stat and cohort implementations.
(function(root,factory){
 const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;
 else root.ROTK_ECONOMY=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 function apply(city,ctx){
  const c=city;
  ctx.normalize(c);
  const keys=['gold','food','pool','safety','manpower','commerce','harvest','training','troops','morale'];
  const before=Object.fromEntries(keys.map(k=>[k,Number(c[k])||0]));
  let trade=0;
  if(!c.used&&!ctx.capturedLocked(c)){
   trade=Math.round(ctx.developGain(c)*.44);
   c.gold+=trade;c.used=true;
  }
  c.manpower=(c.manpower||0)+ctx.stat(c,0);
  c.pool=(c.pool||0)+c.manpower*.048;
  c.safety=(c.safety||0)+ctx.stat(c,1);
  c.commerce=(c.commerce||0)+Math.round(ctx.stat(c,2)*ctx.domesticMultiplier(c,2));
  c.harvest=(c.harvest||0)+Math.round(ctx.stat(c,3)*ctx.domesticMultiplier(c,3));
  c.training=(c.training||0)+(ctx.stat(c,0)+ctx.stat(c,1))/2;
  c.gold=(c.gold||0)+Math.max(1,Math.floor(c.commerce*.005));
  c.food=Math.max(0,(c.food||0)+Math.max(1,Math.floor(c.harvest*.013))-Math.ceil(c.troops*.08));
  if(c.food===0){c.troops=Math.max(300,Math.floor(c.troops*.82));c.morale=Math.max(20,c.morale-30)}
  else{c.troops=Math.max(300,Math.round(c.troops*.996));c.morale=Math.min(100,c.morale+2)}
  ctx.normalize(c);
  return {delta:Object.fromEntries(keys.map(k=>[k,c[k]-before[k]])),trade};
 }
 function preview(city,ctx){return apply(JSON.parse(JSON.stringify(city)),ctx).delta}
 return {apply,preview};
});
