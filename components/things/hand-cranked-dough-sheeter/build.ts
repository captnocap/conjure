import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing, figure } from '@conjure/kit';
const questions = {
  form: choice("What sort of sheeter is it?", {"desktop": "A compact clamp-on twin-roller machine.", "wood": "A wooden frame around polished rollers.", "stand": "A metal roller on a short freestanding frame.", "double": "Two rolling stages in one frame.", "wide": "A broad hand-fed roller for communal batches."}),
  state: choice("What is happening at the rollers?", {"feed": "A thick dough sheet enters the top.", "ribbon": "A long thin ribbon hangs down the front.", "rest": "The machine is empty between batches.", "jam": "A folded sheet bunches up at the opening.", "cut": "Round wrappers lie below the exiting sheet."}),
  detail: choice("How are the rollers finished?", {"chrome": "Bright polished steel.", "brass": "Warm brass-coloured metal.", "wood": "Smooth pale wooden rollers.", "etched": "Metal with fine guide rings.", "white": "White food-safe rollers."}),
  support: choice("How is the machine held steady?", {"clamp": "A screw clamp grips a little board.", "feet": "Four broad rubber feet.", "base": "A heavy rectangular base plate.", "suction": "Round suction feet.", "bench": "A miniature bench with cross-braced legs."}),
  extra: choice("What tool is nearby?", {"cutter": "A round wrapper cutter.", "brush": "A narrow cleaning brush.", "scraper": "A flat dough scraper.", "flour": "A small flour bowl.", "none": "No extra tool."}),
  mark: choice("What is on the adjustment dial?", {"numbers": "Numbers around the thickness dial.", "dots": "Small dark setting dots.", "red": "A red pointer arm.", "lever": "A long lever with a locking tooth.", "plain": "A plain knurled knob."}),
  extent: score("How wide are the rollers?", ["A narrow wrapper roller", "An everyday kitchen roller", "A wide batch roller"]),
  load: score("How thin is the dough setting?", ["Thick first pass", "A second pass", "Very thin wrapper dough"]),
  closed: noul("Is the crank handle folded inward for storage?"),
};
export default defineThing({
  questions,
  build(a, context) {
    const s = new Sculpture(context), { random, mood } = context;
    const f = Object.keys(questions.form.options).indexOf(a.form), t = Object.keys(questions.state.options).indexOf(a.state), d = Object.keys(questions.detail.options).indexOf(a.detail), u = Object.keys(questions.support.options).indexOf(a.support), e = Object.keys(questions.extra.options).indexOf(a.extra), m = Object.keys(questions.mark.options).indexOf(a.mark);
    const wood = s.material('#a47c4e'), pale = s.material('#e0d2ac'), metal = s.material('#8f9995', { metalness: 0.7, roughness: 0.35 }), dark = s.material('#3d443c'), green = s.material('#667e50');
    const colors = ['#a64d39', '#497e70', '#d4af55', '#59778c', '#b47b8c'];

    const w=.2+a.extent*.24,h=.26,y=.19,frame=f===1?wood:metal,roll=s.material(['#b8c0bb','#b69b61','#d0b68b','#b2bbb7','#dddccf'][d],{metalness:d===2||d===4?0:.75}),gap=.008+(1-a.load)*.012;
    s.box([w+.13,.035,.2],[0,.035,0],frame);for(const x of [-w/2-.025,w/2+.025])s.box([.045,.22,.15],[x,.145,0],frame);
    const cylinders:THREE.Object3D[]=[];for(const z of [-.035-gap/2,.035+gap/2]){const rr=s.cylinder(.035,.035,w,[0,y,z],roll,24);rr.rotation.z=Math.PI/2;cylinders.push(rr);if(d===3)for(let i=0;i<7;i++){const ring=s.ring(.0355,.0015,[(i/6-.5)*w,y,z],dark);ring.rotation.y=Math.PI/2;}}
    if(f===3)for(const z of [-.035,.035])s.cylinder(.03,.03,w,[0,.1,z],roll,20).rotation.z=Math.PI/2;
    const crank=new THREE.Group();crank.position.set(w/2+.06,y,0);crank.add(s.rod([0,0,0],[.025,0,0],.009,metal));crank.add(s.rod([.025,0,0],[.025,-.09,0],.009,metal));crank.add(s.rod([.025,-.09,0],[a.closed?-.04:.095,-.09,0],.015,wood));s.root.add(crank);
    s.cylinder(.04,.04,.018,[-w/2-.055,y,0],dark,20).rotation.z=Math.PI/2;if(m===0||m===1)for(let i=0;i<6;i++)s.ball([.002,.004,.004],[-w/2-.066,y+Math.sin(i*Math.PI/3)*.03,Math.cos(i*Math.PI/3)*.03],pale,8);if(m===2||m===3)s.rod([-w/2-.07,y,0],[-w/2-.07,y+.06,m===3?.06:0],.005,s.material('#a45b46'));
    const dough=s.material('#dfd1ab',{side:THREE.DoubleSide});if(t!==2){const l=t===1?.42:t===3?.14:.22;s.surface((u,v,p)=>p.set((u-.5)*w*.8,y+.03+Math.sin(v*Math.PI)*.025-(t===1?Math.max(0,v-.3)*.28:0),v*l),dough,{segments:[12,16]});if(t===0)s.box([w*.8,.018,.17],[0,y+.05,-.13],dough);if(t===3)for(let i=0;i<4;i++)s.ball([w*.35,.012,.035],[0,y+.04+i*.018,.03+i*.035],dough,12);if(t===4)for(let i=0;i<5;i++)s.cylinder(.045,.045,.003,[(i-2)*.08,.005,.28],dough,24);}
    if(u===0){s.box([w+.3,.025,.32],[0,.012,0],wood);s.tube([[w*.3,.06,.1],[w*.3,.06,.2],[w*.3,-.06,.2],[w*.3,-.06,.1]],.008,metal);}if(u===1||u===3)for(const x of [-w*.45,w*.45])for(const z of [-.07,.07])s.cylinder(u===3?.035:.018,.025,.025,[x,.015,z],dark,12);if(u===2)s.box([w+.25,.018,.32],[0,.009,0],metal);if(u===4){s.box([w+.25,.035,.35],[0,-.02,0],wood);for(const x of [-w*.5,w*.5])for(const z of [-.12,.12])s.rod([x,-.25,z],[x,-.03,z],.018,wood);}
    if(e===0)s.lathe([[.045,0],[.045,.04],[.042,.04],[.042,0]],metal,[w*.8,0,.18]);if(e===1){s.box([.07,.012,.025],[-w*.8,.025,.1],wood);s.box([.07,.025,.025],[-w*.8,.007,.1],pale);}if(e===2)s.box([.1,.004,.075],[-w*.8,.005,.1],metal);if(e===3){s.lathe([[.03,0],[.055,.045],[.05,.045],[.025,.01]],pale,[-w*.8,0,.1]);s.ball([.04,.012,.04],[-w*.8,.04,.1],pale,12);}
    return s.finish({update:(dt)=>{if(t===0||t===1)crank.rotation.x+=dt*(.2+mood.energy*.9);}});
  },
});
