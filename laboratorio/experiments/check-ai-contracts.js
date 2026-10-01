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
  vm.runInNewContext(source.replace(/\}\)\(\);\s*$/,(mode==='mc6'?agent:'')+'\n})();'),context);
  let contracts=0;
  for(let i=0;i<8;i++){
    const {G}=context.__pescaria.simulate({n:4,seed:20260929+i*7919+52,difficulty:'normal',simConfig:rules});
    assert(G.finished);
    contracts+=G.players.reduce((sum,p)=>sum+p.orders,0);
  }
  assert(contracts>=200,`${mode}: solo ${contracts} contratti in 8 partite`);
  console.log(`${mode}: ${contracts} contratti in 8 partite`);
}
