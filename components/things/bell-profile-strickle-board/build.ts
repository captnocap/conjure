import * as THREE from 'three';
import { Sculpture, choice, score, noul, diorama, defineThing, defineWorld, figure } from '@conjure/kit';
export default defineThing({
  questions: {
    profile: choice("Which bell profile is cut?", {"broad": "A broad flared bell outline.", "slender": "A narrow tall bell outline.", "stepped": "A stepped roughing outline.", "double": "Two facing inner and outer templates."}),
    wood: choice("What wood is the template?", {"oak": "Golden oak.", "dark": "Dark stained hardwood.", "pale": "Pale fresh softwood.", "red": "Red painted pattern wood."}),
    mount: choice("What supports the pivot?", {"cross": "A timber cross base.", "stone": "A stone pivot block.", "iron": "A circular iron foot.", "bench": "A low pattern bench."}),
    arm: choice("How is the board braced?", {"triangle": "Two diagonal brace arms.", "horizontal": "Two horizontal cross arms.", "curved": "A single curved metal brace.", "short": "A short central pivot arm."}),
    edge: choice("How is the working edge finished?", {"steel": "A thin steel cutting edge.", "brass": "A brass edge strip.", "bare": "Bare shaped timber.", "teeth": "Small square scraping teeth."}),
    measure: choice("What measuring marks appear?", {"ticks": "Short graduated edge ticks.", "radii": "Three radial setting bars.", "numbers": "Numbered profile stations.", "none": "No marks."}),
    companion: choice("What rests beside it?", {"plan": "A flat bell profile drawing.", "caliper": "A large wooden outside caliper.", "offcut": "A curved timber offcut.", "none": "No companion tools."}),
    state: choice("What setup is shown?", {"ready": "Template locked at working radius.", "folded": "Brace set close to the pivot.", "repair": "A patched corner on the blade.", "tag": "A pattern inventory tag."}),
    size: score("How tall is the pattern?", ["A small bell template", "A standard bell template", "A tall tower bell template"])
  },
  build(a,context){

 const s=new Sculpture(context),wood=s.material({oak:'#b09760',dark:'#806b48',pale:'#c4b38a',red:'#a87855'}[a.wood]),metal=s.material('#7b8f78',{metalness:0.65}),h=0.9+a.size*0.9,r=a.profile==='slender'?h*0.35:h*0.65,by=a.mount==='bench'?0.5:0.12;
 if(a.mount==='cross')for(const z of [-0.2,0.2])s.box([r*2.6,0.12,0.18],[0,0.06,z],wood);else if(a.mount==='iron')s.cylinder(r*0.8,r*0.8,0.12,[0,0.06,0],metal,32);else s.box([r*2,0.12,0.65],[0,by-0.06,0],a.mount==='stone'?s.material('#aeb29c'):wood);if(a.mount==='bench')for(const x of [-r*0.8,r*0.8])for(const z of [-0.25,0.25])s.box([0.07,by-0.12,0.07],[x,(by-0.12)/2,z],wood);s.rod([0,by,0],[0,by+h+0.2,0],0.025,metal);
 const p=new THREE.Shape();const pts=[[r,0],[r*0.75,h*0.2],[r*0.5,h*0.55],[r*0.36,h*0.85],[r*0.2,h],[r*0.4,h],[r*0.56,h*0.85],[r*0.7,h*0.55],[r*0.95,h*0.2],[r*1.2,0]];p.moveTo(pts[0][0],pts[0][1]);for(const xy of pts.slice(1))p.lineTo(xy[0],xy[1]);p.closePath();const geom=new THREE.ExtrudeGeometry(p,{depth:0.045,bevelEnabled:false});for(const side of a.profile==='double'?[-1,1]:[1]){const mesh=new THREE.Mesh(geom,wood);mesh.position.set(a.state==='folded'?-r*0.2:0,by,-0.022);mesh.scale.x=side;s.root.add(mesh);const ex=(a.state==='folded'?-r*0.2:0)+side*r*0.65;
 if(a.arm==='triangle'){s.rod([0,by+0.15,0],[ex,by+h*0.8,0],0.025,metal);s.rod([0,by+h,0],[ex,by+h*0.35,0],0.025,metal);}else if(a.arm==='curved')s.tube([[0,by+h,0],[ex*0.3,by+h*0.7,0],[ex,by+h*0.5,0]],0.025,metal);else for(const y of a.arm==='short'?[h*0.5]:[h*0.25,h*0.8])s.rod([0,by+y,0],[ex,by+y,0],0.025,metal);
 if(a.edge!=='bare')s.tube(pts.slice(0,5).map(v=>[(a.state==='folded'?-r*0.2:0)+side*v[0],by+v[1],0.026] as [number,number,number]),a.edge==='teeth'?0.015:0.007,a.edge==='brass'?s.material('#b19c62'):metal);}
 if(a.profile==='stepped')for(let j=0;j<7;j++)s.box([0.15,0.04,0.06],[r*(1-j/10),by+j*h/7,0],wood);if(a.measure==='ticks')for(let j=0;j<10;j++)s.box([0.05,0.005,0.008],[r*(1-j*0.065),by+j*h/10,0.029],metal);if(a.measure==='radii')for(const y of [0.2,0.5,0.8])s.rod([0,by+h*y,0.05],[r*(1-y*0.7),by+h*y,0.05],0.012,metal);if(a.measure==='numbers')for(let j=0;j<4;j++)s.label(String(j+1),0.06,0.07,[r*(0.95-j*0.17),by+h*(0.1+j*0.22),0.03],'#5a694f','#b9a16e');
 if(a.companion==='plan')s.label('BELL PROFILE\nR 48 / H 72',0.55,0.24,[-r*0.65,0.13,0.2],'#65735a','#ddd1af').rotation.x=-Math.PI/2;if(a.companion==='offcut')s.ring(0.3,0.04,[-r*0.6,0.13,0.2],wood,Math.PI*0.7).rotation.x=Math.PI/2;if(a.companion==='caliper'){s.rod([-r*0.8,0.15,-0.2],[-r*0.3,0.15,0.2],0.025,wood);s.rod([-r*0.8,0.15,-0.2],[-r*0.9,0.15,0.25],0.025,wood);}if(a.state==='repair')s.box([0.13,0.16,0.05],[r*0.9,by+0.12,0],s.material('#c8b78e'));if(a.state==='tag')s.label('PATTERN 7',0.3,0.12,[r*0.6,by+h*0.5,0.04],'#55654f','#d7c9a4');return s.finish();

  },
});
