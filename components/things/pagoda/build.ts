import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing } from '@conjure/kit';
export default defineThing({questions:{
 tiers:score('How many storeys rise in the pagoda?', ['Two intimate storeys','Six towering storeys']),
 timber:choice('How is the supporting timber finished?',{red:'Vermilion pillars and dark lintels.',natural:'Warm unpainted cedar with pale plaster panels.',black:'Black timber with quiet cream infill.'}),
 roof:choice('What covers the curved roofs?',{jade:'Jade-green glazed tiles.',clay:'Muted red clay tiles.',slate:'Blue-grey slate with silver edge bands.'}),
 galleries:noul('Do open galleries wrap the upper floors?'),
 entrance:choice('What welcomes the visitor?',{steps:'A broad stone staircase and open doorway.',screen:'A patterned lattice screen over the entrance.',sealed:'A closed wooden double door.'}),
 finial:choice('What crowns the highest roof?',{rings:'A stacked-ring metal finial.',orb:'A bronze sphere and needle.',flame:'A flame-shaped gold ornament.'}),
 bells:noul('Are small wind bells hung from the eaves?'),
},build(a,c){
 const s=new Sculpture(c),n=2+Math.round(a.tiers*4),wood=s.material(a.timber==='red'?'#a55b47':a.timber==='natural'?'#ae8966':'#354348'),wall=s.material('#d9ceb5'),roof=s.material(a.roof==='jade'?'#668575':a.roof==='clay'?'#a96b54':'#647785',{metalness:.15}),gold=s.material('#b79c5a',{metalness:.6}),stone=s.material('#b4afa1');
 s.box([5.4,.35,5.4],[0,.175,0],stone);
 for(let k=0;k<n;k++){
  const w=4.5-k*.42,base=.35+k*2.1;
  s.box([w,.2,w],[0,base+.1,0],wood);
  if(k===0||!a.galleries)s.box([w*.84,1.45,w*.84],[0,base+.9,0],wall);
  for(const x of [-1,1])for(const z of [-1,1])s.box([.16,1.6,.16],[x*w*.45,base+.95,z*w*.45],wood);
  for(const z of [-1,1]){s.box([w, .18,.18],[0,base+1.7,z*w*.45],wood);if(a.galleries&&k>0){s.rod([-w*.45,base+.9,z*w*.45],[w*.45,base+.9,z*w*.45],.055,wood);for(let j=0;j<8;j++)s.rod([-w*.4+j*w*.8/7,base+.25,z*w*.45],[-w*.4+j*w*.8/7,base+.9,z*w*.45],.035,wood);}}
  // A gridded roof has a high central ridge and raised corners, rather than a flat pyramid.
  const rw=w*.68,grid=12,pos:number[]=[],idx:number[]=[];
  for(let iz=0;iz<=grid;iz++)for(let ix=0;ix<=grid;ix++){const x=(ix/grid*2-1)*rw,z=(iz/grid*2-1)*rw,q=Math.max(Math.abs(x),Math.abs(z))/rw,corner=Math.abs(x*z)/(rw*rw);pos.push(x,base+1.75+.8*(1-q)+.3*q**7*corner,z);}
  for(let iz=0;iz<grid;iz++)for(let ix=0;ix<grid;ix++){const p=iz*(grid+1)+ix;idx.push(p,p+grid+1,p+1,p+1,p+grid+1,p+grid+2);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();s.mesh(g,roof);
  for(const z of [-1,1])s.tube([[-rw,base+2.03,z*rw],[0,base+1.75,z*rw],[rw,base+2.03,z*rw]],.045,gold);
  if(a.bells)for(const x of [-1,1])for(const z of [-1,1]){s.rod([x*rw,base+2.02,z*rw],[x*rw,base+1.76,z*rw],.01,gold);s.cylinder(.03,.08,.12,[x*rw,base+1.72,z*rw],gold);}
 }
 const top=.35+(n-1)*2.1+2.55;
 s.rod([0,top-.1,0],[0,top+1.3,0],.045,gold);
 if(a.finial==='rings')for(let j=0;j<6;j++){const r=s.ring(.3-j*.035,.035,[0,top+j*.15,0],gold);r.rotation.x=Math.PI/2;}
 if(a.finial==='orb')s.ball([.25,.25,.25],[0,top+.3,0],gold);
 if(a.finial==='flame')s.mesh(new THREE.OctahedronGeometry(.32),gold,[0,top+.4,0]).scale.y=2;
 if(a.entrance==='steps'){for(let i=0;i<3;i++)s.box([1.6,.12,.8-i*.18],[0,.06+i*.12,2.75-i*.12],stone);s.box([1.2,1.4,.025],[0,1.05,1.91],s.material('#334443'));}
 else{const z=1.92;s.box([1.3,1.45,.06],[0,1.05,z],wood);if(a.entrance==='screen')for(let i=0;i<6;i++)s.box([.035,1.3,.015],[-.55+i*.22,1.05,z+.045],gold);}
 return s.finish();}});
