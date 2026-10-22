import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing } from '@conjure/kit';
export default defineThing({questions:{
 radius:score('How large is the wheel?', ['A six-metre village ride','An eighteen-metre fairground wheel']),
 cabins:choice('What carries the passengers?',{open:'Open bench cages.',enclosed:'Small enclosed gondolas.',baskets:'Round suspended basket cabins.'}),
 count:score('How many cabins circle the wheel?', ['Eight widely spaced cabins','Sixteen close cabins']),
 frame:choice('What colour defines the supporting frame?',{cream:'Cream structural steel with red accents.',blue:'Blue steel with pale amber cabins.',red:'Oxide red steel with cream cabins.'}),
 lights:noul('Are the perimeter light bulbs illuminated?'),
 platform:choice('How is the boarding area arranged?',{steps:'A small raised boarding deck with two steps.',fence:'A low fenced boarding queue.',none:'A bare support base.'}),
 occupancy:score('How many cabins carry people?', ['Every cabin is empty','Most cabins carry tiny seated passengers']),
},build(a,c){
 const s=new Sculpture(c),r=3+a.radius*6,y=r+1.1,frame=s.material(a.frame==='blue'?'#6b8c9f':a.frame==='red'?'#a36a55':'#c8c3ac'),cab=s.material(a.frame==='cream'?'#b27b65':a.frame==='blue'?'#c7ac73':'#d1c8af'),dark=s.material('#536d75'),glow=s.material('#d5c893',{emissive:'#cdb579',emissiveIntensity:a.lights?.8:0}),n=8+Math.round(a.count*8);
 for(const z of [-.65,.65]){s.ring(r,.06,[0,y,z],frame);for(let i=0;i<n;i++){const q=i*Math.PI*2/n;s.rod([0,y,z],[Math.sin(q)*r,y+Math.cos(q)*r,z],.035,frame);}}
 s.rod([0,y,-1.7],[0,y,1.7],.18,dark);
 for(const z of [-1.3,1.3])for(const x of [-1,1])s.rod([x*r*.5,0,z],[0,y,z*.7],.12,frame);
 for(let i=0;i<n;i++){
  const q=i*Math.PI*2/n,x=Math.sin(q)*r,cy=y+Math.cos(q)*r-.65;
  s.rod([x,cy+.6,-.65],[x,cy+.6,.65],.04,dark);
  if(a.cabins==='baskets')s.cylinder(.4,.34,.45,[x,cy,0],cab,16);else{s.box([.65,.18,.9],[x,cy-.15,0],cab);for(const z of [-.42,.42]){s.box([.65,.35,.04],[x,cy,z],cab);for(const side of [-1,1])s.rod([x+side*.3,cy-.1,z],[x+side*.3,cy+.6,z],.025,dark);}s.box([.75,.06,1],[x,cy+.63,0],cab);if(a.cabins==='enclosed')s.box([.6,.55,.87],[x,cy+.23,0],s.material('#84a8b0'));}
  if(c.random()<a.occupancy){s.ball([.08,.1,.08],[x,cy+.25,.1],s.material('#b7a487'));s.box([.16,.23,.11],[x,cy+.06,.1],dark);}
 }
 for(let i=0;i<40;i++){const q=i*Math.PI*2/40;s.ball([.045,.045,.045],[Math.sin(q)*r,y+Math.cos(q)*r,.71],glow,8);}
 if(a.platform!=='none'){s.box([2.3,.25,2.3],[0,.125,1.4],frame);if(a.platform==='steps')for(let i=0;i<2;i++)s.box([1.6,.12,.6],[0,.06+i*.12,2.8-i*.3],cab);else for(const x of [-1.1,1.1])s.rod([x,.25,.4],[x,.8,2.5],.045,dark);}
 return s.finish();}});
