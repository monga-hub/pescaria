const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8').match(/<script>\s*([\s\S]*?)<\/script>/)[1];
const context={assert,console,__PESCARIA_HEADLESS:true,addEventListener(){},document:{getElementById:()=>({}),addEventListener(){}},matchMedia:()=>({matches:true})};
context.window=context;
vm.runInNewContext(source.replace(/\}\)\(\);\s*$/,String.raw`
const events={},host={classList:{contains:()=>false},addEventListener:(name,fn)=>events[name]=fn};
setupHandSwipe(host);
let selections=0,action=()=>{};
const card={isConnected:true,click(){selections++;action()}},target={closest:()=>card};
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
startGame({n:3,name:'Test',seed:13,difficulty:'normal',humanBot:false});beginDraft();
const chosen=G.draftPacks[0][0];action=()=>pickDraft(chosen.id);gesture(0,-70);
assert.equal(G.drafted[0].length,1);assert.equal(G.drafted[0][0].id,chosen.id);
assert(cardHtml(chosen,'draft',false).includes('draft-lock'));assert(!cardHtml(chosen,'draft',false).includes('data-swipe-select'));
while(G.phase==='draft')pickDraft(G.draftPacks[0][0].id);
const bid=activePlayer().hand[0];action=()=>chooseBid(bid.id);gesture(0,-70);assert.equal(G.selectedBid,bid.id);
assert(cardHtml(bid,'bid').includes('data-swipe-select'));
assert(!cardHtml(bid,'market').includes('data-swipe-select'),'Do not swipe to spend or complete contracts');
console.log('Swipe: draft, asta, tocchi, annullamento, multitouch e nessuna doppia selezione OK');
})();`),context);
