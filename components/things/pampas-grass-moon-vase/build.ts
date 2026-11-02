import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing, figure } from '@conjure/kit';
const questions = {
  form: choice("What vase holds the grasses?", {"cylinder": "A tall narrow ceramic cylinder.", "belly": "A round-bellied stoneware vase.", "bamboo": "A cut bamboo tube vase.", "basket": "A woven flower basket with a hidden liner.", "bottle": "A small narrow-necked bottle vase."}),
  state: choice("How are the grasses arranged?", {"fan": "A loose fan of arching stems.", "upright": "A tall upright ceremonial bunch.", "lean": "All stems lean gently to one side.", "sparse": "Three carefully spaced stems.", "fallen": "A few loose stems rest beside the vase."}),
  detail: choice("What is the vase finish?", {"cream": "Warm cream pottery.", "black": "Dark charcoal stoneware.", "blue": "Muted blue glaze.", "brown": "Rust-brown earthenware.", "green": "Soft green celadon."}),
  support: choice("What sits beneath the vase?", {"mat": "A round woven rush mat.", "wood": "A small square wood board.", "lacquer": "A dark lacquer coaster.", "stone": "A flat river stone.", "bare": "No separate base."}),
  extra: choice("What is mixed among the grasses?", {"none": "Only silver grass.", "flower": "Two small autumn flowers.", "leaf": "A broad red maple leaf.", "berry": "A branch of red berries.", "reed": "Several bare reed stems."}),
  mark: choice("What binds the arrangement?", {"loose": "Loose natural stems.", "cord": "A thin straw cord near the mouth.", "ribbon": "A pale tied ribbon.", "ring": "A small bamboo holding ring.", "wire": "A nearly hidden dark florist wire."}),
  extent: score("How tall is the vase and arrangement?", ["A low tabletop arrangement", "A household moon-viewing vase", "A tall veranda arrangement"]),
  load: score("How many plume stems are included?", ["Three stems", "Six stems", "Nine stems"]),
  closed: noul("Does a single loose plume lie beside the vase?"),
};
export default defineThing({
  questions,
  build(a, context) {
    const s = new Sculpture(context), { random, mood } = context;
    const f = Object.keys(questions.form.options).indexOf(a.form), t = Object.keys(questions.state.options).indexOf(a.state), d = Object.keys(questions.detail.options).indexOf(a.detail), u = Object.keys(questions.support.options).indexOf(a.support), e = Object.keys(questions.extra.options).indexOf(a.extra), m = Object.keys(questions.mark.options).indexOf(a.mark);
    const wood = s.material('#a47c4e'), pale = s.material('#e0d2ac'), metal = s.material('#8f9995', { metalness: 0.7, roughness: 0.35 }), dark = s.material('#3d443c'), green = s.material('#667e50');
    const colors = ['#a64d39', '#497e70', '#d4af55', '#59778c', '#b47b8c'];

    const h=.2+a.extent*.15,r=f===1?.12:.07,vase=s.material(['#d5ceb4','#55594d','#7496a3','#a47a57','#93a58b'][d]);s.lathe(f===1?[[.07,0],[.12,.12],[.1,h*.8],[.04,h],[.035,h],[.065,.015]]:f===4?[[.05,0],[.08,.08],[.065,h*.65],[.025,h*.85],[.025,h],[.02,h],[.04,.01]]:[[r*.85,0],[r,h],[r-.008,h],[r*.75,.01]],f===2?wood:f===3?wood:vase);if(f===2)for(const yy of [.08,.2])s.ring(r,.005,[0,yy,0],dark).rotation.x=Math.PI/2;
    const n=t===3?3:3+Math.round(a.load*6),L=.45+a.extent*.5;for(let i=0;i<n;i++){const lean=t===1?(i-(n-1)/2)*.018:t===2?.22:(i/(n-1||1)-.5)*.5,tx=lean,tz=(random()-.5)*.16,ty=h+L*(.7+random()*.3);s.tube([[0,.08,0],[lean*.25,h+.15,tz*.3],[tx,ty,tz]],.0025,wood);const plume=s.ball([.025,.11,.025],[tx,ty+.05,tz],pale,12);plume.rotation.z=-lean*.7;for(let j=0;j<8;j++){const yy=ty-.04+j*.02,rr=.035*(1-Math.abs(j-3.5)/5);s.rod([tx,yy,tz],[tx-rr,yy+.035,tz+.012],.0015,pale);s.rod([tx,yy,tz],[tx+rr,yy+.035,tz-.012],.0015,pale);}}
    if(e===1)for(const x of [-.08,.1]){s.rod([0,.1,0],[x,h+.24,.05],.002,green);for(let i=0;i<6;i++)s.ball([.018,.008,.01],[x+Math.cos(i*Math.PI/3)*.015,h+.24,.05+Math.sin(i*Math.PI/3)*.015],s.material('#b69675'),10);}if(e===2){s.rod([0,h,0],[.18,h+.22,.03],.003,wood);s.mesh(new THREE.CircleGeometry(.07,5),s.material('#ae7052',{side:THREE.DoubleSide}),[.18,h+.22,.03]);}if(e===3){s.rod([0,h,0],[-.15,h+.3,.04],.003,wood);for(let i=0;i<7;i++)s.ball([.012,.012,.012],[-.15+(random()-.5)*.08,h+.27+random()*.08,.04],s.material('#ac5f4a'),10);}if(e===4)for(let i=0;i<3;i++)s.rod([0,.1,0],[(i-1)*.08,h+L*.7,.05],.003,wood);
    if(m>0)s.ring(f===1?.047:f===4?.026:r*.98,m===2?.008:.004,[0,h*.95,0],m===4?dark:m===3?wood:pale).rotation.x=Math.PI/2;if(u===0||u===2)s.cylinder(r*1.6,r*1.6,.008,[0,.004,0],u===0?wood:dark,28);if(u===1)s.box([r*3,.012,r*3],[0,.006,0],wood);if(u===3)s.ball([r*1.7,.02,r*1.2],[0,.02,0],pale,14);if(a.closed||t===4){s.rod([r+.06,.005,-.2],[r+.08,.005,.3],.002,wood);s.ball([.025,.008,.1],[r+.08,.01,.28],pale,12);}return s.finish();
  },
});
