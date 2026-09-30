const form=document.getElementById('configForm');
const report=document.getElementById('report');
const status=document.getElementById('status');
const progress=document.getElementById('runProgress');
const runButton=document.getElementById('runButton');
const stopButton=document.getElementById('stopButton');
const WORKERS=4;
let workers=[],rows=[],config=null,lastReport=null;
const mean=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:0;
const sum=a=>a.reduce((x,y)=>x+y,0);
const round=x=>Number(x).toLocaleString('it-IT',{maximumFractionDigits:1});
const percentile=(a,p)=>{const v=[...a].sort((x,y)=>x-y);return v.length?v[Math.floor((v.length-1)*p)]:0};

function readConfig(){
  const fields=form.elements;
  const n=name=>Number(fields.namedItem(name).value);
  const selected=fields.namedItem('mode').value;
  const t1=fields.namedItem('threshold1'),t2=fields.namedItem('threshold2');
  t2.setCustomValidity(fields.namedItem('tieredPricing').checked&&n('threshold2')<=n('threshold1')?'La seconda fascia deve finire dopo la prima.':'');
  if(!form.reportValidity())return null;
  return{games:n('games'),players:n('players'),mode:selected,depth:n('depth'),samples:n('samples'),aggression:n('aggression'),
    tieredPricing:fields.namedItem('tieredPricing').checked,winnerPricing:fields.namedItem('winnerPricing').checked,
    threshold1:n('threshold1'),threshold2:n('threshold2'),price1:n('price1'),price2:n('price2'),price3:n('price3'),winnerPrice:n('winnerPrice'),otherPrice:n('otherPrice'),
    startCoins:n('startCoins'),fishPerPlayer:n('fishPerPlayer'),handSize:n('handSize'),mandatoryBid:fields.namedItem('mandatoryBid').checked,contractOnlyCoins:fields.namedItem('contractOnlyCoins').checked,contractChoice:fields.namedItem('contractChoice').checked,installRemainingCards:fields.namedItem('installRemainingCards').checked,
    categoryBonusPerUpgrade:n('categoryBonusPerUpgrade'),deferMerchantIncome:fields.namedItem('deferMerchantIncome').checked,merchantCardValue:n('merchantCardValue'),limitMerchantIncome:false,
    marketSetBonus:fields.namedItem('marketSetBonus').checked,marketSetThreshold:n('marketSetThreshold'),marketSetBase:n('marketSetBase'),
    auctionLoserChoice:fields.namedItem('auctionLoserChoice').checked,auctionCardChoice:fields.namedItem('auctionCardChoice').checked,auctionContractsVariant:fields.namedItem('auctionContractsVariant').checked,auctionUpgradeCap:n('auctionUpgradeCap'),auctionUpgradeOnNoFish:fields.namedItem('auctionUpgradeOnNoFish').checked,seed:n('seed')};
}
const playLab=()=>{
  const current=readConfig();if(!current)return;
  const {games,players,mode,depth,samples,aggression,seed,...rules}=current;
  location.href='index.html?players='+players+'&rules='+encodeURIComponent(JSON.stringify(rules));
};
document.querySelectorAll('[data-play-lab]').forEach(button=>button.addEventListener('click',playLab));
function contractFields(){form.elements.namedItem('contractChoice').disabled=form.elements.namedItem('contractOnlyCoins').checked}
form.elements.namedItem('contractOnlyCoins').addEventListener('change',contractFields);
contractFields();
function rewardFields(changed){
  const perCard=form.elements.namedItem('deferMerchantIncome'),groups=form.elements.namedItem('marketSetBonus');
  if(changed==='perCard'&&perCard.checked)groups.checked=false;
  if(changed==='groups'&&groups.checked)perCard.checked=false;
  if(!perCard.checked&&!groups.checked)(changed==='perCard'?groups:perCard).checked=true;
  form.elements.namedItem('merchantCardValue').disabled=!perCard.checked;
  for(const name of ['marketSetThreshold','marketSetBase'])form.elements.namedItem(name).disabled=!groups.checked;
}
form.elements.namedItem('deferMerchantIncome').addEventListener('change',()=>rewardFields('perCard'));
form.elements.namedItem('marketSetBonus').addEventListener('change',()=>rewardFields('groups'));
rewardFields();
function choiceFields(){
  const loser=form.elements.namedItem('auctionLoserChoice'),all=form.elements.namedItem('auctionCardChoice');
  if(loser.checked)all.checked=false;
  all.disabled=loser.checked;
  form.elements.namedItem('auctionContractsVariant').disabled=!all.checked;
  form.elements.namedItem('auctionUpgradeCap').disabled=!all.checked||!form.elements.namedItem('auctionContractsVariant').checked;
  form.elements.namedItem('auctionUpgradeOnNoFish').disabled=loser.checked||all.checked;
}
form.elements.namedItem('auctionLoserChoice').addEventListener('change',choiceFields);
form.elements.namedItem('auctionCardChoice').addEventListener('change',choiceFields);
form.elements.namedItem('auctionContractsVariant').addEventListener('change',choiceFields);
choiceFields();
function pricingFields(changed){
  const tiers=form.elements.namedItem('tieredPricing'),winner=form.elements.namedItem('winnerPricing');
  if(changed==='tiers'&&tiers.checked)winner.checked=false;
  if(changed==='winner'&&winner.checked)tiers.checked=false;
  if(!tiers.checked&&!winner.checked)(changed==='tiers'?winner:tiers).checked=true;
  for(const name of ['threshold1','threshold2','price1','price2','price3'])form.elements.namedItem(name).disabled=!tiers.checked;
  for(const name of ['winnerPrice','otherPrice'])form.elements.namedItem(name).disabled=!winner.checked;
  if(!tiers.checked)form.elements.namedItem('threshold2').setCustomValidity('');
}
form.elements.namedItem('tieredPricing').addEventListener('change',()=>pricingFields('tiers'));
form.elements.namedItem('winnerPricing').addEventListener('change',()=>pricingFields('winner'));
pricingFields();
function modeFields(){const disabled=form.elements.namedItem('mode').value==='standard';
  for(const name of ['depth','samples','aggression'])form.elements.namedItem(name).disabled=disabled;
}
form.elements.namedItem('mode').addEventListener('change',modeFields);
form.elements.namedItem('threshold2').addEventListener('input',()=>form.elements.namedItem('threshold2').setCustomValidity(''));
form.elements.namedItem('threshold1').addEventListener('input',()=>form.elements.namedItem('threshold2').setCustomValidity(''));
modeFields();

