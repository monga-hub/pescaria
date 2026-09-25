# Pescaria — regole che il simulatore deve rispettare

Fonte: regolamento Archimede (V5) e mazzo `mazzo_pescaria_V4.9_dextrous.csv`.
Questo file riguarda **solo la logica di gioco**. Grafica, interfaccia, personaggi e animazioni non sono toccati da queste regole.

Verifica automatica: `node tests/regole-v5.cjs` (va eseguito dopo ogni modifica a `index.html`).

## Numeri fissi
- Sacchetto: 100 pesci — Polpi 10, Gamberi 18, Molluschi 17, Branzini 27, Sardine 28.
- 12 Ducati iniziali · Banco 6 pesci · Cesta 3 pesci · draft di 5 carte · si conservano al massimo 2 carte.
- Mazzo 100 carte, 25 per categoria (Ancora, Asta, Mercato, Bilancia).
- Guadagno di ogni carta = somma dei valori dei pesci (Polpo 5, Gambero 4, Mollusco 4, Branzino 3, Sardina 2), +2 se i tipi sono due, +4 se sono tre.

## Giornata (4 giornate)
1. **Pesca**: il Capitano pesca 6 pesci per giocatore nei lotti · carte Amici · draft (le carte conservate restano fuori dal draft e tornano in mano alla fine).
2. **Aste** (Polpi › Gamberi › Molluschi › Branzini › Sardine): offerte dal Capitano in senso orario; carta coperta + Ducati **sopra la carta, visibili**. Vince il valore più alto, parità a chi viene prima nel turno. Il vincitore paga i Ducati, diventa Capitano e compra a 1; gli altri partecipanti comprano a 2; chi passa non compra. Il pesce rimasto torna nel sacchetto.
3. **Mercato**: contratti con Banco + Cesta; incasso = guadagno + 1 per ogni miglioria **già installata** della stessa categoria (+2 La Congrega). Cesta max 3, mano max 2 carte.
4. **Fine giornata**: installazione dei contratti, poi rendite dei Mercanti (contando le carte appena installate).
Fine: vince chi ha più Ducati; parità → più migliorie.

## Migliorie (tutte permanenti e cumulabili — nessuna a consumo, nessun Ducato sulle carte)
| Categoria | Miglioria (nome interno) | Effetto |
|---|---|---|
| Ancora | Banco più grande (`Banco Ampliato`) | Banco +1 pesce per copia |
| Ancora | Amici (`Fiuto per il Pescato`) | ogni mattina 1 pesce a caso dal sacchetto per copia |
| Asta | Senza tassa (`Esperienza`) | asta persa: compri 1 pesce a 1 invece che a 2, per copia |
| Asta | Fortuna (`Nuovi Clienti`) | asta persa (se hai partecipato): peschi 1 carta per copia |
| Mercato | Sottobanco (`Contrattazione Sottobanco`) | in **ogni** contratto: 1 sostituzione (1 pesce = 2 pesci uguali di altro tipo) per copia |
| Mercato | La Congrega (`Favorito della Gilda`) | pesce preferito sulla carta: +2 per contratto che lo richiede |
| Bilancia | Mercante ⚓ / 🔨 / 💰 | +2 per carta Ancora / Asta / Mercato installata (8 / 9 / 8 carte) |

Il Maestro della Bilancia non esiste più.
Carte Fortuna con valore d'asta alzato di 2: #6, #9, #10 → 4 · #20, #32, #65 → 6 · #71, #88, #96 → 10 · #76 → 9.

## Come lavorano insieme le due IA
- `index.html` lo modifica l'IA della grafica. Le modifiche di regole arrivano come **patch piccole** (`Claude outputs/patch_*.py`) che toccano solo funzioni di logica e si applicano sul file così com'è.
- Prima di applicare una patch di regole: il lavoro grafico deve essere salvato (commit), così si può sempre tornare indietro.
- Dopo ogni modifica, di chiunque: `node tests/regole-v5.cjs` e `node tests/auction-upgrades.cjs` devono passare.
