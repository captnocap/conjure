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
  leaf:choice("What shape forms the leaf harbour?",{"lance": "A long narrow pointed leaf.", "heart": "A broad heart-like leaf with rounded shoulders.", "lobed": "A broad leaf with gently scalloped lobes.", "oval": "A wide oval leaf narrowing to a short tip."}),
  curl:choice("How does the leaf curve?",{"flat": "A shallow gently cupped deck.", "cupped": "Both edges rise into a deep protective cup.", "tip": "The far tip curls upward.", "side": "One side curls higher than the other."}),
  veins:choice("How do the leaf veins divide?",{"paired": "Paired side veins branch from the midrib.", "forked": "Each side vein divides again near the edge.", "net": "Small cross veins connect the main branches.", "raised": "Thick raised veins become visible deck ribs."}),
  apron:choice("What makes the launch apron?",{"planks": "A broad plank apron on short piers.", "lattice": "A light crossed lattice beneath a solid launch deck.", "stone": "Pale flat paving on a supported terrace.", "leaflets": "Overlapping small leaf panels cover a timber deck."}),
  masts:choice("What holds the tether lines?",{"forks": "Forked wooden masts.", "tripods": "Three-legged tall tether frames.", "arches": "Two broad bentwood arches.", "paired": "Pairs of straight posts carry crossbars."}),
  kites:choice("What kind of permanent kites wait above the port?",{"diamonds": "Two classic diamond kites with cross spars.", "boxes": "Two open box kites with framed square cells.", "wings": "Two broad shallow wing kites.", "fish": "Two long fish-shaped kites with forked tails."}),
  rigging:choice("How are the tether ropes managed?",{"reels": "Small hand reels on axle stands.", "capstans": "Upright hand capstans on round bases.", "cleats": "Broad timber cleats on anchored blocks.", "loops": "Coiled ropes hang from low horn-shaped hooks."}),
  shelter:choice("What shelters the launch crew?",{"canopy": "A narrow cloth canopy on posts.", "pod": "An open seed-pod waiting booth.", "screen": "Two low woven wind screens.", "bench": "An open long bench with a small sun hood."}),
  story:choice("What is happening before flight?",{"folding": "Folded sailcloth and spare spars lie on a worktable.", "departure": "Tied travel bundles wait beside the apron.", "repair": "A kite frame and spare ribs rest on a repair rack.", "landing": "A furled kite rests in a long cradle on the ground."}),
  signals:choice("What shows the wind?",{"sock": "A cloth wind sock on a tall pole.", "ribbons": "Several long streamers hang from a crossbar.", "vanes": "Two arrow-shaped weather vanes.", "chimes": "A row of hollow chimes hangs from a small supported yoke."}),
  extent:score('How broad is this place?',['An intimate setting','A compact neighbourhood','A generous place','A broad miniature world'])
 },
 build(a,context){

 const b=mix(.92,1.12,a.extent),{world,art:s}=diorama(context,{width:13*b,depth:11,background:'#dce5d5',floor:'#bfcbb2',yaw:24,pitch:30,maxHeight:1.6,radius:.9,slots:[[-3.9,3.4,.14,1],[0,3.4,.14,1],[3.9,3.4,.14,1]],scale:[.7,1.2]});
 const green=s.material('#8fa56d',{side:THREE.DoubleSide}),vein=s.material('#687e4a'),wood=s.material('#917857'),pale=s.material('#d8cba5'),dark=s.material('#4c6255'),cloth=s.material('#b78b72',{side:THREE.DoubleSide}),blue=s.material('#7c9c99',{side:THREE.DoubleSide}),rope=s.material('#c5b58b'),metal=s.material('#8e9a84',{metalness:.4});
 const L=7,W=(a.leaf==='lance'?3.15:a.leaf==='heart'?4.7:4.2)*b,Z=-1.1;
 const point=(u:number,v:number,p=new THREE.Vector3())=>{const shape=a.leaf==='heart'?Math.pow(Math.sin(Math.PI*u),.55):a.leaf==='oval'?Math.pow(Math.sin(Math.PI*u),.72):Math.sin(Math.PI*u),lobes=a.leaf==='lobed'?1+.075*Math.cos(u*Math.PI*10):1,x=(v-.5)*2*W*shape*lobes,z=Z+(u-.5)*L,cupping=(a.curl==='cupped'?.75:.3)*(2*Math.abs(v-.5))**2,tip=a.curl==='tip'?.9*(1-u)**4:a.curl==='side'?.5*v*v:0;return p.set(x,.2+cupping+tip+.08*Math.sin(u*Math.PI),z);};
 const leafY=(x:number,z:number)=>{const u=THREE.MathUtils.clamp((z-Z)/L+.5,.001,.999),half=point(u,1).x,v=.5+x/(2*half);return point(u,v).y;};
 const leafPad=(x:number,z:number,w:number,d:number)=>{const corners=[[-w*.42,-d*.42],[w*.42,-d*.42],[-w*.42,d*.42],[w*.42,d*.42]],top=Math.max(leafY(x,z),...corners.map(([dx,dz])=>leafY(x+dx,z+dz)))+.12; s.box([w,.08,d],[x,top-.04,z],wood);for(const [dx,dz]of corners)s.rod([x+dx,leafY(x+dx,z+dz),z+dz],[x+dx,top-.08,z+dz],.025,wood);return top;};
 s.surface((u,v,p)=>point(u,v,p),green,{segments:[64,28]});
 const mid:P[]=[];for(let i=0;i<=64;i++)mid.push(point(i/64,.5).toArray() as [number,number,number]);fineTube(s,mid,a.veins==='raised'?.075:.045,vein);
 for(const side of[0,1]){const edge:P[]=[];for(let i=0;i<=64;i++)edge.push(point(i/64,side).toArray() as [number,number,number]);fineTube(s,edge,.025,vein);}
 for(let j=1;j<=8;j++)for(const side of[-1,1]){const u=.22+(j-1)*.085,ps:P[]=[];for(let i=0;i<=20;i++){const t=i/20,p=point(u-t*.13,.5+side*.48*t);p.y+=.02;ps.push(p.toArray() as [number,number,number]);}fineTube(s,ps,a.veins==='raised'?.045:.022,vein);
  if(a.veins==='forked')for(const t of[.48,.72]){const qs:P[]=[];for(let i=0;i<=12;i++){const n=i/12,p=point(u-t*.13-n*.09,.5+side*(.48*t+n*.14));p.y+=.023;qs.push(p.toArray() as [number,number,number]);}fineTube(s,qs,.012,vein);}
 }
 if(a.veins==='net')for(let j=0;j<7;j++)for(const side of[-1,1])for(const t of[.4,.72]){const u=.22+j*.085-t*.13,v=.5+side*.48*t,ps:P[]=[];for(let k=0;k<=12;k++){const f=k/12,p=point(u+f*.085,v+side*Math.sin(f*Math.PI)*.014);p.y+=.025;ps.push(p.toArray() as [number,number,number]);}fineTube(s,ps,.011,vein);}
 // Underleaf ribs and short piers support the botanical deck without occupying cast bays.
 for(const u of[.22,.42,.62,.8]){const left=point(u,.2),right=point(u,.8);s.rod([left.x,left.y-.04,left.z],[right.x,right.y-.04,right.z],.04,wood);for(const p of[left,right])s.rod([p.x,0,p.z],[p.x,p.y-.04,p.z],.045,wood);}
 s.tube([[0,.2,2.4],[0,.16,2.9],[.2,.06,3.2]],.08,vein);
 // The three casting bays have the same flat floor regardless of leaf curvature.
 s.box([11.3*b,.14,2.15],[0,.07,3.5],a.apron==='stone'?pale:wood);
 if(a.apron==='planks')for(let i=0;i<25;i++)s.box([.015,.008,2.08],[(i-12)*.44*b,.144,3.5],dark);
 if(a.apron==='lattice')for(let i=0;i<12;i++){const x=(i-5.5)*.9*b;s.rod([x-.4,0,2.5],[x+.4,.12,4.5],.025,dark);s.rod([x+.4,0,2.5],[x-.4,.12,4.5],.025,dark);}
 if(a.apron==='stone')for(let i=0;i<14;i++)s.box([.012,.006,2.1],[(i-6.5)*.8*b,.144,3.5],vein);
 if(a.apron==='leaflets')for(let i=0;i<10;i++){const x=(i-4.5)*1.08*b;leaf(s,[x,.15,2.6],.95,.48,green,.03).rotateY(Math.PI/2);}
 // Permanent masts sit on known leaf coordinates and carry fully tethered sails.
 for(const side of[-1,1]){const base=point(.39,side<0?.14:.86),x=base.x,z=base.z,y=base.y; s.cylinder(.21,.25,.08,[x,y+.04,z],wood,20);
  const top:P=[x,2.9,z],foot:P=[x,y+.08,z];
  if(a.masts==='tripods'){for(let j=0;j<3;j++){const t=j*Math.PI*2/3;const xx=x+Math.cos(t)*.3,zz=z+Math.sin(t)*.3;s.rod([xx,0,zz],top,.035,wood);}}
  else if(a.masts==='paired')for(const dx of[-.22,.22]){s.rod([x+dx,0,z],[x+dx,2.9,z],.045,wood);s.rod([x-.25,2.9,z],[x+.25,2.9,z],.04,wood);}
  else if(a.masts==='arches'){s.tube([[x-.35,0,z],[x-.35,2.5,z],[x,2.9,z],[x+.35,2.5,z],[x+.35,0,z]],.05,wood);}
  else{s.rod(foot,top,.05,wood);s.rod([x,2.5,z],[x-side*.33,3.05,z],.035,wood);}
  const kite=new THREE.Group(),kx=x-side*.4,ky=3.8,kz=z-.45;kite.position.set(kx,ky,kz);kite.rotation.set(-.22,side*.2,side*.2);s.root.add(kite);
  const local=(size:P,at:P,m:THREE.Material)=>{const ob=s.box(size,[0,0,0],m);kite.add(ob);ob.position.set(...at);return ob;};
  const sail=(points:number[][],m:THREE.Material)=>{const geo=new THREE.BufferGeometry(),pos:number[]=[];const spans=[0,1,2].map(axis=>Math.max(...points.map(p=>p[axis]))-Math.min(...points.map(p=>p[axis]))),pairs=[[0,1],[1,2],[0,2]],axes=pairs.sort((a,b)=>spans[b[0]]*spans[b[1]]-spans[a[0]]*spans[a[1]])[0];for(const face of THREE.ShapeUtils.triangulateShape(points.map(p=>new THREE.Vector2(p[axes[0]],p[axes[1]])),[]))for(const i of face)pos.push(...points[i]);geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.computeVertexNormals();const ob=new THREE.Mesh(geo,m);kite.add(ob);};
  if(a.kites==='diamonds'){sail([[0,.85,0],[-.6,0,0],[0,-.95,0],[.6,0,0]],cloth);local([.026,1.82,.026],[0,-.05,.018],wood);local([1.22,.026,.026],[0,0,.018],wood);}
  if(a.kites==='boxes'){for(const cy of[-.5,.5]){for(const xx of[-.4,.4])local([.02,.65,.02],[xx,cy,0],wood);for(const yy of[cy-.325,cy+.325])for(const zz of[-.3,.3])local([.82,.02,.02],[0,yy,zz],wood);for(const xx of[-.4,.4]){sail([[xx,cy-.32,-.3],[xx,cy+.32,-.3],[xx,cy+.32,.3],[xx,cy-.32,.3]],cloth);for(const zz of[-.3,.3])local([.02,1.65,.02],[xx,0,zz],wood);}}}
  if(a.kites==='wings'){sail([[-1.05,0,0],[0,.35,.15],[1.05,0,0],[.35,-.35,0],[0,-.12,.12],[-.35,-.35,0]],blue);local([2.1,.025,.025],[0,0,.015],wood);local([.025,.68,.025],[0,0,.13],wood);}
  if(a.kites==='fish'){sail([[0,.9,0],[-.45,.2,0],[-.18,-.45,0],[-.45,-.8,0],[0,-.65,0],[.45,-.8,0],[.18,-.45,0],[.45,.2,0]],cloth);local([.025,1.6,.025],[0,.1,.018],wood);local([.91,.025,.025],[0,.2,.018],wood);local([.06,.06,.015],[-.12,.51,.025],dark);}
  kite.updateMatrixWorld(true);const anchor=new THREE.Vector3(0,0,.03).applyMatrix4(kite.matrixWorld),tail=new THREE.Vector3(0,-.9,0).applyMatrix4(kite.matrixWorld);s.tube([top,[mix(x,anchor.x,.5),3.2,mix(z,anchor.z,.5)],anchor.toArray() as [number,number,number]],.012,rope);
  if(a.kites==='diamonds')s.tube([tail.toArray() as [number,number,number],[tail.x+side*.1,tail.y-.25,tail.z],[tail.x-side*.12,tail.y-.55,tail.z+.1]],.025,cloth);
  const rx=x+side*.5,rz=z+.65,ry=leafPad(rx,rz,.55,.45);s.rod(top,[rx,ry+(a.rigging==='reels'?.35:a.rigging==='capstans'?.23:a.rigging==='cleats'?.18:.4),rz],.012,rope);
  if(a.rigging==='reels'){for(const dx of[-.2,.2])s.rod([rx+dx,ry,rz],[rx+dx,ry+.4,rz],.035,wood);s.rod([rx-.3,ry+.35,rz],[rx+.3,ry+.35,rz],.025,metal);for(const dx of[-.16,.16])s.cylinder(.17,.17,.035,[rx+dx,ry+.35,rz],wood,20).rotateZ(Math.PI/2);s.cylinder(.1,.1,.29,[rx,ry+.35,rz],rope,20).rotateZ(Math.PI/2);}
  if(a.rigging==='capstans'){s.cylinder(.12,.17,.35,[rx,ry+.175,rz],wood,20);s.rod([rx-.28,ry+.36,rz],[rx+.28,ry+.36,rz],.025,dark);}
  if(a.rigging==='cleats'){s.rod([rx,ry,rz],[rx,ry+.18,rz],.045,wood);s.rod([rx-.25,ry+.18,rz],[rx+.25,ry+.18,rz],.045,wood);}
  if(a.rigging==='loops'){s.rod([rx,ry,rz],[rx,ry+.45,rz],.03,wood);s.rod([rx,ry+.4,rz],[rx,ry+.4,rz+.15],.025,wood);for(let i=0;i<4;i++)s.ring(.12,.012,[rx,ry+.28,rz+.08+i*.017],rope);}
 }
 const sx=0,sz=-2.65,shelterY=leafPad(sx,sz,1.8,1.1);
 bench(s,sx,shelterY,sz,1.45,wood);
 if(a.shelter==='canopy'||a.shelter==='bench'){const h=shelterY+(a.shelter==='canopy'?1.9:1.45),roofY=(z:number)=>h+.16*Math.sin(((z-sz)/1.15+.5)*Math.PI);for(const x of[-.8,.8]){for(const z of[sz-.45,sz+.45])s.rod([x,shelterY,z],[x,roofY(z),z],.035,wood);const rib:P[]=[];for(let i=0;i<=24;i++){const z=sz-.575+i*1.15/24;rib.push([x,roofY(z)-.014,z]);}fineTube(s,rib,.02,wood);}s.surface((u,v,p)=>p.set((u-.5)*1.85,h+.16*Math.sin(v*Math.PI),sz+(v-.5)*1.15),cloth,{segments:[12,12]});}
 if(a.shelter==='pod'){s.surface((u,v,p)=>{const t=u*Math.PI;p.set(Math.cos(t)*1.05,shelterY+Math.sin(t)*1.55,sz+(v-.5)*1.1);},green,{segments:[28,8]});for(const z of[sz-.55,sz+.55]){arc(s,[0,shelterY,z],1.05,1.55,0,Math.PI,.045,vein);for(const x of[-1.05,1.05])s.rod([x,leafY(x,z),z],[x,shelterY,z],.035,wood);}}
 if(a.shelter==='screen')for(const side of[-1,1]){const x=side*.96;for(const z of[sz-.5,sz+.5])s.rod([x,leafY(x,z),z],[x,shelterY+1.25,z],.04,wood);for(let i=0;i<10;i++)s.rod([x,shelterY+.2+i*.1,sz-.5],[x,shelterY+.2+i*.1,sz+.5],.025,pale);}
 const tx=4.8*b,tz=.4;
 if(a.story==='folding'){s.box([1,.07,.7],[tx,.62,tz],wood);for(const dx of[-.4,.4])for(const dz of[-.25,.25])s.rod([tx+dx,0,tz+dz],[tx+dx,.62,tz+dz],.03,wood);for(let i=0;i<5;i++)s.box([.55,.018,.4],[tx,.664+i*.018,tz],i%2?cloth:blue);}
 if(a.story==='departure')for(let i=0;i<4;i++){s.box([.36,.24,.35],[tx+(i%2-.5)*.4,.12+Math.floor(i/2)*.24,tz],pale);s.box([.025,.245,.355],[tx+(i%2-.5)*.4,.12+Math.floor(i/2)*.24,tz],rope);}
 if(a.story==='repair'){for(const z of[tz-.35,tz+.35]){s.rod([tx-.4,0,z],[tx,.75,z],.035,wood);s.rod([tx+.4,0,z],[tx,.75,z],.035,wood);}s.rod([tx,.75,tz-.5],[tx,.75,tz+.5],.035,wood);for(let i=0;i<6;i++)s.rod([tx-.36+i*.12,.78,tz-.55],[tx-.36+i*.12,.78,tz+.55],.017,pale);}
 if(a.story==='landing'){s.box([.5,.12,1.5],[tx,.06,tz],wood);for(const z of[tz-.55,tz+.55])for(const dx of[-.2,.2])s.rod([tx+dx,.12,z],[tx+dx,.45,z],.025,wood);s.cylinder(.13,.13,1.35,[tx,.29,tz],cloth,16).rotateX(Math.PI/2);}
 const wx=-4.9*b,wz=.7;s.rod([wx,0,wz],[wx,2.3,wz],.035,wood);
 if(a.signals==='sock'){s.rod([wx,2.3,wz],[wx+.5,2.3,wz],.018,metal);s.ring(.16,.018,[wx+.5,2.3,wz],metal).rotateY(Math.PI/2);s.mesh(new THREE.CylinderGeometry(.08,.16,.75,20,1,true),cloth,[wx+.875,2.3,wz]).rotateZ(Math.PI/2);}
 if(a.signals==='ribbons'||a.signals==='chimes'){s.rod([wx-.45,2.3,wz],[wx+.45,2.3,wz],.025,wood);for(let i=0;i<6;i++){const x=wx+(i-2.5)*.15;if(a.signals==='chimes'){s.rod([x,2.3,wz],[x,2.1,wz],.008,rope);s.cylinder(.035,.035,.4+i*.025,[x,1.9-i*.0125,wz],metal,12);}else s.surface((u,v,p)=>p.set(x+(u-.5)*.08,2.3-v*.7,wz+Math.sin(v*5)*.1),i%2?cloth:blue,{segments:[2,12]});}}
 if(a.signals==='vanes'){s.rod([wx-.4,2.3,wz],[wx+.4,2.3,wz],.02,metal);s.cylinder(0,.12,.25,[wx+.38,2.3,wz],wood,3).rotateZ(-Math.PI/2);s.box([.2,.2,.02],[wx-.3,2.3,wz],cloth);s.rod([wx,1.9,wz-.3],[wx,1.9,wz+.3],.02,metal);}
 
 return world;
 }
});
