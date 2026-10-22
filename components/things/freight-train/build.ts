import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing } from '@conjure/kit';
export default defineThing({questions:{
 engine:choice('What locomotive leads the train?',{diesel:'A broad diesel locomotive with a raised cab.',steam:'A steam engine with boiler, chimney and tender.',electric:'An electric locomotive with roof pantographs.'}),
 wagons:score('How many freight wagons trail behind?', ['One isolated wagon','Four coupled wagons']),
 cargo:choice('What sort of freight is being carried?',{box:'Closed ribbed boxcars.',tank:'Cylindrical liquid tank wagons.',bulk:'Open wagons full of dark mineral cargo.'}),
 livery:choice('What identifies the railway?',{oxide:'Oxide red and cream.',blue:'Slate blue with pale grey trim.',industrial:'Utility yellow and charcoal.'}),
 load:score('How heavily are the wagons loaded?', ['Mostly empty loads','Full mineral loads or sealed tanks']),
 headlamp:noul('Is the leading headlamp illuminated?'),
 rails:noul('Does a short section of track run under the train?'),
},build(a,c){
 const s=new Sculpture(c),n=1+Math.round(a.wagons*3),body=s.material(a.livery==='oxide'?'#a96752':a.livery==='blue'?'#617c91':'#b7a05f'),steel=s.material('#667b85',{metalness:.5}),dark=s.material('#354952'),cream=s.material('#d1c8af');
 const wheelset=(z:number)=>{for(const side of [-1,1])for(const q of [-1,1]){const wheel=s.cylinder(.36,.36,.22,[side*1.23,.4,z+q*.5],dark,16);wheel.rotation.z=Math.PI/2;s.box([.22,.25,1.5],[side*1.05,.56,z],steel);}};
 wheelset(-2.2);wheelset(2.2);s.box([2.5,.4,7],[0,.85,0],steel);
 if(a.engine==='steam'){const boiler=s.cylinder(.8,.8,4.5,[0,1.95,.6],dark);boiler.rotation.x=Math.PI/2;s.box([2.4,2.2,1.9],[0,1.9,-2.3],body);s.cylinder(.3,.4,1,[0,3.05,1.6],dark);s.box([1.5,.7,.06],[0,2.6,-3.29],cream);for(let i=0;i<4;i++)s.ring(.805,.035,[0,1.95,-1.3+i*1.1],steel);}
 else{s.box([2.45,1.8,5.9],[0,1.95,-.2],body);s.box([2.5,1,2],[0,3,1.9],body);s.box([2.1,.62,.04],[0,3.1,2.92],dark);for(let i=0;i<7;i++)s.box([.02,.8,.2],[1.24,2,-2+i*.45],dark);if(a.engine==='electric')for(const z of [-1.5,1.5]){s.rod([-.65,2.9,z],[0,4,z],.045,steel);s.rod([.65,2.9,z],[0,4,z],.045,steel);s.rod([-.8,4,z],[.8,4,z],.04,steel);}}
 s.box([2.4,.18,.7],[0,.78,3.6],dark);s.ball([.15,.15,.06],[0,2.4,3.13],a.headlamp?s.material('#dfd199',{emissive:'#cfb977',emissiveIntensity:.8}):dark);
 for(let i=0;i<n;i++){
  const z=-8.3-i*8.2;s.box([2.5,.35,7],[0,.82,z],steel);wheelset(z-2.2);wheelset(z+2.2);s.rod([0,.7,z+3.5],[0,.7,z+4.6],.09,dark);
  if(a.cargo==='box'){s.box([2.4,2.4,6.9],[0,2.18,z],body);for(let j=0;j<16;j++)for(const side of [-1,1])s.box([.035,2.3,.06],[side*1.22,2.18,z-3.2+j*.42],steel);for(const side of [-1,1])s.box([.04,1.85,2],[side*1.25,2.1,z],cream);}
  if(a.cargo==='tank'){const tank=s.cylinder(1.02,1.02,6.3,[0,2.02,z],cream);tank.rotation.x=Math.PI/2;for(const q of [-1.8,1.8])s.ring(1.04,.055,[0,2.02,z+q],steel);s.cylinder(.22,.22,.23,[0,3.14,z],steel);}
  if(a.cargo==='bulk'){for(const side of [-1,1])s.box([.15,1.15,7],[side*1.18,1.6,z],body);for(const q of [-1,1])s.box([2.4,1.15,.15],[0,1.6,z+q*3.4],body);const pts=Array.from({length:Math.round(a.load*40)},()=>({at:[(c.random()-.5)*1.9,1.12+c.random()*.9,z+(c.random()-.5)*6.3] as const,size:.16+c.random()*.15}));s.scatter(new THREE.DodecahedronGeometry(1),dark,pts);}
 }
 if(a.rails){const end=-8.3-(n-1)*8.2;for(const x of [-.78,.78])s.rod([x,.07,end-4],[x,.07,4.3],.04,steel);for(let z=end-4;z<4.3;z+=.6)s.box([2.6,.08,.16],[0,.02,z],dark);}
 return s.finish();}});
