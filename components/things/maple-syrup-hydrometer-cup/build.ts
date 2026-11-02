import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing, figure } from '@conjure/kit';
const questions = {
  form: choice("What testing cup is used?", {"steel": "A tall stainless steel test cup.", "glass": "A clear cylindrical test jar.", "copper": "A narrow copper test cup.", "handled": "A metal cup with a broad side handle.", "stand": "A clear jar held in a timber test stand."}),
  state: choice("What stage is the test at?", {"float": "The hydrometer floats in a full sample.", "read": "The stem is still while a reading is taken.", "hot": "A thermometer stands beside the hydrometer.", "drain": "The cup is nearly empty after testing.", "clean": "The clean instruments rest beside the cup."}),
  detail: choice("What colour is the syrup sample?", {"gold": "Pale golden syrup.", "amber": "Rich amber syrup.", "dark": "Dark robust syrup.", "cloudy": "A cloudy unfinished sample.", "clear": "Nearly clear sap before boiling."}),
  support: choice("How is the cup steadied?", {"ring": "A thick cork base ring.", "plate": "A small circular steel plate.", "wood": "A square wooden block.", "clamp": "A low metal stand with a ring clamp.", "bare": "The cup rests directly on the bench."}),
  extra: choice("What is beside the test?", {"spoon": "A small tasting spoon.", "bottle": "A tiny retained sample bottle.", "cloth": "A folded wiping cloth.", "brush": "A narrow cup-cleaning brush.", "none": "No extra item."}),
  mark: choice("How are the readings marked?", {"scale": "A fine black stem scale.", "red": "A single red target band.", "two": "Two coloured target bands.", "tag": "A FINISH TEST card.", "plain": "A plain unmarked stem."}),
  extent: score("How tall is the testing cup?", ["A small sample cup", "A standard sugarhouse cup", "A deep test cylinder"]),
  load: score("How high does the hydrometer float?", ["Low in a thin sample", "At the target line", "High in dense syrup"]),
  closed: noul("Is a small lid set beside the test cup?"),
};
export default defineThing({
  questions,
  build(a, context) {
    const s = new Sculpture(context), { random, mood } = context;
    const f = Object.keys(questions.form.options).indexOf(a.form), t = Object.keys(questions.state.options).indexOf(a.state), d = Object.keys(questions.detail.options).indexOf(a.detail), u = Object.keys(questions.support.options).indexOf(a.support), e = Object.keys(questions.extra.options).indexOf(a.extra), m = Object.keys(questions.mark.options).indexOf(a.mark);
    const wood = s.material('#a47c4e'), pale = s.material('#e0d2ac'), metal = s.material('#8f9995', { metalness: 0.7, roughness: 0.35 }), dark = s.material('#3d443c'), green = s.material('#667e50');
    const colors = ['#a64d39', '#497e70', '#d4af55', '#59778c', '#b47b8c'];

    const r=.055+a.extent*.025,h=.22+a.extent*.12,glass=s.material('#ccdbce',{transparent:true,opacity:.4,depthWrite:false,roughness:.15}),mat=f===1||f===4?glass:f===2?s.material('#b79063',{metalness:.7}):metal;s.lathe([[r*.9,0],[r,h],[r-.005,h],[r*.85,.01]],mat);if(f===3)s.tube([[r,.18,0],[r+.05,.18,0],[r+.05,.07,0],[r,.07,0]],.008,metal);
    const fill=t===3?.04:t===4?0:h*.8;if(fill)s.cylinder(r*.83,r*.83,fill,[0,fill/2+.01,0],s.material(['#c1aa61','#ad8841','#805b32','#b3a36e','#c4c8a9'][d],{roughness:.25}),24);
    const hyd=new THREE.Group();hyd.add(s.ball([.014,.04,.014],[0,.04,0],glass,14));hyd.add(s.cylinder(.004,.004,.25,[0,.185,0],pale,12));hyd.add(s.ball([.008,.01,.008],[0,.015,0],dark,10));for(let i=0;i<13;i++)if(m===0)hyd.add(s.box([.008,.0015,.001],[0,.12+i*.013,.005],dark));if(m===1||m===2)for(let i=0;i<(m===2?2:1);i++)hyd.add(s.cylinder(.0045,.0045,.012,[0,.22+i*.04,0],s.material(i?'#6b935d':'#ac654d'),12));hyd.position.set(t===4?r+.07:0,t===4?.015:Math.max(.015,fill-.14+a.load*.065),0);hyd.rotation.z=t===4?Math.PI/2:0;s.root.add(hyd);
    if(t===2){s.rod([r*.5,.02,0],[r*.5,h+.12,0],.005,pale);s.rod([r*.5,.03,.005],[r*.5,h*.85,.005],.0015,s.material('#a55a43'));}
    if(u===0)s.ring(r*.8,.012,[0,.012,0],wood).rotation.x=Math.PI/2;if(u===1)s.cylinder(r*1.5,r*1.5,.008,[0,.004,0],metal,24);if(u===2)s.box([r*2.7,.025,r*2.7],[0,.013,0],wood);if(u===3||f===4){for(const x of [-r*1.3,r*1.3])s.rod([x,0,0],[x,h*.6,0],.008,f===4?wood:metal);s.ring(r*1.05,.006,[0,h*.55,0],metal).rotation.x=Math.PI/2;}
    if(e===0){s.ball([.018,.004,.025],[r+.07,.005,.08],metal,12);s.rod([r+.07,.005,.08],[r+.07,.005,.2],.003,metal);}if(e===1)s.lathe([[.025,0],[.03,.065],[.012,.085],[.012,.11]],glass,[r+.08,0,.1]);if(e===2)s.box([.12,.012,.1],[r+.09,.006,.08],pale);if(e===3){s.rod([r+.07,.006,0],[r+.07,.006,.2],.004,wood);s.cylinder(.015,.015,.07,[r+.07,.015,.03],pale,12).rotation.x=Math.PI/2;}if(m===3)s.label('FINISH TEST',.16,.08,[-r-.1,.003,0]).rotation.x=-Math.PI/2;if(a.closed)s.cylinder(r*1.05,r*1.05,.006,[0,.003,r+.08],metal,24);return s.finish();
  },
});
