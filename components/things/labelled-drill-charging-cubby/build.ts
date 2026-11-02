import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing, figure } from '@conjure/kit';
const questions = {
  form: choice("How is the station arranged?", {"row": "A single row of charging cubbies.", "double": "Two rows of compact cubbies.", "tower": "A narrow vertical charging tower.", "bench": "A low bench with a charging shelf.", "open": "An open rack with individual docks."}),
  state: choice("What is the lending state?", {"full": "Every dock holds a drill.", "loan": "Alternate drills are out on loan.", "one": "Only one drill has been returned.", "battery": "Drills are removed and loose batteries remain.", "service": "One drill is tagged for service."}),
  detail: choice("What colours identify the drills?", {"green": "Dark green drills.", "yellow": "Ochre yellow drills.", "red": "Rust red drills.", "blue": "Muted blue drills.", "mixed": "A mix of donated tool colours."}),
  support: choice("How is the station supported?", {"feet": "Short square feet.", "plinth": "A solid low plinth.", "stand": "A tall four-leg stand.", "skids": "Two timber floor skids.", "wall": "A tall freestanding backing panel."}),
  extra: choice("What is stored beside the drills?", {"bits": "A small bit index.", "packs": "Two spare battery packs.", "cable": "A neatly coiled charging lead.", "case": "A closed drill carrying case.", "none": "No loose equipment."}),
  mark: choice("How are the bays marked?", {"numbers": "Large numbered bay labels.", "dots": "One colour dot per bay.", "volts": "18V labels above the drills.", "names": "Short letter labels.", "plain": "Plain unmarked bays."}),
  extent: score("How many bays are there?", ["Two bays", "Three bays", "Five bays"]),
  load: score("How high are the shelf spaces?", ["Compact cubbies", "Comfortable drill bays", "Tall generous cubbies"]),
  closed: noul("Does a red charging light glow at each occupied dock?"),
};
export default defineThing({
  questions,
  build(a, context) {
    const s = new Sculpture(context), { random, mood } = context;
    const f = Object.keys(questions.form.options).indexOf(a.form), t = Object.keys(questions.state.options).indexOf(a.state), d = Object.keys(questions.detail.options).indexOf(a.detail), u = Object.keys(questions.support.options).indexOf(a.support), e = Object.keys(questions.extra.options).indexOf(a.extra), m = Object.keys(questions.mark.options).indexOf(a.mark);
    const wood = s.material('#a47c4e'), pale = s.material('#e0d2ac'), metal = s.material('#8f9995', { metalness: 0.7, roughness: 0.35 }), dark = s.material('#3d443c'), green = s.material('#667e50');
    const colors = ['#a64d39', '#497e70', '#d4af55', '#59778c', '#b47b8c'];

    const n=2+Math.round(a.extent*3),cols=f===2?1:f===1?Math.ceil(n/2):n,rows=Math.ceil(n/cols),cw=.28,ch=.3+a.load*.14,W=cols*cw,H=rows*ch,base=u===2?.65:u===0?.08:.04;for(const x of [-W*.43,W*.43])for(const z of [-.14,.14])s.box([.035,base,.035],[x,base/2,z],wood);if(u===1)s.box([W+.05,.06,.4],[0,.03,0],wood);if(u===3)for(const x of [-W*.4,W*.4])s.box([.06,.04,.48],[x,.02,0],wood);s.box([W,.035,.36],[0,base,0],wood);if(f===4)for(const x of [-W*.47,W*.47])for(const z of [-.14,.14])s.rod([x,base,z],[x,base+H,z],.014,wood);if(f!==4)s.box([W,H,.025],[0,base+H/2,-.17],wood);if(u===4)s.box([W+.1,H+.3,.035],[0,base+(H+.3)/2,-.19],pale);for(let j=0;j<=rows;j++)s.box([W,.025,.36],[0,base+j*ch,0],wood);if(f!==4)for(let i=0;i<=cols;i++)s.box([.025,H,.36],[-W/2+i*cw,base+H/2,0],wood);if(f===3){s.box([W,.05,.45],[0,base+H+.03,0],pale);for(const x of [-W*.42,W*.42])s.rod([x,base+H,-.18],[x,base+H+.18,-.18],.015,wood);s.rod([-W*.42,base+H+.18,-.18],[W*.42,base+H+.18,-.18],.015,wood);}
    for(let i=0;i<n;i++){const x=(i%cols-(cols-1)/2)*cw,y=base+.025+Math.floor(i/cols)*ch,present=t===0||t===4||t===1&&i%2===0||t===2&&i===0;s.box([.15,.025,.16],[x,y+.013,0],dark);if(present){const mat=s.material(d===4?colors[i%5]:['#5f7e55','#c3a34c','#a65f4b','#5e7e91'][d]);s.box([.13,.045,.08],[x,y+.05,0],dark);s.box([.05,.14,.065],[x+.025,y+.125,0],mat);s.box([.16,.075,.08],[x,y+.21,0],mat);s.cylinder(.026,.026,.045,[x-.09,y+.21,0],metal,14).rotation.z=Math.PI/2;s.rod([x-.11,y+.21,0],[x-.15,y+.21,0],.006,metal);if(a.closed)s.ball([.008,.005,.008],[x+.05,y+.028,.065],s.material('#ce654a',{emissive:'#9b3f2f',emissiveIntensity:.2}),8);}else if(t===3)s.box([.1,.055,.08],[x,y+.035,0],dark);if(t===4&&i===0){s.rod([x,y+.18,.045],[x,y+.1,.07],.002,pale);s.box([.06,.08,.003],[x,y+.07,.07],s.material('#bd745a'));}if(m===1)s.ball([.018,.018,.002],[x,base+Math.floor(i/cols)*ch+.06,.182],s.material(colors[i%5]),10);else if(m!==4)s.label(m===0?String(i+1):m===2?'18V':String.fromCharCode(65+i),.09,.045,[x,base+Math.floor(i/cols)*ch+.045,.185]);}
    const ex=W/2+.16;if(e===0){s.box([.18,.02,.12],[ex,.01,0],wood);for(let i=0;i<5;i++)s.rod([ex+(i-2)*.025,.02,0],[ex+(i-2)*.025,.1+i*.006,0],.004,metal);}if(e===1)for(let i=0;i<2;i++)s.box([.13,.05,.09],[ex,.025+i*.055,0],dark);if(e===2)for(let i=0;i<4;i++)s.ring(.06+i*.008,.003,[ex,.004+i*.003,0],dark).rotation.x=Math.PI/2;if(e===3){s.box([.25,.1,.2],[ex,.05,0],green);s.rod([ex-.04,.07,.11],[ex+.04,.07,.11],.008,dark);}return s.finish();
  },
});
