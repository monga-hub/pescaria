// node laboratorio/experiments/check-draft-choice.js
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..');
let source=fs.readFileSync(path.join(root,'index.html'),'utf8').match(/<script>\s*([\s\S]*?)<\/script>/)?.[1];
assert(source);
source=source.replace("else while(G.phase==='draft')draftStep(null);","else if(!window.__pauseDraft)while(G.phase==='draft')draftStep(null);");
const agent=fs.readFileSync(path.join(__dirname,'monte-carlo-agent.js'),'utf8');
const ctx={console,structuredClone,__PESCARIA_HEADLESS:true,__pauseDraft:true,addEventListener(){},setTimeout(){return 1},clearTimeout(){},localStorage:{getItem(){return null},setItem(){}},document:{getElementById(){return{innerHTML:''}},addEventListener(){}},matchMedia:()=>({matches:false})};ctx.window=ctx;
const audit=`window.__choice=()=>{startGame({n:4,seed:20261153,difficulty:'normal',humanBot:true,simConfig:{...LAB_DEFAULT_RULES,classicDraft:true}});G.market=inv();G.market.Branzini=8;return botDraft(G.players[0],[CARDS.find(c=>c.id===14),CARDS.find(c=>c.id===43)]).id};
window.__marketCase=()=>{startGame({n:4,seed:20261153,difficulty:'normal',humanBot:true,simConfig:{...LAB_DEFAULT_RULES,classicDraft:true}});const p=G.players[0];p.hand=[22,12,11].map(id=>CARDS.find(c=>c.id===id));p.banco={Polpi:1,Gamberi:1,Molluschi:0,Branzini:1,Sardine:1};p.cesta=inv();G.phase='pubblico';botMarket(p);return p.orders};`;
vm.runInNewContext(source.replace(/\}\)\(\);\s*$/,agent+'\n'+audit+'\n})();'),ctx);
assert.equal(ctx.__choice(),43,'Il draft deve preferire il contratto realizzabile anche se non è la prima carta');
assert.equal(ctx.__marketCase(),2,'Il mercato deve chiudere due contratti invece di consumare i pesci per uno solo');
console.log('IA: draft sensibile ai pesci e mercato con il massimo numero di contratti');
