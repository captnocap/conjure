import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing, figure } from '@conjure/kit';
const questions = {
  form: choice("How is the chair made?", {"canvas": "A canvas sling on a crossed timber frame.", "metal": "A metal folding chair with a padded seat.", "stripes": "A striped fabric deck chair.", "woven": "A woven strap chair on a tubular frame.", "director": "A tall-backed wooden directors chair."}),
  state: choice("What tells the spectator story?", {"ready": "An empty chair waiting beside the lane.", "occupied": "A folded jacket saves the seat.", "break": "A cup and a small snack have been left.", "packed": "The chair is folded for carrying.", "reserved": "A handwritten reserved card hangs on the back."}),
  detail: choice("What is the fabric like?", {"cream": "Plain cream canvas.", "green": "Muted green canvas.", "red": "Brick-red canvas.", "blue": "Blue and white stripes.", "checks": "A broad checked pattern."}),
  support: choice("What are the arm rests?", {"wood": "Broad wooden arms.", "tube": "Simple metal tubular arms.", "padded": "Soft padded arms.", "one": "One arm is missing after a repair.", "none": "No arm rests."}),
  extra: choice("What sits beside it?", {"bag": "A small spectator bag.", "shade": "A folded hand fan.", "paper": "A folded local newspaper.", "bottle": "A reusable water bottle.", "clear": "No belongings."}),
  mark: choice("What identifies the seat?", {"initials": "Painted ownership initials.", "club": "A CLUB REGULAR patch.", "number": "A small seat number.", "repair": "A square fabric repair patch.", "plain": "Unmarked fabric."}),
  extent: score("How high is the seat?", ["A low lawn chair", "A normal folding chair", "A tall sideline chair"]),
  load: score("How far does the back recline?", ["Almost upright", "Gently reclined", "A deeply relaxed deck chair"]),
  closed: noul("Is a small side cup holder attached?"),
};
export default defineThing({
  questions,
  build(a, context) {
    const s = new Sculpture(context), { random, mood } = context;
    const f = Object.keys(questions.form.options).indexOf(a.form), t = Object.keys(questions.state.options).indexOf(a.state), d = Object.keys(questions.detail.options).indexOf(a.detail), u = Object.keys(questions.support.options).indexOf(a.support), e = Object.keys(questions.extra.options).indexOf(a.extra), m = Object.keys(questions.mark.options).indexOf(a.mark);
    const wood = s.material('#a47c4e'), pale = s.material('#e0d2ac'), metal = s.material('#8f9995', { metalness: 0.7, roughness: 0.35 }), dark = s.material('#3d443c'), green = s.material('#667e50');
    const colors = ['#a64d39', '#497e70', '#d4af55', '#59778c', '#b47b8c'];

    const h=.32+a.extent*.22,w=.53,depth=.48,folded=t===3;const cloth=s.material(['#d4caab','#68816a','#aa6754','#6e8b9c','#aa9976'][d]);
    const frame=f===1||f===3?metal:wood,zfront=folded?.08:.23,zback=folded?-.08:-.23;
    for(const x of [-w/2,w/2]){s.rod([x,0,zfront],[x,h+.04,zback],.018,frame);s.rod([x,0,zback],[x,h+.04,zfront],.018,frame);s.rod([x,h,zback],[x,h+.6,zback-.08-a.load*.22],.019,frame);}
    s.box([w,.025,folded?.12:depth],[0,h,0],cloth);const back=s.box([w,.55,.025],[0,h+.3,zback-.05-a.load*.11],cloth);back.rotation.x=-.12-a.load*.28;
    for(const side of [-1,1])if(u!==4&&!(u===3&&side===1)){s.rod([side*w/2,h,.14],[side*w/2,h+.18,.14],.014,frame);s.box([u===1?.025:.065,u===2?.045:.025,.4],[side*w/2,h+.19,-.02],u===2?cloth:frame);}
    if(f===2||f===3||d===3||d===4)for(let i=0;i<7;i++){const stripe=s.box([.018,.53,.006],[-.23+i*.077,h+.3,zback-.025-a.load*.11],i%2?pale:cloth);stripe.rotation.x=back.rotation.x;}
    if(d===4)for(let j=0;j<6;j++)s.box([w,.02,.009],[0,h+.06+j*.08,zback-.012-a.load*.11],pale);
    if(t===1)s.drape({size:[.45,.45],at:[.05,h+.4,0],over:[{box:[w,.04,depth],at:[0,h,0]}],detail:12,rumple:.3},s.material('#786c5a'));
    if(t===2){s.cylinder(.045,.035,.09,[.12,h+.06,.1],pale,14);s.box([.12,.025,.1],[-.12,h+.025,.08],wood);}if(t===4)s.label('RESERVED',.35,.12,[0,h+.35,zback+.025]);
    if(e===0){s.ball([.15,.12,.08],[.48,.12,0],green,12);s.ring(.07,.01,[.48,.26,0],dark);}if(e===1)s.mesh(new THREE.ConeGeometry(.12,.015,12),pale,[.45,.02,.12]).rotation.x=.15;if(e===2)s.label('LOCAL NEWS',.28,.2,[.48,.008,.08]).rotation.x=-Math.PI/2;if(e===3){s.cylinder(.045,.045,.23,[.45,.115,.08],green,14);s.cylinder(.03,.03,.035,[.45,.248,.08],dark,12);}
    if(m<3)s.label(['A.G.','CLUB REGULAR','SEAT 4'][m],.24,.06,[0,h+.5,zback+.016-a.load*.16]);if(m===3)s.box([.14,.13,.008],[.1,h+.24,zback+.025-a.load*.1],pale);
    if(a.closed){s.ring(.055,.009,[w/2+.08,h+.18,.08],frame).rotation.x=Math.PI/2;s.rod([w/2,h+.16,.08],[w/2+.08,h+.16,.08],.009,frame);}
    return s.finish();
  },
});
