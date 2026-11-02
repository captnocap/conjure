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
  basket:choice("What shape is the great harbour basket?",{"flared": "A broad basket widens toward its rolled rim.", "straight": "A tall straight-sided hamper.", "low": "A low wide gathering basket.", "oval": "A broad oval basket with flattened sides."}),
  weave:choice("How is the basket woven?",{"plain": "Even alternating horizontal weave.", "paired": "Paired willow courses around upright stakes.", "bands": "Broad pale and dark woven bands.", "open": "Widely spaced ribs leave an airy open weave."}),
  rim:choice("How is the harbour rim finished?",{"braid": "A thick braided willow rim.", "bound": "A smooth rim with frequent binding loops.", "wood": "A narrow timber cap follows the basket edge.", "scallop": "Small repeated wicker arches finish the rim."}),
  gallery:choice("What runs around the inside wall?",{"single": "A single rear docking gallery.", "double": "Two short galleries at different heights.", "shelves": "Separate deep landing shelves along the rear.", "canopy": "A continuous gallery with a narrow canvas hood."}),
  balloons:choice("What shapes do the moored balloons have?",{"pear": "Pear-shaped lifting envelopes.", "round": "Round nearly spherical envelopes.", "long": "Tall narrow striped envelopes.", "squat": "Broad low pumpkin-shaped envelopes."}),
  sails:choice("How are the balloon envelopes divided?",{"stripes": "Alternating broad vertical fabric gores.", "panels": "Four large differently coloured fabric panels.", "net": "Thin cord netting lies over pale fabric.", "patches": "A few small repairs follow the curved fabric."}),
  rigging:choice("How are the balloons moored?",{"paired": "Two taut lines secure each balloon basket.", "four": "Four corner lines connect each basket to deck posts.", "reels": "Lines lead to little hand reels.", "chains": "Short linked-looking mooring lines reach heavy rings."}),
  boarding:choice("How do passengers reach the galleries?",{"stairs": "A broad two-flight timber stair.", "ladder": "A steep ladder with close-set wooden rungs.", "ramp": "A long narrow inclined gangway with side rails.", "lift": "A small rope-lift platform beside two guide posts."}),
  story:choice("What is happening before departure?",{"cargo": "Small parcels are stacked beside the central landing.", "repair": "Sailcloth and spare ribs lie on a supported repair table.", "waiting": "A bench and tied travel bags wait beneath the gallery.", "signal": "A bell and two signal flags announce a departure."}),
  ground:choice("What surrounds the basket port?",{"cloth": "Folded cloth bundles lie outside the rear walls.", "grass": "Low green tufts gather around the basket feet.", "pebbles": "A sparse ring of smooth stones surrounds the basket.", "chips": "Short wicker offcuts lie beside the workshop side."}),
  extent:score('How broad is this place?',['An intimate setting','A compact neighbourhood','A generous place','A broad miniature world'])
 },
 build(a,context){

 const b=mix(.94,1.1,a.extent),{world,art:s}=diorama(context,{width:13*b,depth:12,background:'#e0e3d6',floor:'#c3c6a8',yaw:24,pitch:30,maxHeight:1.6,radius:.85,slots:[[0,3.8],[-3.9,3.1],[3.9,3.1]],scale:[.7,1.2]});
 const willow=s.material('#b39768'),dark=s.material('#816c4a'),pale=s.material('#d5c49b'),wood=s.material('#9a7a52'),cloth=s.material('#b78f75',{side:THREE.DoubleSide}),green=s.material('#7e9272'),blue=s.material('#86a2a0'),rope=s.material('#c6b68d'),metal=s.material('#8b937d',{metalness:.45});
 const Z=-1.7,H=a.basket==='low'?1.8:2.65,R0=a.basket==='straight'?2.9:2.65,R1=a.basket==='straight'?2.9:a.basket==='low'?3.5:3.3,stretch=a.basket==='oval'?1.18:1,start=.72,end=Math.PI*2-.72;
 const rimPoint=(t:number,y:number,offset=0):P=>{const r=mix(R0,R1,y/H)+offset;return[Math.sin(t)*r*stretch*b,y+.16,Z+Math.cos(t)*r];};
 s.cylinder(R0,R0,.16,[0,.08,Z],wood,64).scale.set(stretch*b,1,1);
 // Alternating courses shift gently around the stakes, leaving the front cutaway open.
 const rows=a.weave==='open'?9:a.weave==='paired'?19:22,stakes=35;
 for(let i=0;i<stakes;i++){const t=mix(start,end,i/(stakes-1));s.rod(rimPoint(t,0),rimPoint(t,H),.035,dark);}
 for(let j=0;j<rows;j++){const y=(j+.45)/rows*H,ps:P[]=[];for(let i=0;i<=140;i++){const t=mix(start,end,i/140),off=.022*Math.sin((t-start)/(end-start)*(stakes-1)*Math.PI+(j%2)*Math.PI);ps.push(rimPoint(t,y,off));}fineTube(s,ps,a.weave==='bands'?.055:.029,a.weave==='bands'?(Math.floor(j/3)%2?dark:pale):willow);if(a.weave==='paired')fineTube(s,ps.map(p=>[p[0],p[1]+.05,p[2]] as P),.025,pale);}
 const rim:P[]=[];for(let i=0;i<=100;i++)rim.push(rimPoint(mix(start,end,i/100),H));fineTube(s,rim,a.rim==='wood'?.09:.065,a.rim==='wood'?wood:willow);
 if(a.rim==='braid')for(const sign of[-1,1]){const ps:P[]=[];for(let i=0;i<=160;i++){const t=mix(start,end,i/160),p=rimPoint(t,H,.045*Math.sin(i/160*30*Math.PI)*sign);ps.push([p[0],p[1]+.045*Math.cos(i/160*30*Math.PI)*sign,p[2]]);}fineTube(s,ps,.025,pale);}
 if(a.rim==='bound')for(let i=0;i<30;i++){const t=mix(start,end,i/29),p=rimPoint(t,H),ring=s.ring(.073,.012,p,rope);ring.rotation.y=t;}
 if(a.rim==='scallop')for(let i=0;i<24;i++){const t=mix(start,end,(i+.5)/24),p=rimPoint(t,H),tangent=new THREE.Vector3(Math.cos(t)*stretch*b,0,-Math.sin(t)).normalize(),ps:P[]=[];for(let k=0;k<=16;k++){const q=k*Math.PI/16;ps.push([p[0]+Math.cos(q)*.14*tangent.x,p[1]+Math.sin(q)*.13,p[2]+Math.cos(q)*.14*tangent.z]);}fineTube(s,ps,.022,pale);}
 // Rear galleries are annular decks, with beams that terminate on the woven wall stakes.
 const boardingAngle=a.gallery==='shelves'?Math.PI:3.65;
 const gallery=(y:number,t0:number,t1:number)=>{const rr=mix(R0,R1,y/H),inner=rr-.72;
  s.surface((u,v,p)=>{const t=mix(t0,t1,u),r=mix(inner,rr-.07,v);p.set(Math.sin(t)*r*stretch*b,y,Z+Math.cos(t)*r);},wood,{segments:[44,3],flip:true});
  for(let i=0;i<13;i++){const t=mix(t0,t1,i/12),x=Math.sin(t)*inner*stretch*b,z=Z+Math.cos(t)*inner;s.rod([x,0,z],[x,y-.035,z],.03,dark);s.rod([x,y-.035,z],rimPoint(t,y-.16),.035,wood);if(Math.abs(t-boardingAngle)>.21||Math.abs(y-1.25)>.01)s.rod([x,y,z],[x,y+.4,z],.018,wood);}
  let rail:P[]=[];const finishRail=()=>{if(rail.length>1)fineTube(s,rail,.022,wood);rail=[];};for(let i=0;i<=60;i++){const t=mix(t0,t1,i/60);if(Math.abs(t-boardingAngle)<.21&&Math.abs(y-1.25)<.01){finishRail();continue;}rail.push([Math.sin(t)*inner*stretch*b,y+.4,Z+Math.cos(t)*inner]);}finishRail();
 };
 const gy=1.25;
 if(a.gallery==='shelves')for(const t of[1.8,Math.PI,4.5])gallery(gy,t-.35,t+.35);else gallery(gy,1.45,Math.PI*2-1.45);
 if(a.gallery==='double')for(const side of[-1,1])gallery(1.9,side<0?3.6:1.6,side<0?4.65:2.65);
 if(a.gallery==='canopy'){
  const y=gy+.75,rr=mix(R0,R1,gy/H),roof=(t:number,v:number)=>new THREE.Vector3(Math.sin(t)*(rr-.07-v*.65)*stretch*b,y+.08*Math.sin(v*Math.PI),Z+Math.cos(t)*(rr-.07-v*.65));
  for(let j=0;j<8;j++){const t=1.5+j*(Math.PI*2-3)/7;for(const v of[.08,.92]){const p=roof(t,v);s.rod([p.x,gy,p.z],[p.x,p.y,p.z],.025,wood);}const rib:P[]=[];for(let k=0;k<=20;k++){const p=roof(t,k/20);p.y-=.01;rib.push(p.toArray() as [number,number,number]);}fineTube(s,rib,.02,wood);}
  s.surface((u,v,p)=>p.copy(roof(1.45+u*(Math.PI*2-2.9),v)),cloth,{segments:[44,6]});
 }
 const docks=[{x:-2.3*b,z:-1.7,y:3.9},{x:0,z:-3.25,y:4.35},{x:2.3*b,z:-1.7,y:4.05}];
 for(const [index,d]of docks.entries()){const rx=a.balloons==='long'?.58:a.balloons==='squat'?.98:.8,ry=a.balloons==='round'?.83:a.balloons==='squat'?.7:a.balloons==='long'?1.3:1.1;
  const position=(u:number,v:number,p=new THREE.Vector3())=>{const t=u*Math.PI*2,q=v*Math.PI,bulge=a.balloons==='pear'?mix(.68,1.12,v):1,rr=Math.sin(q)*rx*bulge;return p.set(d.x+Math.sin(t)*rr,d.y+Math.cos(q)*ry,d.z+Math.cos(t)*rr);};
  for(let j=0;j<12;j++)s.surface((u,v,p)=>position((j+u)/12,v,p),a.sails==='stripes'?(j%2?cloth:pale):a.sails==='panels'?([cloth,blue,pale,green][Math.floor(j/3)]):pale,{segments:[5,24],flip:true});
  for(let j=0;j<12;j++){const ps:P[]=[];for(let i=1;i<24;i++)ps.push(position(j/12,i/24).toArray() as [number,number,number]);fineTube(s,ps,.008,rope);}
  if(a.sails==='net')for(const v of[.25,.4,.55,.7]){const ps:P[]=[];for(let i=0;i<=48;i++)ps.push(position(i/48,v).toArray() as [number,number,number]);fineTube(s,ps,.01,dark);}
  if(a.sails==='patches')for(const [u,v]of[[.15,.4],[.61,.65]])s.surface((du,dv,p)=>{position(u+(du-.5)*.045,v+(dv-.5)*.09,p);const radial=new THREE.Vector3(p.x-d.x,0,p.z-d.z).normalize();p.addScaledVector(radial,.012);},cloth,{segments:[4,5]});
  const by=d.y-ry-.65;
  s.box([.55,.07,.5],[d.x,by,d.z],wood);for(const dx of[-.255,.255])s.box([.04,.3,.5],[d.x+dx,by+.15,d.z],willow);for(const dz of[-.23,.23])s.box([.55,.3,.04],[d.x,by+.15,d.z+dz],willow);
  for(const dx of[-.23,.23])for(const dz of[-.2,.2]){s.rod([d.x+dx,by+.3,d.z+dz],[d.x+dx*.8,d.y-ry+.12,d.z+dz*.8],.013,rope);}
  const anchors=a.rigging==='four'?[[-.4,-.3],[.4,-.3],[-.4,.3],[.4,.3]]:[[-.48,.15],[.48,.15]];
  for(const [dx,dz]of anchors){const x=d.x+dx,z=d.z+dz,base=.16;s.cylinder(.14,.16,.16,[x,.08,z],wood,16);s.cylinder(.08,.1,.2,[x,base+.1,z],wood,16);const A:P=[x,base+.2,z],B:P=[d.x+dx*.45,by+.1,d.z+dz*.45];s.rod(A,B,.012,a.rigging==='chains'?metal:rope);if(a.rigging==='chains')for(let j=0;j<8;j++){const t=(j+.5)/8,ring=s.ring(.022,.006,[mix(A[0],B[0],t),mix(A[1],B[1],t),mix(A[2],B[2],t)],metal);ring.rotation.y=(j%2)*Math.PI/2;}
   if(a.rigging==='reels'){s.rod([x-.15,base+.2,z],[x+.15,base+.2,z],.018,metal);for(const dd of[-.12,.12])s.cylinder(.12,.12,.025,[x+dd,base+.2,z],wood,16).rotateZ(Math.PI/2);s.cylinder(.07,.07,.22,[x,base+.2,z],rope,16).rotateZ(Math.PI/2);}}
 }
 // All boarding routes end on the selected annular shelf, through its rail opening.
 const inner=mix(R0,R1,gy/H)-.72,radial=(r:number,y:number)=>new THREE.Vector3(Math.sin(boardingAngle)*r*stretch*b,y,Z+Math.cos(boardingAngle)*r);
 const endPoint=radial(inner+.17,gy),startPoint=radial(.35,.16),horizontal=endPoint.clone().sub(startPoint).setY(0),run=horizontal.length(),forward=horizontal.clone().normalize(),across=new THREE.Vector3(forward.z,0,-forward.x),angle=Math.atan2(forward.x,forward.z);
 const at=(t:number,y:number,side=0)=>startPoint.clone().lerp(endPoint,t).setY(y).addScaledVector(across,side);
 const landing=s.box([.84,.08,.62],endPoint.clone().add(new THREE.Vector3(0,-.04,0)).toArray() as [number,number,number],wood);landing.rotation.y=angle;
 for(const side of[-.34,.34]){const p=endPoint.clone().addScaledVector(across,side);s.rod([p.x,0,p.z],[p.x,gy-.08,p.z],.035,dark);}
 if(a.boarding==='stairs'){
  for(let j=0;j<8;j++){const top=.16+(gy-.16)*(j+1)/8,p=at((j+.5)/8,(.16+top)/2);s.box([.75,top-.16,run/8+.012],p.toArray() as [number,number,number],wood).rotateY(angle);}
  for(const side of[-.34,.34]){const A=at(0,.55,side),B=at(1,gy+.4,side);s.rod(A.toArray() as [number,number,number],B.toArray() as [number,number,number],.025,wood);for(const t of[0,.5,1]){const p=at(t,.16,side);s.rod(p.toArray() as [number,number,number],at(t,mix(.55,gy+.4,t),side).toArray() as [number,number,number],.025,wood);}}
 }
 if(a.boarding==='ladder'){
  const A=endPoint.clone().addScaledVector(forward,-.78).setY(.16),B=endPoint.clone();
  for(const side of[-.25,.25]){const aa=A.clone().addScaledVector(across,side),bb=B.clone().addScaledVector(across,side);s.rod(aa.toArray() as [number,number,number],bb.toArray() as [number,number,number],.028,wood);}
  for(let j=0;j<8;j++){const p=A.clone().lerp(B,j/7);s.rod(p.clone().addScaledVector(across,-.25).toArray() as [number,number,number],p.clone().addScaledVector(across,.25).toArray() as [number,number,number],.02,pale);}
 }
 if(a.boarding==='ramp'){
  const direction=endPoint.clone().sub(startPoint),normal=new THREE.Vector3().crossVectors(direction,across).normalize(),middle=startPoint.clone().add(endPoint).multiplyScalar(.5).addScaledVector(normal,-.03),ramp=s.box([.7,.06,direction.length()],middle.toArray() as [number,number,number],wood);ramp.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(across,normal,direction.normalize()));
  for(const side of[-.32,.32]){s.rod(at(0,.55,side).toArray() as [number,number,number],at(1,gy+.4,side).toArray() as [number,number,number],.025,wood);for(const t of[0,.5,1])s.rod(at(t,.16,side).toArray() as [number,number,number],at(t,mix(.55,gy+.4,t),side).toArray() as [number,number,number],.025,wood);}
 }
 if(a.boarding==='lift'){
  const p=endPoint.clone().addScaledVector(forward,-.45);for(const side of[-.45,.45]){const q=p.clone().addScaledVector(across,side);s.rod([q.x,.16,q.z],[q.x,gy+.65,q.z],.035,wood);}
  const A=p.clone().addScaledVector(across,-.45).setY(gy+.65),B=p.clone().addScaledVector(across,.45).setY(gy+.65);s.rod(A.toArray() as [number,number,number],B.toArray() as [number,number,number],.035,wood);s.box([.8,.08,.65],[p.x,.5,p.z],wood).rotateY(angle);
  const pulley=s.cylinder(.11,.11,.06,[p.x,gy+.54,p.z],wood,20);pulley.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),across);
  s.rod([p.x,.54,p.z],[p.x,gy+.65,p.z],.01,rope);const weight=p.clone().addScaledVector(forward,.13);s.rod([weight.x,gy+.54,weight.z],[weight.x,.3,weight.z],.01,rope);s.box([.1,.16,.12],[weight.x,.22,weight.z],dark);
 }
 // A flat entry gangway meets the basket floor and ends before the foreground casting bays.
 s.box([1.3,.16,2.45],[0,.08,1.15],wood);for(const side of[-1,1])for(const z of[.15,1.2,2.3])s.rod([side*.57,0,z],[side*.57,.55,z],.025,wood);for(const side of[-1,1])s.rod([side*.57,.52,.15],[side*.57,.52,2.3],.025,wood);
 const sx=1.3,sz=.3;
 // The story station projects beyond the round basket floor on a supported apron.
 s.box([2.2,.16,1.8],[sx,.08,sz+.15],wood);
 if(a.story==='cargo')for(let j=0;j<5;j++){const x=sx+(j%2)*.35,z=sz+Math.floor(j/2)*.32;s.box([.3,.24,.28],[x,.28,z],pale);s.box([.02,.245,.285],[x,.28,z],rope);}
 if(a.story==='repair'){s.box([1.1,.07,.6],[sx,.7,sz],wood);for(const dx of[-.45,.45])for(const dz of[-.22,.22])s.rod([sx+dx,.16,sz+dz],[sx+dx,.7,sz+dz],.025,wood);s.box([.7,.02,.4],[sx,.745,sz],cloth);for(let j=0;j<4;j++)s.rod([sx-.45,.77+j*.012,sz-.2],[sx+.45,.77+j*.012,sz+.1],.012,pale);}
 if(a.story==='waiting'){bench(s,sx,.16,sz,1.3,wood);for(const x of[sx-.3,sx+.3])s.box([.3,.25,.25],[x,.285,sz+.5],cloth);}
 if(a.story==='signal'){for(const x of[sx-.4,sx+.4]){s.rod([x,.16,sz],[x,1.5,sz],.025,wood);s.box([.35,.22,.012],[x+.15,1.33,sz],blue);}s.rod([sx-.4,1.5,sz],[sx+.4,1.5,sz],.025,wood);s.rod([sx,1.5,sz],[sx,1.32,sz],.009,metal);s.cylinder(.05,.12,.18,[sx,1.23,sz],metal,20);}
 for(let i=0;i<12;i++){const t=1.5+i*(Math.PI*2-3)/11,x=Math.sin(t)*(R1+1)*stretch*b,z=Z+Math.cos(t)*(R1+1);if(a.ground==='cloth')s.box([.45,.08,.3],[x,.04,z],cloth);if(a.ground==='pebbles')s.ball([.18,.08,.14],[x,.07,z],pale,12);if(a.ground==='chips')for(let j=0;j<3;j++)s.rod([x-.15,.025+j*.025,z+j*.05],[x+.2,.025+j*.025,z+j*.05],.018,willow);if(a.ground==='grass')for(let j=0;j<5;j++)s.rod([x,0,z],[x+(j-2)*.05,.25+Math.abs(j-2)*.02,z],.014,green);}
 
 return world;
 }
});
