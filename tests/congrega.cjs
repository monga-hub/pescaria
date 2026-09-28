// Test variante Solitario e Automa. Uso: node tests/congrega.cjs
const assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.join(__dirname,'..');const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const source=html.match(/<script>\s*([\s\S]*?)<\/script>/)[1];const cd=path.join(root,'assets/cards');
for(let i=0;i<12;i++)assert(fs.existsSync(path.join(root,'assets/automa',String(i).padStart(2,'0')+'.png')));
const ctx={assert,console,__PESCARIA_HEADLESS:true,addEventListener(){},setTimeout(){return 1},clearTimeout(){},cardFiles:fs.existsSync(cd)?fs.readdirSync(cd):[],document:{getElementById:()=>({}),addEventListener(){}},matchMedia:()=>({matches:false})};ctx.window=ctx;
const checks=`
// Ogni carta fisica mantiene la propria immagine anche dopo il mescolamento.
assert.equal(new Set(CONGREGA_DECK.map(c=>c.image)).size,12);
CONGREGA_DECK.forEach((c,i)=>assert.equal(c.image,'assets/automa/'+String(i).padStart(2,'0')+'.png'));

// Il solitario non permette di disattivare la Congrega; a due resta facoltativa.
const originalGetElement=document.getElementById,setupNodes={};
document.getElementById=id=>setupNodes[id]??=({style:{setProperty(){}},innerHTML:''});
setSetupCount(1);
assert.equal(setupCongrega,'apprendista');
assert(!setupNodes.setupOptions.innerHTML.includes("setSetupCongrega('no')"));
setSetupCongrega('doge');setSetupCount(2);setSetupCount(1);
assert.equal(setupCongrega,'doge','mantiene la difficoltà scelta');
setSetupCongrega('no');assert.equal(setupCongrega,'apprendista');
setSetupCount(2);setSetupCongrega('no');assert.equal(setupCongrega,'no');
assert(setupNodes.setupOptions.innerHTML.includes("setSetupCongrega('no')"));
document.getElementById=originalGetElement;

// Cinque carte assegnate direttamente, più quelle conservate, anche dopo un salvataggio.
startGame({n:2,name:'Solo',seed:77,difficulty:'normal',humanBot:false,congrega:'apprendista'});
G.players[0].kept=[drawCard(),drawCard()];
G=decodeGame(encodeGame(G));
const keptIds=G.players[0].kept.map(c=>c.id),dealtIds=G.deck.slice(-HAND).reverse().map(c=>c.id);
assert(overlayHtml().includes('Ricevi le carte e inizia le aste'));
assert(!overlayHtml().includes('>Al draft<'));
beginDraft();
assert.equal(G.phase,'asta');assert.equal(G.auctionStage,'bid');
assert.deepEqual(G.players[0].hand.map(c=>c.id),[...dealtIds,...keptIds]);
assert.equal(G.drafted[1].length,0,'la Congrega non riceve carte dalla distribuzione');
assert(G.players[1].hand.length<=1,'la Congrega può pescare la sola carta per la prima offerta');
assert.equal(G.players[0].kept.length,0);
assert.deepEqual([...G.players[0].keptIds],keptIds);
assert(G.draftPacks.every(pack=>pack.length===0));
assert(!G.log.some(entry=>entry.phase==='Draft'));

const res={};
for(const lv of Object.keys(CONGREGA_LEVELS))for(const n of [2,3]){let win=0,g=0;
 for(let s=1;s<=150;s++){startGame({n,name:'B',seed:s*13+n,difficulty:'normal',humanBot:true,congrega:lv});
  assert(G.finished,'finita');const c=G.players.find(p=>p.congrega);assert(c&&c.installed.length===0&&c.orders===0,'la Congrega non ha migliorie né contratti');
  assert(G.players.every(p=>p.coins>=0));
  const cards=G.deck.length+G.discard.length+G.players.reduce((t,q)=>t+q.hand.length+(q.kept||[]).length+q.installed.length+q.pending.length,0);assert.equal(cards,100,'carte');
  const fish=G.bag.length+Object.values(G.market).reduce((a,b)=>a+b,0)+G.players.reduce((t,q)=>t+count(q.banco)+count(q.cesta)+q.installed.filter(x=>x.favFish).length,0);assert.equal(fish,100,'pesci');
  g++;if(ranking()[0].congrega)win++}
 res[lv+' '+(n===2?'solitario':'2 giocatori')]=Math.round(100*win/g)+'% vince la Congrega (bot semplici)'}
console.log('Congrega OK');console.table(res);
// Partite con giocatori umani e Congrega (solitario e 2 giocatori), passando dall'interfaccia di gioco.
for(const humans of [1,2]){
  const roster=Array.from({length:humans},(_,id)=>({name:'Umano '+id,human:true,character:id}));roster.push({name:'Congrega',human:false,character:4,congrega:true});
  startGame({n:roster.length,roster,seed:777+humans,difficulty:'normal',humanBot:false,congrega:'mercante'});
  let actions=0;
  while(!G.finished&&actions++<3000){
    if(G.handoff)acceptHandoff();
    const automa=G.players.find(p=>p.congrega),art=congregaOfferHtml(automa);
    if(G.phase==='asta'&&G.bidDone.includes(automa.id)&&automa.congregaCard){
      assert(art.includes(automa.congregaCard.image),'immagine della carta corrente');
      assert(art.includes('showAutomaCard'),'carta ingrandibile');
    }else assert.equal(art,'','nessuna carta vecchia o non ancora estratta');
    const me=activePlayer();
    if(G.phase==='rete'){
      const kept=me.kept.length;beginDraft();
      assert.equal(G.phase,humans===1?'asta':'draft');
      if(humans===1)assert.equal(me.hand.length,HAND+kept);
    }
    else if(G.phase==='draft')pickDraft(G.draftPacks[me.id][0].id);
    else if(G.phase==='asta'){
      if(G.auctionStage==='bid'){chooseBid(me.hand[0].id);submitBid();}
      else if(G.auctionStage==='buy'){G.buyQty=Math.min(1,maxBuy(me,currentFish(),G.buyQueue[G.buyPos].price));confirmBuy();}
      else assert.fail('asta bloccata');
    }else if(G.phase==='pubblico'){const c=me.hand.find(c=>canContract(me,c));if(c)serveContract(c.id);else window.finishMarket();}
    else if(G.phase==='conserva'){confirmKeep();}
    else if(G.phase==='bilancia'){if(G.overlay==='favorite')pickFavorite(FISH.find(f=>G.bag.includes(f))||FISH[0]);else finishDayBtn();}
    else assert.fail('fase '+G.phase);
  }
  assert(G.finished,'partita con '+humans+' umani + Congrega finita');
  assert(G.players.find(p=>p.congrega).congregaSales>0,'la Congrega ha venduto');
  console.log('Partita',humans,'umano/i + Congrega: OK');
}

`;
vm.runInNewContext(source.replace(/\}\)\(\);\s*$/,checks+'\n})();'),ctx);
