import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing, figure } from '@conjure/kit';
const questions = {
  form: choice("What shape is the frame?", {"square": "A square four-rail frame.", "long": "A long scarf frame.", "hoop": "A round embroidery-style hoop.", "double": "Two small frames joined on a stand.", "diamond": "A square frame turned on its point."}),
  state: choice("What stage is the cloth at?", {"wax": "Pale cloth with fresh wax lines.", "blue": "Blue cloth with pale revealed resist.", "partial": "Half the pattern is complete.", "dry": "Finished cloth stretched to dry.", "empty": "An empty frame with loose tie cords."}),
  detail: choice("What resist pattern fills the cloth?", {"waves": "Parallel undulating wave lines.", "stars": "A grid of small eight-point stars.", "leaves": "A central branch of leaves.", "checks": "A bold geometric checker grid.", "circles": "Concentric ring motifs."}),
  support: choice("What supports the frame?", {"easel": "A folding timber easel.", "feet": "Two broad floor feet.", "table": "A short tabletop rest.", "posts": "Two tall side posts.", "flat": "The frame lies flat on low blocks."}),
  extra: choice("What pattern tool lies below?", {"brush": "A fine wax brush.", "spout": "A small spouted wax pen.", "stencil": "A pierced metal stencil plate.", "bowl": "A small wax bowl.", "none": "No tool."}),
  mark: choice("How is the cloth attached?", {"laces": "Fine cotton lacing along every edge.", "clips": "Small brass clips.", "pins": "Dark pins through folded hems.", "loops": "Wide tied cloth loops.", "knots": "Thick corner knots only."}),
  extent: score("How broad is the stretched cloth?", ["A small sample frame", "A scarf panel", "A broad hanging panel"]),
  load: score("How dense is the pattern?", ["A few large motifs", "An even repeated pattern", "A dense field of small motifs"]),
  closed: noul("Is a small unfinished sample pinned to the stand?"),
};
export default defineThing({
  questions,
  build(a, context) {
    const s = new Sculpture(context), { random, mood } = context;
    const f = Object.keys(questions.form.options).indexOf(a.form), t = Object.keys(questions.state.options).indexOf(a.state), d = Object.keys(questions.detail.options).indexOf(a.detail), u = Object.keys(questions.support.options).indexOf(a.support), e = Object.keys(questions.extra.options).indexOf(a.extra), m = Object.keys(questions.mark.options).indexOf(a.mark);
    const wood = s.material('#a47c4e'), pale = s.material('#e0d2ac'), metal = s.material('#8f9995', { metalness: 0.7, roughness: 0.35 }), dark = s.material('#3d443c'), green = s.material('#667e50');
    const colors = ['#a64d39', '#497e70', '#d4af55', '#59778c', '#b47b8c'];

    const w=.45+a.extent*.55,h=f===1?w*.45:w,frame=new THREE.Group(),cloth=s.material(t===0?'#d7ccac':'#4e6d83',{side:THREE.DoubleSide}),ink=t===0?s.material('#bfa875'):pale;
    if(f===2){const ring=s.ring(w*.55,.018,[0,0,0],wood);frame.add(ring);if(t!==4)frame.add(s.mesh(new THREE.CircleGeometry(w*.5,40),cloth));}else{for(const x of [-w/2,w/2])frame.add(s.box([.035,h+.06,.04],[x,0,0],wood));for(const y of [-h/2,h/2])frame.add(s.box([w,.035,.04],[0,y,0],wood));if(t!==4)frame.add(s.box([w*.9,h*.9,.005],[0,0,.005],cloth));}
    const n=3+Math.round(a.load*5);if(t!==4){if(d===0)for(let j=0;j<n;j++){const pts:Array<[number,number,number]>=[];for(let i=0;i<12;i++)pts.push([(i/11-.5)*w*.8,(j/(n-1)-.5)*h*.75+Math.sin(i*.9)*.012,.012]);frame.add(s.tube(pts,.003,ink));}if(d===1)for(let j=0;j<n;j++)for(let i=0;i<3;i++){const x=(i-1)*w*.25,y=(j/(n-1)-.5)*h*.75;if(t===2&&i>0)continue;for(const ang of [0,Math.PI/4,Math.PI/2,Math.PI*.75])frame.add(s.rod([x-Math.cos(ang)*.025,y-Math.sin(ang)*.025,.012],[x+Math.cos(ang)*.025,y+Math.sin(ang)*.025,.012],.0025,ink));}if(d===2){frame.add(s.rod([0,-h*.4,.012],[0,h*.4,.012],.004,ink));for(let j=0;j<n;j++)for(const side of [-1,1])frame.add(s.ball([.06,.025,.003],[side*.055,(j/(n-1)-.5)*h*.7,.014],ink,10));}if(d===3)for(let i=0;i<n;i++)for(let j=0;j<n;j++)if((i+j)%2===0)frame.add(s.box([w*.8/n,h*.8/n,.003],[((i+.5)/n-.5)*w*.8,((j+.5)/n-.5)*h*.8,.012],ink));if(d===4)for(let i=1;i<=n;i++)frame.add(s.ring(Math.min(w,h)*.4*i/n,.003,[0,0,.013],ink));}
    if(f===2){for(let i=0;i<16;i++){const ang=i*Math.PI/8,rr=w*.52;frame.add(s.rod([Math.cos(ang)*w*.49,Math.sin(ang)*w*.49,.012],[Math.cos(ang)*w*.56,Math.sin(ang)*w*.56,0],m===3?.006:.003,m===1?metal:m===2?dark:pale));}}else for(let i=0;i<7;i++)for(const sign of [-1,1]){const x=(i/6-.5)*w*.85;if(m===0||m===3)frame.add(s.rod([x,sign*h*.45,.01],[x,sign*h*.52,0],m===3?.006:.002,pale));if(m===1||m===2)frame.add(s.box([.015,.035,.015],[x,sign*h*.47,.012],m===1?metal:dark));}if(m===4)for(const x of [-w*.45,w*.45])for(const y of [-h*.45,h*.45])frame.add(s.ball([.018,.018,.012],[x,y,.015],pale,10));
    const y=u===4?.08:h/2+.28;frame.position.y=y;frame.rotation.x=u===4?-Math.PI/2:u===0?-.15:0;if(f===4)frame.rotation.z=Math.PI/4;s.root.add(frame);if(u!==4)for(const x of [-w*.4,w*.4]){s.rod([x,0,.15],[x,y+h*.35,0],.02,wood);s.box([.08,.035,.42],[x,.018,0],wood);}else for(const x of [-w*.3,w*.3])s.box([.1,.08,h],[x,.04,0],wood);if(u===0)s.rod([0,0,-.35],[0,y,0],.02,wood);if(f===3){const mini=frame.clone();mini.scale.setScalar(.6);mini.position.x=w*.85;mini.position.y=y*.65;s.root.add(mini);for(const dx of [-w*.25,w*.25]){s.rod([mini.position.x+dx,0,.03],[mini.position.x+dx,mini.position.y,.03],.018,wood);s.box([.06,.025,.3],[mini.position.x+dx,.013,0],wood);}}
    if(e===0||e===1)s.rod([-.15,.015,.35],[.12,.015,.35],.005,e===0?wood:metal);if(e===2)s.box([.2,.006,.14],[0,.005,.35],metal);if(e===3)s.lathe([[.03,0],[.055,.05],[.05,.05],[.025,.01]],wood,[0,0,.35]);if(a.closed)s.box([.14,.2,.005],[w*.4,.22,.04],cloth);return s.finish();
  },
});
