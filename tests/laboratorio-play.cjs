const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.join(__dirname,'..');
const original=fs.readFileSync(path.join(root,'index.html'),'utf8');
const lab=fs.readFileSync(path.join(root,'laboratorio/index.html'),'utf8');
assert(original.includes("SAVE_PREFIX='pescaria.save.'"));
const source=lab.match(/<script>\s*([\s\S]*?)<\/script>/)[1];
const storage=new Map();
const context={console,__PESCARIA_HEADLESS:true,addEventListener(){},setTimeout(){return 1},clearTimeout(){},localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)},document:{getElementById:()=>({innerHTML:''}),addEventListener(){}},matchMedia:()=>({matches:false})};
context.window=context;
const checks=`
assert.equal(SAVE_PREFIX,'pescaria.laboratorio.save.');
for(const seed of [1,2,3]){
  const result=window.__pescaria.simulate({n:4,seed,simConfig:LAB_DEFAULT_RULES});
  assert(result.G.finished);
  assert.equal(result.G.players.length,4);
  assert.equal(decodeGame(encodeGame(result.G)).simConfig.handSize,7);
}
assert.match(upgradeDescription('Maestro delle Aste'),/A fine partita guadagni 1 Ducato/);
G.simConfig={...LAB_DEFAULT_RULES,deferMerchantIncome:false,marketSetBonus:true,marketSetBase:10,marketSetThreshold:3};
assert.match(upgradeDescription('Maestro delle Aste'),/10 Ducati per ogni gruppo di 3/);
startGame({n:2,roster:[{name:'Umano',human:true,character:0},{name:'Bot',human:false,character:1}],seed:42,simConfig:LAB_DEFAULT_RULES});
const favorite=CARDS.find(c=>c.up==='Favorito della Gilda');
G.players[0].pending.push(favorite);
startEndOfDay();
assert.equal(G.overlay,'favorite');
pickFavorite('Molluschi');
assert.equal(G.overlay,'summary');
assert.equal(favorite.favFish,'Molluschi');
console.log('Partita Laboratorio: regole e salvataggi separati OK');
`;
context.assert=assert;
vm.runInNewContext(source.replace(/\}\)\(\);\s*$/,checks+'\n})();'),context);
