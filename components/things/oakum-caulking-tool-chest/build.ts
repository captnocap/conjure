import * as THREE from 'three';
import { Sculpture, choice, score, defineThing } from '@conjure/kit';
export default defineThing({
  questions: {
    chest: choice("How is the tool chest built?", {"plank": "A rough pine plank chest.", "oak": "A dark oak box with iron corners.", "painted": "A green-painted maintenance chest.", "tray": "A low divided carrying tray."}),
    lid: choice("Where is the lid?", {"open": "Propped upright behind the chest.", "flat": "Laid flat beside the chest.", "half": "Half-open at an angle.", "none": "The lid is missing."}),
    mallet: choice("What mallet lies on top?", {"round": "A round cylindrical oak mallet.", "square": "A square-headed wooden mallet.", "double": "Two crossed caulking mallets.", "split": "A split mallet head bound with iron."}),
    irons: choice("What caulking irons are laid out?", {"fan": "Four irons spread like a fan.", "bundle": "A tied bundle of narrow irons.", "wide": "Two broad curved finishing irons.", "one": "A single hooked picking iron."}),
    oakum: choice("How is the sealing fibre prepared?", {"coil": "A loose coil of brown oakum.", "tufts": "Separated teased-out fibre tufts.", "roll": "A tightly rolled hemp bundle.", "empty": "An empty oakum compartment."}),
    pitch: choice("How is the sealing pitch kept?", {"pot": "An open black pitch pot.", "lid": "A closed lidded pitch pot.", "brush": "A pitch pot with a broad brush inside.", "cake": "A hard slab of pitch wrapped in paper."}),
    work: choice("What interrupted the job?", {"clean": "The tools are cleaned and put away.", "leak": "A wet rag and a LEAK tag mark the repair.", "broken": "A snapped tool tip lies beside the chest.", "finished": "A green SEALED card marks a finished job."}),
    carrier: choice("How is the chest carried?", {"rope": "Rope loops at both ends.", "iron": "Two iron lifting handles.", "strap": "A leather strap crosses the chest.", "none": "Simple cutout handholds."}),
    load: score("How much loose fibre fills the chest?", ["A few strands", "A workable handful", "A full bundle"])
  },
  build(a,context){

    const s=new Sculpture(context),wood=s.material(a.chest==='painted'?'#596f57':a.chest==='oak'?'#755235':'#b19265'),iron=s.material('#626c60',{metalness:0.65}),dark=s.material('#30362e'),fibre=s.material('#a89a6c'),paper=s.material('#dcd1ac');
    const h=a.chest==='tray'?0.1:0.23;s.box([0.6,0.025,0.36],[0,0.015,0],wood);for(const x of [-0.29,0.29])s.box([0.022,h,0.36],[x,h/2+0.025,0],wood);for(const z of [-0.17,0.17])s.box([0.6,h,0.022],[0,h/2+0.025,z],wood);s.box([0.016,h*0.7,0.34],[0.04,h*0.35+0.025,0],wood);
    if(a.chest==='oak')for(const x of [-0.29,0.29])for(const z of [-0.17,0.17])s.box([0.035,h*0.8,0.035],[x,h/2,z],iron);
    if(a.lid!=='none'){const lid=s.box([0.6,0.018,0.36],[0,h+0.2,-0.18],wood);lid.rotation.x=a.lid==='open'?Math.PI/2:a.lid==='half'?Math.PI/4:0;if(a.lid==='flat')lid.position.set(-0.66,0.012,0);}
    const mallet=(x:number,z:number,turn:number)=>{const start=s.root.children.length;s.rod([x,h+0.05,z-0.12],[x,h+0.05,z+0.17],0.018,wood);if(a.mallet==='square')s.box([0.18,0.075,0.075],[x,h+0.05,z-0.1],wood);else{s.rod([x-0.1,h+0.05,z-0.1],[x+0.1,h+0.05,z-0.1],0.044,wood);if(a.mallet==='split'){s.ring(0.046,0.006,[x,h+0.05,z-0.1],iron).rotation.y=Math.PI/2;}}const g=new THREE.Group();for(const m of s.root.children.slice(start))g.add(m);g.rotation.y=turn;s.root.add(g);};
    mallet(-0.08,0.03,0.22);if(a.mallet==='double')mallet(0.07,0.01,-0.45);
    const n=a.irons==='one'?1:a.irons==='wide'?2:4;for(let i=0;i<n;i++){const x=-0.21+i*0.045;const end=x+(a.irons==='fan'?(i-1.5)*0.027:0);s.rod([x,h+0.035,-0.12],[end,h+0.035,0.08],0.007,iron);s.box([a.irons==='wide'?0.04:0.018,0.006,0.035],[end,h+0.035,0.09],iron);}
    if(a.oakum!=='empty'){const n=4+Math.round(a.load*10);for(let i=0;i<n;i++){const x=0.16+(context.random()-0.5)*0.12,z=(context.random()-0.5)*0.2;if(a.oakum==='coil')s.ring(0.045+i*0.002,0.004,[0.16,h*0.6+i*0.003,0],fibre).rotation.x=Math.PI/2;else s.tube([[x,h*0.55,z-0.06],[x+0.015,h*0.65,z],[x-0.01,h*0.55,z+0.06]],a.oakum==='roll'?0.012:0.004,fibre);}}
    if(a.pitch==='cake')s.box([0.11,0.035,0.09],[0.4,0.02,0],dark);else{s.cylinder(0.055,0.045,0.11,[0.4,0.06,0],iron,20);s.cylinder(0.048,0.048,0.008,[0.4,0.115,0],a.pitch==='lid'?iron:dark,20);if(a.pitch==='brush'){s.rod([0.4,0.08,0],[0.44,0.25,0],0.009,wood);s.box([0.04,0.05,0.015],[0.39,0.09,0],dark);}}
    for(const side of [-1,1]){const x=side*0.32;if(a.carrier==='rope')s.tube([[x,h*0.8,-0.07],[x+side*0.045,h*0.4,0],[x,h*0.8,0.07]],0.01,fibre);if(a.carrier==='iron')s.tube([[x,h*0.8,-0.07],[x+side*0.03,h*0.8,-0.07],[x+side*0.03,h*0.8,0.07],[x,h*0.8,0.07]],0.007,iron);if(a.carrier==='none')s.box([0.003,0.025,0.09],[x-side*0.018,h*0.65,0],dark);}
    if(a.carrier==='strap')s.tube([[-0.29,h,0],[0,h+0.18,0],[0.29,h,0]],0.018,s.material('#79563a'));
    if(a.work==='leak'||a.work==='finished')s.label(a.work==='leak'?'LEAK':'SEALED',0.18,0.07,[0,h*0.6,0.183],a.work==='leak'?'#a04c32':'#456442','#e2d9bc');
    if(a.work==='leak')s.ball([0.07,0.012,0.06],[0.2,0.015,0.29],paper,14);if(a.work==='broken')s.box([0.025,0.006,0.04],[-0.2,0.005,0.26],iron).rotation.y=0.4;
    return s.finish();

  },
});
