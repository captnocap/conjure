import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing, figure } from '@conjure/kit';
const questions = {
  form: choice("What holds the indigo bath?", {"jar": "A broad-bellied ceramic jar.", "crock": "A straight-sided stoneware crock.", "barrel": "A lined wooden vat.", "pit": "A low stone-lined dye pit.", "tub": "A wide metal dye tub."}),
  state: choice("What is happening at the vat?", {"rest": "A still vat with a quiet bronze surface.", "stir": "A paddle disturbs the bath.", "dip": "A pale cloth is partly submerged.", "flower": "A dense blue foam flower floats on top.", "closed": "A wooden lid covers the resting vat."}),
  detail: choice("How is the vessel finished?", {"blue": "Deep indigo glaze.", "brown": "Warm iron-rich stoneware.", "cream": "Pale salt glaze with blue stains.", "green": "Muted celadon glaze.", "raw": "Unglazed reddish clay."}),
  support: choice("What keeps the vat stable?", {"ring": "A broad woven rope base ring.", "bricks": "Three short brick supports.", "plinth": "A circular stone plinth.", "frame": "A timber cradle.", "ground": "The vessel rests directly on the floor."}),
  extra: choice("What works beside the vat?", {"paddle": "A long wooden stirring paddle.", "ladle": "A metal sampling ladle.", "thermometer": "A slim thermometer in a wood guard.", "bowl": "A small oxidation sample bowl.", "none": "No loose tool."}),
  mark: choice("What identifies the dye batch?", {"tag": "An INDIGO paper batch tag.", "chalk": "Chalk tally marks on the side.", "cord": "A coloured cord around the neck.", "tile": "A small numbered ceramic tile.", "plain": "No marking."}),
  extent: score("How broad is the dye vat?", ["A small test vat", "A workshop dye vat", "A communal deep vat"]),
  load: score("How high is the dye bath?", ["Low in the vessel", "Half full", "Near the shoulder"]),
  closed: noul("Is a stained protective mat spread beneath it?"),
};
export default defineThing({
  questions,
  build(a, context) {
    const s = new Sculpture(context), { random, mood } = context;
    const f = Object.keys(questions.form.options).indexOf(a.form), t = Object.keys(questions.state.options).indexOf(a.state), d = Object.keys(questions.detail.options).indexOf(a.detail), u = Object.keys(questions.support.options).indexOf(a.support), e = Object.keys(questions.extra.options).indexOf(a.extra), m = Object.keys(questions.mark.options).indexOf(a.mark);
    const wood = s.material('#a47c4e'), pale = s.material('#e0d2ac'), metal = s.material('#8f9995', { metalness: 0.7, roughness: 0.35 }), dark = s.material('#3d443c'), green = s.material('#667e50');
    const colors = ['#a64d39', '#497e70', '#d4af55', '#59778c', '#b47b8c'];

    const r=.22+a.extent*.23,h=f===3?.3:f===4?.42:.68,base=u===1?.07:u===2?.1:u===3?.08:.02,mat=f===2?wood:f===4?metal:s.material(['#3f5d70','#977655','#c7c2a5','#849b87','#ab7b5d'][d]);s.lathe([[r*.65,0],[r*.95,h*.3],[r,h*.75],[r*.87,h],[r*.83,h],[r*.91,h*.72],[r*.6,.04]],mat,[0,base,0]);s.ring(r*.85,.015,[0,base+h,0],mat).rotation.x=Math.PI/2;
    const y=base+.08+a.load*(h-.12),dye=s.material('#344d5a',{roughness:.3});s.cylinder(r*.82,r*.82,.015,[0,y,0],dye,40);if(t===3||t===1)for(let i=0;i<(t===3?25:8);i++){const ang=random()*Math.PI*2,rr=Math.sqrt(random())*r*.5;s.ball([.025,.008,.025],[Math.cos(ang)*rr,y+.013,Math.sin(ang)*rr],i%3?dye:s.material('#887e5e'),10);}
    if(t===2){const cloth=s.material('#9aada1',{side:THREE.DoubleSide});s.surface((u,v,p)=>p.set((u-.5)*r*.75,y+.02+v*(base+h+.02-y-.02),Math.sin(v*Math.PI)*r*.35),cloth,{segments:[12,18]});s.rod([-r*.94,base+h+.02,0],[r*.94,base+h+.02,0],.018,wood);}
    if(t===4){s.cylinder(r*.9,r*.9,.035,[0,base+h+.02,0],wood,32);s.rod([-.08,base+h+.055,0],[.08,base+h+.055,0],.018,wood);}
    if(u===0)s.ring(r*.63,.025,[0,.025,0],pale).rotation.x=Math.PI/2;if(u===1)for(let i=0;i<3;i++)s.box([.16,.07,.12],[Math.cos(i*2.094)*r*.5,.035,Math.sin(i*2.094)*r*.5],s.material('#a77b61'));if(u===2)s.cylinder(r*.75,r*.8,.1,[0,.05,0],pale,28);if(u===3)for(const x of [-r*.6,r*.6])s.box([.08,.08,r*1.7],[x,.04,0],wood);
    if(e===0||t===1){s.rod([-r*.25,y-.05,0],[r*.35,base+h+.35,-r*.25],.02,wood);s.box([.1,.2,.025],[-r*.25,y-.05,0],wood);}if(e===1){s.rod([r*.35,y,0],[r*.65,base+h+.2,0],.007,metal);s.ball([.05,.025,.05],[r*.35,y,0],metal,14);}if(e===2)s.rod([r*.6,y,0],[r*.6,base+h+.16,0],.012,pale);if(e===3){s.lathe([[.05,0],[.08,.06],[.07,.06],[.04,.01]],pale,[r+.13,0,0]);s.cylinder(.06,.06,.005,[r+.13,.035,0],dye,20);}
    if(m===0||m===3){s.box([r*1.25,.1,.02],[0,base+h*.65,r+.01],pale);s.label(m===0?'INDIGO':'VAT 03',r*1.2,.09,[0,base+h*.65,r+.023]);}if(m===1)for(let i=0;i<4;i++)s.rod([-.06+i*.04,base+h*.55,r*.97],[-.05+i*.04,base+h*.7,r*.99],.003,pale);if(m===2)s.ring(r*.88,.008,[0,base+h*.94,0],green).rotation.x=Math.PI/2;if(a.closed){s.box([r*2.8,.008,r*2.6],[0,.004,0],pale);for(let i=0;i<8;i++)s.ball([.04,.001,.025],[(random()-.5)*r*2.5,.009,(random()-.5)*r*2.3],dye,8);}return s.finish();
  },
});
