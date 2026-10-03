// node laboratorio/experiments/check-ai-revision.js [paired-seeds=40] [output.json] [baseline-agent.js] [base-seed=20262001]
// Due giocatori per versione; ogni seme viene ripetuto scambiando tutti i posti.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const {Worker,isMainThread,parentPort,workerData}=require('node:worker_threads');
const root=path.join(__dirname,'..'),pairs=Number(process.argv[2]||40),slots=Math.min(8,os.availableParallelism());
const baseSeed=Number(process.argv[5]||20262001),lookaheadFinalDay=process.env.PESCARIA_LOOKAHEAD_FINAL==='1';
assert(Number.isInteger(pairs)&&pairs>0&&Number.isInteger(baseSeed));
const legacyRef=process.argv[4]?path.resolve(process.argv[4]):'586c156',agentPath='laboratorio/experiments/monte-carlo-agent.js';
const legacySource=process.argv[4]?fs.readFileSync(legacyRef,'utf8'):execFileSync('git',['show',legacyRef+':'+agentPath],{cwd:root,encoding:'utf8'});
const legacyHash=crypto.createHash('sha256').update(legacySource).digest('hex');
if(isMainThread){
  Promise.all(Array.from({length:slots},(_,slot)=>new Promise((resolve,reject)=>{
    const worker=new Worker(__filename,{workerData:slot,argv:process.argv.slice(2)});
    worker.on('message',resolve);worker.on('error',reject);worker.on('exit',code=>{if(code)reject(Error('worker exit '+code))});
  }))).then(parts=>{
    const rows=parts.flat().sort((a,b)=>a.variant.localeCompare(b.variant)||a.index-b.index||a.swap-b.swap);
    assert.equal(rows.length,pairs*4);
    const summary={};
    for(const variant of ['card-price','winner3']){
      const games=rows.filter(r=>r.variant===variant),mean=k=>games.reduce((s,r)=>s+r[k],0)/games.length;
      const clusters=Array.from({length:pairs},(_,index)=>games.filter(r=>r.index===index).reduce((s,r)=>s+r.newWin,0)/2);
      const winRate=mean('newWin'),se=pairs>1?Math.sqrt(clusters.reduce((s,v)=>s+(v-winRate)**2,0)/(pairs-1)/pairs):0;
      summary[variant]={games:games.length,newWins:games.reduce((s,r)=>s+r.newWin,0),winRate,approx95WinInterval:[Math.max(0,winRate-1.96*se),Math.min(1,winRate+1.96*se)],newScore:mean('newScore'),oldScore:mean('oldScore'),newContracts:mean('newContracts'),oldContracts:mean('oldContracts')};
    }
    const result={method:'Due IA aggiornate contro due precedenti, ogni seme ripetuto con posti scambiati. Contratti del giorno 4 doppi; 6 scenari per decisione per entrambe. Intervalli descrittivi raggruppati per seme. L’obiettivo resta il margine medio rispetto al rivale più forte.',legacyRef,legacyHash,baseSeed,lookaheadFinalDay,candidateSource:fs.readFileSync(path.join(root,'experiments/monte-carlo-agent.js'),'utf8'),sourceHashes:Object.fromEntries(['index.html','experiments/monte-carlo-agent.js','experiments/check-ai-decisions.js','experiments/check-ai-revision.js'].map(f=>[f,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,f))).digest('hex')])),summary,rows};
    if(process.argv[3])fs.writeFileSync(process.argv[3],JSON.stringify(result,null,2));
    console.log(JSON.stringify(summary,null,2));
  }).catch(e=>{console.error(e);process.exitCode=1});
}else{
  const source=fs.readFileSync(path.join(root,'index.html'),'utf8').match(/<script>\s*([\s\S]*?)<\/script>/)[1];
  const legacy=legacySource,agent=fs.readFileSync(path.join(root,'experiments/monte-carlo-agent.js'),'utf8');
  const names=['botBid','botBuy','botMarket','botKeep','botDraft','finishDay','chooseBatchPlan'];
  const stash=`const engineFns={${names.join(',')}};`;
  const restore=names.map(n=>`${n}=engineFns.${n};`).join('\n');
  const capture=which=>`window.__${which}={botBid,botBuy,botMarket,botKeep,botDraft};`;
  const route=`
  let newSeats=new Set();window.__seats=ids=>{newSeats=new Set(ids)};window.__rules=LAB_DEFAULT_RULES;
  ${['botBid','botBuy','botMarket','botKeep','botDraft'].map(n=>`${n}=function(p,...args){return (newSeats.has(p.id)?window.__modern:window.__legacy).${n}(p,...args)};`).join('\n')}
  `;
  const reward=`const normalPayout=payout,normalComplete=completeContract;
  payout=(p,c)=>normalPayout(p,c)*(G.day===4?2:1);
  completeContract=function(p,c,reward){
    const before=p.coins,category=p.catTot||0,favorite=p.favTot||0,result=normalComplete(p,c,reward);
    if(result&&G.day===4){const extra=p.coins-before;p.coins+=extra;p.today.income+=extra;p.today.contractIncome[c.id]+=extra;p.catTot+=(p.catTot||0)-category;p.favTot+=(p.favTot||0)-favorite}
    return result;
  };`;
  const ctx={console,structuredClone,__PESCARIA_HEADLESS:true,addEventListener(){},setTimeout(){return 1},clearTimeout(){},localStorage:{getItem(){return null},setItem(){}},document:{getElementById(){return{innerHTML:''}},addEventListener(){}},matchMedia:()=>({matches:false})};ctx.window=ctx;
  const injected=stash+'\n{'+legacy+'\n'+capture('legacy')+'}\n'+restore+'\n{'+agent+'\n'+capture('modern')+'}\n'+route+reward;
  new Function(...Object.keys(ctx),source.replace(/\}\)\(\);\s*$/,injected+'\n})();'))(...Object.values(ctx));
  const config={...ctx.__rules,chooseEndDayUpgrades:false,simultaneousBids:false,depth:6,samples:6,aggression:1,lookaheadFinalDay};
  if(workerData===0){
    // Il confronto misto deve preservare la vecchia IA quando tutti i posti la usano.
    const {ranking}=ctx.__pescaria.simulate({n:4,seed:20261253,difficulty:'normal',simConfig:config});
    const control={...ctx};control.window=control;
    new Function(...Object.keys(control),source.replace(/\}\)\(\);\s*$/,legacy+'\n'+reward+'\n})();'))(...Object.values(control));
    const expected=control.__pescaria.simulate({n:4,seed:20261253,difficulty:'normal',simConfig:config}).ranking;
    assert.deepEqual(ranking.map(p=>({id:p.id,coins:p.coins,orders:p.orders})),expected.map(p=>({id:p.id,coins:p.coins,orders:p.orders})));
  }
  const rows=[];
  for(let index=workerData;index<pairs;index+=slots)for(const variant of ['card-price','winner3'])for(const swap of [0,1]){
    const seats=swap?[1,3]:[0,2];ctx.__seats(seats);const seed=baseSeed+index*7919;
    const {G,ranking}=ctx.__pescaria.simulate({n:4,seed,difficulty:'normal',simConfig:{...config,...(variant==='winner3'?{winnerPricing:true,winnerPrice:3,otherPrice:1}:{})}});
    assert(G.finished&&G.players.every(p=>p.coins>=0));
    const group=isNew=>G.players.filter(p=>seats.includes(p.id)===isNew),mean=(ps,key)=>ps.reduce((s,p)=>s+p[key],0)/ps.length;
    rows.push({variant,index,swap,seed,newSeats:seats,newWin:+seats.includes(ranking[0].id),newScore:mean(group(true),'coins'),oldScore:mean(group(false),'coins'),newContracts:mean(group(true),'orders'),oldContracts:mean(group(false),'orders'),ranking:ranking.map(p=>({id:p.id,coins:p.coins,orders:p.orders}))});
    fs.writeFileSync((process.argv[3]||'/private/tmp/pescaria-ai-revision')+'.part-'+workerData+'.json',JSON.stringify(rows));
  }
  parentPort.postMessage(rows);
}
