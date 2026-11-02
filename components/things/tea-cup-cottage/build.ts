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
  vessel:choice("What shape is the inhabited cup?",{"flared": "A broad flared teacup.", "straight": "A straight-sided breakfast cup.", "tall": "A tall narrow cocoa cup.", "round": "A rounded bowl-shaped cup."}),
  roof:choice("What roofs the cup?",{"saucer": "An inverted saucer with a knob chimney.", "leaf": "A broad curved leaf held on a timber rim.", "shingles": "A conical roof with overlapping wooden shingles.", "dome": "A low porcelain dome with a central vent."}),
  handle:choice("What is the cup handle?",{"round": "A round loop handle.", "heart": "A double-curved heart handle.", "square": "A squared loop with softened corners.", "twig": "A joined twig loop."}),
  entry:choice("What closes the real front doorway?",{"open": "An open arch reveals a dark interior.", "plank": "A fitted wooden plank door.", "split": "A Dutch door with the top half open.", "curtain": "A split fabric curtain leaves a central gap."}),
  windows:choice("How are the cottage windows divided?",{"round": "Round porthole frames.", "cross": "Crossed rectangular casements.", "diamond": "Diamond-shaped leaded windows.", "shutters": "Small windows with opened plank shutters."}),
  porch:choice("What is outside the doorway?",{"step": "A broad single porcelain doorstep.", "stairs": "Three short sugar-block stairs.", "deck": "A timber deck with small supporting legs.", "awning": "A small leaf awning over the doorstep."}),
  ceramic:choice("What ceramic decoration follows the cup?",{"blue": "Blue bands and small painted blue flowers.", "copper": "Copper-coloured rim and medallions.", "green": "Green leaves painted around the body.", "cream": "Plain cream glaze with a raised bead border."}),
  saucer:choice("What surrounds the cottage foot?",{"ring": "A clean circular saucer.", "scallop": "A saucer with a scalloped outer edge.", "garden": "A saucer holding a raised moss garden.", "cobbles": "A saucer with a ring of small paving stones."}),
  chimney:choice("What rises from the roof?",{"spout": "A tiny hollow bent teapot-spout chimney.", "stack": "A square brick chimney.", "vent": "A short round vent with a rain cap.", "sprout": "A planted cup chimney with a living sprout."}),
  story:choice("What has the resident left at home?",{"tea": "A tray and two tiny tea bowls on the porch.", "boots": "A pair of boots by the open door.", "mail": "A bundle of letters in a low wall box.", "bunting": "A short welcoming string of leaf pennants."}),
  proportion:score('How large is the cup home?', ['A very small one-room cup','A snug cottage','A broad family cup','A little two-level home'])
 },
 build(a,context){

 const s=new Sculpture(context),size=mix(.8,1.15,a.proportion),r=(a.vessel==='tall'?.62:.82)*size,h=(a.vessel==='tall'?1.48:a.vessel==='round'?1:1.2)*size,base=.13;
 const glaze=s.material('#e9dfbd',{roughness:.24}),trim=s.material(a.ceramic==='blue'?'#315e90':a.ceramic==='copper'?'#b77b45':a.ceramic==='green'?'#4e7955':'#ddd3af',{metalness:a.ceramic==='copper'?.6:0}),wood=s.material('#896247'),dark=s.material('#303a3b'),green=s.material('#54724a',{side:THREE.DoubleSide}),glass=s.material('#b9d1d0',{roughness:.2});
 disk(s,r*1.5,.12,[0,.06,0],glaze);s.lathe([[r*1.37,.08],[r*1.49,.14],[r*1.51,.22],[r*1.45,.23]],glaze);
 const rBottom=a.vessel==='flared'?r*.62:a.vessel==='round'?r*.72:r*.91;
 const profile=[[rBottom,.0],[rBottom*1.06,.15],[r,.65*h],[r,h],[r-.065,h],[r-.075,.7*h],[rBottom-.06,.12]] as [number,number][];
 // A real opening through the lower cup wall; its lintel is the continuous upper rim.
 const doorway=.43,cut=.29,lower:[number,number][]=[[rBottom,0],[rBottom*1.06,.15],[r-.005,h*.62],[r-.065,h*.62],[rBottom-.06,.12],[rBottom-.06,.03]];
 s.mesh(new THREE.LatheGeometry(lower.map(p=>new THREE.Vector2(...p)),48,cut,Math.PI*2-cut*2),glaze,[0,base,0]);
 s.lathe([[r-.01,h*.6],[r,h],[r-.065,h],[r-.065,h*.6]],glaze,[0,base,0]);disk(s,rBottom-.05,.06,[0,base+.03,0],wood);
 const top=base+h; const rim=s.ring(r,.04,[0,top,0],trim);rim.rotation.x=Math.PI/2;
 if(a.handle==='round')arc(s,[r*.94,base+h*.53,0],r*.5,h*.4,-Math.PI*.5,Math.PI*.5,.07,glaze);
 else if(a.handle==='heart')s.tube([[r*.9,base+h*.87,0],[r*1.25,base+h*1.02,0],[r*1.55,base+h*.8,0],[r*1.4,base+h*.5,0],[r*.9,base+h*.2,0]],.075,glaze);
 else s.tube([[r*.9,base+h*.86,0],[r*1.5,base+h*.86,0],[r*1.55,base+h*.27,0],[r*.9,base+h*.2,0]],a.handle==='twig'?.045:.075,a.handle==='twig'?wood:glaze);
 const z=r*.96,dh=h*.6; s.box([.055,dh,.09],[-doorway/2,base+dh/2,z],wood);s.box([.055,dh,.09],[doorway/2,base+dh/2,z],wood);s.box([doorway+.08,.06,.09],[0,base+dh,z],wood);
 if(a.entry==='plank'||a.entry==='split'){const height=a.entry==='split'?dh*.47:dh-.05;s.box([doorway-.035,height,.055],[0,base+height/2,z-.025],wood);for(let i=0;i<4;i++)s.box([.012,height,.012],[-doorway*.34+i*doorway*.225,base+height/2,z+.01],trim);s.ball([.025,.025,.025],[doorway*.32,base+height*.6,z+.035],trim);}
 if(a.entry==='curtain')for(const sign of[-1,1])s.box([doorway*.3,dh*.95,.018],[sign*doorway*.34,base+dh*.5,z],s.material('#ab695d'));
 for(const sign of[-1,1]){const angle=sign*.95,x=Math.sin(angle)*(r+.01),zz=Math.cos(angle)*(r+.01),y=base+h*.65;const g=new THREE.Group();s.root.add(g);const pane=s.box([.28,.32,.025],[x,y,zz],glass);pane.rotation.y=angle;g.attach(pane);
 const frame=s.ring(.19,.022,[x,y,zz],trim);frame.rotation.y=angle;if(a.windows==='diamond'){frame.geometry.dispose();frame.geometry=new THREE.TorusGeometry(.19,.024,6,4);frame.rotation.z=Math.PI/4;}
 if(a.windows==='cross'||a.windows==='shutters'){s.rod([x-.13*Math.cos(angle),y,zz+.13*Math.sin(angle)],[x+.13*Math.cos(angle),y,zz-.13*Math.sin(angle)],.012,wood);s.rod([x,y-.15,zz],[x,y+.15,zz],.012,wood);}
 if(a.windows==='shutters')for(const k of[-1,1]){const shutter=s.box([.1,.34,.035],[x+k*.19*Math.cos(angle),y,zz-k*.19*Math.sin(angle)],wood);shutter.rotation.y=angle+k*.6;}}
 if(a.roof==='saucer'){s.lathe([[0,.13],[r*.4,.12],[r*1.03,0],[r*1.12,.035],[r*1.11,.1],[r*.45,.22],[0,.24]],glaze,[0,top,0]);}
 else if(a.roof==='dome')s.surface((u,v,p)=>{const t=u*Math.PI*2,b=v*Math.PI*.5;p.set(Math.cos(t)*Math.sin(b)*r*1.08,Math.cos(b)*r*.55,Math.sin(t)*Math.sin(b)*r*1.08);},glaze,{segments:[48,16],wrap:true,at:[0,top,0]});
 else if(a.roof==='leaf'){disk(s,r,.08,[0,top+.02,0],wood);const l=leaf(s,[0,top+.06,0],r*2.6,r*2.6,green,.45);s.rod([-r*1.2,top+.07,0],[r*1.2,top+.07,0],.025,wood);l.rotation.y=.3;}
 else {s.cylinder(0,r*1.16,r*.7,[0,top+r*.35,0],wood,32);const shingle=s.material('#a17c55');for(let row=0;row<4;row++){const count=row===3?10:16,outer=r*1.16*(1-row/4),inner=Math.max(0,r*1.16*(1-(row+1)/4)-.025);for(let i=0;i<count;i++){const t=i*Math.PI*2/count+(row%2)*Math.PI/count;s.surface((u,v,p)=>{const angle=t+(u-.5)*Math.PI*2/count*.94,rr=mix(outer,inner,v);p.set(Math.cos(angle)*rr,top+r*.7*(1-rr/(r*1.16))+.014+row*.012,Math.sin(angle)*rr);},(i+row)%3?shingle:wood,{segments:[4,3],flip:true});}}}
 const cy=top+(a.roof==='shingles'?r*.7:a.roof==='leaf'?.4:a.roof==='dome'?r*.55:.24);
 if(a.chimney==='stack'){s.box([.19,.42,.19],[0,cy+.2,0],wood);hollow(s,.13,.07,.035,[0,cy+.41,0],trim);}else{hollow(s,.095,.26,.025,[0,cy-.015,0],a.chimney==='sprout'?glaze:trim);if(a.chimney==='vent')disk(s,.14,.035,[0,cy+.3,0],trim);if(a.chimney==='spout')s.tube([[0,cy+.1,0],[.08,cy+.3,0],[.21,cy+.35,0]],.08,glaze);if(a.chimney==='sprout'){s.rod([0,cy+.05,0],[.04,cy+.5,0],.018,green);leaf(s,[.07,cy+.39,0],.35,.18,green);}}
 if(a.porch==='stairs')for(let i=0;i<3;i++)s.box([.5,.12+.055*(3-i),.18],[0,(.12+.055*(3-i))/2,z+.12+i*.16],glaze);else{s.box([.6,.08,.42],[0,.16,z+.13],a.porch==='deck'?wood:glaze);if(a.porch==='deck')for(const x of[-.22,.22])for(const zz of[z-.02,z+.28])s.box([.045,.07,.045],[x,.085,zz],wood);if(a.porch==='awning'){leaf(s,[0,base+dh+.1,z+.18],.8,.9,green);for(const x of[-.3,.3])s.rod([x,0,z+.35],[x,base+dh+.1,z+.35],.022,wood);}}
 if(a.saucer==='scallop')for(let i=0;i<18;i++){const t=i*Math.PI/9;s.ball([.1,.035,.1],[Math.sin(t)*r*1.46,.18,Math.cos(t)*r*1.46],glaze,12);}
 if(a.saucer==='garden'||a.saucer==='cobbles')for(let i=0;i<24;i++){const t=i*Math.PI/12;if(Math.abs(t)<.4||t>Math.PI*2-.4)continue;const rr=r*1.25;s.ball([.09,.035+context.random()*.025,.08],[Math.sin(t)*rr,.15,Math.cos(t)*rr],a.saucer==='garden'?green:wood,10);}
 for(let i=0;i<12;i++){const t=.6+i*(Math.PI*2-1.2)/11,rr=r+.01;const m=s.ball([.025,.045,.018],[Math.sin(t)*rr,base+h*.42,Math.cos(t)*rr],trim,10);m.rotation.y=t;}
 const porchTop=a.porch==='stairs'?.285:.2;
 if(a.story==='tea'){disk(s,.19,.025,[.12,porchTop+.0125,z+.15],wood);for(const x of[.04,.2])hollow(s,.045,.06,.01,[x,porchTop+.025,z+.15],glaze);}
 if(a.story==='boots')for(const x of[-.1,.1]){s.box([.12,.09,.19],[x,porchTop+.045,z+.15],wood);s.cylinder(.045,.055,.15,[x,porchTop+.145,z+.08],wood);}
 if(a.story==='mail'){s.box([.2,.16,.1],[-.36,base+.26,z-.01],wood);for(let i=0;i<3;i++){const letter=s.box([.15,.13,.008],[-.36,base+.34,z-.015+i*.012],glaze);letter.rotation.z=(i-1)*.16;}}
 if(a.story==='bunting'){s.tube([[-.38,base+dh+.12,z+.07],[0,base+dh+.03,z+.09],[.38,base+dh+.12,z+.07]],.008,wood);for(let i=0;i<5;i++)leaf(s,[-.3+i*.15,base+dh+.04,z+.1],.15,.09,green,.03);}
 return s.finish();

 }
});
