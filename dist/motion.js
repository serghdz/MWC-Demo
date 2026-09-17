window.missionMotion={paused:matchMedia('(prefers-reduced-motion: reduce)').matches};
const menu=document.querySelector('.menu-toggle'),nav=document.querySelector('#navigation');
menu.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?'Close navigation':'Open navigation');nav.classList.toggle('open',open)});
nav.addEventListener('click',e=>{if(e.target.closest('a')){menu.setAttribute('aria-expanded','false');nav.classList.remove('open')}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&nav.classList.contains('open')){menu.click();menu.focus()}});
const motionButton=document.querySelector('.motion-toggle');
function setMotion(){const p=window.missionMotion.paused;document.body.classList.toggle('no-motion',p);motionButton.setAttribute('aria-pressed',String(p));motionButton.setAttribute('aria-label',p?'Resume animations':'Pause animations');motionButton.innerHTML=p?'Resume motion <span aria-hidden="true">▷</span>':'Pause motion <span aria-hidden="true">Ⅱ</span>';window.dispatchEvent(new Event('motionchange'))}
motionButton.addEventListener('click',()=>{window.missionMotion.paused=!window.missionMotion.paused;setMotion()});
matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',e=>{window.missionMotion.paused=e.matches;setMotion()});setMotion();

// A quiet field of particle stars spans the full banner, independent of the emblem.
(()=>{const canvas=document.querySelector('#star-canvas'),hero=document.querySelector('.hero');if(!canvas)return;const ctx=canvas.getContext('2d');if(!ctx)return;let w=0,h=0,t=0,last=0,visible=true;const stars=Array.from({length:185},(_,i)=>({x:((Math.sin(i*87.3+1)*43758.5)%1+1)%1,y:((Math.sin(i*19.7+4)*43758.5)%1+1)%1,r:.6+(i%5)*.24,phase:i*2.41,speed:.02+(i%4)*.007}));function resize(){w=hero.clientWidth;h=hero.clientHeight;const d=Math.min(devicePixelRatio,1.5);canvas.width=w*d;canvas.height=h*d;ctx.setTransform(d,0,0,d,0,0)}new ResizeObserver(resize).observe(hero);new IntersectionObserver(e=>visible=e[0].isIntersecting).observe(hero);function frame(now){requestAnimationFrame(frame);const dt=Math.min((now-last)/1000,.05);last=now;if(!visible||document.hidden)return;if(!window.missionMotion.paused)t+=dt;ctx.clearRect(0,0,w,h);for(const s of stars){const x=(s.x*w+Math.sin(t*s.speed*2+s.phase)*24+t*(1.3+s.speed*9)+w)%w,y=(s.y*h-t*(2+s.speed*24)+h*10)%h;ctx.globalAlpha=.22+(.5+.5*Math.sin(t*.60+s.phase))*.43;ctx.fillStyle=s.phase%2>1?'#a8c6db':'#bce4da';ctx.beginPath();ctx.arc(x,y,s.r,0,Math.PI*2);ctx.fill()}ctx.globalAlpha=1}resize();requestAnimationFrame(frame)})();

