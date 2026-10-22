import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing } from '@conjure/kit';
export default defineThing({questions:{
 style:choice('What architecture holds the clock?',{brick:'A red-brick municipal tower with pale trim.',stone:'A pale stone gothic tower with corner buttresses.',iron:'An open iron clock tower with a narrow bell chamber.'}),
 height:score('How tall is the civic landmark?', ['A small six-metre tower','A monumental twenty-four-metre tower']),
 hour:score('Where does the hour hand rest?', ['Near twelve','Nearly a full revolution after twelve']),
 minute:score('Where does the minute hand rest?', ['At the top of the dial','Nearly a full revolution after the top']),
 face:choice('What marks the clock face?',{roman:'Twelve thick hour marks on a cream face.',minimal:'Four long marks on a clean silver dial.',astral:'A blue dial with an outer constellation ring.'}),
 roof:choice('How is the clock tower crowned?',{spire:'A steep pointed roof and a fine spire.',dome:'A small oxidized copper dome.',flat:'A square parapet with four corner pinnacles.'}),
 bell:noul('Is a bronze bell exposed above the clock?'),
},build(a,c){
 const s=new Sculpture(c),h=6+a.height*18,w=h*.19,body=s.material(a.style==='brick'?'#a47258':a.style==='stone'?'#c7bfae':'#64777f'),trim=s.material('#ded2ba'),dark=s.material('#2f4148'),copper=s.material('#648878',{metalness:.5}),bell=s.material('#b69756',{metalness:.7});
 if(a.style==='iron'){for(const x of [-1,1])for(const z of [-1,1])s.rod([x*w*.45,0,z*w*.45],[x*w*.45,h*.83,z*w*.45],w*.07,body);for(let j=0;j<5;j++){const y=j*h*.15;for(const z of [-1,1])s.rod([-w*.45,y,z*w*.45],[w*.45,y+h*.15,z*w*.45],w*.025,body);}}
 else{s.box([w,h*.84,w],[0,h*.42,0],body);for(let j=0;j<12;j++)s.box([w*1.025,.04,w*1.025],[0,j*h*.065,0],trim);for(const x of [-1,1])for(const z of [-1,1])s.box([w*.12,h*.88,w*.12],[x*w*.5,h*.44,z*w*.5],trim);}
 s.box([w*1.12,h*.035,w*1.12],[0,h*.82,0],trim);
 const cy=h*.67,rad=w*.39,paint=s.material(a.face==='astral'?'#344f6e':'#dedbc9');
 for(let side=0;side<4;side++){
  const g=new THREE.Group();s.root.add(g);const z=w*.511;
  const plate=s.cylinder(rad,rad,.045,[0,cy,z],paint);plate.rotation.x=Math.PI/2;g.attach(plate);
  for(let i=0;i<(a.face==='minimal'?4:12);i++){const t=i*Math.PI*2/(a.face==='minimal'?4:12);const m=s.box([rad*.07,rad*.19,.025],[Math.sin(t)*rad*.81,cy+Math.cos(t)*rad*.81,z+.045],dark);m.rotation.z=-t;g.attach(m);}
  for(const [fraction,length] of [[a.hour*.97,rad*.47],[a.minute*.97,rad*.72]]){const t=fraction*Math.PI*2;g.attach(s.rod([0,cy,z+.08],[Math.sin(t)*length,cy+Math.cos(t)*length,z+.08],rad*.035,dark));}
  g.attach(s.ball([rad*.08,rad*.08,rad*.04],[0,cy,z+.1],bell));g.rotation.y=side*Math.PI/2;
 }
 if(a.bell){for(const x of [-1,1])for(const z of [-1,1])s.rod([x*w*.4,h*.84,z*w*.4],[x*w*.4,h*.98,z*w*.4],w*.05,trim);s.lathe([[w*.22,0],[w*.18,h*.04],[w*.12,h*.07],[w*.06,h*.08]],bell,[0,h*.85,0]);s.rod([0,h*.85,0],[0,h*.94,0],w*.03,dark);}
 const top=h*(a.bell?1:.85);
 if(a.roof==='spire'){const r=s.cylinder(0,w*.86,h*.23,[0,top+h*.115,0],dark,4);r.rotation.y=Math.PI/4;s.rod([0,top+h*.22,0],[0,top+h*.31,0],w*.015,bell);}
 if(a.roof==='dome')s.mesh(new THREE.SphereGeometry(w*.64,24,12,0,Math.PI*2,0,Math.PI/2),copper,[0,top,0]);
 if(a.roof==='flat'){s.box([w*1.2,h*.02,w*1.2],[0,top,0],trim);for(const x of [-1,1])for(const z of [-1,1])s.cylinder(0,w*.12,h*.1,[x*w*.5,top+h*.05,z*w*.5],dark,4);}
 return s.finish();}});
