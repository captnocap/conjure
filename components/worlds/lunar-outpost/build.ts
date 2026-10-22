import * as THREE from 'three';
import { defineWorld, diorama, choice, score, noul } from '@conjure/kit';
export default defineWorld({questions:{
 geology:choice('What regolith surrounds the lunar base?',{mare:'Dark smooth basalt plains.',highland:'Pale rough highland dust.',ice:'Grey dust mixed with blue-white ice deposits.'}),
 habitat:choice('How was the outpost built?',{modules:'Three linked cylindrical pressure modules.',domes:'Two small protected habitation domes.',containers:'Rectangular insulated research shelters.'}),
 purpose:choice('What work occupies the outpost?',{science:'A survey station with sample racks and instrument pads.',mining:'A mineral camp with bins and exposed service pipes.',settlement:'An inhabited refuge with a broad protected entrance.'}),
 landing:choice('How is the landing pad marked?',{hexagon:'A hexagonal landing pad with a dark centre.',circle:'A circular pad with radial markings.',none:'Only a cleared compacted area.'}),
 tracks:score('How many rover tracks cross the worksite?', ['One faint approach track','Many repeated wheel paths']),
 horizon:choice('What breaks the distant horizon?',{crater:'A broken crater rim.',ridge:'Low angular mountain ridges.',plain:'A low uninterrupted horizon.'}),
 earth:noul('Is the distant Earth visible above the horizon?'),
 antennas:noul('Do communication masts surround the base?'),
},build(a,c){
 const {art:s,world}=diorama(c,{background:'#9eacb9',floor:a.geology==='mare'?'#8f999c':a.geology==='ice'?'#c0c6c1':'#b8b4a7',width:22,depth:16,yaw:25,pitch:34,maxHeight:4,radius:2.15,slots:[[0,2],[-5,1],[5,1],[-6,5],[6,5],[0,6]]});
 const hull=s.material('#d5d7cb'),dark=s.material('#536571'),gold=s.material('#af9867'),rock=s.material(a.geology==='mare'?'#788588':'#a6a79c');
 for(let i=0;i<3;i++){
  const x=(i-1)*4.2,z=-5.5;
  if(a.habitat==='modules'){const tube=s.cylinder(1.15,1.15,3.2,[x,1.2,z],hull);tube.rotation.z=Math.PI/2;for(const side of [-1,1]){const hatch=s.cylinder(.7,.7,.08,[x+side*1.64,1.2,z],dark);hatch.rotation.z=Math.PI/2;}s.box([2.7,.16,2.7],[x,.1,z],dark);}
  if(a.habitat==='domes'&&i!==1){s.mesh(new THREE.SphereGeometry(1.8,24,16,0,Math.PI*2,0,Math.PI/2),hull,[x,0,z]);for(let j=0;j<6;j++){const q=j*Math.PI/3;s.rod([x+Math.sin(q)*1.8,.05,z+Math.cos(q)*1.8],[x,.0+1.8,z],.035,dark);}}
  if(a.habitat==='containers'){s.box([3.4,2.1,2.4],[x,1.05,z],hull);for(let j=0;j<9;j++)s.box([.035,2.05,.045],[x-1.5+j*.375,1.05,z+1.23],dark);s.box([1.1,1.5,.06],[x,.8,z+1.3],dark);}
  s.box([.8,.3,.05],[x,1.55,z+1.23],gold);
 }
 for(const x of [-2.1,2.1]){const tunnel=s.cylinder(.38,.38,1.1,[x,.95,-5.5],dark);tunnel.rotation.z=Math.PI/2;}
 if(a.landing!=='none'){const pad=s.cylinder(3.5,3.5,.05,[0,.025,2],dark,a.landing==='hexagon'?6:48);for(let i=0;i<6;i++){const q=i*Math.PI/3;s.rod([Math.sin(q)*2.2,.061,2+Math.cos(q)*2.2],[Math.sin(q)*3.1,.061,2+Math.cos(q)*3.1],.04,gold);}s.label('L 07',1.5,.42,[0,.065,2], '#c7c6b7','#536571').rotation.x=-Math.PI/2;void pad;}
 const paths=1+Math.round(a.tracks*4);for(let i=0;i<paths;i++)for(const side of [-1,1])s.tube([[-8+i*.6+side*.2,.045,7],[-5+i*.7+side*.2,.045,3],[-3+i*.9+side*.2,.045,-3]],.035,rock);
 const rocks=Array.from({length:45},()=>{const side=c.random()>.5?1:-1;return {at:[side*(8+c.random()*2.4),.1,-7+c.random()*14] as const,size:.15+c.random()*.45};});s.scatter(new THREE.DodecahedronGeometry(1),rock,rocks);
 if(a.horizon!=='plain')for(let i=0;i<12;i++){const x=-10+i*1.8,y=a.horizon==='ridge'?.7+c.random():.2;const p=s.mesh(new THREE.DodecahedronGeometry(1),rock,[x,y,-7.1]);p.scale.set(1.6,y+1,1);}
 if(a.earth){s.ball([1.2,1.2,1.2],[-7,6,-7.5],s.material('#759bad'),28);s.ball([.5,.15,.18],[-7.3,6.6,-6.6],s.material('#a8beb1'));s.ball([.4,.2,.13],[-6.5,5.6,-6.6],s.material('#718e75'));}
 if(a.antennas)for(const x of [-8.4,8.4]){s.rod([x,0,-4],[x,3.9,-4],.055,dark);s.rod([x-.6,3.5,-4],[x+.6,3.5,-4],.04,dark);s.box([.35,.2,.2],[x,3.8,-4],gold);}
 if(a.purpose==='mining')for(const x of [-7,7]){s.box([1.3,.55,1.2],[x,.275,-1],dark);s.cylinder(.25,.25,.8,[x,1,-1],hull);}
 if(a.purpose==='science')for(let i=0;i<5;i++)s.box([.6,.25,.5],[-2.4+i*1.2,.125,-3.7],gold);
 if(a.purpose==='settlement'){s.box([2.1,.16,1.5],[0,2,-4.2],hull);for(const x of [-.9,.9])s.rod([x,0,-3.5],[x,2,-3.5],.06,dark);}
 return world;}});
