// node laboratorio/experiments/check-reverse-auction.js
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.join(__dirname,'..');
const source=fs.readFileSync(path.join(root,'index.html'),'utf8').match(/<script>\s*([\s\S]*?)<\/script>/)?.[1];
const agent=fs.readFileSync(path.join(__dirname,'monte-carlo-agent.js'),'utf8');
const check=`
const priorAdvanceBuys=advanceBuys;
advanceBuys=function(){
  if(G.simConfig?.reverseRankPricing&&G.buyPos===0){
    const ranks=G.buyQueue.map(q=>q.rank);
    assert(ranks.every((rank,i)=>!i||ranks[i-1]>rank));
    for(const q of G.buyQueue)assert.equal(q.price,q.rank===0?1:q.rank===ranks.length-1?3:2);
  }
  return priorAdvanceBuys();
};
`;
const rules={tieredPricing:false,winnerPricing:false,reverseRankPricing:true,rankFirstPrice:1,rankMiddlePrice:2,rankLastPrice:3,startCoins:12,fishPerPlayer:6,handSize:5,classicDraft:true,mandatoryBid:false,contractOnlyCoins:false,contractChoice:false,chooseEndDayUpgrades:false,installRemainingCards:false,categoryBonusPerUpgrade:1,deferMerchantIncome:false,marketSetBonus:false,auctionLoserChoice:false,auctionCardChoice:false,auctionContractsVariant:false,auctionUpgradeOnNoFish:false,depth:6,samples:6,aggression:1};
for(const mode of ['standard','mc6']){
  const ctx={assert,console,structuredClone,__PESCARIA_HEADLESS:true,addEventListener(){},setTimeout(){return 1},clearTimeout(){},localStorage:{getItem(){return null},setItem(){}},document:{getElementById(){return{innerHTML:''}},addEventListener(){}},matchMedia:()=>({matches:false})};ctx.window=ctx;
  vm.runInNewContext(source.replace(/\}\)\(\);\s*$/,(mode==='mc6'?agent:'')+'\n'+check+'\n})();'),ctx);
  for(let i=0;i<2;i++){
    const {G}=ctx.__pescaria.simulate({n:4,seed:20261001+i*7919,difficulty:'normal',simConfig:rules});
    assert(G.finished);
    assert(G.players.every(p=>p.coins>=0));
  }
  console.log(mode+': acquisti in ordine inverso e prezzi per posizione verificati');
}
