import * as THREE from 'three';
import { defineWorld, diorama, choice, score, noul } from '@conjure/kit';
export default defineWorld({questions:{
 station:choice('What kind of station is this?',{rural:'A small rural station with timber shelter.',city:'An urban station with a clean steel canopy.',freight:'An industrial loading platform with utility signage.'}),
 floor:choice('What is the platform surface?',{stone:'Pale stone paving slabs.',brick:'Red-brown brick paving.',concrete:'Cool concrete with yellow safety lines.'}),
 canopy:choice('How much shelter is provided?',{full:'A narrow canopy covers most of one platform.',small:'A small waiting shelter at the rear.',none:'No roof, only station fixtures.'}),
 tracks:choice('What kind of track is laid?',{ballast:'Rails over grey ballast and wooden sleepers.',slab:'Rails laid in a flat concrete bed.',grass:'Old rails between patches of encroaching grass.'}),
 signs:choice('What is the station called?',{north:'NORTH / PLATFORM 07',home:'HOME JUNCTION',terminus:'LAST STOP / TERMINUS'}),
 overhead:noul('Is overhead electrical wiring fitted?'),
 signal:choice('What does the lineside signal show?',{red:'A red stop lamp.',green:'A green clear lamp.',off:'An unlit signal face.'}),
 fixtures:score('How many platform service fixtures are present?', ['One timetable stand','Several benches, signs and bins']),
},build(a,c){
 const {art:s,world}=diorama(c,{background:'#d1d9d4',floor:'#a4afa7',width:22,depth:18,yaw:23,pitch:30,maxHeight:4,radius:1.5,slots:[[0,2],[-5,-1],[5,-1],[-5,4],[5,4],[0,-4]]});
 const metal=s.material('#7a909a'),dark=s.material('#4d6974'),stone=s.material(a.floor==='brick'?'#b28d76':a.floor==='stone'?'#c8c2af':'#bec5bb'),wood=s.material('#a18c68'),yellow=s.material('#c3b575'),grass=s.material('#81957a');
 for(const x of [-5,5])s.box([6,.25,17],[x,-.125,0],stone);
 for(const x of [-2.25,2.25])s.box([.12,.02,17],[x,.012,0],yellow);
 for(const x of [-.78,.78])s.rod([x,.06,-8.5],[x,.06,8.5],.045,metal);
 for(let z=-8;z<=8;z+=.6)s.box([2.5,.07,.2],[0,.015,z],wood);
 if(a.tracks==='ballast')s.scatter(new THREE.DodecahedronGeometry(1),s.material('#9ca69e'),Array.from({length:160},()=>({at:[(c.random()-.5)*3,.03,(c.random()-.5)*17] as const,size:.04+c.random()*.04})));
 if(a.tracks==='grass')s.scatter(new THREE.ConeGeometry(.055,.28,5),grass,Array.from({length:55},()=>({at:[(c.random()-.5)*3,.12,(c.random()-.5)*17] as const,size:.6+c.random()*.4})));
 if(a.canopy!=='none'){
  const long=a.canopy==='full'?13:4,z=a.canopy==='full'?0:-5.5;for(const zz of [-1,1])s.rod([-7,0,z+zz*long*.4],[-7,3.5,z+zz*long*.4],.09,a.station==='rural'?wood:metal);s.box([4.4,.16,long],[-6,3.55,z],a.station==='rural'?wood:dark);if(a.canopy==='small')s.box([.12,2.4,4],[-7.8,1.2,z],metal);
 }
 const sign=a.signs==='north'?'NORTH 07':a.signs==='home'?'HOME JUNCTION':'LAST STOP';for(const x of [-1,1]){s.rod([x*5,0,-7],[x*5,2.2,-7],.045,dark);s.label(sign,2.8,.44,[x*5,2.2,-6.96]);}
 if(a.overhead)for(const z of [-6,6]){for(const x of [-3,3])s.rod([x,0,z],[x,5,z],.075,metal);s.rod([-3,5,z],[3,5,z],.07,metal);}if(a.overhead)s.tube([[0,4.8,-8],[0,4.5,0],[0,4.8,8]],.015,dark);
 s.rod([2,0,-5],[2,2.9,-5],.05,dark);s.box([.4,.85,.16],[2,2.7,-5],dark);for(let j=0;j<2;j++)s.ball([.12,.12,.04],[2,2.9-j*.4,-4.9],s.material(j===0?(a.signal==='red'?'#c08973':'#677d79'):(a.signal==='green'?'#8cbb8f':'#677d79'),{emissive:j===0&&a.signal==='red'?'#a45a45':j===1&&a.signal==='green'?'#5e986c':'#000000',emissiveIntensity:.6}));
 const n=1+Math.round(a.fixtures*3);for(let i=0;i<n;i++){const z=-5+i*3.2;s.box([.65,.6,.65],[7,.3,z],dark);if(i%2===0){s.rod([7,0,z],[7,1.9,z],.035,metal);s.label('TIMETABLE',.7,.85,[7,1.6,z+.35]);}else{s.box([.8,.15,2],[7,.65,z],wood);s.box([.1,.75,2],[7.4,1,z],wood);}}
 return world;}});
