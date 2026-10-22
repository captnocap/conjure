import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing } from '@conjure/kit';
export default defineThing({questions:{
 tradition:choice('What form does the sacred entrance take?',{torii:'Two tapering vermilion posts with sweeping paired lintels.',pylon:'Broad stone pylons around a low carved lintel.',arch:'A carved stone arch between slender columns.'}),
 width:score('How wide is the threshold?', ['A narrow two-metre path','An eight-metre ceremonial passage']),
 finish:choice('How is the entrance finished?',{red:'Red lacquer with charcoal caps.',stone:'Pale carved stone with deep incisions.',gold:'Dark wood accented with golden trim.'}),
 lintel:choice('What is displayed over the opening?',{plaque:'A centred inscribed dedication plaque.',sun:'A circular sun medallion.',plain:'An uninterrupted plain lintel.'}),
 steps:noul('Do worn stone steps lead through the gate?'),
 guardians:noul('Do paired small guardian statues mark the entrance?'),
 ropes:noul('Are ceremonial cords and folded paper streamers suspended?'),
},build(a,c){
 const s=new Sculpture(c),w=2+a.width*6,h=w*.9,body=s.material(a.finish==='red'?'#a85c49':a.finish==='stone'?'#c8bfa8':'#554c3c'),dark=s.material('#39464a'),gold=s.material('#b79b5d',{metalness:.4}),stone=s.material('#b7b19f');
 s.box([w*1.55,.2,w*.65],[0,.1,0],stone);
 for(const x of [-1,1]){
  if(a.tradition==='pylon'){s.box([w*.37,h,.6],[x*w*.61,h/2,0],body);s.box([w*.45,.16,.8],[x*w*.61,h,0],gold);for(let j=0;j<4;j++)s.box([w*.23,.025,.012],[x*w*.61,h*(.25+j*.15),.307],dark);}
  else{s.cylinder(w*.045,w*.065,h,[x*w*.5,h/2,0],body);s.cylinder(w*.08,w*.08,.18,[x*w*.5,.19,0],dark);}
 }
 if(a.tradition==='arch'){const ring=s.ring(w*.5,w*.055,[0,h*.6,0],body,Math.PI);ring.rotation.z=0;s.box([w,.16,.35],[0,h*.6,0],gold);}
 else{s.box([w*1.35,.18,.4],[0,h*.75,0],body);s.tube([[-w*.78,h+.14,0],[-w*.4,h,0],[0,h-.04,0],[w*.4,h,0],[w*.78,h+.14,0]],w*.045,a.tradition==='torii'?dark:body);s.box([w*1.4,.14,.48],[0,h-.13,0],body);}
 if(a.lintel==='plaque'){s.box([w*.16,h*.22,.07],[0,h*.79,.26],gold);s.label('門',w*.13,h*.16,[0,h*.79,.302],'#37433d','#d8c7a0');}
 if(a.lintel==='sun')s.mesh(new THREE.CircleGeometry(w*.105,24),gold,[0,h*.82,.3]);
 if(a.steps)for(let i=0;i<3;i++)s.box([w*1.2,.1,w*.4-i*.12],[0,.05+i*.1,w*.45-i*.08],stone);
 if(a.ropes){s.tube([[-w*.45,h*.72,.3],[0,h*.6,.3],[w*.45,h*.72,.3]],.025,gold);for(let i=0;i<5;i++){const x=(i-2)*w*.14;s.box([.08,.23,.012],[x,h*.62,.31],s.material('#dedacb')).rotation.z=i%2?.2:-.2;}}
 if(a.guardians)for(const x of [-1,1]){s.box([w*.13,.18,w*.13],[x*w*.78,.09,w*.25],stone);s.ball([w*.07,w*.12,w*.09],[x*w*.78,.18+w*.1,w*.25],stone);s.mesh(new THREE.IcosahedronGeometry(w*.065),gold,[x*w*.78,.18+w*.24,w*.27]);}
 return s.finish();}});
