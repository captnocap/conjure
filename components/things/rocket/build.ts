import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing } from '@conjure/kit';
export default defineThing({
 questions:{
  form:choice('What launch vehicle is this?',{capsule:'A slender multi-stage rocket with a crew capsule.',freighter:'A heavy freight rocket with side boosters.',retro:'A broad retro rocket with swept landing fins.'}),
  height:score('How tall is the vehicle?', ['A twelve-metre research rocket','A seventy-metre orbital launcher']),
  livery:choice('How is the hull painted?',{white:'White thermal insulation with charcoal interstage bands.',silver:'Bare silver hull with black heat shielding.',rescue:'Orange rescue hull with cream bands.'}),
  payload:choice('What tops the rocket?',{nose:'A pointed satellite fairing.',crew:'A rounded crew capsule with tiny windows.',antenna:'An exposed scientific probe cage.'}),
  engines:choice('How are the engine bells clustered?',{single:'One enormous central engine.',triple:'Three medium engines.',cluster:'Seven closely packed small engines.'}),
  gantry:noul('Is a detached service umbilical attached?'),
  markings:choice('What identification does the rocket carry?',{science:'A research designation and measurement stripes.',colony:'A colony mission number and circular emblem.',anonymous:'An unmarked vehicle with only caution bands.'}),
 },
 build(a,c){
  const s=new Sculpture(c),h=12+a.height*58,r=h*(a.form==='retro'?.105:.045),hull=s.material(a.livery==='silver'?'#b5c1c9':a.livery==='rescue'?'#bd7444':'#dddcd3',{metalness:a.livery==='silver'?.65:.12}),dark=s.material('#344047'),steel=s.material('#707c83',{metalness:.7});
  s.cylinder(r,r,h*.75,[0,h*.45,0],hull,32);
  for(const y of [.12,.33,.6,.78])s.cylinder(r*1.015,r*1.015,h*.012,[0,h*y,0],dark,32);
  if(a.payload==='nose')s.cylinder(0,r,h*.22,[0,h*.93,0],hull);
  if(a.payload==='crew'){s.cylinder(r*.35,r,h*.15,[0,h*.875,0],hull);s.ball([r*.35,r*.25,r*.35],[0,h*.95,0],hull);for(const x of [-.45,.45])s.box([r*.32,h*.013,r*.03],[x*r,h*.875,r*.75],dark);}
  if(a.payload==='antenna'){for(const x of [-1,1])for(const z of [-1,1])s.rod([x*r*.75,h*.8,z*r*.75],[x*r*.6,h*.96,z*r*.6],r*.04,steel);s.ball([r*.5,r*.5,r*.5],[0,h*.9,0],steel);s.rod([0,h*.94,0],[0,h*1.08,0],r*.02,dark);}
  const n=a.engines==='single'?1:a.engines==='triple'?3:7;
  for(let i=0;i<n;i++){const t=i*Math.PI*2/Math.max(1,n-1),q=n===1||i===n-1?0:r*.6;s.lathe([[r*.15,0],[r*.22,h*.025],[r*.14,h*.06],[r*.08,h*.09]],steel,[Math.cos(t)*q,0,Math.sin(t)*q]);}
  const finGeo=new THREE.ExtrudeGeometry(new THREE.Shape().moveTo(0,0).lineTo(r*1.3,0).lineTo(r*.9,h*.12).lineTo(0,h*.25).closePath(),{depth:r*.08,bevelEnabled:false});
  for(let i=0;i<4;i++){const f=s.mesh(finGeo,dark,[0,h*.04,0]);f.rotation.y=i*Math.PI/2;}
  if(a.form==='freighter')for(const side of [-1,1]){s.cylinder(r*.6,r*.6,h*.55,[side*r*1.75,h*.31,0],hull);s.cylinder(0,r*.6,h*.13,[side*r*1.75,h*.65,0],hull);s.cylinder(r*.35,r*.5,h*.05,[side*r*1.75,h*.015,0],steel);for(const y of [.2,.45])s.rod([0,h*y,0],[side*r*1.75,h*y,0],r*.15,dark);}
  if(a.gantry){s.rod([r,h*.6,0],[r*2,h*.6,0],r*.09,steel);for(let i=0;i<4;i++)s.box([r*.18,r*.18,r*.18],[r*(1.2+i*.2),h*.6,0],steel);}
  if(a.markings!=='anonymous')s.label(a.markings==='science'?'ORBIT / 03':'ARK 07',r*1.25,h*.06,[0,h*.5,r*1.016],'#263d4b','#dad8cd');
  return s.finish();
 }
});
