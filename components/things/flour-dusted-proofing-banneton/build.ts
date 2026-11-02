import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing, figure } from '@conjure/kit';
const questions = {
  form: choice("What shape is the basket?", {"round": "A round coiled banneton.", "oval": "An elongated oval basket.", "deep": "A deep round proofing bowl.", "pair": "Two small round baskets.", "long": "A narrow long-loaf basket."}),
  state: choice("What stage is the dough at?", {"empty": "A clean flour-dusted basket.", "low": "A small dough portion rests inside.", "risen": "A full risen loaf reaches the rim.", "turned": "The dough sits beside the empty basket.", "covered": "A cloth covers the proofing dough."}),
  detail: choice("What is the basket material?", {"cane": "Pale cane coils.", "dark": "Dark woven reed.", "linen": "A cream linen-lined basket.", "wood": "Warm wood-pulp basket.", "grey": "Grey seasoned wicker."}),
  support: choice("What rests beneath it?", {"board": "A round wooden bread board.", "cloth": "A folded linen cloth.", "tray": "A flat metal tray.", "slats": "A low slatted drying board.", "bare": "A plain work surface."}),
  extra: choice("What is beside the dough?", {"scraper": "A curved dough scraper.", "flour": "A little flour bowl.", "tag": "A batch timing card.", "brush": "A small flour brush.", "none": "Only the proofing basket."}),
  mark: choice("How is the dough marked?", {"plain": "A smooth flour-dusted surface.", "spiral": "A visible spiral proofing pattern.", "cross": "A shallow crossed guide mark.", "seed": "A scattering of seeds.", "leaf": "A simple leaf-shaped stencil."}),
  extent: score("How broad is the basket?", ["A small household loaf", "A generous round loaf", "A large shared loaf"]),
  load: score("How deeply has the dough risen?", ["Barely risen", "Comfortably proofed", "Full and airy"]),
  closed: noul("Does a loose linen flap hang over the basket rim?"),
};
export default defineThing({
  questions,
  build(a, context) {
    const s = new Sculpture(context), { random, mood } = context;
    const f = Object.keys(questions.form.options).indexOf(a.form), t = Object.keys(questions.state.options).indexOf(a.state), d = Object.keys(questions.detail.options).indexOf(a.detail), u = Object.keys(questions.support.options).indexOf(a.support), e = Object.keys(questions.extra.options).indexOf(a.extra), m = Object.keys(questions.mark.options).indexOf(a.mark);
    const wood = s.material('#a47c4e'), pale = s.material('#e0d2ac'), metal = s.material('#8f9995', { metalness: 0.7, roughness: 0.35 }), dark = s.material('#3d443c'), green = s.material('#667e50');
    const colors = ['#a64d39', '#497e70', '#d4af55', '#59778c', '#b47b8c'];

    const R=.14+a.extent*.1,H=f===2?.18:.12,stretch=f===1?1.45:f===4?1.9:1,base=u===4?0:.018,mat=s.material(['#c6b485','#8a7956','#d1c5a6','#b6986c','#a2a28b'][d]),n=f===3?2:1;const bw=R*(n===2?3.7:2.5);if(u===0)s.cylinder(bw*.5,bw*.5,base,[0,base/2,0],wood,30);if(u===1||u===2)s.box([bw,base,R*stretch*2.6],[0,base/2,0],u===1?pale:metal);if(u===3)for(let i=0;i<6;i++)s.box([bw,.018,R*stretch*.35],[0,.009,(i-2.5)*R*stretch*.4],wood);for(let b=0;b<n;b++){const x=(b-(n-1)/2)*R*2.3,g=new THREE.Group();g.add(s.lathe([[R*.65,0],[R,.10],[R,H],[R-.012,H],[R*.6,.015]],mat));for(let i=0;i<7;i++)g.add(s.ring(R*(.65+.35*Math.min(1,(.02+i*(H-.02)/6)/.1))+.003,.005,[0,.02+i*(H-.02)/6,0],d===2?pale:mat).rotateX(Math.PI/2));const doughR=R*(t===1?.64:.82),dh=t===1?.02+a.load*.025:.04+a.load*.06;const dx=t===3?R*2.1:0,dy=t===3?-base+dh:H*(t===1?.13:.4)+dh;if(t!==0){g.add(s.ball([doughR,dh,doughR],[dx,dy,0],s.material('#cfc39a'),22));if(m===1)for(let i=0;i<4;i++)g.add(s.ring(doughR*(.2+i*.2),.002,[dx,dy+dh*.8,0],pale).rotateX(Math.PI/2));if(m===2)for(const q of [-1,1])g.add(s.rod([dx-doughR*.5,dy+dh*.9,-q*doughR*.5],[dx+doughR*.5,dy+dh*.9,q*doughR*.5],.003,pale));if(m===3)for(let i=0;i<18;i++){const ang=i*2.4,rr=doughR*.75*Math.sqrt(i/18);g.add(s.ball([.003,.002,.008],[dx+Math.cos(ang)*rr,dy+dh*.85,Math.sin(ang)*rr],wood,6));}if(m===4)g.add(s.ball([doughR*.3,.001,doughR*.7],[dx,dy+dh*.9,0],pale,16));}g.scale.z=stretch;g.position.set(x,base,0);s.root.add(g);if(t===4||a.closed)s.drape({size:[R*2.7,R*stretch*1.7],at:[x,H+.15,0],over:[{cylinder:[R,H],at:[x,base+H/2,0]}],floor:base+.003,detail:16},pale);}const ex=-bw*.75;if(e===0){const sh=new THREE.Shape();sh.moveTo(-.06,0);sh.lineTo(.06,0);sh.quadraticCurveTo(.08,.07,0,.08);sh.quadraticCurveTo(-.08,.07,-.06,0);s.mesh(new THREE.ShapeGeometry(sh),pale,[ex,.004,0]).rotation.x=-Math.PI/2;}if(e===1)s.lathe([[.035,0],[.06,.05],[.055,.05],[.03,.01]],pale,[ex,0,0]);if(e===2)s.label('PROOF 10:30',.17,.09,[ex,.003,0]).rotation.x=-Math.PI/2;if(e===3){s.box([.1,.02,.05],[ex,.035,0],wood);s.box([.1,.025,.05],[ex,.013,0],pale);}return s.finish();
  },
});
