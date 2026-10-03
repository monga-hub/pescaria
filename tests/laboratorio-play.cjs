const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.join(__dirname,'..');
const original=fs.readFileSync(path.join(root,'index.html'),'utf8');
const lab=fs.readFileSync(path.join(root,'laboratorio/index.html'),'utf8');
assert(original.includes("SAVE_PREFIX='pescaria.save.'"));
const source=lab.match(/<script>\s*([\s\S]*?)<\/script>/)[1];
const storage=new Map();
const context={console,__PESCARIA_HEADLESS:true,addEventListener(){},setTimeout(){return 1},clearTimeout(){},localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)},document:{getElementById:()=>({innerHTML:''}),addEventListener(){}},matchMedia:()=>({matches:false})};
context.window=context;
const checks=`
assert.equal(SAVE_PREFIX,'pescaria.laboratorio.save.');
for(const seed of [1,2,3]){
  const result=window.__pescaria.simulate({n:4,seed,simConfig:LAB_DEFAULT_RULES});
  assert(result.G.finished);
  assert.equal(result.G.players.length,4);
  assert.equal(decodeGame(encodeGame(result.G)).simConfig.handSize,6);
}
for(const byCard of [true,false]){
  startGame({n:2,roster:[{name:'Primo',human:true,character:0},{name:'Secondo',human:true,character:1}],seed:11,simConfig:{...LAB_DEFAULT_RULES,winnerPricing:false,tieredPricing:true,priceByCard:byCard}});
  const low=CARDS.find(c=>c.bid===2),high=CARDS.find(c=>c.bid===8);
  G.players[0].hand=[low];G.players[1].hand=[high];G.phase='asta';G.auctionIndex=0;G.aOrder=[...FISH];G.market.Polpi=5;
  resolveBids([{pid:0,card:low,cash:8,infl:0},{pid:1,card:high,cash:0,infl:0}]);
  assert.equal(G.buyQueue[0].pid,0,'Il totale dell’offerta determina chi compra per primo');
  assert.equal(G.buyQueue[0].price,byCard?1:3,'Il valore della carta determina la fascia quando richiesto');
  assert.equal(G.buyQueue[1].price,3);
}
const batchRules={...LAB_DEFAULT_RULES,auctionCardChoice:false,auctionContractsVariant:false,auctionLoserChoice:false,auctionUpgradeOnNoFish:false,contractOnlyCoins:true,chooseEndDayUpgrades:true,installRemainingCards:false};
for(const seed of [1,2,3]){
  const game=window.__pescaria.simulate({n:4,seed,simConfig:batchRules}).G;
  assert(game.finished);
  for(const p of game.players){
    const hand=(game.handUpgrades||[]).filter(x=>x.pid===p.id);
    assert.equal(p.installed.length,hand.length,'Only cards left in hand become upgrades');
    for(let day=1;day<=4;day++)assert(hand.filter(x=>x.day===day).length<=2,'At most two upgrades per day');
  }
}
startGame({n:2,seed:9,simConfig:batchRules});
const hand=CARDS.slice(0,5),player=G.players[0];
player.hand=hand;G.day=1;
keepCards(player,[hand[0].id,hand[1].id],[hand[1].id,hand[2].id,hand[3].id,hand[4].id]);
assert.equal(player.kept.length,2);
assert.equal(player.pending.length,2);
assert.equal(G.handUpgrades.length,2);
assert.equal(player.hand.length,0);
assert(G.discard.includes(hand[4]));
assert.match(upgradeDescription('Maestro delle Aste'),/A fine partita guadagni 2 Ducati/);
G.simConfig={...LAB_DEFAULT_RULES,deferMerchantIncome:false,marketSetBonus:true,marketSetBase:10,marketSetThreshold:3};
assert.match(upgradeDescription('Maestro delle Aste'),/10 Ducati per ogni gruppo di 3/);
const catchupRules={...LAB_DEFAULT_RULES,bilanciaCatchup:true,deferMerchantIncome:false};
startGame({n:2,roster:[{name:'Umano',human:true,character:0},{name:'Bot',human:false,character:1}],seed:24,simConfig:catchupRules});
assert.equal(G.deck.length,75);
assert.equal(Object.values(G.bilanciaPiles).reduce((n,pile)=>n+pile.length,0),25);
assert.equal(Object.keys(G.bilanciaPiles).length,3);
assert(G.deck.every(c=>c.cat!=='B'));
const anchor=G.deck.find(c=>c.cat==='A');
G.players[0].installed.push(anchor);
G.players[0].today.contracts.push(G.deck[0]);G.players[0].orders=1;
G.players[1].today.contracts.push(G.deck[1],G.deck[2],G.deck[3]);G.players[1].orders=3;
startEndOfDay();
assert.equal(G.overlay,'bilanciaChoice');
assert.equal(G.bilanciaQueue.length,2);
assert.equal(decodeGame(encodeGame(G)).bilanciaPiles['Maestro della Pescaria'].length,G.bilanciaPiles['Maestro della Pescaria'].length);
pickBilancia('Maestro della Pescaria');
pickBilancia('Maestro della Pescaria');
assert.equal(G.players[0].installed.filter(c=>c.cat==='B').length,2);
assert.equal(G.players[0].coins,16,'Two new Mercanti pay 2 Ducati each today');
assert.equal(G.players[0].orders,1,'Granted Mercanti do not complete contracts');
assert.equal(G.bilanciaAwards.length,2);
assert.equal(G.overlay,'summary');
startGame({n:2,roster:[{name:'Umano',human:true,character:0},{name:'Bot',human:false,character:1}],seed:42,simConfig:LAB_DEFAULT_RULES});
const favorites=CARDS.filter(c=>c.up==='Favorito della Gilda').slice(0,2);
G.players[0].pending.push(...favorites);
startEndOfDay();
assert.equal(G.overlay,'favorite');
assert(overlayHtml().includes('2 carte da completare'));
pickFavorite('Molluschi');
assert.equal(G.overlay,'favorite');
assert.equal(favorites[0].favFish,'Molluschi');
assert(overlayHtml().includes('1 carta da completare'));
assert(overlayHtml().includes(favorites[1].name));
pickFavorite('Gamberi');
assert.equal(G.overlay,'summary');
assert.equal(favorites[1].favFish,'Gamberi');
G.phase='asta';G.auctionStage='summary';G.buyQueue=[{pid:0,card:favorites[0],rank:0,price:1}];G.buyPos=1;G.aOrder=[...FISH];G.auctionIndex=0;
assert.equal(canUpgradeAuctionCard(),false);
assert.doesNotThrow(()=>playerAnnouncement());
console.log('Partita Laboratorio: regole e salvataggi separati OK');
`;
context.assert=assert;
vm.runInNewContext(source.replace(/\}\)\(\);\s*$/,checks+'\n})();'),context);
