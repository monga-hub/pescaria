const handler={get:(t,k)=>k===Symbol.toPrimitive?(()=>''):k in t?t[k]:P,apply:()=>P,set:()=>true,construct:()=>P};
const P=new Proxy(function(){},handler);
globalThis.window=globalThis;globalThis.document=P;globalThis.matchMedia=()=>({matches:false});globalThis.gsap=P;globalThis.addEventListener=()=>{};globalThis.__PESCARIA_HEADLESS=1;globalThis.localStorage=P;globalThis.requestAnimationFrame=()=>{};
globalThis.__ESP_X=+process.env.ESP_X||1;globalThis.__LP=+process.env.LP||2;globalThis.__FPP=+process.env.FPP||6;

(() => {
'use strict';
// ============================================================
// Pescaria — simulatore V4.2 (regolamento V4.3 · mazzo V4.1)
// ============================================================
const FISH=['Polpi','Gamberi','Molluschi','Branzini','Sardine'];
const ICON={Polpi:'🐙',Gamberi:'🦐',Molluschi:'🐚',Branzini:'🐟',Sardine:'🐠'};
const COLORS=['#dc654b','#247d94','#d5a33a','#7466a6','#4f9564'];
const BOTNAMES=['Lucia','Dario','Bianca','Enrico'];
const PHASES=[['rete','1 · Pesca del Mattino'],['asta','2 · Aste'],['pubblico','3 · Mercato'],['bilancia','4 · Fine Giornata']];
const PHASE_SHORT=['Pesca','Aste','Mercato','Fine Giornata'];
const CATS={A:{icon:'⚓',name:'Ancora',phase:'rete',suit:'anchor'},E:{icon:'🔨',name:'Asta',phase:'asta',suit:'hammer'},C:{icon:'💰',name:'Mercato',phase:'pubblico',suit:'coin'},B:{icon:'⚖',name:'Bilancia',phase:'bilancia',suit:'scale'}};
// Sacchetto V4.5: la rarità segue il valore del pesce.
const BAG={Polpi:10,Gamberi:18,Molluschi:17,Branzini:27,Sardine:28};
const BANCO_BASE=6,CESTA_CAP=3,START_COINS=12,HAND=5;
const UPG={
  'Banco Ampliato':{cat:'A',img:'banco-migliorato',fx:'Il Banco contiene 1 pesce in più.'},
  'Fiuto per il Pescato':{cat:'A',img:'fiuto-pescato',fx:'Ogni mattina peschi 1 pesce a caso dal sacchetto.'},
  'Esperienza':{cat:'E',img:'eco-capitano',fx:'A consumo: +'+((typeof window.__ESP_X!=='undefined')?window.__ESP_X:1)+' al valore d’asta di una tua offerta.'},
  'Nuovi Clienti':{cat:'E',img:'patto-scarto',fx:'A consumo: quando partecipi a un’asta e la perdi, peschi 1 carta.'},
  'Contrattazione Sottobanco':{cat:'C',img:'contrattazione',fx:'A consumo: sostituisci 1 pesce di un contratto con 2 pesci uguali di un altro tipo.'},
  'Favorito della Gilda':{cat:'C',img:'favorito-gilda',fx:'Quando la installi prendi dal sacchetto un pesce a scelta e mettilo sulla carta: ogni contratto che lo richiede rende +2 Ducati.'},
  'Maestro della Pescaria':{cat:'B',img:'amico-pescatori',fx:'A Fine giornata: +2 Ducati per ogni carta Ancora installata.'},
  'Maestro delle Aste':{cat:'B',img:'capitano-aste',fx:'A Fine giornata: +2 Ducati per ogni carta Asta installata.'},
  'Maestro del Mercato':{cat:'B',img:'arte-venditore',fx:'A Fine giornata: +2 Ducati per ogni carta Mercato installata.'}
};
// Nomi stampati sulle carte e usati nel regolamento.
const DISPLAY={'Banco Ampliato':'Banco più grande','Fiuto per il Pescato':'Amici','Esperienza':'Esperienza','Nuovi Clienti':'Fortuna','Contrattazione Sottobanco':'Sottobanco','Favorito della Gilda':'La Congrega','Maestro della Pescaria':'Mercante ⚓','Maestro delle Aste':'Mercante 🔨','Maestro del Mercato':'Mercante 💰'};
const KEEP_MAX=2;
const ESP_X=(typeof window.__ESP_X!=='undefined')?window.__ESP_X:1; // Esperienza: punti d'asta per carta
const ASSET={
  phase:{rete:'assets/phase/ingrosso.png',asta:'assets/phase/aste.png',pubblico:'assets/phase/pescheria.png',bilancia:'assets/phase/bilancia.png'},
  fish:{Polpi:'assets/fish/polpo.png',Gamberi:'assets/fish/gambero.png',Molluschi:'assets/fish/mollusco.png',Branzini:'assets/fish/branzino.png',Sardine:'assets/fish/sardina.png'},
  upgrade:Object.fromEntries(Object.entries(UPG).map(([k,v])=>[k,`assets/upgrades/${v.img}.png`]))
};
// Mazzo V4.5 (CSV Dextrous, guadagni ricalibrati) — id|nome|asta|guadagno|pesce|categoria|miglioria|pesce Fiuto
const RAW=`1|Bacaro Risorto|3|4|2 Sardine|A|Banco Ampliato|
2|Bacaro della Laguna|2|3|1 Branzino|E|Esperienza|
3|La Perla Nera|3|4|1 Mollusco|B|Maestro del Mercato|
4|Osteria ai Pugni|4|4|1 Gambero|C|Contrattazione Sottobanco|
5|Le Tre Marie|3|6|2 Branzini|A|Banco Ampliato|
6|Osteria Pescheria|2|7|1 Sardina, 1 Branzino|E|Nuovi Clienti|
7|Famiglia Badoer|3|5|1 Polpo|E|Esperienza|
8|Osteria Ai Forni|4|8|2 Gamberi|A|Fiuto per il Pescato|Gambero
9|Al Traghetto|2|6|3 Sardine|E|Nuovi Clienti|
10|Cantina do Mori|2|8|1 Mollusco, 1 Sardina|E|Nuovi Clienti|
11|Bacaro da Lele|3|9|1 Gambero, 1 Branzino|A|Banco Ampliato|
12|Osteria Luna Piena|4|9|1 Polpo, 1 Sardina|C|Favorito della Gilda|
13|Al Sole Splendente|4|12|2 Branzini, 1 Mollusco|B|Maestro del Mercato|
14|Osteria da Tiziano|5|15|1 Branzino, 1 Mollusco, 1 Gambero|C|Favorito della Gilda|
15|Famiglia Tiepolo|5|13|2 Molluschi, 1 Branzino|E|Esperienza|
16|Cantina del Mistero|4|10|2 Sardine, 1 Gambero|A|Fiuto per il Pescato|Gambero
17|Osteria dell'Angelo|3|10|1 Gambero, 2 Sardine|A|Fiuto per il Pescato|Gambero
18|Bacaro della Riva|2|2|1 Sardina|B|Maestro della Pescaria|
19|Bacaro Al Volo|3|10|2 Polpi|B|Maestro delle Aste|
20|Vecia Murano|4|10|1 Gambero, 1 Mollusco|E|Nuovi Clienti|
21|Il Nono dea Gnecca|2|6|2 Branzini|B|Maestro delle Aste|
22|Laguna Segreta|4|11|1 Polpo, 1 Gambero|B|Maestro della Pescaria|
23|Ristorante la Fenice|3|8|2 Molluschi|C|Contrattazione Sottobanco|
24|Alla Tecia|4|13|1 Branzino, 1 Mollusco, 1 Sardina|C|Favorito della Gilda|
25|Osteria Da Marisa|2|2|1 Sardina|A|Fiuto per il Pescato|Sardina
26|Osteria del Sestiere|5|10|2 Branzini, 1 Sardina|B|Maestro delle Aste|
27|Bacaro del Pirata|5|5|1 Polpo|B|Maestro delle Aste|
28|Campiello Segreto|7|8|1 Sardina, 1 Gambero|B|Maestro della Pescaria|
29|Lo Sbarco dei Mori|5|9|3 Branzini|B|Maestro della Pescaria|
30|Osteria del Ballo|6|13|1 Gambero, 1 Branzino, 1 Sardina|B|Maestro della Pescaria|
31|La Bottega Oscura|7|14|2 Molluschi, 1 Gambero|B|Maestro delle Aste|
32|La Stella Cadente|4|3|1 Branzino|E|Nuovi Clienti|
33|Famiglia Dolfin|5|4|1 Gambero|A|Banco Ampliato|
34|Osteria del Sapore|6|8|1 Sardina, 1 Mollusco|E|Esperienza|
35|Trattoria Al Vecio Calice|5|5|1 Polpo|E|Esperienza|
36|Ristorante della Regina|6|9|2 Sardine, 1 Branzino|E|Esperienza|
37|Al Ponte del Diavolo|7|12|1 Gambero, 2 Branzini|C|Contrattazione Sottobanco|
38|Al Ponte di Rialto|5|10|1 Polpo, 1 Branzino|A|Fiuto per il Pescato|Polpo
39|Trattoria alla Pansa|6|12|2 Gamberi, 1 Sardina|E|Esperienza|
40|Ai Gondolieri|6|9|1 Branzino, 1 Mollusco|B|Maestro delle Aste|
41|Il Pescatore Allegro|5|9|2 Sardine, 1 Branzino|C|Contrattazione Sottobanco|
42|Ristorante Da Fiore|6|15|1 Polpo, 1 Mollusco, 1 Sardina|C|Contrattazione Sottobanco|
43|Al Magna e Bevi|5|3|1 Branzino|C|Favorito della Gilda|
44|Bacaro Nascosto|5|8|2 Molluschi|C|Favorito della Gilda|
45|Osteria della Bilancia|6|8|1 Gambero, 1 Sardina|A|Banco Ampliato|
46|Il Bacaro delle Zattere|6|5|1 Polpo|B|Maestro delle Aste|
47|Osteria del Pesce Fritto|5|13|1 Gambero, 1 Branzino, 1 Sardina|A|Banco Ampliato|
48|Osteria alla Vedova Nera|6|14|2 Molluschi, 1 Gambero|C|Contrattazione Sottobanco|
49|Locanda del Leone|6|7|1 Branzino, 1 Sardina|B|Maestro del Mercato|
50|La Gondola d'Argento|5|13|2 Gamberi, 1 Branzino|A|Banco Ampliato|
51|All'Arco Sconto|6|9|1 Polpo, 1 Sardina|C|Favorito della Gilda|
52|Osteria del Ponte Misterioso|6|4|1 Gambero|E|Esperienza|
53|All'Antica Sonada|5|12|2 Branzini, 1 Mollusco|B|Maestro del Mercato|
54|Osteria del Cicheto|6|15|1 Branzino, 1 Mollusco, 1 Gambero|A|Fiuto per il Pescato|Branzino
55|Al Bucaniere|8|17|1 Polpo, 1 Mollusco, 1 Gambero|E|Esperienza|
56|Al Rigattier|5|13|1 Sardina, 1 Gambero, 1 Branzino|B|Maestro del Mercato|
57|Osteria del Porto Antico|5|4|2 Sardine|A|Fiuto per il Pescato|Sardina
58|Alla Calle Sconta|7|10|1 Polpo, 1 Branzino|C|Contrattazione Sottobanco|
59|Bacaro della Serenata|5|9|3 Branzini|C|Contrattazione Sottobanco|
60|Al Vecio Vaporetto|6|10|1 Gambero, 1 Mollusco|A|Fiuto per il Pescato|Mollusco
61|Bacaro al Balo|7|15|1 Branzino, 1 Mollusco, 1 Gambero|B|Maestro del Mercato|
62|Osteria alla Perla|5|13|2 Molluschi, 1 Branzino|C|Favorito della Gilda|
63|Al Turista Perduto|6|14|1 Polpo, 1 Sardina, 1 Branzino|C|Favorito della Gilda|
64|Al Nono Scantabauchi|7|10|1 Gambero, 2 Sardine|C|Contrattazione Sottobanco|
65|Osteria alla Bolla|4|3|1 Branzino|E|Nuovi Clienti|
66|Osteria alla Briscola|6|14|1 Gambero, 1 Mollusco, 1 Sardina|A|Fiuto per il Pescato|Mollusco
67|Bacaro Ai Botti|5|5|1 Polpo|B|Maestro della Pescaria|
68|Alla Rete|5|8|2 Gamberi|E|Esperienza|
69|Bacaro Al Vapore|5|4|1 Mollusco|A|Banco Ampliato|
70|Bacaro Al Gatto Nero|7|13|1 Sardina, 1 Branzino, 1 Gambero|E|Esperienza|
71|Ristorante alla Frasca|8|11|1 Polpo, 1 Mollusco|E|Nuovi Clienti|
72|Il Nobile Granchio|9|13|1 Gambero, 1 Branzino, 1 Sardina|B|Maestro delle Aste|
73|Trattoria Pastasutta|9|16|1 Polpo, 1 Branzino, 1 Mollusco|E|Esperienza|
74|Trattoria del Capitano|8|10|2 Polpi|C|Contrattazione Sottobanco|
75|Ristorante Al Gondoliere|9|14|1 Gambero, 1 Mollusco, 1 Sardina|B|Maestro della Pescaria|
76|Osteria dello Squero|7|3|1 Branzino|E|Nuovi Clienti|
77|Locanda Alle Vele|8|12|2 Gamberi, 1 Sardina|B|Maestro delle Aste|
78|Locanda La Risata|9|10|1 Polpo, 1 Branzino|A|Banco Ampliato|
79|Ristorante Do Forni|10|15|1 Gambero, 1 Mollusco, 1 Branzino|A|Fiuto per il Pescato|Branzino
80|Osteria Ninfea|6|4|1 Mollusco|A|Banco Ampliato|
81|Trattoria Al Tesoro|9|14|1 Sardina, 1 Gambero, 1 Mollusco|C|Favorito della Gilda|
82|Trattoria Al Vin Bon|10|16|1 Polpo, 1 Branzino, 1 Gambero|C|Contrattazione Sottobanco|
83|Ristorante Ca' Foscari|8|12|2 Branzini, 1 Mollusco|C|Favorito della Gilda|
84|Trattoria del Rio|7|7|1 Branzino, 1 Sardina|A|Banco Ampliato|
85|Osteria Vecio Bacan|10|14|2 Molluschi, 1 Gambero|A|Banco Ampliato|
86|Ai Pie del Ponte|9|17|1 Polpo, 1 Mollusco, 1 Gambero|E|Esperienza|
87|Ristorante dei Morosini|9|9|2 Sardine, 1 Branzino|E|Esperienza|
88|La Botte Bona|8|5|1 Polpo|E|Nuovi Clienti|
89|Ristorante Al Tramonto|8|8|1 Mollusco, 1 Sardina|C|Favorito della Gilda|
90|Trattoria Il Gatto Rosso|7|6|2 Branzini|C|Contrattazione Sottobanco|
91|Famiglia Contarini|10|11|1 Polpo, 1 Mollusco|A|Fiuto per il Pescato|Polpo
92|Famiglia Dandolo|8|13|1 Gambero, 1 Branzino, 1 Sardina|B|Maestro del Mercato|
93|Famiglia Corner|9|10|1 Polpo, 1 Branzino|B|Maestro del Mercato|
94|Famiglia Zeno|10|9|1 Gambero, 1 Branzino|E|Esperienza|
95|Famiglia Querini|6|4|1 Mollusco|A|Banco Ampliato|
96|Famiglia Barbarigo|9|14|1 Sardina, 1 Gambero, 1 Mollusco|E|Nuovi Clienti|
97|Famiglia Grimani|10|16|1 Polpo, 1 Branzino, 1 Gambero|B|Maestro della Pescaria|
98|Famiglia Barbaro|8|12|2 Branzini, 1 Mollusco|A|Fiuto per il Pescato|Branzino
99|Famiglia Loredan|7|7|1 Branzino, 1 Sardina|C|Contrattazione Sottobanco|
100|Famiglia Mocenigo|10|14|2 Molluschi, 1 Gambero|C|Favorito della Gilda|`;

const $=id=>document.getElementById(id), esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const singular={Polpo:'Polpi',Polpi:'Polpi',Gambero:'Gamberi',Gamberi:'Gamberi',Mollusco:'Molluschi',Molluschi:'Molluschi',Branzino:'Branzini',Branzini:'Branzini',Sardina:'Sardine',Sardine:'Sardine'};
const parseRecipe=s=>{const r={};for(const x of s.split(',')){const [,n,f]=x.trim().match(/(\d+)\s+(.+)/);r[singular[f]]=(r[singular[f]]||0)+ +n}return r};
const CARDS=RAW.trim().split('\n').map(line=>{const [id,name,bid,value,fish,cat,up,fiuto]=line.split('|');return{id:+id,name,bid:+bid,value:+value,fish,recipe:parseRecipe(fish),cat,up,fiuto:fiuto?singular[fiuto]:null}});
class RNG{constructor(seed){this.s=(seed>>>0)||1}next(){this.s=(this.s+0x6D2B79F5)|0;let t=this.s;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296}int(n){return Math.floor(this.next()*n)}shuffle(a){for(let i=a.length-1;i>0;i--){const j=this.int(i+1);[a[i],a[j]]=[a[j],a[i]]}return a}}
let G=null;
const HEADLESS=typeof window.__PESCARIA_HEADLESS!=='undefined';
const inv=()=>Object.fromEntries(FISH.map(f=>[f,0]));
const count=o=>FISH.reduce((n,f)=>n+(o[f]||0),0);
const mix=(a,b)=>Object.fromEntries(FISH.map(f=>[f,(a[f]||0)+(b[f]||0)]));
const copies=(p,u)=>p.installed.filter(c=>c.up===u).length;
const catCount=(p,cat)=>p.installed.filter(c=>c.cat===cat).length;
const capBanco=p=>BANCO_BASE+copies(p,'Banco Ampliato');
const roomBanco=p=>Math.max(0,capBanco(p)-count(p.banco));
// La Congrega: ogni carta installata ha il suo pesce preferito; +2 per ogni carta il cui pesce è nel contratto.
const congregaBonus=(p,card)=>2*p.installed.filter(c=>c.up==='Favorito della Gilda'&&c.favFish&&card.recipe[c.favFish]).length;
const catBonus=(p,card)=>p.installed.filter(c=>c.cat===card.cat).length;
const fishText=r=>Object.entries(r).map(([f,n])=>`<span class="recipe-item"><b>${n}</b><img class="recipe-fish" src="${ASSET.fish[f]}" alt="${f}"></span>`).join('');
const SING={Polpi:'Polpo',Gamberi:'Gambero',Molluschi:'Mollusco',Branzini:'Branzino',Sardine:'Sardina'};
const upName=c=>DISPLAY[c.up]||c.up;

function log(phase,text){G.log.push({day:G.day,phase,text});if(G.log.length>120)G.log.shift()}
function drawFish(){return G.bag.length?G.bag.pop():null}
function returnFish(f,n=1){for(let i=0;i<n;i++)G.bag.push(f);if(n)G.rng.shuffle(G.bag)}
function drawCard(){if(!G.deck.length){G.deck=G.rng.shuffle(G.discard.splice(0));log('Mazzo','Gli scarti sono stati rimescolati.')}return G.deck.pop()}
function discard(c){if(c)G.discard.push(c)}
function turnOrder(){return Array.from({length:G.players.length},(_,i)=>(G.captain+i)%G.players.length)}

// ---------------- Contratti ----------------
// Restituisce il piano di consegna {use:{fish:n}, subs:k} o null. Contrattazione: 1 pesce mancante = 2 pesci uguali di altro tipo.
function planContract(p,card,stock=mix(p.banco,p.cesta),subsLeft=p.subsLeft){
  const use={...card.recipe};let subs=0;
  for(const f of FISH){let miss=(use[f]||0)-(stock[f]||0);
    while(miss>0){if(subs>=subsLeft)return null;
      const alt=FISH.filter(y=>y!==f&&(stock[y]||0)-(use[y]||0)>=2).sort((a,b)=>((stock[b]-(use[b]||0))-(stock[a]-(use[a]||0))))[0];
      if(!alt)return null;use[f]--;use[alt]=(use[alt]||0)+2;subs++;miss--}}
  for(const f of FISH)if(!use[f])delete use[f];
  return{use,subs};
}
const canContract=(p,c)=>!!planContract(p,c);
function payout(p,card){return card.value+catBonus(p,card)+congregaBonus(p,card)}
function completeContract(p,card){
  const plan=planContract(p,card);if(!plan)return false;
  for(const [f,n0] of Object.entries(plan.use)){let n=n0;const fromC=Math.min(n,p.cesta[f]);p.cesta[f]-=fromC;n-=fromC;p.banco[f]-=n;returnFish(f,n0)}
  p.subsLeft-=plan.subs;
  const cb=catBonus(p,card),fav=congregaBonus(p,card),gain=card.value+cb+fav;
  p.coins+=gain;p.orders++;p.catTot=(p.catTot||0)+cb;p.favTot=(p.favTot||0)+fav;p.today.contracts.push(card);p.today.income+=gain;
  if(p.keptIds&&p.keptIds.has(card.id))p.keptUsed=(p.keptUsed||0)+1;
  p.hand.splice(p.hand.indexOf(card),1);p.pending.push(card);
  log('Mercato',`${p.name} completa “${card.name}”: ${card.value}${cb?` +${cb} categoria`:''}${fav?` +${fav} Congrega`:''} = ${gain} Ducati${plan.subs?` (Sottobanco)`:''}.`);
  return true;
}

// ---------------- Setup ----------------
window.newGame=function(){
  const n=+$('playerCount').value,name=$('playerName').value.trim()||'Mercante',seed=+$('seed').value||1,difficulty=$('difficulty').value;
  startGame({n,name,seed,difficulty,humanBot:false});
  document.body.classList.add('playing');$('setup').classList.add('hidden');$('end').classList.add('hidden');$('game').classList.remove('hidden');render();
};
function startGame({n,name,seed,difficulty,humanBot}){
  const rng=new RNG(seed),bag=[];for(const f of FISH)for(let i=0;i<BAG[f];i++)bag.push(f);
  G={rng,day:1,phase:'rete',difficulty,humanBot,players:Array.from({length:n},(_,id)=>({id,name:id?BOTNAMES[id-1]:name,human:id===0&&!humanBot,coins:START_COINS,banco:inv(),cesta:inv(),hand:[],installed:[],pending:[],kept:[],keptIds:new Set(),fortunaLeft:0,influence:0,subsLeft:0,orders:0,wasted:0,bilanciaTot:0,passedAll:false,today:{contracts:[],income:0,bilancia:[]}})),bag:rng.shuffle(bag),deck:rng.shuffle(CARDS.map(c=>({...c}))),discard:[],captain:rng.int(n),market:inv(),log:[],selectedBid:null,bidCash:0,bidInfl:0,overlay:null};
  log('Partita',`${G.players[G.captain].name} ha mangiato pesce più di recente: è il primo Capitano.`);
  startDay();
}
window.restartGame=function(){if(G&&!G.finished&&!confirm('Abbandonare la partita in corso?'))return;G=null;document.body.classList.remove('playing');$('game').classList.add('hidden');$('end').classList.add('hidden');$('setup').classList.remove('hidden')};

// ---------------- Fase 1 · Pesca del Mattino ----------------
function startDay(){
  for(const p of G.players){p.influence=copies(p,'Esperienza');p.subsLeft=copies(p,'Contrattazione Sottobanco');p.fortunaLeft=0;p.sceltaLeft=copies(p,'Nuovi Clienti');p.senzaLeft=copies(p,'Esperienza');p.influence=0;p.passedAll=false;p.today={contracts:[],income:0,bilancia:[]}}
  G.phase='rete';G.market=inv();
  const n=G.players.length===1?6:(globalThis.__FPP||6)*G.players.length;let drawn=0;
  for(let i=0;i<n;i++){const f=drawFish();if(!f)break;G.market[f]++;drawn++}
  log('Pesca',`Giorno ${G.day}: ${G.players[G.captain].name} (Capitano) estrae ${drawn} pesci per il mercato.`);
  G.fiutoLog=[];
  // Fiuto per il Pescato: ogni copia pesca 1 pesce a caso dal Sacchetto.
  for(const p of turnOrder().map(i=>G.players[i]))for(const c of p.installed.filter(c=>c.up==='Fiuto per il Pescato')){
    if(!roomBanco(p)){log('Fiuto',`${p.name}: Banco pieno, “${c.name}” non pesca.`);continue}
    const f=drawFish();if(!f){log('Fiuto',`${p.name}: il Sacchetto è vuoto.`);continue}
    p.banco[f]++;G.fiutoLog.push({pid:p.id,f});log('Fiuto',`${p.name} pesca dal Sacchetto ${ICON[f]} ${f} grazie a “${c.name}”.`)}
  G.overlay=G.players.some(p=>p.human)?'morning':null;
  if(!G.overlay)startDraft();
}
window.beginDraft=function(){if(!G||G.phase!=='rete')return;G.overlay=null;startDraft();render()};

function startDraft(){
  G.phase='draft';G.draftRound=1;G.drafted=G.players.map(()=>[]);G.draftPacks=G.players.map(()=>Array.from({length:HAND},drawCard).filter(Boolean));
  log('Draft','Inizia il draft: pacchetti di 5 carte, si passa a sinistra.');
  if(!G.players[0].human){while(G.phase==='draft')draftStep(null)}
}
function draftStep(humanId){
  const picks=G.players.map((p,i)=>p.human?G.draftPacks[i].find(c=>c.id===humanId):botDraft(p,G.draftPacks[i]));
  if(picks.some(x=>!x))return false;
  for(const p of G.players){const pack=G.draftPacks[p.id],card=picks[p.id];pack.splice(pack.indexOf(card),1);G.drafted[p.id].push(card)}
  if(!G.draftPacks[0].length){finishDraft();return true}
  const k=G.players.length,passed=Array(k);for(let i=0;i<k;i++)passed[(i+1)%k]=G.draftPacks[i];G.draftPacks=passed;G.draftRound++;return true;
}
window.pickDraft=function(id){
  if(G.phase!=='draft')return;const c=G.draftPacks[0].find(x=>x.id===id);if(!c)return;
  log('Draft',`${G.players[0].name} sceglie “${c.name}” al giro ${G.draftRound}.`);draftStep(id);
  if(G.phase==='draft'&&G.draftPacks[0].length===1){log('Draft','L’ultima carta rimasta viene presa automaticamente.');draftStep(G.draftPacks[0][0].id)}
  render();
};
function finishDraft(){
  for(const p of G.players){p.hand.push(...G.drafted[p.id],...p.kept);p.keptIds=new Set(p.kept.map(c=>c.id));p.kept=[];p.plan=null}
  log('Draft','Draft completato: ognuno riprende in mano anche le carte conservate.');
  G.phase='asta';G.auctionIndex=-1;G.aOrder=[...FISH];nextAuction();
}

// ---------------- Fase 2 · Aste ----------------
function currentFish(){return (G.aOrder||FISH)[G.auctionIndex]}
function nextAuction(){
  G.selectedBid=null;G.bidCash=0;G.bidInfl=0;G.buyQty=0;G.auctionResult=null;G.buyQueue=null;
  G.auctionIndex++;
  while(G.auctionIndex<FISH.length&&!G.market[currentFish()]){log('Asta',`Nessun ${currentFish().toLowerCase()} al mercato: asta saltata.`);G.auctionIndex++}
  if(G.auctionIndex>=FISH.length){startMarket();return}
  // Variante: Scegli l'asta (ex Fortuna) — il Capitano sceglie quale lotto va all'asta.
  {const cp=G.players[G.captain];if(cp.sceltaLeft>0){const left=G.aOrder.slice(G.auctionIndex).filter(f=>G.market[f]>0);const keep=botPlan(cp);
    const best=[...left].sort((a,b)=>Math.min(needOf(cp,b,keep),G.market[b])-Math.min(needOf(cp,a,keep),G.market[a]))[0];
    if(best&&best!==currentFish()&&Math.min(needOf(cp,best,keep),G.market[best])>Math.min(needOf(cp,currentFish(),keep),G.market[currentFish()])){const j=G.aOrder.indexOf(best);[G.aOrder[G.auctionIndex],G.aOrder[j]]=[G.aOrder[j],G.aOrder[G.auctionIndex]];cp.sceltaLeft--;cp.sceltaUsed=(cp.sceltaUsed||0)+1}}}
  G.auctionStage='bid';
  const me=G.players[0];if(!me.human||me.passedAll||!me.hand.length)submitBid('none');
}
function bidScore(b){return b.card.bid+b.cash+b.infl*ESP_X}
window.chooseBid=function(id){if(G.phase!=='asta'||G.auctionStage!=='bid'||!G.players[0].hand.some(c=>c.id===id))return;G.selectedBid=id;G.bidCash=0;G.bidInfl=0;render()};
window.returnBidCard=function(){if(G.phase!=='asta'||G.auctionStage!=='bid')return;G.selectedBid=null;G.bidCash=0;G.bidInfl=0;render()};
window.addInfluence=function(){const me=G.players[0];if(G.phase!=='asta'||G.auctionStage!=='bid'||!G.selectedBid)return;G.bidInfl=G.bidInfl>=me.influence?0:G.bidInfl+1;render()};
window.submitBid=function(mode='bid'){
  if(G.phase!=='asta'||G.auctionStage!=='bid')return;const me=G.players[0],f=currentFish(),bids=[];
  if(mode==='all'){me.passedAll=true;log('Asta','Non partecipi alle aste rimaste oggi.')}
  if(mode==='bid'){const card=me.hand.find(c=>c.id===G.selectedBid);if(!card)return;bids.push({pid:0,card,cash:Math.min(G.bidCash,me.coins),infl:Math.min(G.bidInfl,me.influence)})}
  // Offerte in ordine dal Capitano: i Ducati sono pubblici, la carta è coperta.
  const ord=turnOrder();for(const i of ord){const p=G.players[i];if(p.human||(p.id===0&&mode==='bid'))continue;const seen=bids.filter(x=>ord.indexOf(x.pid)<ord.indexOf(p.id));const b=botBid(p,f,seen);if(b)bids.push(b)}
  resolveBids(bids);render();
};
function resolveBids(bids){
  const f=currentFish(),order=turnOrder();G.clientsQueue=[];
  for(const b of bids){const p=G.players[b.pid];p.hand.splice(p.hand.indexOf(b.card),1);discard(b.card)}
  if(!bids.length){log('Asta',`Nessuno partecipa all’asta dei ${f}: il pesce torna nel Sacchetto.`);returnFish(f,G.market[f]);G.market[f]=0;G.auctionResult=[];afterAuction();return}
  bids.sort((a,b)=>bidScore(b)-bidScore(a)||order.indexOf(a.pid)-order.indexOf(b.pid));
  const win=bids[0],wp=G.players[win.pid];wp.coins-=win.cash;for(const b of bids)G.players[b.pid].influence-=b.infl;G.captain=win.pid;
  G.auctionResult=bids;
  log('Asta',`${wp.name} vince l’asta dei ${f} con ${bidScore(win)} (carta ${win.card.bid}${win.cash?` + ${win.cash} Ducati`:''}${win.infl?` + ${win.infl*ESP_X} Esperienza`:''}) e diventa Capitano.`);
  for(const b of bids.slice(1)){const p=G.players[b.pid];if(p.fortunaLeft>0){p.fortunaLeft--;G.clientsQueue.push({pid:p.id,k:1})}}
  G.buyQueue=bids.map((b,i)=>({pid:b.pid,price:i===0?1:(globalThis.__LP||2),rank:i}));G.buyPos=0;G.auctionStage='buy';advanceBuys();
}
function maxBuy(p,f,price){return Math.min(G.market[f],roomBanco(p),Math.floor(p.coins/price))}
function buy(p,f,n,price){n=Math.max(0,Math.min(n,maxBuy(p,f,price)));if(n){p.coins-=n*price;p.banco[f]+=n;G.market[f]-=n;log('Acquisto',`${p.name} compra ${n} ${f} a ${price} Ducat${price>1?'i':'o'} l’uno.`)}return n}
function advanceBuys(){
  const f=currentFish();
  while(G.buyPos<G.buyQueue.length&&G.market[f]){const q=G.buyQueue[G.buyPos],p=G.players[q.pid];
    if(p.human){if(maxBuy(p,f,q.price)>0){G.buyQty=Math.min(maxBuy(p,f,q.price),Math.max(q.rank===0?1:0,needOf(p,f)));return}G.buyPos++;continue}
    if(q.price>1&&p.senzaLeft>0&&needOf(p,f,botPlan(p))>0){q.price=1;p.senzaLeft--;p.senzaUsed=(p.senzaUsed||0)+1}
    botBuy(p,f,q.price,q.rank);G.buyPos++}
  if(G.market[f]){returnFish(f,G.market[f]);log('Asta',`${G.market[f]} ${f} invenduti tornano nel Sacchetto.`);G.market[f]=0}
  afterAuction();
}
window.toggleBuyToken=function(n){G.buyQty=G.buyQty===n?n-1:n;render()};
window.confirmBuy=function(){const q=G.buyQueue[G.buyPos];buy(G.players[0],currentFish(),G.buyQty||0,q.price);G.buyPos++;advanceBuys();render()};
function afterAuction(){
  G.auctionStage='clients';
  while(G.clientsQueue?.length){const {pid}=G.clientsQueue.shift(),p=G.players[pid],c=drawCard();if(!c)continue;
    p.hand.push(c);p.fortunaDraws=(p.fortunaDraws||0)+1;log('Fortuna',`${p.name} perde l’asta e pesca una carta${p.human?`: “${c.name}”`:''}.`)}
  G.overlay=null;nextAuction();
}

// ---------------- Fase 3 · Mercato ----------------
function startMarket(){
  G.phase='pubblico';G.overlay=null;log('Mercato','Apre il Mercato: ogni mercante completa i propri contratti.');
  for(const p of G.players)if(!p.human)botMarket(p);
  if(!G.players[0].human)finishMarket();
}
window.serveContract=function(id){if(G.phase!=='pubblico')return;const p=G.players[0],c=p.hand.find(x=>x.id===id);if(c&&completeContract(p,c))render()};
window.finishMarket=function(){if(G.phase!=='pubblico')return;finishMarket();render()};
function finishMarket(){
  for(const p of G.players){
    // Cesta: dei pesci rimasti se ne tengono al massimo 3 (priorità ai più pregiati); il resto torna nel sacchetto.
    const pool=[];for(const f of FISH)for(let i=0;i<p.banco[f]+p.cesta[f];i++)pool.push(f);
    const pri=f=>({Polpi:5,Gamberi:4,Molluschi:4,Branzini:3,Sardine:2})[f];
    pool.sort((a,b)=>pri(b)-pri(a));const keep=pool.slice(0,CESTA_CAP),gone=pool.slice(CESTA_CAP);
    p.banco=inv();p.cesta=inv();for(const f of keep)p.cesta[f]++;for(const f of gone)returnFish(f);p.wasted+=gone.length;
    log('Mercato',`${p.name}: ${keep.length} pesci in Cesta${gone.length?`, ${gone.length} tornano nel sacchetto`:''}.`);
    if(!p.human)keepCards(p,botKeep(p));
  }
  const me=G.players[0];
  if(me.human&&me.hand.length&&G.day<4){G.phase='conserva';G.keepSel=new Set();G.overlay='keep';return}
  if(me.human)keepCards(me,[]);
  startEndOfDay();
}
function keepCards(p,ids){
  const keep=p.hand.filter(c=>ids.includes(c.id)).slice(0,KEEP_MAX);
  for(const c of p.hand)if(!keep.includes(c))discard(c);
  p.kept=keep;p.hand=[];p.keptTot=(p.keptTot||0)+keep.length;
  if(keep.length)log('Mercato',`${p.name} conserva ${keep.length} carte per domani.`);
}
window.toggleKeep=function(id){if(G.overlay!=='keep')return;if(G.keepSel.has(id))G.keepSel.delete(id);else if(G.keepSel.size<KEEP_MAX)G.keepSel.add(id);render()};
window.confirmKeep=function(){if(G.overlay!=='keep')return;keepCards(G.players[0],[...G.keepSel]);G.overlay=null;startEndOfDay();render()};

// ---------------- Fase 4 · Fine Giornata ----------------
const MAESTRO={'Maestro della Pescaria':'A','Maestro delle Aste':'E','Maestro del Mercato':'C'},MAESTRO_X=2;
function bilanciaIncome(p){
  // Ogni Maestro: +2 per ogni carta installata della sua categoria, nessuna soglia.
  return p.installed.filter(c=>c.cat==='B').map(c=>{const k=MAESTRO[c.up];return{card:c,v:MAESTRO_X*catCount(p,k)}});
}
function startEndOfDay(){
  G.phase='bilancia';G.favQueue=[];
  for(const p of G.players){
    // 1. Installazione. La Congrega: il pesce scelto viene preso dal sacchetto e messo sulla carta.
    if(p.pending.length)log('Migliorie',`${p.name} installa ${p.pending.map(upName).join(', ')}.`);
    p.installed.push(...p.pending);
    for(const c of p.pending.filter(c=>c.up==='Favorito della Gilda')){
      if(p.human)G.favQueue.push(c);else placeFavorite(p,c,botFavorite(p));}
    p.pending=[];
  }
  if(G.favQueue.length){G.overlay='favorite';return}
  endOfDayIncome();
}
function placeFavorite(p,c,f){
  let i=G.bag.lastIndexOf(f);
  if(i<0){const alt=FISH.find(x=>G.bag.includes(x));if(!alt)return;f=alt;i=G.bag.lastIndexOf(f)}
  G.bag.splice(i,1);c.favFish=f;log('La Congrega',`${p.name} mette ${ICON[f]} ${f} su “${c.name}”.`);
}
function endOfDayIncome(){
  for(const p of G.players){
    // 2. Rendite dei Mercanti.
    const inc=bilanciaIncome(p),tot=inc.reduce((s,x)=>s+x.v,0);p.coins+=tot;p.bilanciaTot+=tot;p.today.bilancia=inc;
    if(tot)log('Rendite',`${p.name}: i Mercanti rendono ${tot} Ducati.`);
  }
  G.overlay=G.players[0].human?'summary':null;
  if(!G.players[0].human)finishDay();
}
window.pickFavorite=function(f){if(G.overlay!=='favorite')return;const c=G.favQueue.shift();placeFavorite(G.players[0],c,f);if(G.favQueue.length){render();return}G.overlay=null;endOfDayIncome();render()};
window.finishDayBtn=function(){if(G.phase!=='bilancia'||G.overlay==='favorite'||G.overlay==='keep')return;G.overlay=null;finishDay();render()};
function finishDay(){
  if(G.day===4){finishGame();return}
  G.day++;startDay();
}
function ranking(){return[...G.players].sort((a,b)=>b.coins-a.coins||(b.installed.length+b.pending.length)-(a.installed.length+a.pending.length))}
function finishGame(){
  G.finished=true;G.phase='fine';const ranked=ranking();if(HEADLESS)return;
  document.body.classList.remove('playing');$('game').classList.add('hidden');$('end').classList.remove('hidden');
  const human=G.players[0].human;
  $('end').innerHTML=`<div class="trophy">${human&&ranked[0].id===0?'🏆':'⚓'}</div><div class="eyebrow">Partita conclusa</div><h2>${human&&ranked[0].id===0?'Hai vinto!':esc(ranked[0].name)+' vince'}</h2><p>Dopo quattro giornate di mercato, il miglior mercante della Laguna ha ${ranked[0].coins} Ducati.</p><div class="rank">${ranked.map((p,i)=>`<div class="rankrow"><div class="place">${i+1}°</div><div class="who"><i class="dot" style="background:${COLORS[p.id]}"></i>${esc(p.name)}${p.human?' (tu)':''}</div><b>${p.coins} ◈ · ${p.orders} contratti · ${p.installed.length+p.pending.length} migliorie · Bilancia ${p.bilanciaTot}</b></div>`).join('')}</div><button class="btn primary" onclick="restartGame()">Gioca ancora</button>`;
}

// ---------------- Bot ----------------
const noise=()=>G.difficulty==='easy'?G.rng.next()*8:G.rng.next()*(G.difficulty==='hard'?1:3);
function botUpgradeValue(p,c){
  const daysLeft=4-G.day,cat=c.cat;let v=daysLeft*.6; // +1 ai contratti futuri della stessa categoria
  if(c.up==='Banco Ampliato')v+=daysLeft*.6;
  if(c.up==='Fiuto per il Pescato')v+=daysLeft*1.8;
  if(c.up==='Esperienza')v+=daysLeft*1.5;
  if(c.up==='Nuovi Clienti')v+=daysLeft*1;
  if(c.up==='Contrattazione Sottobanco')v+=daysLeft*1;
  if(c.up==='Favorito della Gilda')v+=daysLeft*2;
  if(cat==='B'){const k=MAESTRO[c.up],have=catCount(p,k)+p.pending.filter(x=>x.cat===k).length;v+=(daysLeft+1)*MAESTRO_X*Math.max(.5,have)}
  return v;
}
function availability(p,c){const stock=mix(mix(p.banco,p.cesta),G.market);let miss=0,need=0;for(const [f,n] of Object.entries(c.recipe)){need+=n;miss+=Math.max(0,n-(stock[f]||0))}return need?1-miss/need:1}
function botCardValue(p,c){return payout(p,c)+botUpgradeValue(p,c)*(G.day<4?1:(c.cat==='B'?1:0))}
function botDraft(p,pack){
  const score=c=>{const contract=botCardValue(p,c)*(0.35+0.65*availability(p,c)),bidUse=c.bid*.9;return Math.max(contract,bidUse)+noise()};
  return[...pack].sort((a,b)=>score(b)-score(a))[0];
}
// Il bot sceglie quali carte tenere come contratti (piano) e quali usare in asta.
function botPlan(p){
  if(p.plan&&[...p.plan].every(id=>p.hand.some(c=>c.id===id)))return p.plan;
  p.plan=botPlanFresh(p);return p.plan;
}
function botPlanFresh(p){
  const cards=[...p.hand].sort((a,b)=>(botCardValue(p,b)*(.4+.6*availability(p,b))-b.bid*.3)-(botCardValue(p,a)*(.4+.6*availability(p,a))-a.bid*.3));
  const keepN=Math.min(cards.length,2);return new Set(cards.slice(0,keepN).map(c=>c.id));
}
// Contratti del piano ancora realizzabili: ogni pesce mancante è quello in asta ora o in un'asta successiva con abbastanza pesce.
function feasible(p,c){const stock=mix(p.banco,p.cesta);return Object.entries(c.recipe).every(([g,n])=>{const miss=n-(stock[g]||0);if(miss<=0)return true;const gi=(G.aOrder||FISH).indexOf(g);return gi>=G.auctionIndex&&(G.market[g]||0)>=miss})}
function needOf(p,f,keepIds){
  const keep=keepIds?p.hand.filter(c=>keepIds.has(c.id)&&(G.phase!=='asta'||feasible(p,c))):p.hand;let need=0;for(const c of keep)need+=c.recipe[f]||0;
  return Math.max(0,need-p.banco[f]-p.cesta[f]);
}
const CARD_AVG=CARDS.reduce((s,c)=>s+c.bid,0)/CARDS.length;
function botBid(p,f,seen=[]){
  if(!p.hand.length||!roomBanco(p))return null;
  const keep=botPlan(p),need=Math.min(needOf(p,f,keep),G.market[f]);
  if(!need)return G.rng.next()<(G.difficulty==='hard'?.05:.12)&&p.hand.length>3?cheapBid(p,keep):null;
  const bidCards=p.hand.filter(c=>!keep.has(c.id)).sort((a,b)=>b.bid-a.bid);
  const factor={easy:.75,normal:.75,hard:.75}[G.difficulty],target=Math.round((4+need*2.2)*factor+G.rng.next()*2);
  // Ducati ed Esperienza degli avversari già in tavola sono visibili; la loro carta no (stima: valore medio).
  const est=seen.length?Math.max(...seen.map(s=>s.cash+s.infl*ESP_X+CARD_AVG)):0;
  const tgt=Math.max(target,Math.ceil(est)+1);
  let card=bidCards.find(c=>c.bid+p.influence*ESP_X>=tgt)||bidCards[0];
  if(!card){if(need<2)return null;card=[...p.hand].sort((a,b)=>botCardValue(p,a)-botCardValue(p,b))[0]}
  const infl=Math.min(p.influence,Math.ceil(Math.max(0,tgt-card.bid)/ESP_X));
  // Vincere l'asta fa risparmiare ~1 Ducato per pesce: il bot non punta più Ducati di quanti ne risparmia.
  const cap=need;
  const cash=Math.max(0,Math.min(p.coins-need*2,cap,tgt-card.bid-infl*ESP_X));
  // Se non si può superare l'offerta visibile, si partecipa col minimo per comprare a 2.
  if(seen.length&&card.bid+cash+infl*ESP_X<=est)return cheapBid(p,keep);
  return{pid:p.id,card,cash:Math.max(0,cash),infl};
}
function cheapBid(p,keep){const c=p.hand.filter(c=>!keep.has(c.id)).sort((a,b)=>a.bid-b.bid)[0];return c?{pid:p.id,card:c,cash:0,infl:0}:null}
function botBuy(p,f,price,rank){
  const keep=botPlan(p);let n=needOf(p,f,keep);
  if(rank===0&&p.coins>6)n=Math.max(n+(G.difficulty==='easy'?0:1),1);
  n=Math.min(n,maxBuy(p,f,price));
  if(price>1&&n>0&&p.coins-n*price<0)n=0;
  buy(p,f,n,price);
}
function botMarket(p){let moved=true;while(moved){moved=false;const c=p.hand.filter(x=>canContract(p,x)).sort((a,b)=>payout(p,b)+botUpgradeValue(p,b)-(payout(p,a)+botUpgradeValue(p,a)))[0];if(c){completeContract(p,c);moved=true}}}
// Carte da conservare: le più promettenti come contratti (col pesce in Cesta) o come offerte forti.
function botKeep(p){if(G.day===4)return[];const stock=p.cesta;const sc=c=>{let have=0,need=0;for(const [f,n] of Object.entries(c.recipe)){need+=n;have+=Math.min(n,stock[f]||0)}return Math.max(botCardValue(p,c)*(.35+.65*have/need),c.bid*.9)};return [...p.hand].sort((a,b)=>sc(b)-sc(a)).slice(0,KEEP_MAX).map(c=>c.id)}
function botFavorite(p){const tally=inv();for(const c of [...p.installed,...p.pending,...p.hand])for(const [f,n] of Object.entries(c.recipe))tally[f]+=n;return [...FISH].sort((a,b)=>tally[b]-tally[a])[0]}

// ---------------- Rendering ----------------
function scoreCard(p){return`<article class="panel score ${p.id===G.captain?'captain':''} ${p.human?'you':''}"><div class="who"><i class="dot" style="background:${COLORS[p.id]}"></i>${esc(p.name)} ${p.id===G.captain?'⚓':''}</div><div class="money">${p.coins} ◈</div><div class="sub">${p.orders} contratti · ${p.installed.length+p.pending.length} migliorie</div></article>`}
function physicalPhase(){return G.phase==='asta'?1:(G.phase==='pubblico'||G.phase==='conserva')?2:G.phase==='bilancia'?3:0}
function activeAuctionFish(){return G.phase==='asta'&&['bid','buy'].includes(G.auctionStage)?currentFish():null}
function offerState(p){
  if(G.phase!=='asta')return{value:'—',detail:p.human?'':`${count(p.banco)}/${capBanco(p)} banco`};
  if(G.auctionResult){const b=G.auctionResult.find(x=>x.pid===p.id);return b?{value:bidScore(b),detail:`carta ${b.card.bid}${b.cash?` + ${b.cash} ◈`:''}${b.infl?` + ${b.infl*ESP_X} esp.`:''}`}:{value:'PASSA',detail:''}}
  if(G.auctionStage==='bid'){if(p.human&&G.selectedBid)return{value:'COPERTA',detail:G.bidCash?`+ ${G.bidCash} ◈`:'pronta'};return{value:'ATTESA',detail:''}}
  return{value:'—',detail:''}
}
function humanArea(p,color){
  const zone=body=>`<div class="offer-zone human-action" style="--player:${color};--player-soft:${color}55"><span class="offer-name">${esc(p.name)} · tu</span><div class="player-area-action">${body}</div></div>`;
  if(G.phase==='asta'&&G.auctionStage==='bid'){const card=p.hand.find(c=>c.id===G.selectedBid),coins=`<button id="offerCoins" class="offer-coins ${G.bidCash?'':'hidden'}" onclick="removeBidCoin(event)" title="Riprendi un Ducato" aria-label="Riprendi un Ducato"><i>◈</i><i>◈</i><i>◈</i><b id="offerCoinCount">${G.bidCash}</b></button>`,infl=p.influence?`<button class="auction-btn" ${card?'':'disabled'} title="Usa Esperienza: +${ESP_X} per carta" onclick="addInfluence()">ESP +${G.bidInfl*ESP_X} (${G.bidInfl}/${p.influence})</button>`:'';
    return`<div class="offer-zone human-bid" style="--player:${color};--player-soft:${color}55"><span class="offer-name">${esc(p.name)} · tu</span>${card?`<div id="humanOfferCard" class="offer-card-back" role="button" tabindex="0" title="Rimetti la carta in mano" aria-label="Carta offerta coperta. Clicca per riprenderla" onclick="returnBidCard()" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();returnBidCard()}"><span>⚓</span>${coins}</div>`:'<div class="offer-card-empty">SCEGLI<br>UNA CARTA</div>'}<div class="auction-controls"><button class="auction-btn offer-submit" ${card?'':'disabled'} onclick="submitBid()">OFFRI${card?` ${card.bid+G.bidCash+G.bidInfl*ESP_X}`:''}</button>${infl}<button class="auction-btn" title="Non partecipi a questa asta" onclick="submitBid('pass')">PASSA</button><button class="auction-btn" title="Non partecipi alle aste rimaste oggi" onclick="submitBid('all')">TUTTE</button></div></div>`}
  if(G.phase==='draft')return zone(`<div><b>GIRO ${G.draftRound}/5</b><small>Scegli una carta dal ventaglio</small></div>`);
  if(G.phase==='asta'&&G.auctionStage==='buy'){const q=G.buyQueue?.[G.buyPos];if(q?.pid===0)return zone(`<div><b>${G.buyQty} <img class="inline-fish" src="${ASSET.fish[currentFish()]}" alt="${currentFish()}"></b><small>${q.price} Ducat${q.price>1?'i':'o'} per pesce · ${G.buyQty*q.price} tot.</small></div><button class="player-action-btn" onclick="confirmBuy()">COMPRA</button>`)}
  if(G.phase==='pubblico')return zone(`<div><b>MERCATO</b><small>Clicca un contratto completabile${p.subsLeft?` · ${p.subsLeft} sostituz.`:''}</small></div><button class="player-action-btn" onclick="finishMarket()">TERMINA</button>`);
  if(G.phase==='bilancia')return zone(`<div><b>${G.day===4?'ULTIMO CONTO':'FINE GIORNATA'}</b><small>Rendite e migliorie</small></div><button class="player-action-btn" onclick="finishDayBtn()">${G.day===4?'PUNTEGGIO':'CHIUDI'}</button>`);
  return''
}
function overlayHtml(){
  const me=G.players[0],box=(note,title,body)=>`<div class="table-overlay" role="dialog" aria-modal="true" aria-labelledby="ovTitle"><div class="net-choice"><div class="net-choice-note">${note}</div><h2 id="ovTitle">${title}</h2>${body}</div></div>`;
  if(G.overlay==='morning'){
    const lots=FISH.map(f=>`<div class="net-pick" style="cursor:default"><img src="${ASSET.fish[f]}" alt=""><span>${G.market[f]} ${f}</span></div>`).join(''),mine=G.fiutoLog.filter(x=>x.pid===0).map(x=>`${ICON[x.f]} ${x.f}`).join(', ');
    const intro=G.day===1?`<p class="game-intro-copy">Quattro giornate di mercato. Ogni mattina il Capitano estrae il pescato; poi <b>drafterai 5 carte</b>. Ogni carta serve a una sola cosa: <b>puntarla in asta</b>, oppure <b>completarla come contratto</b>, che diventa una <b>miglioria</b> permanente. Ogni contratto rende +1 Ducato per ogni miglioria già installata della sua stessa categoria.</p>`:'';
    return box(`Giorno ${G.day} · Pesca del Mattino`,'Il pescato di oggi',`${intro}<div class="net-picks">${lots}</div>${mine?`<p style="margin-top:12px">Fiuto per il Pescato: ricevi ${mine}.</p>`:''}<button class="btn primary" onclick="beginDraft()">Al draft</button>`)}
  if(G.overlay==='keep')return box('Fine del Mercato','Conserva fino a 2 carte',`<p>Le carte conservate restano da parte durante il draft e tornano in mano domani. Le altre vanno negli scarti.</p><div class="cards" style="text-align:left">${me.hand.map(c=>cardHtml(c,'keep',true)).join('')}</div><button class="btn primary" onclick="confirmKeep()">Conferma (${G.keepSel.size}/2)</button>`);
  if(G.overlay==='favorite')return box('La Congrega','Scegli il pesce preferito',`<p>Lo prendi dal sacchetto e lo metti sulla carta: ogni contratto che lo richiede renderà +2 Ducati.</p><div class="net-picks">${FISH.map(f=>`<button class="net-pick" onclick="pickFavorite('${f}')"><img src="${ASSET.fish[f]}" alt=""><span>${f}</span></button>`).join('')}</div>`);
  if(G.overlay==='summary'){
    const rows=G.players.map(p=>`<div class="rankrow"><div class="place"><i class="dot" style="background:${COLORS[p.id]}"></i></div><div class="who">${esc(p.name)}${p.human?' (tu)':''}</div><b>${p.today.contracts.length} contratti +${p.today.income} · Bilancia +${p.today.bilancia.reduce((s,x)=>s+x.v,0)} · ${p.coins} ◈</b></div>`).join('');
    const mine=me.today.bilancia.map(x=>`${esc(x.card.up)}: +${x.v}`).join(' · ');
    return box(`Giorno ${G.day} · Fine Giornata`,G.day===4?'Ultima giornata conclusa':'Il mercato chiude',`<div class="rank" style="text-align:left">${rows}</div>${mine?`<p>Le tue rendite: ${mine}</p>`:''}<button class="btn primary" onclick="finishDayBtn()">${G.day===4?'Vedi il punteggio':'Nuova giornata'}</button>`)}
  return'';
}
function renderPhysicalBoard(){
  const phase=physicalPhase(),activeFish=activeAuctionFish(),roman=['I','II','III','IV'],me=G.players[0];
  const days=roman.map((n,i)=>`<div class="board-day ${G.day===i+1?'active':''}" aria-label="Giorno ${i+1}">${n}</div>`).join('');
  const phases=PHASES.map(([key],i)=>`<div class="board-phase ${phase===i?'active':''}"><img src="${ASSET.phase[key]}" alt=""><span>${PHASE_SHORT[i]}</span></div>`).join('');
  const q=G.auctionStage==='buy'?G.buyQueue?.[G.buyPos]:null,buying=G.phase==='asta'&&G.auctionStage==='buy'&&q?.pid===0,buyMax=buying?maxBuy(me,currentFish(),q.price):0;
  const lots=FISH.map(f=>{const n=G.market[f]||0,tokens=Array.from({length:n},(_,i)=>{const img=`<img class="market-token" src="${ASSET.fish[f]}" alt="${f}">`;if(buying&&f===currentFish()&&i<buyMax)return`<button class="market-token-pick ${i<G.buyQty?'selected':''}" onclick="toggleBuyToken(${i+1})" aria-label="${i<G.buyQty?'Rimuovi':'Seleziona'} ${f} numero ${i+1}">${img}</button>`;return img}).join('');return`<div class="fish-lot ${n>15?'dense':''} ${activeFish===f?'active':''}"><span class="fish-lot-label">${f} · ${n}</span>${tokens}</div>`}).join('');
  const bidding=G.phase==='asta'&&G.auctionStage==='bid';
  const offers=G.players.map((p,i)=>{const color=COLORS[i],custom=p.human&&humanArea(p,color);if(custom)return custom;const o=offerState(p);return`<div class="offer-zone" style="--player:${color};--player-soft:${color}55"><span class="offer-name">${esc(p.name)}${p.human?' · tu':''}</span><span class="offer-value">${o.value}</span><span class="offer-detail">${o.detail}</span></div>`}).join('');
  const playerPins=G.players.map((_,i)=>`<div class="player-pin" style="--player:${COLORS[i]};--player-soft:${COLORS[i]}66"></div>`).join('');
  $('physicalBoard').innerHTML=`<div class="board-hud"><strong>Mercato di Pescaria</strong><div class="board-hud-tools"><div class="board-hud-status"><span>Giorno ${G.day} · ${phaseTitle(G.phase)}</span><span>Mazzo ${G.deck.length} · Sacchetto ${G.bag.length}</span></div><button id="restart" class="board-new-game" onclick="restartGame()">Nuova partita</button></div></div><div id="boardScores" class="board-scorebar" style="--players:${G.players.length}"></div><div class="board-calendar"><div class="board-days">${days}</div><div class="board-phases">${phases}</div></div><div class="board-center" style="--players:${G.players.length}"><div class="board-market-title">${G.phase==='asta'&&activeFish?`Asta dei ${activeFish}`:'Pescato disponibile per le aste'}</div><div class="board-fish">${lots}</div><div class="board-offer-title">Aree dei giocatori</div><div class="board-offers ${bidding?'auction-bidding':''} ${offers.includes('human-action')?'player-actions':''}">${offers}</div><div class="board-player-pins">${playerPins}</div></div><section id="boardHand" class="panel board board-hand"></section>${overlayHtml()}`;
}
function inventoryHtml(stock,muted=false){const x=FISH.flatMap(f=>Array.from({length:stock[f]},()=>`<span class="token ${muted?'muted-token':''}" title="${f}"><img src="${ASSET.fish[f]}" alt="${f}"></span>`)).join('');return x||'<span class="empty">vuoto</span>'}
function cardHtml(c,mode='plain',enabled=true,style=''){
  const me=G.players[0],selected=(mode==='bid'&&G.selectedBid===c.id)||(mode==='keep'&&G.keepSel?.has(c.id)),locked=mode==='draft'&&!enabled,selectable=enabled&&['bid','draft','market','client','keep'].includes(mode),fn={bid:'chooseBid',draft:'pickDraft',market:'serveContract',client:'pickClient',keep:'toggleKeep'}[mode],cat=CATS[c.cat],phase=cat.phase,select=selectable?`role="button" tabindex="0" onclick="${fn}(${c.id})" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();${fn}(${c.id})}"`:'';
  const pay=mode==='market'&&enabled?payout(me,c):c.value,fx=UPG[c.up].fx;
  return`<article class="card suit-${cat.suit} ${selectable?'selectable':''} ${selected?'selected':''} ${locked?'draft-locked':!enabled?'disabled':''}" ${style?`style="${style}"`:''} ${select}>${locked?'<span class="draft-lock" title="Carta già scelta" aria-label="Carta già scelta">🔒</span>':''}<div class="card-top"><span class="bid" title="Valore d’asta"><strong>${c.bid}</strong></span><div><span class="card-id">CLIENTE #${c.id}</span><h4>${esc(c.name)}</h4></div></div><div class="recipe">${fishText(c.recipe)}</div><div class="payout">${pay} Ducati${pay!==c.value?` <small>(${c.value}+${pay-c.value})</small>`:''}</div><div class="upgrade"><img src="${ASSET.upgrade[c.up]}" alt="" aria-hidden="true"><div><b><img class="upgrade-phase" src="${ASSET.phase[phase]}" alt="${cat.name}">${cat.icon} ${esc(upName(c))}</b><small>${esc(fx)}</small></div></div></article>`}
function phaseTitle(k){if(k==='draft')return'1 · Draft';if(k==='conserva')return'3 · Mercato';return PHASES.find(x=>x[0]===k)?.[1]||''}
function upgradeTags(p){
  const group=list=>{const m=new Map();for(const c of list){const k=upName(c);m.set(k,(m.get(k)||0)+1)}return[...m]};
  const inst=group(p.installed).map(([k,n])=>`<span class="tag" title="${esc(UPG[k.startsWith('Fiuto')?'Fiuto per il Pescato':k]?.fx||'')}">${esc(k)}${n>1?` ×${n}`:''}</span>`).join('');
  const pend=group(p.pending).map(([k,n])=>`<span class="tag pending">${esc(k)}${n>1?` ×${n}`:''} · da installare</span>`).join('');
  return inst+pend||'<span class="empty">Nessuna ancora</span>';
}
function renderBoard(){
  const me=G.players[0];let cards=me.hand,mode='plain',title='La tua mano',enabled=()=>true;
  if(G.phase==='asta'&&G.auctionStage==='bid')mode='bid';
  if(G.phase==='pubblico'){mode='market';title='I tuoi contratti';enabled=c=>canContract(me,c)}
  if(G.phase==='draft'){const pack=G.draftPacks[0];cards=[...G.drafted[0]].reverse().concat(pack);mode='draft';title='Carte del draft';enabled=c=>pack.some(x=>x.id===c.id)}
  if(mode==='bid'&&G.selectedBid)cards=cards.filter(c=>c.id!==G.selectedBid);
  const mid=(cards.length-1)/2,room=innerWidth<900?Math.min(420,innerWidth-40):560,spread=Math.min(72,Math.max(48,(room-180)/Math.max(1,cards.length-1))),fan=cards.map((c,i)=>cardHtml(c,mode,enabled(c),`--i:${i};--x:${(i-mid)*spread}px;--r:${(i-mid)*3.5}deg;--edge:${i===0?32:i===cards.length-1?-32:0}px;--z:${i+1}`)).join('');
  const host=$('boardHand')||$('board');
  const wallet=mode==='bid'?`<div class="bid-wallet"><span>Ducati disponibili</span><button id="bidCoinSource" class="bid-coin-source" ${G.selectedBid&&G.bidCash<me.coins?'':'disabled'} onclick="addBidCoin(event)" aria-label="Aggiungi un Ducato all'offerta"><i></i><i></i><i></i><b id="bidWalletCount">${Math.max(0,me.coins-G.bidCash)}</b></button><small>${G.selectedBid?'Clicca per aggiungere':'Prima scegli una carta'}</small></div>`:'';
  const hint=mode==='draft'?`${G.drafted[0].length} scelte · clicca una carta libera`:mode==='market'?'Clicca un contratto completabile':mode==='bid'?'Scegli la carta da puntare, oppure PASSA':'Passa il mouse per leggere la carta';
  const extra=`${me.influence?` · Esperienza ${me.influence}`:''}${me.fortunaLeft?` · Fortuna ${me.fortunaLeft}`:''}${me.subsLeft?` · Sottobanco ${me.subsLeft}`:''}`;
  host.innerHTML=`<div class="hand-meta"><div class="inventory"><div class="crate"><div class="crate-head"><span>Banco</span><span>${count(me.banco)}/${capBanco(me)}</span></div><div class="tokens">${inventoryHtml(me.banco)}</div></div><div class="crate"><div class="crate-head"><span>Cesta</span><span>${count(me.cesta)}/${CESTA_CAP}</span></div><div class="tokens">${inventoryHtml(me.cesta,true)}</div></div></div><h3>Migliorie<small style="font:600 11px Inter,sans-serif;color:var(--muted)">${extra}</small></h3><div class="upgrades">${upgradeTags(me)}</div></div><div class="hand-dock"><div class="hand-title"><h3>${title} · ${cards.length}</h3><span>${hint}</span></div>${wallet}<div class="hand-cards">${fan||'<p class="empty">Nessuna carta in mano.</p>'}</div></div>`;
  requestAnimationFrame(()=>animateHand(host))
}
function syncBidCash(){const available=Math.max(0,G.players[0].coins-G.bidCash),source=$('bidCoinSource'),wallet=$('bidWalletCount'),stack=$('offerCoins'),total=$('offerCoinCount');if(wallet)wallet.textContent=available;if(source)source.disabled=!G.selectedBid||!available;if(total)total.textContent=G.bidCash;if(stack)stack.classList.toggle('hidden',!G.bidCash);const sub=document.querySelector('.offer-submit'),card=G.players[0].hand.find(c=>c.id===G.selectedBid);if(sub&&card)sub.textContent=`OFFRI ${card.bid+G.bidCash+G.bidInfl*ESP_X}`}
function flyBidCoin(from){const target=$('humanOfferCard');if(!target||reducedMotion)return;const to=target.getBoundingClientRect(),coin=document.createElement('span');coin.className='flying-ducat';coin.style.left=from.left+from.width/2-23+'px';coin.style.top=from.top+from.height/2-23+'px';document.body.appendChild(coin);if(window.gsap)gsap.to(coin,{left:to.left+to.width/2-23,top:to.top+to.height/2-23,rotation:720,scale:.72,duration:.52,ease:'power2.inOut',onComplete:()=>coin.remove()});else coin.animate([{transform:'translate(0) rotate(0)'},{transform:`translate(${to.left-from.left}px,${to.top-from.top}px) rotate(720deg) scale(.72)`}],{duration:520,easing:'ease-in-out'}).finished.then(()=>coin.remove())}
window.addBidCoin=function(e){if(G.phase!=='asta'||G.auctionStage!=='bid'||!G.selectedBid||G.bidCash>=G.players[0].coins)return;const from=e.currentTarget.getBoundingClientRect();G.bidCash++;syncBidCash();flyBidCoin(from)};
window.removeBidCoin=function(e){e.stopPropagation();if(G.phase!=='asta'||G.auctionStage!=='bid'||!G.bidCash)return;G.bidCash--;syncBidCash()};
function animateHand(host){
  const hand=host.querySelector('.hand-cards'),cards=[...host.querySelectorAll('.hand-cards .card')];
  if(!hand||!cards.length||!window.gsap||reducedMotion)return;
  hand.classList.add('gsap-hand');hand.style.setProperty('--rest-bottom',innerHeight<=760?'-117px':'-126px');
  const base=cards.map(c=>({x:+c.style.getPropertyValue('--x').replace('px',''),r:+c.style.getPropertyValue('--r').replace('deg',''),y:c.classList.contains('selected')?-23:0}));
  gsap.set(cards,{xPercent:-50,transformOrigin:'50% 100%',force3D:true});
  gsap.fromTo(cards,{y:110,scale:.78,opacity:0,rotation:i=>base[i].r*1.35},{x:i=>base[i].x,y:i=>base[i].y,rotation:i=>base[i].r,scale:1,opacity:1,duration:.56,stagger:.055,ease:'power3.out',overwrite:true});
  const close=()=>{cards.forEach(c=>{c.classList.remove('gsap-open');c.style.pointerEvents='auto'});gsap.to(cards,{x:i=>base[i].x,y:i=>base[i].y,rotation:i=>base[i].r,rotationX:0,rotationY:0,scale:1,opacity:1,zIndex:i=>i+1,duration:.36,ease:'power3.out',overwrite:true});delete hand.dataset.open};
  const open=index=>{hand.dataset.open=index;cards.forEach((c,i)=>{c.classList.toggle('gsap-open',i===index);c.style.pointerEvents=i===index?'auto':'none'});gsap.to(cards,{x:i=>base[i].x+(i<index?-58:i>index?58:0)+(i===index?(index===0?30:index===cards.length-1?-30:0):0),y:i=>i===index?-104:base[i].y+10,rotation:i=>i===index?0:base[i].r*.72,rotationX:0,rotationY:0,scale:i=>i===index?1.07:.95,opacity:i=>i===index?1:.62,zIndex:i=>i===index?300:i+1,duration:.3,ease:'power3.out',overwrite:true})};
  cards.forEach((card,index)=>{const tiltX=gsap.quickTo(card,'rotationX',{duration:.24,ease:'power3.out'}),tiltY=gsap.quickTo(card,'rotationY',{duration:.24,ease:'power3.out'});let frame=0,lastEvent;card.addEventListener('pointerenter',()=>{if(hand.dataset.open==null)open(index)});card.addEventListener('focusin',()=>open(index));card.addEventListener('pointermove',e=>{if(hand.dataset.open!=index)return;lastEvent=e;if(frame)return;frame=requestAnimationFrame(()=>{const r=card.getBoundingClientRect();tiltX(((lastEvent.clientY-r.top)/r.height-.5)*-6);tiltY(((lastEvent.clientX-r.left)/r.width-.5)*8);frame=0})})});
  hand.addEventListener('pointermove',e=>{const r=hand.getBoundingClientRect();if(e.clientY<r.bottom-145)return;const center=r.left+r.width/2,next=base.reduce((best,c,i)=>Math.abs(e.clientX-center-c.x)<Math.abs(e.clientX-center-base[best].x)?i:best,0);if(hand.dataset.open!=next)open(next)});
  hand.addEventListener('pointerleave',close);
  hand.addEventListener('focusout',e=>{if(!hand.contains(e.relatedTarget))close()});
}
function render(){if(!G||HEADLESS||G.finished)return;$('game').dataset.phase=G.phase;$('dayTitle').textContent=`Giorno ${G.day} di 4 · ${phaseTitle(G.phase)}`;$('deckInfo').textContent=`Mazzo: ${G.deck.length} · Sacchetto: ${G.bag.length}`;$('progress').innerHTML=PHASES.map(([k,n])=>{const order=['rete','asta','pubblico','bilancia'],actual=G.phase==='draft'?'rete':G.phase==='conserva'?'pubblico':G.phase,i=order.indexOf(k),now=order.indexOf(actual);return`<div class="step ${i===now?'active':i<now?'done':''}">${n}</div>`}).join('');renderPhysicalBoard();const scores=G.players.map(scoreCard).join('');$('scores').innerHTML=scores;$('boardScores').innerHTML=scores;renderBoard();$('log').innerHTML=[...G.log].reverse().map(x=>`<div class="logitem"><b>G${x.day} · ${esc(x.phase)}</b>${esc(x.text)}</div>`).join('')}

const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
document.addEventListener('pointermove',e=>{const c=e.target.closest?.('.hand-cards .card');if(!c||reducedMotion||window.gsap)return;const r=c.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;c.style.setProperty('--tilt-y',`${x*11}deg`);c.style.setProperty('--tilt-x',`${y*-8}deg`)});
document.addEventListener('pointerout',e=>{const c=e.target.closest?.('.hand-cards .card');if(!c||window.gsap||c.contains(e.relatedTarget))return;c.style.removeProperty('--tilt-x');c.style.removeProperty('--tilt-y')});

$('rules').innerHTML=`<div class="rule"><b>Incasso</b>Ogni contratto: guadagno + 1 Ducato per ogni miglioria già installata della stessa categoria.</div><div class="rule"><b>A consumo</b>Esperienza, Fortuna e Sottobanco: una volta per giornata per carta.</div>`+Object.entries(UPG).map(([n,u])=>`<div class="rule"><b>${CATS[u.cat].icon} ${esc(DISPLAY[n])}</b>${esc(u.fx)}</div>`).join('');

// Autocontrollo del mazzo V4.1: 100 carte, 25 per categoria, Fiuto 2-3-2-3-2 e sempre un pesce del contratto.
const fiuto=CARDS.filter(c=>c.up==='Fiuto per il Pescato');
console.assert(CARDS.length===100&&['A','E','C','B'].every(k=>CARDS.filter(c=>c.cat===k).length===25)&&CARDS.every(c=>UPG[c.up]&&UPG[c.up].cat===c.cat&&Object.keys(c.recipe).every(f=>FISH.includes(f)))&&fiuto.length===12&&fiuto.every(c=>c.recipe[c.fiuto])&&FISH.map(f=>fiuto.filter(c=>c.fiuto===f).length).join('')==='23232'&&CARDS.filter(c=>c.cat==='B').every(c=>MAESTRO[c.up]),'Mazzo Pescaria V5 non valido');

// Agente Monte Carlo per il draft: per ogni carta candidata, R rollout fino a fine partita.
const MC=window.MC={R:6,on:true,rolls:0};
const _botDraft=botDraft;
function cloneG(src){const c=structuredClone(src);Object.setPrototypeOf(c.rng,RNG.prototype);return c}
botDraft=function(p,pack){
  if(G.force&&G.force.pid===p.id){const c=pack.find(x=>x.id===G.force.id);G.force=null;return c}
  if(G.inRollout||!MC.on||pack.length<2||!p.mc)return _botDraft(p,pack);
  const orig=G;let best=null,bestV=-1e9;const res=[];
  for(const cand of pack){let tot=0;
    for(let r=0;r<MC.R;r++){
      const g=cloneG(orig);g.inRollout=true;g.force={pid:p.id,id:cand.id};
      g.rng=new RNG((orig.rng.s^(cand.id*7919+r*104729+orig.day*31+pack.length))>>>0);
      g.deck=g.rng.shuffle(g.deck);g.bag=g.rng.shuffle(g.bag); // determinizzazione: mazzo e sacchetto rimescolati
      G=g;MC.rolls++;
      try{while(G.phase==='draft')draftStep(null)}catch(e){G=orig;throw e}
      const me=G.players[p.id],oth=Math.max(...G.players.filter(x=>x.id!==p.id).map(x=>x.coins));
      tot+=me.coins-oth+(me.coins>oth?10:0);
      G=orig;
    }
    const v=tot/MC.R;res.push(v);if(v>bestV){bestV=v;best=cand}
  }
  return best;
};
const _start=startGame;
startGame=function(o){const mcSeats=o.mcSeats;G=null;
  // marca i giocatori MC prima che inizi il draft del giorno 1
  const _sd=startDay;startDay=function(){if(mcSeats)for(const p of G.players)p.mc=mcSeats.includes(p.id);startDay=_sd;_sd()};
  _start(o)};
// Guardia: se il mazzo (con gli scarti) non basta per 5 carte a testa, pacchetti uguali più piccoli.
MC.short=0;MC.shortReal=0;
startDraft=function(){
  G.phase='draft';G.draftRound=1;G.drafted=G.players.map(()=>[]);
  const n=G.players.length,avail=G.deck.length+G.discard.length,size=Math.min(HAND,Math.floor(avail/n));
  if(size<HAND){MC.short++;if(!G.inRollout)MC.shortReal++}
  G.draftPacks=G.players.map(()=>Array.from({length:size},drawCard).filter(Boolean));
  if(size<1){finishDraft();return}
  while(G.phase==='draft')draftStep(null);
};
// Statistiche: rendite per tipo di Mercante, primo Capitano.
const _bi=bilanciaIncome;
bilanciaIncome=function(p){const r=_bi(p);p.mercInc=p.mercInc||{};for(const x of r){const k=DISPLAY[x.card.up];p.mercInc[k]=(p.mercInc[k]||0)+x.v}return r};
const _sd0=startDay;startDay=function(){if(G.day===1&&G.captain0===undefined)G.captain0=G.captain;_sd0()};
// Monte Carlo anche nelle offerte d'asta: il giocatore prova 3-5 offerte diverse e per ciascuna gioca MC.R partite fino alla fine.
const _botBid=botBid;
MC.bid=true;MC.bidRolls=0;
botBid=function(p,f,seen){
  if(G.forceBid&&G.forceBid.pid===p.id){const o=G.forceBid.o;G.forceBid=null;if(!o)return null;const card=p.hand.find(c=>c.id===o.cid);return card?{pid:p.id,card,cash:Math.min(o.cash,p.coins),infl:Math.min(o.infl,p.influence)}:null}
  if(G.inRollout||!MC.on||!MC.bid||!p.mc||!p.hand.length)return _botBid(p,f,seen);
  const b0=_botBid(p,f,seen),opts=[null],key=new Set(['x']);
  const add=o=>{const k=o.cid+'/'+o.cash+'/'+o.infl;if(!key.has(k)&&o.cash<=p.coins){key.add(k);opts.push(o)}};
  if(b0){add({cid:b0.card.id,cash:b0.cash,infl:b0.infl});add({cid:b0.card.id,cash:b0.cash+2,infl:b0.infl})}
  const byBid=[...p.hand].sort((a,b)=>a.bid-b.bid);
  add({cid:byBid[0].id,cash:0,infl:0});                          // offerta minima: solo per poter comprare
  add({cid:byBid.at(-1).id,cash:Math.min(3,p.coins),infl:p.influence}); // offerta forte
  if(opts.length<2)return b0;
  const orig=G;let best=null,bestV=-1e9;
  for(const o of opts){let tot=0;
    for(let r=0;r<MC.R;r++){
      const g=cloneG(orig);g.inRollout=true;g.forceBid={pid:p.id,o};
      g.rng=new RNG((orig.rng.s^((o?o.cid:0)*7919+(o?o.cash:99)*131+r*104729+orig.auctionIndex*31))>>>0);
      g.deck=g.rng.shuffle(g.deck);g.bag=g.rng.shuffle(g.bag);
      G=g;MC.rolls++;MC.bidRolls++;
      try{submitBid('none')}catch(e){G=orig;throw e}
      const me=G.players[p.id],oth=Math.max(...G.players.filter(x=>x.id!==p.id).map(x=>x.coins));
      tot+=me.coins-oth+(me.coins>oth?10:0);G=orig;
    }
    const v=tot/MC.R;if(v>bestV){bestV=v;best=o}
  }
  if(!best)return null;const card=p.hand.find(c=>c.id===best.cid);return{pid:p.id,card,cash:best.cash,infl:Math.min(best.infl,p.influence)};
};
window.DISPLAY=DISPLAY;
const _fd=finishDay;finishDay=function(){(G.hist=G.hist||[]).push(G.players.map(p=>p.coins));_fd()};
const _rb=resolveBids;resolveBids=function(bids){(G.auc=G.auc||[]).push({lot:G.market[currentFish()],b:bids.length,unsold:0,wb:0,lb:0});G._cur=G.auc.at(-1);if(bids.length){const o=turnOrder();const w=[...bids].sort((a,b)=>bidScore(b)-bidScore(a)||o.indexOf(a.pid)-o.indexOf(b.pid))[0];G._cur.paid=w.cash}return _rb(bids)};
const _buy=buy;buy=function(p,f,n,price){const r=_buy(p,f,n,price);if(G._cur){if(price===1)G._cur.wb+=r;else G._cur.lb+=r}return r};
const _rf=returnFish;returnFish=function(f,n=1){if(G._cur&&G.phase==='asta'&&f===currentFish()&&n)G._cur.unsold+=n;return _rf(f,n)};

// Hook per le simulazioni automatiche (solo test headless).
if(HEADLESS)window.__pescaria={simulate(opts){startGame({humanBot:true,name:'Bot0',...opts});return{G,ranking:ranking()}},CARDS};
})();


module.exports=globalThis.__pescaria;
