import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing } from '@conjure/kit';
export default defineThing({questions:{
 arrangement:choice('How are the stellar collectors arranged?',{swarm:'Separate collectors in three inclined orbital bands.',shell:'A sparse faceted shell with gaps revealing the star.',flower:'Large petal-like collector sails around the equator.'}),
 coverage:score('How much of the star is enclosed?', ['A handful of pioneering collectors','A nearly complete harvesting array']),
 star:choice('What star lies inside?',{yellow:'A warm yellow dwarf.',red:'A deep orange ageing star.',blue:'A compact brilliant blue-white star.'}),
 collector:choice('What kind of collector captures the light?',{solar:'Dark blue solar cells with silver frames.',mirror:'Golden reflective concentrator sails.',habitat:'Cream collector stations with green living stripes.'}),
 service:noul('Is there a continuous outer service ring?'),
 beams:noul('Are thin power-transfer beams visible?'),
 gap:choice('What deliberate gap interrupts the array?',{polar:'Clear polar apertures.',sector:'One empty equatorial construction sector.',none:'No deliberate gap beyond spacing between collectors.'}),
},build(a,c){
 const s=new Sculpture(c),r=7,col=a.star==='red'?'#d9915c':a.star==='blue'?'#9ccde7':'#e3bd67',sun=s.material(col,{emissive:col,emissiveIntensity:.7}),frame=s.material('#8c9caa',{metalness:.6}),panel=s.material(a.collector==='solar'?'#355c83':a.collector==='mirror'?'#bfac6a':'#c5d0bb',{metalness:.4}),line=s.material('#91c4ba',{emissive:'#65a89a',emissiveIntensity:.5});
 s.ball([r*.37,r*.37,r*.37],[0,r+1,0],sun,32);
 const n=a.arrangement==='flower'?8:12+Math.round(a.coverage*36);
 for(let i=0;i<n;i++){
  const band=i%3,q=i/n*Math.PI*2*3,v=a.arrangement==='shell'?Math.acos(1-2*(i+.5)/n):Math.PI/2+(band-1)*.42;
  if(a.gap==='polar'&&Math.abs(Math.cos(v))>.8)continue;if(a.gap==='sector'&&q%(Math.PI*2)>.1&&q%(Math.PI*2)<.7)continue;
  const x=Math.cos(q)*Math.sin(v)*r,z=Math.sin(q)*Math.sin(v)*r,y=r+1+Math.cos(v)*r;
  const p=s.box(a.arrangement==='flower'?[r*.6,r*.025,r*.34]:[r*.25,r*.02,r*.17],[x,y,z],panel);p.lookAt(0,r+1,0);p.rotateX(Math.PI/2);
  const rim=s.box([r*.26,r*.012,r*.018],[x,y+.015,z],frame);rim.quaternion.copy(p.quaternion);
  if(a.collector==='habitat')s.ball([.15,.15,.15],[x,y+.15,z],s.material('#75916f'));
  if(a.beams&&i%5===0)s.rod([x,y,z],[x*.43,r+1+(y-r-1)*.43,z*.43],.025,line);
 }
 if(a.service){const ring=s.ring(r*1.2,.09,[0,r+1,0],frame);ring.rotation.x=Math.PI/2;for(let i=0;i<8;i++){const q=i*Math.PI/4;s.box([.55,.35,.75],[Math.cos(q)*r*1.2,r+1,Math.sin(q)*r*1.2],frame);}}
 if(a.arrangement==='swarm')for(let i=0;i<3;i++){const ring=s.ring(r,.035,[0,r+1,0],frame);ring.rotation.set(Math.PI/2+(i-1)*.4,0,i*.2);}
 return s.finish();}});
