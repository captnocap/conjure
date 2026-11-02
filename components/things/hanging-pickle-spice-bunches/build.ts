import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing, figure } from '@conjure/kit';
const questions = {
  form: choice("What herbs hang from the rail?", {"dill": "Feathery dill with seed umbels.", "garlic": "Braided garlic bulbs.", "pepper": "Strings of small red peppers.", "bay": "Broad bay-leaf bundles.", "mixed": "A mixture of pickling herbs and garlic."}),
  state: choice("What stage of drying is shown?", {"fresh": "Full fresh green bunches.", "dry": "Small tightly tied dry bunches.", "one": "Only one remaining bunch hangs.", "sorting": "A loose bunch lies beneath the rail.", "wrapped": "One bunch is wrapped in a paper sleeve."}),
  detail: choice("What binds the bunches?", {"twine": "Thin pale kitchen twine.", "red": "Muted red cotton ties.", "blue": "Blue cloth strips.", "raffia": "Wide raffia loops.", "wire": "Thin dark wire ties."}),
  support: choice("What supports the drying rail?", {"stand": "A freestanding two-post rack.", "arch": "A simple arch-shaped wood rack.", "frame": "A rectangular frame with broad feet.", "low": "A low countertop drying stand.", "double": "Two supported rails at different heights."}),
  extra: choice("What rests beneath the herbs?", {"tray": "A shallow catch tray.", "basket": "A small wicker gathering basket.", "shears": "A pair of small herb shears.", "cloth": "A folded drying cloth.", "none": "A clear counter."}),
  mark: choice("How are the bunches identified?", {"tags": "Small DILL, BAY and GARLIC tags.", "numbers": "Simple numbered paper tags.", "ribbon": "A striped ribbon along the rail.", "hooks": "Bright metal hanging hooks.", "plain": "Plain twine and wood."}),
  extent: score("How broad is the drying rack?", ["A few kitchen bunches", "A household drying rail", "A broad pantry rack"]),
  load: score("How many tied bundles hang?", ["Two bundles", "Four bundles", "Six bundles"]),
  closed: noul("Does one loose stem rest across the base?"),
};
export default defineThing({
  questions,
  build(a, context) {
    const s = new Sculpture(context), { random, mood } = context;
    const f = Object.keys(questions.form.options).indexOf(a.form), t = Object.keys(questions.state.options).indexOf(a.state), d = Object.keys(questions.detail.options).indexOf(a.detail), u = Object.keys(questions.support.options).indexOf(a.support), e = Object.keys(questions.extra.options).indexOf(a.extra), m = Object.keys(questions.mark.options).indexOf(a.mark);
    const wood = s.material('#a47c4e'), pale = s.material('#e0d2ac'), metal = s.material('#8f9995', { metalness: 0.7, roughness: 0.35 }), dark = s.material('#3d443c'), green = s.material('#667e50');
    const colors = ['#a64d39', '#497e70', '#d4af55', '#59778c', '#b47b8c'];

    const W=.55+a.extent*.45,H=u===3?.45:.75,n=t===2?1:2+Math.round(a.load*4),tie=s.material(['#d4c8a9','#aa6953','#658596','#bba16f','#4b5746'][d]);for(const x of [-W/2,W/2]){s.rod([x,0,0],[x,H,0],.018,wood);s.box([.12,.025,.3],[x,.013,0],wood);}s.rod([-W/2,H,0],[W/2,H,0],.02,wood);if(u===1)s.tube([[-W/2,H,0],[-W*.3,H+.13,0],[W*.3,H+.13,0],[W/2,H,0]],.016,wood);if(u===2)s.rod([-W/2,.1,0],[W/2,.1,0],.016,wood);if(u===4){s.rod([-W/2,H*.7,-.1],[W/2,H*.7,-.1],.015,wood);for(const x of [-W/2,W/2])s.rod([x,H*.7,0],[x,H*.7,-.1],.015,wood);}
    for(let i=0;i<n;i++){const x=(i-(n-1)/2)*W*.8/n,kind=f===4?i%4:f,y=H-.12;s.tube([[x,H+.01,-.01],[x+.015,H+.025,0],[x,y,0]],.003,tie);for(let j=0;j<(t===1?3:5);j++){const dx=(j-2)*.015,endY=y-.2-j%2*.05,z=(j%2-.5)*.035;s.rod([x,y,0],[x+dx,endY,z],.0025,kind===1?wood:green);if(kind===0){for(let k=0;k<5;k++){const ex=x+dx+Math.cos(k*1.257)*.04,ez=z+Math.sin(k*1.257)*.025;s.rod([x+dx,endY+.02,z],[ex,endY-.025,ez],.0015,green);s.ball([.008,.006,.008],[ex,endY-.025,ez],s.material('#aaa36b'),8);}}if(kind===1)s.ball([.026,.03,.024],[x+dx,endY,z],pale,14);if(kind===2){const pepper=s.ball([.012,.045,.012],[x+dx,endY,z],s.material('#a96045'),14);pepper.rotation.z=dx*3;}if(kind===3)for(let k=0;k<3;k++)s.ball([.025,.045,.004],[x+dx+(k%2-.5)*.03,endY+k*.035,z],green,12);}s.ring(.025,.003,[x,y-.02,0],tie).rotation.x=Math.PI/2;if(m<2)s.label(m===1?String(i+1):['DILL','GARLIC','PEPPER','BAY'][kind],.07,.03,[x,y-.07,.027]);if(t===4&&i===0)s.box([.09,.14,.07],[x,y-.12,0],pale);if(m===3)s.ring(.018,.004,[x,H-.005,0],metal);}
    if(m===2)s.rod([-W*.45,H+.018,.01],[W*.45,H+.018,.01],.006,tie);if(t===3||a.closed){s.rod([-.15,.006,.18],[.15,.006,.18],.002,green);for(let i=0;i<4;i++)s.ball([.025,.003,.015],[(i-1.5)*.06,.009,.18],green,10);}if(e===0)s.box([W,.018,.33],[0,.009,0],metal);if(e===1)s.lathe([[0,0],[.12,.015],[.16,.1],[.145,.1],[0,.02]],wood,[W*.7,0,0]);if(e===2){for(const x of [-.035,.035])s.ring(.025,.004,[x,.005,.17],metal).rotation.x=Math.PI/2;s.rod([-.02,.005,.19],[.035,.005,.3],.004,metal);s.rod([.02,.005,.19],[-.035,.005,.3],.004,metal);}if(e===3)s.box([.22,.015,.18],[W*.7,.008,0],pale);return s.finish();
  },
});
