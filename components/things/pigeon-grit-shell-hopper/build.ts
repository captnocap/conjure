import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing, figure } from '@conjure/kit';
const questions = {
  form: choice("What shape is the feeder?", {"bin": "A tall rectangular gravity bin.", "cylinder": "A round gravity feeder.", "three": "Three divided mineral compartments.", "wall": "A shallow wall-mounted hopper.", "roofed": "A low trough under a pitched shelter."}),
  state: choice("What is its state?", {"full": "Fresh grit reaches the feeding lip.", "used": "One compartment is nearly empty.", "refill": "The lid is open for refilling.", "spill": "A little grit has spilled beside it.", "clean": "Clean empty compartments."}),
  detail: choice("What mineral mix is supplied?", {"shell": "Pale crushed oyster shell.", "red": "Red mineral grit.", "flint": "Dark flint grit.", "mixed": "A speckled shell-and-grit mix.", "chalk": "White mineral granules."}),
  support: choice("How is it fixed in place?", {"feet": "Four short wooden feet.", "wall": "A broad wall bracket.", "base": "A heavy stone base.", "stand": "A short raised stand.", "hook": "Two hanging hooks and a rear plate."}),
  extra: choice("What protects the feeding lip?", {"bars": "A row of wire guard bars.", "rail": "A round timber rail.", "hood": "A low metal rain hood.", "mesh": "A half-height mesh screen.", "open": "An unguarded feeding lip."}),
  mark: choice("How is the mix labelled?", {"grit": "GRIT on a cream label.", "shell": "SHELL on a pale blue label.", "minerals": "MINERALS on a brass plate.", "icons": "Three simple coloured mineral dots.", "plain": "No label."}),
  extent: score("How wide is the hopper?", ["A small pair feeder", "A loft feeder", "A wide flock feeder"]),
  load: score("How much grit is stocked?", ["A shallow reserve", "A half-full reserve", "A full reserve"]),
  closed: noul("Is a small refill scoop attached by a short cord?"),
};
export default defineThing({
  questions,
  build(a, context) {
    const s = new Sculpture(context), { random, mood } = context;
    const f = Object.keys(questions.form.options).indexOf(a.form), t = Object.keys(questions.state.options).indexOf(a.state), d = Object.keys(questions.detail.options).indexOf(a.detail), u = Object.keys(questions.support.options).indexOf(a.support), e = Object.keys(questions.extra.options).indexOf(a.extra), m = Object.keys(questions.mark.options).indexOf(a.mark);
    const wood = s.material('#a47c4e'), pale = s.material('#e0d2ac'), metal = s.material('#8f9995', { metalness: 0.7, roughness: 0.35 }), dark = s.material('#3d443c'), green = s.material('#667e50');
    const colors = ['#a64d39', '#497e70', '#d4af55', '#59778c', '#b47b8c'];

    const w=.25+a.extent*.25,h=f===4?.2:.45,base=u===3?.25:.04,paint=f===1?metal:wood; if(f===1)s.lathe([[.1,0],[.13,h],[.12,h],[.085,.02]],paint,[0,base,0]);else{s.box([w,.025,.2],[0,base,0],paint);s.box([w,h,.025],[0,base+h/2,-.1],paint);for(const x of [-w/2,w/2])s.box([.025,h,.25],[x,base+h/2,.015],paint);s.box([w,h*.6,.025],[0,base+h*.65,.08],paint);}
    s.box([w+.1,.02,.16],[0,base,.17],paint);s.box([w+.1,.06,.018],[0,base+.03,.25],paint);if(f===2)for(const x of [-w/6,w/6])s.box([.015,h,.32],[x,base+h/2,.06],paint);
    const grit=s.material(['#d6ccb2','#ab7555','#78796c','#a59b80','#dfdcc9'][d]);if(t!==4)for(let i=0;i<12+Math.round(a.load*22);i++)s.ball([.009,.006,.008],[(random()-.5)*w*.85,base+.025+random()*.025,.12+random()*.1],i%4===0?pale:grit,6);
    const lid=s.box([w+.06,.02,.27],[0,base+h+(t===2?.07:.01),t===2?-.18:0],green);lid.rotation.x=t===2?.6:0;if(f===4){for(const x of [-w/2,w/2])s.rod([x,base,0],[x,base+h+.15,0],.015,wood);lid.position.y=base+h+.15;lid.rotation.x=.15;}
    if(u===0||u===3)for(const x of [-w*.4,w*.4])for(const z of [-.07,.16])s.rod([x,0,z],[x,base,z],.018,wood);if(u===1||u===4)s.box([w+.1,h+.15,.025],[0,base+h/2,-.13],wood);if(u===2)s.box([w+.15,.04,.4],[0,.02,.05],dark);if(u===4)for(const x of [-w*.3,w*.3])s.ring(.025,.005,[x,base+h+.04,-.13],metal);
    if(e===0||e===3)for(let i=0;i<7;i++)s.rod([-w/2+i*w/6,base+.02,.24],[-w/2+i*w/6,base+.12,.13],.003,metal);if(e===1)s.rod([-w/2,base+.1,.23],[w/2,base+.1,.23],.012,wood);if(e===2)s.box([w+.05,.015,.12],[0,base+.14,.2],metal).rotation.x=.2;
    if(m<3)s.label(['GRIT','SHELL','MINERALS'][m],w*.7,.06,[0,base+h*.6,.097]);if(m===3)for(let i=0;i<3;i++)s.ball([.018,.018,.003],[(i-1)*.05,base+h*.6,.1],s.material(colors[i]),10);if(t===3)for(let i=0;i<8;i++)s.ball([.01,.006,.008],[(random()-.5)*w,.006,.32+random()*.1],grit,6);if(a.closed){s.tube([[w/2,h*.7,0],[w/2+.12,.16,0],[w/2+.12,.04,0]],.003,pale);s.ball([.035,.01,.05],[w/2+.12,.015,.02],metal,12);}return s.finish();
  },
});
