// node laboratorio/experiments/check-final-contracts.js
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const source=fs.readFileSync(path.join(root,'index.html'),'utf8').match(/<script>\s*([\s\S]*?)<\/script>/)[1];
const telemetry=fs.readFileSync(path.join(__dirname,'lab-telemetry.js'),'utf8');
const ctx={assert,console,structuredClone,__PESCARIA_HEADLESS:true,addEventListener(){},setTimeout(){return 1},clearTimeout(){},localStorage:{getItem(){return null},setItem(){}},document:{getElementById(){return{innerHTML:''}},addEventListener(){}},matchMedia:()=>({matches:false}),location:{search:'',replace(){throw Error('Unexpected invalid rules')}},alert(){throw Error('Unexpected alert')}};ctx.window=ctx;
const check=`
window.__check=()=>{
 for(const toggle of [undefined,false,true])for(const day of [1,2,3,4])for(const mode of ['both','coins','upgrade']){
  const c={id:1001,cat:'A',name:'test',up:'Banco Ampliato',value:5,recipe:{Branzini:1}};
  const p={id:0,name:'test',coins:20,orders:0,installed:[{cat:'A'},{cat:'A'},{cat:'C',up:'Favorito della Gilda',favFish:'Branzini'},{cat:'B',up:'Maestro della Pescaria'}],pending:[],hand:[c],banco:{...inv(),Branzini:1},cesta:inv(),today:{income:0,contracts:[]}};
  G={day,simConfig:{contractChoice:mode!=='both',doubleFinalContracts:toggle},bag:[],discard:[],rng:new RNG(1),log:[],lab:{contracts:[]}};
  const mult=toggle&&day===4?2:1,gain=mode==='upgrade'?0:9*mult;
  assert.equal(payout(p,c),9*mult);
  assert(completeContract(p,c,mode==='upgrade'?'upgrade':'coins'));
  assert.equal(p.coins,20+gain);assert.equal(p.today.income,gain);assert.equal(p.today.contractIncome[c.id],gain);
  assert.equal(p.catTot,mode==='upgrade'?0:2*mult);assert.equal(p.favTot,mode==='upgrade'?0:2*mult);
  assert.equal(G.lab.contracts[0].gain,gain);assert.equal(G.lab.contracts[0].foregone,9*mult);
  assert.equal(p.pending.length,mode==='coins'?0:1);assert.equal(p.orders,1);assert.equal(p.banco.Branzini,0);
  assert.equal(bilanciaIncome(p)[0].v,4);assert.equal(costOf(p,2,3),6);
 }
 const old={...LAB_DEFAULT_RULES,startCoins:17};delete old.doubleFinalContracts;
 location.search='?rules='+encodeURIComponent(JSON.stringify(old));assert.equal(selectedLabRules().doubleFinalContracts,false);assert.equal(selectedLabRules().startCoins,17);
 location.search='?rules='+encodeURIComponent(JSON.stringify({...old,doubleFinalContracts:true}));assert.equal(selectedLabRules().doubleFinalContracts,true);
 const off=window.__pescaria.simulate({n:4,seed:20261003,humanBot:true,difficulty:'normal',simConfig:{...LAB_DEFAULT_RULES,doubleFinalContracts:false}}).G;
 const on=window.__pescaria.simulate({n:4,seed:20261003,humanBot:true,difficulty:'normal',simConfig:{...LAB_DEFAULT_RULES,doubleFinalContracts:true}}).G;
 assert(off.finished&&on.finished);assert.equal(on.lab.days.length,4);assert.deepEqual(off.lab.days.slice(0,3),on.lab.days.slice(0,3));
 assert(on.lab.contracts.filter(c=>c.day===4).every(c=>c.gain===c.foregone&&c.gain%2===0));
 return 'Toggle: 36 casi di ricompensa, bonus, rendite, costi, vecchi collegamenti e due partite complete verificati.';
};`;
new Function(...Object.keys(ctx),source.replace(/\}\)\(\);\s*$/,telemetry+'\n'+check+'\n})();'))(...Object.values(ctx));
console.log(ctx.__check());
