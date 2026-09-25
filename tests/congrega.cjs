// Test variante Solitario e Automa. Uso: node tests/congrega.cjs
const assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.join(__dirname,'..');const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const source=html.match(/<script>\s*([\s\S]*?)<\/script>/)[1];const cd=path.join(root,'assets/cards');
const ctx={assert,console,__PESCARIA_HEADLESS:true,addEventListener(){},setTimeout(){return 1},clearTimeout(){},cardFiles:fs.existsSync(cd)?fs.readdirSync(cd):[],document:{getElementById:()=>({}),addEventListener(){}},matchMedia:()=>({matches:false})};ctx.window=ctx;
const checks=`
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
    const me=activePlayer();
    if(G.phase==='rete')beginDraft();
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
