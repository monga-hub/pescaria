// node laboratorio/experiments/check-ai-contracts.js
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const source=html.match(/<script>\s*([\s\S]*?)<\/script>/)?.[1];
assert(source,'Motore del Laboratorio mancante');
const agent=fs.readFileSync(path.join(__dirname,'monte-carlo-agent.js'),'utf8');
const rules={fishPerPlayer:8,handSize:5,threshold1:3,threshold2:7,price1:1,price2:2,price3:3,
  categoryBonusPerUpgrade:0,deferMerchantIncome:true,merchantCardValue:1,auctionUpgradeOnNoFish:false};
for(const mode of ['standard','mc6']){
  const context={console,structuredClone,__PESCARIA_HEADLESS:true,addEventListener(){},setTimeout(){return 1},
    clearTimeout(){},localStorage:{getItem(){return null},setItem(){}},
    document:{getElementById(){return{innerHTML:''}},addEventListener(){}},matchMedia:()=>({matches:false})};
  context.window=context;
  vm.runInNewContext(source.replace(/\}\)\(\);\s*$/,(mode==='mc6'?agent:'')+'\nwindow.__completeContract=completeContract;})();'),context);
  let contracts=0;
  for(let i=0;i<8;i++){
    const {G}=context.__pescaria.simulate({n:4,seed:20260929+i*7919+52,difficulty:'normal',simConfig:rules});
    assert(G.finished);
    contracts+=G.players.reduce((sum,p)=>sum+p.orders,0);
  }
  assert(contracts>=200,`${mode}: solo ${contracts} contratti in 8 partite`);
  const {G}=context.__pescaria.simulate({n:4,seed:20261001,difficulty:'normal',simConfig:{...rules,catchUpContracts:true,catchUpValue:3}});
  assert.equal(G.catchUpIds.length,2);
  for(const p of G.players)assert.equal(p.catchUpEarned,G.catchUpIds.includes(p.id)?3*p.today.contracts.length:0);
  if(mode==='standard'){
    const p=G.players[0],card=context.__pescaria.CARDS[0];
    G.day=4;G.catchUpIds=[p.id];G.simConfig.contractOnlyCoins=false;G.simConfig.contractChoice=true;
    p.hand.push(card);p.banco={Polpi:0,Gamberi:0,Molluschi:0,Branzini:0,Sardine:0,...card.recipe};
    const before=p.coins;
    assert(context.__completeContract(p,card,'upgrade'));
    assert.equal(p.coins-before,3);
    assert(p.pending.includes(card));
  }
  console.log(`${mode}: ${contracts} contratti in 8 partite`);
}
