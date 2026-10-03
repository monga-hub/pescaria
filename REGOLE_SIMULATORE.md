# Pescaria — regole che il simulatore deve rispettare

Fonte: prove al tavolo di Venezia (ottobre 2026), regolamento Archimede (V5) e mazzo `mazzo_pescaria_V4.9_dextrous.csv`.
Questo file riguarda **solo la logica di gioco**. Grafica, interfaccia, personaggi e animazioni non sono toccati da queste regole.

Verifica automatica: `node tests/regole-v5.cjs` (va eseguito dopo ogni modifica a `index.html`).

## Numeri fissi
- Sacchetto: 100 pesci — Polpi 10, Gamberi 18, Molluschi 17, Branzini 27, Sardine 28.
- 12 Ducati iniziali · Banco 6 pesci · Barile 3 pesci · 6 carte distribuite direttamente al giorno, senza draft · si conservano al massimo 2 carte.
- Mazzo 100 carte, 25 per categoria (Ancora, Asta, Mercato, Bilancia).
- Guadagno di ogni carta = somma dei valori dei pesci (Polpo 5, Gambero 4, Mollusco 4, Branzino 3, Sardina 2), +2 se i tipi sono due, +4 se sono tre.

## Giornata (4 giornate)
1. **Pesca**: il Capitano pesca 7 pesci per giocatore nei lotti · carte Amici · distribuzione di 6 carte ciascuno, più quelle conservate. Se mazzo e scarti non bastano, si distribuisce lo stesso numero di carte a tutti.
2. **Aste** (giornate 1 e 3: Polpi › Gamberi › Molluschi › Branzini › Sardine; giornate 2 e 4: ordine inverso): offerte dal Capitano in senso orario; carta coperta + Ducati **sopra la carta, visibili**. Vince il valore più alto, parità a chi viene prima nel turno. Il vincitore paga i Ducati, diventa Capitano e compra a 3 Ducati per pesce; il secondo compra a 2, dal terzo in poi a 1, sempre in ordine di classifica. Chi passa non compra. Le carte puntate vanno agli scarti. Il pesce rimasto torna nel sacchetto.
3. **Mercato**: contratti con Banco + Barile; incasso = guadagno + 1 per ogni miglioria **già installata** della stessa categoria (+2 La Congrega). Barile max 3, mano max 2 carte.
4. **Fine giornata**: installazione dei contratti. Nessuna rendita dei Mercanti e nessun moltiplicatore dei contratti, nemmeno nella quarta giornata.
**Fine partita**: ogni Mercante rende 2 Ducati per ogni carta installata della categoria indicata, una sola volta. Poi vince chi ha più Ducati; parità → più migliorie.

## Migliorie (tutte permanenti e cumulabili — nessuna a consumo, nessun Ducato sulle carte)
| Categoria | Miglioria (nome interno) | Effetto |
|---|---|---|
| Ancora | Banco più grande (`Banco Ampliato`) | Banco +1 pesce per copia |
| Ancora | Amici (`Fiuto per il Pescato`) | ogni mattina 1 pesce a caso dal sacchetto per copia |
| Asta | Senza tassa (`Esperienza`) | compri 1 pesce a 1 invece che al prezzo di 2 o 3, per copia e per asta |
| Asta | Fortuna (`Nuovi Clienti`) | asta persa (se hai partecipato): peschi 1 carta per copia |
| Mercato | Sottobanco (`Contrattazione Sottobanco`) | in **ogni** contratto: 1 sostituzione (1 pesce = 2 pesci uguali di altro tipo) per copia |
| Mercato | La Congrega (`Favorito della Gilda`) | pesce preferito sulla carta: +2 per contratto che lo richiede |
| Bilancia | Mercante ⚓ / 🔨 / 💰 | solo a fine partita: +2 per carta Ancora / Asta / Mercato installata (8 / 9 / 8 carte) |

Il Maestro della Bilancia non esiste più.
Carte Fortuna con valore d'asta alzato di 2: #6, #9, #10 → 4 · #20, #32, #65 → 6 · #71, #88, #96 → 10 · #76 → 9.

## Come lavorano insieme le due IA
- `index.html` lo modifica l'IA della grafica. Le modifiche di regole arrivano come **patch piccole** (`Claude outputs/patch_*.py`) che toccano solo funzioni di logica e si applicano sul file così com'è.
- Prima di applicare una patch di regole: il lavoro grafico deve essere salvato (commit), così si può sempre tornare indietro.
- Dopo ogni modifica, di chiunque: `node tests/regole-v5.cjs`, `node tests/regole-venezia.cjs` e `node tests/auction-upgrades.cjs` devono passare.

## Variante Solitario e Automa (Congrega dei Mercanti)
Con 1 giocatore la Congrega è obbligatoria (Apprendista / Mercante / Maestro / Doge; Apprendista predefinito). Con 2–4 giocatori resta facoltativa, con anche l’opzione No.
- Ogni giocatore riceve direttamente 6 carte al giorno, oltre a quelle conservate. La Congrega non riceve una mano.
- La Congrega è un giocatore in più (conta per i 7 pesci del mattino), 12 Ducati, nessuna miglioria, nessun contratto, niente draft.
- Mazzo ridotto di 8 carte, rimescolato ogni giornata: 3 Passa · 3 Offerta +0 (2 pesci) · 2 +2 (3 pesci).
- A ogni asta gira una carta: Passa, oppure prima carta del mazzo Clienti coperta + N Ducati sopra. Se vince compra a 3 Ducati per pesce i pesci indicati; se perde non compra.
- Mercato: vende tutto il pesce del Banco alla banca. Prezzi (Polpo/Gambero/Mollusco/Branzino/Sardina): Apprendista 5/4/4/3/2 · Mercante 6/5/5/3/2 · Maestro 6/5/5/4/3 · Doge 7/6/6/5/4.
- Test: `node tests/congrega.cjs`.

## Salvataggi precedenti
Le nuove partite usano `rulesVersion: 6`. I salvataggi senza questa versione mantengono le regole precedenti (draft di 5 carte, 6 pesci, prezzi 1/2, rendite giornaliere).
