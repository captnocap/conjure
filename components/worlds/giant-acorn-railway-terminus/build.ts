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
  shell:choice("What form does the acorn station take?",{"round": "A broad rounded acorn.", "tall": "A slender upright acorn.", "long": "A low wide acorn.", "faceted": "A sharply faceted carved acorn."}),
  cupule:choice("What covers the acorn cupule?",{"scales": "Rows of overlapping woody scales.", "ribs": "Raised radial ribs.", "moss": "Small moss patches between the scales.", "bands": "Concentric raised woody bands."}),
  tracks:choice("How do the tracks enter the terminal?",{"single": "One central track ends in a buffer.", "twin": "Two parallel passenger tracks.", "siding": "A passenger line and a short diverging siding.", "fan": "Three tracks spread toward the terminal."}),
  platforms:choice("Where do passengers wait?",{"left": "A long platform to the left of the throat.", "right": "A long right-hand platform.", "island": "Narrow platform islands occupy gaps between available tracks.", "both": "Raised side platforms on both sides."}),
  entrance:choice("What shelters the station entrance?",{"arch": "An open timber arch around the shell cut.", "portico": "Two columns carry a small peaked porch.", "leaf": "A broad leaf canopy held by stems.", "sign": "A supported departure board crosses the opening."}),
  roof:choice("How is the waiting platform covered?",{"open": "Open air above the platforms.", "canopy": "A shallow timber canopy on thin posts.", "ridge": "A little pitched roof on a narrow waiting shelter.", "cutback": "A narrow rear canopy leaves the front platform open."}),
  crossing:choice("What crosses the rails near the entry?",{"boards": "Flush wooden boards between the rails.", "bridge": "A raised footbridge with stairs on either side.", "stones": "Flat pale crossing stones between the sleepers.", "gate": "A plank crossing with hinged barrier arms."}),
  story:choice("What waits for the next train?",{"luggage": "A stack of tied suitcases beside a bench.", "repair": "Spare rail lengths and tools beside the buffers.", "market": "A small produce stand on a side platform.", "parcels": "Small wrapped parcels fill a loading handcart."}),
  signal:choice("What calls the departure?",{"clock": "A round station clock on a post.", "bell": "A little bell hangs under a timber yoke.", "lamp": "A two-colour signal lantern stands beside the rails.", "flag": "A rolled flag rests in a tall signalling bracket."}),
  ground:choice("What borders the rail throat?",{"moss": "Low rounded moss hummocks.", "gravel": "Pale ballast and small scattered stones.", "roots": "Exposed branching woodland roots.", "paving": "A band of small rectangular paving stones."}),
  extent:score('How broad is this place?',['An intimate setting','A compact neighbourhood','A generous place','A broad miniature world'])
 },
 build(a,context){

 const b=mix(.92,1.12,a.extent),{world,art:s}=diorama(context,{width:12*b,depth:9,background:'#dfe4d0',floor:'#bfc3a1',yaw:25,pitch:31,maxHeight:1.8,radius:.95,slots:[[-3.8,1.4],[3.6,1.6],[-3.5,-1.7],[3.6,-2]],scale:[.8,1.3]});
 const nut=s.material('#b59361'),cap=s.material('#786344'),wood=s.material('#8f7952'),metal=s.material('#6e7971',{metalness:.55}),cream=s.material('#dcd3b0'),dark=s.material('#35453c'),green=s.material('#6a8250',{side:THREE.DoubleSide}),red=s.material('#aa6652'),stone=s.material('#aaa991');
 const r=(a.shell==='tall'?1.65:a.shell==='long'?2.55:2.1)*b,H=a.shell==='tall'?3.5:a.shell==='long'?2.4:2.9,Z=-2;
 // A real cut through the shell exposes the terminal hall from the front.
 const profile:[[number,number],...[number,number][]]=[[r*.5,.05],[r*.85,.45],[r,H*.65],[r*.97,H],[r*.9,H],[r*.92,H*.65],[r*.77,.5],[r*.45,.12]];
 s.mesh(new THREE.LatheGeometry(profile.map(v=>new THREE.Vector2(...v)),a.shell==='faceted'?14:56,.48,Math.PI*2-.96),nut,[0,0,Z]);
 s.cylinder(r*.86,r*.86,.14,[0,.07,Z],wood,48);
 const capY=H-.1;
 const cup=s.surface((u,v,p)=>{const t=.48+u*(Math.PI*2-.96),q=v*Math.PI*.5,rr=r*(.96*Math.sin(q)+.03);p.set(Math.sin(t)*rr,capY+Math.cos(q)*.72,Z+Math.cos(t)*rr);},cap,{segments:[48,14],flip:true});
 for(let row=0;row<4;row++)for(let i=0;i<15;i++){const t=.53+(i+row%2*.45)*(Math.PI*2-1.06)/15,q=.28+row*.35,rr=r*(.96*Math.sin(q)+.03),y=capY+Math.cos(q)*.72;
  if(a.cupule==='scales'||a.cupule==='moss'){const m=a.cupule==='moss'&&i%4===0?green:nut;const tile=s.ball([.19,.065,.24],[Math.sin(t)*rr,y+.02,Z+Math.cos(t)*rr],m,10);tile.rotation.y=t;}
 }
 if(a.cupule==='ribs')for(let i=0;i<18;i++){const t=.5+i*(Math.PI*2-1)/17;const ps:P[]=[];for(let j=0;j<=12;j++){const q=.1+j*1.4/12,rr=r*(.96*Math.sin(q)+.03);ps.push([Math.sin(t)*rr,capY+Math.cos(q)*.72+.035,Z+Math.cos(t)*rr]);}s.tube(ps,.035,nut);}
 if(a.cupule==='bands')for(let j=0;j<4;j++){const q=.3+j*.35,rr=r*(.96*Math.sin(q)+.03),ps:P[]=[];for(let i=0;i<=40;i++){const t=.48+i*(Math.PI*2-.96)/40;ps.push([Math.sin(t)*rr,capY+Math.cos(q)*.72+.03,Z+Math.cos(t)*rr]);}s.tube(ps,.045,nut);}
 s.tube([[0,capY+.72,Z],[.08,capY+1.05,Z-.04],[.28,capY+1.16,Z-.1]],.1,wood);
 const centers=a.tracks==='single'?[0]:a.tracks==='twin'?[-.65,.65]:a.tracks==='siding'?[0,1.15]:[-1.15,0,1.15];
 for(let k=0;k<centers.length;k++){const c=centers[k],bend=(a.tracks==='fan'?.42:a.tracks==='siding'&&k===1?.7:0)*c;
  for(let j=0;j<24;j++){const z=-2.3+j*.27,x=c+bend*(z+2.3)/6.2;s.box([.88,.055,.12],[x,.035,z],wood);}
  for(const dx of[-.27,.27])s.tube([[c+dx,.095,-2.6],[c+dx+bend*.45,.095,.2],[c+dx+bend,.095,4]],.027,metal);
  for(const dx of[-.3,.3])s.rod([c+dx,.06,-2.65],[c+dx,.4,-2.65],.045,metal);s.box([.8,.15,.13],[c,.37,-2.65],red);
 }
 const places=a.platforms==='left'?[-2.3]:a.platforms==='right'?[2.3]:a.platforms==='island'?(centers.length===1?[-.78,.78]:centers.slice(1).map((c,i)=>(c+centers[i])/2)):[-2.3,2.3];
 for(const x of places){const w=a.platforms==='island'?.47:1.2;s.box([w,.25,4.9],[x,.125,-.65],cream);for(let j=0;j<12;j++)s.box([w,.012,.035],[x,.256,-2.9+j*.4],stone);if(w>.7)bench(s,x,.25,-1.3,.85,wood);
  if(a.roof!=='open'){const len=a.roof==='cutback'?1.8:3.4,zz=a.roof==='cutback'?-2:-.8;for(const dx of[-w*.38,w*.38])for(const dz of[-len*.42,len*.42])s.rod([x+dx,.25,zz+dz],[x+dx,a.roof==='ridge'?1.85-(Math.abs(dx)-w*.25)*Math.tan(.3)-.035/Math.cos(.3):1.76,zz+dz],.035,wood);if(a.roof==='ridge'){for(const sign of[-1,1])s.box([w*.58,.07,len+.15],[x+sign*w*.25,1.85,zz],cap).rotateZ(-sign*.3);}else s.box([w+.18,.08,len+.15],[x,1.8,zz],cap);}
 }
 const ez=Z+r*.65,span=1.45;
 if(a.entrance==='arch')arc(s,[0,.22,ez],span,1.75,0,Math.PI,.085,wood);
 else{for(const x of[-span,span])s.rod([x,0,ez],[x,2.05,ez],.065,wood);if(a.entrance==='leaf')leaf(s,[0,2.05,ez],3.3,1.1,green,.4);else if(a.entrance==='sign'){s.box([3,.48,.12],[0,1.96,ez],dark);for(let i=0;i<7;i++)s.box([.2,.05,.02],[-1+i*.33,1.98,ez+.07],cream);}else{for(const sign of[-1,1])s.box([1.65,.1,.9],[sign*.76,2.17,ez],wood).rotateZ(-sign*.28);}}
 const crossingZ=2.5,spanX=Math.max(...centers.map(Math.abs))+1;
 if(a.crossing==='bridge'){const yy=1.65;s.box([spanX*2+.5,.1,.6],[0,yy,crossingZ],wood);for(const sign of[-1,1]){for(let i=0;i<7;i++){const x=sign*(spanX+.2+i*.18),h=yy*(1-i/7);s.box([.2,h,.6],[x,h/2,crossingZ],wood);}for(const z of[crossingZ-.27,crossingZ+.27]){s.rod([-spanX,yy,z],[-spanX,yy+.5,z],.025,wood);s.rod([spanX,yy,z],[spanX,yy+.5,z],.025,wood);s.rod([-spanX,yy+.5,z],[spanX,yy+.5,z],.02,wood);}}}
 else{for(let i=0;i<12;i++)s.box([spanX*2/12-.025,.07,.55],[-spanX+(i+.5)*spanX*2/12,.05,crossingZ],a.crossing==='stones'?stone:wood);if(a.crossing==='gate')for(const sign of[-1,1]){s.rod([sign*(spanX+.15),0,crossingZ],[sign*(spanX+.15),.65,crossingZ],.045,metal);s.rod([sign*(spanX+.15),.65,crossingZ],[sign*.35,.65,crossingZ],.035,red);}}
 const sx=-3.1,sz=-.8;s.rod([sx,0,sz],[sx,2,sz],.055,wood);
 if(a.signal==='clock'){s.cylinder(.3,.3,.1,[sx,1.82,sz],cream,32).rotateX(Math.PI/2);s.rod([sx,1.82,sz+.065],[sx,2.04,sz+.065],.017,dark);s.rod([sx,1.82,sz+.065],[sx+.14,1.78,sz+.065],.017,dark);}else if(a.signal==='bell'){s.rod([sx,2,sz],[sx+.4,2,sz],.03,wood);s.lathe([[.06,0],[.1,-.2],[.2,-.32],[.22,-.34]],metal,[sx+.35,1.92,sz]);s.rod([sx+.35,2,sz],[sx+.35,1.94,sz],.015,metal);}else if(a.signal==='lamp'){s.box([.22,.48,.18],[sx,1.75,sz],dark);s.ball([.07,.07,.07],[sx,1.87,sz+.1],red);s.ball([.07,.07,.07],[sx,1.63,sz+.1],green);}else{s.rod([sx,1.8,sz],[sx+.48,2.1,sz],.025,wood);s.box([.35,.32,.025],[sx+.35,1.93,sz],red);}
 const storyX=4.65,storyZ=-.2;
 if(a.story==='luggage')for(let i=0;i<4;i++){s.box([.55,.2,.35],[storyX+(i%2)*.6,.1+Math.floor(i/2)*.2,storyZ],i%2?nut:dark);s.box([.025,.21,.36],[storyX+(i%2)*.6,.1+Math.floor(i/2)*.2,storyZ],cream);}
 if(a.story==='repair'){for(let i=0;i<3;i++)s.rod([storyX+i*.12,.06,storyZ-.5],[storyX+i*.12,.06,storyZ+.6],.035,metal);s.box([.55,.22,.35],[storyX-.5,.11,storyZ],wood);}
 if(a.story==='market'){s.box([1,.08,.65],[storyX,.7,storyZ],wood);for(const x of[-.4,.4])for(const z of[-.23,.23])s.rod([storyX+x,0,storyZ+z],[storyX+x,.7,storyZ+z],.04,wood);for(let i=0;i<12;i++)s.ball([.085,.085,.085],[storyX+(i%4-.5)*.15-.15,.81,storyZ+(Math.floor(i/4)-1)*.15],i%3?red:green,10);}
 if(a.story==='parcels'){s.box([.85,.08,.55],[storyX,.25,storyZ],wood);for(const z of[-.2,.2])for(const x of[-.3,.3])s.cylinder(.13,.13,.05,[storyX+x,.13,storyZ+z],dark,16).rotateZ(Math.PI/2);for(let i=0;i<3;i++)s.box([.24,.23,.35],[storyX-.28+i*.28,.405,storyZ],cream);s.rod([storyX+.42,.25,storyZ],[storyX+.75,.8,storyZ],.025,wood);}
 for(let i=0;i<18;i++){const side=i%2?1:-1,x=side*(4.6+context.random()*.5)*b,z=-3.7+Math.floor(i/2)*.9;
  if(a.ground==='moss')s.ball([.3,.12,.3],[x,.1,z],green,12);else if(a.ground==='gravel')s.ball([.13,.07,.1],[x,.055,z],stone,10);else if(a.ground==='paving')s.box([.36,.05,.31],[x,.025,z],cream);else{s.tube([[x,.03,z],[x+side*.25,.09,z+.25],[x+side*.4,.02,z+.7]],.05,wood);s.rod([x+side*.25,.06,z+.25],[x-side*.12,.025,z+.5],.025,wood);}}
 
 return world;
 }
});
