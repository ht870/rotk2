
const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const PORT=process.env.PORT||3000;
const defs=[["Chang’an", 140, 165, 0, 0], ["Luoyang", 275, 165, 0, 0], ["Ye", 390, 75, 0, 0], ["Xuchang", 395, 220, 0, 0], ["Hanzhong", 155, 275, 1, 1], ["Chengdu", 95, 395, 1, 1], ["Jiangzhou", 255, 400, 1, 1], ["Jingzhou", 365, 330, 1, 1], ["Jianye", 610, 275, 2, 2], ["Hefei", 535, 185, 2, 2], ["Wuchang", 500, 350, 2, 2], ["Kuaiji", 665, 400, 2, 2], ["Tianshui", 52, 196, 1, 1], ["Beihai", 552, 75, 0, 0], ["Chaisang", 525, 435, 2, 2]];
const edges=[[0, 1], [0, 4], [1, 2], [1, 3], [1, 4], [2, 3], [2, 9], [3, 4], [3, 7], [3, 9], [4, 5], [4, 6], [4, 7], [5, 6], [6, 7], [7, 10], [7, 9], [8, 9], [8, 10], [8, 11], [9, 10], [10, 11], [12, 0], [12, 4], [13, 2], [13, 9], [14, 10], [14, 11], [14, 7]];
const heroStats={"Liu Bei": [84, 73, 78, 82], "Guan Yu": [95, 97, 76, 54], "Zhang Fei": [89, 98, 35, 25], "Zhao Yun": [94, 96, 78, 65], "Zhuge Liang": [96, 38, 100, 98], "Ma Chao": [88, 97, 43, 27], "Huang Zhong": [86, 93, 62, 43], "Pang Tong": [84, 40, 97, 82], "Cao Cao": [96, 72, 92, 95], "Xiahou Dun": [88, 90, 61, 54], "Zhang Liao": [94, 92, 78, 62], "Sima Yi": [96, 63, 99, 92], "Xu Huang": [90, 89, 70, 50], "Guo Jia": [78, 22, 98, 90], "Sun Quan": [82, 65, 82, 91], "Lu Meng": [92, 81, 91, 80], "Zhou Yu": [96, 72, 96, 85], "Lu Xun": [94, 69, 96, 87], "Gan Ning": [82, 95, 55, 32], "Taishi Ci": [88, 94, 66, 44], "Wei Yan": [88, 91, 55, 41], "Jiang Wei": [92, 89, 93, 72], "Fa Zheng": [79, 42, 94, 86], "Xu Shu": [82, 48, 94, 88], "Liao Hua": [75, 74, 59, 53], "Wang Ping": [85, 78, 79, 64], "Guan Ping": [82, 85, 58, 50], "Zhang Bao": [80, 88, 42, 38], "Xiahou Yuan": [88, 91, 60, 48], "Dian Wei": [76, 98, 39, 30], "Xu Chu": [78, 97, 37, 28], "Cao Ren": [91, 84, 70, 65], "Yu Jin": [86, 78, 71, 61], "Zhang He": [92, 88, 80, 67], "Jia Xu": [86, 48, 98, 92], "Xun Yu": [85, 18, 97, 99], "Sun Ce": [93, 94, 74, 76], "Sun Jian": [92, 91, 75, 76], "Huang Gai": [82, 83, 65, 61], "Cheng Pu": [85, 79, 74, 69], "Zhou Tai": [82, 93, 48, 41], "Ding Feng": [85, 86, 70, 55], "Lu Su": [84, 41, 92, 95], "Zhuge Jin": [78, 37, 88, 93], "Lü Bu": [92, 100, 35, 24], "Xun You": [85, 25, 94, 92], "Zhuge Dan": [86, 73, 83, 70], "Deng Ai": [93, 85, 92, 80], "Zhong Hui": [85, 62, 94, 79], "Wen Yang": [83, 96, 67, 49], "Ma Dai": [78, 84, 57, 54], "Guan Xing": [80, 84, 51, 48], "Zhang Yi": [81, 75, 73, 67], "Zhang Ni": [82, 79, 66, 62], "Wu Yi": [76, 73, 64, 64], "Fei Yi": [73, 34, 87, 94], "Dong Yun": [68, 28, 81, 93], "Jiang Wan": [74, 38, 88, 96], "Liu Feng": [75, 79, 49, 42], "Meng Huo": [79, 86, 39, 43], "Zhu Rong": [73, 89, 45, 38], "Cao Pi": [77, 64, 83, 89], "Cao Zhi": [45, 29, 88, 66], "Cao Zhang": [82, 90, 47, 41], "Sima Shi": [88, 64, 91, 88], "Sima Zhao": [89, 65, 90, 90], "Man Chong": [83, 68, 84, 81], "Tian Yu": [79, 75, 71, 69], "Wen Ping": [83, 82, 66, 57], "Zang Ba": [81, 81, 58, 55], "Xu Sheng": [82, 83, 69, 58], "Pan Zhang": [76, 80, 55, 44], "Jiang Qin": [80, 78, 65, 56], "Ling Tong": [84, 89, 66, 48], "He Qi": [80, 77, 73, 66], "Bu Zhi": [70, 36, 81, 87], "Zhang Zhao": [66, 23, 87, 97], "Zhang Hong": [65, 24, 85, 94], "Kan Ze": [68, 28, 85, 88], "Lu Fan": [71, 42, 82, 87], "Liu Du": [47, 42, 48, 52], "Zhao Fan": [49, 41, 52, 57], "Liu Yan": [62, 47, 62, 72], "Gongsun Zan": [74, 81, 53, 48], "Pang De": [85, 94, 53, 40], "Han Dang": [80, 78, 64, 58], "Li Dian": [78, 75, 73, 69], "Yue Jin": [84, 84, 60, 51]};
let rooms=new Map();
function fresh(code,mode){
 const cs=defs.map((d,id)=>({id,name:d[0],owner:['wei','shu','wu'][d[3]],x:d[1],y:d[2],troops:4500+id*160,gold:1200,food:8000,pool:6500,fort:200,used:false,
 officers:(id===4?['Liu Bei','Guan Yu','Zhang Fei']:id===5?['Zhuge Liang','Zhao Yun']:id===3?['Cao Cao','Xiahou Dun']:id===1?['Sima Yi','Zhang Liao']:id===8?['Sun Quan','Zhou Yu']:id===10?['Lu Xun','Lu Meng']:[])}));
 return {code,mode,turn:1,deadline:Date.now()+mode*1000,players:{wei:false,shu:false},cities:cs,log:[],seq:0,winner:null,events:[]};
}
function event(r,txt,owner=null){r.seq++;r.log.unshift({seq:r.seq,turn:r.turn,txt,owner,time:Date.now()});r.log=r.log.slice(0,100)}
function adjacent(a,b){return edges.some(e=>(e[0]===a.id&&e[1]===b.id)||(e[1]===a.id&&e[0]===b.id))}
function next(r){if(r.winner)return;r.turn++;r.deadline=Date.now()+r.mode*1000;r.players.wei=false;r.players.shu=false;
 for(const c of r.cities){c.used=false;c.gold+=Math.floor(65+c.fort*.03);c.food+=Math.floor(90+c.pool*.02);c.food=Math.max(0,c.food-Math.ceil(c.troops*.08));}
 event(r,'Turn '+r.turn+' dimulai. Semua kota mendapat income dan upkeep.');}
