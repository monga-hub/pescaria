// Le partite automatiche girano fuori dalla schermata, così il laboratorio resta utilizzabile.
self.onmessage=async({data})=>{
  if(data.type!=='run')return;
  try{
    const files=['index.html','experiments/lab-telemetry.js'];
    if(data.config.mode==='mc6')files.push('experiments/monte-carlo-agent.js');
    const [html,telemetry,agent='']=await Promise.all(files.map(async file=>{
      const response=await fetch(file,{cache:'no-store'});
      if(!response.ok)throw new Error('Impossibile caricare '+file);
      return response.text();
    }));
    const source=html.match(/<script>\s*([\s\S]*?)<\/script>/)?.[1];
    if(!source)throw new Error('Motore del gioco non trovato');
    const handler={get:(target,key)=>key===Symbol.toPrimitive?(()=>''):key in target?target[key]:proxy,apply:()=>proxy,set:()=>true,construct:()=>proxy};
    const proxy=new Proxy(function(){},handler);
    self.window=self;self.document=proxy;self.matchMedia=()=>({matches:false});self.gsap=proxy;self.localStorage=proxy;self.__PESCARIA_HEADLESS=true;
    await eval(source.replace(/\}\)\(\);\s*$/,(agent||'')+'\n'+telemetry+'\n})();'));
    const rows=[],{games,players,seed,mode,...simConfig}=data.config;
    const startIndex=data.startIndex??0,stride=data.stride??1,total=Math.ceil((games-startIndex)/stride);
    let done=0;
    for(let i=startIndex;i<games;i+=stride){
      const gameSeed=seed+i*7919+players*13;
      const {G,ranking}=self.__pescaria.simulate({n:players,seed:gameSeed,difficulty:'normal',simConfig});
      if(!G.finished||G.lab.days.length!==4)throw new Error('Partita '+(i+1)+' incompleta');
      rows.push({index:i,seed:gameSeed,initialCaptain:G.lab.initialCaptain,gap:ranking[0].coins-ranking.at(-1).coins,
        players:ranking.map(p=>({id:p.id,coins:p.coins,orders:p.orders,upgrades:p.installed.length+p.pending.length,catchUpEarned:p.catchUpEarned||0,wasted:p.wasted,bilancia:p.bilanciaTot,marketBonus:p.marketEndBonus||0})),
        auctions:G.lab.auctions,contracts:G.lab.contracts,handUpgrades:G.handUpgrades||[],deckShortages:G.deckShortages||[],days:G.lab.days,fiuto:G.lab.fiuto,passive:G.lab.passive});
      done++;
      if(done%5===0||done===total)self.postMessage({type:'progress',done,total,rows:rows.splice(0)});
    }
    self.postMessage({type:'done',choices:self.__pescaria.MC?.choices||0,rollouts:self.__pescaria.MC?.rollouts||0});
  }catch(error){self.postMessage({type:'error',message:error?.message||String(error)})}
};
