import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing, figure } from '@conjure/kit';
const questions = {
  form: choice("What collection system is used?", {"bucket": "A galvanized hanging sap bucket.", "wood": "A small wooden sap pail.", "bag": "A clear collection bag in a wire frame.", "tube": "A blue sap tube leading to a low can.", "jug": "A translucent plastic collecting jug."}),
  state: choice("What is happening at the tap?", {"flow": "A few drops of sap fall from the spile.", "full": "The bucket is full and ready to empty.", "empty": "An empty bucket hangs after the collection round.", "frozen": "A thin ice layer covers the sap.", "closed": "The tap is capped after the season."}),
  detail: choice("What does the maple bark look like?", {"grey": "Deeply furrowed grey bark.", "brown": "Warm brown rough bark.", "moss": "Moss on one side of the trunk.", "scar": "An old healed tapping scar.", "young": "A smooth young maple trunk."}),
  support: choice("How is the trunk rooted?", {"snow": "A low island of thawing snow.", "leaves": "Brown leaf litter and exposed roots.", "rock": "A stone-studded forest floor.", "grass": "A patch of early spring grass.", "bare": "Bare damp earth."}),
  extra: choice("What rests near the tree?", {"pail": "A spare empty pail.", "auger": "A hand auger for tapping.", "lid": "A spare metal bucket lid.", "boots": "A pair of muddy spare boots.", "none": "No loose equipment."}),
  mark: choice("How is the tapped tree marked?", {"tag": "A numbered aluminium tree tag.", "ribbon": "A red survey ribbon.", "paint": "A small blue paint mark.", "name": "A handwritten family-tree sign.", "plain": "No marking."}),
  extent: score("How thick is the maple trunk?", ["A slim young maple", "A mature tapping tree", "A broad old maple"]),
  load: score("How much sap has collected?", ["A few centimetres", "Half a bucket", "Nearly full"]),
  closed: noul("Does a hinged rain lid shelter the bucket?"),
};
export default defineThing({
  questions,
  build(a, context) {
    const s = new Sculpture(context), { random, mood } = context;
    const f = Object.keys(questions.form.options).indexOf(a.form), t = Object.keys(questions.state.options).indexOf(a.state), d = Object.keys(questions.detail.options).indexOf(a.detail), u = Object.keys(questions.support.options).indexOf(a.support), e = Object.keys(questions.extra.options).indexOf(a.extra), m = Object.keys(questions.mark.options).indexOf(a.mark);
    const wood = s.material('#a47c4e'), pale = s.material('#e0d2ac'), metal = s.material('#8f9995', { metalness: 0.7, roughness: 0.35 }), dark = s.material('#3d443c'), green = s.material('#667e50');
    const colors = ['#a64d39', '#497e70', '#d4af55', '#59778c', '#b47b8c'];

    const tr=.16+a.extent*.2,H=1.9,bark=s.material(['#827e6c','#8c7559','#7b8064','#8e7c62','#aaa18b'][d]);s.cylinder(tr*.75,tr,H,[0,H/2,0],bark,14);for(let i=0;i<12;i++){const ang=i*Math.PI/6;s.tube([[Math.cos(ang)*tr,0,Math.sin(ang)*tr],[Math.cos(ang)*tr*.9,H*.5,Math.sin(ang)*tr*.9],[Math.cos(ang)*tr*.75,H,Math.sin(ang)*tr*.75]],d===4?.002:.008,dark);}for(let i=0;i<5;i++){const ang=i*Math.PI*2/5;s.rod([0,.2,0],[Math.cos(ang)*tr*2.5,.02,Math.sin(ang)*tr*2.5],.04,bark,.015);}
    const by=.62,r=.14,z=tr+.16,mat=f===1?wood:f===4?s.material('#c6d2c4',{transparent:true,opacity:.65,depthWrite:false}):metal;if(f<2||f===4)s.lathe([[r*.7,0],[r,.3],[r-.012,.3],[r*.65,.015]],mat,[0,by,z]);if(f===2){s.ball([.15,.22,.1],[0,by+.12,z],s.material('#b5c8bd',{transparent:true,opacity:.55,depthWrite:false}),16);s.ring(.15,.008,[0,by+.3,z],metal).rotation.x=Math.PI/2;}if(f===3){s.lathe([[.12,0],[.16,.35],[.14,.35],[.1,.02]],metal,[tr+.3,0,.25]);s.tube([[0,.99,tr],[0,.9,tr+.12],[tr+.3,.35,.25]],.009,s.material('#6595ab'));}
    s.rod([0,.99,tr*.8],[0,.96,tr+.16],.015,metal);if(f<3||f===4)s.tube([[-r,by+.27,z],[0,.98,tr+.14],[r,by+.27,z]],.005,metal);
    const fill=t===2?.03:t===1?.26:.03+a.load*.23;if(f<2||f===4)s.cylinder(r*.83,r*.65,fill,[0,by+fill/2+.02,z],s.material(t===3?'#c6d6ce':'#b9c6b5',{transparent:true,opacity:.7,depthWrite:false}),24);if(t===0)for(let i=0;i<3;i++)s.ball([.003,.007,.003],[0,.94-i*.06,tr+.16],pale,8);if(t===4)s.cylinder(.02,.02,.04,[0,.99,tr+.02],wood,12).rotation.x=Math.PI/2;
    if(a.closed&&f!==3)s.box([r*2.2,.016,.3],[0,by+.32,z],metal).rotation.x=-.18;if(d===2)for(let i=0;i<7;i++)s.ball([.05,.15,.012],[-tr*.6,.2+i*.2,tr*.65],green,10);if(d===3)s.ball([.04,.07,.012],[tr*.2,.45,tr*.95],dark,10);
    const ground=s.material(['#e1e3d7','#a58d68','#9c9d88','#87976a','#9d8b6e'][u]);s.cylinder(tr*2.6,tr*2.8,.035,[0,.018,0],ground,24);if(u===2)for(let i=0;i<6;i++)s.ball([.07,.04,.05],[(random()-.5)*tr*4,.04,(random()-.5)*tr*4],pale,10);
    if(e===0)s.lathe([[.08,0],[.12,.22],[.11,.22],[.07,.015]],metal,[tr+.3,0,-.15]);if(e===1){s.rod([tr+.2,0,-.2],[tr+.2,.65,-.2],.012,metal);s.rod([tr+.05,.65,-.2],[tr+.35,.65,-.2],.02,wood);}if(e===2)s.cylinder(.15,.15,.008,[tr+.25,.008,-.15],metal,24);if(e===3)for(const x of [tr+.2,tr+.32]){s.box([.09,.18,.08],[x,.09,-.2],dark);s.ball([.045,.03,.08],[x,.03,-.15],dark,12);}if(m===0||m===3)s.label(m===0?'TREE 12':'FAMILY MAPLE',tr*1.2,.07,[0,1.3,tr*.88]);if(m===1)s.ring(tr*.87,.012,[0,1.35,0],s.material('#ad6650')).rotation.x=Math.PI/2;if(m===2)s.ball([.04,.06,.004],[0,1.4,tr*.85],s.material('#628ca0'),12);return s.finish();
  },
});
