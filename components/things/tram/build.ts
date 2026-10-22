import { Sculpture, choice, score, noul, defineThing } from '@conjure/kit';
export default defineThing({questions:{
 era:choice('What kind of tram serves the street?',{heritage:'A short wooden heritage tram with rounded end windows.',modern:'A clean low-floor tram with a long window band.',articulated:'Two short units linked by a flexible bellows.'}),
 length:score('How long is the passenger vehicle?', ['A six-metre local tram','A sixteen-metre urban tram']),
 livery:choice('How is the tram painted?',{green:'Dark green body and cream window surrounds.',red:'Oxide red body and ivory roof.',silver:'Silver body with a blue belt line.'}),
 pickup:choice('How does it collect electrical power?',{pole:'A slender trolley pole extending rearward.',pantograph:'A diamond-shaped pantograph on the roof.',battery:'A flat battery housing without overhead gear.'}),
 destination:choice('What does the destination board say?',{market:'MARKET SQUARE',depot:'DEPOT / LAST CAR',harbour:'HARBOUR LINE'}),
 doors:noul('Are the passenger doors open?'),
 lamps:noul('Are the front running lamps illuminated?'),
},build(a,c){
 const s=new Sculpture(c),l=6+a.length*10,w=2.3,h=2.7,body=s.material(a.livery==='green'?'#5a7a68':a.livery==='red'?'#ab7058':'#a4b1b5'),roof=s.material('#d8d1b9'),dark=s.material('#3d5867'),metal=s.material('#75878d',{metalness:.5}),glow=s.material('#d9cd9f',{emissive:'#c8b77d',emissiveIntensity:.5}),n=a.era==='articulated'?2:1;
 for(let car=0;car<n;car++){
  const cl=n===2?l*.46:l,z=n===2?(car-.5)*l*.51:0;s.box([w,h*.63,cl],[0,1.5,z],body);s.box([w*1.01,.15,cl],[0,2.65,z],roof);s.box([w*.98,.7,cl*.94],[0,2.12,z],dark);
  for(const side of [-1,1]){for(let i=0;i<6;i++)s.box([.06,.82,.09],[side*w*.5,2.1,z+(i-2.5)*cl*.145],roof);const dz=z+cl*.15;s.box([.03,1.85,.9],[side*w*.511,1.49,dz],a.doors?dark:body);if(a.doors){s.box([.03,1.85,.2],[side*w*.515,1.49,dz-.5],roof);s.box([.25,.12,1],[side*w*.57,.54,dz],metal);}}
  for(const zz of [-cl*.32,cl*.32])for(const side of [-1,1]){const wheel=s.cylinder(.25,.25,.14,[side*.83,.35,z+zz],dark,16);wheel.rotation.z=Math.PI/2;}
 }
 if(n===2)for(let i=0;i<7;i++)s.box([w*.94,h*.75,.055],[0,1.48,(i-3)*l*.012],metal);
 s.box([w,.08,l*.96],[0,.68,0],metal);s.box([1.75,.9,.04],[0,1.95,l*.503],dark);s.label(a.destination==='market'?'MARKET SQ':a.destination==='depot'?'DEPOT':'HARBOUR',1.7,.28,[0,2.52,l*.506],'#ded2a8','#3d5867');
 for(const x of [-.7,.7])s.ball([.09,.09,.035],[x,1.12,l*.513],a.lamps?glow:roof);
 if(a.pickup==='pole')s.rod([0,2.73,0],[0,4.2,-l*.35],.025,metal);
 if(a.pickup==='pantograph'){for(const side of [-1,1]){s.rod([side*.65,2.74,0],[0,3.6,0],.025,metal);s.rod([0,3.6,0],[side*.65,4.05,0],.025,metal);}s.rod([-.7,4.05,0],[.7,4.05,0],.025,metal);}
 if(a.pickup==='battery')s.box([1.6,.25,l*.22],[0,2.84,0],metal);
 return s.finish();}});
