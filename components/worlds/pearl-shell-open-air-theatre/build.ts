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
  fan:choice("What shape is the great acoustic shell?",{"broad": "A broad low semicircular shell.", "tall": "A high narrow scallop fan.", "scalloped": "A shell with a strongly scalloped upper lip.", "cupped": "A deeply cupped shell leans over the stage."}),
  ribs:choice("How are the shell ribs formed?",{"fine": "Many thin shallow nacre ribs.", "strong": "A dozen strong rounded flutes.", "paired": "Paired ribs converge at the lower hinge.", "beaded": "Fine ribs carry small pearl beads."}),
  stage:choice("What shape is the performance stage?",{"round": "A low round stage.", "square": "A square timber stage with side stairs.", "stepped": "A broad stage with a second rear tier.", "tongue": "A rounded stage with a short front runway."}),
  seats:choice("How is the audience seated?",{"arcs": "Three curving rows of continuous benches.", "terraces": "Broad stone seating terraces.", "benches": "Separate small wooden benches in two groups.", "cushions": "Round cushions sit on stepped low platforms."}),
  portal:choice("What frames the acting space?",{"open": "The shell fan alone frames the stage.", "pearls": "Two strings of pearl lamps hang between posts.", "curtains": "Gathered side curtains leave the stage open.", "coral": "Two branching coral-like arches flank the stage."}),
  front:choice("What lies before the stage?",{"apron": "A plain wooden performance apron.", "pool": "A shallow reflecting pool crossed by a small central walkway.", "pit": "A recessed orchestra well with a low rim.", "flowers": "Two flower troughs flank the front approach."}),
  backstage:choice("What sits behind the wings?",{"doors": "Small side doors beneath round shell roofs.", "alcoves": "Open prop alcoves are cut into low side walls.", "dock": "A short side landing and mooring posts meet the shore.", "garden": "A pair of planted backstage courtyards."}),
  overhead:choice("What spans the audience area?",{"open": "Open sky above the audience.", "lights": "A few lamp strings join tall outer posts.", "sail": "A narrow tensioned canvas sail shades the back row.", "ribbons": "Long fabric ribbons hang from supported cross ropes."}),
  story:choice("What moment of the performance is this?",{"ready": "A music stand and tied programme stacks await opening.", "rehearsal": "A stool, an open case and spare boards mark rehearsal.", "festival": "Small bunting flags and flower pots celebrate the night.", "cleanup": "Stacked seats and a cleaning pail wait at the edge."}),
  shore:choice("What surrounds the theatre?",{"sand": "Pale sand and a few rounded beach stones.", "pebbles": "A clear pebble border around the outer terraces.", "moss": "Low green cushions soften the shell base.", "tide": "Shallow tidal pools lie beyond the audience."}),
  extent:score('How broad is this place?',['An intimate setting','A compact neighbourhood','A generous place','A broad miniature world'])
 },
 build(a,context){

 const b=mix(.93,1.14,a.extent),{world,art:s}=diorama(context,{width:12*b,depth:10,background:'#e1e2d9',floor:'#c6c2a7',yaw:24,pitch:30,maxHeight:2,radius:1,slots:[[0,-.8,.35,1],[3.45,.1],[-3.45,.1],[0,3.5]],scale:[.8,1.3]});
 const nacre=s.material('#dfd5c1',{roughness:.32}),rib=s.material('#bdad97'),wood=s.material('#88755e'),dark=s.material('#485550'),cloth=s.material('#a77470',{side:THREE.DoubleSide}),green=s.material('#81926c'),gold=s.material('#c4aa78',{metalness:.4}),water=s.material('#8cafb0',{transparent:true,opacity:.5,depthWrite:false}),cream=s.material('#e8dfbe');
 const W=(a.fan==='tall'?3.25:4.1)*b,H=a.fan==='broad'?3.25:4.2,Z=-2.8,N=a.ribs==='fine'?23:a.ribs==='strong'?13:17;
 const position=(u:number,v:number,p:THREE.Vector3,back=false)=>{const t=(u-.5)*Math.PI,scallop=a.fan==='scalloped'?1+.035*Math.cos(t*17):1,r=v*scallop,ridge=Math.cos(t*N*2)*.035*r;return p.set(Math.sin(t)*W*r,.4+Math.cos(t)*H*r,Z+(a.fan==='cupped'?1.1:.36)*Math.sin(v*Math.PI*.8)+ridge-(back?.11:0));};
 s.surface((u,v,p)=>position(u,v,p),nacre,{segments:[84,22]});s.surface((u,v,p)=>position(u,v,p,true),rib,{segments:[84,22],flip:true});
 const rim:P[]=[];for(let i=0;i<=80;i++){const p=position(i/80,1,new THREE.Vector3());rim.push(p.toArray() as [number,number,number]);}fineTube(s,rim,.065,rib);
 for(let i=0;i<=N;i++){const u=i/N,ps:P[]=[];for(let j=0;j<=28;j++){const p=position(u,.05+j*.95/28,new THREE.Vector3());p.z+=.035;ps.push(p.toArray() as [number,number,number]);}fineTube(s,ps,a.ribs==='strong'?.065:.032,rib);if(a.ribs==='paired'){const ps2:P[]=[];for(let j=0;j<=28;j++){const p=position(Math.min(1,u+.012),.05+j*.95/28,new THREE.Vector3());p.z+=.035;ps2.push(p.toArray() as [number,number,number]);}fineTube(s,ps2,.025,rib);}if(a.ribs==='beaded')for(let j=3;j<10;j++){const p=position(u,j/10,new THREE.Vector3());p.z+=.06;s.ball([.055,.055,.055],p.toArray() as [number,number,number],cream,10);}}
 // The fan has a continuous lower hinge bed and two deep rear buttresses.
 s.box([W*2+.1,.35,.7],[0,.175,Z],rib);for(const x of[-W*.57,W*.57])s.rod([x,0,Z-.7],[x,1.8,Z+.3],.16,rib);
 const stageZ=-.85,stageR=1.9,stageY=.35;
 if(a.stage==='square')s.box([3.8,stageY,2.65],[0,stageY/2,stageZ],wood);else s.cylinder(stageR,stageR,stageY,[0,stageY/2,stageZ],wood,56);
 if(a.stage==='stepped')s.box([3,.24,.7],[0,stageY+.12,stageZ-.95],wood);
 if(a.stage==='tongue')s.box([1.2,stageY,1.8],[0,stageY/2,.5],wood);
 for(const sign of[-1,1])for(let i=0;i<3;i++){const h=stageY*(3-i)/3;s.box([.22,h,.62],[sign*(stageR+.11+i*.22),h/2,stageZ+.35],nacre);}
 const rows=3;
 for(let row=0;row<rows;row++){const rr=2.6+row*.65,y=row*.18,range=.98;
  for(const side of[-1,1]){const start=side<0?-.98:.16,end=side<0?-.16:.98;const deck:P[]=[];for(let j=0;j<=24;j++){const t=start+(end-start)*j/24;deck.push([Math.sin(t)*rr,y+.12,Math.cos(t)*rr-.15]);}
   const material=a.seats==='terraces'?nacre:wood;
   s.surface((u,v,p)=>{const t=start+(end-start)*u,r=rr+(v-.5)*.5;p.set(Math.sin(t)*r,y+.1,Math.cos(t)*r-.15);},material,{segments:[24,2],flip:true});
   for(let j=0;j<7;j++){const t=start+(end-start)*(j+.5)/7,x=Math.sin(t)*rr,z=Math.cos(t)*rr-.15;s.box([.24,y+.1,.38],[x,(y+.1)/2,z],rib).rotateY(t);}
   if(a.seats==='arcs'||a.seats==='terraces'){s.tube(deck.map(p=>[p[0],p[1]+(a.seats==='arcs'?.34:0),p[2]] as P),a.seats==='arcs'?.12:.17,material);if(a.seats==='arcs')for(let j=0;j<6;j++){const t=start+(end-start)*(j+.5)/6,x=Math.sin(t)*rr,z=Math.cos(t)*rr-.15;s.rod([x,y+.1,z],[x,y+.46,z],.04,wood);}}
   else for(let j=0;j<4;j++){const t=start+(end-start)*(j+.5)/4,x=Math.sin(t)*rr,z=Math.cos(t)*rr-.15;if(a.seats==='cushions')s.ball([.22,.09,.2],[x,y+.19,z],cloth,12);else{const group=new THREE.Group();s.root.add(group);const before=new Set(s.root.children);bench(s,x,y+.1,z,.55,wood);for(const node of [...s.root.children])if(!before.has(node)&&node!==group)group.attach(node);group.position.set(x,0,z);for(const node of group.children){node.position.x-=x;node.position.z-=z;}group.rotation.y=t;}}
  }
 }
 // Both ends of each pearl swag attach to the same supported portal header.
 if(a.portal==='pearls')s.rod([-2.2,2.5,-1.4],[2.2,2.5,-1.4],.025,gold);
 if(a.portal!=='open')for(const side of[-1,1]){const x=side*2.2;s.rod([x,0,-1.4],[x,2.5,-1.4],.065,rib);if(a.portal==='pearls'){
  const points:P[]=[[x,2.5,-1.4],[x-side*.45,2.2,-1.4],[x-side*.8,2.5,-1.4]],curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
  const string=s.tube(points,.012,gold);string.name='portal-pearl-string';
  for(let j=0;j<8;j++){const bead=s.ball([.07,.07,.07],curve.getPoint(j/7).toArray() as [number,number,number],cream,10);bead.name='portal-pearl';}
 }if(a.portal==='curtains')s.surface((u,v,p)=>p.set(x+side*((u-.5)*.65+(1-v)*.12),.36+v*2.1,-1.4+Math.sin(u*8*Math.PI)*.07),cloth,{segments:[32,16]});if(a.portal==='coral'){for(let j=0;j<5;j++){const y=.7+j*.32;s.tube([[x,y,-1.4],[x-side*.2,y+.25,-1.4],[x-side*(.4+j*.05),y+.4,-1.4]],.045,rib);}}}
 const frontZ=1.4;
 if(a.front==='apron')s.box([2.8,.08,.6],[0,.04,frontZ],wood);
 if(a.front==='pool'||a.front==='pit'){for(const sign of[-1,1]){const x=sign*.83;s.box([1.4,.08,.65],[x,.04,frontZ],a.front==='pool'?water:dark);for(const dx of[-.72,.72])s.box([.05,.2,.75],[x+dx,.1,frontZ],nacre);for(const dz of[-.35,.35])s.box([1.5,.2,.05],[x,.1,frontZ+dz],nacre);}s.box([.55,.15,.86],[0,.075,frontZ],wood);}
 if(a.front==='flowers')for(const sign of[-1,1]){const x=sign*1.1;s.box([.8,.25,.4],[x,.125,frontZ],rib);for(let i=0;i<6;i++){const xx=x+(i%3-1)*.2,z=frontZ+(Math.floor(i/3)-.5)*.16;s.rod([xx,.25,z],[xx,.6,z],.012,green);s.ball([.1,.06,.1],[xx,.6,z],cloth,10);}}
 for(const side of[-1,1]){const x=side*3.4,z=-2.45;if(a.backstage==='doors'){cottage(s,x,0,z,.85,nacre,rib,dark);}if(a.backstage==='alcoves'){s.box([1.25,.85,.18],[x,.425,z-.35],rib);for(const dx of[-.6,0,.6])s.box([.1,.85,.65],[x+dx,.425,z],rib);s.box([1.3,.08,.7],[x,.89,z],nacre);s.box([.35,.25,.3],[x-.3,.125,z],wood);}if(a.backstage==='dock'){s.box([1.2,.2,1.4],[x,.1,z],wood);for(const dx of[-.5,.5])for(const dz of[-.6,.6])s.rod([x+dx,0,z+dz],[x+dx,.6,z+dz],.05,wood);}if(a.backstage==='garden'){s.box([1.2,.16,.9],[x,.08,z],rib);for(let i=0;i<8;i++)s.ball([.15,.2,.13],[x+(i%4-1.5)*.25,.3,z+(Math.floor(i/4)-.5)*.35],green,12);}}
 if(a.overhead!=='open'){for(const x of[-4.6,4.6])s.rod([x,0,2],[x,3,2],.045,wood);const rope:P[]=[[-4.6,3,2],[0,2.45,2],[4.6,3,2]];s.tube(rope,.018,wood);if(a.overhead==='sail')s.surface((u,v,p)=>{const x=(u-.5)*9.2;p.set(x,2.45+.55*(x/4.6)**2+Math.abs(v-.5)*.3,1.4+v*1.2);},cloth,{segments:[36,10]});else for(let i=0;i<15;i++){const x=-4.2+i*.6,y=2.45+.55*(x/4.6)**2;if(a.overhead==='lights'){s.rod([x,y,2],[x,y-.15,2],.008,gold);s.ball([.065,.09,.065],[x,y-.2,2],cream,10);}else s.surface((u,v,p)=>p.set(x+(u-.5)*.12,y-v*.65,2+Math.sin(v*5)*.1),cloth,{segments:[2,12]});}}
 const px=2.65,pz=-.65;
 if(a.story==='ready'){s.rod([px,.1,pz],[px,1.05,pz],.025,metalMaterial());s.box([.45,.35,.04],[px,1.1,pz],wood).rotateX(-.25);for(const sign of[-1,1])s.rod([px,.35,pz],[px+sign*.2,0,pz],.02,wood);for(let i=0;i<3;i++)s.box([.3,.06,.4],[px-.35,.03+i*.06,pz+.35],cream);}
 if(a.story==='rehearsal'){s.cylinder(.22,.22,.08,[px,.5,pz],wood,24);for(let i=0;i<3;i++){const t=i*Math.PI*2/3;s.rod([px+Math.cos(t)*.16,0,pz+Math.sin(t)*.16],[px+Math.cos(t)*.16,.5,pz+Math.sin(t)*.16],.03,wood);}s.box([.6,.12,.35],[px,.06,pz+.55],dark);s.box([.6,.35,.05],[px,.24,pz+.38],wood).rotateX(-.25);}
 if(a.story==='festival'){for(const side of[-1,1]){const x=side*2.65;s.cylinder(.23,.16,.35,[x,.175,.3],rib,18);for(let i=0;i<5;i++){const t=i*1.25;s.rod([x,.3,.3],[x+Math.sin(t)*.18,.75,.3+Math.cos(t)*.18],.012,green);s.ball([.1,.06,.1],[x+Math.sin(t)*.18,.75,.3+Math.cos(t)*.18],cloth,10);}}}
 if(a.story==='cleanup'){for(let i=0;i<4;i++)s.box([.6,.08,.42],[px,.04+i*.08,pz],wood);s.lathe([[.16,0],[.2,.3],[.17,.3],[.13,.035]],rib,[px,.0,pz+.65]);s.rod([px+.3,.08,pz+.6],[px+.6,1.1,pz+.6],.02,wood);s.box([.3,.12,.08],[px+.3,.06,pz+.6],rib);}
 for(let i=0;i<16;i++){const t=i*Math.PI*2/16,x=Math.sin(t)*5.25*b,z=Math.cos(t)*4.2;if(a.shore==='tide')s.ball([.55,.018,.32],[x,.02,z],water,16);else s.ball(a.shore==='moss'?[.32,.1,.28]:a.shore==='pebbles'?[.17,.075,.12]:[.12,.04,.09],[x,a.shore==='moss'?.09:.03,z],a.shore==='moss'?green:rib,12);}
 function metalMaterial(){return s.material('#737d76',{metalness:.5});}
 
 return world;
 }
});
