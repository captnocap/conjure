import * as THREE from 'three';
import { defineWorld, diorama, choice, score, noul } from '@conjure/kit';
export default defineWorld({questions:{
 vocation:choice('What kind of harbour does the pier serve?',{cargo:'A working cargo pier with stacked goods.',fishing:'A small fishing harbour with net racks.',marina:'A tidy passenger and recreational harbour.'}),
 structure:choice('How was the pier built?',{timber:'Timber boards on visible wooden piles.',concrete:'A solid concrete pier with cast edge caps.',stone:'An old stone quay with large block courses.'}),
 water:choice('What water surrounds the quay?',{blue:'Pale coastal blue water.',green:'Muted green estuary water.',grey:'Cool grey northern harbour water.'}),
 edge:choice('How is the dock edge protected?',{tyres:'Hanging black tyre fenders.',rubber:'Long rectangular rubber buffer strips.',rope:'Coiled ropes and small canvas fenders.'}),
 buildings:choice('What stands at the shore end?',{warehouse:'A low ribbed cargo warehouse.',boathouse:'A timber boathouse with pitched roof.',kiosk:'A small harbour office with a service window.'}),
 lamps:noul('Do tall dock lamps mark the pier?'),
 traffic:score('How many service fixtures occupy the dock edges?', ['Two quiet mooring posts','A busy line of bollards and goods']),
 horizon:noul('Does a distant breakwater close the harbour?'),
},build(a,c){
 const {art:s,world}=diorama(c,{background:'#c5d4d4',floor:null,width:24,depth:18,yaw:24,pitch:31,maxHeight:4,radius:1.7,slots:[[0,2],[-2,-1],[2,-1],[-6,-6],[6,-6],[0,6]]});
 const timber=s.material('#a58d66'),stone=s.material('#b8b8aa'),dark=s.material('#526d78'),metal=s.material('#8299a1',{metalness:.4}),water=s.material(a.water==='blue'?'#93b8c3':a.water==='green'?'#8cb1a6':'#a7bdc0',{metalness:.15,roughness:.3});
 const deck=a.structure==='timber'?timber:stone;const ground=s.box([24,.22,18],[0,-.58,0],water);world.ground=ground;
 s.box([8,.38,15],[0,-.19,1],deck);s.box([22,.45,4],[0,-.225,-6.4],deck);
 if(a.structure==='timber')for(let z=-6;z<8.5;z+=.5)s.box([7.8,.012,.025],[0,.012,z],dark);
 for(const x of [-3.6,3.6])for(let z=-5;z<=7;z+=3){s.cylinder(.16,.2,1.7,[x,-.7,z],timber);s.cylinder(.12,.17,.35,[x,.175,z],dark);s.rod([x-.25,.35,z],[x+.25,.35,z],.06,dark);if(a.edge==='tyres'){const r=s.ring(.35,.11,[x*1.12,-.1,z],dark);r.rotation.y=Math.PI/2;}else if(a.edge==='rubber')s.box([.18,.4,1.6],[x*1.11,-.2,z],dark);else{s.ring(.28,.035,[x, .065,z+.55],timber).rotation.x=Math.PI/2;s.ball([.13,.3,.13],[x*1.1,-.2,z],stone);}}
 const bx=-8,bz=-5.5;s.box([4,2.8,3],[bx,1.4,bz],a.buildings==='boathouse'?timber:stone);
 if(a.buildings==='boathouse')for(const side of [-1,1]){const r=s.box([2.3,.15,3.3],[bx+side*.97,3.1,bz],dark);r.rotation.z=-side*.33;}else s.box([4.2,.16,3.2],[bx,2.9,bz],dark);
 s.box([1.5,1.7,.03],[bx, .85,bz+1.52],dark);if(a.buildings==='warehouse')for(let i=0;i<12;i++)s.box([.035,2.7,.03],[bx-1.8+i*.325,1.4,bz+1.54],metal);if(a.buildings==='kiosk')s.box([1.8,.7,.03],[bx,1.7,bz+1.55],s.material('#81a7af'));
 if(a.lamps)for(const x of [-3.3,3.3])for(const z of [-3,5]){s.rod([x,0,z],[x,3.6,z],.05,dark);s.box([.5,.16,.3],[x,3.7,z],s.material('#d9d0a7',{emissive:'#c5b17b',emissiveIntensity:.5}));}
 const n=2+Math.round(a.traffic*4);for(let i=0;i<n;i++){const z=-4+i*2;if(a.vocation==='cargo'){s.box([.7,.7,.7],[3,.35,z],timber);for(const x of [-.2,.2])s.box([.04,.72,.72],[3+x,.35,z],dark);}else if(a.vocation==='fishing'){s.rod([3,0,z],[3,1.4,z],.035,metal);for(let j=0;j<4;j++)s.rod([2.6+j*.2,.6,z],[2.6+j*.2,1.3,z],.012,dark);}else s.cylinder(.14,.2,.5,[3,.25,z],metal);}
 if(a.horizon){s.box([21,.55,1],[0,-.15,-8.1],stone);for(let i=0;i<16;i++)s.mesh(new THREE.DodecahedronGeometry(.35),stone,[-10+i*1.3,.1,-8.1]);}
 return world;}});
