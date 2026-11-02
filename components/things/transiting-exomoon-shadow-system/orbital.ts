// Build-time source template; each component receives its own independent copy.
import * as THREE from 'three';
import { Sculpture, type BuildContext } from '@conjure/kit';
export type Point = [number, number, number];
export const TAU = Math.PI * 2;
export function orbit(s: Sculpture, points: Point[], material: THREE.Material, style: string, width = 0.012) {
  width=Math.max(0.016,width*1.8);
  const curve = new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
  if (style === 'beads') {
    s.scatter(new THREE.IcosahedronGeometry(Math.max(0.055,width * 3), 0), material, points.filter((_,i)=>i%3===0).map(at=>({at,size:1})));
  } else if (style === 'dashed') {
    for(let i=0;i<points.length-3;i+=5) s.mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.slice(i,i+4).map(p=>new THREE.Vector3(...p))),6,width,5,false),material);
  } else s.mesh(new THREE.TubeGeometry(curve,Math.min(128,points.length*2),style==='ribbon'?width*2.4:width,6,false),material);
}
export function ringPoints(r:number,y=0,tilt=0):Point[] { return Array.from({length:97},(_,i)=>{const t=i/96*TAU;return [Math.cos(t)*r,y+Math.sin(t)*r*Math.sin(tilt),Math.sin(t)*r*Math.cos(tilt)] as Point;}); }
export function body(s:Sculpture,at:Point,r:number,material:THREE.MeshStandardMaterial,style:string) {
  const group=new THREE.Group();
  const ball=s.mesh(style==='faceted'?new THREE.IcosahedronGeometry(r,1):new THREE.SphereGeometry(r,18,12),material);
  group.add(ball);
  if(style==='shell') { ball.material=material.clone(); (ball.material as THREE.MeshStandardMaterial).wireframe=true; }
  if(style==='banded') for(let j=-1;j<=1;j++){const ring=s.ring(r*Math.sqrt(1-(j*0.45)**2),r*0.025,[0,j*r*0.45,0],s.material('#b7a47c'));ring.rotation.x=Math.PI/2;group.add(ring);}
  if(style==='cratered') for(let j=0;j<7;j++){const t=j/7*TAU;const ring=s.ring(r*0.14,r*0.025,[Math.cos(t)*r*0.66,r*0.73,Math.sin(t)*r*0.66],s.material('#72694e'));ring.rotation.x=Math.PI/2;group.add(ring);}
  group.position.set(...at);s.root.add(group);return group;
}
export function references(s:Sculpture,r:number,frame:string,markers:string,metal:THREE.MeshStandardMaterial) {
  if(frame==='equator'||frame==='cage') orbit(s,ringPoints(r),metal,'dashed',0.007);
  if(frame==='axes'||frame==='cage') for(let axis=0;axis<3;axis++){const a:Point=[0,0,0],b:Point=[0,0,0];a[axis]=-r;b[axis]=r;s.rod(a,b,0.006,metal);}
  if(frame==='cage') for(const t of [0,Math.PI/2])orbit(s,ringPoints(r,0,t),metal,'dashed',0.005);
  for(let i=0;i<8;i++){const t=i/8*TAU,x=Math.cos(t)*r,z=Math.sin(t)*r;
    if(markers==='dots')s.ball([0.025,0.025,0.025],[x,0,z],metal,8);
    if(markers==='notches')s.rod([x*0.96,0,z*0.96],[x*1.04,0,z*1.04],0.007,metal);
    if(markers==='arrows') {s.rod([x,0,z],[x-Math.sin(t)*0.12,0,z+Math.cos(t)*0.12],0.012,metal,0.001);}
    if(markers==='compass'&&i%2===0){s.rod([x,0,z],[x*1.12,0,z*1.12],0.009,metal);s.ball([0.025,0.025,0.025],[x*1.12,0,z*1.12],metal,8);}
  }
}
export function materials(s:Sculpture,context:BuildContext){return {star:s.material('#d9ad62',{emissive:'#b9873d',emissiveIntensity:0.3+context.mood.cheer*0.35}),planet:s.material('#6a8588'),moon:s.material('#a3977e'),trace:s.material('#263f48'),fine:s.material('#35545b'),dark:s.material('#4d514e')};}
export function rotateToPlane(s:Sculpture,start:number,angle:number){ const group=new THREE.Group(); for(const child of s.root.children.slice(start))group.add(child); group.rotation.x=angle;group.rotation.y=-0.4;s.root.add(group);return group; }
