const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
const source=html.match(/<script>\s*([\s\S]*?)<\/script>/)[1].replace('if(!HEADLESS&&humanPlayers().length){G.auctionStage=', 'if((!HEADLESS||window.__SHOW_SUMMARIES)&&humanPlayers().length){G.auctionStage=');
const context={assert,console,clearTimeout(){},__PESCARIA_HEADLESS:true,addEventListener(){},document:{getElementById:id=>id==='rules'?{}:null,addEventListener(){}},matchMedia:()=>({matches:true})};context.window=context;context.confirm=()=>false;
vm.runInNewContext(source.replace(/\}\)\(\);\s*$/,String.raw`
function checkSupply(){
  assert.equal(G.bag.length+count(G.market)+G.players.reduce((n,p)=>n+count(p.banco)+count(p.cesta),0),100);
  const cards=[...G.deck,...G.discard,...G.players.flatMap(p=>[...p.hand,...p.installed,...p.pending,...p.kept])];
  if(G.phase==='draft')cards.push(...G.draftPacks.flat(),...G.drafted.flat());
  assert.equal(cards.length,100);assert.equal(new Set(cards.map(c=>c.id)).size,100);
}
function advanceLesson(step,before){
  if(!step.action)tutorialNext();
    else if(step.action==='addBidCoin')addBidCoin({currentTarget:{getBoundingClientRect:()=>({left:0,top:0,width:1,height:1})}});
    else if(step.button){window[step.action](...(step.args||[]));assert.equal(encodeGame(G),before,"Reading cards must not confirm the choice");tutorialDo()}
    else window[step.action](...(step.args||[]));
}
function settleSummaries(reload){
    while(G.phase==='asta'&&G.auctionStage==='summary'){
      const recap=G.lastAuctionSummary;
      if(recap.fish==='Polpi')assert.deepEqual(recap.rows.map(r=>[r.pid,r.rank,r.bought]),[[0,1,2],[1,2,1]]);
      if(recap.fish==='Gamberi')assert.deepEqual(recap.rows.map(r=>[r.pid,r.rank,r.bought]),[[1,1,1],[0,2,1]]);
      if(recap.fish==='Molluschi'||recap.fish==='Branzini'||recap.fish==='Sardine')assert(recap.rows.every(r=>r.rank===null&&r.bought===0));
      if(reload)G=decodeGame(encodeGame(G));
      continueAfterAuction();
    }
}
function playGuide(reload){
  startTutorial();assert.equal(G.players.length,2);assert.deepEqual(G.market,{Polpi:3,Gamberi:3,Molluschi:2,Branzini:2,Sardine:2});
  const initial=encodeGame(G);tutorialBack();assert.equal(encodeGame(G),initial,'Back at the beginning changes nothing');exitTutorial();assert.equal(encodeGame(G),initial,'Cancelling exit preserves the tutorial');
  const initialStep=G.tutorial.step;toggleTutorialGuide();assert.equal(G.tutorial.collapsed,true);toggleTutorialGuide();assert.equal(G.tutorial.collapsed,false);assert.equal(G.tutorial.step,initialStep,'Reading the explanation never advances the scenario');
  let steps=0;
  while(!tutorialStep().done){
    assert(steps++<80,'The guide must terminate');checkSupply();
    if(reload)G=decodeGame(encodeGame(G));
    const before=encodeGame(G),step=tutorialStep();
    pickDraft(-1);submitBid('wrong');chooseBid(-1);viewPlayerMat(1);
    if(step.action!=='addBidCoin')addBidCoin({});
    if(step.action!=='confirmBuy')confirmBuy();
    assert.equal(encodeGame(G),before,'Unrequested actions are blocked at step '+G.tutorial.step);
    const previous=G.tutorial.step;
    const oldStep=[0,3,6,12,15,16,17,18,21,22,23,25,27,28,29,31,32,34,35,36,37,39,40,42,43,44,45,46,47,48].indexOf(previous);
    if(oldStep>=0){const legacy=decodeGame(before);delete legacy.tutorial.version;legacy.tutorial.step=oldStep;assert.deepEqual(decodeGame(encodeGame(legacy)),decodeGame(before),'Old tutorial saves resume at the corresponding lesson')}
    advanceLesson(step,before);settleSummaries(reload);
    const after=encodeGame(G);
    if(reload)G=decodeGame(after);
    tutorialBack();assert.deepEqual(G,decodeGame(before),'Back restores cards, coins and all choices at step '+previous);checkSupply();
    advanceLesson(step,before);settleSummaries(reload);
    assert.deepEqual(G,decodeGame(after),'Repeating the lesson produces the same result');
    assert.equal(G.tutorial.step,previous+1);
    if(step.action==='pickDraft'&&step.args[0]===4){assert.equal(G.phase,'asta');assert.deepEqual(G.players[0].hand.map(c=>c.id),[7,71,1,4,18])}
    if(step.action==='confirmBuy'&&previous===28){assert.equal(G.players[0].coins,9);assert.equal(G.players[0].banco.Polpi,2)}
    if(step.action==='confirmBuy'&&previous===33){assert.equal(G.players[0].coins,7);assert.equal(G.players[0].banco.Gamberi,1)}
  }
  checkSupply();assert.equal(G.day,2);assert.equal(G.phase,'rete');assert.equal(G.players[0].coins,16);assert.equal(G.players[0].orders,2);
  assert.deepEqual(G.players[0].installed.map(c=>c.id),[7,4]);assert.equal(G.players[0].cesta.Polpi,1);assert.deepEqual(G.players[0].kept.map(c=>c.id),[18]);
  assert.equal(copies(G.players[0],'Esperienza'),1);assert.equal(copies(G.players[0],'Contrattazione Sottobanco'),1);
  const result=encodeGame(G);tutorialNext();assert.equal(encodeGame(G),result,'Completion cannot advance past the guide');exitTutorial();assert.equal(G,null);return result;
}
assert.equal(playGuide(false),playGuide(true),'Saving and restoring at every step preserves the exact scenario');
window.__SHOW_SUMMARIES=true;assert.equal(playGuide(false),playGuide(true),'Auction summaries resume in order, including after saving');window.__SHOW_SUMMARIES=false;
startGame({n:2,name:'Libera',seed:1,difficulty:'normal',humanBot:false});beginDraft();const card=G.draftPacks[0][1];pickDraft(card.id);assert(G.drafted[0].some(c=>c.id===card.id),'Free play choices remain unrestricted');
console.log('Tutorial: percorso completo, scelte obbligate, conti, conservazione e ripresa a ogni passo OK');
})();`),context);