const configFile=document.getElementById('configFile');
document.getElementById('exportConfig').addEventListener('click',()=>{
  const current=readConfig();if(!current)return;
  download('pescaria-regole-laboratorio.json',JSON.stringify({format:'pescaria-laboratorio-regole',version:10,config:current},null,2),'application/json');
  status.textContent='Regole esportate in JSON.';
});
document.getElementById('importConfig').addEventListener('click',()=>configFile.click());
configFile.addEventListener('change',async()=>{
  const file=configFile.files[0];if(!file)return;
  try{
    if(file.size>1_000_000)throw new Error('Il file è troppo grande per contenere soltanto le regole.');
    const parsed=JSON.parse(await file.text());
    const imported=parsed?.config??parsed;
    let converted=false;
    if(imported&&typeof imported==='object'&&!Array.isArray(imported)){
      if(imported.categoryBonusPerUpgrade===undefined)imported.categoryBonusPerUpgrade=1;
      if(imported.deferMerchantIncome===undefined)imported.deferMerchantIncome=false;
      if(imported.merchantCardValue===undefined)imported.merchantCardValue=2;
      if(imported.marketSetBonus===undefined)imported.marketSetBonus=false;
      if(imported.marketSetThreshold===undefined)imported.marketSetThreshold=3;
      if(imported.marketSetBase===undefined)imported.marketSetBase=10;
      if(imported.auctionContractsVariant===undefined)imported.auctionContractsVariant=false;
      if(imported.auctionUpgradeCap===undefined)imported.auctionUpgradeCap=2;
      if(imported.installRemainingCards===undefined)imported.installRemainingCards=false;
      if(imported.handSize===undefined)imported.handSize=5;
      if(imported.mandatoryBid===undefined)imported.mandatoryBid=false;
      const combined=imported.deferMerchantIncome===imported.marketSetBonus;
      converted=combined||(parsed?.format==='pescaria-laboratorio-regole'&&parsed.version<5)||'marketSetExtra' in imported;
      if(combined)imported.deferMerchantIncome=!imported.marketSetBonus;
    }
    if(!validImportedConfig(imported))throw new Error('Il file non contiene parametri del Laboratorio validi.');
    for(const field of form.querySelectorAll('[name]')){
      if(field.type==='checkbox')field.checked=imported[field.name];
      else field.value=imported[field.name];
    }
    pricingFields();choiceFields();contractFields();rewardFields();modeFields();
    status.textContent=converted?'Regole importate: i Mercanti useranno una sola formula, calcolata a fine partita. Controlla la scelta prima di simulare.':'Regole importate. Avvia una simulazione per applicarle al report.';
  }catch(error){status.textContent='Importazione non riuscita: '+error.message}
  finally{configFile.value=''}
});
function validImportedConfig(c){
  if(!c||typeof c!=='object'||Array.isArray(c))return false;
  for(const field of form.querySelectorAll('[name]')){
    const value=c[field.name];
    if(field.type==='checkbox'){
      if(typeof value!=='boolean')return false;
    }else if(field.tagName==='SELECT'){
      if(![...field.options].some(option=>field.name==='mode'?option.value===value:Number(option.value)===value))return false;
    }else if(field.type==='number'){
      const min=Number(field.min),max=Number(field.max),step=Number(field.step);
      if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max||Math.abs((value-min)/step-Math.round((value-min)/step))>1e-8)return false;
    }
  }
  return c.tieredPricing!==c.winnerPricing&&(!c.tieredPricing||c.threshold2>c.threshold1)&&!(c.auctionLoserChoice&&c.auctionCardChoice)&&c.deferMerchantIncome!==c.marketSetBonus;
}

