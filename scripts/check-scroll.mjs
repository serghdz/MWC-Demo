import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source=(await readFile(new URL('../src/scripts/motion.js',import.meta.url),'utf8')).replaceAll('\r\n','\n');
const start=source.indexOf('(()=>{\n const track='),end=source.indexOf('})();',start)+5;
assert(start>=0);const code=source.slice(start,end);
for(const height of [568,667,740,844,1000]){
 const callbacks={},copy={style:{}},cue={style:{}},classes=new Set();let state;
 const hero={offsetHeight:height,querySelector:q=>q==='.hero-content'?copy:cue};
 const track={style:{},querySelector:()=>hero,getBoundingClientRect:()=>({top:-state.scrollY}),classList:{toggle(c,v){v?classes.add(c):classes.delete(c)}}};
 state={scrollY:0,innerWidth:390,innerHeight:height,Event,document:{querySelector:()=>track},window:{missionHeroReady:true,missionMotion:{paused:false},dispatchEvent(){}},addEventListener:(name,fn)=>callbacks[name]=fn};
 vm.runInNewContext(code,state);
 const hold=parseFloat(track.style.height)-height,tail=height*.65;
 assert(classes.has('is-pinned'));
 state.scrollY=20;callbacks.scroll();assert(state.window.missionHeroScroll.progress>0);
 state.scrollY=hold;callbacks.scroll();assert(state.window.missionHeroScroll.progress>.3&&state.window.missionHeroScroll.progress<.5);
 state.scrollY=hold+tail*.5;callbacks.scroll();assert(state.window.missionHeroScroll.active);assert(state.window.missionHeroScroll.progress<1);
 const midpoint=state.window.missionHeroScroll.progress;
 state.innerHeight=height+95;callbacks.resize();assert.equal(state.window.missionHeroScroll.progress,midpoint,'Browser controls changed dissolve progress');
 state.scrollY=hold+tail+800;callbacks.scroll();assert.equal(state.window.missionHeroScroll.progress,1,'Fast swipe did not reach completion');assert.equal(state.window.missionHeroScroll.active,false);
 state.scrollY=0;callbacks.scroll();assert.equal(state.window.missionHeroScroll.progress,0);assert.equal(state.window.missionHeroScroll.travel,0);
 state.window.missionMotion.paused=true;callbacks.motionchange();assert(!classes.has('is-pinned'));assert.equal(state.window.missionHeroScroll.progress,0);
}
const hero=await readFile(new URL('../src/scripts/hero.js',import.meta.url),'utf8');
assert(hero.includes('(1.-smoothstep(.28,1.,uScatter))'));
assert(hero.includes('globe.frustumCulled=false'));
assert(hero.includes('document.body.appendChild(canvas)'));
console.log('Mobile scroll checks passed: early dissolve, continuous section handoff, complete fade on fast swipes, stable browser-bar resizing, reverse scroll, and reduced-motion bypass.');
