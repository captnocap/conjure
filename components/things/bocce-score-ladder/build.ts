import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing, figure } from '@conjure/kit';
const questions = {
  form: choice("How is the scoreboard built?", {"ladder": "Two wooden vertical scoring ladders.", "board": "A broad chalkboard with sliding pegs.", "rail": "Two metal rails with coloured counters.", "flip": "A rack of hanging flip-number cards.", "posts": "A pair of striped scoring posts."}),
  state: choice("How does the match stand?", {"start": "Both sides are at zero.", "even": "The teams are tied halfway through.", "close": "One side leads by a single point.", "finish": "One team has reached the winning score.", "dispute": "One score is crossed out and corrected."}),
  detail: choice("What marks each point?", {"pegs": "Chunky cylindrical pegs.", "rings": "Sliding coloured rings.", "clips": "Small metal spring clips.", "flags": "Triangular team flags.", "blocks": "Square painted counters."}),
  support: choice("What supports the scoreboard?", {"feet": "Two long timber feet.", "tripod": "A folding three-legged stand.", "stakes": "Two posts set into a square ground block.", "wheels": "A small wheeled base.", "easel": "A wide rear easel leg."}),
  extra: choice("What is kept below the score?", {"chalk": "A small chalk shelf.", "bell": "A little brass match bell.", "brush": "A felt eraser.", "cup": "A cup for spare pegs.", "nothing": "The base is clear."}),
  mark: choice("Which teams are playing?", {"home": "HOME and AWAY.", "red": "RED and GREEN.", "north": "NORTH and SOUTH.", "friends": "FRIENDS and RIVALS.", "blank": "Blank name strips awaiting chalk."}),
  extent: score("How tall is the scoreboard?", ["A knee-high marker", "A chest-high board", "A tall club board"]),
  load: score("How many points does the board count?", ["Six points", "Nine points", "Twelve points"]),
  closed: noul("Is a small rain hood fitted over the top?"),
};
export default defineThing({
  questions,
  build(a, context) {
    const s = new Sculpture(context), { random, mood } = context;
    const f = Object.keys(questions.form.options).indexOf(a.form), t = Object.keys(questions.state.options).indexOf(a.state), d = Object.keys(questions.detail.options).indexOf(a.detail), u = Object.keys(questions.support.options).indexOf(a.support), e = Object.keys(questions.extra.options).indexOf(a.extra), m = Object.keys(questions.mark.options).indexOf(a.mark);
    const wood = s.material('#a47c4e'), pale = s.material('#e0d2ac'), metal = s.material('#8f9995', { metalness: 0.7, roughness: 0.35 }), dark = s.material('#3d443c'), green = s.material('#667e50');
    const colors = ['#a64d39', '#497e70', '#d4af55', '#59778c', '#b47b8c'];

    const h=.7+a.extent*.8,w=.58,n=6+Math.round(a.load*6),ink=s.material('#394f44');
    if(f===1)s.box([w,.6*h,.045],[0,.59*h,0],ink);
    for(const x of [-.19,.19]){s.box([f===4?.08:.035,h,.045],[x,h/2,0],f===2?metal:wood);for(let i=0;i<=n;i++){const y=.17+(h-.3)*i/n;if(f===0)s.box([.12,.012,.035],[x,y,0],wood);s.label(String(i),.05,.035,[x+(x<0?-.09:.09),y,.029]);}}
    const scores=t===0?[0,0]:t===1?[Math.floor(n/2),Math.floor(n/2)]:t===2?[Math.floor(n/2),Math.floor(n/2)+1]:t===3?[n,n-3]:[n-4,n-2];
    scores.forEach((v,i)=>{const x=i? .19:-.19,y=.17+(h-.3)*v/n,mat=s.material(i?'#4d8469':'#b25b48');if(d===0)s.cylinder(.035,.035,.075,[x,y,.06],mat,12).rotation.x=Math.PI/2;else if(d===1)s.ring(.05,.012,[x,y,.04],mat);else if(d===2)s.box([.045,.07,.025],[x,y,.04],metal);else if(d===3){s.rod([x,y,0],[x,y+.13,0],.006,wood);s.mesh(new THREE.ConeGeometry(.045,.09,3),mat,[x+.04,y+.1,0]).rotation.z=-Math.PI/2;}else s.box([.08,.06,.04],[x,y,.04],mat);});
    if(f===3)for(const x of [-.12,.12]){s.box([.19,.24,.018],[x,h*.65,.06],pale);s.label(String(scores[x>0?1:0]),.15,.19,[x,h*.65,.071]);}
    if(t===4){s.label('CORRECTED',.26,.05,[0,.13,.04]);s.rod([-.1,.095,.05],[.1,.105,.05],.004,ink);}
    if(u===0||u===2){for(const x of [-.19,.19])s.box([u===2?.19:.09,.07,.45],[x,.035,.03],wood);}
    if(u===1||u===4){for(const x of [-.27,.27])s.rod([x,0,.18],[x*.7,.48*h,0],.018,wood);s.rod([0,0,-.35],[0,.65*h,0],.018,wood);}
    if(u===3){s.box([.7,.04,.4],[0,.07,0],metal);for(const x of [-.27,.27])for(const z of [-.15,.15])s.cylinder(.05,.05,.025,[x,.05,z],dark,12).rotation.z=Math.PI/2;}
    const names=[['HOME','AWAY'],['RED','GREEN'],['NORTH','SOUTH'],['FRIENDS','RIVALS'],['','']][m];for(const [i,x]of[-.18,.18].entries())s.label(names[i],.3,.07,[x,h+.03,.03]);
    if(e<4){s.box([.4,.025,.15],[0,.11,.12],wood);if(e===0)for(let i=0;i<3;i++)s.rod([-.1+i*.08,.14,.1],[-.05+i*.08,.14,.1],.008,pale);if(e===1){s.lathe([[.07,0],[.045,.06],[.02,.08]],s.material('#bda05c'),[0,.13,.12]);s.ball([.018,.018,.018],[0,.23,.12],wood,10);}if(e===2)s.box([.12,.03,.06],[0,.15,.12],dark);if(e===3)s.lathe([[.04,0],[.06,.1],[.052,.1],[.035,.01]],wood,[0,.13,.12]);}
    if(a.closed)s.box([w+.12,.04,.24],[0,h+.12,0],green).rotation.x=-.12;
    return s.finish();
  },
});
