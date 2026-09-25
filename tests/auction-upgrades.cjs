// Run with: node tests/auction-upgrades.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const source = html.match(/<script>\s*([\s\S]*?)<\/script>/)[1];
const context = {
  assert, console, __PESCARIA_HEADLESS: true, addEventListener() {},
  setTimeout(fn) { context.introCallback=fn; return 1; },
  clearTimeout() { context.introCallback=null; },
  cardFiles: fs.readdirSync(path.join(__dirname, '..', 'assets/cards')),
  document: { getElementById: () => ({}), addEventListener() {} },
  matchMedia: () => ({ matches: false }),
};
context.window = context;
const checks = `
for (const [width,height] of [[125,105],[240,180],[60,35]]) {
  for(let n=1;n<=100;n++){
    const {columns,size}=tokenGrid(n,width,height,56),rows=Math.ceil(n/columns);
    assert(size>0 && size<=56);
    assert(columns*size+(columns-1)*3<=width);
    assert(rows*size+(rows-1)*3<=height);
  }
}
assert.equal(DISPLAY['Nuovi Clienti'], 'Fortuna');
assert.equal(DISPLAY['Esperienza'], 'Senza tassa');
startGame({n:3, name:'Test', seed:1, difficulty:'normal', humanBot:false});
const advance = nextAuction;
nextAuction = () => {};
G.auctionIndex = 0;
G.market = inv();
const [winner, loser, passer] = G.players;
for (const p of G.players) p.installed = [];
loser.installed = [{up:'Nuovi Clienti'}]; // Fortuna permanente: 1 carta per copia a ogni asta persa
const drawn = G.deck.at(-1);
function auction() {
  const high = {id:1001, bid:10}, low = {id:1002, bid:1};
  winner.hand.push(high); loser.hand.push(low);
  resolveBids([{pid:0, card:high, cash:0, infl:0}, {pid:1, card:low, cash:0, infl:0}]);
}
auction();
assert.equal(G.viewedPlayer, winner.id, 'Show the auction winner’s mat');
assert.equal(loser.hand.length, 1);
assert.equal(loser.hand[0], drawn);
assert.equal(winner.hand.length, 0);
assert.equal(passer.hand.length, 0);
auction();
assert.equal(loser.hand.length, 2, 'Fortuna draws on every lost auction');
loser.installed = [{up:'Esperienza'}];
assert.equal(costOf(loser, 1, 2), 1);
assert.equal(costOf(loser, 3, 2), 5);
assert.equal(costOf(loser, 3, 1), 3);
loser.installed.push({up:'Esperienza'});
assert.equal(costOf(loser, 3, 2), 4);
const matPlayer = {...winner, banco:{...inv(), Polpi:4, Sardine:3}, cesta:{...inv(), Gamberi:3},
  installed:[CARDS.find(c=>c.up==='Banco Ampliato')], pending:[CARDS.find(c=>c.up==='Nuovi Clienti')]};
const mat = playerMatHtml(matPlayer);
assert(mat.includes('Banco: 7 pesci su 7'));
assert(mat.includes('Cesta: 3 pesci su 3'));
const bankMarkup = mat.split('class="mat-bank"')[1].split('class="mat-label mat-cesta-label"')[0];
assert.equal((bankMarkup.match(/class="token /g)||[]).length, 7);
const cestaMarkup = mat.split('class="mat-cesta"')[1].split('class="mat-coins"')[0];
assert.equal((cestaMarkup.match(/class="token /g)||[]).length, 3);
assert(!mat.split('class="mat-upgrade-lanes"')[1].split('class="mat-pending"')[0].includes('Fortuna'));
assert(mat.includes('Da installare a fine giornata'));
for (let id=0;id<5;id++) assert(playerMatHtml({...matPlayer,id,character:id}).includes('plancia-'+PLAYER_MATS[id][0]+'.png'));
G.phase='asta';G.auctionStage='bid';G.selectedBid=CARDS[0].id;
winner.hand=[CARDS[0]];G.bidCash=2;G.bidInfl=0;
const offer = auctionPanelHtml(winner);
assert(offer.includes('Valore d’asta della carta</th><td><strong>'+CARDS[0].bid+'</strong>'));
assert(offer.includes('OFFRI '+(CARDS[0].bid+2)));
assert.equal(cardFiles.length, CARDS.length);
for (const card of CARDS) {
  const file = String(card.id-1).padStart(3,'0')+'.png';
  assert(cardFiles.includes(file), 'Missing illustration for '+card.name);
  const markup = cardHtml(card,'bid');
  assert(markup.includes('src="assets/cards/'+file+'?v=20260925-2"'));
  assert(markup.includes('onclick="chooseBid('+card.id+')"'));
  assert(markup.includes('aria-label="'+card.bid+' CLIENTE #'+card.id));
}
winner.installed=[CARDS[0]];
assert(cardHtml(CARDS[0],'market').includes('card-bonus'));
assert(!cardHtml(CARDS[0],'bid').includes('card-bonus'));
assert(cardHtml(CARDS[0],'draft',false).includes('draft-lock'));
const pileCards=CARDS.slice(0,5),facePile=pileHtml(pileCards,true),backPile=pileHtml(pileCards,false);
assert.equal((facePile.match(/<img /g)||[]).length,3);
assert(facePile.includes('assets/cards/004.png?v=20260925-2'));
assert(!facePile.includes('assets/cards/000.png'));
assert.equal(backPile.split('assets/board/card-back.png').length-1,3);
assert(!backPile.includes(pileCards[0].name),'The deck must not reveal card faces');
assert(!pileHtml([],true).includes('<img '),'No stale image in an empty discard pile');
// Phase intros run once per phase/day; skipping and expiry both unlock the game.
const originalGetElement=document.getElementById, introNodes={};
document.getElementById=id=>introNodes[id]??=(
  {classList:{add(){},remove(){}},setAttribute(){},focus(){},inert:false}
);
G.day=1;
for(const phase of ['rete','draft','asta','pubblico','bilancia']){
  G.phase=phase;showPhaseIntro();
  assert.equal($('game').inert,true);
  assert.equal($('floatingHand').inert,true);
  assert($('phaseIntroIcon').src);
  assert.equal($('phaseIntroAuctionIcon').hidden,phase!=='asta');
  const timer=introCallback;
  showPhaseIntro();assert.equal(introCallback,timer,'Renders must not restart the animation');
  if(phase==='draft')dismissPhaseIntro();else timer();
  assert.equal($('game').inert,false);
  assert.equal($('floatingHand').inert,false);
  showPhaseIntro();assert.equal(introCallback,null,'Same phase must not replay after dismissal');
  if(phase==='pubblico'){
    G.phase='conserva';showPhaseIntro();
    assert.equal(introCallback,null,'Keeping cards is part of Mercato');
  }
}
G.phase='asta';G.phaseIntroSeen=new Set();G.aOrder=[...FISH];
for(let i=0;i<FISH.length;i++){
  G.auctionIndex=i;G.auctionStage='bid';showPhaseIntro();
  assert.equal($('game').inert,true,'Announce each fish auction');
  assert.equal($('phaseIntroName').textContent,'Asta '+(FISH[i]==='Sardine'?'delle':'dei')+' '+FISH[i]);
  assert.equal($('phaseIntroIcon').src,ASSET.fish[FISH[i]]);
  assert.equal($('phaseIntroAuctionIcon').hidden,false);
  assert.equal($('phaseIntroAuctionIcon').src,ASSET.phase.asta);
  dismissPhaseIntro();
  G.selectedBid=CARDS[0].id;showPhaseIntro();
  assert.equal(introCallback,null,'Selecting a card must not replay the auction intro');
  G.auctionStage='buy';showPhaseIntro();
  assert.equal(introCallback,null,'Purchases belong to the same auction');
}
G.day=2;G.phase='asta';G.auctionIndex=0;showPhaseIntro();
assert.equal($('game').inert,true,'Announce Polpi again on the next day');dismissPhaseIntro();
G.day=2;G.phase='rete';showPhaseIntro();assert.equal($('game').inert,true);
dismissPhaseIntro();document.getElementById=originalGetElement;
nextAuction = advance;
// Complete games with several humans, including an AI in the first seat.
for(const controls of [[true],[false],[false,true],[true,true],[true,false,true],[true,true,true,true,true],[false,false]]){
  const roster=controls.map((human,id)=>({name:'Mercante '+id,human,character:4-id}));
  startGame({n:roster.length,roster,seed:32026,difficulty:'normal',humanBot:false});
  assert.deepEqual(G.players.map(p=>p.character),roster.map(p=>p.character));
  let actions=0;const operated=new Set();
  while(!G.finished&&actions++<1500){
    if(G.handoff){assert(overlayHtml().includes('Passa il dispositivo'));acceptHandoff()}
    const me=activePlayer();if(me.human)operated.add(me.id);
    if(G.phase==='rete')beginDraft();
    else if(G.phase==='draft')pickDraft(G.draftPacks[me.id][0].id);
    else if(G.phase==='asta'){
      if(G.auctionStage==='bid'){
        assert(me.human);chooseBid(me.hand[0].id);submitBid();
      }else if(G.auctionStage==='buy'){
        assert.equal(G.buyQueue[G.buyPos].pid,me.id);G.buyQty=Math.min(1,maxBuy(me,currentFish(),G.buyQueue[G.buyPos].price));confirmBuy();
      }else assert.fail('Auction stalled');
    }else if(G.phase==='pubblico'){
      const contract=me.hand.find(c=>canContract(me,c));if(contract)serveContract(contract.id);else window.finishMarket();
    }else if(G.phase==='conserva'){
      if(me.hand.length)toggleKeep(me.hand[0].id);confirmKeep();
    }else if(G.phase==='bilancia'){
      if(G.overlay==='favorite')pickFavorite(FISH.find(f=>G.bag.includes(f))||FISH[0]);else finishDayBtn();
    }else assert.fail('Unexpected phase '+G.phase);
  }
  assert(G.finished,'Hotseat game must finish');
  assert(G.players.every(p=>p.coins>=0));
  if(controls.some(Boolean))assert.deepEqual([...operated].sort(),roster.filter(p=>p.human).map(p=>roster.indexOf(p)).sort());
}
// Each human receives their own Congrega choice at the end of the day.
const pair=[{name:'Ada',human:true,character:4},{name:'Leo',human:true,character:1}];
assert.throws(()=>startGame({n:2,roster:[pair[0],pair[0]],seed:1}),/Configurazione/);
startGame({n:2,roster:pair,seed:1,difficulty:'normal'});
const favorites=CARDS.filter(c=>c.up==='Favorito della Gilda').slice(0,2).map(c=>({...c}));
G.players.forEach((p,i)=>p.pending=[favorites[i]]);startEndOfDay();
assert.equal(activePlayer().id,0);G.handoff=false;pickFavorite('Polpi');
assert.equal(activePlayer().id,1);assert.equal(G.handoff,true);G.handoff=false;pickFavorite('Gamberi');
assert.equal(G.players[0].installed[0].favFish,'Polpi');
assert.equal(G.players[1].installed[0].favFish,'Gamberi');
assert.equal(G.overlay,'summary');
// Explicit seeds remain reproducible; ordinary starts obtain a fresh random seed.
const originalRandom=Math.random;
for(const value of [0.25,0.75]){
  Math.random=()=>value;
  startGame({n:1,name:'Test',difficulty:'normal',humanBot:false});
  assert.equal(G.seed,Math.floor(value*4294967295)+1);
  const randomDeck=G.deck.map(c=>c.id),randomMarket={...G.market},seed=G.seed;
  startGame({n:1,name:'Test',seed,difficulty:'normal',humanBot:false});
  assert.deepEqual(G.deck.map(c=>c.id),randomDeck);
  assert.deepEqual(G.market,randomMarket);
}
Math.random=originalRandom;
for (const n of [1,2,3,4,5]) for (let seed=1; seed<=10; seed++) {
  const {G: game} = window.__pescaria.simulate({n, seed, difficulty:'normal'});
  assert.equal(game.finished, true);
  assert(game.players.every(p => p.coins >= 0));
}
`;
vm.runInNewContext(source.replace(/\}\)\(\);\s*$/, checks + '\n})();'), context);
console.log('Setup, characters, hotseat, upgrades and 57 complete games: OK');
