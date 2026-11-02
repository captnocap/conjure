import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing, figure } from '@conjure/kit';
const questions = {
  form: choice("What kind of apple mill is it?", {"wood": "A timber hopper and four-legged stand.", "iron": "A cast-iron mill with a broad flywheel.", "bench": "A compact bench-mounted grinder.", "twin": "A twin-roller scratter in a square frame.", "cart": "A mill mounted on a small wheeled cart."}),
  state: choice("What is happening at the mill?", {"ready": "A full hopper waits to be cranked.", "grinding": "Apples and pulp show a batch in progress.", "empty": "The teeth are visible in an empty hopper.", "blocked": "A large apple is caught above the drum.", "wash": "The hopper is empty with a cleaning brush across it."}),
  detail: choice("What apples are being crushed?", {"red": "Deep red dessert apples.", "green": "Small green cooking apples.", "gold": "Golden orchard apples.", "russet": "Russet-brown cider apples.", "mixed": "A mixed red, green and golden harvest."}),
  support: choice("How is the mill driven?", {"wheel": "A broad spoked flywheel.", "crank": "A simple bent hand crank.", "handle": "A long weighted wooden handle.", "gear": "Two exposed meshing gears.", "belt": "A pulley with a short belt to a handwheel."}),
  extra: choice("What waits under the chute?", {"tub": "A low wooden pulp tub.", "bucket": "A galvanized bucket.", "crate": "A cloth-lined harvest crate.", "tray": "A shallow rectangular tray.", "bare": "An empty floor beneath the mill."}),
  mark: choice("What identifies the mill?", {"maker": "APPLE MILL on a brass plate.", "arrow": "A painted direction arrow.", "number": "An orchard equipment number.", "repair": "A braced repair across the frame.", "plain": "Unmarked machinery."}),
  extent: score("How wide is the mill?", ["A small household mill", "An orchard mill", "A large harvest-day mill"]),
  load: score("How full is the hopper?", ["Just a few apples", "Half full", "Brimming with apples"]),
  closed: noul("Is a wooden safety pusher resting beside the hopper?"),
};
export default defineThing({
  questions,
  build(a, context) {
    const s = new Sculpture(context), { random, mood } = context;
    const f = Object.keys(questions.form.options).indexOf(a.form), t = Object.keys(questions.state.options).indexOf(a.state), d = Object.keys(questions.detail.options).indexOf(a.detail), u = Object.keys(questions.support.options).indexOf(a.support), e = Object.keys(questions.extra.options).indexOf(a.extra), m = Object.keys(questions.mark.options).indexOf(a.mark);
    const wood = s.material('#a47c4e'), pale = s.material('#e0d2ac'), metal = s.material('#8f9995', { metalness: 0.7, roughness: 0.35 }), dark = s.material('#3d443c'), green = s.material('#667e50');
    const colors = ['#a64d39', '#497e70', '#d4af55', '#59778c', '#b47b8c'];

    const w=.4+a.extent*.4,H=f===2?.55:.95,frame=f===1?metal:wood;for(const x of [-w*.55,w*.55])for(const z of [-.28,.28])s.rod([x*(f===4?1.1:1.25),0,z*1.2],[x,H-.1,z],.035,frame);s.box([w+.18,.06,.6],[0,H-.13,0],frame);
    for(const side of [-1,1]){const panel=s.box([.025,.35,.55],[side*w*.45,H+.13,0],frame);panel.rotation.z=side*.3;}for(const z of [-.26,.26])s.box([w,.35,.025],[0,H+.13,z],frame);
    s.cylinder(.095,.095,w*.72,[0,H-.02,0],metal,20).rotation.z=Math.PI/2;for(let i=0;i<10;i++){const ang=i*Math.PI/5;for(const x of [-w*.23,0,w*.23])s.ball([.018,.015,.015],[x,H-.02+Math.sin(ang)*.1,Math.cos(ang)*.1],dark,8);}
    const drive=new THREE.Group();drive.position.set(w*.62,H-.02,0);if(u===0||u===4){const r=u===0?.3:.22,rr=s.ring(r,.025,[0,0,0],frame);rr.rotation.y=Math.PI/2;drive.add(rr);for(let i=0;i<6;i++)drive.add(s.rod([0,0,0],[0,Math.sin(i*Math.PI/3)*r,Math.cos(i*Math.PI/3)*r],.015,frame));drive.add(s.rod([0,.2,0],[.12,.2,0],.018,wood));}else{drive.add(s.rod([0,0,0],[0,-.2,0],.017,metal));drive.add(s.rod([0,-.2,0],[.17,-.2,0],.023,wood));}if(u===2)drive.add(s.rod([0,0,0],[0,.35,0],.025,wood));if(u===3)for(const yy of [0,-.2]){const rr=s.ring(.115,.025,[0,yy,0],metal);rr.rotation.y=Math.PI/2;drive.add(rr);for(let i=0;i<12;i++)drive.add(s.ball([.018,.02,.02],[0,yy+Math.sin(i*Math.PI/6)*.13,Math.cos(i*Math.PI/6)*.13],dark,6));}s.root.add(drive);
    const chute=s.box([w*.6,.02,.42],[0,H-.24,.24],metal);chute.rotation.x=.5;
    const n=t===2||t===4?0:t===3?1:4+Math.round(a.load*14);for(let i=0;i<n;i++){const x=(random()-.5)*w*.65,z=(random()-.5)*.35,yy=H+.05+Math.floor(i/7)*.07;const mat=s.material(['#a94f36','#82954e','#c2a24f','#a27d49','#a94f36'][(d===4?i%4:d)]);s.ball([.045,.043,.045],[x,yy,z],mat,12);s.rod([x,yy+.035,z],[x+.004,yy+.057,z],.003,wood);}
    if(e<4){const mat=e===1?metal:wood;if(e===0||e===1)s.lathe([[.18,0],[.24,.26],[.225,.26],[.17,.02]],mat,[0,0,.44]);else{s.box([.55,.035,.45],[0,.018,.44],mat);for(const x of [-.26,.26])s.box([.025,.2,.45],[x,.12,.44],mat);for(const z of [.22,.66])s.box([.55,.2,.025],[0,.12,z],mat);}if(t===1)for(let i=0;i<12;i++)s.ball([.04,.025,.035],[(random()-.5)*.3,.1+random()*.06,.44+(random()-.5)*.25],s.material('#bca06b'),8);}
    if(f===4)for(const x of [-w*.65,w*.65])for(const z of [-.33,.33])s.cylinder(.1,.1,.04,[x,.1,z],dark,16).rotation.z=Math.PI/2;
    if(m<3)s.label(['APPLE MILL','TURN →','ORCHARD 7'][m],w*.65,.08,[0,H+.14,.277]);if(m===3)for(const x of [-w*.55,w*.55])s.rod([x,0,.28],[x,H-.1,-.28],.018,metal);if(a.closed||t===4)s.rod([-w*.5,H+.34,-.15],[w*.5,H+.34,.15],.018,wood);
    return s.finish({update:dt=>{if(t===1)drive.rotation.x+=dt*(.4+mood.energy*1.5);}});
  },
});
