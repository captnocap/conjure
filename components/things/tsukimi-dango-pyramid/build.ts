import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing, figure } from '@conjure/kit';
const questions = {
  form: choice("How are the dango arranged?", {"pyramid": "A square-based pyramid of white dumplings.", "triangle": "A triangular mound.", "rows": "Neat rows on a shallow tray.", "tier": "Two small tiered offerings.", "single": "A modest small central mound."}),
  state: choice("What moment does the offering show?", {"fresh": "Freshly arranged for the evening.", "shared": "A few dumplings have been taken.", "pair": "Two small portions are set aside to share.", "wrapped": "A corner of paper loosely covers the offering.", "late": "Only a small final portion remains."}),
  detail: choice("What accompanies the white dumplings?", {"plain": "Plain white rice dumplings.", "yellow": "One golden moon-coloured dumpling at the top.", "pink": "A few pale pink dumplings among the white.", "green": "A few muted green dumplings.", "mixed": "A gentle mix of white, pink and green."}),
  support: choice("What supports the offering?", {"sanbo": "A small square wooden offering stand.", "plate": "A round white ceramic plate.", "tray": "A shallow dark lacquer tray.", "leaf": "A broad green leaf on a wood board.", "basket": "A low woven bamboo basket."}),
  extra: choice("What is set beside the dango?", {"tea": "A small tea cup.", "pick": "A slender bamboo eating pick.", "flower": "A single autumn flower.", "saucer": "A little empty sharing saucer.", "none": "Only the offering."}),
  mark: choice("How is the paper folded beneath it?", {"square": "A clean square paper liner.", "points": "Four sharp folded paper corners.", "red": "A white paper liner with a red edge.", "crease": "A simple folded strip.", "bare": "No paper liner."}),
  extent: score("How broad is the offering?", ["A small personal offering", "A household moon offering", "A generous shared offering"]),
  load: score("How many dumplings are offered?", ["A small three-level mound", "A traditional generous mound", "A broad four-level mound"]),
  closed: noul("Is a small folded fan laid beside the tray?"),
};
export default defineThing({
  questions,
  build(a, context) {
    const s = new Sculpture(context), { random, mood } = context;
    const f = Object.keys(questions.form.options).indexOf(a.form), t = Object.keys(questions.state.options).indexOf(a.state), d = Object.keys(questions.detail.options).indexOf(a.detail), u = Object.keys(questions.support.options).indexOf(a.support), e = Object.keys(questions.extra.options).indexOf(a.extra), m = Object.keys(questions.mark.options).indexOf(a.mark);
    const wood = s.material('#a47c4e'), pale = s.material('#e0d2ac'), metal = s.material('#8f9995', { metalness: 0.7, roughness: 0.35 }), dark = s.material('#3d443c'), green = s.material('#667e50');
    const colors = ['#a64d39', '#497e70', '#d4af55', '#59778c', '#b47b8c'];

    const r=.028+a.extent*.018,base=u===0?.16:.025,w=r*(8+a.load*2),dango=s.material('#dedcc9');if(u===0){s.box([w,.025,w],[0,base,0],wood);s.box([w*.65,base-.02,w*.65],[0,(base-.02)/2,0],wood);s.ball([w*.13,w*.11,.004],[0,base*.55,w*.33],dark,16);}else if(u===1||u===4)s.lathe([[0,0],[w*.55,.015],[w*.57,.035],[w*.52,.035],[0,.02]],u===1?pale:wood);else s.box([w,.025,w*.8],[0,.013,0],u===2?dark:wood);
    const top=base+.02;if(m!==4)s.box([w*.85,.002,w*.85],[0,top,0],pale);if(m===2)for(const z of [-w*.43,w*.43])s.box([w*.86,.003,.012],[0,top+.002,z],s.material('#a86350'));if(m===1)for(const x of [-w*.45,w*.45])for(const z of [-w*.45,w*.45])s.mesh(new THREE.ConeGeometry(.03,.002,3),pale,[x,top,z]);if(u===3)s.ball([w*.48,.004,w*.36],[0,top,0],green,20);
    const levels=t===4?1:f===4?2:3+Math.round(a.load),rows=f===2?1:f===3?Math.min(2,levels):levels;for(let copy=0;copy<(f===3?2:1);copy++)for(let layer=0;layer<rows;layer++){const n=f===2?3+Math.round(a.load):f===3?2-layer:levels-layer;for(let i=0;i<n;i++){const nz=f===1?n-i:f===2?2:n;for(let j=0;j<nz;j++){if(t===1&&layer===0&&i===0&&j<2)continue;const mat=d===1&&layer===rows-1?s.material('#ccb467'):d===2&&i%3===0?s.material('#cbb5b3'):d===3&&j%3===0?green:d===4?(i+j)%3===0?green:(i+j)%3===1?s.material('#cbb5b3'):dango:dango;s.ball([r,r,r],[(i-(n-1)/2)*r*1.9+(f===3?(copy-.5)*r*5:0),top+r+layer*r*1.6,(j-(nz-1)/2)*r*1.9],mat,20);}}}

    if(t===2)for(const x of [-w*.7,w*.7]){s.cylinder(r*1.7,r*1.7,.006,[x,.003,0],pale,20);s.ball([r,r,r],[x,r+.006,0],dango,20);}if(t===3)s.drape({size:[w*.6,w*.65],at:[w*.2,top+rows*r*2,0],over:[{ball:rows*r*.7,at:[0,top+rows*r*.6,0]}],floor:top,detail:14},pale);
    if(e===0)s.lathe([[.025,0],[.04,.06],[.035,.06],[.02,.01]],green,[w*.7,0,.1]);if(e===1)s.rod([-w*.3,.005,w*.65],[w*.3,.005,w*.65],.0025,wood);if(e===2){s.rod([w*.6,.004,-.1],[w*.6,.004,.1],.002,green);for(let i=0;i<5;i++)s.ball([.015,.003,.009],[w*.6+Math.cos(i*1.257)*.012,.006,.1+Math.sin(i*1.257)*.012],s.material('#b49569'),10);}if(e===3)s.cylinder(.065,.065,.008,[w*.7,.004,0],pale,24);if(a.closed){s.box([.13,.01,.03],[-w*.7,.005,0],wood);for(let i=0;i<6;i++)s.rod([-w*.75,.012,0],[-w*.5,.012,(i-2.5)*.01],.0015,pale);}return s.finish();
  },
});
