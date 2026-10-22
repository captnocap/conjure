import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing } from '@conjure/kit';
export default defineThing({
 questions:{
  mission:choice('What task was this rover built for?',{survey:'A survey rover with cameras and sample containers.',cargo:'A cargo rover carrying strapped pressure cylinders.',crew:'A crew rover with two open seats and a roll cage.'}),
  wheels:choice('What wheels grip the regolith?',{mesh:'Wide wire-mesh wheels with external ribs.',solid:'Solid dark wheels with closely spaced treads.',cleats:'Large drum wheels with sharp transverse cleats.'}),
  mast:score('How tall is the navigation mast?', ['A low camera head','A tall panoramic instrument mast']),
  power:choice('What powers the rover?',{solar:'Two broad blue solar wings.',nuclear:'A finned thermal generator at the rear.',battery:'A compact armored battery pack.'}),
  arm:noul('Is the sample arm extended?'),
  antenna:choice('What communications antenna is fitted?',{dish:'A small upward dish.',whip:'A long flexible whip aerial.',array:'A square patch antenna.'}),
  samples:score('How many geological samples are carried?', ['Empty clean bins','A rack full of irregular specimen rocks']),
 },
 build(a,c){
  const s=new Sculpture(c), hull=s.material('#ded3ba'),metal=s.material('#737c82',{metalness:.65}),dark=s.material('#2a3036'),gold=s.material('#ad8c48',{metalness:.65}),blue=s.material('#304b79',{metalness:.5});
  s.box([1.4,.45,2.15],[0,.85,0],hull);s.box([1.2,.05,1.85],[0,1.1,0],gold);
  for(const side of [-1,1])for(let i=0;i<3;i++){const z=(i-1)*.86;s.rod([side*.55,.9,z*.6],[side*1,.48,z],.065,metal);const w=s.cylinder(.36,.36,.24,[side*1,.38,z],a.wheels==='solid'?dark:metal,20);w.rotation.z=Math.PI/2;s.rod([side*.8,.48,z],[side*1.05,.48,z],.05,metal);for(let j=0;j<12;j++){const t=j*Math.PI/6;const bar=s.box([.29,a.wheels==='cleats'?.065:.025,.075],[side*1,.38+Math.sin(t)*.36,z+Math.cos(t)*.36],dark);bar.rotation.x=-t;}}
  const mh=1.3+a.mast*1.3;s.rod([0,1.1,.65],[0,mh,.65],.055,metal);s.box([.45,.2,.24],[0,mh,.65],hull);for(const x of [-.12,.12])s.ball([.075,.075,.045],[x,mh,.8],dark);
  if(a.mission==='crew'){for(const x of [-.35,.35]){s.box([.45,.12,.6],[x,1.25,-.15],dark);s.box([.45,.5,.1],[x,1.55,-.45],dark);}for(const x of [-.65,.65])s.tube([[x,1.1,-.85],[x,2,-.65],[x,2,.25],[x,1.1,.45]],.05,metal);}
  else if(a.mission==='cargo')for(const x of [-.35,.35]){const tank=s.cylinder(.23,.23,1.25,[x,1.4,-.15],hull);tank.rotation.x=Math.PI/2;for(const z of [-.45,.3])s.box([1.1,.04,.06],[0,1.65,z],gold);}
  else{for(const x of [-.38,.38])s.box([.45,.23,.6],[x,1.25,-.4],hull);for(let i=0;i<Math.round(a.samples*9);i++)s.mesh(new THREE.DodecahedronGeometry(.08+c.random()*.04),metal,[(c.random()-.5)*.8,1.42,-.6+c.random()*.4]);}
  if(a.power==='solar')for(const side of [-1,1]){s.box([.9,.025,1.6],[side*1.2,1.22,-.1],blue);for(let i=0;i<5;i++)s.box([.88,.012,.025],[side*1.2,1.24,-.75+i*.32],metal);}
  if(a.power==='nuclear'){const rtg=s.cylinder(.25,.25,.65,[0,1.4,-1.1],gold);rtg.rotation.x=Math.PI/2;for(let i=0;i<7;i++)s.box([.8,.5,.025],[0,1.4,-1.4+i*.1],metal);}
  if(a.power==='battery')s.box([.8,.3,.5],[0,1.3,-.7],dark);
  if(a.arm){s.rod([.65,1.1,.6],[1.1,.9,1.25],.06,metal);s.rod([1.1,.9,1.25],[.7,.3,1.9],.05,metal);s.ball([.12,.12,.12],[1.1,.9,1.25],gold);for(const x of [.62,.78])s.rod([.7,.3,1.9],[x,.12,2.05],.025,dark);}
  if(a.antenna==='whip')s.rod([-.55,1.2,-.7],[-.7,2.7,-.9],.012,metal);
  if(a.antenna==='array')s.box([.45,.45,.04],[-.55,1.7,-.7],hull);
  if(a.antenna==='dish'){s.rod([-.5,1.1,-.7],[-.5,1.6,-.7],.035,metal);const d=s.mesh(new THREE.SphereGeometry(.33,20,12,0,Math.PI*2,0,.8),hull,[-.5,1.6,-.7]);d.scale.y=.45;}
  return s.finish();
 }
});
