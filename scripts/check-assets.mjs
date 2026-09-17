import {readFile,stat} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
const base=new URL('../',import.meta.url),asset=new URL('public/assets/',base);
const bytes=await readFile(new URL('hero-assets.glb',asset));
const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
gltf.scene.updateMatrixWorld(true);
const meshes=[];gltf.scene.traverse(o=>{if(o.isMesh){meshes.push(o);for(const value of o.geometry.attributes.position.array)assert(Number.isFinite(value))}});
assert.equal(meshes.length,20);assert.equal(meshes.filter(o=>o.name.startsWith('Cross_')).length,7);
const ring=gltf.scene.getObjectByName('MetalRing'),pos=ring.geometry.attributes.position,normal=ring.geometry.attributes.normal;
let planar=0,rmin=Infinity,rmax=0,depth=0;
for(let i=0;i<pos.count;i++){
 const p=new THREE.Vector3().fromBufferAttribute(pos,i).applyMatrix4(ring.matrixWorld);
 rmin=Math.min(rmin,Math.hypot(p.x,p.y));rmax=Math.max(rmax,Math.hypot(p.x,p.y));depth=Math.max(depth,Math.abs(p.z));
 if(Math.abs(normal.getZ(i))>.999)planar++;
}
assert(rmin>2.17&&rmin<2.20);assert(rmax>2.34&&rmax<2.36);assert(Math.abs(depth-.122)<.001);assert(planar>100,'Ring lost its planar faces');
const cross=new THREE.Box3();meshes.filter(o=>o.name.startsWith('Cross_')).forEach(o=>cross.union(new THREE.Box3().setFromObject(o)));
assert(Math.abs(cross.getSize(new THREE.Vector3()).y-3.95)<.001);assert(cross.getCenter(new THREE.Vector3()).length()<.001);
const binary=await readFile(new URL('globe.bin',asset));assert.equal(binary.toString('ascii',0,4),'MWC1');
const count=binary.readUInt32LE(4);assert.equal(binary.length,8+count*32);let blue=0,green=0;
for(let i=0;i<count;i++){
 const row=Array.from({length:8},(_,j)=>binary.readFloatLE(8+i*32+j*4));assert(row.every(Number.isFinite));assert(Math.abs(Math.hypot(...row.slice(0,3))-2.12)<.001);
 if(row[6]>2){if(row[4]>row[5])green++;else blue++}
}
assert(blue>500&&green>500,'World must contain noticeable blue and green land particles');
const html=await readFile(new URL('dist/index.html',base),'utf8');
const refs=[...html.matchAll(/(?:src|href)="([^"#]+)"/g)].map(m=>m[1]).filter(v=>v.startsWith('/'));
const publicBase=(process.argv[2]??'/').replace(/\/?$/, '/');
let jsBytes=0,jsGzip=0;
for(const ref of refs){assert(ref.startsWith(publicBase),`Asset missing base path: ${ref}`);const file=new URL('dist/'+ref.split('?')[0].slice(publicBase.length),base);await stat(file);if(ref.endsWith('.js')){const data=await readFile(file);jsBytes+=data.length;jsGzip+=gzipSync(data).length}}
assert(!html.includes('type="importmap"'));assert(html.includes('Mission World Church'));assert(html.includes('aria-pressed'));
console.log(JSON.stringify({meshes:meshes.length,globePoints:count,blueLand:blue,greenLand:green,ringPlanarVertices:planar,ringDepth:depth*2,heroMeshKB:Math.round(bytes.length/1024),particleKB:Math.round(binary.length/1024),javascriptKB:Math.round(jsBytes/1024),javascriptGzipKB:Math.round(jsGzip/1024),localBuildReferences:refs.length},null,2));