function tick(r){if(!r.winner&&(Date.now()>=r.deadline||(r.players.wei&&r.players.shu)))next(r)}
function view(r,side){tick(r);return {code:r.code,side,mode:r.mode,turn:r.turn,deadline:r.deadline,players:r.players,seq:r.seq,winner:r.winner,edges,cities:r.cities.map(c=>({...c, gold:c.owner===side?c.gold:null,food:c.owner===side?c.food:null,pool:c.owner===side?c.pool:null, troops:c.owner===side?c.troops:Math.round(c.troops/1000)*1000})),log:r.log.filter(e=>e.owner===null||e.owner===side).slice(0,45)}}
function action(r,side,a){
 tick(r);if(r.winner)throw Error('Game selesai');
 if(r.players[side])throw Error('Sudah End Turn');
 const c=r.cities[a.city];if(!c||c.owner!==side)throw Error('Kota bukan milikmu');
 if(!['recruit','develop','fort','attack','transfer'].includes(a.type))throw Error('Aksi tidak valid');
 if(c.used)throw Error('Kota sudah memakai aksi turn ini');
 if(a.type==='recruit'){if(c.gold<250||c.pool<1000||c.food<300)throw Error('Resource kurang');c.gold-=250;c.food-=300;c.pool-=1000;c.troops+=1000;event(r,side.toUpperCase()+' recruit 1,000 troops di '+c.name)}
 if(a.type==='develop'){if(c.gold<200)throw Error('Gold kurang');c.gold-=200;c.pool+=350;c.food+=500;event(r,side.toUpperCase()+' mengembangkan '+c.name)}
 if(a.type==='fort'){if(c.gold<250)throw Error('Gold kurang');c.gold-=250;c.fort+=80;event(r,side.toUpperCase()+' memperkuat '+c.name)}
 if(a.type==='attack'||a.type==='transfer'){
 const t=r.cities[a.target];if(!t||!adjacent(c,t)||t.id===c.id)throw Error('Target tidak bertetangga');
 const n=Math.floor(Number(a.amount));if(!Number.isFinite(n)||n<500||n>c.troops-500)throw Error('Pasukan tidak valid');
 if(a.type==='transfer'){if(t.owner!==side)throw Error('Transfer hanya ke kota sendiri');c.troops-=n;t.troops+=n;event(r,side.toUpperCase()+' transfer '+n+' troops '+c.name+' → '+t.name)}
 else{
 if(t.owner===side)throw Error('Tidak bisa menyerang kota sendiri');
 const cost=Math.ceil(n*.16);if(c.food<cost)throw Error('Food ekspedisi kurang');
 c.food-=cost;c.troops-=n;
 const war=(c.officers||[]).reduce((v,h)=>v+(heroStats[h]?.[1]||0),0); const lead=(c.officers||[]).reduce((v,h)=>v+(heroStats[h]?.[0]||0),0); const attackPower=n*(1+war*.002+lead*.001)*(.85+Math.random()*.35);
 const defenseLead=(t.officers||[]).reduce((v,h)=>v+(heroStats[h]?.[0]||0),0);const defensePower=t.troops*(1+t.fort/3000)*(1+defenseLead*.0015)*(.85+Math.random()*.35);
 if(attackPower>defensePower){
   const survivors=Math.max(500,Math.floor(n*(1-Math.min(.78,defensePower/attackPower*.65))));
   const previous=t.owner;t.owner=side;t.troops=survivors;t.fort=Math.floor(t.fort*.65);t.gold=Math.floor(t.gold*.65);t.food=Math.floor(t.food*.65);t.used=true;
   event(r,side.toUpperCase()+' merebut '+t.name+' dari '+previous.toUpperCase()+' ('+survivors+' survivors)');
 }else{
   const lost=Math.max(250,Math.floor(n*.78));t.troops=Math.max(500,t.troops-Math.floor(lost*.55));event(r,side.toUpperCase()+' gagal menyerang '+t.name+' dari '+c.name);
 }
 }
 }
 c.used=true;
 for(const faction of ['wei','shu'])if(!r.cities.some(x=>x.owner===faction)){r.winner=faction==='wei'?'shu':'wei';event(r,r.winner.toUpperCase()+' memenangkan perang!')}
 return {ok:true};
}
function respond(res,status,obj){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':'*'});res.end(JSON.stringify(obj))}
function read(req){return new Promise((resolve,reject)=>{let s='';req.on('data',d=>{s+=d;if(s.length>20000)req.destroy()});req.on('end',()=>{try{resolve(JSON.parse(s||'{}'))}catch(e){reject(e)}})})}
const index=fs.readFileSync(path.join(__dirname,'index.html')); const classic=fs.readFileSync(path.join(__dirname,'classic_v246.html'));
http.createServer(async(req,res)=>{
 try{
 if(req.method==='GET'&&req.url==='/classic'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});return res.end(classic)}
 if(req.method==='GET'&&req.url==='/'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});return res.end(index)}
 if(req.method==='POST'&&req.url==='/api/join'){
 const b=await read(req),code=String(b.code||'DUEL').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,12)||'DUEL',side=b.side;
 if(!['wei','shu'].includes(side))throw Error('Pilih Wei atau Shu');
 let r=rooms.get(code);if(!r){r=fresh(code,[20,60,180,300].includes(+b.mode)?+b.mode:60);rooms.set(code,r);event(r,'Room '+code+' dibuat · '+r.mode+' detik/turn')}
 return respond(res,200,{ok:true,state:view(r,side)});
 }
 if(req.method==='GET'&&req.url.startsWith('/api/state?')){
 const u=new URL(req.url,'http://localhost');let r=rooms.get(u.searchParams.get('code'));if(!r)throw Error('Room tidak ditemukan');
 const side=u.searchParams.get('side');if(!['wei','shu'].includes(side))throw Error('Invalid faction');
 return respond(res,200,{ok:true,state:view(r,side)});
 }
 // GET command endpoints for turn-by-turn remote play testing. Never embed secrets in URL.
 if(req.method==='GET'&&req.url.startsWith('/api/action?')){
 const u=new URL(req.url,'http://localhost');const b=Object.fromEntries(u.searchParams.entries());
 const r=rooms.get(b.code);if(!r)throw Error('Room tidak ditemukan');
 if(!['wei','shu'].includes(b.side))throw Error('Faction invalid');
 if(b.from!==undefined&&b.city===undefined)b.city=b.from;
 if(b.to!==undefined&&b.target===undefined)b.target=b.to;
 if(b.troops!==undefined&&b.amount===undefined)b.amount=b.troops;
 action(r,b.side,b);return respond(res,200,{ok:true,state:view(r,b.side)});
 }
 if(req.method==='GET'&&req.url.startsWith('/api/end?')){
 const u=new URL(req.url,'http://localhost');const b=Object.fromEntries(u.searchParams.entries());
 const r=rooms.get(b.code);if(!r)throw Error('Room tidak ditemukan');
 if(!['wei','shu'].includes(b.side))throw Error('Faction invalid');
 tick(r);if(!r.players[b.side]){r.players[b.side]=true;event(r,b.side.toUpperCase()+' End Turn');tick(r)}
 return respond(res,200,{ok:true,state:view(r,b.side)});
 }
 if(req.method==='POST'&&req.url==='/api/action'){
 const b=await read(req),r=rooms.get(b.code);if(!r)throw Error('Room tidak ditemukan');
 if(!['wei','shu'].includes(b.side))throw Error('Faction invalid');
 action(r,b.side,b);return respond(res,200,{ok:true,state:view(r,b.side)});
 }
 if(req.method==='POST'&&req.url==='/api/end'){
 const b=await read(req),r=rooms.get(b.code);if(!r)throw Error('Room tidak ditemukan');
 if(!['wei','shu'].includes(b.side))throw Error('Faction invalid');
 tick(r);r.players[b.side]=true;event(r,b.side.toUpperCase()+' End Turn');tick(r);
 return respond(res,200,{ok:true,state:view(r,b.side)});
 }
 respond(res,404,{error:'Not found'});
 }catch(e){respond(res,400,{error:e.message})}
}).listen(PORT,'0.0.0.0',()=>console.log('ROTK multiplayer listening on '+PORT));
setInterval(()=>{for(const r of rooms.values())tick(r)},500);
