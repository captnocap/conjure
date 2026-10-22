import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing } from '@conjure/kit';
export default defineThing({
 questions:{
  scale:score('How large is the listening dish?', ['A small research dish','An immense survey dish']),
  surface:choice('How is the reflector constructed?',{solid:'A solid white reflector divided into panels.',mesh:'A skeletal reflector of radial ribs and concentric rings.',segmented:'A dish of silver segmented reflector panels.'}),
  tilt:score('Where does the dish listen?', ['Toward the horizon','Near the zenith']),
  support:choice('What supports the dish?',{tower:'A tall steel lattice tower.',cradle:'A squat concrete azimuth pedestal.',mobile:'A wide mobile skid with stabilizer feet.'}),
  receivers:choice('What receiver is suspended at the focus?',{horn:'A single cylindrical feed horn.',array:'Three compact receiver horns.',pod:'A sealed instrument pod with a luminous face.'}),
  walkway:noul('Does a grated inspection walkway circle the pedestal?'),
  control:noul('Is a weatherproof control cabinet attached?'),
 },
 build(a,c){
  const s=new Sculpture(c),r=2.5+a.scale*6,h=a.support==='tower'?r*1.2:r*.65;
  const metal=s.material('#bfcbd1',{metalness:.5}), frame=s.material('#50616d',{metalness:.55}), concrete=s.material('#aca99e');
  if(a.support==='tower'){for(const x of [-1,1])for(const z of [-1,1]){s.rod([x*r*.45,0,z*r*.45],[x*r*.18,h,z*r*.18],.09,frame);s.rod([x*r*.45,.2,z*r*.45],[-x*r*.18,h,z*r*.18],.04,frame);}}
  else{s.cylinder(r*.26,r*.4,h,[0,h/2,0],a.support==='cradle'?concrete:frame);if(a.support==='mobile')for(const x of [-1,1])for(const z of [-1,1])s.rod([0,.2,0],[x*r*.6,.2,z*r*.6],.16,frame);}
  const dishGroup=new THREE.Group();s.root.add(dishGroup);
  const add=(mesh:THREE.Object3D)=>{dishGroup.attach(mesh);};
  const depth=r*.35;
  if(a.surface!=='mesh'){const geo=new THREE.LatheGeometry(Array.from({length:20},(_,i)=>{const q=i/19*r;return new THREE.Vector2(q,q*q/(r*r)*depth);}),48);add(s.mesh(geo,s.material(a.surface==='solid'?'#d6dcd7':'#a9b7c0',{metalness:.4,side:THREE.DoubleSide})));}
  for(let i=0;i<16;i++){const t=i*Math.PI/8, pts=Array.from({length:8},(_,j)=>{const q=j/7*r;return [Math.cos(t)*q,q*q/(r*r)*depth,Math.sin(t)*q] as const;});add(s.tube(pts,.035,frame));}
  for(let i=1;i<=4;i++){const q=r*i/4;const ring=s.ring(q,.035,[0,q*q/(r*r)*depth,0],frame);ring.rotation.x=Math.PI/2;add(ring);}
  for(let i=0;i<3;i++){const t=i*Math.PI*2/3;add(s.rod([Math.cos(t)*r,depth,Math.sin(t)*r],[0,r*.7,0],.04,frame));}
  const n=a.receivers==='array'?3:1;for(let i=0;i<n;i++)add(s.cylinder(.1,.17,.45,[(i-(n-1)/2)*.25,r*.72,0],a.receivers==='pod'?s.material('#5db5cd',{emissive:'#397184',emissiveIntensity:.6}):metal));
  // Telescope local bowl axis starts vertical; the cradle inclines it toward +z.
  dishGroup.position.y=0;dishGroup.rotation.x=(1-a.tilt)*.9;dishGroup.position.y=h;
  s.rod([-r*.35,h,0],[r*.35,h,0],.16,frame);
  if(a.walkway){const ring=s.ring(r*.6,.1,[0,.25,0],metal);ring.rotation.x=Math.PI/2;for(let i=0;i<12;i++){const t=i*Math.PI/6;s.rod([Math.cos(t)*r*.6,.25,Math.sin(t)*r*.6],[Math.cos(t)*r*.6,1.1,Math.sin(t)*r*.6],.025,frame);}}
  if(a.control){s.box([.65,1.1,.55],[r*.55,.55,.4],metal);s.label('RX / 1420',.55,.18,[r*.55,.8,.681]);}
  return s.finish();
 }
});
