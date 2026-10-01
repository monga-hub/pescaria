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
  assert.equal(decodeGame(encodeGame(result.G)).simConfig.handSize,7);
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
assert.match(upgradeDescription('Maestro delle Aste'),/A fine partita guadagni 1 Ducato/);
G.simConfig={...LAB_DEFAULT_RULES,deferMerchantIncome:false,marketSetBonus:true,marketSetBase:10,marketSetThreshold:3};
assert.match(upgradeDescription('Maestro delle Aste'),/10 Ducati per ogni gruppo di 3/);
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
