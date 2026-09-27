const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
const source=html.match(/<script>\s*([\s\S]*?)<\/script>/)[1];
const context={assert,console,__PESCARIA_HEADLESS:true,addEventListener(){},document:{getElementById:()=>({}),addEventListener(){}},matchMedia:()=>({matches:false}),getComputedStyle:()=>({transform:'none',opacity:'1'}),innerWidth:390};context.window=context;context.process=process;
vm.runInNewContext(source.replace(/\}\)\(\);\s*$/,String.raw`
(async()=>{
  startGame({n:2,name:'Test',seed:42,difficulty:'normal',humanBot:false});beginDraft();
  const dock={inert:false},guide={inert:false},table={inert:false};document.getElementById=id=>({floatingHand:dock,tutorialGuide:guide,game:table}[id]||{});
  let flights=[],resolvers=[];
  function showPack(){dock.querySelectorAll=()=>G.draftPacks[0].map(c=>({dataset:{cardId:String(c.id)},animate(){flights.push(c.id);return{finished:new Promise(resolve=>resolvers.push(resolve)),cancel(){}}}}))}
  showPack();const chosen=G.draftPacks[0][0].id,before=encodeGame(G);let commits=0;
  const moving=animateDraftPick(chosen,()=>{commits++;pickDraft(chosen)});
  assert.equal(encodeGame(G),before,'Rules wait until the old packet has left');
  assert.equal(flights.length,4);assert(!flights.includes(chosen),'The chosen card stays while the other four leave');
  assert(dock.inert&&guide.inert&&table.inert,'Interactions are locked during departure');
  resolvers.forEach(resolve=>resolve());await moving;
  assert.equal(commits,1);assert.equal(G.drafted[0][0].id,chosen);assert.equal(G.draftRound,2);
  assert(!dock.inert&&!guide.inert&&!table.inert);assert(draftArrival.kept.has(chosen),'The chosen card is excluded from incoming animation');
  assert.equal(G.draftPacks[0].filter(c=>!draftArrival.kept.has(c.id)).length,4,'Only the new packet enters');
  flights=[];resolvers=[];showPack();const stale=animateDraftPick(G.draftPacks[0][0].id,()=>{commits++});
  startGame({n:2,name:'Nuova',seed:8,difficulty:'normal',humanBot:false});const replacement=encodeGame(G);
  resolvers.forEach(resolve=>resolve());await stale;
  assert.equal(commits,1,'A stale animation cannot change a replacement game');assert.equal(encodeGame(G),replacement);
  console.log('Draft: uscita prima del cambio, carta conservata, ingresso nuovo pacchetto e annullamento OK');
})().catch(error=>{console.error(error);process.exitCode=1});
})();`),context);
