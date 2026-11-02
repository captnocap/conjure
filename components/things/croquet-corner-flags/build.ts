import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing, figure } from '@conjure/kit';
const questions = {
  form: choice("What shape are the flags?", {"square": "Small square cloth flags.", "triangle": "Long triangular pennants.", "swallow": "Swallow-tailed cloth flags.", "round": "Round rigid marker disks.", "number": "Rectangular numbered marker plates."}),
  state: choice("How are the markers arranged?", {"four": "Four upright markers in a square.", "row": "Four flags stand in a display row.", "pair": "Two markers are out on the lawn.", "stored": "Two upright flags and two laid flat.", "setup": "One marker is upright with the others beside it."}),
  detail: choice("What colours mark the corners?", {"classic": "Red, blue, black and yellow.", "soft": "Soft garden colours.", "white": "White cloth with coloured centres.", "stripe": "Broad two-colour horizontal stripes.", "club": "Dark green club flags."}),
  support: choice("What anchors the stakes?", {"spike": "Simple pointed turf stakes.", "disc": "Small flat metal disk bases.", "wood": "Low square timber bases.", "stone": "Flat stone weights.", "cross": "Cross-shaped wooden feet."}),
  extra: choice("What lies by the set?", {"bag": "A rolled flag storage sleeve.", "cord": "A short boundary cord.", "peg": "A spare wooden peg.", "mallet": "A small peg-setting mallet.", "none": "Only the flags."}),
  mark: choice("What is printed on the flags?", {"numbers": "Corner numbers one through four.", "dots": "One large contrasting dot.", "club": "Simple C.C. club initials.", "edge": "A pale stitched edge.", "plain": "Plain solid colour."}),
  extent: score("How tall are the corner poles?", ["Low practice markers", "Standard lawn corner flags", "Tall easily spotted flags"]),
  load: score("How broad is each flag?", ["Small neat flags", "Medium cloth markers", "Broad fluttering pennants"]),
  closed: noul("Do the fabric flags turn gently in the breeze?"),
};
export default defineThing({
  questions,
  build(a, context) {
    const s = new Sculpture(context), { random, mood } = context;
    const f = Object.keys(questions.form.options).indexOf(a.form), t = Object.keys(questions.state.options).indexOf(a.state), d = Object.keys(questions.detail.options).indexOf(a.detail), u = Object.keys(questions.support.options).indexOf(a.support), e = Object.keys(questions.extra.options).indexOf(a.extra), m = Object.keys(questions.mark.options).indexOf(a.mark);
    const wood = s.material('#a47c4e'), pale = s.material('#e0d2ac'), metal = s.material('#8f9995', { metalness: 0.7, roughness: 0.35 }), dark = s.material('#3d443c'), green = s.material('#667e50');
    const colors = ['#a64d39', '#497e70', '#d4af55', '#59778c', '#b47b8c'];

    const h=.45+a.extent*.5,w=.16+a.load*.12,n=t===2?2:4,cloths:Array<{mesh:THREE.Mesh,base:Float32Array}>=[];for(let i=0;i<n;i++){const laid=t===3&&i>1||t===4&&i>0,x=t===1?(i-1.5)*.38:(i%2-.5)*.5,z=t===1?0:(Math.floor(i/2)-.5)*.5,group=new THREE.Group(),color=s.material(d===4?'#627e59':d===2?'#d8d6bd':(d===1?['#b88273','#7c9ba5','#7d9276','#baa265']:colors)[i%4],{side:THREE.DoubleSide});group.add(s.rod([0,0,0],[0,h,0],.008,wood));if(f===3)group.add(s.mesh(new THREE.CircleGeometry(w*.5,24),color,[w*.5,h-w*.55,0]));else{const shape=new THREE.Shape();shape.moveTo(0,0);shape.lineTo(w,0);if(f===1)shape.lineTo(0,-w*.65);else if(f===2){shape.lineTo(w*.65,-w*.35);shape.lineTo(w,-w*.7);shape.lineTo(0,-w*.7);}else{shape.lineTo(w,-w*.7);shape.lineTo(0,-w*.7);}shape.closePath();group.add(s.mesh(new THREE.ShapeGeometry(shape),color,[0,h-.02,0]));}if(m===0||m===2||f===4)group.add(s.label(m===2?'C.C.':String(i+1),w*.6,w*.4,[w*.5,h-w*.37,.003]));if(m===1||d===2)group.add(s.ball([w*.16,w*.16,.002],[w*.45,h-w*.35,.003],s.material(colors[i%4]),12));if(d===3)group.add(s.box([w*.42,.02,.004],[w*.25,h-w*.3,.004],pale));if(m===3){if(f===3)group.add(s.ring(w*.46,.002,[w*.5,h-w*.55,.004],pale));else group.add(s.rod([.01,h-.03,.004],[w*.9,h-.03,.004],.002,pale));}
      if(laid){group.rotation.x=-Math.PI/2;group.position.set(x,.012,z);}else{group.position.set(x,0,z);if(u===1)s.cylinder(.065,.065,.012,[x,.006,z],metal,20);if(u===2)s.box([.12,.02,.12],[x,.01,z],wood);if(u===3)s.ball([.09,.025,.07],[x,.025,z],pale,12);if(u===4){s.box([.16,.018,.035],[x,.009,z],wood);s.box([.035,.018,.16],[x,.009,z],wood);}}s.root.add(group);if(a.closed&&!laid&&f<3)group.userData.flutters=true;}
    if(e===0)s.cylinder(.035,.035,.45,[.65,.035,0],green,16).rotation.x=Math.PI/2;if(e===1)s.ring(.08,.007,[.65,.008,0],pale).rotation.x=Math.PI/2;if(e===2)s.rod([.65,.01,-.1],[.65,.01,.16],.01,wood);if(e===3){s.rod([.65,.025,-.1],[.65,.025,.15],.008,wood);s.box([.12,.055,.055],[.65,.028,.15],wood);}return s.finish({update:(_dt,time)=>{s.root.children.forEach((child,i)=>{if(child.userData.flutters)child.rotation.y=Math.sin(time*(.6+mood.energy)+i)*.06;});}});
  },
});
