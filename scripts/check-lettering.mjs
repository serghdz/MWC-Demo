import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const bytes=await readFile(new URL('../public/assets/hero-assets.glb',import.meta.url));
const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
gltf.scene.updateMatrixWorld(true);
const type=JSON.parse(await readFile(new URL('../public/assets/lettering.json',import.meta.url),'utf8'));
const source=await readFile(new URL('../src/scripts/hero.js',import.meta.url),'utf8');
const construction=source.slice(source.indexOf(' const orbit=new THREE.Group()'),source.indexOf(' new ResizeObserver(resize)'));
const pose=source.slice(source.indexOf(' function pose(dt){'),source.indexOf(' let drawing=true,'));
const root=new THREE.Group(),scene=new THREE.Scene();scene.add(root);root.position.y=.15;
const camera=new THREE.PerspectiveCamera(34,1,.1,100);camera.position.set(0,.1,10.1);
const host={clientWidth:1000,clientHeight:500,getBoundingClientRect(){return {width:this.clientWidth,height:this.clientHeight,left:-this.clientWidth/22,top:80}}};
const state={innerWidth:1000,innerHeight:500,addEventListener(){},cross:new THREE.Group(),THREE,gltf,type,dirty:false,scene,root,camera,host,renderer:{setSize(){}},t:0,scatter:0,mx:0,my:0,reduced:()=>false,window:{missionHeroScroll:{progress:0}},material:{uniforms:{uTime:{value:0},uScatter:{value:0},uDrop:{value:0}}},globeHolder:new THREE.Group(),crossHolder:new THREE.Group(),globeVeil:{material:{}},ring:new THREE.Mesh()};
const context=vm.createContext(state);new vm.Script(construction+pose).runInContext(context);
const letters=new vm.Script('letters').runInContext(context);
assert.equal(new vm.Script('name').runInContext(context),'MISSION WORLD CHURCH');
assert.equal(letters.length,18);assert.equal(letters.slice(0,18).map(l=>l.name).join(''),'MISSIONWORLDCHURCH');
const step=new vm.Script('pose(1/60)'),resize=new vm.Script('resize()');
let minimumGap=Infinity,minimumStartingOpacity=1;
for(const [width,height] of [[320,400],[390,420],[700,350],[1220,520]]){
 host.clientWidth=width*1.1;host.clientHeight=height;state.innerWidth=width;state.innerHeight=height+360;resize.runInContext(context);camera.updateMatrixWorld(true);
 state.t=state.scatter=state.mx=state.my=0;state.window.missionHeroScroll.progress=0;root.rotation.set(0,0,0);step.runInContext(context);
 assert(letters.slice(0,18).every(l=>l.visible),'Startup does not show the complete name');
 assert(letters.slice(18).every(l=>!l.visible),'Rear name causes ghosting');
 minimumStartingOpacity=Math.min(minimumStartingOpacity,...letters.slice(0,18).map(l=>l.material[0].opacity));
 for(let frame=0;frame<=1000;frame++){
  state.t=frame*.09;state.mx=Math.sin(frame*.1)*.24;state.my=Math.cos(frame*.07)*.09;
  state.window.missionHeroScroll.progress=(1+Math.sin(frame*.013))*.5;
  step.runInContext(context);scene.updateMatrixWorld(true);const visible=[];
  for(const letter of letters){
   assert(letter.quaternion.angleTo(new THREE.Quaternion())<1e-7,'Letter turns instead of facing forward');
   if(!letter.visible||letter.material[0].opacity<.05)continue;
   const b=letter.geometry.boundingBox,points=[];
   for(const x of [b.min.x,b.max.x])for(const y of [b.min.y,b.max.y])for(const z of [b.min.z,b.max.z])points.push(new THREE.Vector3(x,y,z).applyMatrix4(letter.matrixWorld).project(camera));
   const left=Math.min(...points.map(p=>p.x)),right=Math.max(...points.map(p=>p.x));
   assert(left>-1&&right<1,`${letter.name} clips at ${width}px`);visible.push({left,right,letter:letter.name,position:letter.position.toArray(),scale:letter.scale.toArray(),opacity:letter.material[0].opacity});
  }
  visible.sort((a,b)=>a.left-b.left);for(let i=1;i<visible.length;i++){const gap=visible[i].left-visible[i-1].right;minimumGap=Math.min(minimumGap,gap);if(gap<=0)console.log(JSON.stringify({width,frame,gap,prev:visible[i-1],current:visible[i]}));assert(gap>0,`Letters ${visible[i-1].letter}/${visible[i].letter} overlap at frame ${frame}`)}
 }
}
assert(minimumStartingOpacity>.02,'Full name missing at startup');
console.log(`Complete curved name visible at startup; front-facing letters, no overlap or clipping throughout an orbit at 320–1220px. Minimum gap ${minimumGap.toFixed(4)}; minimum startup opacity ${minimumStartingOpacity.toFixed(2)}.`);
