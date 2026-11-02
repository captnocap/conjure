import * as THREE from 'three';
import { choice, defineWorld, diorama, score } from '@conjure/kit';
export default defineWorld({questions:{
  slope:choice('What volcanic terrain rises behind the instruments?',{scoria:'A low rough scoria cone.',ridge:'A long fractured lava ridge.',ash:'A pale layered ash bank.',crater:'A low crater rim with a dark central depression.'}),
  boundary:choice('How is the observation apron marked?',{rope:'A sagging rope between metal stakes.',tape:'Two narrow warning tapes on short posts.',blocks:'A row of heavy concrete boundary blocks.',fence:'A low open rail fence.'}),
  shelter:choice('What protects the observation crew?',{roof:'An open four-post shelter.',hut:'A compact open-front concrete hut.',screen:'A freestanding slatted windscreen.',none:'Only a simple instrument table.'}),
  surface:choice('What covers the apron?',{ash:'Pale ash with shallow ripple lines.',clasts:'Dark rough clasts scattered over gravel.',slabs:'Several large basalt slabs.',tracks:'Fine ash crossed by two rover tracks.'}),
  flow:choice('What is visible beyond the boundary?',{cold:'A dark fully cooled flow front.',warm:'A dark front with narrow warm cracks.',lobes:'Several overlapping rounded lava lobes.',buried:'Only a low ridge under pale ash.'}),
  station:choice('What fixed station stands at the edge?',{mast:'A tall communications mast.',power:'A pair of low solar panels and battery chest.',samples:'A rack of numbered sample boxes.',gauge:'A tall ash gauge and small weather sensor.'}),
  air:choice('What hangs above the volcanic ground?',{clear:'A clear pale grey sky.',haze:'A low translucent pale haze.',plume:'A small diffuse plume beyond the far ridge.',fallout:'Sparse pale particles drift over the rear slope.'}),
  visit:choice('What was left after the latest observation?',{notes:'A clipboard and pencil on the shelter table.',cases:'Two closed hard cases and a strap.',tools:'A sample scoop and a small sieve.',quiet:'The table has been cleared.'}),
  extent:score('How broad is the observation apron?',['Close-packed stations','Comfortable spacing','Wide open ground']),
  relief:score('How high is the rear volcanic bank?',['Low bank','Moderate ridge','Steep volcanic slope']),
},build(a,context){
  const W=13+a.extent*2;
  const {art:s,world}=diorama(context,{floor:'#aaa594',background:'#c4c8bf',width:W,depth:12,maxHeight:3.2,radius:1.55,pitch:32,yaw:20,slots:[[0,2],[-4,1.2],[4,1.2],[-3.3,-1.6],[3.3,-1.6],[0,-3.2]]});
  const ash=s.material('#c1b89f'),basalt=s.material('#5b625a'),soil=s.material('#888777'),metal=s.material('#8a9992',{metalness:0.5}),dark=s.material('#3e5351'),orange=s.material('#ad6c3e'),pale=s.material('#d3d0b7');
  const H=1.2+a.relief*2;
  if(a.slope==='scoria'||a.slope==='crater'){s.surface((u,v,p)=>{const t=u*Math.PI*2,r=v*3.5,y=a.slope==='crater'?H*(0.3+Math.sin(v*Math.PI)*0.55):H*(1-v)*0.85;p.set(Math.cos(t)*r,y,Math.sin(t)*r*0.35-5);},a.slope==='scoria'?basalt:soil,{segments:[48,20],wrap:true});if(a.slope==='crater')s.ball([0.8,0.02,0.3],[0,H*0.3+0.025,-5],basalt,24);}
  if(a.slope==='ridge')for(let j=0;j<9;j++){const m=s.mesh(new THREE.IcosahedronGeometry(1,0),basalt,[-6+j*1.5,H*0.35,-5]);m.scale.set(1,H*(0.4+context.random()*0.2),0.6);}
  if(a.slope==='ash')for(let j=0;j<5;j++)s.box([13-j*0.5,H/5,0.7],[0,H/10+j*H/5,-5.5+j*0.35],j%2?ash:soil);
  const z=-3.3;
  for(let j=0;j<8;j++){const x=-6+j*12/7;if(a.boundary==='blocks')s.box([0.65,0.45,0.45],[x,0.225,z],ash);else s.rod([x,0,z],[x,0.85,z],0.045,metal);if(j<7&&a.boundary==='rope')s.tube([[x,0.72,z],[x+0.85,0.58,z],[x+12/7,0.72,z]],0.025,orange);if(j<7&&a.boundary==='tape')for(const y of [0.4,0.75])s.box([12/7,0.07,0.015],[x+6/7,y,z],orange);if(j<7&&a.boundary==='fence')for(const y of [0.3,0.75])s.rod([x,y,z],[x+12/7,y,z],0.035,metal);}
  if(a.surface==='clasts')s.scatter(new THREE.IcosahedronGeometry(0.14,0),basalt,Array.from({length:100},()=>({at:[(context.random()-0.5)*12,0.06,(context.random()-0.5)*7] as [number,number,number],size:0.5+context.random()})));
  if(a.surface==='ash')for(let j=0;j<13;j++)s.tube([[-6,0.02,-2+j*0.5],[-5.5,0.028,-1.9+j*0.5],[-4.8,0.02,-2+j*0.5]],0.025,soil);
  if(a.surface==='slabs')for(let j=0;j<7;j++){const b=s.mesh(new THREE.IcosahedronGeometry(0.75,0),basalt,[(j%3-1)*4.7,0.07,-2+Math.floor(j/3)*2.7]);b.scale.set(1,0.16,0.8);}
  if(a.surface==='tracks')for(const x of [-5.4,-4.6])for(let j=0;j<22;j++)s.box([0.45,0.014,0.1],[x,0.012,-2+j*0.28],soil);
  for(let j=0;j<14;j++){const x=-6+j*0.9,h=a.flow==='buried'?0.2:0.4+context.random()*0.18;if(a.flow==='lobes')s.ball([0.65,h,0.5],[x,0.1,-4.1],basalt,16);else {const b=s.mesh(new THREE.IcosahedronGeometry(0.5,0),a.flow==='buried'?ash:basalt,[x,h*0.5,-4.1]);b.scale.set(1.2,h,0.8);}if(a.flow==='warm'&&j%2===0)s.rod([x,0.1,-3.72],[x+0.12,h,-3.74],0.022,s.material('#bd7946',{emissive:'#7b3419',emissiveIntensity:0.45}));}
  const sx=-5,sz=-1;
  if(a.shelter==='roof'||a.shelter==='hut'){for(const x of [-1,1])for(const zz of [-0.8,0.8])s.rod([sx+x,0,sz+zz],[sx+x,2.2,sz+zz],0.07,metal);s.box([2.3,0.12,1.9],[sx,2.25,sz],pale);if(a.shelter==='hut'){s.box([2.1,2.15,0.15],[sx,1.075,sz-0.8],ash);s.box([0.15,2.15,1.7],[sx-1,1.075,sz],ash);}}
  if(a.shelter==='screen')for(let j=0;j<9;j++)s.box([0.18,1.8,0.08],[sx-1+j*0.25,0.9,sz-0.6],soil);
  s.box([1.6,0.1,0.65],[sx,0.8,sz+0.25],metal);for(const dx of [-0.65,0.65])for(const dz of [-0.25,0.25])s.rod([sx+dx,0,sz+0.25+dz],[sx+dx,0.8,sz+0.25+dz],0.04,metal);
  if(a.visit==='notes'){s.box([0.42,0.02,0.3],[sx,0.87,sz+0.25],pale);s.rod([sx-0.15,0.89,sz+0.2],[sx+0.15,0.89,sz+0.3],0.008,orange);}if(a.visit==='cases')for(const x of [-0.45,0.45]){s.box([0.6,0.25,0.4],[sx+x,0.96,sz+0.25],dark);s.box([0.06,0.26,0.42],[sx+x,0.97,sz+0.25],orange);}if(a.visit==='tools'){s.ring(0.2,0.025,[sx,0.89,sz+0.25],metal).rotation.x=Math.PI/2;s.rod([sx-0.7,0.87,sz+0.2],[sx-0.3,0.87,sz+0.2],0.018,metal);s.ball([0.09,0.025,0.06],[sx-0.27,0.87,sz+0.2],metal,12);}
  const ex=5,ez=-1.8;
  if(a.station==='mast'){s.rod([ex,0,ez],[ex,3,ez],0.065,metal);for(const dx of [-0.9,0.9])s.rod([ex+dx,0,ez],[ex,2.2,ez],0.015,metal);s.box([0.55,0.4,0.08],[ex,2.7,ez],pale);}
  if(a.station==='power')for(const dx of [-0.6,0.6]){const p=s.box([1,0.05,0.8],[ex+dx,0.65,ez],dark);p.rotation.x=-0.4;for(const dz of [-0.3,0.3])s.rod([ex+dx,0,ez+dz],[ex+dx,0.65,ez+dz],0.04,metal);}if(a.station==='power')s.box([0.8,0.4,0.5],[ex,0.2,ez+0.9],dark);
  if(a.station==='samples'){for(const x of [-0.8,0.8])s.box([0.06,1.25,0.65],[ex+x,0.625,ez],metal);for(const y of [0.4,0.9]){s.box([1.8,0.05,0.7],[ex,y,ez],metal);for(let j=0;j<4;j++)s.box([0.35,0.18,0.45],[ex+(j-1.5)*0.4,y+0.12,ez],pale);}}
  if(a.station==='gauge'){s.rod([ex,0,ez],[ex,2.5,ez],0.04,metal);s.cylinder(0.25,0.04,0.25,[ex,2.5,ez],metal,24);s.box([0.1,1.4,0.05],[ex-0.5,0.7,ez],pale);for(let j=0;j<10;j++)s.box([0.09,0.035,0.01],[ex-0.5,0.1+j*0.13,ez+0.035],dark);}
  const haze=s.material('#d2d1c3',{transparent:true,opacity:0.2,depthWrite:false});if(a.air==='haze')s.ball([6.4,0.15,0.5],[0,0.8,-4.7],haze,24);if(a.air==='plume')for(let j=0;j<4;j++)s.ball([0.3+j*0.16,0.35,0.25+j*0.1],[j*0.3,H+j*0.45,-5],haze,16);if(a.air==='fallout')s.scatter(new THREE.IcosahedronGeometry(0.025,0),pale,Array.from({length:60},()=>({at:[(context.random()-0.5)*12,0.7+context.random()*2,-3.7-context.random()*1.5] as [number,number,number],size:1})));
  return world;
}});
