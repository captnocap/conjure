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
  dome:choice("What shape encloses the cutaway globe?",{"round": "A round hemispherical glass dome.", "tall": "A high oval glass dome.", "low": "A broad low dome.", "faceted": "A dome divided into broad flat glass facets."}),
  base:choice("How is the globe displayed?",{"wood": "A dark turned wooden base.", "brass": "A brass-edged stepped pedestal.", "stone": "A pale carved stone base.", "music": "A wooden music-box base with winding key."}),
  town:choice("What buildings form the permanent town?",{"cottages": "Three small cottages with steep roofs.", "towers": "Three narrow round towers with conical roofs.", "terraces": "Three joined low houses with a continuous cornice.", "cabins": "Three timber cabins with visible wall courses."}),
  snow:choice("Where does the snow remain?",{"rear": "A deep snowbank remains behind the houses.", "roofs": "Small drifts linger on roofs and at their feet.", "patches": "Separate patches linger beside the stream.", "ridge": "A winding snow ridge marks the edge of the thaw."}),
  water:choice("How does meltwater pass the town?",{"stream": "A narrow winding stream crosses the town.", "pond": "A broad small pond joins the meltwater run.", "channels": "Two shallow channels meet beneath the bridge.", "gutter": "A straight stone-lined meltwater gutter."}),
  bridge:choice("What crosses the thaw?",{"wood": "A plank footbridge with timber handrails.", "stone": "A shallow stone bridge with short parapets.", "steps": "Broad stepping slabs connect the two banks.", "iron": "A light iron bridge with curved side rails."}),
  trees:choice("What trees frame the town?",{"fir": "Small conical fir trees.", "bare": "Bare trees with branching twigs.", "buds": "Bare branches carry a few new buds.", "pollards": "Short pollarded trees with rounded crowns."}),
  square:choice("What stands in the town square?",{"clock": "A small freestanding clock tower.", "well": "A roofed stone well.", "bench": "Two benches face a small planter.", "bandstand": "An open timber bandstand with a little roof."}),
  story:choice("What changes with the thaw?",{"boots": "A pair of boots and a shovel wait beside a doorway.", "flowers": "New flowers appear in small pots beside the houses.", "sled": "A wooden sled rests on the remaining snow.", "laundry": "Light fabric hangs from a supported drying line."}),
  flakes:choice("What is suspended in the glass?",{"settled": "Only a few settled flakes remain on the snowbanks.", "sparse": "A sparse swirl of white flakes hangs behind the town.", "stars": "Small gold stars drift above the rear roofs.", "melt": "A few clear drops hang along the inside of the dome."}),
  extent:score('How broad is this place?',['An intimate setting','A compact neighbourhood','A generous place','A broad miniature world'])
 },
 build(a,context){

 const b=mix(.94,1.1,a.extent),Y=.32,R=4.9*b,H=R*(a.dome==='tall'?1.18:a.dome==='low'?.75:1),{world,art:s}=diorama(context,{width:12*b,depth:11,background:'#e2e6e0',floor:'#bbc9c0',yaw:23,pitch:29,maxHeight:1.5,radius:.8,slots:[[0,3.3,Y,1],[-3.4,1.9,Y,1],[3.4,1.9,Y,1]],scale:[.65,1.1]});
 const wood=s.material('#887057'),pale=s.material('#d8d4be'),snow=s.material('#e6e9df'),blue=s.material('#829fa1'),dark=s.material('#53675f'),roof=s.material('#997c6b'),green=s.material('#7b9069'),gold=s.material('#b9a16d',{metalness:.55}),glass=s.material('#a9c8c6',{transparent:true,opacity:.23,depthWrite:false,side:THREE.DoubleSide,roughness:.14}),water=s.material('#8fb0b0',{roughness:.2}),cloth=s.material('#b49b87',{side:THREE.DoubleSide});
 const baseMat=a.base==='brass'?gold:a.base==='stone'?pale:wood;
 s.cylinder(R+.2,R+.35,.2,[0,.1,0],baseMat,64);s.cylinder(R+.1,R+.18,.1,[0,.25,0],dark,64);s.cylinder(R,R,.06,[0,Y-.03,0],pale,64);
 for(const y of[.055,.17])s.ring(R+.25,.025,[0,y,0],a.base==='stone'?dark:gold).rotateX(Math.PI/2);
 if(a.base==='music'){s.rod([R*.55,.15,R*.82],[R*.55,.15,R*1.02],.035,gold);for(const x of[R*.55-.12,R*.55+.12])s.ring(.12,.025,[x,.15,R*1.02],gold);}
 // Rear half of the glass dome is present; the front is a deliberate cutaway for casting.
 s.surface((u,v,p)=>{const t=Math.PI/2+u*Math.PI,q=v*Math.PI/2;p.set(Math.sin(t)*Math.cos(q)*R,Y+Math.sin(q)*H,Math.cos(t)*Math.cos(q)*R);},glass,{segments:[a.dome==='faceted'?12:56,a.dome==='faceted'?8:24]});
 s.ring(R,.045,[0,Y,0],blue).rotateX(Math.PI/2);
 const outline:P[]=[];for(let i=0;i<=64;i++){const t=i*Math.PI/64;outline.push([Math.cos(t)*R,Y+Math.sin(t)*H,0]);}fineTube(s,outline,.027,blue);
 const homes=[[-2.5,-1.65],[0,-2.5],[2.5,-1.65]];
 for(const [x,z]of homes){const w=1.18,h=1.3;s.box([w+.18,.12,.99],[x,Y+.06,z],dark);
  if(a.town==='towers'){s.cylinder(.51,.58,1.8,[x,Y+1.02,z],pale,28);s.cylinder(0,.7,.65,[x,Y+2.245,z],roof,28);s.box([.24,.65,.025],[x,Y+.445,z+.568],dark);for(const dx of[-.24,.24])s.box([.14,.2,.03],[x+dx,Y+1.35,z+.48],blue);}
  else{ s.box([w,h,.88],[x,Y+.12+h/2,z],a.town==='cabins'?wood:pale);s.box([.28,.63,.03],[x,Y+.435,z+.455],dark);for(const side of[-1,1])s.box([.2,.24,.03],[x+side*.35,Y+1,z+.458],blue);
   if(a.town==='terraces'){s.box([w+.2,.18,1.08],[x,Y+1.42,z],roof);s.box([w+.08,.09,.99],[x,Y+1.56,z],pale);}
   else {s.cylinder(0,w*.86,.65,[x,Y+1.745,z],roof,4).rotateY(Math.PI/4);s.box([.17,.45,.18],[x+.28,Y+1.93,z-.15],dark);}
   if(a.town==='cabins')for(let i=0;i<8;i++)s.box([w+.035,.025,.91],[x,Y+.2+i*.15,z],dark);
  }
  if(a.snow==='roofs'){const yy=Y+(a.town==='towers'?2.55:a.town==='terraces'?1.62:2.05);s.ball([.24,.08,.2],[x,yy,z],snow,16);s.ball([.5,.12,.3],[x-.35,Y+.1,z+.5],snow,16);}
  if(a.story==='flowers')for(const side of[-1,1]){const xx=x+side*.7;s.cylinder(.13,.09,.2,[xx,Y+.1,z+.1],roof,16);for(let j=0;j<4;j++){s.rod([xx,Y+.2,z+.1],[xx+(j-1.5)*.045,Y+.45,z+.1],.009,green);s.ball([.06,.04,.06],[xx+(j-1.5)*.045,Y+.45,z+.1],gold,10);}}
 }
 if(a.town==='terraces')for(const side of[-1,1]){const x=side*1.25;s.box([1.35,.9,.7],[x,Y+.45,-2.05],pale);s.box([1.45,.1,.85],[x,Y+.95,-2.05],roof);}
 const path=(t:number)=>new THREE.Vector3(mix(-4.2*b,4.2*b,t),Y+.015,a.water==='gutter'?.25:.15+.38*Math.sin(t*Math.PI*2));
 const river:P[]=[];for(let i=0;i<=64;i++){const p=path(i/64);river.push(p.toArray() as [number,number,number]);}s.surface((u,v,p)=>{const c=path(u);p.set(c.x,c.y,c.z+(v-.5)*.65);},water,{segments:[64,4],flip:true});
 for(const side of[-1,1]){const pts=river.map(p=>[p[0],Y+.04,p[2]+side*.36] as P);fineTube(s,pts,a.water==='gutter'?.07:.045,blue);}
 if(a.water==='pond')s.ball([1.25,.025,.8],[-1.6,Y+.015,.25],water,32);
 if(a.water==='channels')s.surface((u,v,p)=>p.set((v-.5)*.36,Y+.018,-1.5+u*1.8),water,{segments:[4,24]});
 // Crossing has fixed piers on the banks; three cast bays stay on the dry foreground.
 if(a.bridge==='steps')for(let i=0;i<5;i++)s.box([.7,.07,.26],[0,Y+.035,-.45+i*.27],pale);
 else{const m=a.bridge==='stone'?pale:a.bridge==='iron'?dark:wood;s.box([.95,.08,1.5],[0,Y+.15,.15],m);for(const z of[-.48,.78])s.box([1,.15,.22],[0,Y+.075,z],dark);for(const side of[-1,1]){for(const z of[-.45,.15,.75])s.rod([side*.43,Y+.19,z],[side*.43,Y+.6,z],.025,m);if(a.bridge==='iron')s.tube([[side*.43,Y+.6,-.45],[side*.43,Y+.75,.15],[side*.43,Y+.6,.75]],.025,m);else s.rod([side*.43,Y+.6,-.45],[side*.43,Y+.6,.75],.03,m);}}
 for(let i=0;i<10;i++){const t=Math.PI*.6+i*Math.PI*.8/9,x=Math.sin(t)*3.9,z=Math.cos(t)*3.9;if(a.snow==='rear'||a.snow==='ridge')s.ball([a.snow==='ridge'?.6:.8,.14+(i%3)*.035,.45],[x,Y+.1,z],snow,16);if(a.snow==='patches')s.ball([.35+(i%2)*.15,.045,.2],[x*.72,Y+.03,z*.55],snow,16);}
 for(const side of[-1,1])for(let k=0;k<2;k++){const x=side*(3.15+k*.45),z=-2.5+k*.8;s.rod([x,Y,z],[x,Y+1.5,z],.06,wood);if(a.trees==='fir')for(let j=0;j<3;j++)s.cylinder(0,.48-j*.1,.65,[x,Y+.65+j*.4,z],green,12);else if(a.trees==='pollards')s.ball([.45,.4,.38],[x,Y+1.5,z],green,16);else for(let j=0;j<5;j++){const sign=j%2?1:-1,yy=Y+.6+j*.16;s.rod([x,yy,z],[x+sign*.35,yy+.3,z+.12],.025,wood);if(a.trees==='buds')s.ball([.07,.085,.07],[x+sign*.35,yy+.3,z+.12],green,10);}}
 const qx=0,qz=-1.05;
 if(a.square==='clock'){s.box([.4,1.4,.35],[qx,Y+.7,qz],wood);s.cylinder(.26,.26,.055,[qx,Y+1.35,qz+.2],pale,28).rotateX(Math.PI/2);s.rod([qx,Y+1.35,qz+.235],[qx,Y+1.52,qz+.235],.012,dark);s.rod([qx,Y+1.35,qz+.235],[qx+.12,Y+1.35,qz+.235],.012,dark);s.cylinder(0,.36,.3,[qx,Y+1.65,qz],roof,4).rotateY(Math.PI/4);}
 if(a.square==='well'){s.lathe([[.35,0],[.35,.42],[.26,.42],[.26,.06]],pale,[qx,Y,qz]);for(const x of[-.44,.44])s.rod([x,Y,qz],[x,Y+1.15,qz],.04,wood);s.cylinder(0,.63,.4,[qx,Y+1.35,qz],roof,4).rotateY(Math.PI/4);s.rod([-.44,Y+.85,qz],[.44,Y+.85,qz],.035,wood);s.rod([0,Y+.85,qz],[0,Y+.35,qz],.01,dark);}
 if(a.square==='bench'){for(const x of[-.75,.75])bench(s,x,Y,qz,.65,wood);s.box([.4,.25,.4],[0,Y+.125,qz],wood);s.ball([.22,.18,.2],[0,Y+.35,qz],green,12);}
 if(a.square==='bandstand'){s.cylinder(.7,.75,.16,[0,Y+.08,qz],wood,8);for(let j=0;j<6;j++){const t=j*Math.PI/3;s.rod([Math.sin(t)*.6,Y+.16,qz+Math.cos(t)*.6],[Math.sin(t)*.6,Y+1.35,qz+Math.cos(t)*.6],.03,wood);}s.cylinder(0,.85,.5,[0,Y+1.6,qz],roof,6);}
 if(a.story==='boots'){for(const x of[-2.78,-2.56]){s.box([.13,.16,.26],[x,Y+.08,-.97],dark);s.cylinder(.065,.07,.28,[x,Y+.23,-1.04],dark,16);}s.rod([-2.1,Y+.08,-1.05],[-1.98,Y+1.1,-1.15],.018,wood);s.box([.22,.22,.035],[-2.1,Y+.11,-1.05],blue);}
 if(a.story==='sled'){
  const x=2.8,z=-3.25,patchTop=Y+.075;
  // A local flat-topped remnant supports the sled even when other snow is only on roofs.
  const patch=s.lathe([[0,0],[.45,0],[.5,.02],[.5,.05],[.45,.075],[0,.075]],snow,[x,Y,z]);patch.scale.z=1.5;patch.name='sled-snow-remnant';
  const sled=new Sculpture(context);sled.root.name='supported-sled';s.root.add(sled.root);
  for(const dx of[-.22,.22])sled.tube([[x+dx,Y+.17,z-.55],[x+dx,Y+.1,z+.3],[x+dx,Y+.25,z+.55]],.025,wood);
  sled.box([.6,.06,.85],[x,Y+.25,z],wood);for(const dx of[-.2,.2])for(const dz of[-.25,.25])sled.rod([x+dx,Y+.11,z+dz],[x+dx,Y+.22,z+dz],.025,wood);
  sled.root.updateMatrixWorld(true);sled.root.position.y+=patchTop-new THREE.Box3().setFromObject(sled.root,true).min.y;
 }
 if(a.story==='laundry'){for(const x of[-1,1])s.rod([x,Y,-3.3],[x,Y+1.4,-3.3],.03,wood);s.rod([-1,Y+1.4,-3.3],[1,Y+1.4,-3.3],.01,dark);for(let i=0;i<4;i++)s.box([.3,.5,.015],[(i-1.5)*.43,Y+1.15,-3.3],i%2?cloth:pale);}
 if(a.flakes==='settled')for(let i=0;i<12;i++){const t=Math.PI*.65+i*Math.PI*.7/11;s.ball([.025,.015,.025],[Math.sin(t)*3.9,Y+.25,Math.cos(t)*3.9],snow,8);}
 else for(let i=0;i<40;i++){const t=Math.PI/2+context.random()*Math.PI,q=.15+context.random()*.95,rr=R*(a.flakes==='melt'?.98:.72),x=Math.sin(t)*Math.cos(q)*rr,y=Y+Math.sin(q)*H,z=Math.cos(t)*Math.cos(q)*rr;if(a.flakes==='stars'){const ob=s.box([.09,.09,.018],[x,y,z],gold);ob.rotation.z=Math.PI/4;}else s.ball(a.flakes==='melt'?[.028,.05,.028]:[.023,.023,.023],[x,y,z],a.flakes==='melt'?glass:snow,8);}
 
 return world;
 }
});
