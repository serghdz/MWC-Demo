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
 const assets=Promise.all([new GLTFLoader().loadAsync('./assets/cross.glb'),fetch('./assets/land.json').then(r=>{if(!r.ok)throw Error('Map unavailable');return r.json()}),new FontLoader().loadAsync('./assets/helvetiker_bold.typeface.json')]);
 const [gltf,land,font]=await assets;
 document.body.appendChild(canvas);
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
 const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{uTime:{value:0},uScatter:{value:0},uDrop:{value:0},uPixelRatio:{value:Math.min(devicePixelRatio,1.75)}},vertexShader:`attribute vec3 color;attribute float aSize;attribute float aSeed;uniform float uTime;uniform float uScatter;uniform float uDrop;uniform float uPixelRatio;varying vec3 vColor;varying float vAlpha;void main(){vec3 p=position;float s=uScatter*(.35+.65*uScatter);p*=1.+s*(1.5+aSeed*.65);p.x+=sin(aSeed*48.)*s*.85;p.y+=cos(aSeed*37.)*s*.65;p.z+=cos(aSeed*29.)*s*.35;p+=normalize(position)*sin(uTime*.7+aSeed*14.)*.018;vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_Position.y-=uDrop*gl_Position.w;gl_PointSize=aSize*uPixelRatio*clamp(10./-mv.z,.65,1.5);vColor=color;vAlpha=(.40+.60*smoothstep(-1.2,1.3,position.z))*(1.-smoothstep(.28,1.,uScatter));}`,fragmentShader:`varying vec3 vColor;varying float vAlpha;void main(){float d=length(gl_PointCoord-vec2(.5));if(d>.5)discard;gl_FragColor=vec4(vColor,(1.-smoothstep(.28,.5,d))*vAlpha);\n#include <colorspace_fragment>\n}`});
 const globe=new THREE.Points(geo,material);globe.frustumCulled=false;const globeHolder=new THREE.Group();globeHolder.add(globe);root.add(globeHolder);
 // The actual cross and particle sphere share one center and rotation. Opaque cross
 // surfaces occlude rear particles; near particles remain visible across its face.
 globeHolder.add(crossHolder);
 const globeVeil=new THREE.Mesh(new THREE.SphereGeometry(2.10,48,32),new THREE.MeshBasicMaterial({color:0x174756,transparent:true,opacity:.07,depthWrite:false}));globeHolder.add(globeVeil);
 // A rectangular metal band with planar front/back faces and small edge bevels.
 const ringOutline=new THREE.Shape();ringOutline.absarc(0,0,2.34,0,Math.PI*2,false);
 const ringHole=new THREE.Path();ringHole.absarc(0,0,2.19,0,Math.PI*2,true);ringOutline.holes.push(ringHole);
 const ringGeometry=new THREE.ExtrudeGeometry(ringOutline,{depth:.22,steps:1,curveSegments:128,bevelEnabled:true,bevelThickness:.012,bevelSize:.012,bevelSegments:2});ringGeometry.translate(0,0,-.11);
 const ring=new THREE.Mesh(ringGeometry,new THREE.MeshStandardMaterial({color:0xc1c7ca,metalness:1,roughness:.23,envMapIntensity:1.55,transparent:true,opacity:1}));ring.rotation.x=.10;ring.position.z=0;root.add(ring);
 // This group never inherits the emblem's rotation or pointer tilt.
 const orbit=new THREE.Group();scene.add(orbit);
 const name='MISSION WORLD CHURCH',fontSize=.245,tracking=.090,orbitRadius=2.52,orbitDepth=2.52;
 const glyphs=[],letters=[],glyphCache=new Map();let nameWidth=0,widestLetter=0;
 const faceMaterial=new THREE.MeshStandardMaterial({color:0xe5edef,metalness:.55,roughness:.25,envMapIntensity:1.2,transparent:true,depthWrite:false});
 const edgeMaterial=new THREE.MeshStandardMaterial({color:0x617b8a,metalness:.72,roughness:.3,envMapIntensity:1.2,transparent:true,depthWrite:false});
 // Measure the complete name, including actual word spaces, before bending its baseline.
 for(const ch of name){const advance=font.data.glyphs[ch].ha/font.data.resolution*fontSize;glyphs.push({ch,center:nameWidth+advance/2});nameWidth+=advance+tracking}nameWidth-=tracking;
 // Recycle the name along the visible arc with a short word-sized gap.
 // The wrap occurs behind the edge fade, so empty space cannot cross the center.
 const repeatGap=.28,repeatAngle=(nameWidth+repeatGap)/orbitRadius;
 for(const glyph of glyphs){if(glyph.ch===' ')continue;
  if(!glyphCache.has(glyph.ch)){const geometry=new TextGeometry(glyph.ch,{font,size:fontSize,height:.045,curveSegments:5,bevelEnabled:true,bevelThickness:.004,bevelSize:.003,bevelSegments:2});geometry.center();geometry.computeBoundingBox();widestLetter=Math.max(widestLetter,geometry.boundingBox.max.x-geometry.boundingBox.min.x);glyphCache.set(glyph.ch,geometry)}
  const letter=new THREE.Mesh(glyphCache.get(glyph.ch),[faceMaterial.clone(),edgeMaterial.clone()]);letter.name=glyph.ch;letter.userData.angle=Math.PI/2+(nameWidth/2-glyph.center)/orbitRadius;orbit.add(letter);letters.push(letter);
 }
 // Letters stay upright. Their projected width follows the curve's spacing at its sides.
 const orbitPosition=new THREE.Vector3(),orbitTangent=new THREE.Vector3(),orbitTransform=new THREE.Matrix3();
 // Draw in an unclipped viewport layer; preserve the emblem's original art framing.
 let viewKey='',drawWidth=0,drawHeight=0;
 function alignViewport(){const r=host.getBoundingClientRect(),w=Math.max(1,r.width),height=Math.max(1,r.height),vw=innerWidth,vh=innerHeight;const key=[w,height,r.left,r.top,vw,vh].join(',');if(key===viewKey)return;viewKey=key;if(vw!==drawWidth||vh!==drawHeight){renderer.setSize(vw,vh,false);drawWidth=vw;drawHeight=vh;}const halfFrustum=w/height*Math.tan(THREE.MathUtils.degToRad(camera.fov/2));camera.position.z=Math.max(10.1,Math.hypot(orbitRadius/halfFrustum,orbitDepth)+(widestLetter*.5+.18)/halfFrustum);camera.setViewOffset(w,height,-r.left,-r.top,vw,vh)}
 function resize(){viewKey='';alignViewport()}
 addEventListener('resize',resize);
 new ResizeObserver(resize).observe(host);resize();
 let visible=true;new IntersectionObserver(es=>{visible=es[0].isIntersecting},{rootMargin:'150px'}).observe(host);
 let mx=0,my=0;host.addEventListener('pointermove',e=>{const r=host.getBoundingClientRect();mx=((e.clientX-r.left)/r.width-.5)*.24;my=((e.clientY-r.top)/r.height-.5)*.09});host.addEventListener('pointerleave',()=>{mx=0;my=0});
 let t=0,last=performance.now(),scatter=0;
 function pose(dt){
  const paused=reduced();const progress=paused?0:(window.missionHeroScroll?.progress??0);scatter=progress;if(paused)scatter=0;
  material.uniforms.uTime.value=t;material.uniforms.uScatter.value=scatter;
  const carry=paused?0:(window.missionHeroScroll?.travel??0),s=scatter*(.35+.65*scatter);
  material.uniforms.uDrop.value=2*(carry+s*innerHeight*.65)/innerHeight;
  const exitFade=THREE.MathUtils.smoothstep(window.missionHeroScroll?.exit??0,0,1);
  cross.traverse(o=>{if(o.isMesh){o.material.transparent=exitFade>0;o.material.opacity=1-exitFade}});globeHolder.rotation.y=t*.10;
  root.rotation.y+=((paused?0:mx)-root.rotation.y)*dt*3;root.rotation.x+=((paused?0:my)-root.rotation.x)*dt*3;
  root.scale.setScalar(1-scatter*.055);crossHolder.rotation.y=.06;crossHolder.position.y=0;
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
 let drawing=true;
 function frame(now){requestAnimationFrame(frame);const dt=Math.min((now-last)/1000,.05);last=now;if(document.hidden)return;if(!visible&&!window.missionHeroScroll?.active){if(drawing){renderer.clear();drawing=false}return}drawing=true;alignViewport();if(!reduced())t+=dt;pose(dt);renderer.render(scene,camera)}
 pose(1);renderer.compile(scene,camera);renderer.render(scene,camera);
 window.missionHeroReady=true;host.classList.add('loaded');canvas.classList.add('ready');window.dispatchEvent(new Event('hero-ready'));last=performance.now();requestAnimationFrame(frame);
 canvas.addEventListener('webglcontextlost',showFallback);
}
