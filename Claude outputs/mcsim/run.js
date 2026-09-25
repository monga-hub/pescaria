// uso: node run.js <worker> <nworkers> <mode:mc|heur> <out>
const e=require('./eng.js');const [w,W,mode,out]=[+process.argv[2],+process.argv[3],process.argv[4],process.argv[5]];
MC.R=6;const fs=require('fs');fs.writeFileSync(out,'');
let k=0;
for(const n of [2,3,4,5])for(let s=1;s<=(+process.env.NG||250);s++){if((k++)%W!==w)continue;
  const seed=s*7919+n*13;
  const {G,ranking}=e.simulate({n,seed,difficulty:'normal',mcSeats:mode==='mc'?[...Array(n).keys()]:[]});
  if(!G.finished)throw new Error('non finita');
  const rk=ranking.map(p=>p.id);
  const players=G.players.map(p=>{const cards=[...p.installed,...p.pending];const up={};for(const c of cards){const d=DISPLAY[c.up]||c.up;up[d]=(up[d]||0)+1}
    const cat={};for(const c of cards)cat[c.cat]=(cat[c.cat]||0)+1;
    return{id:p.id,seat:(p.id-G.captain0+n)%n,coins:p.coins,rank:rk.indexOf(p.id),orders:p.orders,catTot:p.catTot||0,favTot:p.favTot||0,merc:p.bilanciaTot,mercInc:p.mercInc||{},up,cat,n:cards.length,val:cards.reduce((s,c)=>s+c.value,0),ids:cards.map(c=>c.id)}});
  const A=G.auc||[];const auc={k:A.length,cont:A.filter(a=>a.b>=2).length,paid:A.reduce((s,a)=>s+(a.paid||0),0),wb:A.reduce((s,a)=>s+a.wb,0),lb:A.reduce((s,a)=>s+(a.lb||0),0),uns:A.reduce((s,a)=>s+a.unsold,0),lot:A.reduce((s,a)=>s+a.lot,0)};fs.appendFileSync(out,JSON.stringify({n,seed,players,auc})+'\n');
}
