import * as THREE from 'three';
import {choice,defineThing,defineWorld,diorama,figure,mix,score,Sculpture} from '@conjure/kit';
type P=readonly [number,number,number];
function hollow(s:Sculpture,r:number,h:number,t:number,at:P,mat:THREE.Material){return s.lathe([[r-t,0],[r,0],[r,h],[r-t,h],[r-t,t]],mat,at);}
function disk(s:Sculpture,r:number,t:number,at:P,mat:THREE.Material){return s.cylinder(r,r,t,at,mat,48);}
function arc(s:Sculpture,c:P,rx:number,ry:number,start:number,end:number,t:number,mat:THREE.Material){const points:P[]=[];for(let i=0;i<=32;i++){const a=start+(end-start)*i/32;points.push([c[0]+Math.cos(a)*rx,c[1]+Math.sin(a)*ry,c[2]]);}return s.tube(points,t,mat);}
function leaf(s:Sculpture,at:P,length:number,width:number,mat:THREE.Material,arch=.16){return s.surface((u,v,p)=>{const x=(u-.5)*length,z=Math.sin(Math.PI*u)*(v-.5)*width;p.set(x,Math.sin(Math.PI*u)*arch-Math.abs(v-.5)*.08,z);},mat,{segments:[24,10],at});}
function groundNode(node:THREE.Object3D,top:number){node.updateMatrixWorld(true);node.position.y+=top-new THREE.Box3().setFromObject(node,true).min.y;node.updateMatrixWorld(true);}

