// Test delle REGOLE di Pescaria (regolamento Archimede V5 · mazzo V4.9).
// Controlla solo la logica di gioco: non tocca grafica né interfaccia.
// Uso: node tests/regole-v5.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const source = html.match(/<script>\s*([\s\S]*?)<\/script>/)[1];
const cardsDir = path.join(root, 'assets/cards');
const context = { assert, console, __PESCARIA_HEADLESS: true, addEventListener() {}, setTimeout() { return 1; }, clearTimeout() {},
  cardFiles: fs.existsSync(cardsDir) ? fs.readdirSync(cardsDir) : [],
  document: { getElementById: () => ({}), addEventListener() {} }, matchMedia: () => ({ matches: false }) };
context.window = context;
assert(!/\bfrozen\b/.test(source), 'nessun Ducato bloccato sulle migliorie (niente migliorie a consumo)');
const checks = `
const ok=[];const t=(nome,f)=>{f();ok.push(nome)};
t('costanti', ()=>{assert.equal(BANCO_BASE,6);assert.equal(CESTA_CAP,3);assert.equal(START_COINS,12);assert.equal(HAND,5);assert.equal(KEEP_MAX,2);
  assert.deepEqual({...BAG},{Polpi:10,Gamberi:18,Molluschi:17,Branzini:27,Sardine:28});});
t('nomi migliorie', ()=>{const v=Object.values(DISPLAY);for(const n of ['Banco più grande','Amici','Senza tassa','Fortuna','Sottobanco','La Congrega','Mercante ⚓','Mercante 🔨','Mercante 💰'])assert(v.includes(n),n);
  assert(!('Maestro della Bilancia' in UPG),'Maestro della Bilancia rimosso');});
t('mazzo 100 carte, 25 per categoria', ()=>{assert.equal(CARDS.length,100);for(const k of ['A','E','C','B'])assert.equal(CARDS.filter(c=>c.cat===k).length,25);
  const m=u=>CARDS.filter(c=>c.up===u).length;assert.equal(m('Maestro della Pescaria'),8);assert.equal(m('Maestro delle Aste'),9);assert.equal(m('Maestro del Mercato'),8);});
t('Fortuna: valori d asta +2 (V4.8)', ()=>{const exp={6:4,9:4,10:4,20:6,32:6,65:6,71:10,76:9,88:10,96:10};for(const [id,b] of Object.entries(exp)){const c=CARDS.find(c=>c.id===+id);assert.equal(c.up,'Nuovi Clienti');assert.equal(c.bid,b,'carta '+id)}});
t('guadagni = somma pesci (+2 due tipi, +4 tre tipi)', ()=>{const V={Polpi:5,Gamberi:4,Molluschi:4,Branzini:3,Sardine:2};for(const c of CARDS){const t=Object.keys(c.recipe).length;const s=Object.entries(c.recipe).reduce((a,[f,n])=>a+V[f]*n,0)+(t===2?2:t===3?4:0);assert.equal(c.value,s,'carta '+c.id)}});
startGame({n:3,name:'Test',seed:7,difficulty:'normal',humanBot:false});
const p=G.players[1];
t('Senza tassa permanente: 1 pesce a 1 per copia, solo per chi perde', ()=>{p.installed=[{up:'Esperienza',cat:'E'}];assert.equal(costOf(p,3,2),5);assert.equal(costOf(p,3,1),3);p.installed.push({up:'Esperienza',cat:'E'});assert.equal(costOf(p,3,2),4);});
t('Sottobanco permanente: 1 sostituzione per copia in OGNI contratto', ()=>{p.installed=[{up:'Contrattazione Sottobanco',cat:'C'}];p.banco=inv();p.cesta=inv();p.banco.Sardine=4;
  const card={recipe:{Polpi:1},value:5,cat:'E'};assert(planContract(p,card),'primo contratto');assert(planContract(p,{recipe:{Gamberi:1}}),'anche un secondo contratto');
  assert(!planContract(p,{recipe:{Polpi:2}}),'con 1 copia non si sostituiscono 2 pesci');p.installed.push({up:'Contrattazione Sottobanco',cat:'C'});assert(planContract(p,{recipe:{Polpi:2}}),'con 2 copie sì');});
t('incasso: guadagno + 1 per miglioria già installata della stessa categoria (+2 La Congrega)', ()=>{p.installed=[{up:'Banco Ampliato',cat:'A'},{up:'Fiuto per il Pescato',cat:'A'},{up:'Favorito della Gilda',cat:'C',favFish:'Polpi'}];
  assert.equal(payout(p,{value:10,cat:'A',recipe:{Polpi:1}}),10+2+2);assert.equal(payout(p,{value:10,cat:'E',recipe:{Sardine:1}}),10);});
t('Mercanti: +2 per carta della categoria, a fine giornata', ()=>{p.installed=[{up:'Maestro del Mercato',cat:'B'},{up:'Contrattazione Sottobanco',cat:'C'},{up:'Favorito della Gilda',cat:'C'}];
  assert.equal(bilanciaIncome(p).reduce((s,x)=>s+x.v,0),4);});
t('mescolare un mazzo vuoto non si blocca', ()=>{assert.deepEqual(G.rng.shuffle([]),[]);});
t('600 partite complete, Ducati mai negativi, 100 pesci e 100 carte', ()=>{for(const n of [2,3,4,5])for(let s=1;s<=150;s++){const G=window.__pescaria.simulate({n,seed:s*11+n,difficulty:'normal'}).G;
  assert(G.finished,'partita '+n+'/'+s);assert(G.players.every(q=>q.coins>=0));
  const fish=G.bag.length+Object.values(G.market).reduce((a,b)=>a+b,0)+G.players.reduce((t,q)=>t+count(q.banco)+count(q.cesta)+q.installed.filter(c=>c.favFish).length,0);assert.equal(fish,100,'pesci');
  const cards=G.deck.length+G.discard.length+G.players.reduce((t,q)=>t+q.hand.length+(q.kept||[]).length+q.installed.length+q.pending.length,0);assert.equal(cards,100,'carte');}});
console.log('Regole V5 OK:',ok.length,'controlli');for(const o of ok)console.log('  ✓',o);
`;
vm.runInNewContext(source.replace(/\}\)\(\);\s*$/, checks + '\n})();'), context);
