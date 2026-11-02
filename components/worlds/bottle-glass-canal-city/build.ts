import * as THREE from 'three';
import {choice,defineWorld,diorama,mix,score,Sculpture} from '@conjure/kit';
type P=readonly[number,number,number];
function arc(s:Sculpture,c:P,rx:number,ry:number,start:number,end:number,t:number,m:THREE.Material){const ps:P[]=[];for(let i=0;i<=32;i++){const a=start+(end-start)*i/32;ps.push([c[0]+Math.cos(a)*rx,c[1]+Math.sin(a)*ry,c[2]]);}return s.tube(ps,t,m);}
function fineTube(s:Sculpture,points:readonly P[],radius:number,m:THREE.Material){return s.mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),Math.max(20,Math.ceil(points.length*1.3)),radius,radius<.015?4:6,false),m);}
function leaf(s:Sculpture,at:P,length:number,width:number,m:THREE.Material,rise=.25){return s.surface((u,v,p)=>p.set((u-.5)*length,Math.sin(u*Math.PI)*rise-Math.abs(v-.5)*.1,Math.sin(Math.PI*u)*(v-.5)*width),m,{segments:[28,12],at});}
function bench(s:Sculpture,x:number,y:number,z:number,width:number,m:THREE.Material){s.box([width,.09,.38],[x,y+.48,z],m);for(const dx of[-width*.38,width*.38]){s.box([.08,.44,.33],[x+dx,y+.22,z],m);s.rod([x+dx,y+.42,z-.16],[x+dx,y+.94,z-.16],.025,m);}s.box([width,.3,.06],[x,y+.8,z-.17],m);}
function cottage(s:Sculpture,x:number,y:number,z:number,w:number,body:THREE.Material,roof:THREE.Material,dark:THREE.Material){s.box([w,w*.68,w*.7],[x,y+w*.34,z],body);s.cylinder(0,w*.78,w*.44,[x,y+w*.9,z],roof,4).rotateY(Math.PI/4);s.box([w*.25,w*.42,.02],[x,y+w*.21,z+w*.358],dark);for(const sign of[-1,1])s.box([w*.17,w*.18,.02],[x+sign*w*.31,y+w*.45,z+w*.36],dark);}

