import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing, figure } from '@conjure/kit';
const questions = {
  form: choice("What shape is the stand?", {"square": "A square four-legged offering stand.", "round": "A circular lacquer tray on short legs.", "sanbo": "A square tray over a pierced box support.", "long": "A long low ceremonial table.", "tier": "Two stepped display levels."}),
  state: choice("How has it been prepared?", {"empty": "A clean empty surface waits.", "paper": "A folded offering paper is centred.", "flowers": "One small autumn flower is laid on top.", "cups": "Two tiny tea cups wait for guests.", "cleared": "A cloth and a faint ring remain after the gathering."}),
  detail: choice("What lacquer finish does it have?", {"black": "Deep charcoal-black lacquer.", "red": "Muted vermilion lacquer.", "brown": "Warm brown transparent lacquer.", "green": "Dark moss-green lacquer.", "wood": "Unlacquered pale wood."}),
  support: choice("What do the feet look like?", {"straight": "Four straight square legs.", "splay": "Four gently splayed legs.", "scroll": "Curved scroll-like feet.", "box": "A solid pierced box pedestal.", "sled": "Two low sled runners."}),
  extra: choice("What rests beside the stand?", {"mat": "A small woven sitting mat.", "cloth": "A folded cloth cover.", "brush": "A soft lacquer dusting brush.", "tray": "A little companion saucer.", "none": "Only the stand."}),
  mark: choice("What decorates the rim?", {"gold": "A fine gold-coloured edge line.", "moon": "A small inlaid crescent mark.", "cloud": "A repeating cloud-like border.", "corners": "Four brass corner protectors.", "plain": "A plain unadorned rim."}),
  extent: score("How broad is the offering stand?", ["A small tabletop pedestal", "A low household offering stand", "A broad veranda display stand"]),
  load: score("How high is the tray above the floor?", ["Very low", "A comfortable low stand", "A tall offering pedestal"]),
  closed: noul("Is a fitted cloth cover folded across the back edge?"),
};
export default defineThing({
  questions,
  build(a, context) {
    const s = new Sculpture(context), { random, mood } = context;
    const f = Object.keys(questions.form.options).indexOf(a.form), t = Object.keys(questions.state.options).indexOf(a.state), d = Object.keys(questions.detail.options).indexOf(a.detail), u = Object.keys(questions.support.options).indexOf(a.support), e = Object.keys(questions.extra.options).indexOf(a.extra), m = Object.keys(questions.mark.options).indexOf(a.mark);
    const wood = s.material('#a47c4e'), pale = s.material('#e0d2ac'), metal = s.material('#8f9995', { metalness: 0.7, roughness: 0.35 }), dark = s.material('#3d443c'), green = s.material('#667e50');
    const colors = ['#a64d39', '#497e70', '#d4af55', '#59778c', '#b47b8c'];

    const w=.35+a.extent*.45,dep=f===3?w*.5:w*.8,h=.13+a.load*.25,paint=s.material(['#484c43','#a6624d','#816b50','#5d715b','#c4ac80'][d],{roughness:d===4?.75:.28});if(f===1)s.cylinder(w/2,w/2,.03,[0,h,0],paint,32);else s.box([w,.03,dep],[0,h,0],paint);if(f!==1)for(const z of [-dep/2,dep/2])s.box([w,.04,.015],[0,h+.025,z],paint);
    if(u===3||f===2){s.box([w*.65,h-.02,dep*.65],[0,(h-.02)/2,0],paint);s.ball([w*.12,h*.22,.003],[0,h*.5,dep*.326],dark,16);}else if(u===4)for(const x of [-w*.35,w*.35])s.box([.06,h,dep],[x,h/2,0],paint);else for(const x of [-w*.38,w*.38])for(const z of [-dep*.35,dep*.35]){if(u===2)s.tube([[x*1.15,0,z],[x,.03,z],[x*.9,h,z]],.025,paint);else s.rod([x*(u===1?1.2:1),0,z*(u===1?1.2:1)],[x,h,z],.022,paint);}
    if(f===4){s.box([w*.5,.03,dep*.6],[0,h+.15,-dep*.2],paint);for(const x of [-w*.2,w*.2])s.rod([x,h,-dep*.2],[x,h+.14,-dep*.2],.015,paint);}
    if(t===1)s.box([w*.5,.002,dep*.6],[0,h+.017,0],pale);if(t===2){s.rod([-.1,h+.02,0],[.1,h+.02,0],.002,green);for(let i=0;i<5;i++)s.ball([.02,.005,.01],[.1+Math.cos(i*1.257)*.015,h+.025,Math.sin(i*1.257)*.015],pale,10);}if(t===3)for(const x of [-w*.2,w*.2])s.lathe([[.025,0],[.04,.05],[.035,.05],[.02,.01]],pale,[x,h+.016,0]);if(t===4)s.ring(.055,.002,[0,h+.017,0],wood).rotation.x=Math.PI/2;
    if(m===0){if(f===1)s.ring(w*.48,.003,[0,h+.017,0],s.material('#b89d62')).rotation.x=Math.PI/2;else for(const z of [-dep*.48,dep*.48])s.rod([-w*.48,h+.048,z],[w*.48,h+.048,z],.003,s.material('#b89d62'));}if(m===1)s.ring(.025,.005,[0,h+.025,dep/2+.01],pale,Math.PI*1.4);if(m===2)for(let i=0;i<7;i++)s.ball([.025,.008,.003],[(i-3)*w*.12,h+.025,dep/2+.012],pale,10);if(m===3)for(const x of [-w*.45,w*.45])for(const z of [-dep*.45,dep*.45])s.box([.04,.003,.04],[x,h+.018,z],metal);
    if(e===0)s.box([.35,.01,.3],[w*.8,.005,0],wood);if(e===1)s.box([.2,.025,.16],[w*.75,.013,0],pale);if(e===2){s.box([.12,.015,.035],[w*.75,.025,0],wood);s.box([.12,.025,.035],[w*.75,.013,0],pale);}if(e===3)s.cylinder(.07,.07,.008,[w*.75,.004,0],pale,24);if(a.closed)s.drape({size:[w*.8,dep*.4],at:[0,h+.1,-dep*.3],over:[{box:[w,.03,dep],at:[0,h,0]}],floor:.01,detail:12},pale);return s.finish();
  },
});
