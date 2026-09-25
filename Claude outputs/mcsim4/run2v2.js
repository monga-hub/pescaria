// uso: node run2.js <shard> <W> <out> <secondi>  (riprende da dove era rimasto)
const e=require('./engv2.js');const [w,W,out,sec]=[+process.argv[2],+process.argv[3],process.argv[4],+process.argv[5]||1e9];
MC.R=6;const fs=require('fs');const t0=Date.now();
const done=new Set(fs.existsSync(out)?fs.readFileSync(out,'utf8').trim().split('\n').filter(Boolean).map(l=>{const j=JSON.parse(l);return j.n+'/'+j.seed}):[]);
let k=0;const NG=+process.env.NG||75;
for(const n of [2,3,4,5])for(let s=1;s<=NG;s++){if((k++)%W!==w)continue;const seed=s*7919+n*13;if(done.has(n+'/'+seed))continue;
  if((Date.now()-t0)/1000>sec)process.exit(0);
  const {G,ranking}=e.simulate({n,seed,difficulty:'normal',mcSeats:[...Array(n).keys()]});
  const rk=ranking.map(p=>p.id);
  const players=G.players.map(p=>{const cards=[...p.installed,...p.pending];const up={};for(const c of cards){const d=DISPLAY[c.up]||c.up;up[d]=(up[d]||0)+1}
    const cat={};for(const c of cards)cat[c.cat]=(cat[c.cat]||0)+1;
    return{id:p.id,seat:(p.id-G.captain0+n)%n,coins:p.coins,rank:rk.indexOf(p.id),orders:p.orders,catTot:p.catTot||0,favTot:p.favTot||0,merc:p.bilanciaTot,mercInc:p.mercInc||{},up,cat,n:cards.length,val:cards.reduce((s,c)=>s+c.value,0)}});
  const A=G.auc||[];const auc={k:A.length,cont:A.filter(a=>a.b>=2).length,paid:A.reduce((s,a)=>s+(a.paid||0),0),wb:A.reduce((s,a)=>s+a.wb,0),lb:A.reduce((s,a)=>s+(a.lb||0),0),uns:A.reduce((s,a)=>s+a.unsold,0),lot:A.reduce((s,a)=>s+a.lot,0)};
  fs.appendFileSync(out,JSON.stringify({n,seed,players,auc})+'\n');
}
