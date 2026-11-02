import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing, figure } from '@conjure/kit';
const questions = {
  form: choice("What is the carrying case?", {"wood": "Slatted timber with fitted round nests.", "leather": "A low brown leather suitcase.", "wire": "An open metal basket carrier.", "canvas": "A green canvas bag on a rigid base.", "plastic": "A hard moulded cream case."}),
  state: choice("What stage of the game does the case show?", {"ready": "A full neatly packed set.", "playing": "Several balls remain while two lie beside it.", "lost": "A conspicuous empty nest where a ball is missing.", "spill": "Three balls have rolled onto the ground.", "cleaning": "Balls are set out beside the empty open case."}),
  detail: choice("How are the balls distinguished?", {"bands": "Two broad engraved bands circle every ball.", "dots": "Clusters of white dots mark each team.", "rings": "Three fine pale rings mark each ball.", "plain": "Plain red and green team colours.", "crosses": "A pale cross is painted on each ball."}),
  support: choice("How is the case carried?", {"strap": "One broad shoulder strap arches over the case.", "handle": "A short rigid carrying handle.", "ends": "Two small end handles.", "wheels": "A pair of small wheels and a pull handle.", "bare": "No handle; the shallow case is carried in both hands."}),
  extra: choice("What accompanies the balls?", {"jack": "A small cream jack in its own socket.", "tape": "A round measuring tape.", "cloth": "A folded cleaning cloth.", "score": "A small score card on a clipboard.", "all": "A jack, a measure and a folded cloth."}),
  mark: choice("What identifies the set?", {"club": "A brass COURT CLUB badge.", "family": "A cream FAMILY SET label.", "numbers": "Numbered ball pockets.", "stripe": "A broad green stripe along the case.", "none": "An unmarked case."}),
  extent: score("How large is the set?", ["A compact travel case", "A full club case", "An oversized public set"]),
  load: score("How many balls are present?", ["Four balls", "Six balls", "Eight balls"]),
  closed: noul("Is the protective lid folded closed over the case?"),
};
export default defineThing({
  questions,
  build(a, context) {
    const s = new Sculpture(context), { random, mood } = context;
    const f = Object.keys(questions.form.options).indexOf(a.form), t = Object.keys(questions.state.options).indexOf(a.state), d = Object.keys(questions.detail.options).indexOf(a.detail), u = Object.keys(questions.support.options).indexOf(a.support), e = Object.keys(questions.extra.options).indexOf(a.extra), m = Object.keys(questions.mark.options).indexOf(a.mark);
    const wood = s.material('#a47c4e'), pale = s.material('#e0d2ac'), metal = s.material('#8f9995', { metalness: 0.7, roughness: 0.35 }), dark = s.material('#3d443c'), green = s.material('#667e50');
    const colors = ['#a64d39', '#497e70', '#d4af55', '#59778c', '#b47b8c'];

    const w = 0.52 + a.extent * 0.3, depth = 0.34, body = s.material(['#8b6643','#76513b','#92988f','#6b7e62','#d1ccb6'][f]);
    s.box([w,0.04,depth],[0,0.02,0],body);
    if(f===3){const bag=s.lathe([[.13,0],[.18,.05],[.18,.17],[.165,.17],[.165,.05],[.13,.015]],body,[0,.02,0]);bag.scale.x=w/.36;}
    else for(const z of [-depth/2,depth/2]){if(f===0)for(const y of [.07,.14])s.box([w,.045,.018],[0,y,z],body);else if(f===2){for(const y of [.05,.17])s.rod([-w/2,y,z],[w/2,y,z],.006,metal);for(let i=0;i<7;i++)s.rod([-w/2+i*w/6,.05,z],[-w/2+i*w/6,.17,z],.005,metal);}else s.box([w,.14,.018],[0,.1,z],body);}
    if(f!==3)for(const x of [-w/2,w/2])s.box([.018,.14,depth],[x,.1,0],body);
    if(f===1)for(const x of [-w*.45,w*.45])for(const z of [-depth/2,depth/2])s.ball([.013,.013,.006],[x,.12,z],metal,10);
    if(f===4)for(const x of [-w*.35,w*.35])s.box([.018,.13,.025],[x,.1,depth/2],body);
    const n=Math.round(4+a.load*4), balls=t===4?0:t===2?n-1:t===1?n-2:t===3?n-3:n;
    const r=0.055+a.extent*0.012;
    const ball=(x:number,y:number,z:number,i:number)=>{const mat=s.material(i%2?'#548064':'#a45642');s.ball([r,r,r],[x,y,z],mat,16);if(d===0||d===2)for(let k=0;k<(d===0?2:3);k++)s.ring(r*0.92,0.0025,[x,y+(k-1)*0.018,z],pale).rotation.x=Math.PI/2;if(d===1)for(let k=0;k<3;k++)s.ball([0.005,0.005,0.002],[x+(k-1)*0.012,y,z+r],pale,8);if(d===4){s.box([r*1.1,0.009,0.003],[x,y,z+r],pale);s.box([0.009,r*1.1,0.003],[x,y,z+r],pale);}};
    for(let i=0;i<8;i++){const x=((i%4)-1.5)*w/4,z=(Math.floor(i/4)-0.5)*0.15;s.ring(r*0.94,0.007,[x,0.056,z],dark).rotation.x=Math.PI/2;if(i<balls&&!a.closed)ball(x,0.07+r,z,i);if(m===2)s.label(String(i+1),0.035,0.025,[x,0.068,z+0.07]).rotation.x=-Math.PI/2;}
    if(t===1||t===3||t===4)for(let i=0;i<(t===4?n:t===3?3:2);i++)ball((i-1.5)*r*2.2,r,depth/2+0.12+(i%2)*0.1,i);
    const lid=s.box([w+0.02,0.018,depth+0.015],[0,a.closed?.19:.18+(depth+.015)/2*Math.sin(.9),a.closed?0:-depth/2-(depth+.015)/2*Math.cos(.9)],body);if(!a.closed)lid.rotation.x=.9;
    if(u===0)s.tube([[-w/2,0.13,0],[-w*.35,0.4,0],[w*.35,0.4,0],[w/2,0.13,0]],0.013,body);
    if(u===1)s.tube([[-.1,.18,0],[-.1,.29,0],[.1,.29,0],[.1,.18,0]],.014,dark);
    if(u===2)for(const x of [-w/2,w/2])s.ring(.055,.01,[x,.12,0],dark).rotation.y=Math.PI/2;
    if(u===3){for(const x of [-w*.35,w*.35])s.cylinder(.045,.045,.025,[x,.045,-depth/2],dark,12).rotation.z=Math.PI/2;s.tube([[-w*.3,.1,-depth/2],[-w*.3,.45,-depth/2],[w*.3,.45,-depth/2],[w*.3,.1,-depth/2]],.009,metal);}
    if(e===0||e===4)s.ball([.025,.025,.025],[w/2+.06,.025,0],pale,12);
    if(e===1||e===4)s.cylinder(.044,.044,.02,[w/2+.08,.013,.11],metal,16);
    if(e===2||e===4)s.box([.16,.025,.13],[w/2+.12,.013,-.1],pale);
    if(e===3){s.box([.15,.015,.2],[w/2+.12,.008,.04],wood);s.label('0 : 0',.12,.07,[w/2+.12,.018,.04]).rotation.x=-Math.PI/2;}
    if(m===0||m===1)s.label(m===0?'COURT CLUB':'FAMILY SET',w*.62,.06,[0,.11,depth/2+.012]);
    if(m===3)s.box([w,.025,.006],[0,.12,depth/2+.012],green);
    return s.finish();
  },
});
