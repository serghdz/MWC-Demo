import {assetUrl} from '../lib/asset-url.js';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
const host=document.querySelector('.hero-art'),canvas=document.querySelector('#hero-canvas');
const reduced=()=>window.missionMotion?.paused??matchMedia('(prefers-reduced-motion: reduce)').matches;
function showFallback(){const fallback=host.querySelector('.art-fallback');fallback.src=fallback.dataset.src;fallback.hidden=false;canvas.hidden=true;host.classList.remove('loaded');host.classList.add('failed');window.missionHeroReady=false;window.dispatchEvent(new Event('hero-ready'))}
startHero().catch(error=>{console.error('The 3D hero could not load.',error);showFallback()});
async function startHero(){
 // Start all transfers before environment lighting and shader preparation.
 const checked=async url=>{const response=await fetch(url);if(!response.ok)throw Error(`Asset unavailable: ${url}`);return response};
 const [gltf,particleData,type]=await Promise.all([
  new GLTFLoader().loadAsync(assetUrl('assets/hero-assets.glb')),
  checked(assetUrl('assets/globe.bin')).then(r=>r.arrayBuffer()),
  checked(assetUrl('assets/lettering.json')).then(r=>r.json())
 ]);
 const lowPower=(navigator.hardwareConcurrency||8)<=4||(navigator.deviceMemory||8)<=4;
 let pixelRatio=Math.min(devicePixelRatio,lowPower?1.25:1.75),frameInterval=lowPower?1000/30:0,dirty=true;
 document.body.appendChild(canvas);
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:'low-power'});
 renderer.setPixelRatio(pixelRatio);renderer.setClearColor(0,0);renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;renderer.outputColorSpace=THREE.SRGBColorSpace;
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(34,1,.1,100);camera.position.set(0,.1,10.8);
 const root=new THREE.Group();scene.add(root);root.position.y=.15;
 const pmrem=new THREE.PMREMGenerator(renderer);const room=new RoomEnvironment();const environment=pmrem.fromScene(room,.05);room.dispose();scene.environment=environment.texture;pmrem.dispose();
 const key=new THREE.DirectionalLight(0xffffff,3.6);key.position.set(-3,4,6);scene.add(key);
 const fill=new THREE.DirectionalLight(0xb9d8ef,1.4);fill.position.set(5,1,3);scene.add(fill);
 scene.add(new THREE.HemisphereLight(0xc1dcf2,0x162126,.75));
 const cross=new THREE.Group();gltf.scene.updateMatrixWorld(true);
 const crossMeshes=[];gltf.scene.traverse(o=>{if(o.isMesh&&o.name.startsWith('Cross_'))crossMeshes.push(o)});
 if(crossMeshes.length!==7)throw Error('Incomplete cross asset');
 crossMeshes.forEach(o=>cross.attach(o));
 const crossHolder=new THREE.Group();crossHolder.add(cross);root.add(crossHolder);
 cross.traverse(o=>{if(o.isMesh){const ball=o.name.toLowerCase().includes('ball');o.material=new THREE.MeshStandardMaterial({color:ball?0xd1d3d3:0xb1b6b9,metalness:1,roughness:ball?.17:.29,envMapIntensity:1.45});if(!ball){o.material.onBeforeCompile=shader=>{shader.vertexShader='varying vec3 vBrushed;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvBrushed=position;');shader.fragmentShader='varying vec3 vBrushed;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nfloat grain=sin(vBrushed.z*210.0+sin(vBrushed.x*2.0))*sin(vBrushed.z*381.0);roughnessFactor+=grain*0.028;');};}}});
 const header=new DataView(particleData);
 if(header.getUint32(0,true)!==0x3143574d)throw Error('Invalid globe layout');
 const count=header.getUint32(4,true);if(particleData.byteLength!==8+count*32)throw Error('Incomplete globe layout');
 const points=new THREE.InterleavedBuffer(new Float32Array(particleData,8),8);
 const geo=new THREE.BufferGeometry();
 geo.setAttribute('position',new THREE.InterleavedBufferAttribute(points,3,0));
 geo.setAttribute('color',new THREE.InterleavedBufferAttribute(points,3,3));
 geo.setAttribute('aSize',new THREE.InterleavedBufferAttribute(points,1,6));
 geo.setAttribute('aSeed',new THREE.InterleavedBufferAttribute(points,1,7));
 const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{uTime:{value:0},uReveal:{value:0},uScatter:{value:0},uDrop:{value:0},uPixelRatio:{value:pixelRatio}},vertexShader:`attribute vec3 color;attribute float aSize;attribute float aSeed;uniform float uTime;uniform float uReveal;uniform float uScatter;uniform float uDrop;uniform float uPixelRatio;varying vec3 vColor;varying float vAlpha;void main(){vec3 p=position;float settle=1.-uReveal;p*=1.+settle*(.06+aSeed*.045);p+=vec3(sin(aSeed*38.),cos(aSeed*21.),sin(aSeed*55.))*settle*.065;float s=uScatter*(.35+.65*uScatter);p*=1.+s*(1.5+aSeed*.65);p.x+=sin(aSeed*48.)*s*.85;p.y+=cos(aSeed*37.)*s*.65;p.z+=cos(aSeed*29.)*s*.35;p+=normalize(position)*sin(uTime*.7+aSeed*14.)*.018;vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_Position.y-=uDrop*gl_Position.w;gl_PointSize=aSize*(.85+.15*uReveal)*uPixelRatio*clamp(10./-mv.z,.65,1.5);vColor=color;vAlpha=(.40+.60*smoothstep(-1.2,1.3,position.z))*(1.-smoothstep(.28,1.,uScatter));}`,fragmentShader:`varying vec3 vColor;varying float vAlpha;void main(){float d=length(gl_PointCoord-vec2(.5));if(d>.5)discard;gl_FragColor=vec4(vColor,(1.-smoothstep(.28,.5,d))*vAlpha);\n#include <colorspace_fragment>\n}`});
 const globe=new THREE.Points(geo,material);globe.frustumCulled=false;const globeHolder=new THREE.Group();globeHolder.add(globe);root.add(globeHolder);
 // The actual cross and particle sphere share one center and rotation. Opaque cross
 // surfaces occlude rear particles; near particles remain visible across its face.
 globeHolder.add(crossHolder);
 const globeVeil=new THREE.Mesh(new THREE.SphereGeometry(2.10,48,32),new THREE.MeshBasicMaterial({color:0x174756,transparent:true,opacity:.07,depthWrite:false}));globeHolder.add(globeVeil);
 // Blender-authored band with flat faces and a fine edge bevel.
 const ring=gltf.scene.getObjectByName('MetalRing');if(!ring?.isMesh)throw Error('Ring unavailable');
 ring.material=new THREE.MeshStandardMaterial({color:0xc1c7ca,metalness:1,roughness:.23,envMapIntensity:1.55,transparent:true,opacity:1});
 root.add(ring);
 // This group never inherits the emblem's rotation or pointer tilt.
 const orbit=new THREE.Group();scene.add(orbit);
 const {name,tracking,orbitRadius,orbitDepth}=type;
 const glyphs=[],letters=[],glyphCache=new Map();let nameWidth=0,widestLetter=0;
 const faceMaterial=new THREE.MeshStandardMaterial({color:0xe5edef,metalness:.55,roughness:.25,envMapIntensity:1.2,transparent:true,depthWrite:false});
 // Measure the complete name, including actual word spaces, before bending its baseline.
 for(const ch of name){const advance=type.glyphs[ch].advance;glyphs.push({ch,center:nameWidth+advance/2});nameWidth+=advance+tracking}nameWidth-=tracking;
 // Recycle the name along the visible arc with a short word-sized gap.
 // The wrap occurs behind the edge fade, so empty space cannot cross the center.
 const repeatGap=type.repeatGap,repeatAngle=(nameWidth+repeatGap)/orbitRadius;
 for(const glyph of glyphs){if(glyph.ch===' ')continue;
  if(!glyphCache.has(glyph.ch)){
   const asset=gltf.scene.getObjectByName(type.glyphs[glyph.ch].node);
   if(!asset?.isMesh)throw Error(`Letter ${glyph.ch} unavailable`);
   const geometry=asset.geometry.clone();geometry.applyMatrix4(asset.matrixWorld);geometry.center();geometry.computeBoundingBox();
   geometry.clearGroups();geometry.addGroup(0,geometry.index?.count??geometry.attributes.position.count,0);
   widestLetter=Math.max(widestLetter,geometry.boundingBox.max.x-geometry.boundingBox.min.x);glyphCache.set(glyph.ch,geometry);
  }
  const letter=new THREE.Mesh(glyphCache.get(glyph.ch),[faceMaterial.clone()]);letter.name=glyph.ch;letter.userData.angle=Math.PI/2+(nameWidth/2-glyph.center)/orbitRadius;orbit.add(letter);letters.push(letter);
 }
 // Letters stay upright. Their projected width follows the curve's spacing at its sides.
 const orbitPosition=new THREE.Vector3(),orbitTangent=new THREE.Vector3(),orbitTransform=new THREE.Matrix3();
 // Draw in an unclipped viewport layer; preserve the emblem's original art framing.
 let viewKey='',drawWidth=0,drawHeight=0;
 function alignViewport(){const r=host.getBoundingClientRect(),w=Math.max(1,r.width),height=Math.max(1,r.height),vw=innerWidth,vh=innerHeight;const key=[w,height,r.left,r.top,vw,vh].join(',');if(key===viewKey)return;viewKey=key;if(vw!==drawWidth||vh!==drawHeight){renderer.setSize(vw,vh,false);drawWidth=vw;drawHeight=vh;}const halfFrustum=w/height*Math.tan(THREE.MathUtils.degToRad(camera.fov/2));camera.position.z=Math.max(10.1,Math.hypot(orbitRadius/halfFrustum,orbitDepth)+(widestLetter*.5+.18)/halfFrustum);camera.setViewOffset(w,height,-r.left,-r.top,vw,vh)}
 function resize(){dirty=true;viewKey='';alignViewport()}
 addEventListener('resize',resize);
 new ResizeObserver(resize).observe(host);resize();
 let visible=true;new IntersectionObserver(es=>{visible=es[0].isIntersecting;dirty=true},{rootMargin:'150px'}).observe(host);
 let mx=0,my=0;host.addEventListener('pointermove',e=>{dirty=true;const r=host.getBoundingClientRect();mx=((e.clientX-r.left)/r.width-.5)*.24;my=((e.clientY-r.top)/r.height-.5)*.09});host.addEventListener('pointerleave',()=>{dirty=true;mx=0;my=0});
 // A single fade reveals the complete assembly without changing metal depth sorting.
 // Particles gently settle into their globe positions during the same entrance.
 const entranceDuration=1.4;
 let entranceElapsed=0,entrance=0;
 function revealHero(dt){
  if(entrance===1)return;
  entranceElapsed=reduced()?entranceDuration:Math.min(entranceDuration,entranceElapsed+dt);
  entrance=THREE.MathUtils.smoothstep(entranceElapsed/entranceDuration,0,1);
  canvas.style.opacity=String(entrance);
  material.uniforms.uReveal.value=entrance;
 }
 let t=0,last=performance.now(),scatter=0;
 function pose(dt){
  const paused=reduced();const progress=paused?0:(window.missionHeroScroll?.progress??0);scatter=progress;if(paused)scatter=0;
  material.uniforms.uTime.value=t;material.uniforms.uScatter.value=scatter;
  const carry=paused?0:(window.missionHeroScroll?.travel??0),s=scatter*(.35+.65*scatter);
  material.uniforms.uDrop.value=2*(carry+s*innerHeight*.65)/innerHeight;
  const exitFade=THREE.MathUtils.smoothstep(window.missionHeroScroll?.exit??0,0,1);
  cross.traverse(o=>{if(o.isMesh){o.material.transparent=exitFade>0;o.material.opacity=1-exitFade}});globeHolder.rotation.y=t*.10;
  root.rotation.y+=((paused?0:mx)-root.rotation.y)*dt*3;root.rotation.x+=((paused?0:my)-root.rotation.x)*dt*3;
  root.scale.setScalar((1-scatter*.055)*(.975+.025*entrance));crossHolder.rotation.y=.06;crossHolder.position.y=0;
  globeVeil.material.opacity=.07*(1-scatter);ring.material.opacity=(1-scatter*.38)*(1-exitFade);ring.rotation.set(.18+Math.sin(t*.27)*.34,t*.16,Math.sin(t*.19)*.24);
  root.updateMatrixWorld(true);orbitTransform.setFromMatrix4(root.matrixWorld);
  letters.forEach(letter=>{
   const arcStart=Math.PI/2-repeatAngle/2,phase=THREE.MathUtils.euclideanModulo(letter.userData.angle-t*.075-arcStart,repeatAngle);
   const a=arcStart+phase,sin=Math.sin(a),cos=Math.cos(a);
   orbitPosition.set(cos*orbitRadius,-sin*.48+.02,sin*orbitDepth);letter.position.copy(orbitPosition.applyMatrix4(root.matrixWorld));
   orbitTangent.set(-sin*orbitRadius,-cos*.48,cos*orbitDepth).applyMatrix3(orbitTransform);
   const distance=camera.position.z-letter.position.z;
   const facing=-(orbitTangent.x+(letter.position.x-camera.position.x)*orbitTangent.z/distance)/(orbitRadius*root.scale.x);
   const edge=THREE.MathUtils.smoothstep(Math.min(phase,repeatAngle-phase),0,.10);
   const front=THREE.MathUtils.smoothstep(facing,.10,.36)*edge;
   letter.scale.set(root.scale.x*Math.max(.04,Math.min(1,facing))*.9,root.scale.x,root.scale.x);
   letter.visible=front>.005;letter.material.forEach(m=>m.opacity=front*(1-scatter*.6)*(1-exitFade));
  });
 }
 let drawing=true,lastDraw=0,samples=0,frameTotal=0;
 addEventListener('scroll',()=>{dirty=true},{passive:true});
 addEventListener('motionchange',()=>{dirty=true});
 document.addEventListener('visibilitychange',()=>{last=performance.now();dirty=true});
 function frame(now){
  requestAnimationFrame(frame);
  const elapsed=now-last;last=now;
  if(document.hidden)return;
  if(!visible&&!window.missionHeroScroll?.active){if(drawing){renderer.clear();drawing=false}return}
  if(reduced()&&!dirty)return;
  if(now-lastDraw<frameInterval-.5&&!dirty)return;
  const dt=Math.min((now-lastDraw)/1000,.05);lastDraw=now;drawing=true;dirty=false;
  alignViewport();revealHero(dt);if(!reduced())t+=dt;pose(dt);renderer.render(scene,camera);
  // Lower the drawing resolution once if this device cannot sustain the initial budget.
  if(!reduced()&&frameInterval===0&&elapsed<100&&++samples<=150){
   frameTotal+=elapsed;
   if(samples===150&&frameTotal/samples>25){pixelRatio=Math.min(pixelRatio,1.25);frameInterval=1000/30;renderer.setPixelRatio(pixelRatio);material.uniforms.uPixelRatio.value=pixelRatio;resize()}
  }
 }
 revealHero(0);pose(0);await renderer.compileAsync(scene,camera);renderer.render(scene,camera);
 window.missionHeroReady=true;host.classList.add('loaded');canvas.classList.add('ready');window.dispatchEvent(new Event('hero-ready'));lastDraw=last=performance.now();requestAnimationFrame(frame);
 canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();showFallback()});
}
