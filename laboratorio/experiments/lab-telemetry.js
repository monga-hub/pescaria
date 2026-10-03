// Inserito nel motore headless del laboratorio; non modifica una partita giocata.
const labStartDay=startDay;
startDay=function(){
  if(!G.mcRollout){
    G.lab??={initialCaptain:G.captain,auctions:[],contracts:[],days:[],fiuto:[],passive:[]};
    G.lab.startCoins=G.players.map(p=>p.coins);
  }
  return labStartDay();
};
const labStartDraft=startDraft;
startDraft=function(){
  if(!G.mcRollout)G.lab.fiuto.push(...G.fiutoLog.map(x=>({day:G.day,pid:x.pid,fish:x.f})));
  return labStartDraft();
};
const labBeginBids=beginBids;
beginBids=function(){
  if(!G.mcRollout)G.lab.current={day:G.day,fish:currentFish(),lot:G.market[currentFish()],eligible:G.players.filter(p=>!p.congrega&&p.hand.length).map(p=>p.id),bidders:0,winnerScore:0,bought:0,spent:0,extra:0,buys:[]};
  return labBeginBids();
};
const labResolveBids=resolveBids;
resolveBids=function(bids){
  if(!G.mcRollout){
    const a=G.lab.current,order=G.simConfig?.simultaneousBids?Array.from({length:G.players.length},(_,i)=>(G.simCaptain+i)%G.players.length):turnOrder(),ranked=[...bids].sort((a,b)=>bidScore(b)-bidScore(a)||order.indexOf(a.pid)-order.indexOf(b.pid));
    a.bidders=bids.length;a.winnerScore=ranked.length?bidScore(ranked[0]):0;a.winner=ranked[0]?.pid??null;
    a.bids=ranked.map((b,i)=>({pid:b.pid,rank:i+1,score:bidScore(b),cardBid:b.card.bid,cash:b.cash,influence:b.infl,price:auctionPrice(G.simConfig?.priceByCard?b.card.bid:bidScore(b),i+1,ranked.length)}));
  }
  return labResolveBids(bids);
};
const labBuy=buy;
buy=function(p,f,n,price){
  if(G.mcRollout)return labBuy(p,f,n,price);
  const wanted=needOf(p,f,botPlan(p)),before=p.coins,bankBefore=count(p.banco),bought=labBuy(p,f,n,price);
  if(bought){const a=G.lab.current,cost=before-p.coins;
    a.bought+=bought;a.spent+=cost;a.extra+=Math.max(0,bought-wanted);
    a.buys.push({pid:p.id,n:bought,price,cost,extra:Math.max(0,bought-wanted),wanted,aboveBase:Math.max(0,count(p.banco)-BANCO_BASE)-Math.max(0,bankBefore-BANCO_BASE)});
  }
  return bought;
};
const labAfterAuction=afterAuction;
afterAuction=function(){
  if(!G.mcRollout){
    const a=G.lab.current;
    a.soldOut=a.bought===a.lot;
    a.winnerBoughtAll=a.bidders>1&&a.buys.some(x=>x.pid===a.winner&&x.n===a.lot);
    a.firstBuyerBoughtAll=a.bidders>1&&a.buys[0]?.n===a.lot;
    a.cardTransfer=G.simConfig?.lastTakesWinningBid&&G.auctionResult?.length>1?{from:G.auctionResult[0].pid,to:G.auctionResult.at(-1).pid,card:G.auctionResult[0].card.id}:null;
    a.upgrades=auctionChoiceOn()
      ?(G.auctionZeroUpgrades||[]).map(x=>({pid:x.pid,card:x.card.id,upgrade:x.card.up,reason:x.reason}))
      :(G.auctionResult||[]).filter(b=>a.lot>0&&!G.tutorial&&G.simConfig?.auctionUpgradeOnNoFish!==false&&!G.players[b.pid].congrega&&G.auctionBlockedByEmpty?.[b.pid]).map(b=>({pid:b.pid,card:b.card.id,upgrade:b.card.up,reason:'empty'}));
    G.lab.auctions.push(a);G.lab.current=null;
  }
  return labAfterAuction();
};
const labCompleteContract=completeContract;
completeContract=function(p,card,reward){
  const before=p.coins,subs=p.subsUsed||0,foregone=payout(p,card),result=labCompleteContract(p,card,reward);
  if(result&&!G.mcRollout){const choice=p.today.contractRewards[card.id];G.lab.contracts.push({day:G.day,pid:p.id,card:card.id,name:card.name,category:card.cat,reward:choice,cardUpgrade:card.up,upgrade:choice==='upgrade'||choice==='both'?card.up:null,base:card.value,foregone,gain:p.coins-before,substitutions:(p.subsUsed||0)-subs})}
  return result;
};
const labStartMarket=startMarket;
startMarket=function(){
  if(!G.mcRollout)G.lab.marketOpen=G.players.map(p=>{const cards=[...p.hand,...(p.auctionReturns||[])];return{cards:cards.length,ready:cards.filter(c=>canContract(p,c)).length,fish:count(mix(p.banco,p.cesta))}});
  return labStartMarket();
};
const labFinishDay=finishDay;
finishDay=function(){
  if(!G.mcRollout){
    for(const p of G.players)G.lab.passive.push(...p.today.bilancia.map(x=>({day:G.day,pid:p.id,upgrade:x.card.up,gain:x.v})));
    G.lab.days.push({day:G.day,players:G.players.map(p=>({coins:p.coins,startCoins:G.lab.startCoins[p.id],orders:p.orders,upgrades:p.installed.length+p.pending.length,wasted:p.wasted,bilancia:p.bilanciaTot,contractIncome:p.today.income,passiveIncome:G.simConfig?.deferMerchantIncome?0:p.today.bilancia.reduce((n,x)=>n+x.v,0),marketBonusIncome:0,favoriteIncome:p.favTot||0,cardsAtMarket:G.lab.marketOpen[p.id].cards,readyAtMarket:G.lab.marketOpen[p.id].ready,fishAtMarket:G.lab.marketOpen[p.id].fish,fishKept:count(p.cesta),cardsKept:p.kept.length,substitutions:p.subsUsed||0,fortunaDraws:p.fortunaDraws||0}))});
  }
  const finalDay=G.day===4,result=labFinishDay();
  if(!G.mcRollout&&finalDay&&G.finished){
    G.lab.days.at(-1).players.forEach((snapshot,pid)=>{snapshot.coins=G.players[pid].coins;snapshot.marketBonusIncome=G.players[pid].marketEndBonus||0;if(G.simConfig?.deferMerchantIncome){snapshot.passiveIncome=G.players[pid].bilanciaTot;snapshot.bilancia=G.players[pid].bilanciaTot}});
    if(G.simConfig?.deferMerchantIncome||G.simConfig?.marketSetBonus)for(const p of G.players){
      const earnings=G.simConfig.marketSetBonus?p.installed.filter(card=>card.cat==='B').map(card=>({card,v:Math.floor(catCount(p,MAESTRO[card.up])/G.simConfig.marketSetThreshold)*G.simConfig.marketSetBase})):bilanciaIncome(p);
      G.lab.passive.push(...earnings.map(x=>({day:4,pid:p.id,upgrade:x.card.up,gain:x.v})));
    }
  }
  return result;
};
