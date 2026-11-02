import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing, figure } from '@conjure/kit';
const questions = {
  form: choice("What shapes are the hats?", {"bell": "Simple bell-shaped felt hats.", "point": "Soft pointed felt hats.", "round": "Rounded wool caps.", "brim": "Low hats with a broad turned brim.", "mixed": "A row of several hat shapes."}),
  state: choice("How is the rack being used?", {"full": "A hat hangs on every peg.", "one": "Only one hat remains.", "dry": "Two hats and towels are drying.", "empty": "Empty pegs wait for bathers.", "ready": "A spare hat rests on the lower shelf."}),
  detail: choice("What colours are the felt hats?", {"cream": "Natural cream wool.", "grey": "Warm grey felt.", "brown": "Brown undyed wool.", "green": "Muted green felt.", "mixed": "Several quiet wool colours."}),
  support: choice("What carries the peg rail?", {"posts": "Two slender timber posts.", "panel": "A solid narrow backing panel.", "a": "A light folding frame.", "bench": "A short bench with a tall back rail.", "arch": "An arched timber frame."}),
  extra: choice("What lies beneath the hats?", {"towel": "A folded bathing towel.", "sandals": "A pair of wooden sandals.", "bag": "A small cloth changing bag.", "brush": "A felt cleaning brush.", "none": "A clear shelf."}),
  mark: choice("How are the hats personalised?", {"seam": "A contrasting stitched seam.", "band": "A narrow coloured felt band.", "loop": "A small top hanging loop.", "initial": "A tiny initial patch.", "plain": "Plain soft felt."}),
  extent: score("How many pegs are available?", ["Two bathers", "Three bathers", "Five bathers"]),
  load: score("How high is the drying rail?", ["A low bench rack", "A waist-height rack", "A tall changing-room rack"]),
  closed: noul("Is a lower towel rail fitted between the posts?"),
};
export default defineThing({
  questions,
  build(a, context) {
    const s = new Sculpture(context), { random, mood } = context;
    const f = Object.keys(questions.form.options).indexOf(a.form), t = Object.keys(questions.state.options).indexOf(a.state), d = Object.keys(questions.detail.options).indexOf(a.detail), u = Object.keys(questions.support.options).indexOf(a.support), e = Object.keys(questions.extra.options).indexOf(a.extra), m = Object.keys(questions.mark.options).indexOf(a.mark);
    const wood = s.material('#a47c4e'), pale = s.material('#e0d2ac'), metal = s.material('#8f9995', { metalness: 0.7, roughness: 0.35 }), dark = s.material('#3d443c'), green = s.material('#667e50');
    const colors = ['#a64d39', '#497e70', '#d4af55', '#59778c', '#b47b8c'];

    const n=2+Math.round(a.extent*3),W=n*.27,H=.6+a.load*.6;for(const x of [-W*.46,W*.46]){s.rod([x,0,0],[x,H,0],.02,wood);s.box([.1,.03,.38],[x,.015,0],wood);if(u===2)s.rod([x,0,-.17],[x,H*.85,0],.018,wood);}s.rod([-W/2,H,0],[W/2,H,0],.025,wood);s.box([W,.025,.3],[0,u===3?.38:.12,0],wood);if(u===1)s.box([W,H*.5,.025],[0,H*.7,-.025],wood);if(u===4)s.tube([[-W/2,H,0],[0,H+.15,0],[W/2,H,0]],.02,wood);if(a.closed)s.rod([-W/2,H*.5,0],[W/2,H*.5,0],.016,wood);for(let i=0;i<n;i++){const x=(i-(n-1)/2)*.27,shape=f===4?i%4:f,hatMat=s.material(d===4?['#d0c9ae','#999d8e','#8b775d','#829176'][i%4]:['#d0c9ae','#999d8e','#8b775d','#829176'][d]);s.rod([x,H,0],[x,H,.1],.01,wood);if(t===3||t===1&&i!==0||t===2&&i>1)continue;const g=new THREE.Group(),hh=shape===1?.25:.18,rr=shape===3?.12:.09;g.add(s.lathe([[rr,0],[rr*.85,hh*.5],[shape===1?.006:.04,hh],[0,hh+.01]],hatMat));if(shape===3)g.add(s.ring(rr,.015,[0,.018,0],hatMat).rotateX(Math.PI/2));if(m===0)g.add(s.tube([[0,.01,rr],[0,hh*.5,rr*.85],[0,hh,.02]],.003,pale));if(m===1)g.add(s.ring(rr*.93,.008,[0,.035,0],green).rotateX(Math.PI/2));if(m===2)g.add(s.ring(.018,.004,[0,hh+.02,0],hatMat));if(m===3)g.add(s.label(String.fromCharCode(65+i),.035,.04,[0,.07,rr*.9]));g.position.set(x,H-hh*.55,.1);s.root.add(g);}const sy=u===3?.395:.135;if(t===2&&a.closed)s.drape({size:[.3,.6],at:[0,H*.5+.05,0],over:[{box:[W,.025,.025],at:[0,H*.5,0]}],floor:.14,detail:12},pale);if(t===4)s.mesh(new THREE.ConeGeometry(.1,.16,20),pale,[0,sy+.08,0]);if(e===0)s.box([.3,.03,.23],[W*.2,sy+.015,0],pale);if(e===1)for(const x of [-.07,.07])s.ball([.05,.02,.1],[x,sy+.02,0],wood,12);if(e===2)s.ball([.11,.1,.07],[0,sy+.1,0],green,14);if(e===3){s.box([.12,.02,.06],[0,sy+.045,0],wood);s.box([.12,.025,.06],[0,sy+.02,0],pale);}return s.finish();
  },
});
