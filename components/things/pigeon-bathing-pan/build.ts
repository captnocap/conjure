import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing, figure } from '@conjure/kit';
const questions = {
  form: choice("What holds the bath water?", {"tin": "A shallow galvanized basin.", "clay": "A broad terracotta dish.", "stone": "A carved stone bird bath.", "square": "A square enamel tray.", "wood": "A waterproofed wooden tub."}),
  state: choice("What is happening in the bath?", {"still": "Still water waits for the flock.", "splash": "A pigeon bathes with wings lifted.", "drink": "A pigeon leans down to drink.", "dry": "An empty dry pan after cleaning.", "busy": "Two birds share the bath."}),
  detail: choice("What is the bathing pigeon like?", {"blue": "Blue-grey with dark wing bars.", "white": "A white pigeon with pale wings.", "red": "A warm russet pigeon.", "pied": "Grey and white pied plumage.", "dark": "A charcoal pigeon with a green neck."}),
  support: choice("What supports the pan?", {"floor": "Directly on the loft floor.", "brick": "Three short brick supports.", "stand": "A low three-legged metal stand.", "plinth": "A broad stone plinth.", "tray": "A timber splash-catching tray."}),
  extra: choice("What provides footing?", {"stone": "A broad smooth stepping stone.", "gravel": "A few pebbles around the edge.", "bar": "A wooden bar across one end.", "ring": "A raised inner footing ring.", "clear": "Clear open water."}),
  mark: choice("What lies beside the bath?", {"feathers": "Three loose pale feathers.", "towel": "A folded drying cloth.", "jug": "A small refill jug.", "brush": "A short cleaning brush.", "none": "A clear floor."}),
  extent: score("How wide is the bath?", ["A single bird dish", "A pair bath", "A flock bathing pan"]),
  load: score("How much water is in the pan?", ["A shallow film", "A comfortable bath", "A brim-full bath"]),
  closed: noul("Does a low splash screen stand behind the pan?"),
};
export default defineThing({
  questions,
  build(a, context) {
    const s = new Sculpture(context), { random, mood } = context;
    const f = Object.keys(questions.form.options).indexOf(a.form), t = Object.keys(questions.state.options).indexOf(a.state), d = Object.keys(questions.detail.options).indexOf(a.detail), u = Object.keys(questions.support.options).indexOf(a.support), e = Object.keys(questions.extra.options).indexOf(a.extra), m = Object.keys(questions.mark.options).indexOf(a.mark);
    const wood = s.material('#a47c4e'), pale = s.material('#e0d2ac'), metal = s.material('#8f9995', { metalness: 0.7, roughness: 0.35 }), dark = s.material('#3d443c'), green = s.material('#667e50');
    const colors = ['#a64d39', '#497e70', '#d4af55', '#59778c', '#b47b8c'];

    const r=.22+a.extent*.18,h=.08,base=u===2?.22:u===1?.07:u===3?.12:.02,mat=f===0?metal:f===1?s.material('#b88461'):f===2?pale:f===3?s.material('#cbd4bd'):wood;
    if(f===3){s.box([r*2,.025,r*1.7],[0,base,0],mat);for(const x of [-r,r])s.box([.02,h,r*1.7],[x,base+h/2,0],mat);for(const z of [-r*.85,r*.85])s.box([r*2,h,.02],[0,base+h/2,z],mat);}else s.lathe([[0,0],[r*.8,.005],[r,h],[r-.012,h],[r*.77,.015],[0,.015]],mat,[0,base,0]);const water=base+.02+a.load*.04;if(t!==3)s.cylinder(r*.86,r*.86,.003,[0,water,0],s.material('#91a9a5',{transparent:true,opacity:.75,depthWrite:false,roughness:.2}),32);
    if(u===1)for(let i=0;i<3;i++)s.box([.15,.07,.08],[Math.cos(i*2.094)*r*.65,.035,Math.sin(i*2.094)*r*.65],s.material('#ac7c62'));if(u===2)for(let i=0;i<3;i++)s.rod([Math.cos(i*2.094)*r*.8,0,Math.sin(i*2.094)*r*.8],[Math.cos(i*2.094)*r*.6,.22,Math.sin(i*2.094)*r*.6],.012,metal);if(u===3)s.cylinder(r*.7,r*.8,.12,[0,.06,0],pale,24);if(u===4)s.box([r*2.5,.03,r*2.5],[0,.015,0],wood);
    if(e===0)s.ball([.1,.035,.075],[-r*.4,base+.035,0],dark,12);if(e===1)for(let i=0;i<8;i++)s.ball([.025,.018,.02],[Math.cos(i*Math.PI/4)*r*.7,base+.03,Math.sin(i*Math.PI/4)*r*.7],pale,10);if(e===2)s.rod([-r*.7,base+.09,-r*.4],[r*.7,base+.09,-r*.4],.02,wood);if(e===3)s.ring(r*.6,.025,[0,base+.03,0],pale).rotation.x=Math.PI/2;
    if(t===1||t===2||t===4)for(let b=0;b<(t===4?2:1);b++){const x=b===0?0:r*.42,z=b===0?0:-r*.2,bird=s.material(['#7c8c93','#d9d8c5','#ab7b5c','#b3b9ad','#58665d'][d]);s.ball([.08,.075,.12],[x,water+.065,z],bird,16);s.ball([.035,.04,.035],[x,water+(t===2?.055:.15),z+.09],bird,14);s.mesh(new THREE.ConeGeometry(.01,.032,6),pale,[x,water+(t===2?.04:.145),z+.132]).rotation.x=Math.PI/2;for(const sign of [-1,1]){const wing=s.ball([.02,.07,.1],[x+sign*(t===1?.095:.065),water+.09,z],d===3?pale:bird,14);wing.rotation.z=sign*(t===1?.9:.15);s.rod([x+sign*.065,water+.09,z-.05],[x+sign*.075,water+.12,z+.04],.008,dark);}s.box([.075,.012,.11],[x,water+.03,z-.13],bird);if(t===1)for(let i=0;i<8;i++)s.ball([.006,.01,.006],[x+(random()-.5)*.35,water+.15+random()*.16,z+(random()-.5)*.3],pale,8);}
    if(t===1||t===4)for(const rr of [r*.45,r*.7])s.ring(rr,.002,[0,water+.004,0],pale).rotation.x=Math.PI/2;
    if(m===0)for(let i=0;i<3;i++)s.ball([.012,.003,.045],[r+.07+i*.03,.004,.08],pale,8);if(m===1)s.box([.15,.022,.12],[r+.14,.011,.05],pale);if(m===2){s.lathe([[.035,0],[.055,.08],[.035,.15],[.03,.15],[.03,.02]],pale,[r+.1,0,0]);s.ring(.03,.007,[r+.15,.08,0],pale);}if(m===3){s.box([.12,.025,.055],[r+.12,.03,0],wood);s.box([.12,.025,.055],[r+.12,.012,0],pale);}if(a.closed){s.box([r*2.2,.25,.025],[0,base+.125,-r-.03],green);for(const x of [-r*.8,r*.8])s.rod([x,0,-r-.03],[x,base+.25,-r-.03],.015,wood);}return s.finish();
  },
});
