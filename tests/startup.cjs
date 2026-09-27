const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
const source=html.match(/<script id="pescaria-boot">([\s\S]*?)<\/script>/)[1];
function launch({remote='same',href='https://example.com/pescaria/?mode=test#game',images=[]}={}){
  const status={},bar={},splash={querySelector:()=>bar},main={inert:false},timers=new Map(),requests=[],redirects=[];
  function page(text,valid=true){return{head:{innerHTML:'head'},body:{cloneNode:()=>({innerHTML:text,querySelector:()=>({remove(){}})})},getElementById:()=>valid?{}:null}}
  const document={...page('same'),getElementById:id=>id==='startup'?splash:status,querySelector:()=>main,querySelectorAll:()=>images};
  const context={document,URL,Date,AbortController,DOMParser:class{parseFromString(text){return page(text,text!=='invalid')}},location:{href,protocol:new URL(href).protocol,replace:url=>redirects.push(url)},setTimeout:(fn,ms)=>{timers.set(ms,fn);return ms},clearTimeout:id=>timers.delete(id),fetch:(url,options)=>{
    requests.push({url,options});
    if(remote==='offline')return Promise.reject(new Error('offline'));
    if(remote==='timeout')return new Promise((_,reject)=>options.signal.addEventListener('abort',()=>reject(new Error('timeout'))));
    return Promise.resolve({ok:remote!=='http-error',text:async()=>remote});
  }};context.window=context;
  vm.runInNewContext(source,context);
  return{boot:context.pescariaBoot,status,bar,splash,main,timers,requests,redirects};
}
(async()=>{
  let app=launch();assert.equal(await app.boot.check(),true);assert.equal(app.main.inert,true);
  assert.equal(app.requests[0].options.cache,'no-store');assert(app.requests[0].url.searchParams.has('_update'));
  assert.equal(app.redirects.length,0);await app.boot.ready();assert.equal(app.splash.hidden,true);assert.equal(app.main.inert,false);
  app=launch({remote:'new release'});assert.equal(await app.boot.check(),false);assert.equal(app.redirects.length,1);
  const target=new URL(app.redirects[0]);assert.equal(target.searchParams.get('mode'),'test');assert.equal(target.hash,'#game');assert(target.searchParams.has('_update'));
  app=launch({remote:'new release',href:target.href});assert.equal(await app.boot.check(),true);assert.equal(app.redirects.length,0,'Never loop during deployment');
  for(const remote of ['offline','http-error','invalid','timeout']){
    app=launch({remote});if(remote==='timeout')app.timers.get(6000)();
    assert.equal(await app.boot.check(),true);assert.equal(app.redirects.length,0);assert.match(app.status.textContent,/Controllo non disponibile/);
    const done=app.boot.ready();await new Promise(resolve=>setImmediate(resolve));app.timers.get(1200)();await done;assert.equal(app.splash.hidden,true);
  }
  app=launch({href:'file:///Users/test/pescaria/index.html'});assert.equal(await app.boot.check(),true);assert.equal(app.requests.length,0);await app.boot.ready();
  const pendingImage={complete:false,addEventListener(){}};
  app=launch({images:[{complete:true},pendingImage]});await app.boot.check();const done=app.boot.ready();app.timers.get(4000)();await done;assert.equal(app.splash.hidden,true,'Stalled images must not trap the splash');
  assert(!/localStorage|sessionStorage|caches\./.test(source),'Startup never alters saves or clears caches');
  console.log('PASS: fresh update check, changed version, bounded reloads, offline/HTTP/invalid/timeout recovery, file mode, stalled images, preserved saves');
})().catch(error=>{console.error(error);process.exitCode=1});
