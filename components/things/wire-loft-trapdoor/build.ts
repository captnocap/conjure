import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing, figure } from '@conjure/kit';
const questions = {
  form: choice("What entrance mechanism is used?", {"bobs": "A row of hanging one-way wire bobs.", "swing": "A single wire-mesh swing flap.", "tunnel": "A short barred entrance tunnel.", "sliding": "A vertically sliding wooden shutter.", "double": "Two independent bob-wire entrances."}),
  state: choice("What is the entrance doing?", {"waiting": "Closed bobs wait for returning birds.", "return": "One wire is pushed inward by a returning pigeon.", "release": "The whole front is lifted open.", "night": "A solid night shutter closes the opening.", "clean": "The landing shelf is empty after cleaning."}),
  detail: choice("What is the surrounding frame?", {"wood": "Unpainted timber.", "white": "White-painted wood.", "green": "Green-painted wood.", "metal": "Galvanized metal.", "brick": "A small brick-trimmed frame."}),
  support: choice("How is the landing shelf supported?", {"brackets": "Two triangular iron brackets.", "posts": "Two short ground posts.", "corbels": "Stout wooden corbels.", "box": "A closed box plinth.", "wall": "A broad wall-mounting back plate."}),
  extra: choice("What helps birds find home?", {"perch": "A round perch across the front.", "roof": "A tiny weather roof.", "stripe": "A broad painted landing stripe.", "bell": "A small keeper bell beside the opening.", "plain": "A bare landing shelf."}),
  mark: choice("What marks the entry?", {"home": "HOME LOFT above the opening.", "number": "A large loft number.", "arrow": "A simple pointing arrow.", "colours": "Two coloured homing squares.", "plain": "Unmarked entrance."}),
  extent: score("How wide is the entrance?", ["A single bird entrance", "A pair entrance", "A wide club entrance"]),
  load: score("How many wire bobs hang in the opening?", ["Four broad openings", "Eight normal openings", "Twelve close wires"]),
  closed: noul("Is a small removable catch tray fitted below?"),
};
export default defineThing({
  questions,
  build(a, context) {
    const s = new Sculpture(context), { random, mood } = context;
    const f = Object.keys(questions.form.options).indexOf(a.form), t = Object.keys(questions.state.options).indexOf(a.state), d = Object.keys(questions.detail.options).indexOf(a.detail), u = Object.keys(questions.support.options).indexOf(a.support), e = Object.keys(questions.extra.options).indexOf(a.extra), m = Object.keys(questions.mark.options).indexOf(a.mark);
    const wood = s.material('#a47c4e'), pale = s.material('#e0d2ac'), metal = s.material('#8f9995', { metalness: 0.7, roughness: 0.35 }), dark = s.material('#3d443c'), green = s.material('#667e50');
    const colors = ['#a64d39', '#497e70', '#d4af55', '#59778c', '#b47b8c'];

    const w=.35+a.extent*.45,h=.42,base=.25,mat=s.material(['#a2835c','#d8d3bb','#71855e','#a2aaa2','#ae8065'][d]);s.box([w+.18,.035,.4],[0,base,.12],mat);for(const x of [-w/2,w/2])s.box([.055,h,.08],[x,base+h/2,0],mat);s.box([w+.05,.055,.08],[0,base+h,0],mat);
    const flap=new THREE.Group(),n=4+Math.round(a.load*8);for(let i=0;i<n;i++){const wire=s.rod([-w*.43+i*w*.86/(n-1),0,0],[-w*.43+i*w*.86/(n-1),-h*.9,0],.004,metal);if(t===1&&i===Math.floor(n/2))wire.rotation.x=-.65;flap.add(wire);}if(f===1)for(let j=1;j<5;j++)flap.add(s.rod([-w*.43,-j*h*.18,0],[w*.43,-j*h*.18,0],.003,metal));flap.position.set(0,base+h-.03,.02);flap.rotation.x=t===2?-Math.PI/2:0;s.root.add(flap);
    if(f===2)for(const x of [-w/2,w/2])s.box([.025,h,.25],[x,base+h/2,-.12],mat);if(f===3||t===3)s.box([w*.94,t===2?h*.25:h*.9,.025],[0,base+h*(t===2?1.1:.5),.04],mat);if(f===4)s.box([.04,h,.07],[0,base+h/2,.01],mat);
    if(u===0||u===2)for(const x of [-w*.35,w*.35])s.rod([x,base-.2,-.03],[x,base,.28],u===2?.03:.01,u===2?wood:metal);if(u===1)for(const x of [-w*.4,w*.4])s.rod([x,0,.22],[x,base,.22],.025,wood);if(u===3)s.box([w,.25,.25],[0,.125,.05],mat);if(u===4){for(const x of [-w/2-.06,w/2+.06])s.box([.1,h+.3,.025],[x,base+h/2,-.055],mat);for(const y of [base-.1,base+h+.1])s.box([w+.2,.1,.025],[0,y,-.055],mat);}
    if(t===1){s.ball([.065,.065,.1],[0,base+.08,.09],dark,14);s.ball([.03,.035,.03],[0,base+.16,.04],metal,12);s.box([.1,.012,.09],[0,base+.04,.2],metal);}
    if(e===0)s.rod([-w*.45,base+.08,.28],[w*.45,base+.08,.28],.015,wood);if(e===1)s.box([w+.2,.025,.26],[0,base+h+.07,.07],green).rotation.x=.15;if(e===2)s.box([w*.9,.004,.08],[0,base+.021,.2],pale);if(e===3){s.lathe([[.04,0],[.02,.04],[.01,.06]],s.material('#bda263'),[w/2+.07,base+h*.6,.02]);s.rod([w/2+.07,base+h*.6,.02],[w/2+.07,base+h,.02],.003,dark);}
    if(m<3)s.label(['HOME LOFT','12','→'][m],w*.7,.05,[0,base+h,.046]);if(m===3)for(const x of [-w*.15,w*.15])s.box([.06,.06,.008],[x,base+h,.047],s.material(x<0?colors[0]:colors[1]));if(a.closed)s.box([w+.04,.035,.3],[0,base-.04,.13],metal);return s.finish();
  },
});