export default defineWorld({
 questions:{
  bottles:choice("What profiles shape the bottle buildings?",{"round": "Broad rounded medicine bottles.", "tall": "Tall slender flask towers.", "square": "Broad faceted storage bottles.", "bulb": "Round-bellied bottles with narrow shoulders."}),
  glass:choice("What kind of bottle glass forms the walls?",{"green": "Thick moss-green bottle glass.", "amber": "Warm amber glass with dark edges.", "blue": "Pale blue glass with milky rims.", "milk": "Opaque cream milk glass."}),
  necks:choice("How are the bottle necks finished?",{"open": "Open glass mouths with thick rolled rims.", "corks": "Corks leave a little ventilation gap.", "caps": "Broad metal caps with raised crimped edges.", "lanterns": "Open necks carry small framed lantern roofs."}),
  galleries:choice("How are the high galleries connected?",{"planks": "Narrow timber walkways with handrails.", "glass": "Pale glass decks on dark support beams.", "rope": "Plank galleries bordered by rope rails.", "arches": "Small arched trusses support the walkways."}),
  canal:choice("How does water pass through the neighbourhood?",{"straight": "A straight canal runs along the front of the bottles.", "basin": "A central square turning basin widens the canal.", "branch": "A short rear branch leads between two bottle buildings.", "lock": "Two gates divide a low central lock chamber."}),
  crossings:choice("What spans the canal at street level?",{"flat": "Flat plank bridges on masonry abutments.", "arched": "Gently arched timber footbridges.", "steps": "Stepped stone bridges with low parapets.", "lifting": "A closed lifting bridge has counterweighted side frames."}),
  interiors:choice("What occupies the bottle interiors?",{"homes": "Small doors, beds and wall shelves.", "shops": "Open shop counters with rows of tiny jars.", "gardens": "Raised planter beds and tall climbing trellises.", "archives": "Open shelves of bundled papers and small books."}),
  quay:choice("What lines the towpath?",{"bollards": "Low rounded mooring bollards.", "rail": "A low post-and-rail guard along the canal.", "lamps": "Small framed lanterns on tall quay posts.", "steps": "Short landing stairs descend toward the water."}),
  story:choice("What moment is visible on the quay?",{"delivery": "Tied parcels and a handcart wait by the bridge.", "washing": "Two wash tubs and a supported drying line stand on the quay.", "repair": "Spare glass panes lean in a framed storage rack.", "market": "A little awning shelters baskets on a counter."}),
  border:choice("What grows around the glass city?",{"moss": "Low moss cushions between bottle foundations.", "reeds": "Small reeds grow beside the canal ends.", "stones": "Rounded pale stones border the towpath.", "paving": "A patterned tile border follows the water."}),
  extent:score('How broad is this place?',['An intimate setting','A compact neighbourhood','A generous place','A broad miniature world'])
 },
 build(a,context){

 const b=mix(.94,1.1,a.extent),{world,art:s}=diorama(context,{width:13*b,depth:11,background:'#dfe6de',floor:'#b7c4ae',yaw:24,pitch:31,maxHeight:1.65,radius:.95,slots:[[0,3.5],[-4.5,2.6],[4.5,2.6]],scale:[.65,1.15]});
 const color=a.glass==='amber'?'#b38b54':a.glass==='blue'?'#9dbec0':a.glass==='milk'?'#dbd8bd':'#7e9b7d';
 const glass=s.material(color,{roughness:.32,metalness:.12}),edge=s.material(a.glass==='amber'?'#7f643f':'#688b80'),wood=s.material('#947858'),dark=s.material('#495b50'),pale=s.material('#d5cfab'),metal=s.material('#7e9186',{metalness:.55}),water=s.material('#789f9e',{roughness:.28}),green=s.material('#738952'),cloth=s.material('#ab8570',{side:THREE.DoubleSide}),paper=s.material('#e1d8b7');
 const H=a.bottles==='tall'?3.7:a.bottles==='bulb'?3.0:3.25,R=a.bottles==='tall'?.83:a.bottles==='bulb'?1.15:1.02,Z=-2.55,centres=[-3.25*b,0,3.25*b],neck=.37;
 const profile:[number,number][]=[[R*.83,0],[R,.16],[R,H*.58],[R*.85,H*.73],[neck,H*.86],[neck,H],[neck-.07,H],[neck-.07,H*.87],[R*.78,H*.74],[R-.08,H*.58],[R-.08,.18],[R*.78,.08]];
 for(const x of centres){
  s.cylinder(R+.09,R+.13,.15,[x,.075,Z],edge,40);
  s.mesh(new THREE.LatheGeometry(profile.map(p=>new THREE.Vector2(...p)),a.bottles==='square'?12:52,.7,Math.PI*2-1.4),glass,[x,.15,Z]);
  // Full rolled neck rims bridge the cut-away wall, and their broad shoulder supports them.
  s.ring(neck-.035,.045,[x,H+.15,Z],edge).rotateX(Math.PI/2);
  const floor=.2; s.cylinder(R*.88,R*.88,.1,[x,floor-.05,Z],wood,40);
  for(const dx of[-.5,.5])s.rod([x+dx,floor,Z],[x+dx,1.28,Z],.035,wood);
  s.box([1.08,.055,.6],[x,1.25,Z],wood);s.box([1.08,.055,.6],[x,.7,Z],wood);
  if(a.interiors==='homes'){s.box([.45,.18,.65],[x-.3,.29,Z+.15],cloth);s.box([.4,.08,.18],[x-.3,.42,Z-.03],pale);s.box([.34,.65,.05],[x+.36,.525,Z-.45],dark);}
  if(a.interiors==='shops')for(let row=0;row<2;row++)for(let j=0;j<5;j++){const xx=x+(j-2)*.17,y=(row?.7:floor)+.055;s.cylinder(.055,.055,.16,[xx,y+.08,Z],j%2?glass:pale,12);s.cylinder(.06,.06,.025,[xx,y+.1725,Z],wood,12);}
  if(a.interiors==='gardens'){s.box([.85,.18,.55],[x,.29,Z+.12],wood);for(let j=0;j<6;j++){const xx=x+(j-2.5)*.13;s.rod([xx,.38,Z+.12],[xx,.9,Z+.12],.012,green);for(const side of[-1,1])s.ball([.08,.04,.06],[xx+side*.06,.65,Z+.12],green,10);}}
  if(a.interiors==='archives')for(let row=0;row<2;row++)for(let j=0;j<7;j++)s.box([.09,.25+.03*(j%3),.25],[x+(j-3)*.13,(row?.7:floor)+.16,Z],j%3?paper:cloth);
  // A rear stair reaches the permanent neck gallery; all treads intersect its central support.
  const sy=H*.78+.15;s.rod([x,0,Z-.64],[x,sy,Z-.64],.07,wood);
  for(let i=0;i<18;i++){const t=i*.43,y=(i+1)*sy/18;const step=s.box([.57,.055,.21],[x+Math.sin(t)*.24,y-.0275,Z-.64+Math.cos(t)*.24],wood);step.rotation.y=t-Math.PI/2;}
  s.box([1.25,.08,.55],[x,sy,Z-.64],wood);
  if(a.necks==='corks'){s.cylinder(.34,.31,.38,[x,H+.36,Z],wood,28);for(let i=0;i<5;i++)s.box([.035,.035,.02],[x+(i-2)*.1,H+.4,Z+.323],edge);}
  if(a.necks==='caps'){s.cylinder(.43,.43,.12,[x,H+.21,Z],metal,32);for(let i=0;i<20;i++){const t=i*Math.PI/10;s.rod([x+Math.sin(t)*.43,H+.15,Z+Math.cos(t)*.43],[x+Math.sin(t)*.43,H+.27,Z+Math.cos(t)*.43],.014,metal);}}
  if(a.necks==='lanterns'){for(const dx of[-.25,.25])for(const dz of[-.25,.25])s.rod([x+dx,H+.15,Z+dz],[x+dx,H+.8,Z+dz],.025,metal);s.cylinder(0,.48,.27,[x,H+.935,Z],metal,4).rotateY(Math.PI/4);s.ball([.14,.23,.14],[x,H+.45,Z],pale,16);s.rod([x,H+.68,Z],[x,H+.5,Z],.015,metal);}
 }
 const gy=H*.78+.15;
 for(let k=0;k<2;k++){const left=centres[k]+.58,right=centres[k+1]-.58,z=Z-.64,span=right-left,mid=(left+right)/2;s.box([span+.1,.065,.48],[mid,gy,z],a.galleries==='glass'?glass:wood);for(const side of[-1,1]){s.rod([left,gy-.055,z+side*.19],[right,gy-.055,z+side*.19],.04,dark);for(let j=0;j<5;j++){const x=mix(left,right,j/4);s.rod([x,gy,z+side*.23],[x,gy+.45,z+side*.23],.018,metal);}if(a.galleries==='rope')s.tube([[left,gy+.45,z+side*.23],[mid,gy+.34,z+side*.23],[right,gy+.45,z+side*.23]],.018,wood);else s.rod([left,gy+.45,z+side*.23],[right,gy+.45,z+side*.23],.022,metal);if(a.galleries==='arches'){arc(s,[mid,gy-.1,z+side*.2],span/2,.45,0,Math.PI,.025,metal);s.rod([mid,gy-.1,z+side*.2],[mid,gy+.35,z+side*.2],.02,metal);}}}
 // Continuous water and towpaths remain present for every cast.
 const L=11*b,cz=.15,cw=1.15;
 const sideSegments=(from:number,to:number,cut0:number,cut1:number,fn:(x:number,w:number)=>void)=>{if(cut0>from)fn((from+cut0)/2,cut0-from);if(cut1<to)fn((cut1+to)/2,to-cut1);};
 const walkPolygon=(points:[number,number][])=>{const shape=new THREE.Shape();points.forEach(([x,z],i)=>i?shape.lineTo(x,z):shape.moveTo(x,z));shape.closePath();const mesh=s.mesh(new THREE.ExtrudeGeometry(shape,{depth:.1,bevelEnabled:false}),pale,[0,.1,0]);mesh.rotation.x=Math.PI/2;};
 if(a.canal==='basin'){
  sideSegments(-L/2,L/2,-1.075,1.075,(x,w)=>s.box([w,.035,cw],[x,.025,cz],water));
  s.box([2.15,.035,1.65],[0,.025,cz],water);
  for(const side of[-1,1]){
   sideSegments(-L/2,L/2,-1.205,1.205,(x,w)=>s.box([w,.18,.13],[x,.09,cz+side*.64],edge));
   s.box([2.28,.18,.13],[0,.09,cz+side*.89],edge);
   for(const sign of[-1,1])s.box([.13,.18,.25],[sign*1.14,.09,cz+side*.7],edge);
   const outline:[number,number][]=[[-L/2,.705],[-1.205,.705],[-1.205,.955],[1.205,.955],[1.205,.705],[L/2,.705],[L/2,1.225],[1.725,1.225],[1.725,1.475],[-1.725,1.475],[-1.725,1.225],[-L/2,1.225]];
   walkPolygon(outline.map(([x,z])=>[x,cz+side*z]));
  }
 }else{
  s.box([L,.035,cw],[0,.025,cz],water);
  for(const side of[-1,1]){
   if(a.canal==='branch'&&side===-1){
    const x=1.6*b;
    sideSegments(-L/2,L/2,x-.44,x+.44,(mid,w)=>s.box([w,.18,.13],[mid,.09,cz-.64],edge));
    sideSegments(-L/2,L/2,x-.505,x+.505,(mid,w)=>s.box([w,.1,.52],[mid,.05,cz-.965],pale));
    const start=cz-cw/2,end=-2.075,span=start-end;
    s.box([.75,.035,span],[x,.025,(start+end)/2],water);
    for(const sign of[-1,1]){
     s.box([.13,.18,span],[x+sign*.44,.09,(start+end)/2],edge);
     // The side walk ends at the original rear path, with no layer over the junction.
     const z0=end-.13,z1=cz-1.225;
     s.box([.52,.1,z1-z0],[x+sign*.765,.05,(z0+z1)/2],pale);
    }
    s.box([1.01,.18,.13],[x,.09,end-.065],edge);
    s.box([2.05,.1,.52],[x,.05,end-.39],pale);
   }else{s.box([L,.18,.13],[0,.09,cz+side*.64],edge);s.box([L,.1,.52],[0,.05,cz+side*.965],pale);}
  }
 }
 if(a.canal==='lock')for(const x of[-1.1,1.1]){s.box([.08,.36,cw],[x,.18,cz],wood);for(const z of[cz-.5,cz+.5]){s.rod([x,0,z],[x,.6,z],.04,dark);s.rod([x,.5,z],[x+.45,.5,z],.025,wood);}}
 for(const x of[-3.25*b,3.25*b]){const yAt=(t:number)=>a.crossings==='arched'?.17+.35*Math.sin(t*Math.PI):a.crossings==='steps'?.17+.1*Math.min(3,Math.floor(Math.min(t,1-t)*8)):.17;const z0=-.9,z1=1.2;
  for(let i=0;i<15;i++){const t=(i+.5)/15,y=yAt(t),z=mix(z0,z1,t);s.box([.8,.075,(z1-z0)/15+.012],[x,y,z],a.crossings==='steps'?pale:wood);if(i%3===0||i===14)for(const side of[-1,1])s.rod([x+side*.36,y,z],[x+side*.36,y+.4,z],.023,dark);}
  for(const side of[-1,1]){const ps:P[]=[];for(let i=0;i<=30;i++){const t=i/30;ps.push([x+side*.36,yAt(t)+.4,mix(z0,z1,t)]);}fineTube(s,ps,.025,wood);const beams:P[]=[];for(let i=0;i<=30;i++){const t=i/30;beams.push([x+side*.27,yAt(t)-.045,mix(z0,z1,t)]);}fineTube(s,beams,.035,dark);}
  for(const z of[z0,z1])s.box([.9,.16,.25],[x,.08,z],edge);
  if(a.crossings==='lifting')for(const side of[-1,1]){const xx=x+side*.51;s.rod([xx,0,-.65],[xx,1.35,-.65],.035,metal);s.rod([xx,1.35,-.65],[xx,1.35,.7],.04,metal);s.rod([xx,1.35,.65],[xx,.2,.65],.012,metal);s.box([.18,.3,.24],[xx,1.2,-.95],dark);s.rod([xx,1.35,-.65],[xx,1.35,-.95],.04,metal);}
 }
 for(let i=0;i<9;i++){const x=-4.8*b+i*1.2*b,z=1.05;if(a.quay==='bollards'){s.cylinder(.065,.085,.22,[x,.21,z],dark,16);s.ball([.09,.045,.09],[x,.335,z],metal,12);}if(a.quay==='rail'){s.rod([x,.1,z],[x,.55,z],.027,wood);if(i<8)s.rod([x,.51,z],[x+1.2*b,.51,z],.025,wood);}if(a.quay==='lamps'){s.rod([x,.1,z],[x,1.05,z],.025,dark);s.box([.17,.22,.17],[x,1.1,z],pale);s.cylinder(0,.16,.15,[x,1.285,z],metal,4).rotateY(Math.PI/4);}if(a.quay==='steps'&&i%2===0)for(let j=0;j<3;j++)s.box([.5,.04*(3-j),.13],[x,.02*(3-j),.84-j*.12],pale);}
 const sx=-5.1*b,sz=-2.6;
 if(a.story==='delivery'){s.box([.66,.06,.55],[sx,.23,sz],wood);for(const dx of[-.24,.24])for(const dz of[-.21,.21])s.cylinder(.12,.12,.05,[sx+dx,.12,sz+dz],dark,16).rotateZ(Math.PI/2);for(let i=0;i<3;i++)s.box([.25,.2,.32],[sx+(i%2-.5)*.27,.36+Math.floor(i/2)*.2,sz],paper);s.rod([sx+.33,.23,sz],[sx+.6,.75,sz],.025,wood);}
 if(a.story==='washing'){for(const z of[sz-.4,sz+.4])s.lathe([[.25,0],[.3,.3],[.27,.3],[.22,.035]],wood,[sx,0,z]);for(const x of[sx-.3,sx+.3])s.rod([x,0,sz],[x,1.35,sz],.025,wood);s.rod([sx-.3,1.35,sz],[sx+.3,1.35,sz],.01,pale);s.box([.42,.55,.015],[sx,1.075,sz],cloth);}
 if(a.story==='repair'){s.box([.65,.07,.7],[sx,.035,sz],wood);for(const x of[sx-.28,sx+.28])s.rod([x,0,sz-.22],[x,.95,sz-.22],.025,wood);for(let i=0;i<4;i++)s.box([.52,.75,.03],[sx,.42,sz-.15+i*.09],glass).rotateX(-.12);}
 if(a.story==='market'){s.box([.85,.07,.6],[sx,.7,sz],wood);for(const dx of[-.35,.35])for(const dz of[-.24,.24])s.rod([sx+dx,0,sz+dz],[sx+dx,1.35,sz+dz],.03,wood);s.box([.95,.04,.75],[sx,1.36,sz],cloth);for(let i=0;i<3;i++)s.lathe([[.09,0],[.12,.12],[.1,.12],[.07,.025]],pale,[sx+(i-1)*.22,.735,sz]);}
 for(let i=0;i<14;i++){const x=-5.4*b+i*.83*b,z=-4.2;if(a.border==='moss')s.ball([.3,.1,.24],[x,.09,z],green,12);else if(a.border==='stones')s.ball([.17,.08,.12],[x,.07,z],pale,12);else if(a.border==='paving')s.box([.7,.035,.3],[x,.0175,z],i%2?edge:pale);else for(let j=0;j<4;j++)s.rod([x+j*.05,0,z],[x+j*.05+.04,.38+j*.06,z],.012,green);}
 
 return world;
 }
});
