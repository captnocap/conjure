import * as THREE from 'three';
import { Sculpture, choice, score, noul, diorama, defineThing, defineWorld, figure } from '@conjure/kit';
export default defineThing({
  questions: {
    board: choice("What carries the patterns?", {"flat": "A flat rectangular timber board.", "framed": "A shallow framed pattern tray.", "sloped": "A sloping demonstration board.", "round": "A round pattern board."}),
    text: choice("What inscription is prepared?", {"peace": "PEACE in large capitals.", "remember": "REMEMBER in a long line.", "name": "ST MARY and a date.", "ring": "RING TRUE in a broad line."}),
    wax: choice("What colour are the wax patterns?", {"red": "Dark red casting wax.", "brown": "Brown beeswax.", "cream": "Pale cream modelling wax.", "black": "Black pattern wax."}),
    layout: choice("How are the letters arranged?", {"straight": "Straight aligned rows.", "arc": "A shallow arch of letters.", "loose": "Loose scattered letters.", "bands": "Letters placed between two border bands."}),
    emblem: choice("What emblem accompanies them?", {"cross": "A simple raised cross.", "leaf": "A leafy sprig.", "star": "A six point star.", "none": "No emblem."}),
    tools: choice("What tools lie nearby?", {"knife": "A fine modelling knife.", "roller": "A small wax roller.", "brush": "A short bristle brush.", "none": "No tools."}),
    border: choice("What decorative strip is prepared?", {"beads": "A row of round wax beads.", "rope": "A twisted rope border.", "ribs": "Three parallel wax ribs.", "plain": "No separate border."}),
    state: choice("What work stage is shown?", {"ready": "All wax pieces ready.", "missing": "One letter awaits replacement.", "patched": "A pale repair in one band.", "template": "A paper letter template below."}),
    width: score("How wide is the pattern board?", ["A small inscription board", "A working pattern board", "A wide bell inscription"])
  },
  build(a,context){

 const s=new Sculpture(context),wood=s.material('#a18b60'),wax=s.material({red:'#a06950',brown:'#967747',cream:'#d1c19a',black:'#485548'}[a.wax]),metal=s.material('#9aab96',{metalness:0.6}),w=0.7+a.width*0.6,d=0.6,by=a.board==='sloped'?0.18:0.035;
 if(a.board==='round')s.cylinder(Math.sqrt(w*w/4+0.09),Math.sqrt(w*w/4+0.09),0.06,[0,0.03,0],wood,40);else s.box([w,0.06,d],[0,by,0],wood);if(a.board==='framed')for(const z of [-d/2,d/2])s.box([w,0.05,0.03],[0,0.07,z],wood);const y=by+0.04,txt={peace:'PEACE',remember:'REMEMBER',name:'ST MARY',ring:'RING TRUE'}[a.text];
 for(let j=0;j<txt.length;j++){if(a.state==='missing'&&j===2)continue;const x=(j-(txt.length-1)/2)*w/(txt.length+1),zz=a.layout==='arc'?-0.08+0.1*(1-Math.pow(x/(w/2),2)):a.layout==='loose'?(context.random()-0.5)*0.18:0;s.label(txt[j],w/(txt.length+1)*0.85,0.12,[x,y+0.005,zz],{red:'#a06950',brown:'#967747',cream:'#d1c19a',black:'#485548'}[a.wax],'#a18b60').rotation.x=-Math.PI/2;s.box([w/(txt.length+1)*0.65,0.009,0.08],[x,y-0.005,zz],wax);}
 if(a.layout==='bands')for(const z of [-0.1,0.1])s.rod([-w*0.44,y,z],[w*0.44,y,z],0.008,wax);if(a.text==='name')s.label('1896',0.25,0.08,[0,y+0.005,0.14],'#7b6446','#a18b60').rotation.x=-Math.PI/2;
 if(a.emblem==='cross'){s.box([0.12,0.015,0.025],[-w*0.35,y,-0.2],wax);s.box([0.025,0.015,0.16],[-w*0.35,y,-0.2],wax);}if(a.emblem==='star')for(let j=0;j<3;j++)s.rod([-w*0.35-Math.cos(j*Math.PI/3)*0.08,y,-0.2-Math.sin(j*Math.PI/3)*0.08],[-w*0.35+Math.cos(j*Math.PI/3)*0.08,y,-0.2+Math.sin(j*Math.PI/3)*0.08],0.012,wax);if(a.emblem==='leaf'){s.rod([-w*0.4,y,-0.2],[-w*0.2,y,-0.2],0.007,wax);for(let j=0;j<5;j++)s.ball([0.025,0.009,0.045],[-w*0.4+j*0.045,y,-0.2+(j%2?0.03:-0.03)],wax,10);}
 if(a.border==='beads')for(let j=0;j<15;j++)s.ball([0.012,0.012,0.012],[-w*0.4+j*w*0.8/14,y,0.23],wax,8);if(a.border==='ribs')for(const z of [0.2,0.23,0.26])s.rod([-w*0.4,y,z],[w*0.4,y,z],0.007,wax);if(a.border==='rope')for(let k=0;k<2;k++){const pts:[number,number,number][]=[];for(let j=0;j<32;j++)pts.push([-w*0.4+j*w*0.8/31,y+Math.sin(j+k*Math.PI)*0.006,0.23+Math.cos(j+k*Math.PI)*0.006]);s.tube(pts,0.005,wax);}
 if(a.tools==='knife')s.box([0.3,0.012,0.03],[w*0.22,y,-0.22],metal);if(a.tools==='roller')s.rod([w*0.1,y+0.02,-0.22],[w*0.4,y+0.02,-0.22],0.025,wood);if(a.tools==='brush')s.box([0.24,0.025,0.05],[w*0.25,y,-0.22],wood);if(a.state==='patched')s.box([0.06,0.015,0.03],[0.1,y,0.23],s.material('#d5c49d'));if(a.state==='template')s.label('A B C D E F',w*0.6,0.08,[0,y+0.001,-0.13],'#63725b','#dfd1ac').rotation.x=-Math.PI/2;if(a.board==='sloped'){const g=new THREE.Group();for(const c of [...s.root.children])g.add(c);g.rotation.x=0.2;s.root.add(g);for(const x of [-w*0.4,w*0.4])for(const z of [-0.22,0.22]){const hh=by*Math.cos(0.2)-z*Math.sin(0.2)-0.03;s.box([0.06,hh,0.06],[x,hh/2,z],wood);}}return s.finish();

  },
});
