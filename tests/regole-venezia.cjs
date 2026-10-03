// node tests/regole-venezia.cjs
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8').match(/<script>\s*([\s\S]*?)<\/script>/)[1];
const ctx={assert,console,__PESCARIA_HEADLESS:true,addEventListener(){},setTimeout(){return 1},clearTimeout(){},confirm:()=>false,document:{getElementById:id=>id==='rules'?{}:null,addEventListener(){}},matchMedia:()=>({matches:true})};ctx.window=ctx;
const checks=String.raw`
function supply(){
 assert.equal(G.bag.length+count(G.market)+G.players.reduce((s,p)=>s+count(p.banco)+count(p.cesta)+p.installed.filter(c=>c.favFish).length,0),100);
 const cards=[...G.deck,...G.discard,...G.players.flatMap(p=>[...p.hand,...p.kept,...p.pending,...p.installed])];
 if(G.phase==='draft')cards.push(...G.draftPacks.flat(),...G.drafted.flat());
 assert.equal(cards.length,100);assert.equal(new Set(cards.map(c=>c.id)).size,100);
}
startGame({n:4,name:'Test',seed:20261003,difficulty:'normal',humanBot:false});
assert(G.players.every(p=>p.coins===15));assert.equal(count(G.market),28);assert(veneziaRules());assert.equal(handSize(),6);
for(let rank=1;rank<=5;rank++)assert.equal(auctionPrice(rank),rank===1?3:rank===2?2:1);
assert.equal(auctionPurchaseDescription({installed:[]},1),'Compra per primo a 3 Ducati per pesce');
assert.equal(auctionPurchaseDescription({installed:[]},3),'Compra a 1 Ducato per pesce');
beginDraft();assert.equal(G.phase,'asta');assert.equal(G.players[0].hand.length,6);supply();
// Old saves have no rule version and retain their original economy.
startGame({n:2,name:'Test',seed:1,difficulty:'normal',humanBot:false,rulesVersion:5});
const old=JSON.parse(encodeGame(G));delete old.rulesVersion;G=decodeGame(JSON.stringify(old));
assert(!veneziaRules());assert.equal(handSize(),5);assert.equal(auctionPrice(1),1);assert.equal(count(G.market),12);beginDraft();assert.equal(G.phase,'draft');
let mornings=[],auctions=[];
const beforeDraft=startDraft;startDraft=function(){if(veneziaRules())mornings.push({day:G.day,fish:count(G.market)});return beforeDraft()};
const beforeAuction=nextAuction;nextAuction=function(){if(veneziaRules()&&G.auctionIndex===-1)auctions.push({day:G.day,order:[...G.aOrder],cards:G.drafted.map(p=>p.length)});return beforeAuction()};
const beforeFinish=finishDay;finishDay=function(){if(veneziaRules())for(const p of G.players){assert.equal(p.bilanciaTot,0);assert.equal(p.today.bilancia.length,0)}return beforeFinish()};
for(const n of [2,3,4,5])for(let seed=1;seed<=20;seed++){
 mornings=[];auctions=[];const {G:game}=window.__pescaria.simulate({n,seed:seed*193+n,difficulty:'normal'});
 assert(game.finished);assert(game.players.every(p=>p.coins>=0));supply();assert.equal(mornings.length,4);assert.equal(auctions.length,4);
 for(const d of mornings)assert.equal(d.fish,7*n);
 for(const d of auctions){assert.deepEqual(d.order,d.day%2?FISH:[...FISH].reverse());assert(d.cards.every(c=>c===d.cards[0]&&c<=6));if(d.day===1)assert(d.cards.every(c=>c===6))}
 for(const p of G.players)assert.equal(p.bilanciaTot,bilanciaIncome(p).reduce((s,x)=>s+x.v,0));
 const scores=G.players.map(p=>p.coins);G=decodeGame(encodeGame(G));finishGame();assert.deepEqual(G.players.map(p=>p.coins),scores,'Final income cannot be paid twice after loading');
}
// The Congrega uses the eight cards observed in Venezia, with original image identities.
startGame({n:2,name:'Test',seed:1,difficulty:'normal',humanBot:false,congrega:'apprendista'});
assert.equal(G.congregaDeck.length,8);assert.equal(G.congregaDeck.filter(c=>c.bid===2).length,2);assert(!G.congregaDeck.some(c=>c.bid>2));assert.equal(count(G.market),14);
// Walk the new tutorial with save/reload and Back at each step.
G=null;startTutorial();assert.equal(G.tutorial.version,5);assert.equal(count(G.market),14);
function act(step){
 if(!step.action)tutorialNext();
 else if(step.button)tutorialDo();
 else if(step.action==='addBidCoin')addBidCoin({currentTarget:{getBoundingClientRect:()=>({left:0,top:0,width:1,height:1})}});
 else window[step.action](...(step.args||[]));
}
let steps=0;
while(!tutorialStep().done){
 assert(++steps<80);supply();G=decodeGame(encodeGame(G));
 const before=encodeGame(G),step=tutorialStep(),index=G.tutorial.step;act(step);
 assert.equal(G.tutorial.step,index+1,'Tutorial step '+index+' '+step.title);const after=encodeGame(G);
 tutorialBack();assert.deepEqual(G,decodeGame(before));act(step);assert.deepEqual(G,decodeGame(after));
}
supply();assert.equal(G.day,2);assert.equal(G.players[0].coins,17);assert.equal(G.players[0].orders,3);assert.equal(G.players[0].bilanciaTot,0);assert.deepEqual(G.players[0].kept.map(c=>c.id),[18]);assert.equal(G.players[0].cesta.Polpi,1);
console.log('Venezia: prezzi, distribuzione, alternanza, bonus finali, vecchi salvataggi, 80 partite e tutorial completo verificati.');
`;
require('node:vm').runInNewContext(source.replace(/\}\)\(\);\s*$/,checks+'\n})();'),ctx);
