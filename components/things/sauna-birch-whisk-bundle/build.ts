import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing, figure } from '@conjure/kit';
const questions = {
  form: choice("How is the whisk formed?", {"fan": "A broad fan of leafy birch twigs.", "round": "A full rounded leafy bundle.", "slim": "A narrow tightly bound whisk.", "pair": "Two crossed birch whisks.", "oak": "A broad-leaved oak-style bathing whisk."}),
  state: choice("How is it prepared?", {"fresh": "Fresh green leaves cover the twigs.", "dry": "A dry muted bundle is ready to soak.", "soak": "The whisk rests in a soaking pail.", "used": "A few loose leaves have fallen nearby.", "wrapped": "A cloth sleeve protects the lower bundle."}),
  detail: choice("What binds the handle?", {"twine": "Pale twine binding.", "red": "Red cotton ties.", "raffia": "Wide straw-coloured binding.", "cloth": "A green cloth wrap.", "wire": "Dark narrow binding."}),
  support: choice("What holds the bundle?", {"board": "A low slatted sauna board.", "pail": "A small wood soaking pail.", "towel": "A folded bath towel.", "tray": "A shallow oval wood tray.", "bare": "A clear floor."}),
  extra: choice("What is nearby?", {"leaves": "Several loose birch leaves.", "cord": "A spare coil of twine.", "cup": "A small water cup.", "branch": "A bare spare twig.", "none": "Only the bathing whisk."}),
  mark: choice("What identifies the bundle?", {"tag": "A small BIRCH tag at the handle.", "date": "A tied harvest date card.", "band": "A pale band around the grip.", "knot": "A prominent tied knot.", "plain": "An unmarked binding."}),
  extent: score("How broad is the leafy fan?", ["A light hand whisk", "A full bathing whisk", "A broad leafy bundle"]),
  load: score("How dense are the leaves?", ["Open visible twigs", "A leafy gathered bundle", "A dense fragrant whisk"]),
  closed: noul("Does the handle have a small hanging loop?"),
};
export default defineThing({
  questions,
  build(a, context) {
    const s = new Sculpture(context), { random, mood } = context;
    const f = Object.keys(questions.form.options).indexOf(a.form), t = Object.keys(questions.state.options).indexOf(a.state), d = Object.keys(questions.detail.options).indexOf(a.detail), u = Object.keys(questions.support.options).indexOf(a.support), e = Object.keys(questions.extra.options).indexOf(a.extra), m = Object.keys(questions.mark.options).indexOf(a.mark);
    const wood = s.material('#a47c4e'), pale = s.material('#e0d2ac'), metal = s.material('#8f9995', { metalness: 0.7, roughness: 0.35 }), dark = s.material('#3d443c'), green = s.material('#667e50');
    const colors = ['#a64d39', '#497e70', '#d4af55', '#59778c', '#b47b8c'];

    const W=.22+a.extent*.2,L=.55,n=7+Math.round(a.load*9),mat=s.material(t===1?'#8b8c5c':f===4?'#6d8652':'#799b5e'),tie=s.material(['#d6c6a1','#a96f57','#b49a66','#6c825d','#535e4b'][d]),base=u===0?.035:u===2?.025:u===3?.025:0,standing=t===2||u===1,group=new THREE.Group();const bundles=f===3?2:1;for(let b=0;b<bundles;b++){const g=new THREE.Group();for(let i=0;i<n;i++){const q=(i-(n-1)/2)/(n-1),x=q*W*(f===2?.5:1),z=(random()-.5)*W*.3;g.add(s.rod([0,.015,0],[x,.04,L*.85],.003,wood));for(let j=0;j<4;j++){const k=.4+j*.15;g.add(s.ball([f===4?.045:.026,.006,f===1?.045:.038],[x*k+(j%2-.5)*.025,.045,z+L*k],mat,10));}}for(let i=0;i<6;i++)g.add(s.ring(.02,.004,[0,.018,.035+i*.012],tie));if(m===0||m===1){g.add(s.box([.07,.003,.05],[.04,.027,.08],pale));g.add(s.label(m===0?'BIRCH':'JUNE',.06,.035,[.04,.03,.08]).rotateX(-Math.PI/2));}if(m===2)g.add(s.box([.05,.012,.035],[0,.025,.08],pale));if(m===3)g.add(s.ball([.02,.015,.018],[.025,.025,.08],tie,10));if(a.closed)g.add(s.tube([[0,.02,0],[-.04,.02,-.04],[.04,.02,-.04],[0,.02,0]],.003,tie));if(t===4)g.add(s.box([.1,.035,.2],[0,.02,.17],pale));g.rotation.y=b*.75;group.add(g);}if(standing){group.rotation.x=-.95;group.position.y=.11;group.position.z=-.05;s.lathe([[.11,0],[.14,.2],[.13,.2],[.1,.015]],wood,[0,0,0]);s.cylinder(.125,.125,.005,[0,.13,0],s.material('#8da69a'),22);}else group.position.y=base;s.root.add(group);if(u===0)for(let i=0;i<5;i++)s.box([W*1.4,.03,.1],[0,.015,.06+i*.105],wood);if(u===2)s.box([W*1.6,.025,.65],[0,.013,.25],pale);if(u===3)s.ball([W*.85,.025,.36],[0,.025,.25],wood,22);if(e===0||t===3)for(let i=0;i<4;i++)s.ball([.025,.003,.04],[W*.8+i*.04,.004,.1+i*.07],mat,10);if(e===1)s.ring(.06,.005,[W,.005,.1],tie).rotation.x=Math.PI/2;if(e===2)s.lathe([[.04,0],[.06,.08],[.05,.08],[.03,.01]],wood,[W,0,.1]);if(e===3)s.rod([W,.005,0],[W+.05,.005,.4],.004,wood);return s.finish();
  },
});