export default defineThing({
 questions:{
  hull:choice("What forms the ferry hull?",{"silver": "A polished oval spoon bowl.", "wood": "A carved wooden spoon bowl.", "leaf": "A curled green leaf reinforced with ribs.", "copper": "A broad hammered copper ladle bowl."}),
  stem:choice("How does the old spoon handle finish?",{"straight": "A straight handle becomes the aft deck.", "curl": "A curled handle arches over the stern.", "fork": "A split twig handle forms a small fork.", "short": "A short cut handle carries a rudder."}),
  sail:choice("What is raised on the mast?",{"leaf": "A single curved leaf sail.", "cloth": "A small square cloth sail.", "petal": "A rounded flower-petal sail.", "furled": "A furled sail tied against the spar."}),
  rig:choice("How is the sail rigged?",{"square": "A mast and transverse yard.", "lateen": "A diagonal lateen spar.", "spritsail": "A short sprit stretches one corner.", "twin": "Two little masts share the sail."}),
  seats:choice("What seats are fitted inside?",{"bench": "Two plank benches across the bowl.", "stools": "Two tiny acorn-cap stools.", "cushions": "Low fabric pads on a small deck.", "cargo": "A clear deck with low cargo cleats."}),
  cargo:choice("What is the ferry carrying?",{"berries": "Three berries in a shallow basket.", "letters": "A tied bundle of small letters.", "tea": "A little lidded tea tin.", "empty": "Only a bailer and coiled rope."}),
  edge:choice("What protects the rim?",{"rope": "A rope rubbing rail.", "beads": "A row of small wooden beads.", "plain": "A plain rolled metal rim.", "leaves": "Overlapping little leaf guards."}),
  oars:choice("How is the ferry steered?",{"pair": "Two small oars rest in rowlocks.", "single": "One long sweep oar sits at the stern.", "rudder": "A hinged leaf-shaped rudder.", "paddle": "A broad loose paddle lies across the seats."}),
  load:score('How broad is the ferry bowl?', ['A tiny single passenger spoon','A small pond boat','A broad family ladle','A wide cargo ferry']),
  story:choice("What state is the crossing in?",{"ready": "Sail raised and rope coiled aboard.", "moored": "A mooring rope reaches a tiny fixed bollard.", "rain": "A tied cloth covers part of the cargo.", "repair": "One oar is being repaired with a new binding."}),
  sailmark:choice("How is the sail marked?",{"veins": "Raised veins or stitched seam lines.", "patch": "A rectangular contrasting repair patch.", "stripes": "Three narrow contrasting strips.", "clear": "An unmarked sail with corner ties."})
 },
 build(a,context){

 const s=new Sculpture(context),wood=s.material('#8d6945'),metal=s.material(a.hull==='copper'?'#b98459':'#aebbbb',{metalness:.6,roughness:.3,side:THREE.DoubleSide}),green=s.material('#658352',{side:THREE.DoubleSide}),cloth=s.material(a.sail==='petal'?'#d5a2a2':'#d9cfb0',{side:THREE.DoubleSide}),dark=s.material('#4e4b37'),rope=s.material('#b7a482'),red=s.material('#a85c51');
 const L=1.45,W=mix(.43,.75,a.load),H=.24,mat=a.hull==='wood'?wood:a.hull==='leaf'?green:metal,shape=(u:number,v:number,p:THREE.Vector3,outer=false)=>{const t=u*Math.PI*2,rr=v;p.set(Math.cos(t)*L*.5*rr,H*rr*rr+(outer?-.025:0),Math.sin(t)*W*rr);};
 s.surface((u,v,p)=>shape(u,v,p),mat,{segments:[48,14],wrap:true});s.surface((u,v,p)=>shape(u,v,p,true),mat,{segments:[48,14],wrap:true,flip:true});
 const rim:P[]=[];for(let i=0;i<48;i++){const t=i*Math.PI/24;rim.push([Math.cos(t)*L*.5,H,Math.sin(t)*W]);}s.tube(rim,a.edge==='plain'?.022:.018,a.edge==='rope'?rope:mat,true);
 if(a.edge==='beads'||a.edge==='leaves')for(let i=0;i<24;i++){const t=i*Math.PI/12,x=Math.cos(t)*L*.5,z=Math.sin(t)*W;if(a.edge==='beads')s.ball([.027,.027,.027],[x,H,z],wood,10);else{const l=leaf(s,[x,H,z],.13,.07,green,.035);l.rotation.y=-t;}}
 const stem:P[]=a.stem==='curl'?[[L*.46,H,0],[L*.75,H+.12,0],[L*.86,H+.44,0],[L*.72,H+.5,0]]:a.stem==='short'?[[L*.46,H,0],[L*.65,H+.02,0]]:[[L*.46,H,0],[L*.85,H+.05,0],[L*.98,H+.05,0]];s.tube(stem,.035,mat);if(a.stem==='fork')for(const sign of[-1,1])s.rod([L*.78,H+.05,0],[L*.98,H+.08,sign*.12],.018,wood);
 const deckY=.18,deckTop=deckY+.0175;const deck=disk(s,1,.035,[0,deckY,0],wood);deck.scale.set(L*.39,1,W*.78);for(const x of[-.4,0,.4]){const floor=H*(x/(L*.5))**2;s.box([.06,deckY-.0175-floor,.08],[x,(floor+deckY-.0175)/2,0],wood);}const mastY=1.2;const mastXs=a.rig==='twin'?[-.22,.22]:[0];for(const x of mastXs){s.rod([x,deckY,0],[x,mastY,0],.025,wood);for(const sign of[-1,1])s.rod([x,.65,0],[x+sign*.18,deckY,.12],.012,rope);}
 const sx=a.rig==='lateen'?.65:.55,sy=.68;const sailPoint=(u:number,v:number,offset=0):P=>{const width=a.sail==='petal'?Math.sin(Math.PI*v)*sx:sx*(a.rig==='lateen'?v:1);return [(u-.5)*width,.36+v*sy,Math.sin(Math.PI*u)*Math.sin(Math.PI*v)*.12+.015+offset];};const sail= a.sail==='furled'?s.cylinder(.045,.045,.68,[0,.84,0],cloth,16):s.surface((u,v,p)=>{p.set(...sailPoint(u,v));},a.sail==='leaf'?green:cloth,{segments:[24,18]});if(a.sail==='furled')for(let i=0;i<4;i++)s.ring(.05,.009,[0,.56+i*.16,0],rope).rotateX(Math.PI/2);
 if(a.rig==='lateen')s.rod([-.3,.45,0],[.3,1.15,0],.018,wood);else s.rod([-.35,1.04,0],[.35,1.04,0],.018,wood);if(a.rig==='spritsail')s.rod([0,.3,0],[.32,1.04,0],.016,wood);
 for(const x of[-.33,.33])for(const yy of[.36,1.03])s.rod([x*.8,yy,.015],[0,yy===.36?deckY:1.18,0],.007,rope);
 if(a.sail!=='furled'){
 const mark=(u0:number,u1:number,v0:number,v1:number,m:THREE.Material)=>s.surface((u,v,p)=>p.set(...sailPoint(mix(u0,u1,u),mix(v0,v1,v),.005)),m,{segments:[8,12]});
 if(a.sailmark==='patch')mark(.58,.85,.35,.6,red);
 if(a.sailmark==='stripes')for(let i=0;i<3;i++)mark(.18+i*.27,.22+i*.27,.1,.9,red);
 if(a.sailmark==='veins')for(let i=0;i<5;i++)for(const sign of[-1,1]){const ps:P[]=[];for(let j=0;j<=8;j++)ps.push(sailPoint(.5+sign*j/8*.4,.13+i*.145+j/8*.1,.007));s.tube(ps,.006,rope);}
 if(a.sailmark==='clear')for(const u of[.1,.9])for(const v of[.12,.88])s.ball([.012,.012,.012],sailPoint(u,v,.008),rope,8);
 }
 for(const x of[-.28,.28]){if(a.seats==='bench'){const half=W*Math.sqrt(1-(x/(L*.5))**2);s.box([.16,.04,half*1.8],[x,.24,0],wood);for(const z of[-W*.35,W*.35])s.box([.055,.22-deckTop,.055],[x,(.22+deckTop)/2,z],wood);}else if(a.seats==='stools'){s.cylinder(.07,.05,.07,[x,deckTop+.035,0],wood,12);disk(s,.1,.035,[x,deckTop+.0875,0],mat);}else if(a.seats==='cushions')s.box([.18,.05,.23],[x,deckTop+.025,0],cloth);else for(const z of[-W*.38,W*.38])s.box([.09,.05,.04],[x,deckTop+.025,z],wood);}
 const cargoX=-.46,cargoY=deckTop;if(a.cargo==='berries'){s.lathe([[0,0],[.12,0],[.14,.08],[.12,.08],[.1,.02]],wood,[cargoX,cargoY,0]);for(let i=0;i<3;i++)s.ball([.055,.055,.055],[cargoX+(i-1)*.065,cargoY+.07,(i%2)*.04],red,12);}else if(a.cargo==='letters'){for(let i=0;i<4;i++)s.box([.18,.012,.16],[cargoX,cargoY+.006+i*.012,0],cloth);s.box([.014,.06,.17],[cargoX,cargoY+.03,0],rope);}else if(a.cargo==='tea'){s.cylinder(.085,.085,.16,[cargoX,cargoY+.08,0],metal);disk(s,.09,.02,[cargoX,cargoY+.17,0],wood);}else{hollow(s,.06,.06,.015,[cargoX,cargoY,0],wood);for(let i=0;i<3;i++)s.ring(.065+i*.012,.006,[cargoX+.18,cargoY+.008,0],rope).rotateX(Math.PI/2);}
 const oar=(from:P,to:P)=>{s.rod(from,to,.012,wood);const blade=s.box([.17,.025,.07],to,wood);blade.rotation.y=-Math.atan2(to[2]-from[2],to[0]-from[0]);};if(a.oars==='pair')for(const sign of[-1,1]){s.ring(.028,.009,[.15,.27,sign*W*.98],metal).rotateY(Math.PI/2);oar([.15,.27,sign*.12],[.15,.27,sign*(W+.24)]);}else if(a.oars==='single')oar([.5,H+.04,0],[1.16,H+.02,.22]);else if(a.oars==='paddle')oar([-.28,.2725,-W*.7],[.28,.2725,W*.7]);else{s.rod([L*.62,.02,0],[L*.62,H+.15,0],.018,wood);const rudder=leaf(s,[L*.62,.13,0],.3,.21,green,.01);rudder.rotation.z=Math.PI/2;}
 if(a.story==='moored'){s.cylinder(.07,.09,.15,[-1,.05,0],wood);s.tube([[-L*.5,H,0],[-.85,.12,.03],[-1,.12,0]],.009,rope);}if(a.story==='rain')s.drape({size:[.4,.5],at:[-.35,.7,0],over:[{box:[.3,.2,.3],at:[-.35,deckTop+.0875,0]}],floor:deckY,detail:14},cloth);if(a.story==='repair'){oar([-.15,deckTop+.025,-.24],[.38,deckTop+.025,-.24]);for(let i=0;i<5;i++)s.ring(.018,.004,[.05+i*.012,deckTop+.025,-.24],rope).rotateY(Math.PI/2);}
 return s.finish();

 }
});
