'use strict';
const STARVATION_MORALE_LOSS=3;
function moraleLoss(casualties,troops,shortage,moraleTaken=1,moraleInflicted=1){
 const battle=Math.min(5,25*Math.max(0,casualties)/Math.max(1,troops));
 const starvation=shortage?STARVATION_MORALE_LOSS:0;
 return {battle,starvation,total:(battle+starvation)*moraleTaken*moraleInflicted};
}
module.exports={moraleLoss,STARVATION_MORALE_LOSS};
