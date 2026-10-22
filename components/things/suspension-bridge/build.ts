import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing } from '@conjure/kit';
export default defineThing({questions:{
 span:score('How long is the bridge span?', ['A thirty-metre pedestrian crossing','A two-hundred-metre road crossing']),
 towers:choice('What shapes the bridge towers?',{portal:'Rectangular steel portal towers.',arch:'Masonry piers with a high connecting arch.',needle:'Narrow pylons connected by upper crossbars.'}),
 deck:choice('What crosses the bridge?',{footpath:'A timber pedestrian walkway.',road:'An asphalt road with a centre line.',rail:'Two polished rail tracks on sleepers.'}),
 cables:choice('How are the main cables arranged?',{classic:'Two sweeping cables with vertical hangers.',double:'Four parallel cables with dense hangers.',fan:'Straight fan stays reaching from the tower tops.'}),
 approach:choice('How do the ends meet the terrain?',{level:'Level open-ended deck approaches.',ramps:'Short sloping ramps at both ends.',anchors:'Visible concrete cable anchor blocks.'}),
 lights:noul('Are small lamps mounted along the railing?'),
 paint:choice('What colour identifies the bridge?',{red:'Oxide red painted structural steel.',silver:'Cool unpainted grey metal.',cream:'Cream-painted historic structure.'}),
},build(a,c){
 const s=new Sculpture(c),l=30+a.span*170,w=a.deck==='footpath'?2.5:7,dy=4+a.span*5,th=10+a.span*22,tx=l*.28,steel=s.material(a.paint==='red'?'#af6d59':a.paint==='cream'?'#d5c9a5':'#8a9aa5',{metalness:.35}),cable=s.material('#475960',{metalness:.6}),stone=s.material('#b6b3a7'),surface=s.material(a.deck==='footpath'?'#aa9471':'#5e6871');
 s.box([l,.5,w],[0,dy,0],surface);
 for(const x of [-tx,tx]){
  for(const z of [-w*.62,w*.62])s.box([a.towers==='needle'?.55:1.1,th,1.1],[x,th/2,z],a.towers==='arch'?stone:steel);
  s.box([1.1,.65,w*1.4],[x,th-.5,0],steel);
  if(a.towers==='portal')s.box([.75,.45,w*1.3],[x,dy+3,0],steel);
  if(a.towers==='arch')s.tube([[x,th-3,-w*.62],[x,th-1,-w*.3],[x,th,0],[x,th-1,w*.3],[x,th-3,w*.62]],.4,stone);
 }
 const sides=a.cables==='double'?[-.65,-.55,.55,.65]:[-.6,.6];
 for(const side of sides){
  const z=side*w;
  if(a.cables==='fan')for(const x of [-tx,tx])for(let j=0;j<8;j++){const target=x+(j-3.5)*l*.032;s.rod([x,th,z],[target,dy+.35,z],.055,cable);}
  else{
   const points:[number,number,number][]=[];for(let j=0;j<=24;j++){const x=-tx+j*2*tx/24,y=dy+2+(th-dy-2)*(x/tx)**2;points.push([x,y,z]);if(j%2===0)s.rod([x,dy+.3,z],[x,y,z],.04,cable);}s.tube(points,.085,cable);
   for(const sideX of [-1,1])s.tube([[sideX*tx,th,z],[sideX*l*.39,th*.5,z],[sideX*l*.5,dy+.6,z]],.085,cable);
  }
 }
 for(const side of [-1,1]){s.rod([-l/2,dy+1,side*w*.48],[l/2,dy+1,side*w*.48],.065,steel);for(let i=0;i<18;i++){const x=-l/2+i*l/17;s.rod([x,dy+.25,side*w*.48],[x,dy+1,side*w*.48],.045,steel);if(a.lights&&i%3===0){s.rod([x,dy+1,side*w*.5],[x,dy+2,side*w*.5],.04,steel);s.ball([.12,.12,.12],[x,dy+2,side*w*.5],s.material('#e2cd93',{emissive:'#e2cd93',emissiveIntensity:.5}));}}}
 if(a.deck==='road')for(let i=0;i<16;i++)s.box([l/40,.012,.15],[-l/2+l*(i+.5)/16,dy+.256,0],s.material('#e2cf99'));
 if(a.deck==='rail'){for(const z of [-.72,.72])s.rod([-l/2,dy+.32,z],[l/2,dy+.32,z],.055,cable);for(let i=0;i<36;i++)s.box([.2,.08,2.3],[-l/2+(i+.5)*l/36,dy+.28,0],steel);}
 if(a.approach==='anchors')for(const x of [-1,1])for(const z of [-1,1])s.box([2,2,1.6],[x*l*.49,dy+.5,z*w*.7],stone);
 if(a.approach==='ramps')for(const x of [-1,1]){const ramp=s.box([l*.12,.35,w],[x*l*.55,dy*.73,0],surface);ramp.rotation.z=-x*.25;}
 return s.finish({footprint:l/2});}});
