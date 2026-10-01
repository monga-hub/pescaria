// node laboratorio/experiments/check-card-transfer.js
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.join(__dirname,'..');
const source=fs.readFileSync(path.join(root,'index.html'),'utf8').match(/<script>\s*([\s\S]*?)<\/script>/)?.[1];
const agent=fs.readFileSync(path.join(__dirname,'monte-carlo-agent.js'),'utf8');
const check=`
const priorNextAuction=nextAuction;
nextAuction=function(){
  if(G.simConfig?.lastTakesWinningBid&&G.auctionResult?.length>1){
    const first=G.auctionResult[0],last=G.auctionResult.at(-1),card=first.card;
    assert(G.players[last.pid].hand.some(c=>c.id===card.id));
    assert(!G.players[first.pid].hand.some(c=>c.id===card.id));
    assert(!G.discard.some(c=>c.id===card.id));
  }
  if(G.simConfig?.lastTakesWinningBid&&G.auctionResult?.length===1)assert(G.discard.some(c=>c.id===G.auctionResult[0].card.id));
  return priorNextAuction();
};
`;
const rules={winnerPricing:true,winnerPrice:1,otherPrice:2,lastTakesWinningBid:true,auctionCardChoice:false,auctionLoserChoice:false,auctionUpgradeOnNoFish:false,handSize:5,classicDraft:true,fishPerPlayer:6,startCoins:12,contractOnlyCoins:false,contractChoice:false,chooseEndDayUpgrades:false,installRemainingCards:false,categoryBonusPerUpgrade:1,deferMerchantIncome:false,marketSetBonus:false,depth:6,samples:6,aggression:1};
for(const mode of ['standard','mc6']){
  const ctx={assert,console,structuredClone,__PESCARIA_HEADLESS:true,addEventListener(){},setTimeout(){return 1},clearTimeout(){},localStorage:{getItem(){return null},setItem(){}},document:{getElementById(){return{innerHTML:''}},addEventListener(){}},matchMedia:()=>({matches:false})};ctx.window=ctx;
  vm.runInNewContext(source.replace(/\}\)\(\);\s*$/,(mode==='mc6'?agent:'')+'\n'+check+'\n})();'),ctx);
  for(let i=0;i<2;i++){
    const {G}=ctx.__pescaria.simulate({n:4,seed:20261001+i*7919,difficulty:'normal',simConfig:rules});
    assert(G.finished);
    assert(G.players.every(p=>p.coins>=0));
  }
  console.log(mode+': carta del primo trasferita all’ultimo e non scartata');
}
