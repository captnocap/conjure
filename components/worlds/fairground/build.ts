import * as THREE from 'three';
import { defineWorld, diorama, choice, score, noul } from '@conjure/kit';
export default defineWorld({questions:{
 ground:choice('What surface holds the travelling fair?',{grass:'A muted grassy town common.',gravel:'A pale gravel exhibition lot.',boards:'A wooden temporary fair deck.'}),
 stalls:choice('What kind of stalls mark the edges?',{games:'Small game booths with hanging targets.',food:'Refreshment booths with counters and signs.',tickets:'Ticket and prize stalls with display shelves.'}),
 stripe:choice('What colours stripe the awnings?',{red:'Faded red and cream.',blue:'Pale blue and yellow.',green:'Mint green and ivory.'}),
 gate:choice('What welcomes the visitors?',{arch:'A broad simple FAIR entrance arch.',flags:'Two tall pennant poles.',none:'An unmarked open entrance.'}),
 lights:noul('Are string bulbs suspended across the fair?'),
 tents:score('How many booths have been set up?', ['Two small edge stalls','Six busy edge stalls']),
 banners:noul('Do short triangular bunting flags hang from the stalls?'),
 details:choice('What small traces remain at the edges?',{balloons:'A few tied balloons on prize counters.',crates:'Empty timber packing crates.',quiet:'Only clean booth fronts.'}),
},build(a,c){
 const {art:s,world}=diorama(c,{background:'#dedbcc',floor:a.ground==='grass'?'#abb39c':a.ground==='gravel'?'#c2bdaa':'#bba783',width:24,depth:18,yaw:26,pitch:32,maxHeight:5,radius:2.1,slots:[[0,2],[-5,1],[5,1],[-5,5],[5,5],[0,-3]]});
 const cream=s.material('#d7ceb6'),colour=s.material(a.stripe==='red'?'#b17c69':a.stripe==='blue'?'#7d9eac':'#83a899'),wood=s.material('#a78e64'),dark=s.material('#6a807f'),glow=s.material('#dfcea1',{emissive:'#d0b57f',emissiveIntensity:a.lights?.7:0});
 if(a.ground==='boards')for(let z=-8;z<9;z+=.5)s.box([23,.012,.025],[0,.015,z],wood);
 const n=2+Math.round(a.tents*4);for(let i=0;i<n;i++){
  const x=-9+i*18/Math.max(1,n-1),z=-6.3;s.box([2.6,1.25,2],[x,.625,z],colour);for(const side of [-1,1])s.rod([x+side*1.3,0,z+.8],[x+side*1.3,2.5,z+.8],.05,wood);s.box([2.8,.12,.6],[x,1.3,z+1],wood);
  for(let j=0;j<7;j++){const roof=s.box([.4,.12,2.6],[x+(j-3)*.4,2.5,z],j%2?colour:cream);roof.rotation.x=.08;}
  s.label(a.stalls==='food'?'REFRESH':a.stalls==='games'?'PLAY':'PRIZES',2,.25,[x,2.27,z+1.1]);
  if(a.stalls==='games')for(let j=0;j<3;j++)s.ring(.16,.025,[x+(j-1)*.5,1.9,z+.92],cream);
  if(a.stalls==='tickets')for(let j=0;j<4;j++)s.box([.35,.3,.2],[x+(j-1.5)*.45,1.48,z+.4],j%2?cream:dark);
  if(a.banners)for(let j=0;j<6;j++){const flag=s.mesh(new THREE.ConeGeometry(.09,.23,3),j%2?colour:cream,[x+(j-2.5)*.4,2.22,z+1.1]);flag.rotation.z=Math.PI;}
  if(a.details==='balloons')for(let j=0;j<2;j++){const bx=x+(j-.5)*.45;s.rod([bx,1.3,z+.7],[bx+.12,3.2,z+.7],.008,dark);s.ball([.19,.25,.19],[bx+.12,3.4,z+.7],j%2?colour:cream,16);}
  if(a.details==='crates')s.box([.7,.6,.65],[x+1.6,.3,z],wood);
 }
 if(a.gate!=='none')for(const x of [-1,1]){s.rod([x*8,0,6],[x*8,4.2,6],.06,wood);if(a.gate==='flags')s.box([1,.5,.018],[x*8+.5,3.9,6],colour);}
 if(a.gate==='arch'){s.box([17,.45,.25],[0,4.2,6],wood);s.label('THE FAIR',4,.4,[0,4.21,6.15]);}
 if(a.lights){for(const x of [-10,10])s.rod([x,0,-2],[x,4.4,-2],.05,dark);s.tube([[-10,4.4,-2],[0,3.5,-2],[10,4.4,-2]],.013,dark);for(let i=0;i<20;i++){const x=-9.5+i;const y=3.5+.9*(x/10)**2;s.ball([.07,.09,.07],[x,y-.14,-2],glow,10);}}
 return world;}});
