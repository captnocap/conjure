import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing, figure } from '@conjure/kit';
const questions = {
  form: choice("How are the stamping blocks shaped?", {"square": "Square blocks with raised carved faces.", "round": "Round stamps on short handles.", "long": "Long border-pattern blocks.", "copper": "Copper-strip printing blocks.", "mixed": "A mixed set of large and small blocks."}),
  state: choice("What stage is the printing at?", {"ready": "Clean blocks arranged before work.", "waxed": "One block shines with warm wax.", "printing": "A block rests on a partly printed sample.", "used": "Blue-stained blocks lie after printing.", "stored": "Blocks are stacked in a shallow box."}),
  detail: choice("What motif is carved into the face?", {"flower": "A central eight-petal flower.", "waves": "Three flowing wave lines.", "grid": "A bold square lattice.", "leaf": "A repeated leaf branch.", "sun": "A circle surrounded by short rays."}),
  support: choice("What spare grip lies among the face-up blocks?", {"knob": "A loose round wooden replacement knob.", "arch": "A curved wooden replacement bridge.", "bar": "A broad straight replacement hand bar.", "loop": "A detached metal loop handle.", "bare": "Only the carved blocks, without loose grips."}),
  extra: choice("What accompanies the stamps?", {"wax": "A shallow wax heating dish.", "cloth": "A pale sample cloth.", "brush": "A fine wax brush.", "scraper": "A small cleaning scraper.", "none": "Only the block set."}),
  mark: choice("How are the patterns identified?", {"numbers": "Numbers stamped on each handle.", "names": "FLOWER or WAVE labels on the sides.", "colour": "Different painted handle tips.", "notch": "Carved edge notches.", "plain": "Unmarked blocks."}),
  extent: score("How large are the blocks?", ["Small sample stamps", "Hand-sized cloth stamps", "Broad border stamps"]),
  load: score("How many blocks are in the set?", ["Two blocks", "Four blocks", "Six blocks"]),
  closed: noul("Is a hinged wooden storage lid laid beside the set?"),
};
export default defineThing({
  questions,
  build(a, context) {
    const s = new Sculpture(context), { random, mood } = context;
    const f = Object.keys(questions.form.options).indexOf(a.form), t = Object.keys(questions.state.options).indexOf(a.state), d = Object.keys(questions.detail.options).indexOf(a.detail), u = Object.keys(questions.support.options).indexOf(a.support), e = Object.keys(questions.extra.options).indexOf(a.extra), m = Object.keys(questions.mark.options).indexOf(a.mark);
    const wood = s.material('#a47c4e'), pale = s.material('#e0d2ac'), metal = s.material('#8f9995', { metalness: 0.7, roughness: 0.35 }), dark = s.material('#3d443c'), green = s.material('#667e50');
    const colors = ['#a64d39', '#497e70', '#d4af55', '#59778c', '#b47b8c'];

    const n=2+Math.round(a.load*4),r=.055+a.extent*.04,stamp=s.material(t===3?'#5b7477':'#a7875b'),wax=s.material('#bfae74');for(let i=0;i<n;i++){const x=(i%3-1)*r*2.7,z=(Math.floor(i/3)-.5)*r*2.7,y=.025,ww=f===2?r*3:r*2;if(f===1)s.cylinder(r,r,.04,[x,y,z],stamp,24);else s.box([ww,.04,r*2],[x,y,z],stamp);
      const faceY=.048,ink=f===3?metal:t===1&&i===0?wax:wood;if(d===0)for(let j=0;j<8;j++)s.ball([r*.3,.008,r*.13],[x+Math.cos(j*Math.PI/4)*r*.45,faceY,z+Math.sin(j*Math.PI/4)*r*.45],ink,10);if(d===1)for(let j=0;j<3;j++)s.tube([[x-r*.75,faceY,z+(j-1)*r*.45],[x,faceY,z+(j-1)*r*.45+.02],[x+r*.75,faceY,z+(j-1)*r*.45]],.005,ink);if(d===2)for(let j=-1;j<=1;j++){s.rod([x-r*.8,faceY,z+j*r*.5],[x+r*.8,faceY,z+j*r*.5],.005,ink);s.rod([x+j*r*.5,faceY,z-r*.8],[x+j*r*.5,faceY,z+r*.8],.005,ink);}if(d===3){s.rod([x,faceY,z-r*.8],[x,faceY,z+r*.8],.005,ink);for(let j=0;j<4;j++)for(const sign of [-1,1])s.ball([r*.3,.005,r*.14],[x+sign*r*.25,faceY,z+(j-1.5)*r*.4],ink,10);}if(d===4){s.ring(r*.45,.005,[x,faceY,z],ink).rotation.x=Math.PI/2;for(let j=0;j<8;j++)s.rod([x+Math.cos(j*Math.PI/4)*r*.58,faceY,z+Math.sin(j*Math.PI/4)*r*.58],[x+Math.cos(j*Math.PI/4)*r*.85,faceY,z+Math.sin(j*Math.PI/4)*r*.85],.004,ink);}
      if(i===0||t===4){const handleX=x+r*2.4;if(u===0){s.cylinder(.018,.023,.04,[handleX,.03,z],wood,12);s.ball([.03,.018,.03],[handleX,.06,z],wood,12);}if(u===1||u===3)s.tube([[handleX-r*.6,.02,z],[handleX-r*.6,.08,z],[handleX+r*.6,.08,z],[handleX+r*.6,.02,z]],u===3?.005:.012,u===3?metal:wood);if(u===2)s.box([r*1.5,.035,.04],[handleX,.045,z],wood);}
      if(m===0||m===1)s.label(m===0?String(i+1):d===1?'WAVE':'PATTERN',ww*.7,.025,[x,.03,z+r+.002]);if(m===2)s.ball([.014,.004,.014],[x+r*.7,.05,z+r*.7],s.material(colors[i%5]),8);if(m===3)for(let j=0;j<=i;j++)s.box([.003,.01,.006],[x-r*.7+j*.012,.05,z+r],dark);
    }
    if(t===2||e===1)s.box([r*6,.003,r*3],[0,.002,r*3],pale);if(t===4){s.box([r*9,.02,r*6],[0,.01,0],wood);for(const z of [-r*3,r*3])s.box([r*9,.06,.015],[0,.04,z],wood);}if(e===0){s.lathe([[.06,0],[.09,.035],[.08,.035],[.05,.008]],metal,[-r*4,0,0]);s.cylinder(.07,.07,.008,[-r*4,.018,0],wax,20);}if(e===2)s.rod([-r*3,.01,r*3],[r*.5,.01,r*3],.004,wood);if(e===3)s.box([.09,.004,.06],[-r*4,.005,r*2],metal);if(a.closed){s.box([r*7,.018,r*4],[0,.009,-r*4],wood);s.rod([-.05,.026,-r*4],[.05,.026,-r*4],.012,wood);}return s.finish();
  },
});