function ruleSnapshot(c){
  const rows=[
    ['Partite e giocatori',`${c.games} partite · ${c.players} giocatori · 4 giornate`],
    ['Carte iniziali',`${c.handSize} carte per giocatore ogni giorno; distribuzione diretta il primo giorno, draft nei giorni successivi. Se il mazzo è insufficiente, meno carte uguali per tutti`],
    ['Aste',c.mandatoryBid?'Offerta obbligatoria in ogni asta con almeno una carta in mano':'È possibile passare'],
    ['Pesci e Ducati',`${c.fishPerPlayer} pesci per giocatore ogni giorno · ${c.startCoins} Ducati iniziali`],
    ['Prezzo dei pesci',c.winnerPricing?`Vincitore ${c.winnerPrice} Ducati per pesce; altri partecipanti ${c.otherPrice}`:`Puntata 1–${c.threshold1}: ${c.price1} Ducati; ${c.threshold1+1}–${c.threshold2}: ${c.price2}; da ${c.threshold2+1}: ${c.price3}`],
    ['Carta puntata',c.auctionLoserChoice?'I perdenti possono comprare i pesci rimasti e installano subito la carta':c.auctionCardChoice?'Ogni partecipante sceglie se comprare pesci o installare subito la carta':c.auctionUpgradeOnNoFish?'Se il lotto è esaurito prima dell’acquisto, la carta diventa subito una miglioria':'Le carte puntate non utilizzate vengono scartate'],
    ['Più contratti, meno migliorie d’asta',c.auctionCardChoice&&c.auctionContractsVariant?`Carta puntata recuperata al mercato dopo l’acquisto di pesci; massimo ${c.auctionUpgradeCap} migliorie d’asta per giocatore al giorno`:c.auctionContractsVariant?'Inattiva: richiede la scelta pesci oppure miglioria':'Disattivata'],
    ['Contratti',c.contractOnlyCoins?'Solo Ducati; carta scartata':c.contractChoice?'Scelta tra Ducati oppure miglioria':'Ducati e miglioria insieme'],
    ['Carte rimaste in mano',c.installRemainingCards?'Installate come migliorie a fine giornata; nessuna carta conservata per domani':'Fino a 2 conservate per domani; le altre scartate'],
    ['Bonus di categoria',`${c.categoryBonusPerUpgrade} Ducati per miglioria installata della stessa categoria`],
    ['Mercanti della Bilancia',c.marketSetBonus?`${c.marketSetBase} Ducati per ogni gruppo completo di ${c.marketSetThreshold} carte della categoria indicata, per ogni Mercante; pagamento solo a fine partita`:`${c.merchantCardValue} Ducati per carta della categoria indicata, per ogni Mercante; pagamento solo a fine partita`],
    ['IA',c.mode==='mc6'?`Monte Carlo · ${c.depth} mosse · ${c.samples} scenari per scelta · aggressività ${c.aggression}`:'Standard'],
    ['Seme iniziale',String(c.seed)]
  ];
  return `<section class="rule-snapshot"><h3>Regole usate in questa simulazione</h3><dl>${rows.map(([name,value])=>`<dt>${name}</dt><dd>${value}</dd>`).join('')}</dl></section>`;
}

function finish(message,partial=false,meta={}){
  workers.forEach(worker=>worker.terminate());workers=[];rows.sort((a,b)=>a.index-b.index);
  runButton.disabled=false;stopButton.disabled=true;
  status.textContent=message;
  if(rows.length){lastReport={config,partial,meta,rows};renderReport(lastReport)}
}
form.addEventListener('submit',event=>{
  event.preventDefault();if(workers.length)return;
  config=readConfig();if(!config)return;
  rows=[];lastReport=null;progress.max=config.games;progress.value=0;
  runButton.disabled=true;stopButton.disabled=false;status.textContent='Preparazione di 4 calcoli paralleli…';
  report.innerHTML='<div class="report-empty"><strong>Partite in corso</strong>Il report si aggiornerà al termine.</div>';
  const completed=Array(WORKERS).fill(0),meta={choices:0,rollouts:0};let finished=0;
  try{
    for(let slot=0;slot<WORKERS;slot++){
      const worker=new Worker('laboratorio-worker.js?v=3');workers.push(worker);
      worker.onmessage=({data})=>{
        if(!workers.includes(worker))return;
        if(data.type==='progress'){
          rows.push(...data.rows);completed[slot]=data.done;progress.value=sum(completed);
          status.textContent=`${progress.value} / ${config.games} partite completate · 4 calcoli paralleli`;
        }else if(data.type==='done'){
          meta.choices+=data.choices;meta.rollouts+=data.rollouts;
          if(++finished===WORKERS)finish(`${rows.length} partite completate.`,false,meta);
        }else if(data.type==='error')finish('Simulazione interrotta: '+data.message,true);
      };
      worker.onerror=()=>{if(workers.includes(worker))finish('Errore durante la simulazione. Controlla la console del browser.',true)};
      worker.postMessage({type:'run',config,startIndex:slot,stride:WORKERS});
    }
  }catch(error){finish('Non riesco ad avviare il laboratorio. Apri il gioco dal server locale.',true)}
});
stopButton.addEventListener('click',()=>finish(`Fermata dopo ${rows.length} partite.`,true));

