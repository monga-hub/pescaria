const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8').match(/<script>\s*([\s\S]*?)<\/script>/)[1];
const context={assert,console,__PESCARIA_HEADLESS:true,addEventListener(){},document:{getElementById:()=>({}),addEventListener(){}},matchMedia:()=>({matches:false})};
context.window=context;
vm.runInNewContext(source.replace(/\}\)\(\);\s*$/,String.raw`
let preview=null,now=0;Date.now=()=>now;
const events={},host={querySelector:()=>preview,classList:{contains:()=>false},addEventListener:(name,fn)=>events[name]=fn};
setupHandSwipe(host);
let selections=0,action=()=>{};
const card={isConnected:true,hasAttribute:()=>true,click(){selections++;action()}},target={closest:()=>card};
const point=(x,y,id=1)=>({clientX:x,clientY:y,identifier:id});
const event=(touches,changedTouches=[],eventTarget=target)=>({touches,changedTouches,target:eventTarget,preventDefault(){this.prevented=true}});
function gesture(dx,dy){events.touchstart(event([point(100,200)]));events.touchmove(event([point(100+dx,200+dy)]));events.touchend(event([],[point(100+dx,200+dy)]))}
function click(detail=1){const e={detail,preventDefault(){this.prevented=true},stopImmediatePropagation(){this.stopped=true}};events.click(e);return e}
for(const [dx,dy] of [[0,-30],[80,-60],[0,80],[90,0]]){gesture(dx,dy);assert.equal(selections,0);assert(click().stopped,'Dragging must not fall through to tap selection')}
gesture(2,-4);assert.equal(selections,0);assert(!click().stopped,'A tap keeps the existing click action');
gesture(8,-70);assert.equal(selections,1);assert(click().stopped,'No duplicate click after swipe');assert(!click(0).stopped,'Keyboard/programmatic clicks remain available');
events.pointerdown({pointerType:'mouse'});assert(!click().stopped,'Mouse still works after touch');
const before=selections;
events.touchstart(event([point(100,200)]));events.touchcancel();events.touchend(event([],[point(100,100)]));assert.equal(selections,before);
events.touchstart(event([point(100,200)]));events.touchmove(event([point(100,100),point(120,100,2)]));events.touchend(event([],[point(100,100)]));assert.equal(selections,before,'Multitouch cancels');
card.isConnected=false;gesture(0,-80);assert.equal(selections,before,'A rerendered card cannot select');card.isConnected=true;
host.classList.contains=()=>true;gesture(0,-80);assert.equal(selections,before,'Folded hand cannot select');host.classList.contains=()=>false;
events.touchstart(event([point(100,200)],[],{closest:()=>null}));events.touchend(event([],[point(100,200)]));assert(!click().stopped,'Hand arrow remains tappable');
// Holding previews without selecting on release, and browsing picks the visible card.
events.touchstart(event([point(100,200)]));now+=500;events.touchend(event([],[point(100,200)]));assert(click().stopped,'Release after holding must not choose the card');
let browsed=0;const nextCard={isConnected:true,hasAttribute:()=>true,click(){browsed++}};
events.touchstart(event([point(100,200)]));preview=nextCard;events.touchmove(event([point(180,200)]));events.touchmove(event([point(180,125)]));events.touchend(event([],[point(180,125)]));assert.equal(browsed,1,'Browse then swipe selects the card being previewed');preview=null;
card.hasAttribute=()=>false;gesture(0,-80);assert.equal(selections,before,'Locked cards can be browsed but never selected');card.hasAttribute=()=>true;
startGame({n:3,name:'Test',seed:13,difficulty:'normal',humanBot:false});beginDraft();
const chosen=G.draftPacks[0][0];action=()=>pickDraft(chosen.id);gesture(0,-70);
assert.equal(G.drafted[0].length,1);assert.equal(G.drafted[0][0].id,chosen.id);
assert(cardHtml(chosen,'draft',false).includes('draft-lock'));assert(!cardHtml(chosen,'draft',false).includes('data-swipe-select'));
while(G.phase==='draft')pickDraft(G.draftPacks[0][0].id);
const bid=activePlayer().hand[0];action=()=>chooseBid(bid.id);gesture(0,-70);assert.equal(G.selectedBid,bid.id);
assert(cardHtml(bid,'bid').includes('data-swipe-select'));
assert(!cardHtml(bid,'market').includes('data-swipe-select'),'Do not swipe to spend or complete contracts');
// Exercise the real fan handlers with touch pointers, not just the swipe detector.
function fanNode(x=0){const classes=new Set(),listeners={};return{listeners,dataset:{},style:{pointerEvents:'auto',setProperty(){},getPropertyValue:k=>k==='--x'?String(x):'0'},classList:{add:c=>classes.add(c),remove:c=>classes.delete(c),contains:c=>classes.has(c),toggle:(c,on)=>on?classes.add(c):classes.delete(c)},addEventListener:(type,fn)=>listeners[type]=fn,getBoundingClientRect:()=>({left:0,width:600,top:300,height:300,bottom:600})}}
const fan=fanNode(),fanCards=[fanNode(-100),fanNode(),fanNode(100)];
window.gsap={set(){},fromTo(){},to(){},quickTo:()=>()=>{}};window.requestAnimationFrame=fn=>{fn();return 1};
animateHand({querySelector:()=>fan,querySelectorAll:()=>fanCards});
fanCards[0].listeners.pointerenter({pointerType:'touch'});assert.equal(fan.dataset.open,0,'Touch and hold opens the card');assert(fanCards[0].classList.contains('gsap-open'));
fan.listeners.pointerdown({pointerType:'touch',clientX:200,clientY:580});
fan.listeners.pointermove({pointerType:'touch',clientX:220,clientY:520});assert.equal(fan.dataset.open,0,'Upward movement keeps the selected preview');
fan.listeners.pointermove({pointerType:'touch',clientX:400,clientY:580});assert.equal(fan.dataset.open,2,'Dragging sideways browses the fan');assert(fanCards[2].classList.contains('gsap-open'));
fan.listeners.pointerleave();assert.equal(fan.dataset.open,undefined,'Releasing the preview closes it');
console.log('Swipe: draft, asta, tocchi, sfoglio touch, ingrandimento, annullamento e nessuna doppia selezione OK');
})();`),context);
