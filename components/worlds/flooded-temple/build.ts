import * as THREE from 'three';
import { defineWorld, diorama, choice, score, noul } from '@conjure/kit';
export default defineWorld({questions:{
 architecture:choice('What sanctuary has the water entered?',{colonnade:'An open classical colonnade with a lintelled rear threshold.',hall:'A rectangular stone hall with surviving rear roof beams.',shrine:'A stepped sanctuary with a carved central doorway.'}),
 water:choice('How does the floodwater appear?',{clear:'Pale clear green water.',dark:'Deep blue-grey opaque water.',lilies:'Still green water with floating lily leaves.'}),
 depth:score('How close has water risen to the causeway?', ['Well below the walkway edge','Nearly level with the walkway']),
 columns:choice('How much of the colonnade survives?',{intact:'Tall columns with complete capitals.',broken:'Several columns are broken low.',uneven:'A mixture of intact and leaning fragmentary columns.'}),
 causeway:choice('What path remains above the flood?',{cross:'A broad cross-shaped stone causeway.',islands:'Connected square stone platforms.',central:'One wide central axial walkway.'}),
 offerings:noul('Are old offering vessels still on the stone?'),
 carvings:choice('What remains on the rear lintel?',{sun:'An inset sun disk.',runes:'A row of deeply cut geometric signs.',plain:'A simple unadorned lintel.'}),
 roots:noul('Have hanging roots reached the water?'),
},build(a,c){
 const {art:s,world}=diorama(c,{background:'#cad6cc',floor:null,width:20,depth:15,yaw:26,pitch:32,maxHeight:3.5,radius:1.55,slots:[[0,2],[0,-1],[-3,0],[3,0],[-3,4],[3,4]]});
 const stone=s.material('#b8b3a0'),dark=s.material('#667e78'),water=s.material(a.water==='dark'?'#698795':'#90afa3',{roughness:.3,metalness:.2}),gold=s.material('#b8a879'),wy=-.4+a.depth*.25;
 const ground=s.box([20,.2,15],[0,wy-.1,0],water);world.ground=ground;
 s.box([4,.4,12.5],[0,-.2,0],stone);
 if(a.causeway!=='central'){s.box([10,.4,3.8],[0,-.2,.5],stone);if(a.causeway==='islands')for(const x of [-3,3])for(const z of [0,4])s.box([3.7,.35,3.4],[x,-.175,z],stone);else s.box([10,.4,3.5],[0,-.2,4],stone);}
 for(const x of [-6.8,6.8])for(let j=0;j<4;j++){
  const z=-4.8+j*3,h=a.columns==='intact'?5.2:a.columns==='broken'?1.2+(j%2)*2.7:2+c.random()*3.2;
  s.cylinder(.68,.75,.25,[x,.125,z],stone);const col=s.cylinder(.4,.5,h,[x,h/2+.25,z],stone,20);if(a.columns==='uneven'&&j===2)col.rotation.z=x>0?.12:-.12;
  for(let k=0;k<8;k++){const q=k*Math.PI/4;s.rod([x+Math.sin(q)*.435,.45,z+Math.cos(q)*.435],[x+Math.sin(q)*.37,h,z+Math.cos(q)*.37],.025,dark);}
  if(h>4)s.box([1.5,.28,1.5],[x,h+.39,z],stone);else s.mesh(new THREE.DodecahedronGeometry(.55),stone,[x-.8,.1,z+.6]);
 }
 for(const x of [-2.1,2.1])s.box([1.1,5.2,1.2],[x,2.6,-5.6],stone);s.box([5.8,.65,1.5],[0,5.25,-5.6],stone);s.box([3,3.8,.12],[0,1.9,-6.15],dark);
 if(a.architecture==='hall'){for(const x of [-6.8,6.8])s.box([.7,.4,12],[x,5.6,-.4],stone);s.box([14,.35,3],[0,5.6,-5.3],stone);}
 if(a.architecture==='shrine')for(let i=0;i<3;i++)s.box([6-i*.5,.14,2-i*.35],[0,.07+i*.14,-4.6+i*.16],stone);
 if(a.carvings==='sun')s.mesh(new THREE.CircleGeometry(.45,24),gold,[0,5.2,-4.82]);
 if(a.carvings==='runes')for(let i=0;i<7;i++){const g=s.mesh(new THREE.ConeGeometry(.12,.3,3),dark,[(i-3)*.5,5.2,-4.82]);g.rotation.x=Math.PI/2;}
 if(a.offerings)for(const x of [-1,1])s.lathe([[.2,0],[.35,.35],[.25,.6],[.3,.67]],gold,[x*2.4,0,-3.9]);
 if(a.water==='lilies')for(let i=0;i<30;i++){const x=(c.random()>.5?1:-1)*(5+c.random()*4),z=-6+c.random()*12;const leaf=s.cylinder(.18,.18,.018,[x,wy+.01,z],s.material('#6f9580'),12);leaf.scale.x=1.4;}
 if(a.roots)for(let i=0;i<9;i++){const x=-6+i*1.5;s.tube([[x,5.3,-5.6],[x+.25,3,-5.1],[x-.1,wy,-5.3]],.03,s.material('#71856c'));}
 return world;}});
