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
  cap:choice("What is the giant sorting-house cap like?",{"round": "A low broad rounded mushroom cap.", "point": "A tall pointed conical cap.", "umbrella": "A shallow umbrella cap with a flared rim.", "tiers": "Two overlapping mushroom-cap tiers."}),
  stem:choice("What supports the cap and sorting hall?",{"fluted": "A pale fluted open stem.", "timber": "A half-open timber drum with visible posts.", "stone": "A thick stone stem with broad side buttresses.", "roots": "A central shell of bark with branching root braces."}),
  sorting:choice("How are the permanent pigeonholes arranged?",{"wide": "Two wide low cabinets of letter slots.", "tall": "Two tall narrow cabinets with deep pigeonholes.", "stepped": "Two stepped sorting racks beneath the cap.", "paired": "Four short matching sorting cabinets."}),
  chutes:choice("How do letters leave the sorting windows?",{"open": "Open wooden troughs descend to the collection bins.", "covered": "Open troughs have intermittent little weather covers.", "forked": "Each descending trough splits into two collection branches.", "stepped": "Three short overlapping troughs form a stepped letter run."}),
  bins:choice("How is outgoing mail collected?",{"wood": "Low timber bins divided into two compartments.", "baskets": "Woven-look round collection baskets on timber platforms.", "trays": "Open sloping shallow collection trays.", "sacks": "Pale open sacks stand inside supporting wood hoops."}),
  paths:choice("What connects the sorting house to the lanes?",{"planks": "Short board paths connect the front court and side bins.", "tiles": "Cream and green tile strips mark the route.", "stones": "Rows of broad stepping stones cross the court.", "ribs": "Two dark rails border each pale delivery lane."}),
  dispatch:choice("What stands in the dispatch court?",{"scale": "A small mechanical parcel scale on a permanent counter.", "table": "A broad tying table with twine and wrapping sheets.", "rack": "An open rack holds rolled delivery maps.", "cubby": "A compact return cabinet with one open door."}),
  signals:choice("What announces the post?",{"bell": "A hanging brass bell on a supported bracket.", "flags": "Two small flag masts flank the stem.", "lanterns": "Warm little lanterns hang beneath the cap rim.", "clock": "A round clock with hands hangs over the sorting opening."}),
  story:choice("What is happening with the mail?",{"arrival": "Tied parcels wait beside an open collection tray.", "sorting": "Loose envelopes and folded notes cover the dispatch counter.", "repair": "A spare chute plank and tools rest on the work apron.", "closed": "A small barrier crosses the sorting entrance and the trays are clear."}),
  garden:choice("What grows at the crossroads?",{"ferns": "Tall fern stems stand beyond the side lanes.", "buttons": "Small round mushrooms gather along the rear border.", "moss": "Low moss cushions frame the sorting hall.", "roots": "Exposed roots curl around the back of the stem."}),
  extent:score('How broad is this place?',['An intimate setting','A compact neighbourhood','A generous place','A broad miniature world'])
 },
 build(a,context){

 const b=mix(.9,1.12,a.extent),{world,art:s}=diorama(context,{width:12*b,depth:10,background:'#dce2cd',floor:'#bdc3a1',yaw:23,pitch:30,maxHeight:1.8,radius:1.05,slots:[[0,3],[-3.8,1.6],[3.8,1.6]],scale:[.65,1.25]});
 const wood=s.material('#8a6b47'),dark=s.material('#4f5c43'),pale=s.material('#d7cfad'),cap=s.material('#ae7e62'),rim=s.material('#cbb289'),green=s.material('#708956',{side:THREE.DoubleSide}),paper=s.material('#e6ddc2'),gold=s.material('#b8a365',{metalness:.5}),ink=s.material('#687e79'),rope=s.material('#b9aa83'),glow=s.material('#dcca8f',{emissive:'#c7af6e',emissiveIntensity:mix(.1,.7,1-context.mood.daylight)});
 const Z=-2.2,H=2.5,R=2.9*b,stemR=1.12,body=a.stem==='timber'||a.stem==='roots'?wood:pale;
 // A cut-away stem opens into the permanent postal sorting room.
 s.mesh(new THREE.CylinderGeometry(stemR,stemR*1.12,H,48,1,true,.85,Math.PI*2-1.7),body,[0,H/2,Z]);
 s.cylinder(stemR*.98,stemR*.98,.12,[0,.06,Z],wood,40);
 for(const side of[-1,1])s.box([.13,H,.16],[side*.86,H/2,Z+.75],wood);
 s.box([1.85,.14,.22],[0,H-.07,Z+.75],wood);
 if(a.stem==='fluted')for(let i=0;i<17;i++){const t=.9+i*(Math.PI*2-1.8)/16;s.rod([Math.sin(t)*stemR,.08,Z+Math.cos(t)*stemR],[Math.sin(t)*stemR,H,Z+Math.cos(t)*stemR],.045,rim);}
 if(a.stem==='timber')for(const x of[-.78,.78])s.rod([x,.12,Z+.3],[x,H-.1,Z+.3],.065,dark);
 if(a.stem==='stone')for(const x of[-1.1,1.1]){s.box([.35,.5,.7],[x,.25,Z],rim);s.rod([x*1.25,.3,Z],[x*.9,1.75,Z],.14,rim);}
 if(a.stem==='roots')for(let i=0;i<7;i++){const t=.9+i*(Math.PI*2-1.8)/6;s.tube([[Math.sin(t)*.85,.85,Z+Math.cos(t)*.85],[Math.sin(t)*1.4,.16,Z+Math.cos(t)*1.4],[Math.sin(t)*1.8,.025,Z+Math.cos(t)*1.8]],.065,wood);}
 const rise=a.cap==='point'?1.6:a.cap==='umbrella'?.55:1;
 if(a.cap==='round')s.surface((u,v,p)=>{const t=u*Math.PI*2,q=v*Math.PI/2;p.set(Math.sin(t)*Math.sin(q)*R,H+Math.cos(q)*rise,Z+Math.cos(t)*Math.sin(q)*R);},cap,{segments:[64,20],flip:true});
 else s.cylinder(0,R,rise,[0,H+rise/2,Z],cap,64);
 s.cylinder(R,R,.08,[0,H-.04,Z],pale,64);s.ring(R,.045,[0,H,Z],rim).rotateX(Math.PI/2);
 if(a.cap==='tiers'){s.cylinder(0,R*.58,.8,[0,H+1.03,Z],cap,48);s.ring(R*.58,.035,[0,H+.63,Z],rim).rotateX(Math.PI/2);}
 for(let i=0;i<22;i++){const t=i*Math.PI/11;s.rod([Math.sin(t)*.9,H-.05,Z+Math.cos(t)*.9],[Math.sin(t)*R*.96,H-.05,Z+Math.cos(t)*R*.96],.018,rim);}
 const cabinet=(x:number,z:number,width:number,height:number,cols:number,rows:number)=>{const depth=.4,base=.12;s.box([width,.09,depth],[x,base+.045,z],wood);s.box([width,height,.055],[x,base+height/2,z-.19],wood);for(let c=0;c<=cols;c++)s.box([.035,height,depth],[x-width/2+c*width/cols,base+height/2,z],wood);for(let row=0;row<=rows;row++){const y=base+row*height/rows;s.box([width,.035,depth],[x,y+.0175,z],wood);if(row<rows)for(let c=0;c<cols;c++)if((row+c)%3!==2){const xx=x-width/2+(c+.5)*width/cols,n=1+(row+c)%3;for(let k=0;k<n;k++)s.box([width/cols*.68,.014,.24],[xx,y+.042+k*.014,z+.025],(k+row)%2?paper:ink);}}s.box([width,.12,depth*.9],[x,.06,z],dark);};
 for(const side of[-1,1]){const x=side*1.75,z=Z+.25;if(a.sorting==='tall')cabinet(x,z,.7,1.85,2,6);else if(a.sorting==='wide')cabinet(x,z,1.25,1.2,4,4);else if(a.sorting==='paired'){for(const dz of[-.4,.4])cabinet(x,z+dz,.95,.75,3,2);}else{cabinet(x,z,1.15,1.05,4,3);cabinet(x,z-.08,.6,1.55,2,4);}}
 const trough=(A:P,B:P,width=.32)=>{const av=new THREE.Vector3(...A),bv=new THREE.Vector3(...B),delta=bv.clone().sub(av),len=delta.length(),centre=av.clone().add(bv).multiplyScalar(.5),q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1),delta.clone().normalize()),group=new THREE.Group();group.position.copy(centre);group.quaternion.copy(q);s.root.add(group);for(const [sz,at]of [[[width,.035,len],[0,-.0175,0]],[[.035,.12,len],[-width/2,.06,0]],[[.035,.12,len],[width/2,.06,0]]] as [P,P][]){const mesh=s.box(sz,[0,0,0],wood);group.add(mesh);mesh.position.set(...at);}return group;};
 const bin=(x:number,z:number)=>{s.box([.72,.1,.64],[x,.05,z],wood);if(a.bins==='wood'||a.bins==='trays'){const h=a.bins==='wood'?.36:.18;for(const dx of[-.31,.31])s.box([.04,h,.56],[x+dx,.1+h/2,z],wood);for(const dz of[-.26,.26])s.box([.65,h,.04],[x,.1+h/2,z+dz],wood);if(a.bins==='wood')s.box([.035,h,.56],[x,.1+h/2,z],wood);}else{s.lathe([[0,0],[.24,0],[.29,.32],[.25,.32],[.2,.035],[0,.035]],a.bins==='sacks'?paper:wood,[x,.1,z]);for(let j=0;j<5;j++)s.ring(.24+j*.009,.012,[x,.13+j*.065,z],a.bins==='sacks'?rope:rim).rotateX(Math.PI/2);}if(a.story!=='closed')for(let i=0;i<4;i++)s.box([.2,.015,.15],[x,.115+i*.015,z],i%2?paper:ink);};
 for(const side of[-1,1]){const from:P=[side*.84,1.55,Z+.7],to:P=[side*3.1,.46,-.3];bin(to[0],to[2]);if(a.chutes==='stepped'){for(let i=0;i<3;i++){const t=i/3,u=(i+1)/3;trough([mix(from[0],to[0],t),mix(from[1],to[1],t),mix(from[2],to[2],t)],[mix(from[0],to[0],u),mix(from[1],to[1],u)+.035,mix(from[2],to[2],u)],.33);}}else trough(from,to);
  for(const t of[.38,.75]){const x=mix(from[0],to[0],t),y=mix(from[1],to[1],t),z=mix(from[2],to[2],t);s.rod([x,0,z],[x,y-.03,z],.035,dark);if(a.chutes==='covered'){s.box([.5,.035,.4],[x,y+.21,z],wood);for(const dx of[-.21,.21])s.rod([x+dx,y-.025,z],[x+dx,y+.2,z],.014,wood);}}
  if(a.chutes==='forked'){const other:P=[side*3.45,.46,-1.2];trough([side*2.25,.9,-.76],other,.24);bin(other[0],other[2]);}
 }
 // A clear front apron connects the letter routes without occupying the three cast bays.
 for(const side of[-1,1])for(let i=0;i<10;i++){const x=side*(.25+i*.3),z=.65,h=.035;if(a.paths==='stones')s.ball([.18,.035,.18],[x,.035,z],rim,12);else{s.box([.28,h,.62],[x,h/2,z],a.paths==='tiles'?(i%2?pale:green):wood);if(a.paths==='ribs')for(const dz of[-.3,.3])s.rod([x-.15,.045,z+dz],[x+.15,.045,z+dz],.018,dark);}}
 const tx=0,tz=.15,ty=.7;s.box([1.35,.06,.65],[tx,ty,tz],wood);for(const x of[-.52,.52])for(const z of[tz-.22,tz+.22])s.rod([x,0,z],[x,ty-.03,z],.035,wood);
 if(a.dispatch==='scale'){s.box([.4,.06,.24],[0,ty+.06,tz],dark);s.rod([0,ty+.07,tz],[0,ty+.55,tz],.025,gold);s.rod([-.33,ty+.5,tz],[.33,ty+.5,tz],.018,gold);for(const x of[-.3,.3]){s.rod([x,ty+.5,tz],[x,ty+.25,tz],.006,gold);s.cylinder(.14,.14,.025,[x,ty+.2375,tz],gold,20);}}
 if(a.dispatch==='table'){for(let i=0;i<4;i++)s.box([.4,.006,.35],[.22,ty+.033+i*.006,tz],paper);for(let i=0;i<4;i++)s.ring(.065+i*.012,.007,[-.35,ty+.038,tz],rope).rotateX(Math.PI/2);}
 if(a.dispatch==='rack'){for(const x of[-.47,.47])s.box([.04,.6,.32],[x,ty+.33,tz],wood);for(const y of[ty+.05,ty+.34,ty+.6])s.box([.98,.035,.32],[0,y,tz],wood);for(let i=0;i<7;i++)s.cylinder(.032,.032,.27,[(i-3)*.1,ty+.08,tz],paper,12).rotateX(Math.PI/2);}
 if(a.dispatch==='cubby'){s.box([.8,.5,.05],[0,ty+.28,tz-.25],wood);for(const x of[-.38,0,.38])s.box([.04,.5,.5],[x,ty+.28,tz],wood);s.box([.8,.04,.5],[0,ty+.55,tz],wood);const door=s.box([.38,.45,.03],[.55,ty+.28,tz+.12],wood);door.rotation.y=-.7;}
 if(a.signals==='clock'){s.cylinder(.24,.24,.055,[0,2.1,Z+.85],pale,32).rotateX(Math.PI/2);s.ring(.25,.025,[0,2.1,Z+.885],wood);s.rod([0,2.1,Z+.9],[0,2.27,Z+.9],.012,dark);s.rod([0,2.1,Z+.9],[.13,2.1,Z+.9],.015,dark);}
 if(a.signals==='bell'){s.rod([.82,1.9,Z+.72],[1.18,1.9,Z+.72],.025,gold);s.rod([1.18,1.9,Z+.72],[1.18,1.72,Z+.72],.012,gold);s.cylinder(.045,.11,.16,[1.18,1.64,Z+.72],gold,20);}
 if(a.signals==='flags')for(const x of[-1.2,1.2]){s.rod([x,0,Z+1],[x,2.15,Z+1],.025,wood);s.box([.4,.22,.012],[x+.18,2,Z+1],ink);}
 if(a.signals==='lanterns')for(const x of[-1.7,1.7]){s.rod([x,H-.08,Z+1],[x,1.95,Z+1],.01,dark);s.box([.16,.25,.16],[x,1.825,Z+1],glow);}
 if(a.story==='arrival')for(let i=0;i<3;i++){const x=-1.15-i*.35,z=.1;s.box([.28,.22,.26],[x,.11,z],paper);s.box([.025,.225,.265],[x,.11,z],rope);}
 if(a.story==='sorting')for(let i=0;i<6;i++)s.box([.18,.008,.12],[-.48+i*.19,ty+.034,tz+.21],i%2?paper:ink).rotateY((i%3-.5)*.2);
 if(a.story==='repair'){for(let i=0;i<4;i++)s.box([.85,.035,.12],[1.75,.0175+i*.035,.1],wood);s.rod([1.5,.15,.1],[1.95,.15,.1],.012,dark);}
 if(a.story==='closed'){for(const x of[-.62,.62])s.rod([x,0,Z+1.25],[x,.55,Z+1.25],.025,wood);s.box([1.3,.13,.035],[0,.45,Z+1.25],ink);}
 for(const side of[-1,1])for(let i=0;i<5;i++){const x=side*(4.7+.13*Math.sin(i)),z=-3.8+i*.5;if(a.garden==='buttons'){s.rod([x,0,z],[x,.38,z],.035,pale);s.ball([.2,.1,.2],[x,.4,z],cap,16);}else if(a.garden==='ferns'){s.rod([x,0,z],[x,.8,z],.018,green);for(let j=0;j<5;j++)for(const d of[-1,1])leaf(s,[x+d*.11,.2+j*.12,z],.26-j*.025,.1,green,.03).rotateZ(d*.2);}else if(a.garden==='moss')s.ball([.28,.09,.24],[x,.08,z],green,12);else s.tube([[x,0,z],[x-side*.2,.1,z+.15],[x-side*.5,.025,z+.4]],.045,wood);}
 
 return world;
 }
});
