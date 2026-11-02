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
  curls:choice("How do the giant shavings curl?",{"open": "Two broad open curls face a central gap.", "spiral": "Two shavings wind into inward spirals.", "unequal": "A tall curl faces a lower wide curl.", "nested": "A smaller shaving rests within each great curl."}),
  edges:choice("What shape do the shaving edges have?",{"smooth": "Smooth continuous shaved edges.", "scalloped": "Regular rounded scallops mark the cut.", "ragged": "Small uneven notches interrupt the edge.", "points": "Repeating sharp pencil-sharpener teeth."}),
  grain:choice("What runs through the exposed wood?",{"fine": "Many fine lines follow the curl.", "bands": "Broad alternating pale grain bands.", "knots": "Long grain lines bend around visible knots.", "plain": "A few restrained straight grain lines."}),
  paint:choice("What colour survives along the pencil edge?",{"ochre": "A narrow ochre painted edge.", "green": "A forest-green painted edge.", "red": "A muted red lacquer strip.", "bare": "Only pale unpainted wood."}),
  homes:choice("What shelters the tiny settlement?",{"cabins": "Small pitched-roof wooden cabins.", "tubes": "Short hollow pencil-stub houses with round doors.", "alcoves": "Open-front shelf houses beneath the curls.", "towers": "Narrow timber lookout houses on four legs."}),
  paths:choice("How do the cliff paths run?",{"boards": "Closely laid boards on trestles.", "lattice": "A light deck over crossed trestle braces.", "rails": "Wide planks have paired guard rails.", "covered": "Short covered galleries shade the path ends."}),
  bridge:choice("What crosses between the curls?",{"plank": "A plain plank bridge with side rails.", "arch": "A shallow arch supports the central span.", "rope": "A plank bridge carries sagging rope handrails.", "truss": "Triangular timber trusses brace the bridge sides."}),
  pencil:choice("What lies behind the shaving canyon?",{"hex": "A giant hexagonal pencil with a pointed graphite tip.", "round": "A round wooden pencil with a sharpened end.", "flat": "A wide flat carpenter pencil.", "stub": "A short blunt pencil stub with a visible graphite core."}),
  story:choice("What is happening in the settlement?",{"repair": "Spare planks and a small saw rest beside the gallery.", "market": "A tiny counter holds baskets under a cloth roof.", "drawing": "A sheet of paper and a small graphite stick rest on a desk.", "departure": "Tied parcels and a hand sled wait beside the stairs."}),
  floor:choice("What lies on the desk around the curls?",{"dust": "Small piles of pale shaving dust.", "chips": "A few short curved wood chips.", "graphite": "Tiny dark graphite fragments.", "paper": "Several flat scraps of ruled paper."}),
  extent:score('How broad is this place?',['An intimate setting','A compact neighbourhood','A generous place','A broad miniature world'])
 },
 build(a,context){

 const b=mix(.93,1.12,a.extent),{world,art:s}=diorama(context,{width:13*b,depth:10,background:'#e5e0d1',floor:'#c5b899',yaw:25,pitch:31,maxHeight:1.6,radius:.9,slots:[[0,3.55],[-3.9,2.5],[3.9,2.5]],scale:[.7,1.15]});
 const pale=s.material('#dcc59a',{side:THREE.DoubleSide}),wood=s.material('#b49160'),grain=s.material('#927547'),dark=s.material('#5b5849'),green=s.material('#70846a'),paper=s.material('#e5dcc1'),cloth=s.material('#a9846d',{side:THREE.DoubleSide}),rope=s.material('#c0ad83'),paint=s.material(a.paint==='green'?'#69846a':a.paint==='red'?'#ab7461':a.paint==='ochre'?'#bc9b54':'#d3b886');
 const curls=[{x:-2.75*b,z:-1.85,r:a.curls==='unequal'?2.3:2.0,side:1},{x:2.75*b,z:-1.85,r:a.curls==='unequal'?1.65:2.0,side:-1}];
 for(const c of curls){const turns=a.curls==='spiral'?1.38:a.curls==='open'?.91:1.1;
  const pos=(u:number,v:number,offset=0)=>{const t=-Math.PI/2+u*Math.PI*2*turns,r=c.r-u*.7+offset,edgeWave=a.edges==='scalloped'?.055*Math.cos(u*24*Math.PI):a.edges==='ragged'?.045*(Math.sin(u*65)+Math.sin(u*33)):a.edges==='points'?.06*(1-2*Math.abs((u*18)%1-.5)):0;return new THREE.Vector3(c.x+c.side*Math.cos(t)*r,c.r+Math.sin(t)*r,c.z+(v-.5)*(1.75+edgeWave*2));};
  for(const inner of[false,true])s.surface((u,v,p)=>p.copy(pos(u,v,inner?-.035:.035)),inner?pale:wood,{segments:[100,10],flip:inner?c.side>0:c.side<0});
  for(const v of[0,1]){s.surface((u,w,p)=>p.copy(pos(u,v,mix(-.035,.035,w))),paint,{segments:[100,2],flip:c.side>0?v===1:v===0});const edge:P[]=[];for(let i=0;i<=100;i++)edge.push(pos(i/100,v).toArray() as [number,number,number]);fineTube(s,edge,.025,paint);}
  for(const u of[0,1])s.surface((v,w,p)=>p.copy(pos(u,v,mix(-.035,.035,w))),pale,{segments:[8,2],flip:u===0});
  const count=a.grain==='plain'?3:a.grain==='fine'?11:6;
  for(let j=0;j<count;j++){const v=(j+1)/(count+1),ps:P[]=[];for(let i=0;i<=100;i++){const u=i/100,p=pos(u,v,.041);if(a.grain==='knots')p.z+=.06*Math.sin(u*Math.PI*4)*Math.exp(-(((u-.55)*7)**2));ps.push(p.toArray() as [number,number,number]);}fineTube(s,ps,a.grain==='bands'?.018:.006,grain);}
  if(a.grain==='knots')for(const u of[.22,.58]){const center=pos(u,.5,.044),t=-Math.PI/2+u*Math.PI*2*turns;const knot=s.ring(.07,.012,center.toArray() as [number,number,number],grain);knot.rotation.y=c.side*t;}
  if(a.curls==='nested'){const ps:P[]=[];for(let j=0;j<=64;j++){const t=-Math.PI/2+j/64*Math.PI*1.6;ps.push([c.x+c.side*Math.cos(t)*.83,.84+Math.sin(t)*.83,c.z]);}s.tube(ps,.045,pale);}
  // Each inhabited ledge has its own ground-reaching trestles beneath the curl edge.
  const x=c.x,z=-.55,y=.72;s.box([1.8,.1,1.15],[x,y-.05,z],wood);for(const dx of[-.68,.68])for(const dz of[-.43,.43])s.rod([x+dx,0,z+dz],[x+dx,y-.1,z+dz],.045,grain);
  if(a.homes==='cabins')cottage(s,x,y,z,.9,pale,paint,dark);
  if(a.homes==='tubes'){s.cylinder(.42,.42,.9,[x,y+.42,z],wood,16).rotateX(Math.PI/2);s.cylinder(.2,.2,.025,[x,y+.32,z+.46],dark,24).rotateX(Math.PI/2);s.ring(.22,.025,[x,y+.32,z+.48],pale);}
  if(a.homes==='alcoves'){s.box([1,.8,.08],[x,y+.4,z-.38],wood);for(const dx of[-.5,.5])s.box([.08,.8,.8],[x+dx,y+.4,z],wood);s.box([1.12,.1,.94],[x,y+.85,z],paint);s.box([.7,.08,.6],[x,y+.35,z],wood);s.box([.35,.2,.3],[x,y+.49,z],paper);}
  if(a.homes==='towers'){for(const dx of[-.3,.3])for(const dz of[-.25,.25])s.rod([x+dx,y,z+dz],[x+dx,y+1,z+dz],.035,wood);cottage(s,x,y+1,z,.7,pale,paint,dark);s.box([.8,.08,.7],[x,y+.96,z],wood);for(let j=0;j<6;j++)s.rod([x-.2,y+j*.16,z+.35],[x+.2,y+j*.16,z+.35],.02,wood);for(const dx of[-.22,.22])s.rod([x+dx,y,z+.35],[x+dx,y+1,z+.35],.025,wood);}
 }
 const deckY=.65,z=.5;
 for(let i=0;i<29;i++){const x=(i-14)*.27*b;s.box([.25*b,.08,.68],[x,deckY-.04,z],wood);}
 for(const sign of[-1,1]){s.rod([-3.9*b,deckY-.1,z+sign*.25],[3.9*b,deckY-.1,z+sign*.25],.045,grain);for(let j=0;j<9;j++){const x=(j-4)*.94*b;s.rod([x,0,z+sign*.24],[x,deckY-.08,z+sign*.24],.035,wood);if(a.paths==='lattice'&&j<8)s.rod([x,0,z+sign*.24],[x+.94*b,deckY-.08,z+sign*.24],.025,grain);if(a.paths==='rails'||Math.abs(x)<1.5)s.rod([x,deckY,z+sign*.33],[x,deckY+.4,z+sign*.33],.025,wood);}if(a.paths==='rails')s.rod([-3.9*b,deckY+.4,z+sign*.33],[3.9*b,deckY+.4,z+sign*.33],.025,wood);}
 for(const side of[-1,1]){const zz=z+side*.34;if(a.bridge==='rope')s.tube([[-1.5,deckY+.4,zz],[0,deckY+.28,zz],[1.5,deckY+.4,zz]],.02,rope);else s.rod([-1.5,deckY+.4,zz],[1.5,deckY+.4,zz],.025,wood);if(a.bridge==='arch'){arc(s,[0,.1,zz],1.5,.5,0,Math.PI,.045,grain);s.rod([0,.1,zz],[0,deckY-.1,zz],.03,wood);}if(a.bridge==='truss')for(let i=0;i<4;i++){const x=-1.5+i*.75;s.rod([x,deckY,zz],[x+.375,deckY+.4,zz],.025,wood);s.rod([x+.375,deckY+.4,zz],[x+.75,deckY,zz],.025,wood);}}
 if(a.paths==='covered')for(const sign of[-1,1]){const x=sign*3;for(const dx of[-.6,.6])for(const dz of[-.32,.32])s.rod([x+dx,deckY,z+dz],[x+dx,deckY+1.05,z+dz],.025,wood);s.box([1.4,.06,.9],[x,deckY+1.08,z],paint);}
 for(let i=0;i<5;i++){const h=deckY*(5-i)/5;s.box([.85,h,.25],[0,h/2,.95+i*.25],wood);}
 const pencilParts=new Set(s.root.children);
 const px=-.1,pz=-3.65,length=a.pencil==='stub'?3.6:7.7*b,py=.22;
 if(a.pencil==='flat'){s.box([length,.2,.5],[px,py,pz],paint);s.cylinder(0,.2,.55,[px+length/2+.275,py,pz],pale,4).rotateZ(-Math.PI/2);}
 else {s.cylinder(.22,.22,length,[px,py,pz],paint,a.pencil==='round'?32:6).rotateZ(Math.PI/2);if(a.pencil!=='stub'){s.cylinder(0,.22,.65,[px+length/2+.325,py,pz],pale,a.pencil==='round'?32:6).rotateZ(-Math.PI/2);s.cylinder(0,.065,.2,[px+length/2+.7,py,pz],dark,12).rotateZ(-Math.PI/2);}else s.cylinder(.065,.065,.025,[px+length/2+.013,py,pz],dark,16).rotateZ(Math.PI/2);}
 const pencilGroup=new THREE.Group();for(const node of [...s.root.children])if(!pencilParts.has(node))pencilGroup.add(node);s.root.add(pencilGroup);pencilGroup.updateMatrixWorld(true);pencilGroup.position.y-=new THREE.Box3().setFromObject(pencilGroup,true).min.y;
 const tx=4.9*b,tz=-.6;
 if(a.story==='repair'){for(let i=0;i<4;i++)s.box([.8,.04,.2],[tx,.02+i*.04,tz],wood);s.box([.55,.015,.15],[tx,.175,tz],dark);s.box([.1,.06,.15],[tx+.3,.19,tz],wood);}
 if(a.story==='market'||a.story==='drawing'){s.box([.95,.07,.65],[tx,.65,tz],wood);for(const dx of[-.38,.38])for(const dz of[-.24,.24])s.rod([tx+dx,0,tz+dz],[tx+dx,.65,tz+dz],.03,wood);if(a.story==='drawing'){s.box([.7,.008,.44],[tx,.689,tz],paper);s.rod([tx-.2,.71,tz-.1],[tx+.25,.71,tz+.1],.02,dark);}else{for(const dx of[-.38,.38])s.rod([tx+dx,.65,tz],[tx+dx,1.3,tz],.025,wood);s.box([1.05,.03,.75],[tx,1.315,tz],cloth);for(let i=0;i<3;i++)s.lathe([[.08,0],[.12,.13],[.1,.13],[.06,.025]],pale,[tx+(i-1)*.25,.685,tz]);}}
 if(a.story==='departure'){for(const dx of[-.2,.2])s.rod([tx+dx,.06,tz-.5],[tx+dx,.06,tz+.5],.035,wood);s.box([.55,.08,.85],[tx,.135,tz],wood);for(let i=0;i<3;i++)s.box([.4,.2,.25],[tx,.275+Math.floor(i/2)*.2,tz+(i%2-.5)*.28],paper);}
 for(let i=0;i<12;i++){const x=-5.2*b+(i%6)*2.05*b,z=i<6?-4.25:4.35;if(a.floor==='dust')s.ball([.22,.05,.15],[x,.04,z],pale,10);if(a.floor==='graphite')s.ball([.09,.055,.07],[x,.05,z],dark,6);if(a.floor==='paper'){s.box([.45,.008,.3],[x,.004,z],paper);for(let j=0;j<4;j++)s.box([.35,.002,.005],[x,.009,z-.09+j*.06],blueMaterial());}if(a.floor==='chips'){const pts:P[]=[];for(let j=0;j<=12;j++){const t=j/12*Math.PI;pts.push([x+Math.cos(t)*.22,.02+Math.sin(t)*.09,z]);}s.tube(pts,.022,pale);}}
 function blueMaterial(){return s.material('#9caeaa');}
 
 return world;
 }
});
