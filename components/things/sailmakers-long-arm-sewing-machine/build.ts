import * as THREE from 'three';
import { Sculpture, choice, score, noul, diorama, defineThing, defineWorld, figure } from '@conjure/kit';
export default defineThing({
  questions: {
    body: choice("What kind of sewing head is fitted?", {"classic": "A black cast-iron arch.", "cream": "A cream enclosed industrial head.", "green": "A long green steel cantilever.", "open": "An open maintenance head showing drive wheels."}),
    table: choice("How is the cloth-support table arranged?", {"wide": "A wide flat wooden table.", "recess": "A recessed sewing well with a raised surround.", "fold": "One hinged extension leaf is folded down.", "steel": "A riveted steel support table."}),
    cloth: choice("What is passing beneath the needle?", {"white": "Cream sailcloth in broad folds.", "red": "A red storm-sail panel.", "striped": "Blue-striped awning canvas.", "empty": "The table is bare."}),
    seam: choice("What seam is being sewn?", {"straight": "One long straight seam.", "zigzag": "A conspicuous zigzag reinforcing seam.", "patch": "A square repair patch beneath the needle.", "edge": "A thick folded edge with a bolt rope."}),
    thread: choice("How is thread supplied?", {"one": "One large cone of white thread.", "two": "Two cones, one spare.", "four": "Four cones on a high rack.", "empty": "Empty spool pins."}),
    drive: choice("What drives the machine?", {"treadle": "A broad cast-iron foot treadle.", "motor": "An underslung electric motor and belt.", "hand": "A large handwheel without a motor.", "service": "The drive belt hangs loose."}),
    light: choice("What illuminates the needle?", {"arm": "A small articulated task lamp.", "shade": "A green metal-shaded lamp.", "strip": "A slim lamp across the throat.", "none": "No task light is fitted."}),
    work: choice("What accompanies the job?", {"shears": "Large tailor shears on the table.", "chalk": "A chalk wheel and marked guide line.", "order": "A paper SAIL 04 job card.", "bobbin": "A tray of spare bobbins."}),
    reach: score("How long is the working arm?", ["A compact head", "A long arm", "An extra-long sail arm"])
  },
  build(a,context){

    const s=new Sculpture(context),wood=s.material('#a88859'),iron=s.material('#46584b',{metalness:0.6}),body=s.material({classic:'#303a34',cream:'#d1c8aa',green:'#65816a',open:'#7e8d7d'}[a.body]),metal=s.material('#aab2a0',{metalness:0.8}),dark=s.material('#303b33');
    const len=0.65+a.reach*0.7,tw=len+1.1;for(const x of [-tw*0.4,tw*0.4])for(const z of [-0.38,0.38])s.rod([x,0.05,z],[x,0.8,z],0.035,iron);s.box([tw,0.07,1.05],[0,0.83,0],a.table==='steel'?metal:wood);
    if(a.table==='recess')for(const z of [-0.4,0.4])s.box([tw,0.11,0.22],[0,0.91,z],wood);if(a.table==='fold')s.box([0.55,0.06,1.0],[tw/2+0.18,0.6,0],wood).rotation.z=-0.8;
    s.box([0.22,0.46,0.24],[len/2,1.1,-0.05],body);s.box([len,0.2,0.23],[0,1.32,-0.05],body);s.box([0.15,0.3,0.18],[-len/2,1.2,-0.05],body);s.rod([-len/2,1.08,0],[-len/2,0.88,0],0.006,metal);s.box([0.09,0.025,0.1],[-len/2,0.88,0],metal);
    s.ring(0.18,0.027,[len/2+0.15,1.23,-0.05],dark).rotation.y=Math.PI/2;
    if(a.body==='open')for(let j=0;j<3;j++)s.ring(0.055,0.012,[-len/3+j*len/3,1.32,0.075],metal);
    if(a.cloth!=='empty'){const c=s.material(a.cloth==='red'?'#a55943':'#ded7b8');s.drape({size:[tw*0.8,1.15],at:[-0.1,1.01,0.15],over:[{box:[tw,0.91,1.05],at:[0,0.455,0]}],detail:18,rumple:0.3},c);if(a.cloth==='striped')for(let j=0;j<6;j++)s.box([tw*0.7,0.003,0.027],[0,0.925,-0.3+j*0.13],s.material('#5c7f8b'));
      if(a.seam==='patch')s.box([0.35,0.006,0.3],[-len/2,0.93,0.1],s.material('#b8ad8b'));if(a.seam==='edge')s.tube([[-tw*0.4,0.94,0.45],[0,0.94,0.45],[tw*0.4,0.94,0.45]],0.02,wood);
      for(let j=0;j<20;j++)s.box([0.022,0.003,0.006],[-tw*0.35+j*tw*0.035,0.94,a.seam==='zigzag'?(j%2?0.16:0.12):0.14],dark).rotation.y=a.seam==='zigzag'?(j%2?0.6:-0.6):0;}
    const cones={one:1,two:2,four:4,empty:0}[a.thread];s.rod([tw*0.35,0.88,-0.3],[tw*0.35,1.65,-0.3],0.012,metal);for(let j=0;j<Math.max(cones,1);j++){const x=tw*0.35+(j-(cones-1)/2)*0.13;if(cones)s.cylinder(0.035,0.07,0.21,[x,1.0,-0.3],s.material(j%2?'#c3a16b':'#ddd7bb'),20);s.rod([x,0.9,-0.3],[x,1.3,-0.3],0.004,metal);}s.rod([tw*0.35,1.65,-0.3],[-len/2,1.45,0],0.002,wood);
    if(a.drive==='treadle'){s.box([0.65,0.04,0.35],[0,0.25,0.15],iron).rotation.x=0.12;for(let j=0;j<8;j++)s.box([0.035,0.015,0.3],[(j-3.5)*0.07,0.28,0.15],metal);}if(a.drive==='motor')s.cylinder(0.11,0.11,0.3,[len/2,0.63,-0.15],iron,24).rotation.z=Math.PI/2;
    if(a.drive==='motor'||a.drive==='service')s.tube([[len/2+0.15,1.4,-0.05],[len/2+0.15,0.62,-0.22],[len/2+0.15,0.53,-0.05],[len/2+0.15,1.1,0.09]],0.008,dark,true);
    if(a.light!=='none'){s.rod([-len/2+0.2,1.4,-0.08],[-len/2-0.08,1.62,0.05],0.012,metal);s.cylinder(0.03,a.light==='shade'?0.09:0.055,0.07,[-len/2-0.08,1.58,0.05],a.light==='shade'?iron:body,20);if(a.light==='strip')s.box([0.3,0.04,0.05],[-len/2,1.56,0.05],s.material('#e1d9a8',{emissive:'#d6ce9b',emissiveIntensity:0.3}));}
    if(a.work==='shears'){for(const side of [-1,1]){s.rod([0.1,0.9,0.32],[0.4,0.9,0.32+side*0.12],0.008,metal);s.ring(0.04,0.008,[0.08,0.9,0.32+side*0.05],dark).rotation.x=Math.PI/2;}}
    if(a.work==='chalk')s.box([0.45,0.005,0.006],[0.2,0.94,0.27],s.material('#ece4c7'));if(a.work==='order'){const label=s.label('SAIL 04',0.3,0.15,[tw*0.35,0.9,0.3],'#48513b','#dfd3ad');label.rotation.x=-Math.PI/2;}if(a.work==='bobbin')for(let j=0;j<5;j++)s.cylinder(0.025,0.025,0.04,[0.1+j*0.06,0.9,0.35],metal,12);
    return s.finish();

  },
});
