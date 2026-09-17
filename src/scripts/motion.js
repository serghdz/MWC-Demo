window.missionMotion={paused:matchMedia('(prefers-reduced-motion: reduce)').matches};
const menu=document.querySelector('.menu-toggle'),nav=document.querySelector('#navigation');
menu.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?'Close navigation':'Open navigation');nav.classList.toggle('open',open)});
nav.addEventListener('click',e=>{if(e.target.closest('a')){menu.setAttribute('aria-expanded','false');nav.classList.remove('open')}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&nav.classList.contains('open')){menu.click();menu.focus()}});
const motionButton=document.querySelector('.motion-toggle');
function setMotion(){const p=window.missionMotion.paused;document.body.classList.toggle('no-motion',p);motionButton.setAttribute('aria-pressed',String(p));motionButton.setAttribute('aria-label',p?'Resume animations':'Pause animations');motionButton.innerHTML=p?'Resume motion <span aria-hidden="true">▷</span>':'Pause motion <span aria-hidden="true">Ⅱ</span>';window.dispatchEvent(new Event('motionchange'))}
motionButton.addEventListener('click',()=>{window.missionMotion.paused=!window.missionMotion.paused;setMotion()});
matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',e=>{window.missionMotion.paused=e.matches;setMotion()});setMotion();

// A short native sticky interval uses normal wheel, touch, keyboard and scrollbar input.
// No gesture interception: scrolling back up also reconstructs the globe naturally.
(()=>{
 const track=document.querySelector('#hero-scroll'),hero=track?.querySelector('.hero');if(!track||!hero)return;
 const copy=hero.querySelector('.hero-content'),cue=hero.querySelector('.hero-explore');let start=0,hold=0,tail=0,height=0,lastHeight=0;
 const clamp=x=>Math.max(0,Math.min(1,x));window.missionHeroScroll={progress:0,travel:0,exit:0,active:false};
 function update(){const distance=Math.max(0,scrollY-start),travel=hold?Math.max(0,distance-hold):0;const p=hold?clamp(distance/(hold+tail)):0;Object.assign(window.missionHeroScroll,{progress:p,travel:Math.min(travel,tail),exit:hold?clamp(travel/(height*.48)):0,active:!!hold&&scrollY>=start-height&&distance<hold+tail});const fade=clamp((p-.55)/.45);copy.style.opacity=String(1-fade*.3);copy.style.transform=`translateY(${-fade*10}px)`;cue.style.opacity=String(1-clamp(p*2));}
 function measure(){height=hero.offsetHeight;start=track.getBoundingClientRect().top+scrollY;const enabled=window.missionHeroReady&&!window.missionMotion.paused;hold=enabled?Math.min(500,Math.max(280,height*.42)):0;tail=enabled?height*.65:0;track.classList.toggle('is-pinned',!!hold);const total=height+hold;track.style.height=`${total}px`;update();if(total!==lastHeight){lastHeight=total;window.dispatchEvent(new Event('hero-layout'))}}
 addEventListener('scroll',update,{passive:true});addEventListener('resize',measure);addEventListener('motionchange',measure);addEventListener('hero-ready',measure);measure();
})();

// A quiet field of particle stars spans the full banner, independent of the emblem.
(()=>{const canvas=document.querySelector('#star-canvas'),hero=document.querySelector('.hero');if(!canvas)return;const ctx=canvas.getContext('2d');if(!ctx)return;let w=0,h=0,t=0,last=0,visible=true,painted=false,starDirty=true;const stars=Array.from({length:185},(_,i)=>({x:((Math.sin(i*87.3+1)*43758.5)%1+1)%1,y:((Math.sin(i*19.7+4)*43758.5)%1+1)%1,r:.6+(i%5)*.24,phase:i*2.41,speed:.02+(i%4)*.007}));function resize(){starDirty=true;w=hero.clientWidth;h=hero.clientHeight;const d=Math.min(devicePixelRatio,1.5);canvas.width=w*d;canvas.height=h*d;ctx.setTransform(d,0,0,d,0,0)}new ResizeObserver(resize).observe(hero);new IntersectionObserver(e=>visible=e[0].isIntersecting).observe(hero);function frame(now){requestAnimationFrame(frame);if(!visible||document.hidden)return;if(window.missionMotion.paused&&painted&&!starDirty)return;if(now-last<33&&!starDirty)return;const dt=Math.min((now-last)/1000,.05);last=now;painted=true;starDirty=false;if(!window.missionMotion.paused)t+=dt;ctx.clearRect(0,0,w,h);for(const s of stars){const x=(s.x*w+Math.sin(t*s.speed*2+s.phase)*24+t*(1.3+s.speed*9)+w)%w,y=(s.y*h-t*(2+s.speed*24)+h*10)%h;ctx.globalAlpha=.22+(.5+.5*Math.sin(t*.60+s.phase))*.43;ctx.fillStyle=s.phase%2>1?'#a8c6db':'#bce4da';ctx.beginPath();ctx.arc(x,y,s.r,0,Math.PI*2);ctx.fill()}ctx.globalAlpha=1}resize();requestAnimationFrame(frame)})();