// The text remains real, selectable HTML. Particle glyphs fill in each word as it enters.
(()=>{
 const surface=document.querySelector('#reveal-particles');if(!surface)return;
 const ctx=surface.getContext('2d');if(!ctx)return;
 const clamp=(x)=>Math.max(0,Math.min(1,x)),smooth=(x)=>{x=clamp(x);return x*x*(3-2*x)},hash=n=>{const v=Math.sin(n*127.1+31.7)*43758.5453;return v-Math.floor(v)};
 let vw=innerWidth,vh=innerHeight,scroll=scrollY,target=scrollY,raf=0,last=0;
 const groups=[],photos=[];
 document.querySelectorAll('[data-reveal]').forEach(el=>{
  const nodes=[];const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);while(walker.nextNode())nodes.push(walker.currentNode);
  for(const node of nodes){const frag=document.createDocumentFragment();for(const part of node.textContent.split(/(\s+)/)){if(!part)continue;if(/^\s+$/.test(part))frag.appendChild(document.createTextNode(part));else{const span=document.createElement('span');span.className='word';span.textContent=part;frag.appendChild(span)}}node.replaceWith(frag)}
  groups.push({el,words:[...el.querySelectorAll('.word')].map((el,i)=>({el,i,points:[],last:-1})),top:0,height:0});
 });
 function measure(){
  vw=innerWidth;vh=innerHeight;const dpr=Math.min(devicePixelRatio,1.5);surface.width=vw*dpr;surface.height=vh*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);
  for(const group of groups){const r=group.el.getBoundingClientRect();group.top=r.top+scrollY;group.height=r.height;
   for(const word of group.words){word.el.style.transform='none';const rect=word.el.getBoundingClientRect(),style=getComputedStyle(word.el);word.x=rect.left;word.y=rect.top+scrollY;word.w=rect.width;word.h=rect.height;word.last=-1;
    const c=document.createElement('canvas');c.width=Math.ceil(word.w)+4;c.height=Math.ceil(word.h)+4;const cc=c.getContext('2d');cc.font=`${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;cc.textBaseline='middle';cc.fillStyle='#fff';cc.fillText(word.el.textContent,1,word.h*.5);const data=cc.getImageData(0,0,c.width,c.height).data;word.points=[];const step=vw<700?5:4;
    for(let y=0;y<c.height;y+=step)for(let x=0;x<c.width;x+=step)if(data[(y*c.width+x)*4+3]>110)word.points.push({x,y,seed:hash(x*2+y*11+word.i)});
   }
  }
  for(const p of photos){const r=p.el.getBoundingClientRect();p.x=r.left;p.y=r.top+scrollY;p.w=r.width;p.h=r.height;for(const c of[p.cover,p.grid]){c.width=Math.round(r.width*dpr);c.height=Math.round(r.height*dpr);c.getContext('2d').setTransform(dpr,0,0,dpr,0,0)}p.last=-1}
  wake();
 }
 document.querySelectorAll('.particle-photo').forEach(el=>{
  const img=el.querySelector('img'),cover=document.createElement('canvas'),grid=document.createElement('canvas');cover.className='photo-dissolve';grid.className='photo-grid';cover.setAttribute('aria-hidden','true');grid.setAttribute('aria-hidden','true');el.append(cover,grid);
  const p={el,img,cover,grid,mx:.5,my:.5,tx:.5,ty:.5,hover:0,active:false,last:-1};photos.push(p);
  el.addEventListener('pointermove',e=>{const r=el.getBoundingClientRect();p.tx=(e.clientX-r.left)/r.width;p.ty=(e.clientY-r.top)/r.height;p.active=e.pointerType!=='touch';wake()});
  el.addEventListener('pointerleave',()=>{p.active=false;wake()});el.addEventListener('focus',()=>{p.active=true;p.tx=p.ty=.5;wake()});el.addEventListener('blur',()=>{p.active=false;wake()});img.addEventListener('load',measure);
 });
 function renderPhoto(p,time,dt,paused){
  const y=p.y-scroll;if(y>vh+80||y+p.h<0)return false;
  const progress=paused?1:smooth((vh*.94-y)/Math.min(vh*.65,p.h*.85));
  const cc=p.cover.getContext('2d');
  if(Math.abs(progress-p.last)>.005&&p.img.complete&&p.img.naturalWidth){
   p.last=progress;cc.clearRect(0,0,p.w,p.h);
   if(progress>.995||paused){p.img.style.opacity='1';p.cover.style.opacity='0'}else{p.img.style.opacity='0';p.cover.style.opacity='1';
    const imageRatio=p.img.naturalWidth/p.img.naturalHeight,boxRatio=p.w/p.h;let sw=p.img.naturalWidth,sh=p.img.naturalHeight;if(imageRatio>boxRatio)sw=sh*boxRatio;else sh=sw/boxRatio;const sx=(p.img.naturalWidth-sw)/2,sy=(p.img.naturalHeight-sh)/2;
    const cell=12;for(let y=0;y<p.h;y+=cell)for(let x=0;x<p.w;x+=cell){const seed=hash(x*3+y*17);const alpha=smooth((progress*1.6-seed*.45-y/p.h*.15)*2);if(alpha<.01)continue;cc.globalAlpha=alpha;const w=Math.min(cell+.5,p.w-x),h=Math.min(cell+.5,p.h-y);cc.drawImage(p.img,sx+x/p.w*sw,sy+y/p.h*sh,w/p.w*sw,h/p.h*sh,x,y,w,h)}cc.globalAlpha=1;
   }
  }
  p.hover+=((p.active&&!paused?1:0)-p.hover)*Math.min(1,dt*7);p.mx+=(p.tx-p.mx)*Math.min(1,dt*6);p.my+=(p.ty-p.my)*Math.min(1,dt*6);
  const gc=p.grid.getContext('2d');gc.clearRect(0,0,p.w,p.h);if(p.hover<.004||paused)return false;
  const radius=Math.min(180,p.w*.43),cx=p.mx*p.w,cy=p.my*p.h;const spacing=12;
  for(let y=0;y<p.h;y+=spacing)for(let x=0;x<p.w;x+=spacing){const dx=x-cx,dy=y-cy,d=Math.hypot(dx,dy)/radius;if(d>1.2)continue;const strength=Math.max(0,1-d/1.2);const wave=Math.sin(d*9-time*.7)*3*strength*p.hover;const dot=1+strength*.55;gc.fillStyle=x/p.w<.5?'#82e1bc':'#75a9e5';gc.globalAlpha=strength*.43*p.hover;gc.beginPath();gc.arc(x+(dx/(radius||1))*wave,y+wave,dot,0,Math.PI*2);gc.fill()}
  gc.globalAlpha=1;return true;
 }
 function draw(now){raf=0;const dt=Math.min((now-last)/1000,.05)||.016;last=now;const paused=window.missionMotion.paused;scroll+=(target-scroll)*Math.min(1,dt*12);if(Math.abs(target-scroll)<.08)scroll=target;
  ctx.clearRect(0,0,vw,vh);
  for(const group of groups){const gy=group.top-scroll;if(gy>vh+70||gy+group.height< -70)continue;
   for(const word of group.words){const flow=(vh*.87-gy)/(vh*.62);const p=paused?1:clamp(flow*1.5-word.i/Math.max(1,group.words.length-1)*.43);const ink=smooth((p-.18)/.7);
    if(Math.abs(p-word.last)>.003){word.el.style.opacity=String(.12+ink*.88);word.el.style.filter=`blur(${((1-ink)*2).toFixed(2)}px)`;word.el.style.transform=`translateY(${((1-ink)*7).toFixed(2)}px)`;word.last=p}
    if(paused||p<.01||p>.98)continue;
    const alpha=Math.sin(p*Math.PI)*.8;for(const dot of word.points){const drift=(1-p)*(1-p);const dx=(dot.seed-.5)*25*drift,dy=-18*drift+Math.sin(dot.seed*12+now*.0008)*4*drift;ctx.globalAlpha=alpha*(.35+dot.seed*.65);ctx.fillStyle=dot.seed>.6?'#6d9dee':'#83dec1';ctx.fillRect(word.x+dot.x+dx,word.y-scroll+dot.y+dy,1.3,1.3)}
   }
  }ctx.globalAlpha=1;
  let hover=false;for(const photo of photos)hover=renderPhoto(photo,now*.001,dt,paused)||hover;
  if(Math.abs(scroll-target)>.08||hover)wake();
 }
 function wake(){if(!raf&&!document.hidden)raf=requestAnimationFrame(draw)}
 addEventListener('scroll',()=>{target=scrollY;wake()},{passive:true});addEventListener('resize',measure);addEventListener('motionchange',()=>{for(const g of groups)for(const w of g.words)w.last=-1;for(const p of photos)p.last=-1;wake()});document.addEventListener('visibilitychange',wake);
 measure();document.fonts.ready.then(measure);
})();
