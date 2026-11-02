import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing, figure } from '@conjure/kit';
const questions = {
  form: choice("What is the rinse vessel?", {"enamel": "A broad cream enamel wash basin.", "wood": "A low wooden wash tub.", "stone": "A carved stone basin.", "copper": "A warm copper wash pan.", "double": "Two shallow basins side by side."}),
  state: choice("What rinse stage is visible?", {"first": "Deep blue water after the first rinse.", "clear": "Nearly clear water after repeated rinsing.", "wring": "A twisted wet cloth is set across the rim.", "dry": "An emptied basin with a stain ring.", "soak": "Cloth is spread below the water surface."}),
  detail: choice("What cloth pattern is emerging?", {"bands": "White parallel resist bands.", "circles": "Pale circular resist marks.", "grid": "A cream square grid.", "plain": "Plain rich indigo.", "fade": "A pale blue uneven fade."}),
  support: choice("What supports the basin?", {"stool": "A low square wash stool.", "bricks": "Four brick supports.", "floor": "Directly on the courtyard floor.", "legs": "A tubular metal stand.", "slats": "A raised timber draining platform."}),
  extra: choice("What is kept beside it?", {"jug": "A clean water jug.", "soap": "A pale soap block.", "brush": "A short scrub brush.", "bucket": "A small drain bucket.", "none": "No loose item."}),
  mark: choice("What identifies this rinse station?", {"one": "A FIRST RINSE board.", "two": "A FINAL RINSE board.", "drops": "Three blue painted droplets.", "handle": "Blue cloth wrapped around one handle.", "plain": "No identifying marks."}),
  extent: score("How broad is the basin?", ["A sample rinsing bowl", "A workshop basin", "A large cloth-washing basin"]),
  load: score("How much cloth is soaking?", ["A small cloth square", "A folded scarf", "A long fabric length"]),
  closed: noul("Is a narrow drainboard attached to the rim?"),
};
export default defineThing({
  questions,
  build(a, context) {
    const s = new Sculpture(context), { random, mood } = context;
    const f = Object.keys(questions.form.options).indexOf(a.form), t = Object.keys(questions.state.options).indexOf(a.state), d = Object.keys(questions.detail.options).indexOf(a.detail), u = Object.keys(questions.support.options).indexOf(a.support), e = Object.keys(questions.extra.options).indexOf(a.extra), m = Object.keys(questions.mark.options).indexOf(a.mark);
    const wood = s.material('#a47c4e'), pale = s.material('#e0d2ac'), metal = s.material('#8f9995', { metalness: 0.7, roughness: 0.35 }), dark = s.material('#3d443c'), green = s.material('#667e50');
    const colors = ['#a64d39', '#497e70', '#d4af55', '#59778c', '#b47b8c'];

    const r=.24+a.extent*.18,h=.16,base=u===0?.3:u===1?.07:u===3?.45:u===4?.08:0,mat=f===1?wood:f===2?pale:f===3?s.material('#b7885f',{metalness:.65}):s.material('#d1d6be');const centers=f===4?[-r*.9,r*.9]:[0],rr=f===4?r*.65:r;
    for(const x of centers){s.lathe([[rr*.7,0],[rr,h],[rr-.015,h],[rr*.65,.025]],mat,[x,base,0]);s.ring(rr,.008,[x,base+h,0],f===0?dark:mat).rotation.x=Math.PI/2;if(t!==3)s.cylinder(rr*.87,rr*.87,.004,[x,base+h*.6,0],s.material(t===0?'#52768a':'#a0b7b1',{transparent:true,opacity:.8,depthWrite:false}),32);}
    const cloth=s.material(d===4?'#8ca8b0':'#4b6d88',{side:THREE.DoubleSide});if(t===2)s.tube([[-r*.8,base+h+.03,0],[0,base+h+.07,.05],[r*.8,base+h+.03,0]],.05,cloth);else{const len=.25+a.load*.5;s.surface((u,v,p)=>{const z=(v-.4)*len,y=t===4?base+h*.45:base+h+.015-Math.max(0,v-.55)*h*1.7;p.set((u-.5)*r*.8,y+Math.sin(u*Math.PI*8)*.008,z);},cloth,{segments:[16,18]});if(d===0||d===2)for(let i=0;i<5;i++)s.box([r*.7,.003,.018],[0,t===4?base+h*.45+.012:base+h+.02-Math.max(0,((i-2)*.045/len+.4)-.55)*h*1.7,(i-2)*.045],pale);if(d===1)for(let i=0;i<3;i++)s.ring(.025,.004,[(i-1)*r*.22,t===4?base+h*.45+.012:base+h+.025,0],pale).rotation.x=Math.PI/2;}
    if(u===0||u===3){for(const x of [-r*.65,r*.65])for(const z of [-r*.65,r*.65])s.rod([x,0,z],[x,base,z],u===0?.025:.013,u===0?wood:metal);s.box([r*1.6,.035,r*1.6],[0,base-.02,0],wood);}if(u===1)for(const x of [-r*.6,r*.6])for(const z of [-r*.5,r*.5])s.box([.15,.07,.08],[x,.035,z],s.material('#aa7962'));if(u===4)for(let i=0;i<7;i++)s.box([r*2,.08,.055],[0,.04,(i-3)*r*.27],wood);
    if(e===0){s.lathe([[.05,0],[.08,.12],[.04,.2],[.035,.2],[.04,.02]],pale,[r+.18,0,0]);s.ring(.045,.01,[r+.25,.11,0],pale);}if(e===1)s.box([.08,.025,.05],[r+.12,.013,0],pale);if(e===2){s.box([.12,.025,.06],[r+.12,.04,0],wood);s.box([.12,.03,.06],[r+.12,.015,0],pale);}if(e===3)s.lathe([[.08,0],[.11,.18],[.1,.18],[.07,.015]],metal,[r+.16,0,0]);if(m<2)s.label(m===0?'FIRST RINSE':'FINAL RINSE',r*1.3,.07,[0,base+h*.6,rr*.95]);if(m===2)for(let i=0;i<3;i++)s.ball([.016,.025,.004],[(i-1)*.05,base+h*.6,rr*.95],cloth,10);if(m===3)s.rod([-r,base+h,0],[-r,base+h,.12],.02,cloth);if(a.closed){for(const zz of [-.09,.09])s.rod([r*.8,base+h*.4,zz],[r*1.85,base+h-.015,zz],.012,wood);for(let i=0;i<5;i++)s.box([r,.02,.03],[r*1.4,base+h,(i-2)*.06],wood);s.rod([r*.9,base+h,-.08],[r*1.9,base+h,-.08],.012,wood);}return s.finish();
  },
});
