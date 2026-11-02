import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing, figure } from '@conjure/kit';
const questions = {
  form: choice("What sled is used?", {"runner": "A timber sled on curved wooden runners.", "steel": "A steel-runner utility sled.", "toboggan": "A broad curved wooden toboggan.", "crate": "A crate body mounted on narrow runners.", "double": "A long two-tank hauling sled."}),
  state: choice("What stage is the collection round at?", {"loaded": "A full lidded tank ready for hauling.", "fill": "A pail and funnel stand at the open hatch.", "trail": "A rope is stretched forward for pulling.", "empty": "The tank is empty after delivery.", "parked": "The pull rope is coiled on the deck."}),
  detail: choice("What tank is carried?", {"milk": "A tall lidded dairy can.", "barrel": "A short wooden barrel.", "steel": "A low rectangular stainless tank.", "plastic": "A translucent rectangular sap tote.", "pails": "Three separate lidded sap pails."}),
  support: choice("What pulls the sled?", {"rope": "A doubled hemp pull rope.", "bar": "A rigid wooden tow bar.", "chain": "A short linked metal tow chain.", "handle": "A broad U-shaped push handle.", "none": "No attached pull gear."}),
  extra: choice("What spare tool is on the deck?", {"bucket": "An empty spare pail.", "funnel": "A broad metal filling funnel.", "ladle": "A long dipper.", "cloth": "A folded wiping cloth.", "none": "Only the tank."}),
  mark: choice("What marks the load?", {"sap": "SAP ONLY on a side plate.", "family": "A FAMILY SUGAR BUSH sign.", "number": "A large sled number.", "stripe": "A broad blue tank band.", "plain": "No marking."}),
  extent: score("How long is the sled?", ["A compact hand sled", "A family collection sled", "A long trail sled"]),
  load: score("How much spare carrying space remains?", ["A crowded deck", "A useful rear space", "A broad open deck"]),
  closed: noul("Is a canvas cover tied over the load?"),
};
export default defineThing({
  questions,
  build(a, context) {
    const s = new Sculpture(context), { random, mood } = context;
    const f = Object.keys(questions.form.options).indexOf(a.form), t = Object.keys(questions.state.options).indexOf(a.state), d = Object.keys(questions.detail.options).indexOf(a.detail), u = Object.keys(questions.support.options).indexOf(a.support), e = Object.keys(questions.extra.options).indexOf(a.extra), m = Object.keys(questions.mark.options).indexOf(a.mark);
    const wood = s.material('#a47c4e'), pale = s.material('#e0d2ac'), metal = s.material('#8f9995', { metalness: 0.7, roughness: 0.35 }), dark = s.material('#3d443c'), green = s.material('#667e50');
    const colors = ['#a64d39', '#497e70', '#d4af55', '#59778c', '#b47b8c'];

    const L=.85+a.extent*.8,w=.55,h=.16;for(const x of [-w*.43,w*.43])s.tube([[x,.04,-L/2],[x,.04,L*.3],[x,.08,L*.48],[x,.22,L*.58]],.025,f===1?metal:wood);for(let i=0;i<8;i++)s.box([w,.035,L/10],[0,h,-L/2+(i+.5)*L/8],wood);for(const z of [-L*.3,L*.3])s.box([w,.09,.05],[0,.095,z],wood);if(f===3)for(const x of [-w/2,w/2])s.box([.025,.2,L],[x,.27,0],wood);
    const z=-L*.12,th=.45,glass=s.material('#c2d1bf',{transparent:true,opacity:.65,depthWrite:false});if(d===0){s.lathe([[.14,0],[.18,.08],[.18,.36],[.11,.4],[.11,.45]],metal,[0,h+.02,z]);s.cylinder(.13,.13,.025,[0,h+.48,z],metal,20);}if(d===1)s.lathe([[.15,0],[.22,.22],[.16,.44]],wood,[0,h+.02,z]);if(d===2||d===3)s.box([w*.75,th,L*(.4+(1-a.load)*.15)],[0,h+.02+th/2,z],d===2?metal:glass);if(d===4)for(let i=0;i<3;i++){s.lathe([[.08,0],[.12,.28],[.11,.28],[.07,.015]],metal,[(i%2-.5)*.25,h+.02,z+Math.floor(i/2)*.3]);s.cylinder(.125,.125,.012,[(i%2-.5)*.25,h+.3,z+Math.floor(i/2)*.3],metal,20);}if(f===4)s.cylinder(.15,.15,.36,[0,h+.2,L*.25],metal,24);
    if(t===1){s.lathe([[.025,0],[.025,.07],[.12,.2]],metal,[0,h+th+.05,z]);s.lathe([[.07,0],[.11,.22],[.1,.22],[.06,.01]],metal,[w*.65,0,z]);}if(t===3)s.cylinder(.11,.11,.008,[w*.65,.005,0],metal,20);
    if(u===0){if(t===4)s.tube([[-.12,h,L*.2],[.12,h,L*.3],[.13,h,L*.45],[-.12,h,L*.45],[-.12,h,L*.2]],.007,pale);else s.tube([[-w*.4,h,L*.4],[-w*.25,.06,L*.9],[w*.25,.06,L*.9],[w*.4,h,L*.4]],.007,pale);}if(u===1||u===2)s.rod([0,h,L*.4],[0,.06,L],u===1?.022:.008,u===1?wood:metal);if(u===3)s.tube([[-w/2,h,-L*.4],[-w/2,.8,-L*.55],[w/2,.8,-L*.55],[w/2,h,-L*.4]],.018,wood);
    if(e===0)s.lathe([[.07,0],[.11,.2],[.1,.2],[.06,.015]],metal,[0,h+.02,L*.32]);if(e===1)s.lathe([[.015,0],[.015,.03],[.08,.1]],metal,[w*.33,h+.02,L*.3]);if(e===2){s.rod([-w*.35,h+.03,-L*.35],[-w*.35,h+.03,L*.35],.008,wood);s.ball([.04,.02,.04],[-w*.35,h+.04,L*.35],metal,12);}if(e===3)s.box([.2,.02,.18],[0,h+.03,L*.3],pale);if(m<3)s.label(['SAP ONLY','FAMILY SUGAR BUSH','SLED 03'][m],w*.7,.07,[0,h+.3,z+.2]);if(m===3)s.box([w*.76,.07,.008],[0,h+.35,z+.2],s.material('#648d9c'));if(a.closed)s.drape({size:[w*.95,L*.65],at:[0,h+.65,z],over:[{box:[w*.75,.45,L*.5],at:[0,h+.25,z]}],floor:h+.02,detail:14},pale);return s.finish();
  },
});
