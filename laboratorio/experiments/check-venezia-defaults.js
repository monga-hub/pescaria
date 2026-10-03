// node laboratorio/experiments/check-venezia-defaults.js
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),source=fs.readFileSync(path.join(root,'index.html'),'utf8').match(/<script>\s*([\s\S]*?)<\/script>/)[1];
const agent=fs.readFileSync(path.join(__dirname,'monte-carlo-agent.js'),'utf8'),telemetry=fs.readFileSync(path.join(__dirname,'lab-telemetry.js'),'utf8');
const ctx={assert,console,structuredClone,__PESCARIA_HEADLESS:true,addEventListener(){},setTimeout(){return 1},clearTimeout(){},localStorage:{getItem(){return null},setItem(){}},document:{getElementById(){return{innerHTML:''}},addEventListener(){}},matchMedia:()=>({matches:false}),location:{search:'',replace(){throw Error('Invalid rules')}},alert(){throw Error('Invalid rules')}};ctx.window=ctx;
const probe=`
window.__defaults=LAB_DEFAULT_RULES;
let starts=[],orders=[];
const checkStartDraft=startDraft;startDraft=function(){if(!G.mcRollout)starts.push({day:G.day,fish:count(G.market)});return checkStartDraft()};
const checkNextAuction=nextAuction;nextAuction=function(){if(!G.mcRollout&&G.auctionIndex===-1)orders.push({day:G.day,fish:[...G.aOrder],cards:G.drafted.map(h=>h.length)});return checkNextAuction()};
window.__checkVenezia=()=>{
 assert.deepEqual(selectedLabRules(),LAB_DEFAULT_RULES);
 G={simConfig:LAB_DEFAULT_RULES};
 for(let total=1;total<=5;total++)for(let rank=1;rank<=total;rank++)for(const score of [1,3,7,10,20])assert.equal(auctionPrice(score,rank,total),rank===1?3:rank===2?2:1);
 const old={...LAB_DEFAULT_RULES,winnerPrice:1,otherPrice:2,fishPerPlayer:6,handSize:5,deferMerchantIncome:false};delete old.secondPrice;delete old.alternateAuctionOrder;
 location.search='?rules='+encodeURIComponent(JSON.stringify(old));const restored=selectedLabRules();
 assert.equal(restored.secondPrice,2);assert.equal(restored.alternateAuctionOrder,false);assert.equal(restored.handSize,5);assert.equal(restored.deferMerchantIncome,false);
 G={simConfig:restored};assert.equal(auctionPrice(10,2,4),2);assert.equal(auctionPrice(10,3,4),2);
 for(const alternate of [false,true])for(const simultaneous of [false,true]){
  starts=[];orders=[];
  const {G:game}=window.__pescaria.simulate({n:4,seed:20261003,difficulty:'normal',simConfig:{...LAB_DEFAULT_RULES,alternateAuctionOrder:alternate,simultaneousBids:simultaneous,depth:6,samples:6}});
  assert(game.finished);assert.equal(game.lab.days.length,4);assert.equal(starts.length,4);assert.equal(orders.length,4);
  for(const d of starts)assert.equal(d.fish,28);
  for(const d of orders){assert.deepEqual(d.fish,alternate&&d.day%2===0?[...FISH].reverse():FISH);assert.deepEqual(d.cards,[6,6,6,6])}
  for(const a of game.lab.auctions){
   for(const b of a.bids)assert.equal(b.price,b.rank===1?3:b.rank===2?2:1);
   const ranks=a.buys.map(b=>a.bids.find(x=>x.pid===b.pid).rank);assert.deepEqual(ranks,[...ranks].sort((a,b)=>a-b));
  }
  for(const day of game.lab.days.slice(0,3))for(const p of day.players){assert.equal(p.passiveIncome,0);assert.equal(p.bilancia,0)}
  assert(game.lab.passive.every(p=>p.day===4));
  for(const p of game.players){const expected=p.installed.filter(c=>c.cat==='B').reduce((s,c)=>s+2*p.installed.filter(x=>x.cat===MAESTRO[c.up]).length,0);assert.equal(p.bilanciaTot,expected);assert.equal(game.lab.passive.filter(x=>x.pid===p.id).reduce((s,x)=>s+x.gain,0),expected,'Il report deve registrare una sola volta la rendita finale')}
  for(const day of [1,2,3,4]){G.day=day;assert.equal(contractMultiplier(),1)}
 }
};`;
new Function(...Object.keys(ctx),source.replace(/\}\)\(\);\s*$/,agent+'\n'+telemetry+'\n'+probe+'\n})();'))(...Object.values(ctx));
// Check that the visible defaults and the reset preset match the playable engine.
const html=fs.readFileSync(path.join(root,'laboratorio.html'),'utf8'),js=fs.readFileSync(path.join(root,'laboratorio.js'),'utf8');
const defaults={};for(const tag of html.matchAll(/<input\b[^>]*>/g)){const name=tag[0].match(/name="([^"]+)"/)?.[1];if(!name)continue;defaults[name]=tag[0].includes('type="checkbox"')?/\bchecked\b/.test(tag[0]):Number(tag[0].match(/value="([^"]+)"/)?.[1])}
const preset=new Function('return '+js.match(/const original=(\{[^\n]+\});/)[1])();
for(const [key,value] of Object.entries(ctx.__defaults)){assert.equal(defaults[key]??false,value,'HTML default '+key);if(key in preset)assert.equal(preset[key],value,'Reset default '+key)}
ctx.__checkVenezia();
console.log('Venezia: default coerenti, prezzi 3/2/1, ordine alternato, 7 pesci/6 carte, rendite solo finali, vecchi collegamenti e quattro partite MC verificate.');
