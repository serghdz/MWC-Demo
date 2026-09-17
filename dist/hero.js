import * as THREE from 'three';
import {GLTFLoader} from './assets/vendor/GLTFLoader.js';
import {RoomEnvironment} from './assets/vendor/RoomEnvironment.js';
import {FontLoader} from './assets/vendor/FontLoader.js';
import {TextGeometry} from './assets/vendor/TextGeometry.js';
const host=document.querySelector('.hero-art'),canvas=document.querySelector('#hero-canvas');
const reduced=()=>window.missionMotion?.paused??matchMedia('(prefers-reduced-motion: reduce)').matches;
function showFallback(){const fallback=host.querySelector('.art-fallback');fallback.src=fallback.dataset.src;fallback.hidden=false;canvas.hidden=true;host.classList.remove('loaded');host.classList.add('failed');window.missionHeroReady=false;window.dispatchEvent(new Event('hero-ready'))}
try{await startHero()}catch(error){console.error('The 3D hero could not load.',error);showFallback()}
async function startHero(){
 // Start all transfers before environment lighting and shader preparation.
 const assets=Promise.all([new GLTFLoader().loadAsync('./assets/cross.glb'),fetch('./assets/land.json').then(r=>{if(!r.ok)throw Error('Map unavailable');return r.json()}),new FontLoader().loadAsync('./assets/helvetiker_regular.typeface.json')]);
 const [gltf,land,font]=await assets;
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:'low-power'});
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.setClearColor(0,0);renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;renderer.outputColorSpace=THREE.SRGBColorSpace;
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(34,1,.1,100);camera.position.set(0,.1,10.8);
 const root=new THREE.Group();scene.add(root);root.position.y=.15;
 const pmrem=new THREE.PMREMGenerator(renderer);const environment=pmrem.fromScene(new RoomEnvironment(),.05);scene.environment=environment.texture;pmrem.dispose();
 const key=new THREE.DirectionalLight(0xffffff,3.6);key.position.set(-3,4,6);scene.add(key);
 const fill=new THREE.DirectionalLight(0xb9d8ef,1.4);fill.position.set(5,1,3);scene.add(fill);
 scene.add(new THREE.HemisphereLight(0xc1dcf2,0x162126,.75));
 const cross=gltf.scene;const box=new THREE.Box3().setFromObject(cross),center=box.getCenter(new THREE.Vector3());
 cross.position.sub(center);const crossHolder=new THREE.Group();crossHolder.add(cross);crossHolder.scale.setScalar(3.95/.16);crossHolder.position.z=0;root.add(crossHolder);
 cross.traverse(o=>{if(o.isMesh){const ball=o.name.toLowerCase().includes('ball');o.material=new THREE.MeshStandardMaterial({color:ball?0xd1d3d3:0xb1b6b9,metalness:1,roughness:ball?.17:.29,envMapIntensity:1.45});if(!ball){o.material.onBeforeCompile=shader=>{shader.vertexShader='varying vec3 vBrushed;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvBrushed=position;');shader.fragmentShader='varying vec3 vBrushed;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nfloat grain=sin(vBrushed.z*210.0+sin(vBrushed.x*2.0))*sin(vBrushed.z*381.0);roughnessFactor+=grain*0.028;');};}}});
 const polygons=land.features.flatMap(f=>f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates).map(p=>p[0]);
 const bounds=polygons.map(p=>({p,minX:Math.min(...p.map(v=>v[0])),maxX:Math.max(...p.map(v=>v[0])),minY:Math.min(...p.map(v=>v[1])),maxY:Math.max(...p.map(v=>v[1]))}));
 function isLand(x,y){return bounds.some(b=>{if(x<b.minX||x>b.maxX||y<b.minY||y>b.maxY)return false;let c=false;for(let i=0,j=b.p.length-1;i<b.p.length;j=i++){const a=b.p[i],d=b.p[j];if(((a[1]>y)!==(d[1]>y))&&(x<(d[0]-a[0])*(y-a[1])/(d[1]-a[1])+a[0]))c=!c}return c})}
 const positions=[],colors=[],sizes=[],seeds=[];const mint=new THREE.Color('#8bf5b2'),blue=new THREE.Color('#94c4ff'),ocean=new THREE.Color('#5685bc');
 for(let lat=-78;lat<82;lat+=2.3){const phi=lat*Math.PI/180,cos=Math.cos(phi);const step=2.5/Math.max(.24,cos);for(let lon=-180;lon<180;lon+=step){const landPoint=isLand(lon,lat);if(!landPoint&&Math.round(lon/step)%3!==0)continue;const theta=(lon+95)*Math.PI/180;positions.push(2.12*cos*Math.sin(theta),2.12*Math.sin(phi),2.12*cos*Math.cos(theta));const mixSeed=Math.sin(lon*12.9898+lat*78.233)*43758.5453;const tint=THREE.MathUtils.smoothstep(mixSeed-Math.floor(mixSeed),.12,.88);const color=landPoint?mint.clone().lerp(blue,tint):ocean;colors.push(color.r,color.g,color.b);sizes.push(landPoint?2.55:1.4);seeds.push(Math.sin(lat*12+lon*5)*.5+.5)}}
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.setAttribute('aSize',new THREE.Float32BufferAttribute(sizes,1));geo.setAttribute('aSeed',new THREE.Float32BufferAttribute(seeds,1));
 const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{uTime:{value:0},uScatter:{value:0},uPixelRatio:{value:Math.min(devicePixelRatio,1.75)}},vertexShader:`attribute vec3 color;attribute float aSize;attribute float aSeed;uniform float uTime;uniform float uScatter;uniform float uPixelRatio;varying vec3 vColor;varying float vAlpha;void main(){vec3 p=position;float s=uScatter*(.35+.65*uScatter);p.x+=sin(aSeed*48.)*s*4.;p.y-=s*(3.+aSeed*5.);p.z+=cos(aSeed*29.)*s*2.;p+=normalize(position)*sin(uTime*.7+aSeed*14.)*.018;vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=aSize*uPixelRatio*clamp(10./-mv.z,.65,1.5);vColor=color;vAlpha=(.40+.60*smoothstep(-1.2,1.3,position.z))*(1.-uScatter*.85);}`,fragmentShader:`varying vec3 vColor;varying float vAlpha;void main(){float d=length(gl_PointCoord-vec2(.5));if(d>.5)discard;gl_FragColor=vec4(vColor,(1.-smoothstep(.28,.5,d))*vAlpha);\n#include <colorspace_fragment>\n}`});
 const globe=new THREE.Points(geo,material);const globeHolder=new THREE.Group();globeHolder.add(globe);root.add(globeHolder);
 // The actual cross and particle sphere share one center and rotation. Opaque cross
 // surfaces occlude rear particles; near particles remain visible across its face.
 globeHolder.add(crossHolder);
 const globeVeil=new THREE.Mesh(new THREE.SphereGeometry(2.10,48,32),new THREE.MeshBasicMaterial({color:0x174756,transparent:true,opacity:.07,depthWrite:false}));globeHolder.add(globeVeil);
 const ring=new THREE.Mesh(new THREE.TorusGeometry(2.30,.048,20,200),new THREE.MeshStandardMaterial({color:0xc1c7ca,metalness:1,roughness:.23,envMapIntensity:1.55,transparent:true,opacity:1}));ring.rotation.x=.10;ring.position.z=-.06;root.add(ring);
 // This group never inherits the emblem's rotation or pointer tilt.
 const orbit=new THREE.Group();scene.add(orbit);const phrase='MISSION WORLD CHURCH   MISSION WORLD CHURCH   ';const letters=[],glyphCache=new Map();
 const faceMaterial=new THREE.MeshStandardMaterial({color:0xe5edef,metalness:.55,roughness:.25,envMapIntensity:1.2,transparent:true,depthWrite:false});
 const edgeMaterial=new THREE.MeshStandardMaterial({color:0x617b8a,metalness:.72,roughness:.3,envMapIntensity:1.2,transparent:true,depthWrite:false});
 for(const ch of phrase){if(ch===' '){letters.push(null);continue}if(!glyphCache.has(ch)){const geometry=new TextGeometry(ch,{font,size:.245,height:.045,curveSegments:5,bevelEnabled:true,bevelThickness:.004,bevelSize:.003,bevelSegments:2});geometry.center();glyphCache.set(ch,geometry)}const letter=new THREE.Mesh(glyphCache.get(ch),[faceMaterial.clone(),edgeMaterial.clone()]);orbit.add(letter);letters.push(letter)}
 // Letter geometry is permanently upright, facing the fixed camera (+Z).
 // Animate only position and uniform scale; no lookAt, Euler or quaternion updates.
 const orbitPosition=new THREE.Vector3();
 function resize(){const w=host.clientWidth,h=host.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.position.z=w/h<.85?13.9:10.1;camera.updateProjectionMatrix()}
 new ResizeObserver(resize).observe(host);resize();
 let visible=true;new IntersectionObserver(es=>{visible=es[0].isIntersecting},{rootMargin:'150px'}).observe(host);
 let mx=0,my=0;host.addEventListener('pointermove',e=>{const r=host.getBoundingClientRect();mx=((e.clientX-r.left)/r.width-.5)*.24;my=((e.clientY-r.top)/r.height-.5)*.09});host.addEventListener('pointerleave',()=>{mx=0;my=0});
 let t=0,last=performance.now(),scatter=0;
 function pose(dt){
  const paused=reduced();const progress=paused?0:(window.missionHeroScroll?.progress??0);scatter+=(progress-scatter)*Math.min(1,dt*8);if(paused)scatter=0;
  material.uniforms.uTime.value=t;material.uniforms.uScatter.value=scatter;globeHolder.rotation.y=t*.10;
  root.rotation.y+=((paused?0:mx)-root.rotation.y)*dt*3;root.rotation.x+=((paused?0:my)-root.rotation.x)*dt*3;
  root.scale.setScalar(1-scatter*.055);crossHolder.rotation.y=.06;crossHolder.position.y=0;
  globeVeil.material.opacity=.07*(1-scatter);ring.material.opacity=1-scatter*.38;ring.rotation.set(.18+Math.sin(t*.27)*.34,t*.16,Math.sin(t*.19)*.24);
  root.updateMatrixWorld(true);
  letters.forEach((letter,i)=>{if(!letter)return;const a=Math.PI-i/letters.length*Math.PI*2-t*.075;orbitPosition.set(Math.cos(a)*2.9,-Math.sin(a)*.43+.02,Math.sin(a)*2.60);letter.position.copy(orbitPosition.applyMatrix4(root.matrixWorld));letter.scale.setScalar(root.scale.x);const opacity=(.08+.92*THREE.MathUtils.smoothstep(Math.sin(a),-.15,.60))*(1-scatter*.6);letter.material.forEach(m=>m.opacity=opacity)});
 }
 function frame(now){requestAnimationFrame(frame);const dt=Math.min((now-last)/1000,.05);last=now;if(!visible||document.hidden)return;if(!reduced())t+=dt;pose(dt);renderer.render(scene,camera)}
 pose(1);renderer.compile(scene,camera);renderer.render(scene,camera);
 window.missionHeroReady=true;host.classList.add('loaded');window.dispatchEvent(new Event('hero-ready'));last=performance.now();requestAnimationFrame(frame);
 canvas.addEventListener('webglcontextlost',showFallback);
}
