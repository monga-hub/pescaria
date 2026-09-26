const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
const source=html.match(/<script>\s*([\s\S]*?)<\/script>/)[1];
assert(!/#floatingHand \.card\{touch-action:none/.test(html),'Do not override touch behavior across the fan');
const context={assert,console,__PESCARIA_HEADLESS:true,addEventListener(){},document:{getElementById:()=>({}),addEventListener(){}},matchMedia:()=>({matches:false})};
context.window=context;
vm.runInNewContext(source.replace(/\}\)\(\);\s*$/,String.raw`
const events={},host={classList:{contains:()=>false},addEventListener:(name,fn)=>events[name]=fn};
setupHandSwipe(host);
let selections=0,action=()=>{},opened=true,eligible=true;
const card={isConnected:true,classList:{contains:()=>opened},click(){selections++;action()}},target={closest:()=>opened&&eligible?card:null};
const point=(x,y,id=1)=>({clientX:x,clientY:y,identifier:id});
const event=(touches,changedTouches=[],eventTarget=target)=>({touches,changedTouches,target:eventTarget,preventDefault(){this.prevented=true}});
function gesture(dx,dy){events.touchstart(event([point(100,200)]));const move=event([point(100+dx,200+dy)]);events.touchmove(move);const end=event([],[point(100+dx,200+dy)]);events.touchend(end);return{move,end}}
function click(detail=1){const e={detail,preventDefault(){this.prevented=true},stopImmediatePropagation(){this.stopped=true}};events.click(e);return e}
opened=false;let result=gesture(0,-80);assert.equal(selections,0);assert(!result.move.prevented&&!result.end.prevented,'Unhighlighted cards keep original touch behavior');
events.touchstart(event([point(100,200)]));opened=true;events.touchmove(event([point(100,100)]));events.touchend(event([],[point(100,100)]));assert.equal(selections,0,'Opening after touch starts does not arm a swipe');
for(const [dx,dy] of [[80,-60],[0,80],[90,0],[0,0],[2,-4]]){result=gesture(dx,dy);assert.equal(selections,0);assert(!result.move.prevented&&!result.end.prevented);assert(!click().stopped,'Browsing, holding and taps are unchanged')}
gesture(0,-27);assert.equal(selections,0,'Short upward movement does not select');
result=gesture(8,-28);assert.equal(selections,1);assert(result.move.prevented&&result.end.prevented);assert(click().stopped,'No duplicate click after accepted swipe');assert(!click(0).stopped,'Keyboard and programmatic click still work');
events.pointerdown({pointerType:'mouse'});assert(!click().stopped);
const before=selections;
events.touchstart(event([point(100,200)]));events.touchmove(event([point(100,100)]));opened=false;events.touchend(event([],[point(100,100)]));assert.equal(selections,before+1,'Pointerleave on release does not cancel an already accepted swipe');opened=true;
const stable=selections;
events.touchstart(event([point(100,200)]));opened=false;events.touchmove(event([point(100,100)]));events.touchend(event([],[point(100,100)]));assert.equal(selections,stable,'Losing the preview while moving cancels');opened=true;
events.touchstart(event([point(100,200)]));events.touchcancel();events.touchend(event([],[point(100,100)]));assert.equal(selections,stable);
events.touchstart(event([point(100,200)]));events.touchmove(event([point(100,100),point(120,100,2)]));events.touchend(event([],[point(100,100)]));assert.equal(selections,stable,'Multitouch cancels');
card.isConnected=false;gesture(0,-80);assert.equal(selections,stable);card.isConnected=true;
host.classList.contains=()=>true;gesture(0,-80);assert.equal(selections,stable);host.classList.contains=()=>false;
eligible=false;gesture(0,-80);assert.equal(selections,stable,'Locked or disabled cards cannot be swiped');eligible=true;
events.touchstart(event([point(100,200)],[],{closest:()=>null}));events.touchend(event([],[point(100,200)]));assert(!click().stopped,'Arrow remains tappable');
startGame({n:3,name:'Test',seed:13,difficulty:'normal',humanBot:false});beginDraft();
const chosen=G.draftPacks[0][0];action=()=>pickDraft(chosen.id);gesture(0,-28);
assert.equal(G.drafted[0].length,1);assert.equal(G.drafted[0][0].id,chosen.id);
assert(cardHtml(chosen,'draft',false).includes('draft-lock'));assert(!cardHtml(chosen,'draft',false).includes('data-swipe-select'));
while(G.phase==='draft')pickDraft(G.draftPacks[0][0].id);
const bid=activePlayer().hand[0];action=()=>chooseBid(bid.id);gesture(0,-28);assert.equal(G.selectedBid,bid.id);
assert(cardHtml(bid,'bid').includes('data-swipe-select'));assert(!cardHtml(bid,'market').includes('data-swipe-select'));
// The original animation still opens and browses without direction filters.
function fanNode(x=0){const classes=new Set(),listeners={};return{listeners,dataset:{},style:{pointerEvents:'auto',setProperty(){},getPropertyValue:k=>k==='--x'?String(x):'0'},classList:{add:c=>classes.add(c),remove:c=>classes.delete(c),contains:c=>classes.has(c),toggle:(c,on)=>on?classes.add(c):classes.delete(c)},addEventListener:(type,fn)=>listeners[type]=fn,getBoundingClientRect:()=>({left:0,width:600,top:300,height:300,bottom:600})}}
const fan=fanNode(),fanCards=[fanNode(-100),fanNode(),fanNode(100)];
window.gsap={set(){},fromTo(){},to(){},quickTo:()=>()=>{}};window.requestAnimationFrame=fn=>{fn();return 1};
animateHand({querySelector:()=>fan,querySelectorAll:()=>fanCards});
fanCards[0].listeners.pointerenter({pointerType:'touch'});assert.equal(fan.dataset.open,0);assert(fanCards[0].classList.contains('gsap-open'));
fan.listeners.pointermove({pointerType:'touch',clientX:400,clientY:580});assert.equal(fan.dataset.open,2,'Original fan browsing has no added gesture gates');
fan.listeners.pointerleave();assert.equal(fan.dataset.open,undefined);
console.log('Sfoglio originale e swipe solo su carta evidenziata: OK');
})();`),context);
