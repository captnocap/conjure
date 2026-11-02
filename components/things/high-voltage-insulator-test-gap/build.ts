import * as THREE from 'three';
import { Sculpture, choice, score, noul, diorama, defineThing, defineWorld, figure } from '@conjure/kit';
export default defineThing({
  questions: {
    electrodes: choice("What electrode shapes face each other?", {"sphere": "Two polished brass spheres.", "point": "Two narrow pointed electrodes.", "disc": "Two broad flat discs.", "horn": "Two upward curved horn electrodes."}),
    columns: choice("What insulates the electrodes?", {"brown": "Brown glazed multi-shed columns.", "white": "White porcelain columns.", "glass": "Green glass-like columns.", "ribbed": "Grey finely ribbed columns."}),
    base: choice("What holds the test rig?", {"bench": "A timber laboratory bench.", "steel": "A steel instrument pedestal.", "stone": "A broad stone test slab.", "cart": "A wheeled test stand."}),
    guard: choice("What surrounds the test area?", {"rail": "A low insulating guard rail.", "mesh": "A tall open mesh guard.", "hood": "A clear open-front frame.", "none": "No surrounding guard."}),
    meter: choice("How is the result read?", {"dial": "A large analog dial meter.", "pair": "Two small round meters.", "scale": "A vertical graduated scale.", "lamp": "Three coloured indicator lamps."}),
    leads: choice("How are leads arranged?", {"loop": "Two heavy looping test leads.", "straight": "Short straight terminal straps.", "coil": "A disconnected coiled lead.", "none": "No test leads connected."}),
    sample: choice("What is under test?", {"disc": "A suspended disc insulator.", "post": "A short upright post insulator.", "fragment": "A broken glazed fragment.", "empty": "The test gap is empty."}),
    state: choice("What condition is displayed?", {"ready": "Test circuit ready and tidy.", "passed": "A green passed tag.", "failed": "A red failed tag.", "service": "A removable electrode lies beside the base."}),
    gap: score("How far apart are the electrodes?", ["A narrow test gap", "A moderate gap", "A broad test gap"])
  },
  build(a,context){

    const s=new Sculpture(context),metal=s.material('#b6a363',{metalness:0.85,roughness:0.2}),dark=s.material('#596a5e'),cer=s.material({brown:'#896b4d',white:'#d3d3b6',glass:'#8fa78d',ribbed:'#a3b0a0'}[a.columns],{roughness:0.25}),wood=s.material('#9d865a'),by=a.base==='stone'?0.16:0.78,sep=0.55+a.gap*0.75;
    s.box([1.9,0.1,1.15],[0,by-0.05,0],a.base==='stone'?s.material('#b3b59c'):a.base==='bench'?wood:dark);if(a.base!=='stone')for(const x of [-0.8,0.8])for(const z of [-0.45,0.45]){s.box([0.07,by-0.1,0.07],[x,(by-0.1)/2,z],dark);if(a.base==='cart')s.cylinder(0.07,0.07,0.045,[x,0.07,z],dark,16).rotation.z=Math.PI/2;}
    for(const side of [-1,1]){const x=side*sep/2;s.cylinder(0.08,0.1,0.65,[x,by+0.325,0],cer,24);for(let j=0;j<(a.columns==='ribbed'?10:5);j++)s.cylinder(0.14,0.09,0.035,[x,by+0.08+j*(a.columns==='ribbed'?0.055:0.12),0],cer,24);s.rod([x,by+0.65,0],[x-side*0.12,by+0.76,0],0.025,metal);const ex=x-side*0.12;
      if(a.electrodes==='sphere')s.ball([0.12,0.12,0.12],[ex,by+0.76,0],metal,24);if(a.electrodes==='point')s.rod([ex,by+0.76,0],[ex-side*0.16,by+0.76,0],0.06,metal,0.003);if(a.electrodes==='disc')s.cylinder(0.18,0.18,0.025,[ex,by+0.76,0],metal,32).rotation.z=Math.PI/2;if(a.electrodes==='horn')s.tube([[ex,by+0.7,0],[ex-side*0.12,by+0.82,0],[ex+side*0.1,by+1.1,0]],0.018,metal);
      if(a.leads==='loop')s.tube([[x,by+0.6,0],[x+side*0.2,by+0.3,-0.2],[x+side*0.1,by+0.08,-0.4],[0,by+0.08,-0.4]],0.018,dark);if(a.leads==='straight')s.rod([x,by+0.6,0],[x,by+0.05,-0.35],0.015,metal);}
    if(a.leads==='coil')for(let j=0;j<4;j++)s.ring(0.14+j*0.014,0.01,[0.55,by+0.02,0.3],dark).rotation.x=Math.PI/2;
    if(a.guard!=='none'){const gh=a.guard==='rail'?0.25:1.1;for(const x of [-0.86,0.86])for(const z of [-0.48,0.48])s.rod([x,by,z],[x,by+gh,z],0.018,dark);for(const z of [-0.48,0.48])s.rod([-0.86,by+gh,z],[0.86,by+gh,z],0.018,dark);if(a.guard==='mesh')for(let j=0;j<12;j++)s.rod([-0.8+j*0.145,by,-0.48],[-0.8+j*0.145,by+gh,-0.48],0.005,dark);}
    s.box([0.5,0.22,0.26],[0,by+0.11,0.43],dark);if(a.meter==='dial'||a.meter==='pair')for(let j=0;j<(a.meter==='pair'?2:1);j++){const x=(j-(a.meter==='pair'?0.5:0))*0.2;s.cylinder(0.075,0.075,0.01,[x,by+0.13,0.568],s.material('#d9d0ae'),24).rotation.x=Math.PI/2;s.rod([x,by+0.13,0.578],[x+0.03,by+0.17,0.578],0.004,dark);}if(a.meter==='lamp')for(let j=0;j<3;j++)s.ball([0.025,0.025,0.015],[-0.15+j*0.15,by+0.13,0.57],s.material(['#a56043','#b6a254','#70976d'][j]),12);if(a.meter==='scale')s.label('0  20  40',0.42,0.12,[0,by+0.13,0.568],'#56604d','#d8ceac');
    if(a.sample==='post'){s.cylinder(0.05,0.05,0.3,[0,by+0.15,0],cer,20);for(let j=0;j<3;j++)s.cylinder(0.1,0.05,0.03,[0,by+0.07+j*0.09,0],cer,24);}if(a.sample==='disc')s.cylinder(0.17,0.06,0.08,[0,by+0.08,0],cer,28);if(a.sample==='fragment')s.box([0.2,0.04,0.13],[0,by+0.025,0],cer).rotation.y=0.4;
    if(a.state==='passed'||a.state==='failed')s.label(a.state==='passed'?'PASSED':'FAILED',0.35,0.12,[-0.5,by+0.012,0.35],'#e2d6b2',a.state==='passed'?'#6b8b65':'#a46145').rotation.x=-Math.PI/2;if(a.state==='service')s.ball([0.1,0.1,0.1],[0.65,by+0.1,0.32],metal,20);return s.finish();

  },
});
