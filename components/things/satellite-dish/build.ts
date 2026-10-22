import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing } from '@conjure/kit';
export default defineThing({questions:{
 receiver:choice('What communications hardware is fitted?',{offset:'A domestic offset dish with a projecting feed arm.',prime:'A circular dish with a central feed held on three struts.',flat:'A rectangular phased-array satellite panel.'}),
 diameter:score('How broad is the receiving surface?', ['A sixty-centimetre domestic dish','A two-metre professional receiver']),
 mounting:choice('How is it secured?',{pole:'A slender pole on a triangular ground frame.',roof:'A low ballasted rooftop bracket.',wall:'A small freestanding wall mounting panel.'}),
 direction:score('How high does it aim?', ['Near a distant horizon','High into the sky']),
 finish:choice('How is the dish finished?',{white:'Pale painted aluminium.',grey:'Weathered grey metal.',blue:'Muted blue polymer panels.'}),
 cable:noul('Does a visible feed cable run to the base?'),
 cabinet:noul('Is a small receiver enclosure mounted at the foot?'),
},build(a,c){
 const s=new Sculpture(c),r=.3+a.diameter*.7,h=a.mounting==='pole'?1.6:.7,metal=s.material('#7c8e96',{metalness:.6}),paint=s.material(a.finish==='white'?'#d5d6c8':a.finish==='grey'?'#9eacac':'#7398ae',{side:THREE.DoubleSide}),dark=s.material('#49626f');
 s.rod([0,0,0],[0,h,0],.05,metal);
 if(a.mounting==='wall')s.box([.8,1.1,.1],[0,.55,-.35],paint);else for(let i=0;i<3;i++){const q=i*Math.PI*2/3;s.rod([0,.22,0],[Math.sin(q)*r*.8,.05,Math.cos(q)*r*.8],.045,metal);if(a.mounting==='roof')s.box([.4,.1,.3],[Math.sin(q)*r*.8,.05,Math.cos(q)*r*.8],paint);}
 const group=new THREE.Group();s.root.add(group);const add=(o:THREE.Object3D)=>group.attach(o);
 if(a.receiver==='flat')add(s.box([r*1.8,.08,r*1.6],[0,0,0],paint));else{
  const profile=Array.from({length:18},(_,i)=>{const q=i/17*r;return new THREE.Vector2(q,q*q/r*.27);});add(s.mesh(new THREE.LatheGeometry(profile,32),paint));
  const rim=s.ring(r,.025,[0,r*.27,0],metal);rim.rotation.x=Math.PI/2;add(rim);
  if(a.receiver==='prime')for(let i=0;i<3;i++){const q=i*Math.PI*2/3;add(s.rod([Math.sin(q)*r,r*.27,Math.cos(q)*r],[0,r*.7,0],.018,metal));}
  else add(s.tube([[0,0,-r],[0,r*.25,-r*.9],[0,r*.65,0]],.035,metal));
  add(s.cylinder(.07,.1,.18,[0,r*.72,0],dark));
 }
 group.position.y=h;group.rotation.x=Math.PI/2-(.15+a.direction*.9);
 if(a.cable)s.tube([[0,h,0],[-.12,h*.5,-.08],[.18,.1,.35]],.012,dark);
 if(a.cabinet){s.box([.3,.45,.24],[r*.7,.225,0],paint);s.box([.15,.04,.012],[r*.7,.3,.127],dark);}
 return s.finish();}});
