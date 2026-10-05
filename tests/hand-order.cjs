const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8').match(/<script>\s*([\s\S]*?)<\/script>/)[1];
const ctx={assert,console,__PESCARIA_HEADLESS:true,addEventListener(){},setTimeout(){return 1},clearTimeout(){},document:{getElementById:()=>({}),addEventListener(){}},matchMedia:()=>({matches:false})};ctx.window=ctx;
vm.runInNewContext(source.replace(/\}\)\(\);\s*$/,String.raw`
startGame({n:2,name:'Test',seed:84,humanBot:false});beginDraft();G.handReordering=true;
const initial=activePlayer().hand.map(c=>c.id),other=G.players[1].hand.map(c=>c.id),cash=activePlayer().coins;
assert(reorderHandCard(initial[0],initial.at(-1)));assert.deepEqual(activePlayer().hand.map(c=>c.id),initial.slice(1).concat(initial[0]));
G=decodeGame(encodeGame(G));assert.deepEqual(activePlayer().hand.map(c=>c.id),initial.slice(1).concat(initial[0]));
assert.equal(activePlayer().coins,cash);assert.deepEqual(G.players[1].hand.map(c=>c.id),other);
assert(!reorderHandCard(-1,initial[0]));
G.handoff=true;assert(!reorderHandCard(initial[0],initial[1]));G.handoff=false;
G.overlay='summary';assert(!reorderHandCard(initial[0],initial[1]));G.overlay=null;
G.tutorial={};assert(!reorderHandCard(initial[0],initial[1]));G.tutorial=null;
G.handReordering=false;
// Exercise the same pointer path for mouse, touch and pen; no click may play a card.
const handlers={};let captured=null,focused=null,rendered=0,pending=null;
window.setTimeout=fn=>{pending=fn;return 1};window.clearTimeout=()=>{pending=null};
function hold(){const fn=pending;assert(fn,'Long press is pending');pending=null;fn()}
renderBoard=()=>{rendered++};
function cardNode(id,i){const classes=new Set();return{isConnected:true,dataset:{cardId:String(id)},style:{getPropertyValue:()=>String(i*50),translate:''},classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),toggle:(x,on)=>on?classes.add(x):classes.delete(x)},closest:()=>nodes.find(c=>c.dataset.cardId===String(id)),focus(){focused=id}}}
let nodes=activePlayer().hand.map((c,i)=>cardNode(c.id,i));
const host={classList:{contains:()=>false,add(){},remove(){}},insertAdjacentHTML(){},querySelectorAll:()=>nodes,querySelector:selector=>selector==='.hand-cards'?{getBoundingClientRect:()=>({left:0,width:400})}:nodes.find(c=>selector.includes('"'+c.dataset.cardId+'"')),addEventListener:(name,fn)=>handlers[name]=fn,setPointerCapture:id=>{captured=id},hasPointerCapture:id=>captured===id,releasePointerCapture:()=>{captured=null;handlers.lostpointercapture()}};
setupHandReorder(host);
function event(type,x=200){return{pointerType:type,pointerId:7,isPrimary:true,button:0,clientX:x,clientY:200,target:nodes[0],detail:1,preventDefault(){this.prevented=true},stopImmediatePropagation(){this.stopped=true}}}
for(const type of ['mouse','touch','pen']){
 nodes=activePlayer().hand.map((c,i)=>cardNode(c.id,i));const moved=Number(nodes[0].dataset.cardId);
 handlers.pointerdown(event(type));assert.equal(captured,null);hold();assert.equal(captured,7);
 handlers.pointermove(event(type,550));handlers.pointerup(event(type,550));
 assert.equal(captured,null);assert.equal(activePlayer().hand.at(-1).id,moved);
 const click=event(type);handlers.click(click);assert(click.prevented&&click.stopped);
}
assert.equal(rendered,3);
nodes=activePlayer().hand.map((c,i)=>cardNode(c.id,i));const before=encodeGame(G);
handlers.pointerdown(event('touch'));hold();handlers.pointermove(event('touch',550));handlers.pointercancel();handlers.pointerup(event('touch',550));assert.equal(encodeGame(G),before,'Cancelled drags leave the hand unchanged');
const first=Number(nodes[0].dataset.cardId),key={...event('keyboard'),altKey:true,key:'ArrowRight'};handlers.keydown(key);assert(key.prevented);assert.equal(activePlayer().hand[1].id,first);assert.equal(focused,first);
const enter={...event('keyboard'),key:'Enter'};handlers.keydown(enter);assert(!enter.stopped,'Enter keeps its usual card action');
G.handReordering=false;const normal=event('mouse');handlers.pointerdown(normal);handlers.click(normal);assert(!normal.prevented,'Normal clicks still play after leaving ordering mode');
handlers.pointerup(normal);assert.equal(pending,null,'A short tap cancels the timer');
handlers.pointerdown(event('touch'));const browse=event('touch',230);handlers.pointermove(browse);assert.equal(pending,null);assert(!browse.prevented,'Browsing before the hold remains unchanged');
handlers.pointerdown(event('touch'));hold();const scroll={...event('touch'),touches:[{}]};handlers.touchmove(scroll);assert(scroll.prevented&&scroll.stopped,'An armed drag cannot become a scroll or upward selection');handlers.pointercancel();
handlers.pointerdown(event('touch'));const second={...event('touch'),isPrimary:false,pointerId:8};handlers.pointerdown(second);assert.equal(pending,null,'Multitouch cancels pending hold');
handlers.pointerdown(event('mouse'));handlers.pointerleave();assert.equal(pending,null,'Leaving the hand before the hold cancels it');
console.log('Riordino con pressione prolungata: mouse, touch, penna, tastiera, annullamento, isolamento giocatori e salvataggio verificati.');
})();`),ctx);
