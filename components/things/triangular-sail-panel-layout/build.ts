import * as THREE from 'three';
import { Sculpture, choice, score, noul, diorama, defineThing, defineWorld, figure } from '@conjure/kit';
export default defineThing({
  questions: {
    sail: choice("What shape is being cut?", {"jib": "A tall narrow triangular jib.", "main": "A broad triangular mainsail.", "storm": "A compact heavy storm sail.", "lateen": "An elongated lateen triangle."}),
    material: choice("What is the sailcloth?", {"cream": "Unbleached cream canvas.", "white": "Bright white sailcloth.", "red": "Rust red storm canvas.", "tan": "Warm tan traditional cloth."}),
    panels: choice("How are the seams arranged?", {"radial": "Seams radiate from one corner.", "horizontal": "Broad horizontal panel seams.", "vertical": "Parallel vertical cloth panels.", "patchwork": "Alternating rectangular repair panels."}),
    corners: choice("How are the corners reinforced?", {"layers": "Stacked triangular reinforcement patches.", "leather": "Dark leather corner patches.", "webbing": "Crossed webbing reinforcement.", "bare": "No corner patches yet."}),
    edge: choice("How is the outer edge finished?", {"rope": "A thick sewn-in bolt rope.", "hem": "A broad doubled hem.", "tabs": "Small fastening tabs along the edge.", "raw": "Raw cloth awaiting finishing."}),
    rings: choice("What corner fittings are installed?", {"brass": "Brass eyelets at all three corners.", "steel": "Steel rings at the corners.", "loops": "Sewn rope loops.", "none": "No corner fittings yet."}),
    layout: choice("What marks the cutting work?", {"chalk": "Pale chalk construction lines.", "weights": "Dark round pattern weights.", "pins": "Coloured pin heads at the corners.", "clean": "No layout aids remain."}),
    work: choice("What stage has the work reached?", {"whole": "A complete sail ready to fold.", "missing": "One corner section is still absent.", "repair": "A contrasting square repair patch.", "roll": "The lower edge has begun to roll up."}),
    spread: score("How broadly is the sail laid out?", ["A compact working panel", "A full-size panel", "A fully spread sail"])
  },
  build(a,context){

    const s=new Sculpture(context),cloth=s.material({cream:'#d7ccab',white:'#e7e5cf',red:'#a9644b',tan:'#b89c6b'}[a.material],{roughness:0.85,side:THREE.DoubleSide}),seam=s.material('#978c6b'),dark=s.material('#47523e'),patch=s.material(a.corners==='leather'?'#805d3d':'#c3b58f');
    const w=(a.sail==='jib'?1.35:a.sail==='lateen'?3.4:2.4)*(0.75+a.spread*0.5),d=a.sail==='storm'?1.5:2.5;
    const points:[number,number,number][]=[[-w/2,0.08,d/2],[w/2,0.08,d/2],[-w/2,0.08,-d/2]];
    s.box([w+0.3,0.07,d+0.3],[0,0.035,0],s.material('#a58a5d'));
    const sh=new THREE.Shape();sh.moveTo(-w/2,-d/2);sh.lineTo(w/2,-d/2);sh.lineTo(-w/2,d/2);sh.closePath();const panel=s.mesh(new THREE.ShapeGeometry(sh),cloth,[0,0.08,0]);panel.rotation.x=-Math.PI/2;
    for(let j=1;j<7;j++){const t=j/7;if(a.panels==='horizontal')s.rod([-w/2,0.087,-d/2+t*d],[-w/2+t*w,0.087,-d/2+t*d],0.005,seam);else if(a.panels==='vertical')s.rod([-w/2+t*w,0.087,d/2],[-w/2+t*w,0.087,-d/2+t*d],0.005,seam);else s.rod(points[0],[w/2-t*w,0.087,d/2-t*d],0.005,seam);}
    if(a.panels==='patchwork')for(let j=0;j<3;j++)s.box([w*0.2,0.005,d*0.15],[-w*0.35+j*w*0.15,0.09,d*0.2],s.material(j%2?'#b8ac86':'#e0d3b0'));
    for(const [i,p] of points.entries()){
      const x=p[0]+(i===1?-0.12:0.12),z=p[2]+(i===2?0.12:-0.12);
      if(a.corners!=='bare')s.box([0.26,0.008,0.26],[x,0.09,z],patch).rotation.y=i*Math.PI/4;
      if(a.corners==='layers')s.box([0.17,0.007,0.17],[x,0.1,z],cloth).rotation.y=i*Math.PI/4;
      if(a.corners==='webbing')for(const turn of [-0.5,0.5])s.box([0.32,0.007,0.045],[x,0.105,z],dark).rotation.y=turn;
      if(a.rings!=='none')s.ring(a.rings==='loops'?0.07:0.045,a.rings==='loops'?0.012:0.009,[x,0.112,z],a.rings==='brass'?s.material('#aa914d',{metalness:0.7}):a.rings==='loops'?seam:s.material('#9eaa98',{metalness:0.8})).rotation.x=Math.PI/2;
      if(a.layout==='pins')s.ball([0.012,0.012,0.012],[x,0.13,z],s.material(i%2?'#a24933':'#667f96'),10);
    }
    if(a.edge==='rope'||a.edge==='hem')s.tube([...points,points[0]],a.edge==='rope'?0.022:0.012,seam);
    if(a.edge==='tabs')for(let j=0;j<8;j++)s.box([0.06,0.008,0.13],[-w/2+j*w/8,0.09,d/2+0.03],cloth);
    if(a.layout==='weights')for(let j=0;j<5;j++)s.cylinder(0.07,0.07,0.035,[-w*0.35+j*w*0.14,0.12,d*0.3],dark,20);
    if(a.layout==='chalk')s.rod([-w*0.4,0.095,d*0.32],[w*0.2,0.095,d*0.32],0.004,s.material('#f0e7cb'));
    if(a.work==='missing')s.box([0.32,0.009,0.32],[-w/2+0.13,0.1,-d/2+0.13],s.material('#a58a5d'));
    if(a.work==='repair')s.box([0.4,0.012,0.35],[-w*0.18,0.1,d*0.2],s.material('#a67653'));
    if(a.work==='roll')s.rod([-w/2,0.15,d/2],[w/2,0.15,d/2],0.08,cloth);
    return s.finish();

  },
});
