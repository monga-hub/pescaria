// Monte Carlo contro la strategia precedente, stessi semi e posti alternati.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {Worker,isMainThread,parentPort,workerData}=require('node:worker_threads');
const root=path.join(__dirname,'..'),total=20;
if(isMainThread){
  const rows=[];
  Promise.all(Array.from({length:4},(_,slot)=>new Promise((resolve,reject)=>{const w=new Worker(__filename,{workerData:slot});w.on('message',x=>{rows.push(...x);resolve()});w.on('error',reject);w.on('exit',code=>{if(code)reject(Error('worker '+slot+' '+code))})}))).then(()=>{
    const avg=k=>+(rows.reduce((n,x)=>n+x[k],0)/rows.length).toFixed(2);
    const wins=rows.filter(x=>x.smartWin).length;
    console.log(JSON.stringify({games:rows.length,smartWins:wins,smartScore:avg('smartScore'),baseScore:avg('baseScore'),smartContracts:avg('smartContracts'),baseContracts:avg('baseContracts')},null,2));
    assert(wins>=12,`L'IA Monte Carlo vince solo ${wins} partite su ${total} contro la strategia base`);
  }).catch(e=>{console.error(e);process.exitCode=1});
}else{
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8'),source=html.match(/<script>\s*([\s\S]*?)<\/script>/)?.[1],agent=fs.readFileSync(path.join(__dirname,'monte-carlo-agent.js'),'utf8');
  assert(source,'Motore del Laboratorio mancante');
  const ctx={console,structuredClone,__PESCARIA_HEADLESS:true,addEventListener(){},setTimeout(){return 1},clearTimeout(){},localStorage:{getItem(){return null},setItem(){}},document:{getElementById(){return{innerHTML:''}},addEventListener(){}},matchMedia:()=>({matches:false})};ctx.window=ctx;
  const route=`let smartSeats=new Set([0,2]);const smartBid=botBid,smartBuy=botBuy;
botBid=function(p,f,seen){return smartSeats.has(p.id)?smartBid(p,f,seen):originalBid(p,f,seen)};
botBuy=function(p,f,price,rank){return smartSeats.has(p.id)?smartBuy(p,f,price,rank):originalBuy(p,f,price,rank)};
window.__setSmartSeats=ids=>{smartSeats=new Set(ids)};`;
  vm.runInNewContext(source.replace(/\}\)\(\);\s*$/,agent+'\n'+route+'\n})();'),ctx);
  const base={tieredPricing:false,winnerPricing:true,reverseRankPricing:false,winnerPrice:1,otherPrice:2,startCoins:12,fishPerPlayer:6,handSize:5,classicDraft:true,mandatoryBid:false,simultaneousBids:false,contractOnlyCoins:false,contractChoice:false,chooseEndDayUpgrades:false,installRemainingCards:false,categoryBonusPerUpgrade:1,bilanciaCatchup:false,deferMerchantIncome:false,marketSetBonus:false,merchantCardValue:2,auctionLoserChoice:false,auctionCardChoice:false,auctionContractsVariant:false,auctionUpgradeOnNoFish:false,lastTakesWinningBid:false,limitMerchantIncome:false,depth:6,samples:6,aggression:1};
  const rows=[];
  for(let i=workerData;i<total;i+=4){const smart=i%2?[1,3]:[0,2],smartSet=new Set(smart);ctx.__setSmartSeats(smart);
    const {G,ranking}=ctx.__pescaria.simulate({n:4,seed:20260929+i*7919+52,difficulty:'normal',simConfig:base});
    if(!G.finished)throw Error('incomplete '+i);
    const group=flag=>G.players.filter(p=>smartSet.has(p.id)===flag),mean=(a,f)=>a.reduce((n,x)=>n+f(x),0)/a.length;
    rows.push({smartWin:smartSet.has(ranking[0].id),smartScore:mean(group(true),p=>p.coins),baseScore:mean(group(false),p=>p.coins),smartContracts:mean(group(true),p=>p.orders),baseContracts:mean(group(false),p=>p.orders)});
  }
  parentPort.postMessage(rows);
}
