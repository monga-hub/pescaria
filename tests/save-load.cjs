// Run with: node tests/save-load.cjs
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
const source=html.match(/<script>\s*([\s\S]*?)<\/script>/)[1],storage=new Map(),elements=new Map();
const ctx={assert,console,__PESCARIA_HEADLESS:true,addEventListener(){},setTimeout(){return 1},clearTimeout(){},confirm:()=>true,localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)},document:{getElementById(id){if(!elements.has(id))elements.set(id,{innerHTML:'',querySelector:()=>null});return elements.get(id)},addEventListener(){}},matchMedia:()=>({matches:false})};ctx.window=ctx;
const checks=`
function playWithReloads(reload,humans,congrega){
  const roster=Array.from({length:humans},(_,i)=>({name:'Umano '+i,human:true,character:i}));
  if(congrega)roster.push({name:'Congrega',human:false,character:4,congrega:true});
  startGame({n:roster.length,roster,seed:778+humans,difficulty:'normal',humanBot:false,congrega:congrega?'mercante':null});
  const phases=new Set();let steps=0;
  while(!G.finished&&steps++<3000){
    phases.add(G.phase);
    if(reload){
      const snapshot=encodeGame(G);G=decodeGame(snapshot);assert.equal(encodeGame(G),snapshot,'round trip senza perdita di dati');
      assert(G.rng instanceof RNG);assert(G.players.every(p=>p.keptIds instanceof Set));
      for(const bid of G.bids||[])assert([...G.players[bid.pid].hand,...G.discard].includes(bid.card),'riferimento condiviso alla carta offerta');
    }
    if(G.handoff)acceptHandoff();
    const me=activePlayer();
    if(G.phase==='rete')beginDraft();
    else if(G.phase==='draft')pickDraft(G.draftPacks[me.id][0].id);
    else if(G.phase==='asta'){
      if(G.auctionStage==='bid'){chooseBid(me.hand[0].id);G.bidCash=Math.min(1,me.coins);submitBid()}
      else if(G.auctionStage==='buy'){G.buyQty=Math.min(1,maxBuy(me,currentFish(),G.buyQueue[G.buyPos].price));confirmBuy()}
      else assert.fail('asta bloccata');
    }else if(G.phase==='pubblico'){const card=me.hand.find(c=>canContract(me,c));if(card)serveContract(card.id);else window.finishMarket()}
    else if(G.phase==='conserva'){if(me.hand.length)toggleKeep(me.hand[0].id);confirmKeep()}
    else if(G.phase==='bilancia'){if(G.overlay==='favorite')pickFavorite(FISH.find(f=>G.bag.includes(f))||FISH[0]);else finishDayBtn()}
    else assert.fail(G.phase);
  }
  assert(G.finished);assert(phases.has('draft')&&phases.has('asta')&&phases.has('pubblico')&&phases.has('bilancia'));
  return encodeGame(G);
}
for(const humans of [1,2])for(const congrega of [false,true])assert.equal(playWithReloads(true,humans,congrega),playWithReloads(false,humans,congrega),'stesso esito dopo un caricamento a ogni azione');
G.phaseIntroSeen=new Set(['1:asta:Polpi']);G.keepSel=new Set([5]);
const restored=decodeGame(encodeGame(G));assert(restored.phaseIntroSeen.has('1:asta:Polpi'));assert(restored.keepSel.has(5));
const expected=G.rng.next();assert.equal(restored.rng.next(),expected,'prossima estrazione invariata');
for(const slot of [1,2,3]){saveGameSlot(slot);assert.equal(readSave(slot).version,SAVE_VERSION);assert(decodeGame(readSave(slot).state).finished)}
const first=readSave(1).state;G.players[0].coins++;saveGameSlot(2);assert.equal(readSave(1).state,first,'slot indipendenti');assert.notEqual(readSave(2).state,first);
assert.throws(()=>decodeGame('{}'));assert.throws(()=>decodeGame('non JSON'));
const setItem=localStorage.setItem;localStorage.setItem=()=>{throw new Error('QuotaExceeded')};saveGameSlot(1);assert.equal(readSave(1).state,first,'un errore non cancella il salvataggio');assert($('gameMenu').innerHTML.includes('Impossibile salvare'));localStorage.setItem=setItem;
setGameAudio(true,.5);assert(audioEnabled);assert.equal(audioVolume,.5);setGameAudio(false);assert(!audioEnabled);
console.log('Menu, 3 slot, RNG, riferimenti carte e ripresa di 8 partite complete: OK');
`;
vm.runInNewContext(source.replace(/\}\)\(\);\s*$/,checks+'\n})();'),ctx);