// The text remains real, selectable HTML. Particle glyphs fill in each word as it enters.
(()=>{
 const surface=document.querySelector('#reveal-particles');if(!surface)return;
 const ctx=surface.getContext('2d');if(!ctx)return;
 const clamp=(x)=>Math.max(0,Math.min(1,x)),smooth=(x)=>{x=clamp(x);return x*x*(3-2*x)},hash=n=>{const v=Math.sin(n*127.1+31.7)*43758.5453;return v-Math.floor(v)};
 let vw=innerWidth,vh=innerHeight,scroll=scrollY,raf=0,last=0,measured=false,measureRaf=0;
 const groups=[],photos=[];
 document.querySelectorAll('[data-reveal]').forEach(el=>{
  const nodes=[];const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);while(walker.nextNode())nodes.push(walker.currentNode);
  for(const node of nodes){const frag=document.createDocumentFragment();for(const part of node.textContent.split(/(\s+)/)){if(!part)continue;if(/^\s+$/.test(part))frag.appendChild(document.createTextNode(part));else{const span=document.createElement('span');span.className='word';span.textContent=part;frag.appendChild(span)}}node.replaceWith(frag)}
  groups.push({el,words:[...el.querySelectorAll('.word')].map((el,i)=>({el,i,points:[],last:-1,progress:null})),top:0,height:0});
 });
 function measure(){
  vw=innerWidth;vh=innerHeight;const dpr=Math.min(devicePixelRatio,1.5);surface.width=vw*dpr;surface.height=vh*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);
  for(const group of groups){const r=group.el.getBoundingClientRect();group.top=r.top+scrollY;group.height=r.height;group.x=r.left;group.width=r.width;
   for(const word of group.words){word.el.style.transform='none';const rect=word.el.getBoundingClientRect(),style=getComputedStyle(word.el);word.x=rect.left;word.y=rect.top+scrollY;word.w=rect.width;word.h=rect.height;word.last=-1;
    const c=document.createElement('canvas');c.width=Math.ceil(word.w)+2;c.height=Math.ceil(word.h)+2;
    const cc=c.getContext('2d');cc.font=`${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    if('letterSpacing' in cc)cc.letterSpacing=style.letterSpacing;
    cc.textBaseline='alphabetic';cc.fillStyle='#fff';
    const metrics=cc.measureText(word.el.textContent),fontSize=parseFloat(style.fontSize);
    const ascent=metrics.fontBoundingBoxAscent??fontSize*.8,descent=metrics.fontBoundingBoxDescent??fontSize*.2;
    cc.fillText(word.el.textContent,0,(word.h-ascent-descent)/2+ascent,word.w);
    const data=cc.getImageData(0,0,c.width,c.height).data;word.points=[];
    // A fine, softly irregular grain follows the actual glyphs, including their edges.
    const step=vw<700?2.25:1.9;
    for(let y=0;y<c.height;y+=step)for(let x=0;x<c.width;x+=step){
     const coverage=data[(Math.floor(y)*c.width+Math.floor(x))*4+3]/255;if(coverage<.22)continue;
     const seed=hash(x*2+y*11+word.i),swirl=hash(x*17+y*3+word.i*7);
     const driftAngle=swirl*Math.PI*2,driftRadius=16+seed*30;
     word.points.push({x:x+(seed-.5)*.4,y:y+(swirl-.5)*.4,seed,
      delay:.04+(x/Math.max(1,word.w))*.17+swirl*.13,
      driftX:Math.cos(driftAngle)*driftRadius*1.15,driftY:Math.sin(driftAngle)*driftRadius*.85-5,
      size:.75+seed*.45,alpha:.60+coverage*.34,
      color:seed>.5?'#9fcdff':'#a4f1d3'});
    }
   }
  }
  for(const p of photos){const r=p.el.getBoundingClientRect();p.x=r.left;p.y=r.top+scrollY;p.w=r.width;p.h=r.height;for(const c of[p.cover,p.grid]){c.width=Math.round(r.width*dpr);c.height=Math.round(r.height*dpr);c.getContext('2d').setTransform(dpr,0,0,dpr,0,0)}p.last=-1}
  measured=true;wake();
 }
 function scheduleMeasure(){if(!measureRaf)measureRaf=requestAnimationFrame(()=>{measureRaf=0;measure()})}
 document.querySelectorAll('.particle-photo').forEach(el=>{
  const img=el.querySelector('img'),cover=document.createElement('canvas'),grid=document.createElement('canvas');cover.className='photo-dissolve';grid.className='photo-grid';cover.setAttribute('aria-hidden','true');grid.setAttribute('aria-hidden','true');el.append(cover,grid);
  const p={el,img,cover,grid,mx:.5,my:.5,tx:.5,ty:.5,hover:0,active:false,last:-1};photos.push(p);
  el.addEventListener('pointermove',e=>{const r=el.getBoundingClientRect();p.tx=(e.clientX-r.left)/r.width;p.ty=(e.clientY-r.top)/r.height;p.active=e.pointerType!=='touch';wake()});
  el.addEventListener('pointerleave',()=>{p.active=false;wake()});el.addEventListener('focus',()=>{p.active=true;p.tx=p.ty=.5;wake()});el.addEventListener('blur',()=>{p.active=false;wake()});img.addEventListener('load',scheduleMeasure);
 });
 function renderPhoto(p,time,dt,paused){
  const y=p.y-scroll;if(y>vh+80||y+p.h<0)return false;
  const desired=paused?1:smooth((vh*.94-y)/Math.min(vh*.65,p.h*.85));
  if(p.progress===undefined||paused)p.progress=desired;else p.progress+=(desired-p.progress)*(1-Math.exp(-dt/.085));
  const settling=Math.abs(desired-p.progress)>.0008;if(!settling)p.progress=desired;const progress=p.progress;
  const cc=p.cover.getContext('2d');
  if(Math.abs(progress-p.last)>.005&&p.img.complete&&p.img.naturalWidth){
   p.last=progress;cc.clearRect(0,0,p.w,p.h);
   if(progress>.995||paused){p.img.style.opacity='1';p.cover.style.opacity='0'}else{p.img.style.opacity='0';p.cover.style.opacity='1';
    const imageRatio=p.img.naturalWidth/p.img.naturalHeight,boxRatio=p.w/p.h;let sw=p.img.naturalWidth,sh=p.img.naturalHeight;if(imageRatio>boxRatio)sw=sh*boxRatio;else sh=sw/boxRatio;const sx=(p.img.naturalWidth-sw)/2,sy=(p.img.naturalHeight-sh)/2;
    const cell=12;for(let y=0;y<p.h;y+=cell)for(let x=0;x<p.w;x+=cell){const seed=hash(x*3+y*17);const alpha=smooth((progress*1.6-seed*.45-y/p.h*.15)*2);if(alpha<.01)continue;cc.globalAlpha=alpha;const w=Math.min(cell+.5,p.w-x),h=Math.min(cell+.5,p.h-y);cc.drawImage(p.img,sx+x/p.w*sw,sy+y/p.h*sh,w/p.w*sw,h/p.h*sh,x,y,w,h)}cc.globalAlpha=1;
   }
  }
  p.hover+=((p.active&&!paused?1:0)-p.hover)*Math.min(1,dt*7);p.mx+=(p.tx-p.mx)*Math.min(1,dt*6);p.my+=(p.ty-p.my)*Math.min(1,dt*6);
  const gc=p.grid.getContext('2d');gc.clearRect(0,0,p.w,p.h);if(p.hover<.004||paused)return settling;
  const radius=Math.min(195,p.w*.45),cx=p.mx*p.w,cy=p.my*p.h;const spacing=11;
  for(let y=0;y<p.h;y+=spacing)for(let x=0;x<p.w;x+=spacing){const dx=x-cx,dy=y-cy,d=Math.hypot(dx,dy)/radius;if(d>1.2)continue;const strength=Math.max(0,1-d/1.2);const wave=Math.sin(d*9-time*.7)*3*strength*p.hover;const dot=1.1+strength*.8;gc.fillStyle=hash(x*7+y*11)>.5?'#26e5a2':'#388dff';gc.globalAlpha=strength*.64*p.hover;gc.beginPath();gc.arc(x+(dx/(radius||1))*wave,y+wave,dot,0,Math.PI*2);gc.fill()}
  gc.globalAlpha=1;return true;
 }
 function draw(now){
  raf=0;if(!measured)return;
  const dt=Math.min((now-last)/1000,.05)||.016;last=now;
  const paused=window.missionMotion.paused;scroll=scrollY;
  const follow=1-Math.exp(-dt/0.085);let settling=false;
  ctx.clearRect(0,0,vw,vh);
  for(const group of groups){
   const gy=group.top-scroll;
   if(gy>vh+80||gy+group.height< -80){
    // Complete skipped words after a fast swipe; reset words below the viewport.
    for(const word of group.words){const p=paused||gy+group.height<0?1:0;if(word.progress===p&&word.last===p)continue;word.progress=p;word.last=p;word.el.style.opacity=p?'1':'.06';word.el.style.filter=p?'none':'blur(.65px)';word.el.style.transform=p?'none':'translateY(4px)'}
    continue;
   }
   for(const word of group.words){
    const y=word.y-scroll,across=clamp((word.x-group.x)/Math.max(1,group.width));
    const desired=paused?1:clamp((vh*.96-y)/Math.min(vh*.55,420)-across*.075);
    if(word.progress===null||paused)word.progress=desired;
    else{word.progress+=(desired-word.progress)*follow;if(Math.abs(desired-word.progress)<.0008)word.progress=desired;else settling=true}
    const p=word.progress,ink=smooth((p-.32)/.68),lift=(1-ink)*4;
    if(Math.abs(p-word.last)>.0005||p===0||p===1){
     word.el.style.opacity=String(.06+ink*.94);
     word.el.style.filter=ink>.999?'none':`blur(${((1-ink)*.65).toFixed(3)}px)`;
     word.el.style.transform=ink>.999?'none':`translateY(${lift.toFixed(3)}px)`;word.last=p;
    }
    if(paused||p<=.001||p>=.999)continue;
    const envelope=smooth(p/.14)*(1-smooth((p-.64)/.36));
    for(const dot of word.points){
     // Each grain approaches its own place, then hands off to the solid letter.
     const phase=clamp((p-dot.delay)/.64),arrival=phase*phase*phase*(phase*(phase*6-15)+10);
     const spread=1-arrival,arc=Math.sin(phase*Math.PI)*spread;
     const dx=dot.driftX*spread+(dot.seed-.5)*10*arc;
     const dy=dot.driftY*spread+Math.sin(dot.seed*6.283)*5*arc;
     // More of the fine grain becomes visible as the surrounding cloud gathers.
     const density=.55+.45*smooth((p-dot.seed*.18)/.24);
     ctx.globalAlpha=envelope*dot.alpha*density;ctx.fillStyle=dot.color;
     const size=dot.size*(.8+.2*arrival);
     // Screen position tracks native scroll exactly; only the reveal progress eases.
     ctx.fillRect(word.x+dot.x+dx,word.y-scroll+lift+dot.y+dy,size,size);
    }
   }
  }
  ctx.globalAlpha=1;
  let hover=false;for(const photo of photos)hover=renderPhoto(photo,now*.001,dt,paused)||hover;
  if(settling||hover)wake();
 }
 function wake(){if(!raf&&!document.hidden)raf=requestAnimationFrame(draw)}
 addEventListener('scroll',wake,{passive:true});addEventListener('resize',scheduleMeasure);addEventListener('hero-layout',scheduleMeasure);addEventListener('motionchange',()=>{for(const g of groups)for(const w of g.words)w.last=-1;for(const p of photos)p.last=-1;wake()});document.addEventListener('visibilitychange',wake);
 const startReveals=()=>{measure();document.fonts.ready.then(scheduleMeasure)};
 const scheduleReveals=()=>requestAnimationFrame(()=>{if('requestIdleCallback' in window)requestIdleCallback(startReveals,{timeout:750});else setTimeout(startReveals,0)});
 if(window.missionHeroReady)scheduleReveals();else addEventListener('hero-ready',scheduleReveals,{once:true});
})();
