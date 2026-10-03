// node laboratorio/experiments/check-ai-decisions.js [--legacy | baseline-agent.js]
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {execFileSync}=require('node:child_process');
const root=path.join(__dirname,'..');
let source=fs.readFileSync(path.join(root,'index.html'),'utf8').match(/<script>\s*([\s\S]*?)<\/script>/)[1];
source=source.replace("else while(G.phase==='draft')draftStep(null);","else if(!window.__pauseDraft)while(G.phase==='draft')draftStep(null);");
const agent=process.argv.includes('--legacy')?execFileSync('git',['show','HEAD:laboratorio/experiments/monte-carlo-agent.js'],{cwd:root,encoding:'utf8'}):fs.readFileSync(process.argv[2]||path.join(__dirname,'monte-carlo-agent.js'),'utf8');
const ctx={assert,console,structuredClone,__PESCARIA_HEADLESS:true,__pauseDraft:true,addEventListener(){},setTimeout(){return 1},clearTimeout(){},localStorage:{getItem(){return null},setItem(){}},document:{getElementById(){return{innerHTML:''}},addEventListener(){}},matchMedia:()=>({matches:false})};ctx.window=ctx;
const check=`
const card=(id,value,n=1,extra={})=>({id,name:'Test '+id,bid:5,value,cat:'A',up:'Banco Ampliato',recipe:{Sardine:n},...extra});
function setup(hand,fish=2){
  startGame({n:4,seed:20261002,humanBot:true,difficulty:'normal',simConfig:{...LAB_DEFAULT_RULES,tieredPricing:true,winnerPricing:false,fishPerPlayer:6,handSize:5,alternateAuctionOrder:false,deferMerchantIncome:false,classicDraft:true,samples:6}});
  G.day=4;G.phase='pubblico';G.simConfig.classicDraft=false;
  const p=G.players[0];p.hand=hand;p.banco={...inv(),Sardine:fish};return p;
}
window.__check=()=>{
  let p=setup([card(1001,12,2),card(1002,5),card(1003,5)]);
  botMarket(p);assert.equal(p.today.income,12,'Un contratto da 12 deve batterne due da 5');assert.equal(p.orders,1);
  p=setup([card(1001,10,2),card(1002,6),card(1003,6)]);
  botMarket(p);assert.equal(p.today.income,12,'Due contratti da 6 devono batterne uno da 10');assert.equal(p.orders,2);
  const merchant=card(1004,1,1,{cat:'B',up:'Maestro della Pescaria'});
  p=setup([card(1001,6),merchant],1);p.installed=[1,2,3,4].map(id=>card(id,0));G.simConfig.categoryBonusPerUpgrade=0;
  botMarket(p);assert.equal(p.pending[0].id,1004,'La rendita immediata della miglioria deve contare');assert.equal(p.today.income+bilanciaIncome(p,true).reduce((s,x)=>s+x.v,0),9);
  p=setup([card(1001,9,2,{cat:'E'}),card(1002,4),{...merchant,value:4}],2);
  botMarket(p);assert.equal(p.orders,2,'Valutare insieme un Mercante e la categoria che lo alimenta');assert.equal(p.today.income+bilanciaIncome(p,true).reduce((s,x)=>s+x.v,0),10);
  const oldPayout=payout,oldComplete=completeContract;
  payout=(p,c)=>2*oldPayout(p,c);
  completeContract=(p,c,reward)=>{const before=p.coins,result=oldComplete(p,c,reward);if(result){const extra=p.coins-before;p.coins+=extra;p.today.income+=extra}return result};
  try{
    p=setup([card(1001,6),merchant],1);p.installed=[1,2,3,4].map(id=>card(id,0));G.simConfig.categoryBonusPerUpgrade=0;
    botMarket(p);assert.equal(p.pending[0].id,1001,'Con contratti doppi, 12 Ducati devono battere 2+8 di rendita');assert.equal(p.today.income,12);
  }finally{payout=oldPayout;completeContract=oldComplete}
  // Ultima asta senza informazioni nascoste: sacrificare la carta intermedia
  // irrealizzabile conserva entrambi i contratti da 20.
  p=setup([card(1001,20,1,{bid:1}),card(1002,1,1,{bid:5,recipe:{Polpi:1}}),card(1003,20,1,{bid:10})],0);
  p.coins=6;G.phase='asta';G.market={...inv(),Sardine:2};G.aOrder=[...FISH];G.auctionIndex=4;G.captain=0;
  G.deck=[];G.bids=[];G.bidDone=[];G.bidOrder=[0,1,2,3];G.bidPos=0;G.auctionPurchases={};G.auctionBlockedByEmpty={};G.auctionZeroUpgrades=[];
  const snapshot=()=>JSON.stringify(G,(k,v)=>k==='plan'?undefined:v),before=snapshot(),bid=botBid(p,'Sardine',[]);
  assert.equal(bid?.card.id,1002,'Conservare i due contratti ricchi puntando la carta intermedia');assert.equal(snapshot(),before,'La ricerca non deve mutare la partita reale');
  // La ricerca deve poter scegliere qualunque carta anche se il suggerimento
  // iniziale e gli estremi della mano non la includono.
  p=setup([card(1011,1,1,{bid:1}),card(1012,1,1,{bid:4}),card(1013,1,1,{bid:6}),card(1014,1,1,{bid:10})],0);
  G.phase='asta';G.market={...inv(),Sardine:2};G.auctionIndex=4;G.aOrder=[...FISH];G.bids=[];G.bidDone=[];G.bidPos=0;
  const oldRun=runCandidate,oldAdvance=advanceBidders,offered=new Set();
  runCandidate=(pid,apply)=>{const saved=G;G=cloneGame();try{apply();const b=G.bids.at(-1);if(b)offered.add(b.card.id);return b?.card.id===1013?100:0}finally{G=saved}};
  advanceBidders=()=>{};
  try{assert.equal(botBid(p,'Sardine',[])?.card.id,1013);assert.equal(offered.size,4)}finally{runCandidate=oldRun;advanceBidders=oldAdvance}
  // Fine giorno 3: 8 Ducati subito contro un contratto da 10 conservato con
  // il pesce necessario. Domani quel contratto paga 20, senza altre pescate.
  p=setup([]);G.day=3;G.phase='bilancia';G.deck=[];G.discard=[];G.bag=[];
  G.simConfig.handSize=0;G.simConfig.fishPerPlayer=0;
  for(const player of G.players){player.coins=20;player.hand=[];player.kept=[];player.banco=inv();player.cesta=inv()}
  G.players[1].coins=30;
  const rewardPayout=payout,rewardComplete=completeContract;
  payout=(p,c)=>rewardPayout(p,c)*(G.day===4?2:1);
  completeContract=(p,c,reward)=>{const before=p.coins,result=rewardComplete(p,c,reward);if(result&&G.day===4){const extra=p.coins-before;p.coins+=extra;p.today.income+=extra}return result};
  try{
    const before=JSON.stringify(G);
    const cash=runCandidate(0,()=>{G.players[0].coins+=8;finishDay()},undefined,true);
    const futureChoice=()=>{G.players[0].kept=[card(1031,10)];G.players[0].cesta.Sardine=1;finishDay()};
    const short=runCandidate(0,futureChoice,undefined,true);
    assert(short<cash,'La modalità predefinita conserva la previsione della revisione 3');
    assert.equal(JSON.stringify(G),before,'La ricerca predefinita non modifica la partita reale');
    G.simConfig.lookaheadFinalDay=true;const experimentalBefore=JSON.stringify(G);
    const future=runCandidate(0,futureChoice,undefined,true);
    assert(future>cash,'La modalità sperimentale deve vedere i 20 Ducati di domani invece di preferire 8 oggi');
    assert(future>9.9,'Valutazione basata sul punteggio finale effettivo');
    assert.equal(JSON.stringify(G),experimentalBefore,'La previsione futura non modifica la partita reale');
  }finally{payout=rewardPayout;completeContract=rewardComplete}
  const checkBuy=(hand,price,wanted,installed=[])=>{
    const buyer=setup(hand,0);buyer.installed=installed;G.phase='asta';G.auctionIndex=4;G.aOrder=[...FISH];
    G.market={...inv(),Sardine:4};G.buyPos=0;G.buyQueue=[{pid:0}];G.mcRollout=true;G.mcCycleTargetDay=4;
    botBuy(buyer,'Sardine',price,0);
    assert.equal(buyer.banco.Sardine,wanted,'Quantità scelta nell’ultimo lotto');
    assert.equal(buyer.coins,12-costOf(buyer,wanted,price));
  };
  checkBuy([],3,0);
  checkBuy([card(1041,5,2)],3,0);
  checkBuy([card(1041,9,2)],3,2);
  checkBuy([card(1041,5,2)],3,2,[{cat:'E',up:'Esperienza'}]);
  checkBuy([card(1041,5,2)],1,2);
  checkBuy([card(1041,6,2)],3,2); // A parità di Ducati, la miglioria vale nello spareggio.
  p=setup([],0);G.phase='asta';G.auctionIndex=4;G.aOrder=[...FISH];G.market={...inv(),Sardine:2};
  G.buyPos=0;G.buyQueue=[{pid:0},{pid:1}];G.mcRollout=true;G.mcCycleTargetDay=4;
  botBuy(p,'Sardine',3,0);assert.equal(p.banco.Sardine,1,'Se altri comprano dopo, conservare la politica che può sottrarre pesci');
  return '15 prove superate: otto precedenti, sei acquisti finali e preservazione della politica quando altri devono comprare.';
};`;
new Function(...Object.keys(ctx),source.replace(/\}\)\(\);\s*$/,agent+'\n'+check+'\n})();'))(...Object.values(ctx));
console.log(ctx.__check());
