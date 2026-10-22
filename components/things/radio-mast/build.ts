import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing } from '@conjure/kit';
export default defineThing({questions:{
 height:score('How high does the mast rise?', ['A six-metre local mast','A thirty-metre relay tower']),
 structure:choice('What supports the antennas?',{lattice:'A triangulated steel lattice mast.',monopole:'A tapering tubular monopole.',guyed:'A slender lattice tower with three guy wires.'}),
 equipment:choice('What signals are handled?',{broadcast:'Horizontal broadcast dipoles.',cell:'Vertical rectangular cellular antenna panels.',microwave:'Small round microwave relay dishes.'}),
 tiers:score('How many antenna levels are fitted?', ['One lonely antenna set','Four stacked antenna levels']),
 livery:choice('How is the tower marked?',{silver:'Plain silver galvanized steel.',bands:'Alternating pale and muted red warning sections.',dark:'Dark weathered steel.'}),
 beacon:noul('Is the obstruction beacon operating?'),
 cabinet:noul('Is there a ground-level equipment cabinet?'),
},build(a,c){
 const s=new Sculpture(c),h=6+a.height*24,w=.7+h*.015,steel=s.material(a.livery==='dark'?'#61757f':'#9aaab1',{metalness:.6}),red=s.material('#a46d60'),dark=s.material('#475e68'),cream=s.material('#d2d1bb');
 if(a.structure==='monopole')s.cylinder(.15,w*.4,h,[0,h/2,0],steel);
 else for(let k=0;k<3;k++){const q=k*Math.PI*2/3,x=Math.sin(q)*w*.5,z=Math.cos(q)*w*.5;s.rod([x,0,z],[x*.45,h,z*.45],.055,steel);for(let j=0;j<12;j++){const q2=(k+1)*Math.PI*2/3,y=j*h/12,sh=1-j*.55/12;s.rod([x*sh,y,z*sh],[Math.sin(q2)*w*.5*(sh-.55/12),y+h/12,Math.cos(q2)*w*.5*(sh-.55/12)],.022,a.livery==='bands'&&j%2===0?red:steel);}}
 for(let j=0;j<Math.ceil(h/.3);j++)s.rod([-.16,j*.3,w*.45],[.16,j*.3,w*.45],.015,dark);
 const n=1+Math.round(a.tiers*3);for(let j=0;j<n;j++){const y=h*(.6+j*.11);const ring=s.ring(w*.8,.035,[0,y,0],steel);ring.rotation.x=Math.PI/2;for(let i=0;i<3;i++){const q=i*Math.PI*2/3,x=Math.sin(q)*w,z=Math.cos(q)*w;s.rod([0,y,0],[x,y,z],.035,dark);if(a.equipment==='cell'){const p=s.box([.27,1.1,.13],[x,y+.4,z],cream);p.rotation.y=q;}else if(a.equipment==='broadcast'){s.rod([x,y-.4,z],[x,y+.4,z],.02,steel);s.rod([x-.35,y,z],[x+.35,y,z],.025,steel);}else{const dish=s.mesh(new THREE.SphereGeometry(.38,16,10,0,Math.PI*2,0,.7),cream,[x,y,z]);dish.rotation.x=Math.PI/2;dish.rotation.z=q;}}}
 if(a.structure==='guyed')for(let i=0;i<3;i++){const q=i*Math.PI*2/3;s.rod([0,h*.75,0],[Math.sin(q)*h*.25,0,Math.cos(q)*h*.25],.014,steel);s.box([.3,.2,.3],[Math.sin(q)*h*.25,.1,Math.cos(q)*h*.25],dark);}
 s.rod([0,h,0],[0,h+.7,0],.035,steel);if(a.beacon)s.ball([.1,.12,.1],[0,h+.77,0],s.material('#c48468',{emissive:'#b55c45',emissiveIntensity:1}));
 if(a.cabinet){s.box([.85,1.4,.7],[w, .7,.7],cream);s.label('RELAY / 07',.7,.16,[w,1,.106+.95]);}
 return s.finish();}});
