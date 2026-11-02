import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing, figure } from '@conjure/kit';
const questions = {
  form: choice("What rack holds the cloth?", {"a": "A folding A-frame with a high rail.", "ladder": "A broad leaning ladder rack.", "lines": "Two posts with several drying lines.", "wheel": "A radial umbrella-style drying rack.", "wall": "A low wall-mounted rail frame."}),
  state: choice("What stage are the cloths at?", {"wet": "Dark wet cloth hangs heavily.", "air": "Green-blue cloth is changing in the air.", "dry": "Light dry cloth lifts gently at the hem.", "empty": "Only two small samples remain.", "fold": "Folded cloth rests over the lower rails."}),
  detail: choice("What patterns are drying?", {"plain": "Plain deep indigo lengths.", "bands": "Pale horizontal resist bands.", "dots": "Small white circle motifs.", "checks": "Bold square resist patterns.", "mixed": "A mix of plain and patterned cloth."}),
  support: choice("What secures the cloth?", {"pegs": "Small wooden clothespins.", "ties": "Cotton corner ties.", "loops": "Wide sewn hanging loops.", "clips": "Metal spring clips.", "drape": "Cloth simply folded over the rail."}),
  extra: choice("What catches the drips?", {"tray": "A long shallow catch tray.", "mat": "A stained woven mat.", "stones": "A strip of draining pebbles.", "bucket": "A small bucket below one cloth.", "none": "An open floor."}),
  mark: choice("How are the batches marked?", {"tags": "Small numbered cloth tags.", "wood": "A DYE DAY wooden sign.", "colours": "Coloured pegs for separate batches.", "knots": "Different knots in the hanging cords.", "plain": "No batch marks."}),
  extent: score("How wide is the drying rack?", ["A sample rack", "A workshop rack", "A long courtyard rack"]),
  load: score("How many cloth lengths are drying?", ["Two pieces", "Four pieces", "Six pieces"]),
  closed: noul("Is a spare empty rail extended to one side?"),
};
export default defineThing({
  questions,
  build(a, context) {
    const s = new Sculpture(context), { random, mood } = context;
    const f = Object.keys(questions.form.options).indexOf(a.form), t = Object.keys(questions.state.options).indexOf(a.state), d = Object.keys(questions.detail.options).indexOf(a.detail), u = Object.keys(questions.support.options).indexOf(a.support), e = Object.keys(questions.extra.options).indexOf(a.extra), m = Object.keys(questions.mark.options).indexOf(a.mark);
    const wood = s.material('#a47c4e'), pale = s.material('#e0d2ac'), metal = s.material('#8f9995', { metalness: 0.7, roughness: 0.35 }), dark = s.material('#3d443c'), green = s.material('#667e50');
    const colors = ['#a64d39', '#497e70', '#d4af55', '#59778c', '#b47b8c'];

    const w=1+a.extent*1.3,h=1.55,cloth=s.material(t===1?'#638d7d':t===2?'#6d8b9e':'#385d7b',{side:THREE.DoubleSide}),n=t===3?2:2+Math.round(a.load*4);for(const x of [-w/2,w/2]){for(const z of [-.35,.35])s.rod([x,0,z],[x,h,0],.025,wood);s.rod([x,.4,-.25],[x,.4,.25],.018,wood);}s.rod([-w/2,h,0],[w/2,h,0],.025,wood);
    if(f===1||f===4)for(let j=0;j<4;j++)s.rod([-w/2,.35+j*.3,-.12],[w/2,.35+j*.3,-.12],.02,wood);if(f===2)for(const z of [-.2,.2])s.rod([-w/2,h,z],[w/2,h,z],.004,pale);if(f===3){s.rod([0,0,0],[0,h+.15,0],.035,metal);for(let i=0;i<6;i++)s.rod([0,h,0],[Math.cos(i*Math.PI/3)*w*.55,h,Math.sin(i*Math.PI/3)*w*.55],.012,wood);}
    for(let i=0;i<n;i++){const x=f===3?Math.cos(i*Math.PI*2/n)*w*.35:(i+.5)/n*w-w/2,cw=w/n*.75,len=t===4?.45:.65+random()*.5,yy=t===4?.65:h,z=f===3?Math.sin(i*Math.PI*2/n)*w*.35:0;if(f===3){s.rod([0,yy,0],[x,yy,z],.012,wood);s.rod([x-cw/2,yy,z],[x+cw/2,yy,z],.012,wood);}else if(t===4)s.rod([-w/2,yy,0],[w/2,yy,0],.02,wood);const fabric=s.surface((u,v,p)=>p.set(x+(u-.5)*cw,yy-v*len,z+Math.sin(u*Math.PI*5)*.018+(t===2?v*v*.07:0)),cloth,{segments:[12,20]});
      if(d===1||d===4&&i%2===0)for(let j=1;j<5;j++)s.box([cw*.95,.018,.004],[x,yy-len*j/6,z+.02],pale);if(d===2)for(let j=0;j<4;j++)s.ring(.025,.004,[x,yy-.1-j*len/5,z+.024],pale);if(d===3)for(let j=0;j<4;j++)for(let k=0;k<3;k++)if((j+k)%2===0)s.box([cw*.22,len*.16,.004],[x+(k-1)*cw*.3,yy-.1-j*len*.21,z+.022],pale);
      for(const dx of [-cw*.35,cw*.35]){if(u===0||u===3)s.box([.015,.06,.018],[x+dx,yy+.01,z],u===3?metal:m===2?s.material(colors[i%5]):wood);if(u===1||u===2)s.ring(.02,u===2?.007:.003,[x+dx,yy+.02,z],pale);}if(m===0)s.label(String(i+1),.05,.035,[x+cw*.35,yy-.07,z+.025]);if(t===0)for(let j=0;j<3;j++)s.ball([.005,.014,.005],[x+(random()-.5)*cw,.15+random()*.2,z],cloth,8);}
    if(e===0){s.box([w+.2,.025,.5],[0,.013,0],metal);for(const z of [-.25,.25])s.box([w+.2,.06,.02],[0,.04,z],metal);}if(e===1)s.box([w+.2,.008,.65],[0,.004,0],pale);if(e===2)for(let i=0;i<20;i++)s.ball([.04,.025,.035],[(random()-.5)*w,.025,(random()-.5)*.4],pale,8);if(e===3)s.lathe([[.1,0],[.14,.23],[.13,.23],[.09,.015]],metal,[-w*.3,0,0]);if(m===1){s.box([.6,.16,.025],[0,h+.09,0],wood);s.label('DYE DAY',.55,.13,[0,h+.09,.015]);}if(m===3)for(const x of [-w*.3,w*.3])s.tube([[x,h,0],[x,h-.1,.02],[x+.03,h-.07,.03]],.005,pale);if(a.closed)s.rod([w/2,h,0],[w/2+.5,h,0],.025,wood);return s.finish();
  },
});
