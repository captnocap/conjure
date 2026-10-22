import * as THREE from 'three';
import { defineWorld, diorama, choice, score, noul } from '@conjure/kit';
export default defineWorld({questions:{
 surface:choice('What is the roof surface?',{concrete:'Weathered grey concrete with expansion seams.',tiles:'Terracotta utility tiles.',metal:'Ribbed industrial metal decking.'}),
 skyline:choice('What city rises beyond the roof?',{dense:'A dense group of medium towers.',needle:'Two tall slender communication towers.',low:'Low varied apartment blocks.'}),
 sign:choice('What local neon sign faces the roof?',{hotel:'A HOTEL sign above a small stairwell housing.',diner:'An ALL NIGHT sign over a low service wall.',abstract:'A circular geometric light emblem.',none:'No sign, only silent utility structures.'}),
 colour:choice('What neon palette identifies this place?',{cyan:'Cool cyan and pale amber.',rose:'Rose and violet.',green:'Green and subdued orange.'}),
 access:choice('How is the rooftop reached?',{door:'A stairwell door inside a small roof hut.',hatch:'A low hinged maintenance hatch.',ladder:'An exterior ladder peeking over the rear parapet.'}),
 utilities:score('How much utility equipment occupies the edges?', ['One ventilation housing','A busy line of ducts and tanks']),
 cables:noul('Are suspended utility cables stretched above the roof?'),
 planters:noul('Have residents added small planters along the parapet?'),
},build(a,c){
 const {art:s,world}=diorama(c,{background:'#aeb9c8',floor:a.surface==='tiles'?'#aa8670':a.surface==='metal'?'#8c9fa8':'#aab1ae',width:20,depth:16,yaw:24,pitch:30,maxHeight:3.8,radius:1.8,slots:[[0,2],[-4,0],[4,0],[-5,4.5],[5,4.5],[0,-2]]});
 const grey=s.material('#627a86'),wall=s.material('#9baaa6'),dark=s.material('#3d5665'),col=a.colour==='cyan'?'#77c4cd':a.colour==='rose'?'#c28cb1':'#82b8a0',glow=s.material(col,{emissive:col,emissiveIntensity:.9}),orange=s.material('#c6a26f',{emissive:'#b59459',emissiveIntensity:.4});
 for(const x of [-9.7,9.7])s.box([.35,.7,16],[x,.35,0],wall);s.box([20,.7,.35],[0,.35,-7.7],wall);s.box([20,.22,.32],[0,.11,7.8],wall);
 if(a.surface==='metal')for(let z=-7;z<=7;z+=.35)s.box([19,.025,.035],[0,.015,z],grey);else for(let x=-8;x<=8;x+=2)s.box([.025,.012,15],[x,.01,0],grey);
 const n=a.skyline==='needle'?2:a.skyline==='dense'?9:6;
 for(let i=0;i<n;i++){
  const x=-8+(i+.5)*16/n,h=a.skyline==='needle'?7+(i%2)*2:a.skyline==='dense'?2.5+c.random()*3.5:1.8+c.random()*2,ww=a.skyline==='needle'?1.2:1.6;
  s.box([ww,h,1.4],[x,h/2-1,-9],dark);s.box([ww*1.1,.2,1.6],[x,h-1,-9],grey);
  const points=Array.from({length:Math.floor(h)*4},(_,j)=>({at:[x+(j%2?-.36:.36),-.2+Math.floor(j/2)*.45,-8.28] as const,size:.1}));s.scatter(new THREE.BoxGeometry(1,.8,.08),orange,points);
  if(a.skyline==='needle')s.rod([x,h-1,-9],[x,h+1,-9],.035,grey);
 }
 if(a.access==='door'){s.box([3,2.5,2.3],[-6,1.25,-5.7],wall);s.box([3.2,.15,2.5],[-6,2.6,-5.7],grey);s.box([1.1,1.9,.07],[-6,1,-4.5],dark);s.box([.35,.04,.035],[-5.7,.85,-4.44],grey);}
 if(a.access==='hatch'){const hatch=s.box([1.8,.12,1.5],[-6,.15,-5.7],grey);hatch.rotation.x=-.12;s.rod([-6.6,.2,-5.2],[-5.4,.2,-5.2],.035,dark);}
 if(a.access==='ladder'){for(const x of [-6.25,-5.75])s.rod([x,-2,-7.5],[x,1.4,-7.5],.04,dark);for(let j=0;j<12;j++)s.rod([-6.25,-2+j*.28,-7.5],[-5.75,-2+j*.28,-7.5],.025,dark);}
 if(a.sign!=='none'){
  if(a.sign==='abstract'){s.ring(.75,.045,[-6,3.6,-5.6],glow);s.rod([-6.4,3.15,-5.58],[-5.6,4.05,-5.58],.04,glow);}
  else{s.box([3.8,.95,.14],[-6,3.3,-5.6],dark);s.label(a.sign==='hotel'?'HOTEL':'ALL NIGHT',3.5,.7,[-6,3.3,-5.51],col,'#3d5665');for(const x of [-7.4,-4.6])s.rod([x,2.5,-5.6],[x,3.8,-5.6],.035,grey);}
 }
 for(let i=0;i<1+Math.round(a.utilities*4);i++){const x=3.5+i*1.1;s.box([.8,.75,1.4],[x,.375,-5.8],grey);s.cylinder(.26,.26,.25,[x,.88,-5.8],dark);for(let j=0;j<5;j++)s.box([.65,.025,.01],[x,.2+j*.09,-5.08],dark);}
 if(a.cables){for(const x of [-8,8])s.rod([x,0,-3.8],[x,4.6,-3.8],.04,grey);for(let j=0;j<3;j++)s.tube([[-8,4.2-j*.15,-3.8],[0,3.3-j*.15,-4.5],[8,4.2-j*.15,-3.8]],.012,dark);}
 if(a.planters)for(const x of [-8,8])for(const z of [-1,2,5]){s.box([.65,.45,.85],[x,.225,z],grey);s.scatter(new THREE.ConeGeometry(.14,.65,6),s.material('#6c8e78'),Array.from({length:5},()=>({at:[x+(c.random()-.5)*.4,.65,z+(c.random()-.5)*.6] as const,size:.65+c.random()*.35})));}
 return world;}});
