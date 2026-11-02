import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing, figure } from '@conjure/kit';
const questions = {
  form: choice("How are the nesting boxes arranged?", {"grid": "A square grid of open cubbies.", "tower": "A tall narrow stack.", "row": "A low horizontal bank.", "arched": "Round-topped nesting openings.", "stagger": "Two staggered tiers of boxes."}),
  state: choice("What is happening in the boxes?", {"ready": "Fresh straw waits in every bowl.", "eggs": "Two cream eggs lie in one bowl.", "brood": "A nesting pigeon shelters a bowl.", "clean": "Several bowls have been removed for cleaning.", "closed": "Some cubbies are closed for rest."}),
  detail: choice("What are the nest bowls made from?", {"clay": "Shallow terracotta bowls.", "fiber": "Dark woven nesting baskets.", "wood": "Low wooden nesting trays.", "paper": "Pressed paper nesting cups.", "plastic": "Green reusable nest bowls."}),
  support: choice("What supports the bank?", {"feet": "Four short square feet.", "wall": "A stout back board with hanging hooks.", "legs": "A high timber frame.", "shelf": "A long low shelf plinth.", "cart": "A low wheeled base."}),
  extra: choice("What is on the landing ledges?", {"grit": "A small grit pot.", "water": "A small water dish.", "feather": "A few loose white feathers.", "perch": "A round cross perch.", "clear": "Clear ledges."}),
  mark: choice("How are the cubbies labelled?", {"numbers": "Each box has a painted number.", "colours": "Alternating coloured door corners.", "names": "Short bird names on brass strips.", "rings": "Coloured leg-band rings above the openings.", "plain": "Plain timber fronts."}),
  extent: score("How broad is the nesting bank?", ["A small loft bank", "An ample breeding bank", "A long shared bank"]),
  load: score("How many nests are provided?", ["Four nests", "Six nests", "Nine nests"]),
  closed: noul("Is a sloping dust cover fitted above the boxes?"),
};
export default defineThing({
  questions,
  build(a, context) {
    const s = new Sculpture(context), { random, mood } = context;
    const f = Object.keys(questions.form.options).indexOf(a.form), t = Object.keys(questions.state.options).indexOf(a.state), d = Object.keys(questions.detail.options).indexOf(a.detail), u = Object.keys(questions.support.options).indexOf(a.support), e = Object.keys(questions.extra.options).indexOf(a.extra), m = Object.keys(questions.mark.options).indexOf(a.mark);
    const wood = s.material('#a47c4e'), pale = s.material('#e0d2ac'), metal = s.material('#8f9995', { metalness: 0.7, roughness: 0.35 }), dark = s.material('#3d443c'), green = s.material('#667e50');
    const colors = ['#a64d39', '#497e70', '#d4af55', '#59778c', '#b47b8c'];

    const n=4+Math.round(a.load*5),cols=f===1?2:f===2?n:3,rows=Math.ceil(n/cols),cw=.25+a.extent*.12,ch=.28,w=cols*cw,H=rows*ch,base=u===2?.45:u===0?.12:.05;const bowl=s.material(['#b98059','#8a7450','#ad8d61','#c9bc98','#6e8c61'][d]);
    s.box([w,.035,.3],[0,base,0],wood);s.box([w,H,.025],[0,base+H/2,-.15],wood);for(let i=0;i<n;i++){const col=i%cols,row=Math.floor(i/cols),x=(col-(cols-1)/2)*cw+(f===4&&row%2?cw*.12:0),y=base+row*ch;s.box([cw,.025,.33],[x,y,.01],wood);for(const dx of [-cw/2,cw/2])s.box([.018,ch,.3],[x+dx,y+ch/2,0],wood);s.box([cw,.025,.33],[x,y+ch,.01],wood);s.box([cw,.025,.12],[x,y-.01,.21],wood);
      if(f===3)s.tube([[x-cw*.45,y+ch*.45,.16],[x-cw*.3,y+ch*.87,.16],[x+cw*.3,y+ch*.87,.16],[x+cw*.45,y+ch*.45,.16]],.015,wood);
      if(t!==3||i%2){s.lathe([[.065,0],[.1,.04],[.09,.04],[.055,.008]],bowl,[x,y+.015,0]);for(let j=0;j<6;j++)s.rod([x+(random()-.5)*.13,y+.035,(random()-.5)*.12],[x+(random()-.5)*.13,y+.039,(random()-.5)*.12],.002,pale);}
      if(t===1&&i===1)for(const dx of [-.025,.025])s.ball([.018,.024,.018],[x+dx,y+.05,0],pale,14);if(t===2&&i===1){s.ball([.075,.055,.105],[x,y+.085,.01],dark,14);s.ball([.032,.038,.032],[x,y+.13,.075],metal,12);s.mesh(new THREE.ConeGeometry(.009,.028,6),pale,[x,y+.13,.11]).rotation.x=Math.PI/2;}
      if(t===4&&i%2===0)for(let j=0;j<5;j++)s.rod([x-cw*.35+j*cw*.175,y+.025,.16],[x-cw*.35+j*cw*.175,y+ch-.025,.16],.005,metal);
      if(m===0||m===2)s.label(m===0?String(i+1):['ASH','MOSS','BLUE'][i%3],cw*.4,.035,[x,y+ch-.02,.178]);if(m===1)s.box([.045,.045,.008],[x-cw*.36,y+ch*.8,.17],s.material(colors[i%5]));if(m===3)s.ring(.018,.004,[x,y+ch-.03,.18],s.material(colors[i%5]));
      if(e===0||e===1)s.lathe([[.02,0],[.03,.025],[.025,.025],[.015,.005]],e===0?wood:metal,[x,y+.015,.23]);if(e===2)s.ball([.012,.003,.04],[x,y+.016,.23],pale,8);if(e===3)s.rod([x-cw*.4,y+.05,.23],[x+cw*.4,y+.05,.23],.012,wood);
    }
    if(u===0||u===2)for(const x of [-w*.43,w*.43])for(const z of [-.11,.11])s.rod([x,0,z],[x,base,z],.025,wood);if(u===3)s.box([w+.15,.06,.4],[0,.03,.02],wood);if(u===4)for(const x of [-w*.43,w*.43])for(const z of [-.1,.1])s.cylinder(.05,.05,.025,[x,.05,z],dark,12).rotation.z=Math.PI/2;if(u===1)for(const x of [-w*.35,w*.35])s.ring(.035,.006,[x,base+H+.04,-.15],metal);if(a.closed)s.box([w+.12,.025,.4],[0,base+H+.04,0],green).rotation.x=.15;return s.finish();
  },
});
