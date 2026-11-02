import * as THREE from 'three';
import { choice, defineWorld, diorama, score } from '@conjure/kit';
export default defineWorld({questions:{
  ice:choice('What shape is the ice margin?',{wall:'A broad cut ice wall with blue seams.',lobes:'Three low glacier lobes extend onto the gravel.',terrace:'Stepped ice terraces rise behind the camp.',crevasse:'A fractured ice wall with a deep central crevasse.'}),
  river:choice('How does meltwater cross the outwash?',{braided:'Three braided shallow streams.',bend:'One broad curving meltwater channel.',pools:'Disconnected shallow pools in gravel hollows.',dry:'Pale dry channels with exposed bars.'}),
  camp:choice('What shelter serves the field crew?',{tent:'A low triangular expedition tent.',tarp:'A taut open tarp on four poles.',hut:'A small open-front instrument hut.',open:'Only a low equipment windbreak.'}),
  transect:choice('How is the survey line marked?',{stakes:'A line of tall striped stakes.',flags:'Small bright flags at even intervals.',tape:'A low measuring tape between two poles.',targets:'Three square photographic targets.'}),
  ground:choice('What is exposed underfoot?',{cobbles:'Rounded grey cobbles on pale sediment.',fines:'Smooth silty sediment with ripple bands.',ice:'Patches of blue basal ice between gravel.',snow:'A thin irregular cover of old snow.'}),
  crossing:choice('How does the crew cross the side channel?',{plank:'A narrow supported plank bridge.',stones:'A row of broad stepping stones.',grate:'A low metal survey footbridge.',none:'An open ford with no structure.'}),
  station:choice('What is built into the rear bank?',{pit:'A rectangular cut snowpit with layered walls.',core:'A low rack holds several long ice core tubes.',gauge:'A stream gauge cabinet and tall staff.',weather:'A simple weather mast with wind vane.'}),
  visit:choice('What field activity is visible?',{sampling:'Sample trays sit on a low table.',mapping:'A folded survey map rests on a board.',packing:'Two strapped equipment cases stand by the shelter.',rest:'A thermos and a folded seat wait near the shelter.'}),
  melt:score('How far has the melt season advanced?',['Small ice margin','Partly retreating ice','Broad exposed outwash']),
  relief:score('How high are the gravel and ice banks?',['Low','Rolling','Strongly stepped']),
},build(a,context){
  const {art:s,world}=diorama(context,{floor:'#aea997',background:'#ccd5d2',width:15,depth:12,maxHeight:3.3,radius:1.55,pitch:33,yaw:21,slots:[[0,2],[-4,1.4],[4,1.4],[-3.8,-1.9],[3.8,-1.9],[0,-3.2]]});
  const snow=s.material('#d4ddd6'),ice=s.material('#91b2b6'),water=s.material('#537f88',{roughness:0.25}),gravel=s.material('#999b8d'),dark=s.material('#455b5c'),metal=s.material('#939f97',{metalness:0.5}),canvas=s.material('#ac8051'),white=s.material('#dedbc3');
  const H=1.4+a.relief*1.7;
  if(a.ice==='lobes')for(let j=0;j<3;j++)s.ball([2.2,H*0.55,1.6],[-4.3+j*4.3,0,-4.8+a.melt*0.4],snow,24);
  else for(let j=0;j<7;j++){const x=-6+j*2,cut=a.ice==='crevasse'&&j===3;for(let k=0;k<4;k++){const hh=H/4,offset=a.ice==='terrace'?k*0.35:0;s.box([cut?0.3:1.98,hh,1.3],[x,hh/2+k*hh,-5+offset],k%2?snow:ice);}}
  if(a.ice==='wall'||a.ice==='crevasse')for(let j=0;j<10;j++){const x=-6.3+j*1.4;s.tube([[x,0.05,-4.32],[x+0.1,H*0.45,-4.31],[x-0.12,H*0.9,-4.31]],0.022,water);}
  const count=a.river==='braided'?3:1;
  for(let j=0;j<count;j++){const pts:[number,number,number][]=Array.from({length:36},(_,k)=>{const t=k/35;return [(j-(count-1)/2)*2.1+Math.sin(t*7+j)*0.65,0.025,-4.1+t*9.4];});if(a.river==='pools')for(let k=3;k<34;k+=6)s.ball([0.75,0.02,0.45],pts[k],water,24);else {const stream=s.mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p=>new THREE.Vector3(...p))),72,a.river==='bend'?0.45:0.23,8,false),a.river==='dry'?gravel:water);stream.scale.y=0.04;stream.position.y=0.015;}}
  if(a.ground==='cobbles')s.scatter(new THREE.IcosahedronGeometry(0.12,1),gravel,Array.from({length:130},()=>({at:[(context.random()-0.5)*13,0.045,(context.random()-0.5)*8.5] as [number,number,number],size:0.5+context.random()})));
  if(a.ground==='fines')for(let j=0;j<17;j++)s.rod([-6,0.02,-3+j*0.45],[-4.6,0.02,-2.8+j*0.45],0.025,gravel);
  if(a.ground==='ice'||a.ground==='snow')for(let j=0;j<7;j++)s.ball([0.7+context.random()*0.7,0.025,0.4+context.random()*0.5],[(j%3-1)*4.8,0.02,-2.3+Math.floor(j/3)*3.3],a.ground==='ice'?ice:snow,20);
  const cx=-5,cz=-2.4;
  if(a.camp==='tent'){const shape=new THREE.Shape();shape.moveTo(-0.95,0);shape.lineTo(0,1.4);shape.lineTo(0.95,0);shape.closePath();s.mesh(new THREE.ExtrudeGeometry(shape,{depth:1.7,bevelEnabled:false}),canvas,[cx,0,cz-0.85]);s.mesh(new THREE.ShapeGeometry(shape),dark,[cx,0.01,cz+0.86]).scale.set(0.6,0.85,1);for(const dx of [-1.3,1.3]){s.rod([cx,1.4,cz],[cx+dx,0.04,cz+0.3],0.015,white);s.rod([cx+dx,0.01,cz+0.3],[cx+dx,0.25,cz+0.3],0.025,metal);}}
  if(a.camp==='tarp'){for(const dx of [-1,1])for(const dz of [-0.8,0.8])s.rod([cx+dx,0,cz+dz],[cx+dx,1.8,cz+dz],0.04,metal);s.surface((u,v,p)=>p.set(cx+(u-0.5)*2.2,1.8-Math.sin(u*Math.PI)*0.18,cz+(v-0.5)*1.8),canvas,{segments:[16,8],flip:true});}
  if(a.camp==='hut'){s.box([2,0.12,1.7],[cx,0.06,cz],gravel);s.box([2,1.8,0.12],[cx,0.9,cz-0.8],canvas);for(const dx of [-0.95,0.95])s.box([0.12,1.8,1.7],[cx+dx,0.9,cz],canvas);s.box([2.2,0.12,1.9],[cx,1.85,cz],white);}
  if(a.camp==='open')s.box([2.6,0.65,0.12],[cx,0.325,cz-0.7],canvas);
  for(let j=0;j<5;j++){const x=-5+j*2.5,z=3.8;if(a.transect==='stakes'||a.transect==='flags'){const h=a.transect==='flags'?0.65:1.3;s.rod([x,0,z],[x,h,z],0.025,metal);if(a.transect==='stakes')for(let k=1;k<7;k++)s.cylinder(0.029,0.029,0.05,[x,k*0.17,z],canvas,12);else s.box([0.25,0.18,0.01],[x+0.12,h-0.1,z],canvas);}if(a.transect==='targets'&&j%2===0){s.rod([x,0,z],[x,1,z],0.03,metal);s.box([0.38,0.38,0.02],[x,0.9,z],white);s.box([0.2,0.2,0.01],[x,0.9,z+0.015],dark);}}
  if(a.transect==='tape'){for(const x of [-6,6])s.rod([x,0,3.8],[x,0.5,3.8],0.03,metal);s.rod([-6,0.3,3.8],[6,0.3,3.8],0.012,canvas);}
  if(a.crossing==='plank'||a.crossing==='grate'){s.box([2.7,0.12,0.65],[2,0.18,3.1],a.crossing==='plank'?canvas:metal);for(const x of [0.8,3.2])s.box([0.22,0.18,0.7],[x,0.09,3.1],gravel);if(a.crossing==='grate')for(let j=0;j<14;j++)s.box([0.045,0.015,0.6],[0.75+j*0.19,0.25,3.1],dark);}if(a.crossing==='stones')for(let j=0;j<6;j++)s.ball([0.25,0.07,0.28],[0.8+j*0.45,0.05,3.1],gravel,12);
  const sx=5,sz=-3.3;
  if(a.station==='pit'){for(let j=0;j<5;j++){s.box([2.2,0.24,0.4],[sx,0.12+j*0.24,sz-0.6],j%2?snow:ice);s.box([0.4,0.24,1.4],[sx-0.9,0.12+j*0.24,sz],j%2?snow:ice);}s.box([2.1,0.05,1.4],[sx,0.025,sz],snow);}
  if(a.station==='core'){for(const x of [sx-0.8,sx+0.8])s.box([0.08,0.65,0.9],[x,0.325,sz],metal);for(let j=0;j<4;j++){const tube=s.cylinder(0.09,0.09,1.9,[sx,0.7,sz-0.36+j*0.24],ice,16);tube.rotation.z=Math.PI/2;}}
  if(a.station==='gauge'){s.box([0.55,0.8,0.4],[sx,0.8,sz],dark);s.rod([sx,0,sz],[sx,0.4,sz],0.06,metal);s.box([0.13,2.2,0.05],[sx-0.65,1.1,sz],white);for(let j=0;j<11;j++)s.box([0.12,0.05,0.01],[sx-0.65,0.1+j*0.19,sz+0.035],dark);}
  if(a.station==='weather'){s.rod([sx,0,sz],[sx,2.8,sz],0.05,metal);s.rod([sx-0.5,2.5,sz],[sx+0.5,2.5,sz],0.035,dark);s.cylinder(0.12,0.12,0.3,[sx,1.7,sz],white,12);for(let j=0;j<3;j++){const t=j/3*Math.PI*2;s.rod([sx,2.8,sz],[sx+Math.cos(t)*0.3,2.8,sz+Math.sin(t)*0.3],0.018,metal);s.ball([0.07,0.04,0.07],[sx+Math.cos(t)*0.3,2.8,sz+Math.sin(t)*0.3],dark,12);}}
  if(a.visit==='packing')for(let j=0;j<2;j++){s.box([0.65,0.36,0.45],[cx+(j-0.5)*0.8,0.18,cz+1.25],dark);s.box([0.07,0.37,0.46],[cx+(j-0.5)*0.8,0.19,cz+1.25],canvas);}
  else {s.box([1.1,0.08,0.65],[cx,0.7,cz+1.2],canvas);for(const dx of [-0.45,0.45])for(const dz of [-0.25,0.25])s.rod([cx+dx,0,cz+1.2+dz],[cx+dx,0.7,cz+1.2+dz],0.03,metal);if(a.visit==='sampling')for(let j=0;j<3;j++)s.box([0.25,0.04,0.2],[cx+(j-1)*0.3,0.77,cz+1.2],white);if(a.visit==='mapping')s.box([0.8,0.01,0.5],[cx,0.75,cz+1.2],white);if(a.visit==='rest'){s.cylinder(0.09,0.09,0.35,[cx,0.92,cz+1.2],metal,20);s.box([0.4,0.12,0.3],[cx+0.4,0.1,cz+1.6],canvas);}}
  return world;
}});
