import * as THREE from 'three';
import { defineWorld, diorama, choice, score, noul } from '@conjure/kit';
export default defineWorld({questions:{
 terrain:choice('What rock forms the ridge?',{granite:'Cold grey granite and pale gravel.',sandstone:'Warm layered sandstone.',snow:'Dark stone with patches of lingering snow.'}),
 terrace:choice('How was the summit prepared?',{concrete:'A concrete instrument terrace with expansion joints.',gravel:'A broad compacted gravel clearing.',timber:'A low wooden observing deck.'}),
 shelter:choice('What shelter stands at the far edge?',{cabin:'A small timber astronomers cabin.',laboratory:'A low white laboratory with a flat roof.',none:'Only exposed terrain and instruments.'}),
 path:choice('How does the access path arrive?',{stairs:'A narrow stone stair on the left edge.',switchback:'A switchback gravel road behind the terrace.',ladder:'An iron ladder descending a cliff edge.'}),
 railing:noul('Does a protective railing follow the cliff?'),
 instruments:score('How many small horizon instruments are installed?', ['One simple survey post','A row of weather and survey sensors']),
 marker:choice('What marks this lonely summit?',{flag:'A small red survey flag.',beacon:'An amber warning beacon.',none:'No marker at all.'}),
 ridges:score('How rugged is the visible ridge profile?', ['Low rounded ridges','Tall fractured rock teeth']),
},build(a,c){
 const {art:s,world}=diorama(c,{background:'#c7d3d8',floor:null,width:22,depth:16,yaw:30,pitch:30,maxHeight:4.5,radius:2.2,slots:[[0,1],[-5,1],[5,1],[-5,5],[5,5],[0,5.5]]});
 const rock=s.material(a.terrain==='sandstone'?'#bca07d':'#8c9aa0'),dark=s.material('#52646d'),wood=s.material('#9b8160'),snow=s.material('#dce1d9'),floor=s.material(a.terrace==='concrete'?'#b5bcb8':a.terrace==='timber'?'#af9574':'#a6ada3');
 const ground=s.box([20,.35,13],[0,-.175,0],floor);world.ground=ground;
 for(let i=0;i<18;i++){const q=i*Math.PI*2/18,x=Math.sin(q)*10,z=Math.cos(q)*7.3,h=.7+c.random()*a.ridges*1.7;const p=s.mesh(new THREE.DodecahedronGeometry(1),rock,[x,-h*.5,z]);p.scale.set(1.3,h+1,1.2);if(a.terrain==='snow')s.ball([.9,.15,.7],[x,.2,z],snow);}
 if(a.terrace==='concrete')for(let x=-8;x<=8;x+=4)s.box([.025,.015,12],[x,.012,0],dark);
 if(a.terrace==='timber')for(let z=-6;z<=6;z+=.6)s.box([19.8,.012,.025],[0,.018,z],wood);
 for(let i=0;i<8;i++){const p=s.mesh(new THREE.DodecahedronGeometry(1),rock,[-10+i*2.8,.3+c.random(),-7]);p.scale.set(2,1+a.ridges*2,1.3);}
 if(a.shelter!=='none'){
  const paint=a.shelter==='cabin'?wood:snow;s.box([4.5,2.1,2.8],[3.5,1.05,-5.1],paint);s.box([1,1.6,.06],[3.5,.85,-3.68],dark);s.box([1.2,.55,.05],[5,1.35,-3.68],s.material('#7e9fac'));
  if(a.shelter==='cabin'){for(const x of [-1,1]){const roof=s.box([2.8,.15,3.1],[3.5+x*1.17,2.4,-5.1],dark);roof.rotation.z=-x*.3;}}else s.box([4.8,.15,3.1],[3.5,2.18,-5.1],dark);
 }
 if(a.path==='stairs')for(let i=0;i<12;i++)s.box([1.3,.16,.5],[-9,-1.9+i*.16,4-i*.38],rock);
 if(a.path==='switchback')s.tube([[-10,-.1,-4],[-5,-.1,-7],[1,-.1,-4.5],[7,-.1,-7]],.2,wood);
 if(a.path==='ladder'){for(const x of [-.3,.3])s.rod([-9+x,-3,3],[-9+x,.9,3],.045,dark);for(let j=0;j<13;j++)s.rod([-9.3,-3+j*.3,3],[-8.7,-3+j*.3,3],.035,dark);}
 if(a.railing)for(const z of [-6.5,6.5]){s.rod([-9,1,z],[9,1,z],.04,dark);for(let x=-9;x<=9;x+=1.5)s.rod([x,0,z],[x,1,z],.035,dark);}
 const n=1+Math.round(a.instruments*4);for(let i=0;i<n;i++){const x=-7+i*2.1;s.rod([x,0,-4.8],[x,1.8,-4.8],.035,dark);s.rod([x-.4,1.6,-4.8],[x+.4,1.6,-4.8],.025,dark);s.ball([.12,.12,.12],[x,1.85,-4.8],snow);}
 if(a.marker!=='none'){s.rod([-8,0,-2],[-8,3.2,-2],.04,dark);if(a.marker==='flag')s.box([.85,.4,.02],[-7.6,2.9,-2],s.material('#a36052'));else s.ball([.12,.12,.12],[-8,3.25,-2],s.material('#d2b477',{emissive:'#c59a4f',emissiveIntensity:.8}));}
 return world;}});
