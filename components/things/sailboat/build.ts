import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing } from '@conjure/kit';
export default defineThing({questions:{
 rig:choice('What sail plan carries the boat?',{sloop:'A single mast with a mainsail and triangular jib.',cutter:'A mast with a mainsail and two narrow forward jibs.',schooner:'Two masts carrying unequal triangular sails.'}),
 length:score('How long is the hull?', ['A four-metre dinghy','A fourteen-metre coastal yacht']),
 hull:choice('What finish covers the hull?',{wood:'Warm varnished wooden planks.',white:'White painted hull with a blue stripe.',dark:'Dark navy hull with cream trim.'}),
 sail:choice('What sailcloth is hoisted?',{cream:'Plain cream canvas.',striped:'Cream canvas with muted red reinforcement strips.',dark:'Blue-grey modern sailcloth.'}),
 cabin:noul('Is there a low enclosed cabin on deck?'),
 rigging:noul('Are standing rigging stays visible?'),
 equipment:choice('What sits on the aft deck?',{lifering:'A mounted life ring.',crates:'Two strapped wooden cargo boxes.',clear:'A clear deck with only a tiller.'}),
},build(a,c){
 const s=new Sculpture(c),l=4+a.length*10,b=l*.28,h=l*.09,paint=s.material(a.hull==='wood'?'#a28660':a.hull==='white'?'#dad9c9':'#48687b'),trim=s.material('#786f58'),cloth=s.material(a.sail==='dark'?'#839da8':'#dfd4b7',{side:THREE.DoubleSide}),metal=s.material('#687c85'),red=s.material('#a87361');
 const rim=[[-b*.35,-l*.48],[-b*.5,-l*.15],[-b*.5,l*.22],[0,l*.5],[b*.5,l*.22],[b*.5,-l*.15],[b*.35,-l*.48]];
 const pos:number[]=[],idx:number[]=[];for(const [x,z] of rim)pos.push(x,h,z,x*.4,0,z*.8);
 for(let i=0;i<rim.length;i++){const j=(i+1)%rim.length;idx.push(i*2,j*2,i*2+1,j*2,j*2+1,i*2+1);}
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setIndex(idx);geo.computeVertexNormals();s.mesh(geo,paint);
 const shape=new THREE.Shape(rim.map(([x,z])=>new THREE.Vector2(x,z)));const deck=s.mesh(new THREE.ShapeGeometry(shape),s.material('#b6a789',{side:THREE.DoubleSide}),[0,h-.02,0]);deck.rotation.x=Math.PI/2;
 for(const side of [-1,1])s.tube(rim.slice(0,4).map(([x,z])=>[x*side,h+.03,z] as const),.025,trim);
 const masts=a.rig==='schooner'?[-l*.22,l*.15]:[l*.1];
 for(const z of masts){const mh=l*(z<0?.6:.8);s.rod([0,h,z],[0,h+mh,z],.025*l,trim);s.rod([0,h+mh*.12,z],[0,h+mh*.12,z-l*.36],.012*l,trim);const sail=new THREE.Shape().moveTo(0,0).lineTo(-l*.37,mh*.1).lineTo(0,mh*.88).closePath();const p=s.mesh(new THREE.ShapeGeometry(sail),cloth,[0,h+mh*.12,z]);p.rotation.y=-Math.PI/2;if(a.sail==='striped')for(let j=1;j<4;j++)s.rod([.008,h+mh*j*.2,z],[.008,h+mh*j*.2,z-l*.37*(1-j*.2)],.006*l,red);if(a.rigging)for(const side of [-1,1])s.rod([side*b*.42,h,z],[0,h+mh*.85,z],.004*l,metal);}
 if(a.rig!=='schooner'){const n=a.rig==='cutter'?2:1;for(let i=0;i<n;i++){const sail=new THREE.Shape().moveTo(0,0).lineTo(l*(.35-i*.09),0).lineTo(0,l*.6-i*l*.12).closePath();const p=s.mesh(new THREE.ShapeGeometry(sail),cloth,[0,h+l*.1,l*.1+i*l*.07]);p.rotation.y=-Math.PI/2;}}
 if(a.cabin){s.box([b*.56,l*.1,l*.24],[0,h+l*.05,-l*.08],paint);for(const x of [-1,1])s.box([.012,l*.05,l*.16],[x*b*.285,h+l*.06,-l*.08],s.material('#5b8194'));}
 if(a.equipment==='lifering'){const ring=s.ring(l*.035,l*.009,[b*.3,h+l*.08,-l*.3],red);ring.rotation.y=Math.PI/2;}
 if(a.equipment==='crates')for(const x of [-1,1])s.box([b*.25,l*.07,l*.12],[x*b*.18,h+l*.035,-l*.3],trim);
 s.rod([0,h,-l*.4],[0,h+l*.08,-l*.3],.012*l,trim);
 return s.finish();}});
