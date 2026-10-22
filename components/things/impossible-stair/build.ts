import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing } from '@conjure/kit';
export default defineThing({questions:{
 paradox:choice('What spatial contradiction shapes the stairs?',{loop:'Four ascending flights return above their own beginning.',ribbon:'A suspended spiral winds around an empty centre.',gravity:'Opposing flights climb under incompatible local gravities.'}),
 reach:score('How extensive is the staircase?', ['A short intimate paradox','A broad labyrinth of many steps']),
 material:choice('What is the stair structure made of?',{stone:'Pale carved stone with deep joints.',concrete:'Brutalist grey concrete.',glass:'Opaque pale cyan crystalline slabs.'}),
 railing:choice('What accompanies the edges?',{none:'No rails, only dizzy open edges.',steel:'Fine dark handrails with repetitive balusters.',solid:'Low solid parapets.'}),
 support:choice('How is the impossible stair held?',{floating:'Every flight hovers independently.',pillars:'Thin pillars support selected landings.',arches:'Curving arch supports join the lower landings.'}),
 portals:noul('Are portal seams visible at contradictory landings?'),
 landing:choice('What waits at the final landing?',{empty:'An empty square platform.',door:'A freestanding closed door.',orb:'A small floating golden sphere.'}),
},build(a,c){
 const s=new Sculpture(c),steps=6+Math.round(a.reach*7),run=.32,rise=.18,len=steps*run,body=s.material(a.material==='stone'?'#d6cbb4':a.material==='concrete'?'#9aa5a7':'#a1c9c8'),dark=s.material('#455861'),gold=s.material('#bea772',{metalness:.5}),glow=s.material('#77b2c0',{emissive:'#528ca1',emissiveIntensity:.5});
 const rail=(x:number,y:number,z:number,angle:number)=>{if(a.railing==='none')return;const dx=Math.sin(angle),dz=Math.cos(angle);s.rod([x,y,z],[x,y+.85,z],a.railing==='solid'?.13:.025,dark);s.rod([x,y+.85,z],[x+dx*.35,y+.85,z+dz*.35],a.railing==='solid'?.13:.025,dark);};
 let end:[number,number,number]=[0,0,0];
 if(a.paradox==='loop')for(let flight=0;flight<4;flight++){
  const q=flight*Math.PI/2,startX=[-len/2,-len/2,len/2,len/2][flight],startZ=[-len/2,len/2,len/2,-len/2][flight];
  for(let j=0;j<steps;j++){const x=startX+Math.sin(q)*j*.32,z=startZ+Math.cos(q)*j*.32,y=(flight*steps+j)*rise;const step=s.box([1,.16,.38],[x,y+.08,z],body);step.rotation.y=q;rail(x+Math.cos(q)*.5,y+.16,z-Math.sin(q)*.5,q);if(j===steps-1){s.box([1.15,.2,1.15],[x,y+.15,z],body);if(a.support==='pillars')s.rod([x,0,z],[x,y,z],.12,dark);end=[x,y+.25,z];}}
 }
 if(a.paradox==='ribbon')for(let j=0;j<steps*4;j++){const q=j*Math.PI*3/(steps*4),x=Math.sin(q)*len*.45,z=Math.cos(q)*len*.45,y=j*rise;const step=s.box([1,.16,.42],[x,y+.08,z],body);step.rotation.y=q;rail(x*1.25,y+.16,z*1.25,q+Math.PI/2);end=[x,y+.2,z];}
 if(a.paradox==='gravity')for(const side of [-1,1]){
  const g=new THREE.Group();s.root.add(g);for(let j=0;j<steps*2;j++){const step=s.box([1,.16,.36],[side*len*.5,j*rise+.08,(j-steps)*.32],body);g.attach(step);}g.rotation.z=side*Math.PI/3;g.position.y=len;end=[side*len*.5,len+steps*rise,steps*.32];
 }
 if(a.support==='arches')for(const side of [-1,1])s.tube([[-len*.5,.05,side*len*.5],[0,len*.5,side*len*.5],[len*.5,.05,side*len*.5]],.12,dark);
 if(a.portals){for(const y of [.35,steps*4*rise]){const ring=s.ring(.55,.055,[-len/2,y,-len/2],glow);ring.rotation.x=Math.PI/2;}}
 const [x,y,z]=end;s.box([1.15,.16,1.15],[x,y,z],body);
 if(a.landing==='door'){s.box([.8,1.7,.08],[x,y+.9,z],dark);s.box([.62,1.5,.09],[x,y+.85,z+.02],gold);}
 if(a.landing==='orb')s.ball([.24,.24,.24],[x,y+.8,z],gold);
 return s.finish();}});
