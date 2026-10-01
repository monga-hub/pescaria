// node laboratorio/experiments/check-report-stats.js
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../laboratorio.js'),'utf8');
const helper=source.slice(source.indexOf('function placementStats('),source.indexOf('\nfunction readConfig('));
const context={mean:values=>values.reduce((total,n)=>total+n,0)/values.length};
vm.createContext(context);
vm.runInContext(helper,context);
const games=[
  {players:[{id:0,coins:20},{id:1,coins:10}]},
  {players:[{id:1,coins:22},{id:0,coins:12}]},
  {players:[{id:0,coins:18},{id:1,coins:11}]}
];
const rows=context.placementStats(games,2);
assert.deepEqual(JSON.parse(JSON.stringify(rows)),[
  [{count:2,coins:19},{count:1,coins:12}],
  [{count:1,coins:22},{count:2,coins:10.5}]
]);
console.log('Piazzamenti e Ducati medi: OK');
