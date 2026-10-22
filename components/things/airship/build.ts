import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing } from '@conjure/kit';
export default defineThing({questions:{
 vessel:choice('What sort of airship is this?',{zeppelin:'A long rigid zeppelin with exposed longitudinal seams.',blimp:'A short rounded soft-envelope blimp.',fantasy:'A broad expedition balloon carrying an open wooden gondola.'}),
 length:score('How large is the airship?', ['An eight-metre private airship','An eighty-metre passenger vessel']),
 livery:choice('What colours cover the envelope?',{silver:'Silver-grey panels and charcoal seams.',cream:'Cream canvas with oxide-red accents.',blue:'Muted blue fabric with pale bands.'}),
 cabin:choice('What hangs beneath the envelope?',{passenger:'An enclosed cabin with a row of windows.',cargo:'An open gondola carrying strapped crates.',observatory:'A small glazed observation cabin.'}),
 propulsion:choice('What moves the airship?',{twin:'Two lateral engine pods and propellers.',quad:'Four small engine nacelles.',sail:'No engine, only a fantasy steering sail.'}),
 ropes:noul('Are mooring ropes trailing beneath the bow?'),
 tail:choice('What tail surfaces guide the ship?',{cross:'Four cruciform stabilizer fins.',triple:'Three swept tail fins.',rudder:'A large upright rudder and horizontal tailplane.'}),
},build(a,c){
 const s=new Sculpture(c),l=8+a.length*72,r=l*(a.vessel==='blimp'?.22:.14),y=r*1.7,skin=s.material(a.livery==='silver'?'#aebec4':a.livery==='cream'?'#d3c5a6':'#7698ae',{metalness:a.livery==='silver'?.35:.05}),seam=s.material('#6d7d7f'),accent=s.material(a.livery==='cream'?'#a36a55':'#4f677a'),wood=s.material('#967b57'),glass=s.material('#416775',{metalness:.3});
 s.ball([r,r,l*.5],[0,y,0],skin,40);
 for(let i=0;i<10;i++){const q=i*Math.PI/5;const pts=Array.from({length:17},(_,j)=>{const z=-l*.49+j*l*.98/16,rr=r*Math.sqrt(1-(z/(l*.5))**2)*1.002;return [Math.sin(q)*rr,y+Math.cos(q)*rr,z] as const;});s.tube(pts,r*.008,seam);}
 for(const z of [-.3,0,.3]){const rr=r*Math.sqrt(1-(z*2)**2),band=s.ring(rr,r*.01,[0,y,z*l],accent);}
 const ch=l*.055,cw=r*.75,cl=l*.25,cy=y-r-ch*.65;
 s.box([cw,ch,cl],[0,cy,0],a.cabin==='cargo'?wood:accent);
 for(const x of [-1,1])for(const z of [-1,1])s.rod([x*cw*.4,cy+ch*.45,z*cl*.4],[x*r*.5,y-r*.72,z*cl*.5],r*.018,seam);
 if(a.cabin==='cargo')for(let i=0;i<4;i++){s.box([cw*.6,ch*.65,cl*.18],[0,cy+ch*.6,(i-1.5)*cl*.22],wood);s.box([cw*.63,.025,cl*.03],[0,cy+ch*.94,(i-1.5)*cl*.22],accent);}
 else for(const x of [-1,1])for(let i=0;i<6;i++)s.box([.015,ch*.48,cl*.1],[x*cw*.505,cy+ch*.1,(i-2.5)*cl*.14],glass);
 const finShape=new THREE.Shape().moveTo(0,0).lineTo(l*.16,0).lineTo(l*.1,r*1.6).lineTo(0,r*.5).closePath();const geo=new THREE.ExtrudeGeometry(finShape,{depth:r*.06,bevelEnabled:false});
 const fn=a.tail==='cross'?4:a.tail==='triple'?3:3;for(let i=0;i<fn;i++){const fin=s.mesh(geo,accent,[0,y,-l*.48]);fin.rotation.y=Math.PI/2;fin.rotation.z=i*Math.PI*2/fn;}
 if(a.propulsion==='sail'){s.box([r*.02,r*1.4,l*.12],[0,y+r*.6,-l*.2],wood);}
 else for(let i=0;i<(a.propulsion==='quad'?4:2);i++){const x=(i%2?1:-1)*r*.85,z=i<2?l*.06:-l*.12;const pod=s.cylinder(r*.13,r*.13,l*.055,[x,cy,z],accent);pod.rotation.x=Math.PI/2;s.rod([0,cy,z],[x,cy,z],r*.025,seam);for(let j=0;j<2;j++){const blade=s.box([r*.055,r*.75,r*.035],[x,cy,z+l*.04],wood);blade.rotation.z=j*Math.PI/2+.25;}}
 if(a.ropes)for(const x of [-1,1])s.tube([[x*r*.3,y-r*.8,l*.3],[x*r*.2,r*.25,l*.38],[x*r*.55,0,l*.45]],r*.009,wood);
 return s.finish();}});
