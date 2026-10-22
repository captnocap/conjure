import * as THREE from 'three';
import { defineWorld, diorama, choice, score, noul } from '@conjure/kit';
export default defineWorld({questions:{
 era:choice('What age does the archive belong to?',{timber:'An old timber library with warm shelves.',stone:'A monumental stone archive with pale alcoves.',future:'A future archive with steel racks and coded panels.'}),
 collection:choice('What fills the archive shelves?',{books:'Multicoloured hardbound books.',scrolls:'Bundles of cylindrical parchment scrolls.',plates:'Uniform numbered data plates and cassette cases.'}),
 fullness:score('How completely have the shelves been filled?', ['Many empty gaps','Dense volumes on every shelf']),
 floor:choice('What is underfoot?',{wood:'Long honey-coloured timber boards.',tile:'Pale checker-pattern stone tiles.',concrete:'Cool concrete divided by narrow brass strips.'}),
 rear:choice('What organizes the far end of the room?',{desk:'A compact catalogue desk and index drawers.',map:'A large labelled wall chart.',door:'A sealed archival door with a narrow observation panel.'}),
 ladders:noul('Are rolling shelf ladders present?'),
 lamps:choice('What fixtures mark the room?',{globes:'Small frosted globe wall fixtures.',bars:'Horizontal luminous strips above the shelving.',none:'Only daylight and the room architecture.'}),
 records:noul('Are tied bundles of unshelved records beside the rear desk?'),
},build(a,c){
 const {art:s,world}=diorama(c,{background:'#dedaca',floor:a.floor==='wood'?'#b39a74':a.floor==='tile'?'#cbc5b4':'#b8c1bf',width:16,depth:14,yaw:24,pitch:31,maxHeight:3.2,radius:1.25,slots:[[0,2],[-2.7,0],[2.7,0],[-2.7,4.4],[2.7,4.4],[0,-2.5]]});
 const frame=s.material(a.era==='timber'?'#806b4e':a.era==='stone'?'#b4b2a1':'#738893'),wall=s.material('#d4cfbb'),dark=s.material('#4c656a'),brass=s.material('#b4a06c'),paper=s.material('#c9c4a8');
 s.box([16,4.8,.2],[0,2.4,-6.9],wall);s.box([.2,4.8,13.5],[-7.9,2.4,-.2],wall);
 if(a.floor==='wood')for(let x=-7.5;x<8;x+=.6)s.box([.02,.01,13.5],[x,.01,0],frame);
 if(a.floor==='tile')for(let x=-7;x<=7;x+=2)for(let z=-6;z<=6;z+=2)if((x+z+13)%4===0)s.box([1.95,.012,1.95],[x,.012,z],paper);
 if(a.floor==='concrete')for(let x=-6;x<=6;x+=3)s.box([.025,.012,13.5],[x,.012,0],brass);
 const volumes:{at:readonly [number,number,number];size:number;color:string}[]=[];
 for(const side of [-1,1])for(let bay=0;bay<3;bay++){
  const x=side*6.6,z=-4.3+bay*3.3;
  for(const zz of [-1,1])s.box([.75,4.2,.1],[x,2.1,z+zz*1.35],frame);
  s.box([.08,4.2,2.8],[side*7,2.1,z],frame);
  for(let shelf=0;shelf<6;shelf++){
   const y=.15+shelf*.65;s.box([.85,.07,2.8],[x,y,z],frame);
   for(let j=0;j<15;j++){if(c.random()>.35+a.fullness*.65)continue;const at=[x,y+.29,z-1.25+j*.17] as const;if(a.collection==='scrolls'){const roll=s.cylinder(.075,.075,.55,at,paper,10);roll.rotation.z=Math.PI/2;}else volumes.push({at,size:.85+c.random()*.2,color:a.collection==='plates'?'#859ca2':['#9f765b','#5b7d86','#b7ab79','#667665'][j%4]});}
  }
 }
 if(volumes.length)s.scatter(new THREE.BoxGeometry(.55,.5,.14),s.material('#c4c0ae'),volumes);
 if(a.rear==='desk'){
  s.box([3,.14,1.5],[0,1.15,-5.7],frame);for(const x of [-1.2,1.2])s.box([.5,1.1,1.2],[x,.55,-5.7],frame);
  for(let i=0;i<4;i++)for(const x of [-1.2,1.2]){s.box([.42,.19,.03],[x,.22+i*.23,-5.08],paper);s.box([.1,.035,.03],[x,.22+i*.23,-5.05],brass);}
  s.label('CATALOGUE / 07',2.5,.34,[0,2.4,-6.75],'#4d6059','#d9ceb6');
 }else if(a.rear==='map'){s.box([4,2.5,.04],[0,2.7,-6.75],paper);for(let i=0;i<5;i++){s.rod([-1.7,1.8+i*.45,-6.7],[1.7,1.8+i*.45,-6.7],.01,frame);s.rod([-.8+i*.5,1.5,-6.7],[-.8+i*.5,3.9,-6.7],.01,frame);}s.label('INDEX / NORTH',2.5,.24,[0,4.3,-6.7]);}
 else{s.box([2.2,3.2,.12],[0,1.6,-6.7],dark);s.box([1.2,.4,.02],[0,2.2,-6.62],paper);s.label('RESTRICTED',1.8,.22,[0,1.4,-6.61]);}
 if(a.ladders)for(const side of [-1,1]){for(const z of [-.32,.32])s.rod([side*5.6,0,z-1],[side*6.3,3.8,z-1],.035,frame);for(let j=0;j<12;j++)s.rod([side*(5.6+j*.7/12),j*3.8/12,-1.32],[side*(5.6+j*.7/12),j*3.8/12,-.68],.03,frame);}
 if(a.lamps!=='none')for(const side of [-1,1])for(let bay=0;bay<3;bay++){const col=s.material('#e0d0a4',{emissive:'#cabb90',emissiveIntensity:.4});if(a.lamps==='globes')s.ball([.15,.15,.15],[side*6.2,4.4,-4.3+bay*3.3],col);else s.box([.04,.06,2.5],[side*6.4,4.25,-4.3+bay*3.3],col);}
 if(a.records)for(let i=0;i<5;i++){s.box([.45,.16,.7],[2.2,.08+i*.16,-5.8],paper);s.box([.03,.17,.72],[2.2,.08+i*.16,-5.8],brass);}
 return world;}});
