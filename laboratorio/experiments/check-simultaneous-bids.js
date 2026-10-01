// node laboratorio/experiments/check-simultaneous-bids.js
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.join(__dirname,'..');
const source=fs.readFileSync(path.join(root,'index.html'),'utf8').match(/<script>\s*([\s\S]*?)<\/script>/)?.[1];
assert(source);
const agent=fs.readFileSync(path.join(__dirname,'monte-carlo-agent.js'),'utf8');
for(const mode of ['standard','mc6']){
  const ctx={console,structuredClone,__PESCARIA_HEADLESS:true,addEventListener(){},setTimeout(){return 1},clearTimeout(){},localStorage:{getItem(){return null},setItem(){}},document:{getElementById(){return{innerHTML:''}},addEventListener(){}},matchMedia:()=>({matches:false})};
  ctx.window=ctx;
  vm.runInNewContext(source.replace(/\}\)\(\);\s*$/,(mode==='mc6'?agent:'')+'\n})();'),ctx);
  const rules={simultaneousBids:true,fishPerPlayer:8,handSize:7,mandatoryBid:true,contractOnlyCoins:true,chooseEndDayUpgrades:true,auctionUpgradeOnNoFish:false,threshold1:3,threshold2:7,price1:1,price2:2,price3:3,deferMerchantIncome:true,merchantCardValue:1,categoryBonusPerUpgrade:0,depth:6,samples:6,aggression:1};
  for(let i=0;i<2;i++){
    const {G}=ctx.__pescaria.simulate({n:4,seed:20261001+i*7919,difficulty:'normal',simConfig:rules});
    assert(G.finished);
    assert(G.players.every(p=>p.coins>=0&&p.influence>=0));
    assert(G.bidReservations.every(n=>n===0));
    for(const p of G.players){const cards=Object.values(G.committedBids).flat().filter(b=>b.pid===p.id).map(b=>b.card.id);assert.equal(new Set(cards).size,cards.length)}
  }
  const {G:optional}=ctx.__pescaria.simulate({n:4,seed:20261017,difficulty:'normal',simConfig:{...rules,mandatoryBid:false}});
  assert(optional.finished&&optional.players.every(p=>p.coins>=0));
  if(mode==='mc6'){
    assert(ctx.__pescaria.MC.batchChoices>0);
    assert(ctx.__pescaria.MC.cycleRollouts>=ctx.__pescaria.MC.batchChoices*6);
  }
  console.log(mode+': 2 partite complete, impegni validi');
}
