// node laboratorio/experiments/check-bilancia-recovery.cjs [games=100] [output.json] [base,bilancia,bilancia-flat2,separated-only]
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {Worker,isMainThread,parentPort,workerData}=require('node:worker_threads');
const root=path.join(__dirname,'..'),count=Number(process.argv[2]||100);
const slots=Math.min(8,require('node:os').availableParallelism());
assert(Number.isInteger(count)&&count>0);
const variants=(process.argv[4]||'base,bilancia').split(',');
const ruleVariant=v=>v.replace(/^winner3/,'base').replace(/-day(?:4|34)(?:contracts)?x2$/,'');
assert(variants.length&&new Set(variants).size===variants.length&&variants.every(v=>['base','bilancia','bilancia-flat2','separated-only','base-day4x2','base-day34x2','base-day4contractsx2','winner3-day4contractsx2'].includes(v)));
if(isMainThread){
  const saved=[];
  if(process.argv[3])for(let slot=0;slot<8;slot++){
    const file=process.argv[3]+'.part-'+slot+'.jsonl';
    if(fs.existsSync(file))saved.push(...fs.readFileSync(file,'utf8').split('\n').filter(Boolean).map(JSON.parse));
  }
  assert.equal(new Set(saved.map(r=>r.variant+':'+r.index)).size,saved.length);
  for(const r of saved)assert(r.index<count&&variants.includes(r.variant)&&r.seed===20261201+r.index*7919+52);
  Promise.all(Array.from({length:slots},(_,slot)=>new Promise((resolve,reject)=>{
    const worker=new Worker(__filename,{workerData:{slot,saved:saved.filter(r=>r.index%slots===slot)},argv:process.argv.slice(2)});
    worker.on('message',resolve);worker.on('error',reject);worker.on('exit',code=>{if(code)reject(Error('Worker exit '+code))});
  }))).then(parts=>{
    const rows=parts.flat().sort((a,b)=>a.variant.localeCompare(b.variant)||a.index-b.index);
    const summary=Object.fromEntries(variants.map(variant=>{
      const games=rows.filter(r=>r.variant===variant),mean=key=>games.reduce((s,r)=>s+r[key],0)/games.length;
      assert.equal(games.length,count);
      const keys=['contracts','upgrades','gap','changes','last1Wins','last2Wins','last3Wins','nonleader3Wins','last1Top2','awards','shortages','deckShortages','passive','zeroAwards','winnerOrders','lastOrders','winnerPassive','lastPassive'];
      return [variant,Object.fromEntries(keys.map(k=>[k,+mean(k).toFixed(3)]))];
    }));
    const result={date:'2026-10-02',method:`${count} games per variant, matching seed 20261201+i*7919+52; MC depth 6, samples 6. Different decks imply different hands. Daily ties: coins, upgrades, seat.`,summary,rows};
    if(process.argv[3])fs.writeFileSync(process.argv[3],JSON.stringify(result,null,2));
    console.log(JSON.stringify(summary,null,2));
  }).catch(e=>{console.error(e);process.exitCode=1});
}else{
  const source=fs.readFileSync(path.join(root,'index.html'),'utf8').match(/<script>\s*([\s\S]*?)<\/script>/)[1];
  const agent=fs.readFileSync(path.join(__dirname,'monte-carlo-agent.js'),'utf8'),telemetry=fs.readFileSync(path.join(__dirname,'lab-telemetry.js'),'utf8');
  const probe=`
  window.__base=LAB_DEFAULT_RULES;
  const recoveryResolveBilancia=resolveBilanciaQueue;
  resolveBilanciaQueue=function(){
    if(G.simConfig?.__noBilanciaAwards){G.bilanciaQueue=[];return false}
    return recoveryResolveBilancia();
  };
  const recoveryIncome=bilanciaIncome,recoveryValue=botUpgradeValue;
  const lastDayMultiplier=()=>(G.simConfig?.__doubleLastDay&&G.day===4)||(G.simConfig?.__doubleThirdDay&&G.day===3)?2:1;
  bilanciaIncome=function(p,includePending=false){
    const income=recoveryIncome(p,includePending);
    return income.map(x=>({...x,v:(G.simConfig?.__flatBilancia?2:x.v)*(G.simConfig?.__contractsOnlyDouble?1:lastDayMultiplier())}));
  };
  botUpgradeValue=function(p,c){
    let value=G.simConfig?.__flatBilancia&&c.cat==='B'?(4-G.day)*.6+(5-G.day)*2:recoveryValue(p,c);
    const extraDays=Number(!!G.simConfig?.__doubleLastDay)+Number(!!G.simConfig?.__doubleThirdDay&&G.day<=3);
    if(extraDays&&!G.simConfig?.__contractsOnlyDouble&&c.cat==='B')value+=extraDays*(G.simConfig.__flatBilancia?2:2*Math.max(.5,catCount(p,MAESTRO[c.up])+p.pending.filter(x=>x.cat===MAESTRO[c.up]).length));
    return value;
  };
  const recoveryPayout=payout,recoveryContract=completeContract;
  payout=function(p,c){return recoveryPayout(p,c)*lastDayMultiplier()};
  completeContract=function(p,c,reward){
    const before=p.coins,category=p.catTot||0,favorite=p.favTot||0;
    const result=recoveryContract(p,c,reward);
    if(result&&lastDayMultiplier()===2){
      const extra=p.coins-before;p.coins+=extra;p.today.income+=extra;p.today.contractIncome[c.id]+=extra;
      p.catTot+=(p.catTot||0)-category;p.favTot+=(p.favTot||0)-favorite;
    }
    return result;
  };
  window.__checkBilancia=function(){
    G={simConfig:{...LAB_DEFAULT_RULES,winnerPricing:true,winnerPrice:3,otherPrice:1}};
    for(const score of [1,3,4,7,8,10,20])for(const total of [1,2,3,4])for(let rank=1;rank<=total;rank++){
      if(auctionPrice(score,rank,total)!==(rank===1?3:1))throw Error('Winner pays 3, other bidders 1');
    }
    if(costOf({installed:[]},3,3)!==9||costOf({installed:[]},3,1)!==3||costOf({installed:[{up:'Esperienza'}]},3,3)!==7)throw Error('Winner price or discount');
    const card={id:1001,cat:'B',up:'Maestro della Pescaria'},p={id:0,name:'test',installed:[{cat:'A'},{cat:'A'}]};
    G={simConfig:{bilanciaCatchup:true},day:1,bilanciaPiles:{'Maestro della Pescaria':[card]},log:[]};
    if(!installBilancia(p,'Maestro della Pescaria')||bilanciaIncome(p)[0].v!==4)throw Error('Bilancia payout');
    p.installed=p.installed.filter(c=>c.cat==='B');
    if(bilanciaIncome(p)[0].v!==0)throw Error('Empty category payout');
    G.simConfig.__flatBilancia=true;
    if(bilanciaIncome(p)[0].v!==2)throw Error('Flat payout');
    for(const contractsOnly of [false,true])for(const firstDoubleDay of [3,4])for(const day of [1,2,3,4]){
      const client={id:1002,cat:'A',name:'test',up:'Banco Ampliato',value:5,recipe:{Branzini:1}};
      const me={id:0,name:'test',coins:20,orders:0,installed:[{cat:'A'},{cat:'A'},{cat:'C',up:'Favorito della Gilda',favFish:'Branzini'}],pending:[],hand:[client],banco:{...inv(),Branzini:1},cesta:inv(),today:{income:0,contracts:[]}};
      G={day,simConfig:{contractChoice:false,__doubleLastDay:true,__doubleThirdDay:firstDoubleDay===3,__contractsOnlyDouble:contractsOnly},bag:[],rng:new RNG(1),log:[],lab:{contracts:[]}};
      const multiplier=day>=firstDoubleDay?2:1,expected=9*multiplier;
      if(payout(me,client)!==expected||!completeContract(me,client)||me.coins!==20+expected||me.today.income!==expected||me.today.contractIncome[client.id]!==expected||me.pending.length!==1||me.orders!==1||me.banco.Branzini!==0)throw Error('Last day contract payout');
      if(G.lab.contracts[0].gain!==expected)throw Error('Last day telemetry');
      if(me.catTot!==2*multiplier||me.favTot!==2*multiplier)throw Error('Last day bonuses');
      if(costOf(me,2,3)!==6)throw Error('Purchase costs changed');
      me.installed.push(card);
      const rentMultiplier=contractsOnly?1:multiplier;
      if(bilanciaIncome(me)[0].v!==4*rentMultiplier)throw Error('Last day category income');
      G.simConfig.__flatBilancia=true;
      if(bilanciaIncome(me)[0].v!==2*rentMultiplier)throw Error('Last day flat income');
      const extraPayments=contractsOnly?0:5-Math.max(day,firstDoubleDay);
      if(botUpgradeValue(me,card)!==(4-day)*.6+(5-day+extraPayments)*2)throw Error('Future doubled income');
    }
  };`;
  const ctx={console,structuredClone,__PESCARIA_HEADLESS:true,addEventListener(){},setTimeout(){return 1},clearTimeout(){},localStorage:{getItem(){return null},setItem(){}},document:{getElementById(){return{innerHTML:''}},addEventListener(){}},matchMedia:()=>({matches:false})};ctx.window=ctx;
  const runnable=source.replace(/\}\)\(\);\s*$/,agent+'\n'+probe+'\n'+telemetry+'\n})();');
  if(process.env.PESCARIA_NATIVE_CONTEXT==='1')new Function(...Object.keys(ctx),runnable)(...Object.values(ctx));
  else vm.runInNewContext(runnable,ctx);
  ctx.__checkBilancia();
  const rows=workerData.saved,done=new Set(rows.map(r=>r.variant+':'+r.index));
  const checkpoint=process.argv[3]?process.argv[3]+'.part-'+workerData.slot+'.jsonl':null;
  if(checkpoint)fs.writeFileSync(checkpoint,rows.map(r=>JSON.stringify(r)+'\n').join(''));
  for(let index=workerData.slot;index<count;index+=slots)for(const variant of variants){
    if(done.has(variant+':'+index))continue;
    const rules=ruleVariant(variant),simConfig={...ctx.__base,chooseEndDayUpgrades:false,simultaneousBids:false,depth:6,samples:6,aggression:1,bilanciaCatchup:rules!=='base',__noBilanciaAwards:rules==='separated-only',__flatBilancia:rules==='bilancia-flat2',__doubleLastDay:variant.endsWith('x2'),__doubleThirdDay:variant==='base-day34x2',__contractsOnlyDouble:variant.endsWith('day4contractsx2'),...(variant.startsWith('winner3-')?{winnerPricing:true,winnerPrice:3,otherPrice:1}:{})};
    const seed=20261201+index*7919+52,{G,ranking}=ctx.__pescaria.simulate({n:4,seed,difficulty:'normal',simConfig});
    assert(G.finished&&G.lab.days.length===4);
    if(variant.startsWith('winner3-'))for(const a of G.lab.auctions){
      for(const b of a.bids)assert.equal(b.price,b.rank===1?3:1);
      for(const b of a.buys){assert(a.bids.some(x=>x.pid===b.pid));assert.equal(b.price,b.pid===a.winner?3:1)}
    }
    const daily=G.lab.days.map(d=>[0,1,2,3].sort((a,b)=>d.players[b].coins-d.players[a].coins||d.players[b].upgrades-d.players[a].upgrades||a-b));
    const awards=G.bilanciaAwards||[];
    if(variant==='separated-only')assert.equal(awards.length,0);
    if(variant.startsWith('bilancia'))for(const d of G.lab.days){
      const contracts=G.players.map(p=>G.lab.contracts.filter(c=>c.day===d.day&&c.pid===p.id).length),best=Math.max(...contracts);
      for(const p of G.players){const expected=best-contracts[p.id],actual=awards.filter(a=>a.day===d.day&&a.pid===p.id).length,missing=(G.bilanciaShortages||[]).filter(a=>a.day===d.day&&a.pid===p.id).length;assert.equal(actual+missing,expected)}
    }
    const awardDetails=awards.map(a=>{const card=G.players[a.pid].installed.find(c=>c.id===a.card),category={'Maestro della Pescaria':'A','Maestro delle Aste':'E','Maestro del Mercato':'C'}[card.up];return {...a,firstIncome:simConfig.__flatBilancia?2:2*G.lab.contracts.filter(c=>c.pid===a.pid&&c.day<=a.day&&c.category===category).length}});
    const winner=ranking[0].id,total=k=>G.players.reduce((s,p)=>s+p[k],0)/4;
    rows.push({variant,index,seed,contracts:total('orders'),upgrades:G.players.reduce((s,p)=>s+p.installed.length,0)/4,gap:ranking[0].coins-ranking[3].coins,changes:daily.slice(1).filter((d,j)=>d[0]!==daily[j][0]).length,last1Wins:+(winner===daily[0][3]),last2Wins:+(winner===daily[1][3]),last3Wins:+(winner===daily[2][3]),nonleader3Wins:+(winner!==daily[2][0]),last1Top2:+ranking.slice(0,2).some(p=>p.id===daily[0][3]),awards:awards.length/4,shortages:(G.bilanciaShortages||[]).length,deckShortages:(G.deckShortages||[]).length,passive:total('bilanciaTot'),zeroAwards:awardDetails.filter(a=>a.firstIncome===0).length,winnerOrders:ranking[0].orders,lastOrders:ranking[3].orders,winnerPassive:ranking[0].bilanciaTot,lastPassive:ranking[3].bilanciaTot,dailyRanks:daily,days:G.lab.days,players:ranking.map(p=>({id:p.id,coins:p.coins,orders:p.orders,upgrades:p.installed.length,bilancia:p.bilanciaTot})),awardDetails});
    if(checkpoint)fs.appendFileSync(checkpoint,JSON.stringify(rows.at(-1))+'\n');
    if(index%40===workerData.slot)process.stderr.write(`${variant} ${index+1}/${count}\n`);
  }
  parentPort.postMessage(rows);
}
