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
  layout:choice("How are the book islands arranged?",{"triad": "A large rear book and two smaller front volumes.", "chain": "Three volumes follow a diagonal crossing.", "cross": "A central book links to volumes on either side.", "bay": "Two side volumes shelter a broad open front bay."}),
  opening:choice("How do the open pages rise?",{"flat": "Broad gently bowed pages.", "cradled": "Steeply raised fore-edges form shallow valleys.", "fanned": "Small separated page fans rise at the outer edges.", "terraced": "Page bundles form low stepped shelves."}),
  edges:choice("What character do the paper edges have?",{"clean": "Straight smooth cut page edges.", "deckle": "Uneven deckle-cut edges.", "torn": "One irregular torn fore-edge.", "rolled": "A small curl turns up at the outer corners."}),
  binding:choice("How are the island books bound?",{"leather": "Dark leather covers with raised corner pads.", "cloth": "Cloth covers with a narrow spine tape.", "boards": "Heavy wood covers with small edge hinges.", "metal": "Metal-clad corners and thin strap clasps."}),
  spine:choice("What is visible in each central gutter?",{"rounded": "A rounded central cloth hinge.", "stitched": "A row of visible binding stitches.", "raised": "Raised thread bands cross the spine.", "hollow": "A dark narrow open gutter between the leaves."}),
  crossings:choice("What links the island books?",{"letters": "Broad letter-block stepping spans on low stringers.", "slats": "Closely spaced wooden bridge slats.", "ladder": "Ladder-like rungs with narrow handrails.", "rope": "Plank bridges with sagging rope handrails."}),
  settlement:choice("What grows from the open pages?",{"cottages": "Small steep-roofed cottages line the margins.", "towers": "Narrow round reading towers rise from the edges.", "gardens": "Pots and low beds make a page-top garden.", "archives": "Open miniature shelf houses hold tiny volumes."}),
  marker:choice("What marks the central chapter?",{"quill": "A tall quill pen stands in a little inkwell.", "bookmark": "A wide bookmark projects behind the far page.", "ribbon": "A long cloth ribbon falls from the gutter.", "leaf": "A pressed leaf spans the lower page margin."}),
  story:choice("What is happening along the causeway?",{"departure": "A small moored paper boat and tied parcels await departure.", "repair": "A spare plank stack and a little barrier mark repairs.", "reading": "Two reading stools face a low open volume.", "festival": "Pennants stretch between the island buildings."}),
  below:choice("What lies beneath the floating volumes?",{"clouds": "Rounded pale cloud banks.", "mist": "Low thin wisps in a quiet open void.", "ink": "Dark ink-like swirls beneath the pages.", "stars": "Small warm points and pale stars below the bridges."}),
  extent:score('How broad is this place?',['An intimate setting','A compact neighbourhood','A generous place','A broad miniature world'])
 },
 build(a,context){

 const b=mix(.93,1.1,a.extent);
 type Island={x:number,z:number,y:number,w:number,d:number};
 const islands:Island[]=a.layout==='triad'?[{x:0,z:-2,y:.5,w:4.7,d:3.1},{x:-3.7,z:1.3,y:.25,w:3,d:2.4},{x:3.7,z:1.3,y:.4,w:3,d:2.4}]:a.layout==='chain'?[{x:-3.5,z:-2.7,y:.5,w:3.4,d:2.6},{x:0,z:-.2,y:.35,w:4.3,d:3},{x:3.7,z:2.5,y:.25,w:3,d:2.4}]:a.layout==='cross'?[{x:0,z:-.4,y:.5,w:4.5,d:3.4},{x:-4.7,z:-.3,y:.25,w:3,d:2.7},{x:4.7,z:-.3,y:.4,w:3,d:2.7}]:[{x:0,z:-2.5,y:.5,w:4.8,d:2.9},{x:-4,z:.7,y:.25,w:3,d:3.3},{x:4,z:.7,y:.4,w:3,d:3.3}];
 for(const v of islands){v.x*=b;v.z*=b;v.w*=b;v.d*=b;}
 const {world,art:s}=diorama(context,{width:14*b,depth:11,background:'#dce2df',floor:'#bccbc9',yaw:23,pitch:33,maxHeight:1.8,radius:.9,slots:[...islands.map(v=>[v.x,v.z,v.y+.34,1] as const),[0,4.5]],scale:[.7,1.25]});
 const paper=s.material('#e2d9b9'),edge=s.material('#c3b491'),ink=s.material('#53696a'),wood=s.material('#8b7058'),green=s.material('#6f8a66',{side:THREE.DoubleSide}),cloud=s.material('#d8dfd3'),cloth=s.material('#9e6d60',{side:THREE.DoubleSide}),gold=s.material('#c4a568',{metalness:.5}),dark=s.material('#3d4a45');
 const cover=s.material(a.binding==='leather'?'#6b5545':a.binding==='cloth'?'#5e7e7c':a.binding==='boards'?'#a08259':'#9c9e88',{metalness:a.binding==='metal'?.55:0});
 const pageY=(x:number,w:number)=>.12+Math.sin(Math.abs(x)/w*Math.PI)*.16+(a.opening==='cradled'?.27*(Math.abs(x)/w)**2:a.opening==='terraced'?Math.floor(Math.abs(x)/w*4)*.045:.04*Math.abs(x)/w);
 for(const [index,book]of islands.entries()){const{x,z,y,w,d}=book,W=w/2;
  s.box([.92,.2,.92],[x,y+.24,z],wood);
  for(const sign of[-1,1]){const section=new THREE.Shape();section.moveTo(0,.05);for(let n=0;n<=28;n++){const xx=sign*n*W/28;section.lineTo(xx,pageY(xx,W)-.005);}section.lineTo(sign*W,.05);section.closePath();s.mesh(new THREE.ExtrudeGeometry(section,{depth:d,bevelEnabled:false,steps:1}),paper,[x,y,z-d/2]);s.box([W+.08,.1,d+.14],[x+sign*(W/2+.025),y,z],cover);s.surface((u,v,p)=>{const xx=sign*u*W,rough=a.edges==='deckle'?Math.sin(v*75)*.025:a.edges==='torn'&&sign>0?Math.sin(v*18)*.07:0;p.set(x+xx+(u>.96?rough:0),y+pageY(xx,W),z+(v-.5)*d);},paper,{segments:[28,12],flip:sign>0});
   for(let j=0;j<8;j++){const yy=y+.055+j*.009,ps:P[]=[];for(let i=0;i<=28;i++){const xx=sign*i*W/28;ps.push([x+xx,yy+(pageY(xx,W)-.12)*.55,z+d*.5]);}fineTube(s,ps,.006,edge);}
   // Fore-edge page block closes the open leaves, with small ruled page strata.
   s.box([.055,.1,d],[x+sign*W,y+.08,z],edge);for(let i=0;i<5;i++)s.rod([x+sign*(W+.03),y+.055+i*.02,z-d/2],[x+sign*(W+.03),y+.055+i*.02,z+d/2],.005,paper);
   if(a.opening==='fanned')for(let j=0;j<4;j++)s.box([.42,.012,d*.75],[x+sign*(W-.16),y+.18+j*.04,z],paper).rotateZ(sign*(.12+j*.07));
   if(a.edges==='rolled')for(const end of[-1,1]){const ps:P[]=[];for(let j=0;j<20;j++){const t=j/19*Math.PI*1.1;ps.push([x+sign*(W-.15+.15*Math.sin(t)),y+.16+.15*(1-Math.cos(t)),z+end*(d/2-.22)]);}s.tube(ps,.035,paper);}
   if(a.binding==='leather')for(const end of[-1,1])s.box([.3,.025,.3],[x+sign*(W-.12),y-.055,z+end*(d/2-.12)],wood);
   if(a.binding==='cloth')s.box([.16,.025,d+.08],[x+sign*.11,y-.06,z],cloth);
   if(a.binding==='boards')for(const end of[-1,1])s.box([.15,.16,.12],[x+sign*.09,y+.01,z+end*(d*.35)],gold);
   if(a.binding==='metal')for(const end of[-1,1]){s.box([.37,.025,.28],[x+sign*(W-.16),y-.06,z+end*(d/2-.1)],gold);s.box([.05,.18,.32],[x+sign*(W+.05),y+.02,z+end*(d*.27)],gold);}
  }
  if(a.spine==='rounded')s.rod([x,y+.12,z-d/2],[x,y+.12,z+d/2],.055,cloth);
  if(a.spine==='hollow')s.box([.11,.018,d],[x,y+.09,z],dark);
  if(a.spine==='stitched'||a.spine==='raised')for(let j=0;j<9;j++){const zz=z-d*.42+j*d*.105;if(a.spine==='stitched')s.tube([[x-.09,y+.14,zz-.035],[x,y+.1,zz],[x+.09,y+.14,zz+.035]],.009,wood);else s.rod([x-.2,y+.155,zz],[x+.2,y+.155,zz],.025,cloth);}
  for(const side of[-1,1])for(let k=0;k<2;k++){const xx=x+side*(W*.58),zz=z-d*.3+k*d*.6,yy=y+pageY(side*W*.58,W);s.box([.64,.14,.57],[xx,yy+.07,zz],edge);
   if(a.settlement==='cottages')cottage(s,xx,yy+.14,zz,.48,paper,cloth,dark);
   if(a.settlement==='towers'){s.cylinder(.2,.24,.85,[xx,yy+.565,zz],paper,24);s.cylinder(0,.29,.3,[xx,yy+1.14,zz],cloth,24);s.box([.1,.22,.02],[xx,yy+.55,zz+.215],dark);}
   if(a.settlement==='gardens'){for(let t=0;t<3;t++){s.cylinder(.095,.065,.18,[xx+(t-1)*.16,yy+.23,zz],wood,12);s.ball([.13,.2,.13],[xx+(t-1)*.16,yy+.46,zz],green,12);}}
   if(a.settlement==='archives'){s.box([.58,.6,.08],[xx,yy+.44,zz-.2],wood);for(const dx of[-.28,.28])s.box([.04,.6,.4],[xx+dx,yy+.44,zz],wood);for(let row=0;row<3;row++){s.box([.58,.035,.4],[xx,yy+.15+row*.2,zz],wood);for(let n=0;n<5;n++)s.box([.07,.14,.22],[xx+(n-2)*.1,yy+.24+row*.2,zz],n%2?cloth:paper);}}
  }
  // Pale clouds are the visible supports of this deliberately floating miniature.
  if(a.below==='clouds'||a.below==='mist')for(let j=0;j<5;j++)s.ball([w*.24,a.below==='clouds'?.32:.1,d*.3],[x+(j-2)*w*.16,y-.2,z+Math.sin(j)*.35],cloud,16);
  if(a.below==='ink')for(let j=0;j<3;j++){const ps:P[]=[];for(let k=0;k<=24;k++){const t=k/24*Math.PI*2;ps.push([x+Math.cos(t)*(w*.35+j*.1),.05+j*.035,z+Math.sin(t)*d*.24]);}s.tube(ps,.025,ink);}
  if(a.below==='stars')for(let j=0;j<8;j++){const xx=x+(context.random()-.5)*w,zz=z+(context.random()-.5)*d;s.ball([.045,.045,.045],[xx,.1+context.random()*.16,zz],gold,10);}
 }
 // Routes join the actual nearest page edges, including their different elevations.
 for(let i=1;i<islands.length;i++){const A=islands[i-1],B=islands[i],vx=B.x-A.x,vz=B.z-A.z,len=Math.hypot(vx,vz),ux=vx/len,uz=vz/len;
  const edgeA=Math.min(A.w/2/Math.max(.01,Math.abs(ux)),A.d/2/Math.max(.01,Math.abs(uz)))*.95,edgeB=Math.min(B.w/2/Math.max(.01,Math.abs(ux)),B.d/2/Math.max(.01,Math.abs(uz)))*.95;
  const ax=A.x+ux*edgeA,az=A.z+uz*edgeA,bx=B.x-ux*edgeB,bz=B.z-uz*edgeB,ay=A.y+pageY(ax-A.x,A.w/2),by=B.y+pageY(bx-B.x,B.w/2);
  const from=new THREE.Vector3(ax,ay,az),to=new THREE.Vector3(bx,by,bz),along=to.clone().sub(from).normalize(),across=new THREE.Vector3(uz,0,-ux),up=along.clone().cross(across).normalize(),span=from.distanceTo(to),steps=Math.max(4,Math.ceil(span/.18));
  const thickness=a.crossings==='letters'?.1:.04,rotation=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(across,up,along));
  // Deck tops meet page edges; tilted slats bear directly on parallel stringers.
  const beamFrom=from.clone().addScaledVector(up,-thickness-.032),beamTo=to.clone().addScaledVector(up,-thickness-.032);
  for(const side of[-1,1]){const beam=s.rod(beamFrom.clone().addScaledVector(along,-.025).addScaledVector(across,side*.22).toArray() as [number,number,number],beamTo.clone().addScaledVector(along,.025).addScaledVector(across,side*.22).toArray() as [number,number,number],.035,wood);beam.name='book-bridge-stringer';}
  for(let j=0;j<=steps;j++){
   const top=from.clone().lerp(to,j/steps),center=top.clone().addScaledVector(up,-thickness/2),width=a.crossings==='letters'||a.crossings==='ladder'?.46:.53;
   const slat=s.box([width,thickness,span/steps*.88],center.toArray() as [number,number,number],a.crossings==='letters'?paper:wood);slat.quaternion.copy(rotation);slat.name='book-bridge-slat';
   if(a.crossings==='letters')for(const size of[[.04,.018,.09],[.13,.018,.025]] as P[]){const mark=s.box(size,top.clone().addScaledVector(up,.009).toArray() as [number,number,number],ink);mark.quaternion.copy(rotation);}
  }
  if(a.crossings==='rope'||a.crossings==='ladder'){
   // Transverse end bearers carry the guard posts outside the narrow deck edge.
   for(const end of[beamFrom,beamTo])s.rod(end.clone().addScaledVector(across,-.34).toArray() as [number,number,number],end.clone().addScaledVector(across,.34).toArray() as [number,number,number],.03,wood);
   for(const side of[-1,1]){const footA=beamFrom.clone().addScaledVector(across,side*.3),footB=beamTo.clone().addScaledVector(across,side*.3),aa:P=[footA.x,ay+.55,footA.z],bb:P=[footB.x,by+.55,footB.z];s.rod(footA.toArray() as [number,number,number],aa,.025,wood);s.rod(footB.toArray() as [number,number,number],bb,.025,wood);s.tube([aa,[(aa[0]+bb[0])/2,(aa[1]+bb[1])/2-(a.crossings==='rope'?.16:0),(aa[2]+bb[2])/2],bb],.014,a.crossings==='rope'?cloth:wood);}
  }
 }
 const C=islands[0],mx=C.x,mz=C.z-C.d*.36,my=C.y+.14;
 if(a.marker==='quill'){s.lathe([[.2,0],[.22,.17],[.13,.24],[.1,.24]],ink,[mx,my,mz]);s.rod([mx,my+.16,mz],[mx+.4,my+1.5,mz],.018,wood);const feather=leaf(s,[mx+.28,my+.95,mz],1.1,.35,paper,.08);feather.rotation.z=1.28;}
 if(a.marker==='bookmark'){s.box([.55,1.5,.04],[mx,my+.72,mz],cloth);for(let i=0;i<3;i++)s.box([.35,.045,.018],[mx,my+.5+i*.3,mz+.03],gold);}
 if(a.marker==='ribbon')s.surface((u,v,p)=>p.set(mx+(u-.5)*.25,my+.018-Math.max(0,v-.65)*.8,C.z-C.d/2+v*(C.d+.7)),cloth,{segments:[3,28]});
 if(a.marker==='leaf')leaf(s,[mx,my+.04,C.z+C.d*.35],1.7,.65,green,.05);
 const sx=C.x+C.w*.35,sz=C.z+C.d*.3,sy=C.y+pageY(C.w*.35,C.w/2);
 if(a.story==='departure'){s.box([.4,.22,.3],[sx,sy+.11,sz],wood);s.box([.025,.23,.31],[sx,sy+.11,sz],paper);s.surface((u,v,p)=>p.set(sx-.6+(u-.5)*.65,sy+.2+Math.abs(v-.5)*.25,sz+(v-.5)*.35),paper,{segments:[6,4],flip:true});}
 if(a.story==='repair'){for(let i=0;i<4;i++)s.box([.7,.035,.1],[sx,sy+.0175+i*.035,sz+i*.025],wood);for(const dx of[-.25,.25])s.rod([sx+dx,sy,sz+.3],[sx+dx,sy+.4,sz+.3],.02,wood);s.box([.65,.08,.04],[sx,sy+.35,sz+.3],cloth);}
 if(a.story==='reading'){for(const dx of[-.3,.3]){s.cylinder(.15,.15,.06,[sx+dx,sy+.33,sz],wood,20);s.cylinder(.055,.1,.3,[sx+dx,sy+.15,sz],wood,16);}s.box([.45,.1,.3],[sx,sy+.05,sz+.3],paper);}
 if(a.story==='festival'){for(const dx of[-.6,.6])s.rod([sx+dx,sy,sz],[sx+dx,sy+1,sz],.02,wood);s.tube([[sx-.6,sy+1,sz],[sx,sy+.8,sz],[sx+.6,sy+1,sz]],.009,wood);for(let i=0;i<6;i++){const x=sx-.5+i*.2;s.box([.12,.15,.018],[x,sy+.75+.2*((x-sx)/.6)**2,sz],i%2?cloth:green);}}
 
 return world;
 }
});
