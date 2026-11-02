import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing, figure } from '@conjure/kit';
const questions = {
  form: choice("What inspection rest is used?", {"single": "A single frame on a two-post stand.", "pair": "Two frames side by side on a long rest.", "rack": "Three frames spaced in a carrying rack.", "low": "A low tabletop inspection cradle.", "tilt": "A frame tilted slightly toward the viewer."}),
  state: choice("What does the comb show?", {"capped": "Pale capped honey covers most cells.", "open": "Open amber honey cells.", "brood": "A dark central brood patch with a honey border.", "empty": "New pale wax foundation without bees.", "mixed": "A mixture of capped honey and open cells."}),
  detail: choice("What timber frames the comb?", {"pine": "Pale pine rails.", "cedar": "Warm reddish cedar.", "dark": "Dark old propolis-stained timber.", "white": "White painted top bars.", "new": "Fresh clean wax-coloured timber."}),
  support: choice("How is the frame held?", {"hooks": "Top-bar ears rest on metal hooks.", "notch": "Top-bar ears sit in cut timber notches.", "clamp": "Two padded side clamps hold the rails.", "rail": "A long lower rail steadies the frame.", "cradle": "Two triangular cradle brackets."}),
  extra: choice("What lies beneath the frame?", {"tray": "A shallow wax-crumb tray.", "cloth": "A folded pale inspection cloth.", "brush": "A soft bee brush.", "tool": "A red hive lever.", "none": "A clear inspection surface."}),
  mark: choice("How is the frame marked?", {"date": "A small inspection date tab.", "number": "An engraved FRAME 02 tab.", "queen": "A small blue queen marker dot.", "stripe": "A red stripe on the top bar.", "plain": "No identifying mark."}),
  extent: score("How wide is the comb frame?", ["A small nucleus frame", "A standard brood frame", "A broad teaching frame"]),
  load: score("How many bees remain on the comb?", ["Almost none", "A few scattered workers", "A small cluster around the brood"]),
  closed: noul("Is a short magnifying lens resting beside the stand?"),
};
export default defineThing({
  questions,
  build(a, context) {
    const s = new Sculpture(context), { random, mood } = context;
    const f = Object.keys(questions.form.options).indexOf(a.form), t = Object.keys(questions.state.options).indexOf(a.state), d = Object.keys(questions.detail.options).indexOf(a.detail), u = Object.keys(questions.support.options).indexOf(a.support), e = Object.keys(questions.extra.options).indexOf(a.extra), m = Object.keys(questions.mark.options).indexOf(a.mark);
    const wood = s.material('#a47c4e'), pale = s.material('#e0d2ac'), metal = s.material('#8f9995', { metalness: 0.7, roughness: 0.35 }), dark = s.material('#3d443c'), green = s.material('#667e50');
    const colors = ['#a64d39', '#497e70', '#d4af55', '#59778c', '#b47b8c'];

    const w=.32+a.extent*.2,h=.25,n=f===1?2:f===2?3:1,base=f===3?.08:.3,mat=s.material(['#c4a574','#ad805c','#765f42','#d5cead','#c9b67e'][d]),wax=s.material(t===0?'#d0bd85':t===3?'#daca99':'#ad873d'),span=(w+.12)*n;
    for(let k=0;k<n;k++){const x=(k-(n-1)/2)*(w+.12),frame=new THREE.Group();for(const dx of [-w/2,w/2])frame.add(s.box([.022,h,.03],[dx,h/2,0],mat));frame.add(s.box([w+.08,.023,.035],[0,h,0],mat));frame.add(s.box([w,.02,.025],[0,0,0],mat));frame.add(s.box([w-.03,h-.025,.008],[0,h/2,0],wax));
      for(let row=0;row<4;row++)for(let col=0;col<6;col++){const xx=(col-2.5)*w*.13+(row%2)*w*.065,yy=.04+row*.052,cap=t===0||t===4&&(row+col)%3===0,cell=s.mesh(new THREE.TorusGeometry(.021,.0016,3,6),t===2&&row>0&&row<3&&col>1&&col<5?dark:cap?pale:wood,[xx,yy,.01]);frame.add(cell);if(cap)frame.add(s.mesh(new THREE.CircleGeometry(.019,6),pale,[xx,yy,.009]));}
      if(t!==3)for(let j=0;j<Math.round(a.load*9);j++){const xx=(random()-.5)*w*.7,yy=.04+random()*.17;frame.add(s.ball([.009,.005,.005],[xx,yy,.017],dark,8));frame.add(s.ball([.004,.009,.002],[xx,yy,.022],pale,8));}frame.position.set(x,base,0);frame.rotation.x=f===4?-.18:0;s.root.add(frame);
      const supportZ=f===4?-Math.sin(.18)*h:.01;for(const dx of [-w*.52,w*.52]){s.rod([x+dx,0,.05],[x+dx,base+h,supportZ],.015,u===0?metal:wood);s.box([.07,.025,.3],[x+dx,.013,.02],wood);if(u===0||u===1)s.rod([x+dx,base+h,supportZ],[x+dx*.88,base+h,supportZ],.01,metal);if(u===2)s.box([.06,.035,.05],[x+dx*.96,base+h*.6,0],wood);if(u===4)s.rod([x+dx,base,.02],[x+dx,.03,.15],.015,wood);}if(u===3)s.box([w+.1,.025,.06],[x,base-.02,0],wood);
      if(m===0||m===1)s.label(m===0?'INSPECTED':'FRAME 02',w*.5,.025,[x,base+h+.003,supportZ+.012]);if(m===2)s.ball([.008,.008,.002],[x,base+h,supportZ+.015],s.material('#547f9e'),10);if(m===3)s.box([w*.6,.008,.004],[x,base+h,supportZ+.012],s.material('#a86451'));}
    if(e===0){s.box([span,.02,.35],[0,.01,.02],metal);for(let i=0;i<12;i++)s.ball([.012,.003,.008],[(random()-.5)*span,.022,(random()-.5)*.25],pale,8);}if(e===1)s.box([span,.008,.32],[0,.004,0],pale);if(e===2){s.rod([-span*.35,.01,.25],[span*.1,.01,.25],.006,wood);s.box([.1,.02,.04],[span*.1,.014,.25],pale);}if(e===3)s.box([.2,.005,.03],[0,.005,.25],s.material('#aa654b'));if(a.closed){s.ring(.045,.005,[span*.55,.012,0],metal).rotation.x=Math.PI/2;s.rod([span*.55,.012,.04],[span*.55,.012,.15],.006,wood);}return s.finish();
  },
});
