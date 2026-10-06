const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');
(async()=>{
for(const file of ['index.html','laboratorio/index.html']){
 const source=fs.readFileSync(path.join(root,file),'utf8').match(/<script>\s*([\s\S]*?)<\/script>/)[1];
 const agent=file.startsWith('laboratorio')?fs.readFileSync(path.join(root,'laboratorio/experiments/monte-carlo-agent.js'),'utf8'):'';
 const ctx={assert,console,structuredClone,__PESCARIA_HEADLESS:true,addEventListener(){},setTimeout(){return 1},clearTimeout(){},localStorage:{getItem(){return null},setItem(){}},document:{getElementById:()=>({}),addEventListener(){}},matchMedia:()=>({matches:false})};ctx.window=ctx;
 const checks=`
 const config=typeof LAB_DEFAULT_RULES==='undefined'?{}:{simConfig:{...LAB_DEFAULT_RULES,depth:2,samples:2}};
 startGame({n:2,seed:29,difficulty:'normal',roster:[0,1].map(id=>({human:true,name:'Test '+id,character:id})),...config});
 G.captain=0;beginDraft();G.handoff=false;setActivePlayer(0);G.handoff=false;
 let p=G.players[0];const card=p.hand[0];
 p.coins=3;assert(canPlaceBid(p,card));assert(!canPlaceBid(p,card,1));
 p.coins=2;assert(!canPlaceBid(p,card));
 G.selectedBid=card.id;const before=G.bidPos;submitBid();assert.equal(G.bidPos,before,'An unaffordable bid cannot be submitted');
 p.installed=[{up:'Esperienza'}];p.coins=1;assert(canPlaceBid(p,card),'Senza tassa reduces the reserved purchase cost');
 p.installed=[];p.coins=15;p.banco.Polpi=7;assert(!canPlaceBid(p,card),'A full bank cannot bid');
 p.banco=inv();p.coins=3;assert(!canAddBidCoin(),'The last three coins are reserved for buying');
 p.coins=10;G.market={...inv(),Polpi:3};G.aOrder=[...FISH];G.auctionIndex=0;
 G.buyQueue=[{pid:0,rank:1,price:2,card}];G.buyPos=0;G.auctionStage='buy';G.buyQty=1;
 toggleBuyToken(1);assert.equal(G.buyQty,1,'Even a losing bidder cannot deselect the last fish');
 assert(!actionPanelHtml(p).includes('NON COMPRARE'));
 const advance=advanceBuys;advanceBuys=()=>{};
 G.buyQty=0;G=decodeGame(encodeGame(G));p=G.players[0];confirmBuy();
 assert.equal(p.banco.Polpi,1,'A saved zero quantity still buys the one fish shown on the button');assert.equal(p.coins,8);assert.equal(G.buyPos,1);
 assert.equal(buy(p,'Polpi',0,2),1,'Bots cannot skip a possible purchase');
 G.market.Polpi=0;assert.equal(buy(p,'Polpi',0,2),0,'An exhausted lot is the exception');
 advanceBuys=advance;
 // Inspect actual purchases throughout complete games, including Monte Carlo forecasts.
 const purchase=botBuy;let checked=0;
 botBuy=function(p,f,price,rank){const must=requiresFishPurchase(p)&&maxBuy(p,f,price)>0,before=p.banco[f];const result=purchase(p,f,price,rank);if(must){assert(p.banco[f]>before,'Every eligible bidder buys at least one fish');checked++}return result};
 for(const simultaneous of (typeof LAB_DEFAULT_RULES==='undefined'?[false]:[false,true])){
  const options=typeof LAB_DEFAULT_RULES==='undefined'?{}:{simConfig:{...config.simConfig,simultaneousBids:simultaneous}};
  const game=window.__pescaria.simulate({n:4,seed:41,difficulty:'normal',...options}).G;
  assert(game.finished);assert(game.players.every(p=>p.coins>=0));
  const cards=[...game.deck,...game.discard,...game.players.flatMap(p=>[...p.hand,...p.kept,...p.pending,...p.installed])];
  assert.equal(cards.length,100);assert.equal(new Set(cards.map(c=>c.id)).size,100);
 }
 assert(checked>0);
 // Optional purchases remain available to historical rules and laboratory comparisons.
 if(typeof LAB_DEFAULT_RULES==='undefined')G.rulesVersion=5;else G.simConfig.mandatoryPurchase=false;
 const legacy=G.players[0];legacy.banco=inv();legacy.coins=10;G.market.Polpi=2;
 assert.equal(buy(legacy,'Polpi',0,2),0);

 `;
 await vm.runInNewContext(source.replace(/\}\)\(\);\s*$/,agent+'\n'+checks+'\n})();'),ctx);
 console.log(file+': acquisto obbligatorio, offerte valide, sconti, lotto esaurito e partite complete verificati.');
}
})().catch(error=>{console.error(error);process.exitCode=1});
