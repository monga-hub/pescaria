// node tests/hand-refill.cjs
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
for(const file of ['index.html','laboratorio/index.html']){
  const source=fs.readFileSync(path.join(__dirname,'..',file),'utf8').match(/<script>\s*([\s\S]*?)<\/script>/)[1];
  const ctx={assert,console,__PESCARIA_HEADLESS:true,addEventListener(){},setTimeout(){return 1},clearTimeout(){},document:{getElementById:()=>({}),addEventListener(){}},matchMedia:()=>({matches:false})};ctx.window=ctx;
  const checks=`
  const config=typeof LAB_DEFAULT_RULES==='undefined'?{}:{simConfig:LAB_DEFAULT_RULES};
  function setup(){
    startGame({n:3,roster:[0,1,2].map(id=>({name:'Test '+id,human:true,character:id})),seed:17,...config});
    for(const p of G.players)for(let n=0;n<p.id;n++)p.kept.push(drawCard());
    G=decodeGame(encodeGame(G));
  }
  // Stop before the auction so we can inspect the exact result of dealing.
  nextAuction=()=>{};
  setup();
  const kept=G.players.map(p=>p.kept.map(c=>c.id)),available=G.deck.length+G.discard.length;
  beginDraft();
  assert.deepEqual(G.drafted.map(h=>h.length),[7,6,5]);
  assert.deepEqual(G.players.map(p=>p.hand.length),[7,7,7]);
  assert.equal(G.deck.length+G.discard.length,available-18);
  for(const p of G.players){assert(kept[p.id].every(id=>p.hand.some(c=>c.id===id)));assert.equal(p.kept.length,0)}
  const cards=[...G.deck,...G.discard,...G.players.flatMap(p=>p.hand)];
  assert.equal(cards.length,100);assert.equal(new Set(cards.map(c=>c.id)).size,100);
  // A short deck is shared in turn order, including reshuffling discards.
  setup();G.deck=G.deck.slice(0,1);G.discard=G.deck.splice(0,1);G.deck=CARDS.filter(c=>!G.discard.includes(c)).slice(0,2);
  beginDraft();assert.deepEqual(G.drafted.map(h=>h.length),[1,1,1]);assert.equal(G.deck.length+G.discard.length,0);
  // No extra cards are drawn for a player already at the target.
  setup();for(let n=0;n<7;n++)G.players[0].hand.push(drawCard());
  beginDraft();assert.equal(G.drafted[0].length,0);assert.equal(G.players[0].hand.length,7);
  // The keep action still enforces the maximum of two cards.
  keepCards(G.players[0],G.players[0].hand.map(c=>c.id));assert.equal(G.players[0].kept.length,2);
  if(typeof LAB_DEFAULT_RULES!=='undefined'){
    setup();G.simConfig={...LAB_DEFAULT_RULES,refillHand:false};beginDraft();
    assert.deepEqual(G.players.map(p=>p.hand.length),[7,8,9],'Previous distribution remains available');
  }
  `;
  vm.runInNewContext(source.replace(/\}\)\(\);\s*$/,checks+'\n})();'),ctx);
  console.log(file+': refill 0/1/2 carte conservate, salvataggio, mazzo insufficiente e limite verificati.');
}
