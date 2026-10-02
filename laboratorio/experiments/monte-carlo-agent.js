const MC={samples:6,depth:6,choices:0,rollouts:0,marketChoices:0,batchChoices:0,cycleRollouts:0};
const STOP={};
const originalBid=botBid,originalBuy=botBuy;
function cloneGame(){const g=structuredClone(G);Object.setPrototypeOf(g.rng,RNG.prototype);return g}
function checkpoint(){if(G.mcRollout&&!G.mcCycleTargetDay&&--G.mcMoves<0)throw STOP}
const priorFinishDay=finishDay;
finishDay=function(){if(G.mcRollout&&G.mcCycleTargetDay===G.day){G.mcCycleDone=true;return}return priorFinishDay()};
function strength(p){
  if(G.finished)return p.coins+(p.installed.length+p.pending.length)*.001;
  const stock=mix(p.banco,p.cesta);
  const cards=[...p.hand,...p.kept,...(p.auctionReturns||[])];
  const useful=FISH.reduce((total,f)=>total+Math.min(stock[f],cards.reduce((need,c)=>need+(c.recipe[f]||0),0)),0);
  // Un pesce senza contratto non rende Ducati; ha solo un piccolo valore futuro se può essere conservato.
  const fish=useful*.4+(count(stock)-useful)*(G.day<4 ? .25 : 0);
  const orders=cards.map(c=>{let have=0,need=0;for(const [f,n] of Object.entries(c.recipe)){have+=Math.min(n,stock[f]);need+=n}
    return payout(p,c)*(.15+.55*have/need)}).sort((a,b)=>b-a).slice(0,2).reduce((a,b)=>a+b,0);
  const upgrades=[...p.installed,...p.pending].reduce((v,c)=>v+botUpgradeValue(p,c)*.65,0)
    +(G.simConfig?.installRemainingCards?cards.reduce((v,c)=>v+botUpgradeValue(p,c)*.35,0):G.simConfig?.chooseEndDayUpgrades?cards.map(c=>botUpgradeValue(p,c)).sort((a,b)=>b-a).slice(0,2).reduce((v,x)=>v+x*.35,0):0);
  const finalMerchant=G.simConfig?.marketSetBonus?marketSetReward(p,true):G.simConfig?.deferMerchantIncome?bilanciaIncome(p,true).reduce((n,x)=>n+x.v,0):0;
  return p.coins+finalMerchant+fish+orders+upgrades-finalMerchant*.65;
}
function evaluate(pid){return strength(G.players[pid])-(G.simConfig?.aggression??1)*Math.max(...G.players.filter(p=>p.id!==pid).map(strength))}
function sampleHiddenHands(pid){
  const others=G.players.filter(p=>p.id!==pid&&!p.congrega),deckSize=G.deck.length;
  const pool=G.rng.shuffle([...G.deck,...others.flatMap(p=>p.hand)]);G.deck=pool.splice(0,deckSize);
  const replacements=new Map();
  for(const p of others){const old=p.hand;p.hand=pool.splice(0,old.length);p.plan=null;old.forEach((card,i)=>replacements.set(card.id,p.hand[i]))}
  for(const bid of G.bids||[])if(replacements.has(bid.card.id))bid.card=replacements.get(bid.card.id);
}
function runCandidate(pid,apply,seedBase,cycle=false){
  const original=G;let total=0,samples=original.simConfig?.samples??MC.samples;
  for(let sample=0;sample<samples;sample++){
    G=cloneGame();G.mcRollout=true;G.mcMoves=original.simConfig?.depth??MC.depth;
    // Ogni candidato affronta gli stessi scenari casuali: cambia solo la sua scelta.
    G.rng=new RNG(((seedBase??original.rng.s)^(sample*104729+original.day*31))>>>0);
    G.rng.shuffle(G.deck);G.rng.shuffle(G.bag);
    if(cycle){sampleHiddenHands(pid);G.mcCycleTargetDay=G.day}
    try{apply()}catch(e){if(e!==STOP){G=original;throw e}}
    if(cycle&&!G.mcCycleDone){G=original;throw Error('Il ciclo della giornata non è terminato')}
    if(cycle&&G.day===4)finishGame();
    total+=evaluate(pid);MC.rollouts++;if(cycle)MC.cycleRollouts++;G=original;
  }
  return total/samples;
}
chooseBatchPlan=function(p){
  if(p.congrega||!p.hand.length)return;
  const base=FISH.flatMap(f=>G.committedBids[f].filter(b=>b.pid===p.id).map(b=>({...b,fish:f})));
  // ponytail: proviamo pochi piani completi; ampliare la ricerca solo se i test mostrano un limite concreto.
  const options=[],seen=new Set();
  const add=plan=>{const key=plan.map(b=>`${b.fish}:${b.card.id}:${b.cash}:${b.infl}`).join('|');if(!seen.has(key)){seen.add(key);options.push(plan)}};
  add(base);
  const keep=botPlan(p),need=f=>needOf(p,f,keep),priority=(a,b)=>need(b.fish)/(G.market[b.fish]||1)-need(a.fish)/(G.market[a.fish]||1);
  const ordered=[...base].sort(priority),target=base.indexOf(ordered[0]);
  if(base.length>1){
    const other=base.indexOf(ordered.at(-1)),swapped=base.map(b=>({...b}));
    [swapped[target].card,swapped[other].card]=[swapped[other].card,swapped[target].card];add(swapped);
    const rotated=base.map((b,i)=>({...b,card:base[(i+1)%base.length].card}));add(rotated);
  }
  const used=new Set(base.map(b=>b.card.id)),free=p.hand.filter(c=>!used.has(c.id)).sort((a,b)=>botCardValue(p,a)-botCardValue(p,b));
  if(target>=0&&free.length){for(const card of [free[0],free.at(-1)])add(base.map((b,i)=>i===target?{...b,card}:b))}
  const cash=base.reduce((n,b)=>n+b.cash,0);
  if(target>=0&&cash<p.coins){for(const extra of [1,2])if(cash+extra<=p.coins)add(base.map((b,i)=>i===target?{...b,cash:b.cash+extra}:b))}
  if(cash)add(base.map(b=>({...b,cash:0})));
  if(target>=0&&p.influence)add(base.map((b,i)=>({...b,infl:i===target?p.influence:0})));
  if(!G.simConfig?.mandatoryBid&&base.length)add(base.filter(b=>b!==ordered.at(-1)));
  if(!base.length){
    const fish=FISH.filter(f=>G.market[f]).sort((a,b)=>need(b)/(G.market[b]||1)-need(a)/(G.market[a]||1))[0];
    if(fish)add([{pid:p.id,fish,card:[...p.hand].sort((a,b)=>a.bid-b.bid)[0],cash:0,infl:0}]);
  }
  let best=base,value=-Infinity;MC.choices++;MC.batchChoices++;
  for(const plan of options){
    const score=runCandidate(p.id,()=>{
      const me=G.players[p.id],others=G.players.filter(x=>x.id!==p.id);
      G.committedBids=Object.fromEntries(FISH.map(f=>[f,[]]));G.bidReservations=G.players.map(()=>0);
      setBatchBids(me,plan);
      for(const other of others)setBatchBids(other,makeBatchBids(other));
      nextAuction();
    },G.batchPlanSeed,true);
    if(score>value){value=score;best=plan}
  }
  setBatchBids(p,best);
};
function draftPortfolio(p,cards){
  const stock=mix(p.banco,p.cesta),players=G.players.filter(x=>!x.congrega).length;
  const supply=Object.fromEntries(FISH.map(f=>[f,stock[f]+G.market[f]/players]));
  let best=0;
  for(let mask=1;mask<1<<cards.length;mask++){
    const need=inv();let contracts=0,value=0;
    for(let i=0;i<cards.length;i++)if(mask&(1<<i)){
      contracts++;value+=payout(p,cards[i]);
      for(const [f,n] of Object.entries(cards[i].recipe))need[f]+=n;
    }
    const short=FISH.reduce((n,f)=>n+Math.max(0,need[f]-supply[f]),0);
    best=Math.max(best,contracts*10+value*.15-short*8);
  }
  return best;
}
botDraft=function(p,pack){
  if(pack.length<2)return pack[0];
  const chosen=G.drafted?.[p.id]||[];let best=pack[0],value=-Infinity;
  for(const card of pack){
    const score=draftPortfolio(p,[...chosen,card])+card.bid+botUpgradeValue(p,card)*.03;
    if(score>value){value=score;best=card}
  }
  return best;
};
botBid=function(p,f,seen){
  checkpoint();
  if(G.mcRollout)return originalBid(p,f,seen);
  if(!p.hand.length||(!roomBanco(p)&&!auctionChoiceOn()))return originalBid(p,f,seen);
  const baseline=originalBid(p,f,seen);
  const opts=G.simConfig?.mandatoryBid?[]:[null],keys=new Set();
  const add=b=>{if(!b)return;const key=b.card.id+'/'+b.cash+'/'+b.infl;if(!keys.has(key)&&b.cash<=p.coins){keys.add(key);opts.push({id:b.card.id,cash:b.cash,infl:b.infl})}};
  add(baseline);
  if(baseline)add({...baseline,cash:Math.min(p.coins,baseline.cash+2)});
  const cards=[...p.hand].sort((a,b)=>a.bid-b.bid);
  add({card:cards[0],cash:0,infl:0});
  add({card:cards.at(-1),cash:Math.min(3,p.coins),infl:p.influence});
  let best=null,value=-Infinity;MC.choices++;
  for(const o of opts){
    const v=runCandidate(p.id,()=>{
      const cp=G.players[p.id];
      if(o){const card=cp.hand.find(c=>c.id===o.id);G.bids.push({pid:p.id,card,cash:o.cash,infl:o.infl})}
      G.bidDone.push(p.id);G.bidPos++;advanceBidders();
    },undefined,true);
    if(v>value){value=v;best=o}
  }
  if(!best)return null;
  return{pid:p.id,card:p.hand.find(c=>c.id===best.id),cash:best.cash,infl:best.infl};
};
botBuy=function(p,f,price,rank){
  checkpoint();
  if(G.mcRollout||p.congrega||G.tutorial)return originalBuy(p,f,price,rank);
  const limit=maxBuy(p,f,price);
  if(!limit){if(canUpgradeAuctionCard())installAuctionUpgrade(G.buyQueue[G.buyPos]);return}
  const wanted=Math.min(limit,needOf(p,f,botPlan(p)));
  const q=G.buyQueue[G.buyPos];
  const upgrade=canUpgradeAuctionCard()&&(!wanted||botUpgradeValue(p,q.card)>wanted*3-costOf(p,wanted,price));
  const planned=upgrade?0:Math.min(limit,G.buyPos===0&&p.coins>6?Math.max(wanted+1,1):wanted);
  const options=[...new Set([0,1,wanted,limit,planned].filter(n=>n<=limit))];
  let best=0,value=-Infinity;MC.choices++;
  for(const n of options){
    const v=runCandidate(p.id,()=>{
      const q=G.buyQueue[G.buyPos];
      if(!n&&canUpgradeAuctionCard())installAuctionUpgrade(q);
      else{buy(G.players[p.id],f,n,price);if(loserGetsUpgrade(q))installAuctionUpgrade(q,'loser');else if(auctionChoiceOn())settleAuctionCard(q)}
      G.buyPos++;advanceBuys();
    },undefined,true);
    if(v>value){value=v;best=n}
  }
  if(best>wanted){const stat=G.mcAgg??={extra:0,cost:0,byPrice:[0,0,0,0]};
    stat.extra+=best-wanted;stat.cost+=costOf(p,best,price)-costOf(p,wanted,price);stat.byPrice[price]=(stat.byPrice[price]||0)+best-wanted}
  if(!best&&canUpgradeAuctionCard())installAuctionUpgrade(G.buyQueue[G.buyPos]);else buy(p,f,best,price);
};
const originalMarket=botMarket;botMarket=function(p){
  checkpoint();
  if(G.mcRollout||p.congrega||G.tutorial||G.simConfig?.contractOnlyCoins||G.simConfig?.contractChoice===false)return originalMarket(p);
  let card;
  while((card=p.hand.filter(c=>canContract(p,c)).sort((a,b)=>botCardValue(p,b)-botCardValue(p,a))[0])){
    const id=card.id;MC.choices++;MC.marketChoices++;
    const value=reward=>runCandidate(p.id,()=>{
      const me=G.players[p.id];completeContract(me,me.hand.find(c=>c.id===id),reward);
      originalMarket(me);closePlayerMarket(me);keepCards(me,botKeep(me));
      for(const other of G.players.slice(p.id+1))if(other.congrega)congregaSell(other);else{originalMarket(other);closePlayerMarket(other);keepCards(other,botKeep(other))}
      startEndOfDay();
    });
    const cash=value('coins'),upgrade=value('upgrade');
    completeContract(p,card,upgrade>cash?'upgrade':'coins');
  }
};
const originalKeep=botKeep;botKeep=function(p){checkpoint();return originalKeep(p)};
window.__pescaria={simulate(opts){startGame({humanBot:true,name:'Bot0',...opts});return{G,ranking:ranking()}},MC};
