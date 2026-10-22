import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing } from '@conjure/kit';
export default defineThing({
 questions:{
  origin:choice('Who constructed the gateway?',{machine:'A precision alloy ring with mechanical locking segments.',ancient:'A carved stone ring with runic keys.',organic:'A pale bone-like ring with branching support roots.'}),
  diameter:score('How wide is the passage?', ['A person-sized doorway','A gateway large enough for a vehicle']),
  state:choice('What is happening at the threshold?',{dormant:'The centre is open, dark and inactive.',opening:'A few curved filaments begin joining across the centre.',open:'A luminous concentric passage spans the ring.'}),
  destination:choice('What colour leaks from the other side?',{ice:'Cold cyan and violet light.',sun:'Amber and rose light.',forest:'Emerald green with yellow flecks.'}),
  footing:choice('What supports the portal?',{steps:'A broad three-step ceremonial platform.',skids:'Two industrial skid feet.',roots:'Four spreading root-like struts.'}),
  keys:choice('What marks the ring segments?',{runes:'Carved rune-like notches.',panels:'Rectangular control panels.',plain:'Smooth unmarked surface.'}),
  console:noul('Is there a separate activation console?'),
 },
 build(a,c){
  const s=new Sculpture(c),r=1.1+a.diameter*3.2,t=r*.12,y=r+t+.45;
  const hull=s.material(a.origin==='ancient'?'#afa48f':a.origin==='organic'?'#d5c8ac':'#6b7d89',{metalness:a.origin==='machine'?.6:.1}),dark=s.material('#34414c'),color=a.destination==='ice'?'#69bfe5':a.destination==='sun'?'#e5a364':'#72c48e',glow=s.material(color,{emissive:color,emissiveIntensity:.8});
  s.ring(r,t,[0,y,0],hull);s.ring(r-t*.8,t*.15,[0,y,t*.65],a.state==='dormant'?dark:glow);
  for(let i=0;i<12;i++){const q=i*Math.PI/6,x=Math.sin(q)*r,z=Math.cos(q)*r;const p=s.box([t*1.4,t*2.3,t*.9],[x,y+z,0],dark);p.rotation.z=-q;if(a.keys==='panels'){const k=s.box([t*.9,t*1.3,t*.14],[x,y+z,t*.57],glow);k.rotation.z=-q;}else if(a.keys==='runes')for(let j=0;j<3;j++){const k=s.box([t*.14,t*.9,t*.15],[x+(j-1)*t*.25,y+z,t*.95],dark);k.rotation.z=-q+j*.4;}}
  if(a.state==='open')for(let i=1;i<=4;i++)s.ring(r*i/5,t*.07,[0,y,.025],glow);
  if(a.state==='opening'){for(let i=0;i<3;i++){const arc=s.ring(r*(.35+i*.2),t*.06,[0,y,0],glow,Math.PI*1.15);arc.rotation.z=i*1.8;}}
  if(a.footing==='steps')for(let i=0;i<3;i++)s.box([r*2.5-i*.4,.15,r*1.15-i*.22],[0,.075+i*.15,0],hull);
  if(a.footing==='skids')for(const x of [-1,1])s.box([t*2.5,.35,r*.8],[x*r*.75,.175,0],dark);
  if(a.footing==='roots')for(const x of [-1,1])for(const z of [-1,1])s.tube([[x*r*.8,.1,z*r*.55],[x*r*.4,.3,z*r*.2],[x*r*.45,y-r*.85,0]],t*.45,hull);
  if(a.console){s.cylinder(.18,.28,.85,[r*1.5,.425,.6],dark);const p=s.box([.7,.1,.45],[r*1.5,.9,.6],hull);p.rotation.x=.35;s.box([.45,.015,.24],[r*1.5,.97,.64],glow);}
  return s.finish();
 }
});
