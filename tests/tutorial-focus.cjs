const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
const source=html.match(/<script>\s*([\s\S]*?)<\/script>/)[1];
const context={assert,console,__PESCARIA_HEADLESS:true,addEventListener(){},document:{getElementById:()=>({}),addEventListener(){}},matchMedia:()=>({matches:true})};context.window=context;
vm.runInNewContext(source.replace(/\}\)\(\);\s*$/,String.raw`
startTutorial(4);G.tutorial.step=5;tutorialDo();
let card=null,rebuilds=0;
const dock={querySelector:()=>card,set innerHTML(html){
  rebuilds++;card=html.includes('tutorial-explained')?{highlight:'',transform:'raised',querySelector(){return{remove:()=>this.highlight=''}},insertAdjacentHTML(_,value){this.highlight=value}}:null;
}};
const fan=(mode='draft')=>G.draftPacks[0].map(c=>cardHtml(c,mode)).join('');
assert.equal(renderHandFan(dock,fan()),true);const original=card;
for(const step of [7,8,9,10,11,12,11,10,9,8,7,6]){
  G.tutorial.step=step;
  assert.equal(renderHandFan(dock,fan()),false,'Do not replay the hand animation on lesson '+step);
  assert.equal(card,original,'Keep the same live card');assert.equal(card.transform,'raised');
  const part=tutorialStep().part;
  if(part)assert(card.highlight.includes('focus-'+part));else assert.equal(card.highlight,'');
}
assert.equal(rebuilds,1,'Forward and Back only change the highlighted symbol');
assert.equal(renderHandFan(dock,fan('bid')),true,'A changed card action must rebuild the hand');
G.tutorial.step=15;assert.equal(renderHandFan(dock,fan()),true,'A different explanation must refresh the hand');
assert.equal(renderHandFan(dock,fan()),true,'Normal hands retain their animations');
console.log('Tutorial: stessa carta ferma, evidenza avanti/indietro e cambio mano OK');
})();`),context);