function renderReport(data){
  const {rows:r,config:c}=data,gaps=r.map(x=>x.gap),auctions=r.flatMap(x=>x.auctions),buys=auctions.flatMap(x=>x.buys),contracts=r.flatMap(x=>x.contracts);
  const auctionUpgrades=auctions.flatMap(x=>x.upgrades||[]);
  const contractUpgrades=contracts.filter(x=>x.upgrade);
  const handUpgrades=r.flatMap(x=>x.handUpgrades||[]),deckShortages=r.flatMap(x=>x.deckShortages||[]);
  const installedCards=sum(r.map(game=>sum(game.players.map(p=>p.upgrades))));
  const installedBySeat=Array.from({length:c.players},(_,pid)=>({
    player:pid+1,total:mean(r.map(game=>game.players.find(p=>p.id===pid).upgrades)),
    auction:auctionUpgrades.filter(x=>x.pid===pid).length/r.length,
    contract:contractUpgrades.filter(x=>x.pid===pid).length/r.length,
    hand:handUpgrades.filter(x=>x.pid===pid).length/r.length
  }));
  const auctionUpgradesAfterPurchase=sum(auctions.map(a=>(a.upgrades||[]).filter(u=>a.buys.some(b=>b.pid===u.pid)).length));
  const contested=auctions.filter(x=>x.bidders>=2),denials=auctions.filter(x=>x.winnerBoughtAll),
    wasted=sum(r.map(x=>sum(x.players.map(p=>p.wasted)))),extra=sum(buys.map(x=>x.extra));
  const comeback=day=>r.filter(x=>{const scores=x.days[day-1].players.map(p=>p.coins);return scores[x.players[0].id]<Math.max(...scores)}).length;
  const fromLastDay2=r.filter(x=>{const scores=x.days[1].players.map(p=>p.coins),winner=scores[x.players[0].id];return winner===Math.min(...scores)&&winner<Math.max(...scores)}).length;
  const withoutContracts=sum(r.map(x=>x.players.filter(p=>p.orders===0).length));
  const buckets=[['0–9',0,9],['10–19',10,19],['20–29',20,29],['30–39',30,39],['40+',40,Infinity]];
  const distribution=buckets.map(([label,lo,hi])=>({label,count:gaps.filter(x=>x>=lo&&x<=hi).length}));
  const days=[1,2,3,4].map(day=>{
    const snapshots=r.map(x=>x.days[day-1].players),gap=snapshots.map(p=>Math.max(...p.map(z=>z.coins))-Math.min(...p.map(z=>z.coins)));
    return{day,leader:mean(snapshots.map(p=>Math.max(...p.map(z=>z.coins)))),last:mean(snapshots.map(p=>Math.min(...p.map(z=>z.coins)))),gap:mean(gap),contracts:contracts.filter(x=>x.day===day).length/r.length};
  });
  const dayOrders=r.map(game=>game.days.map(day=>day.players.map((_,pid)=>pid).sort((a,b)=>day.players[b].coins-day.players[a].coins||day.players[b].upgrades-day.players[a].upgrades||a-b)));
  const leaderChanges=dayOrders.map(orders=>orders.slice(1).map((order,i)=>Number(order[0]!==orders[i][0])));
  const changesPerGame=leaderChanges.map(sum),changesByDay=[0,1,2].map(i=>sum(leaderChanges.map(x=>x[i])));
  const changeDistribution=[0,1,2,3].map(n=>({label:`${n} ${n===1?'cambio':'cambi'}`,count:changesPerGame.filter(x=>x===n).length}));
  const positionMoves=Array.from({length:c.players},()=>Array(c.players).fill(0));
  const movesByDay=[0,1,2].map(day=>sum(dayOrders.map(orders=>orders[day].filter((pid,rank)=>orders[day+1][rank]!==pid).length)));
  for(const orders of dayOrders)for(let day=0;day<3;day++)for(let from=0;from<c.players;from++)positionMoves[from][orders[day+1].indexOf(orders[day][from])]++;
  const places=Array.from({length:c.players},(_,i)=>{
    const p=r.map(x=>x.players[i]);return{place:i+1,coins:mean(p.map(x=>x.coins)),orders:mean(p.map(x=>x.orders)),upgrades:mean(p.map(x=>x.upgrades)),bilancia:mean(p.map(x=>x.bilancia)),marketBonus:mean(p.map(x=>x.marketBonus||0)),wasted:mean(p.map(x=>x.wasted))};
  });
  const fishNames=['Polpi','Gamberi','Molluschi','Branzini','Sardine'];
  const byFish=fishNames.map(fish=>{const a=auctions.filter(x=>x.fish===fish);return{fish,auctions:a.length,contested:a.filter(x=>x.bidders>=2).length,
    sold:sum(a.map(x=>x.bought)),lot:sum(a.map(x=>x.lot)),denials:a.filter(x=>x.winnerBoughtAll).length,extra:sum(a.map(x=>x.extra)),bid:mean(a.filter(x=>x.bidders).map(x=>x.winnerScore))}});
  const prices=[...new Set(buys.map(x=>x.price))].sort((a,b)=>a-b).map(price=>{const b=buys.filter(x=>x.price===price);return{price,fish:sum(b.map(x=>x.n)),extra:sum(b.map(x=>x.extra)),spent:sum(b.map(x=>x.cost))}});
  const auctionRanks=Array.from({length:c.players},(_,i)=>{
    const entries=auctions.flatMap(a=>a.bids.filter(b=>b.rank===i+1).map(b=>({bid:b,buy:a.buys.find(x=>x.pid===b.pid)})));
    return{rank:i+1,count:entries.length,score:mean(entries.map(x=>x.bid.score)),price:mean(entries.map(x=>x.bid.price)),fish:mean(entries.map(x=>x.buy?.n||0)),empty:entries.filter(x=>!x.buy).length,spent:mean(entries.map(x=>(x.buy?.cost||0)+(i===0?x.bid.cash:0)))};
  });
  const playerDays=r.flatMap((game,gameIndex)=>game.days.flatMap((snapshot,i)=>snapshot.players.map((p,pid)=>{
    const dayAuctions=game.auctions.filter(a=>a.day===i+1),purchases=dayAuctions.flatMap(a=>a.buys.filter(b=>b.pid===pid));
    const choices=game.contracts.filter(x=>x.day===i+1&&x.pid===pid);
    const dayPlace=dayOrders[gameIndex][i].indexOf(pid)+1,previousPlace=i?dayOrders[gameIndex][i-1].indexOf(pid)+1:null;
    return{seed:game.seed,day:i+1,pid,finalPlace:game.players.findIndex(x=>x.id===pid)+1,dayPlace,placesGained:previousPlace===null?'':previousPlace-dayPlace,...p,
      contractsToday:p.orders-(i?game.days[i-1].players[pid].orders:0),wastedToday:p.wasted-(i?game.days[i-1].players[pid].wasted:0),
      moneyChoices:choices.filter(x=>x.reward==='coins'||x.reward==='both').length,upgradeChoices:choices.filter(x=>x.reward==='upgrade'||x.reward==='both').length,
      auctionUpgrades:sum(dayAuctions.map(a=>(a.upgrades||[]).filter(x=>x.pid===pid).length)),handUpgrades:(game.handUpgrades||[]).filter(x=>x.day===i+1&&x.pid===pid).length,
      fishBought:sum(purchases.map(b=>b.n)),extraBought:sum(purchases.map(b=>b.extra)),fishSpent:sum(purchases.map(b=>b.cost)),bidSpent:sum(dayAuctions.filter(a=>a.winner===pid).map(a=>a.bids[0].cash)),auctionWins:dayAuctions.filter(a=>a.winner===pid).length};
  })));
  for(const place of places){const p=playerDays.filter(x=>x.finalPlace===place.place);
    place.fish=mean(p.map(x=>x.fishBought))*4;place.extra=mean(p.map(x=>x.extraBought))*4;
    place.spend=mean(p.map(x=>x.fishSpent+x.bidSpent))*4;place.dry=p.filter(x=>x.contractsToday===0).length/r.length;
    place.cash=mean(p.map(x=>x.moneyChoices))*4;place.power=mean(p.map(x=>x.upgradeChoices))*4;
  }
  const economy=[1,2,3,4].map(day=>{const p=playerDays.filter(x=>x.day===day);return{day,contracts:mean(p.map(x=>x.contractIncome)),passive:mean(p.map(x=>x.passiveIncome)),marketBonus:mean(p.map(x=>x.marketBonusIncome||0)),fish:mean(p.map(x=>x.fishSpent)),bids:mean(p.map(x=>x.bidSpent)),net:mean(p.map(x=>x.coins-x.startCoins))}});
  const choicesByDay=[1,2,3,4].map(day=>{const x=contracts.filter(c=>c.day===day);return{day,money:x.filter(c=>c.reward==='coins'||c.reward==='both').length/r.length,upgrades:x.filter(c=>c.reward==='upgrade'||c.reward==='both').length/r.length,foregone:sum(x.filter(c=>c.reward==='upgrade').map(c=>c.foregone))/r.length}});
  const powerNames={'Banco Ampliato':'Banco più grande','Fiuto per il Pescato':'Amici','Esperienza':'Senza tassa','Nuovi Clienti':'Fortuna','Contrattazione Sottobanco':'Sottobanco','Favorito della Gilda':'La Congrega','Maestro della Pescaria':'Mercante ⚓','Maestro delle Aste':'Mercante 🔨','Maestro del Mercato':'Mercante 💰'};
  const powerEffects={
    'Banco Ampliato':`${sum(buys.map(x=>x.aboveBase))} acquisti oltre capienza base`,
    'Fiuto per il Pescato':`${sum(r.map(x=>x.fiuto.length))} pesci pescati`,
    'Esperienza':`${sum(buys.map(x=>x.n*x.price-x.cost))} Ducati risparmiati`,
    'Nuovi Clienti':`${sum(r.flatMap(x=>x.days[3].players).map(x=>x.fortunaDraws))} carte pescate`,
    'Contrattazione Sottobanco':`${sum(contracts.map(x=>x.substitutions))} sostituzioni`,
    'Favorito della Gilda':`${sum(r.flatMap(x=>x.days[3].players).map(x=>x.favoriteIncome))} Ducati bonus`,
  };
  for(const key of ['Maestro della Pescaria','Maestro delle Aste','Maestro del Mercato'])powerEffects[key]=`${sum(r.flatMap(x=>x.passive).filter(x=>x.upgrade===key).map(x=>x.gain))} Ducati di rendita`;
  const powers=Object.entries(powerNames).map(([key,name])=>{
    const market=r.flatMap(game=>game.contracts.filter(x=>x.upgrade===key).map(x=>({card:x,winner:game.players[0].id===x.pid})));
    const auction=r.flatMap(game=>game.auctions.flatMap(a=>a.upgrades||[]).filter(x=>x.upgrade===key).map(x=>({card:x,winner:game.players[0].id===x.pid})));
    const hand=r.flatMap(game=>(game.handUpgrades||[]).filter(x=>x.upgrade===key).map(x=>({card:x,winner:game.players[0].id===x.pid})));
    return{name,count:market.length+auction.length+hand.length,market:market.length,auction:auction.length,hand:hand.length,winner:[...market,...auction,...hand].filter(x=>x.winner).length,foregone:mean(market.filter(x=>x.card.reward==='upgrade').map(x=>x.card.foregone)),effect:powerEffects[key]}
  }).sort((a,b)=>b.count-a.count);
  const emptyBidders=sum(auctionRanks.slice(1).map(x=>x.empty));
  const eligibleOffers=sum(auctions.map(a=>a.eligible?.length||0)),actualOffers=sum(auctions.map(a=>a.eligible?.filter(pid=>a.bids.some(b=>b.pid===pid)).length||0));
  const dryDays=playerDays.filter(x=>x.contractsToday===0).length,fishlessDays=playerDays.filter(x=>x.fishBought===0).length,unreadyDays=playerDays.filter(x=>x.cardsAtMarket>0&&x.readyAtMarket===0).length;
  const captainWins=r.filter(x=>x.players[0].id===x.initialCaptain).length;
  const seatWins=Array.from({length:c.players},(_,pid)=>r.filter(x=>x.players[0].id===pid).length);
  const headline=`${r.length} partite · ${c.players} giocatori · ${c.mode==='mc6'?`Monte Carlo ${c.samples} scenari / ${c.depth} mosse`:'IA standard'} · ${c.contractOnlyCoins?'Contratti: solo Ducati':c.contractChoice===false?'Ducati e miglioria':'Ducati o miglioria'} · ${c.winnerPricing?`Prezzi: vincitore ${c.winnerPrice}, altri ${c.otherPrice}`:'Prezzi a fasce'} · ${c.auctionLoserChoice?'Asta: i perdenti comprano e installano':c.auctionCardChoice?'Asta: tutti scelgono pesci o miglioria':`Lotto esaurito: ${c.auctionUpgradeOnNoFish===false?'scarto':'miglioria'}`}`;
  report.innerHTML=`<div class="report-head"><div><h2>Andamento delle partite</h2><p>${headline}${data.partial?' · risultato parziale':''}</p></div><div class="exports"><button type="button" id="downloadJson">Dati JSON</button><button type="button" id="downloadCsv">Partite CSV</button><button type="button" id="downloadDaysCsv">Giornate CSV</button></div></div>
    ${ruleSnapshot(c)}
    <div class="kpis"><div class="kpi"><b>${round(mean(gaps))}</b><span>Distacco medio · Ducati</span></div><div class="kpi"><b>${round(percentile(gaps,.5))}</b><span>Distacco mediano</span></div><div class="kpi"><b>${round(mean(r.map(x=>x.players[0].coins)))}</b><span>Primo · Ducati medi</span></div><div class="kpi"><b>${round(mean(r.map(x=>x.players.at(-1).coins)))}</b><span>Ultimo · Ducati medi</span></div></div>
    <h3>Carte installate come migliorie</h3><div class="kpis five"><div class="kpi"><b>${round(installedCards/r.length)}</b><span>Per partita · tutti i giocatori</span></div><div class="kpi"><b>${round(installedCards/(r.length*c.players))}</b><span>Per giocatore e partita</span></div><div class="kpi"><b>${round(auctionUpgrades.length/r.length)}</b><span>Da aste per partita</span></div><div class="kpi"><b>${round(contractUpgrades.length/r.length)}</b><span>Da contratti per partita</span></div><div class="kpi"><b>${round(handUpgrades.length/r.length)}</b><span>Da carte rimaste in mano per partita</span></div></div><p class="hint">Media finale per ciascun giocatore nell’ordine al tavolo, indipendentemente dalla posizione in classifica. Ogni carta è contata una volta sola, anche se produce effetti più volte.</p>${deckShortages.length?`<p class="note">Mazzo insufficiente in ${deckShortages.length} giornate su ${r.length*4}: distribuite in media ${round(mean(deckShortages.map(x=>x.perPlayer)))} carte per giocatore anziché ${c.handSize}. In queste giornate il draft è sostituito da una distribuzione uguale per tutti.</p>`:''}<div class="table-wrap"><table><thead><tr><th>Giocatore</th><th>Migliorie medie</th><th>Da aste</th><th>Da contratti</th><th>Da mano</th></tr></thead><tbody>${installedBySeat.map(p=>`<tr><td>${p.player}</td><td>${round(p.total)}</td><td>${round(p.auction)}</td><td>${round(p.contract)}</td><td>${round(p.hand)}</td></tr>`).join('')}</tbody></table></div>
    <div><h3>Distacco finale</h3><p class="hint">10°–90° percentile: ${percentile(gaps,.1)}–${percentile(gaps,.9)} Ducati · ${gaps.filter(x=>x<=10).length} entro 10 · ${gaps.filter(x=>x>=30).length} da almeno 30.</p>${distribution.map(b=>`<div class="chart-row"><span>${b.label}</span><div class="bar-track"><span class="bar" style="width:${100*b.count/r.length}%"></span></div><b>${b.count}</b></div>`).join('')}</div>
    <h3>Classifica media</h3><div class="table-wrap"><table><thead><tr><th>Posto</th><th>Ducati</th><th>Contratti</th><th>Contratti con Ducati</th><th>Contratti con miglioria</th><th>Pesci comprati</th><th>Extra</th><th>Spesa</th><th>Giorni senza contratto</th><th>Mercanti per carta</th><th>Mercanti a gruppi</th><th>Sprechi</th></tr></thead><tbody>${places.map(p=>`<tr><td>${p.place}°</td><td>${round(p.coins)}</td><td>${round(p.orders)}</td><td>${round(p.cash)}</td><td>${round(p.power)}</td><td>${round(p.fish)}</td><td>${round(p.extra)}</td><td>${round(p.spend)}</td><td>${round(p.dry)}</td><td>${round(p.bilancia)}</td><td>${round(p.marketBonus)}</td><td>${round(p.wasted)}</td></tr>`).join('')}</tbody></table></div><p class="hint">Medie per giocatore in quel posto. “Spesa” comprende le offerte vinte e i pesci acquistati.</p>
    <h3>Come cresce il distacco</h3><div class="table-wrap"><table><thead><tr><th>Giorno</th><th>Primo medio</th><th>Ultimo medio</th><th>Distacco medio</th><th>Contratti per partita</th></tr></thead><tbody>${days.map(d=>`<tr><td>${d.day}</td><td>${round(d.leader)}</td><td>${round(d.last)}</td><td>${round(d.gap)}</td><td>${round(d.contracts)}</td></tr>`).join('')}</tbody></table></div>
    <h3>Cambi al primo posto tra giornate</h3><p class="hint">${round(mean(changesPerGame))} cambi per partita · ${changesPerGame.filter(n=>n>0).length} partite su ${r.length} con almeno un cambio.</p>${changeDistribution.map(x=>`<div class="chart-row"><span>${x.label}</span><div class="bar-track"><span class="bar" style="width:${100*x.count/r.length}%"></span></div><b>${x.count}</b></div>`).join('')}<p class="hint" style="margin-top:11px">Dal giorno 1 al 2: ${changesByDay[0]} cambi · dal 2 al 3: ${changesByDay[1]} · dal 3 al 4: ${changesByDay[2]}. Conta il primo a fine giornata. A parità di Ducati, decide il numero di migliorie; se persiste, l’ordine al tavolo.</p>
    <h3>Cambi di posizione</h3><p class="hint">${round(sum(movesByDay)/r.length)} spostamenti di giocatori per partita. La tabella somma i passaggi tra giornate consecutive; ogni casella indica quante volte un giocatore è passato dalla posizione della riga a quella della colonna.</p><div class="table-wrap"><table><thead><tr><th>Da ↓ / a →</th>${Array.from({length:c.players},(_,i)=>`<th>${i+1}°</th>`).join('')}</tr></thead><tbody>${positionMoves.map((row,from)=>`<tr><td>${from+1}°</td>${row.map((n,to)=>`<td${from===to?' style="color:#817965"':''}>${n}</td>`).join('')}</tr>`).join('')}</tbody></table></div><p class="hint" style="margin-top:11px">Giocatori che cambiano posizione: giorno 1→2: ${movesByDay[0]} · 2→3: ${movesByDay[1]} · 3→4: ${movesByDay[2]}. La diagonale mostra chi resta nello stesso posto.</p>
    <p class="hint" style="margin-top:11px">Rimonte: il vincitore non era in testa dopo il giorno 2 in ${comeback(2)} partite e dopo il giorno 3 in ${comeback(3)}. In ${fromLastDay2} ${fromLastDay2===1?'partita era':'partite era'} ultimo dopo il giorno 2. ${withoutContracts} giocatori su ${r.length*c.players} hanno chiuso senza contratti.</p>
    <h3>Possibilità di recupero</h3><div class="kpis"><div class="kpi"><b>${round(100*gaps.filter(x=>x<=10).length/r.length)}%</b><span>Finali entro 10 Ducati</span></div><div class="kpi"><b>${round(100*comeback(2)/r.length)}%</b><span>Vincitori non primi al giorno 2</span></div><div class="kpi"><b>${round(100*dryDays/playerDays.length)}%</b><span>Giornate senza contratti</span></div><div class="kpi"><b>${round(100*fishlessDays/playerDays.length)}%</b><span>Giornate senza pesci acquistati</span></div></div>
    <p class="hint" style="margin-top:11px">In ${round(100*unreadyDays/playerDays.length)}% delle giornate il giocatore entra al mercato con carte, ma senza nessuna completabile. Le carte completabili sono contate una alla volta. Il Capitano iniziale vince ${captainWins} ${captainWins===1?'partita':'partite'} su ${r.length} (atteso con giocatori equivalenti: ${round(100/c.players)}%). Vittorie per posto al tavolo: ${seatWins.map((n,i)=>`giocatore ${i+1}: ${n}`).join(' · ')}.</p>
    <h3>Da dove arrivano e dove vanno i Ducati</h3><p class="hint">Medie per giocatore e giornata. La spesa d’offerta è pagata solo dal vincitore dell’asta. I Mercanti pagano una sola volta al giorno 4; nessuna rendita si accumula nei giorni precedenti.</p><div class="table-wrap"><table><thead><tr><th>Giorno</th><th>Contratti +</th><th>Mercanti per carta +</th><th>Mercanti a gruppi +</th><th>Pesci −</th><th>Offerte −</th><th>Saldo</th></tr></thead><tbody>${economy.map(x=>`<tr><td>${x.day}</td><td>${round(x.contracts)}</td><td>${round(x.passive)}</td><td>${round(x.marketBonus)}</td><td>${round(x.fish)}</td><td>${round(x.bids)}</td><td>${round(x.net)}</td></tr>`).join('')}</tbody></table></div>
    <h3>Ricompense dei contratti</h3><p class="hint">Medie per partita. ${c.contractOnlyCoins?'Ogni contratto concluso dà solo Ducati; la carta viene scartata e non diventa una miglioria.':c.contractChoice===false?'Ogni contratto dà sia Ducati sia una miglioria; i Ducati rinunciati sono zero.':'Chi sceglie la miglioria rinuncia all’incasso del contratto.'}</p><div class="table-wrap"><table><thead><tr><th>Giorno</th><th>Contratti con Ducati</th><th>Contratti con miglioria</th><th>Ducati rinunciati</th></tr></thead><tbody>${choicesByDay.map(x=>`<tr><td>${x.day}</td><td>${round(x.money)}</td><td>${round(x.upgrades)}</td><td>${round(x.foregone)}</td></tr>`).join('')}</tbody></table></div>
    <h3>Aste e acquisti</h3>${c.mandatoryBid?`<p class="hint">Offerte effettuate quando c’era almeno una carta in mano: ${actualOffers} su ${eligibleOffers} occasioni.</p>`:''}<div class="kpis"><div class="kpi"><b>${round(contested.length/r.length)}</b><span>Aste contese per partita</span></div><div class="kpi"><b>${round(denials.length/r.length)}</b><span>Lotti presi interamente dal vincitore con rivali</span></div><div class="kpi"><b>${round(extra/r.length)}</b><span>Pesci comprati oltre il piano per partita</span></div><div class="kpi"><b>${round(wasted/r.length)}</b><span>Pesci scartati per partita</span></div></div>
    <p class="hint" style="margin-top:11px">${auctions.length} aste con pesce · ${round(100*sum(auctions.map(x=>x.bought))/sum(auctions.map(x=>x.lot)))}% dei pesci offerti comprato · ${round(sum(buys.map(x=>x.cost))/r.length)} Ducati spesi in acquisti per partita · ${emptyBidders} partecipazioni dal 2° posto in poi senza pesci acquistati · ${auctionUpgrades.length} carte d’asta installate come migliorie${c.auctionLoserChoice?` dai perdenti, di cui ${auctionUpgradesAfterPurchase} dopo aver comprato pesci`:c.auctionCardChoice?` (${auctionUpgrades.filter(x=>x.reason==='choice').length} scelte, ${auctionUpgrades.filter(x=>x.reason==='empty').length} per lotto esaurito, ${auctionUpgrades.filter(x=>x.reason==='unavailable').length} senza acquisto possibile)`:' per lotto esaurito'}.</p>
    <h3>Vantaggio di posizione nell’asta</h3><div class="table-wrap"><table><thead><tr><th>Posto</th><th>Partecipazioni</th><th>Offerta media</th><th>Tariffa media</th><th>Pesci medi</th><th>Senza acquisto</th><th>Spesa media</th></tr></thead><tbody>${auctionRanks.filter(x=>x.count).map(x=>`<tr><td>${x.rank}°</td><td>${x.count}</td><td>${round(x.score)}</td><td>${round(x.price)}</td><td>${round(x.fish)}</td><td>${round(100*x.empty/x.count)}%</td><td>${round(x.spent)}</td></tr>`).join('')}</tbody></table></div>
    <div class="grid2"><div><h3>Per tipo di pesce</h3><div class="table-wrap"><table><thead><tr><th>Pesce</th><th>Contese</th><th>Venduti</th><th>Lotti negati</th><th>Extra</th></tr></thead><tbody>${byFish.map(f=>`<tr><td>${f.fish}</td><td>${f.contested}/${f.auctions}</td><td>${f.sold}/${f.lot}</td><td>${f.denials}</td><td>${f.extra}</td></tr>`).join('')}</tbody></table></div></div>
    <div><h3>Per tariffa d’asta</h3><div class="table-wrap"><table><thead><tr><th>Tariffa / pesce</th><th>Pesci</th><th>Extra</th><th>Spesa effettiva</th></tr></thead><tbody>${prices.map(p=>`<tr><td>${p.price}</td><td>${p.fish}</td><td>${p.extra}</td><td>${p.spent}</td></tr>`).join('')}</tbody></table></div><p class="hint" style="margin-top:10px">${contracts.length} contratti conclusi in totale · ${round(contracts.length/r.length)} per partita.</p></div></div>
    <h3>Carte potere ottenute</h3><p class="hint">Le carte installate vengono dalle aste, dai contratti oppure dalle carte rimaste in mano a fine giornata. I contratti che danno solo Ducati non installano la propria carta. I Ducati rinunciati riguardano solo la scelta esclusiva nei contratti. Gli effetti osservati sono totali del campione. “Ai vincitori” indica un’associazione, non una causa accertata.</p><div class="table-wrap"><table><thead><tr><th>Potere</th><th>Totale</th><th>Da contratti</th><th>Da aste</th><th>Da mano</th><th>Ai vincitori</th><th>Ducati rinunciati medi</th><th>Effetto osservato</th></tr></thead><tbody>${powers.map(x=>`<tr><td>${x.name}</td><td>${x.count}</td><td>${x.market}</td><td>${x.auction}</td><td>${x.hand}</td><td>${x.winner}</td><td>${round(x.foregone)}</td><td>${x.effect}</td></tr>`).join('')}</tbody></table></div>
    <p class="note">“Lotto negato” indica che il vincitore ha comprato tutto mentre almeno un altro giocatore aveva offerto. “Extra” significa oltre il bisogno stimato dal piano del bot: non prova, da solo, che un contratto avversario sia stato impedito. Le previsioni Monte Carlo sono approssimazioni; confronta più prove cambiando un parametro alla volta.${r.length<100?' Con meno di 100 partite, considera provvisorie le percentuali di vittoria e rimonta.':''}</p>`;
  document.getElementById('downloadJson').addEventListener('click',()=>download('pescaria-laboratorio.json',JSON.stringify(data,null,2),'application/json'));
  document.getElementById('downloadCsv').addEventListener('click',()=>{
    const head=['seme','capitano_iniziale','vincitore','distacco','cambi_primo',...Array.from({length:c.players},(_,i)=>`posto_${i+1}_ducati`),...Array.from({length:c.players},(_,i)=>`giocatore_${i+1}_migliorie`),'aste_contese','lotti_negati','pesci_extra','pesci_scartati','migliorie_da_mano'];
    const lines=r.map((x,i)=>[x.seed,x.initialCaptain+1,x.players[0].id+1,x.gap,changesPerGame[i],...x.players.map(p=>p.coins),...Array.from({length:c.players},(_,pid)=>x.players.find(p=>p.id===pid).upgrades),x.auctions.filter(a=>a.bidders>=2).length,x.auctions.filter(a=>a.winnerBoughtAll).length,sum(x.auctions.map(a=>a.extra)),sum(x.players.map(p=>p.wasted)),(x.handUpgrades||[]).length].join(','));
    download('pescaria-laboratorio.csv',[head.join(','),...lines].join('\n'),'text/csv');
  });
  document.getElementById('downloadDaysCsv').addEventListener('click',()=>{
    const head=['seme','giorno','giocatore','posto_finale','posto_giorno','posti_guadagnati','ducati_inizio','ducati_fine','contratti_oggi','contratti_con_ducati','contratti_con_miglioria','migliorie_da_aste','migliorie_da_mano','incasso_contratti','premio_per_carta','premio_gruppi','spesa_pesci','spesa_offerte','aste_vinte','pesci_acquistati','pesci_extra','pesci_al_mercato','pesci_scartati','carte_completabili','carte_al_mercato','pesci_conservati','carte_conservate'];
    const lines=playerDays.map(x=>[x.seed,x.day,x.pid+1,x.finalPlace,x.dayPlace,x.placesGained,x.startCoins,x.coins,x.contractsToday,x.moneyChoices,x.upgradeChoices,x.auctionUpgrades,x.handUpgrades,x.contractIncome,x.passiveIncome,x.marketBonusIncome||0,x.fishSpent,x.bidSpent,x.auctionWins,x.fishBought,x.extraBought,x.fishAtMarket,x.wastedToday,x.readyAtMarket,x.cardsAtMarket,x.fishKept,x.cardsKept].join(','));
    download('pescaria-giornate.csv',[head.join(','),...lines].join('\n'),'text/csv');
  });
}
function download(name,content,type){const url=URL.createObjectURL(new Blob([content],{type})),a=document.createElement('a');
  a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
