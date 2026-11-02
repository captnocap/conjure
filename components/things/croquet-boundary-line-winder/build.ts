import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing, figure } from '@conjure/kit';
const questions = {
  form: choice("What form is the line reel?", {"drum": "A wide drum reel between two cheeks.", "spoke": "An open six-spoke reel.", "hand": "A compact hand-carry reel in a cradle.", "tall": "A tall narrow reel on a stand.", "box": "A square-sided wooden winding frame."}),
  state: choice("What is happening with the line?", {"packed": "All line is wound on the drum.", "unroll": "A loose line runs out to one peg.", "corner": "The line turns around two boundary pegs.", "rewind": "A coil lies beside the reel for rewinding.", "empty": "An empty spindle waits for line."}),
  detail: choice("What are the reel cheeks made from?", {"wood": "Natural wooden cheeks.", "red": "Muted red painted cheeks.", "green": "Dark green painted cheeks.", "metal": "Galvanized steel cheeks.", "cream": "Cream painted plywood."}),
  support: choice("What holds the axle?", {"aframe": "Two triangular A-frame supports.", "fork": "Two straight fork posts.", "box": "A low rectangular carrying frame.", "legs": "A narrow four-legged stand.", "cradle": "A small low tabletop cradle."}),
  extra: choice("What lies beside it?", {"pegs": "A bundle of spare boundary pegs.", "mallet": "A small setting mallet.", "bag": "A cloth line bag.", "card": "A court-layout card.", "none": "A clear winding area."}),
  mark: choice("How is the line identified?", {"white": "Plain white line.", "red": "Red line on a white spool.", "blue": "A blue centre wrap on the coil.", "tag": "A BOUNDARY LINE paper tag.", "ends": "Two coloured end flags."}),
  extent: score("How large is the winding reel?", ["A small garden reel", "A club boundary reel", "A broad court reel"]),
  load: score("How much line is on the drum?", ["A few turns", "A half-filled spool", "A full heavy coil"]),
  closed: noul("Is the crank handle fitted with a wooden grip?"),
};
export default defineThing({
  questions,
  build(a, context) {
    const s = new Sculpture(context), { random, mood } = context;
    const f = Object.keys(questions.form.options).indexOf(a.form), t = Object.keys(questions.state.options).indexOf(a.state), d = Object.keys(questions.detail.options).indexOf(a.detail), u = Object.keys(questions.support.options).indexOf(a.support), e = Object.keys(questions.extra.options).indexOf(a.extra), m = Object.keys(questions.mark.options).indexOf(a.mark);
    const wood = s.material('#a47c4e'), pale = s.material('#e0d2ac'), metal = s.material('#8f9995', { metalness: 0.7, roughness: 0.35 }), dark = s.material('#3d443c'), green = s.material('#667e50');
    const colors = ['#a64d39', '#497e70', '#d4af55', '#59778c', '#b47b8c'];

    const r=(f===2?.1:f===3?.2:.14)+a.extent*.1,w=f===3?.12:f===2?.13:.18,cy=u===4?r+.04:r+.16,mat=s.material(['#b29464','#a96c56','#657f5a','#929e94','#d3ceb3'][d]),reel=new THREE.Group();for(const x of [-w/2,w/2]){if(f===1){reel.add(s.ring(r,.008,[x,0,0],mat));const ring=reel.children[reel.children.length-1];ring.rotation.y=Math.PI/2;for(let i=0;i<6;i++)reel.add(s.rod([x,0,0],[x,Math.sin(i*Math.PI/3)*r,Math.cos(i*Math.PI/3)*r],.009,mat));}else if(f===4)reel.add(s.box([.025,r*2,r*2],[x,0,0],mat));else{const c=s.cylinder(r,r,.018,[x,0,0],mat,28);c.rotation.z=Math.PI/2;reel.add(c);}}const spindle=s.cylinder(.04,.04,w+.1,[0,0,0],wood,20);spindle.rotation.z=Math.PI/2;reel.add(spindle);if(t!==4){const coil=s.cylinder(.055+a.load*r*.6,.055+a.load*r*.6,w*.85,[0,0,0],m===1?s.material('#a6604d'):pale,28);coil.rotation.z=Math.PI/2;reel.add(coil);if(m===2){const band=s.cylinder(.06+a.load*r*.6,.06+a.load*r*.6,.025,[0,0,0],s.material('#6f8c9c'),28);band.rotation.z=Math.PI/2;reel.add(band);}}reel.position.y=cy;s.root.add(reel);s.rod([-w*.9,cy,0],[w*.9,cy,0],.012,metal);
    for(const x of [-w*.85,w*.85]){if(u===0)for(const z of [-r*.8,r*.8])s.rod([x,0,z],[x,cy,0],.016,wood);else{s.rod([x,0,0],[x,cy,0],.02,wood);s.box([.07,.025,r*2],[x,.013,0],wood);}}if(u===2||u===3){for(const z of [-r,r])s.rod([-w,cy*.45,z],[w,cy*.45,z],.016,wood);}s.rod([w*.9,cy,0],[w*.9,cy+r*.6,0],.012,metal);s.rod([w*.9,cy+r*.6,0],[w*1.5,cy+r*.6,0],a.closed?.022:.011,a.closed?wood:metal);
    if(t===1||t===2){const p:[number,number,number]=[.65,.008,.3];s.tube([[0,cy-.04,r*.3],[.08,.008,r*.8],p],.003,pale);s.rod([p[0],0,p[2]],[p[0],.12,p[2]],.008,wood);if(t===2){s.rod(p,[.65,.008,-.35],.003,pale);s.rod([.65,0,-.35],[.65,.12,-.35],.008,wood);}}if(t===3)for(let i=0;i<4;i++)s.ring(.08+i*.008,.003,[.55,.006+i*.004,0],pale).rotation.x=Math.PI/2;if(m===3){s.box([w+.025,.065,.012],[0,cy,r],wood);s.label('BOUNDARY',w,.05,[0,cy,r+.008]);}if(m===4)for(const x of [-w/2,w/2])s.box([.04,.1,.005],[x,cy-r*.6,r+.003],s.material('#ac6952'));
    if(e===0)for(let i=0;i<4;i++)s.rod([-.4+i*.025,.012,-.1],[-.4+i*.025,.012,.15],.007,wood);if(e===1){s.rod([-.4,.025,-.1],[-.4,.025,.14],.008,wood);s.box([.12,.06,.06],[-.4,.03,.14],wood);}if(e===2)s.ball([.14,.07,.16],[-.43,.07,0],green,16);if(e===3)s.label('COURT PLAN',.2,.14,[-.4,.004,0]).rotation.x=-Math.PI/2;return s.finish();
  },
});
