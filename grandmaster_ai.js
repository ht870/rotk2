'use strict';
// Pure, deterministic, public-board strategic evaluation. No mutations or hidden intel.
function graphDistance(start,goal,neighbors,allowed){if(start===goal)return 0;const seen=new Set([start]),q=[[start,0]];for(let i=0;i<q.length;i++){const [id,d]=q[i];for(const next of neighbors(id)){if(!allowed(next)||seen.has(next))continue;if(next===goal)return d+1;seen.add(next);q.push([next,d+1])}}return Infinity}
function frontierPlan(cities,owner,neighbors,strength){
 const own=cities.filter(c=>c.owner===owner),byId=new Map(cities.map(c=>[c.id,c]));
 const threat=new Map(),reserve=new Map(),priority=new Map();
 for(const c of own){const adjacent=neighbors(c.id).map(id=>byId.get(id)).filter(Boolean);const enemies=adjacent.filter(x=>x.owner!==owner);const strongest=enemies.reduce((n,x)=>Math.max(n,strength(x)),0);const combined=enemies.reduce((n,x)=>n+strength(x),0);const ownStrength=Math.max(1,strength(c));const risk=Math.max(strongest,combined*.72)/ownStrength;threat.set(c.id,risk);reserve.set(c.id,enemies.length?Math.max(1800,Math.ceil(strongest*.65),Math.ceil(combined*.35)):1200)}
 for(const t of cities.filter(c=>c.owner!==owner)){
  const links=neighbors(t.id).map(id=>byId.get(id)).filter(Boolean);
  const adjacentOwn=links.filter(x=>x.owner===owner).length;
  const enemyBackline=links.filter(x=>x.owner===t.owner).length;
  const economy=(Number(t.commerce)||0)+(Number(t.harvest)||0)+(Number(t.manpower)||0);
  // Reward bridgeheads and splitting an enemy network; punish exposed isolated captures.
  const connectivity=adjacentOwn*1.4+enemyBackline*.65;
  const exposed=links.filter(x=>x.owner!==owner&&x.id!==t.id).reduce((n,x)=>n+strength(x),0);
  priority.set(t.id,connectivity+Math.min(2,economy/1800)-Math.min(3,exposed/Math.max(2000,strength(t))*0.35));
 }
 return {threat,reserve,priority};
}
function chooseReinforcement(source,targets,plan,strength){return targets.slice().sort((a,b)=>((plan.threat.get(b.id)||0)*2+strength(b)/18000)-((plan.threat.get(a.id)||0)*2+strength(a)/18000))[0]||null}
module.exports={graphDistance,frontierPlan,chooseReinforcement};
