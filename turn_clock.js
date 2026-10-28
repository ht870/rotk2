'use strict';
// Pure faction-clock operations. Turn transitions and AI remain server-owned.
const SIDES=['wei','shu','wu'];
function initialize(r,now=Date.now()){
 if(r.accumulated){r.sideDeadline={};r.displayDeadline={};for(const side of SIDES){r.bank[side]=r.mode;if(!r.ready[side])r.sideDeadline[side]=now+r.bank[side]*1000;r.displayDeadline[side]=now+r.bank[side]*1000}r.deadline=Math.max(now,...Object.values(r.sideDeadline));}
 else {r.deadline=now+r.mode*1000;r.displayDeadline=Object.fromEntries(SIDES.map(side=>[side,r.deadline]));}
}
function next(r,now=Date.now()){
 if(r.accumulated){r.sideDeadline={};r.displayDeadline={};for(const side of SIDES){r.bank[side]=Math.max(0,(r.bank[side]??0))+r.mode;if(!r.ready[side])r.sideDeadline[side]=now+r.bank[side]*1000;r.displayDeadline[side]=now+r.bank[side]*1000}r.deadline=Math.max(now,...Object.values(r.sideDeadline));}
 else {r.deadline=now+r.mode*1000;r.displayDeadline=Object.fromEntries(SIDES.map(side=>[side,r.deadline]));}
}
function stop(r,side,now=Date.now()){
 if(r.ready[side])return;
 if(r.accumulated){const deadline=r.sideDeadline?.[side];r.bank[side]=Number.isFinite(deadline)?Math.max(0,(deadline-now)/1000):0;if(r.sideDeadline)delete r.sideDeadline[side];}
}
function expire(r,now=Date.now()){
 const expired=[];
 if(r.accumulated){for(const [side,deadline] of Object.entries(r.sideDeadline||{})){if(!r.ready[side]&&now>=deadline){r.bank[side]=0;r.ready[side]=true;delete r.sideDeadline[side];expired.push(side)}}}
 else if(r.deadline&&now>=r.deadline){for(const side of SIDES)if(!r.ready[side]){r.ready[side]=true;expired.push(side)}}
 return expired;
}
module.exports={initialize,next,stop,expire};
