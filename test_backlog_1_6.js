const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const source=fs.readFileSync(path.join(__dirname,'server.js'),'utf8').split('http.createServer(async')[0];
const sandbox={require:(id)=>id==='./battle_engine'?{runBattle:()=>({won:false,report:{battleLog:[1]}})}:require(id),__dirname,process,console,setInterval:()=>({unref(){}}),Map,Math};
vm.createContext(sandbox);vm.runInContext(source,sandbox);
const evalJS=x=>vm.runInContext(x,sandbox);
assert(Math.abs(evalJS('multiplier(600)')-2)<1e-9);
assert(Math.abs(evalJS('multiplier(400)')-1.6)<0.001);
assert(evalJS('multiplier(900)')>evalJS('multiplier(500)'));
assert(evalJS('multiplier(900)')<3);
const city={id:0,name:'Test',owner:0,officers:['Zhuge Liang'],gold:20000,food:5000,harvest:500,commerce:500,manpower:500,pool:3000,training:0,safety:500,troops:5000,morale:80,cohorts:[{lv:1,n:5000,hp:500000}]};
sandbox.testCity=city;
assert(evalJS("statFor(testCity,'search')")>100); // Governor contributes 150%
assert(evalJS("costDiscount(testCity,100)")<100);
const st={cities:[city,{id:1,name:'Enemy',owner:1,troops:1000,officers:[],gold:500,food:500,cohorts:[{lv:1,n:1000,hp:100000}]}],searchCount:{},wandering:{},discovered:{},offerPrices:{},captives:{},logs:[],turn:1};
sandbox.testRoom={state:st};
const act=(type,extra={})=>{sandbox.testAct={type,city:0,...extra};return evalJS("applyAction(testRoom,'wei',0,testAct)")};
act('farm');assert(city.used);
act('attack',{to:1,percent:20,food:100,gold:0,heroes:[]});
act('attack',{to:1,percent:20,food:100,gold:0,heroes:[]});
act('governor',{name:'Zhuge Liang'});assert.equal(city.governor,'Zhuge Liang');
act('search');assert.equal(st.searchCount[0],1);
assert.equal(Object.keys(st.discovered).length,0); // no wanderer -> cannot discover
console.log('PASS: no hard cap, governor +150%, discount, no-wanderer search, domestic lock + repeat attacks');
