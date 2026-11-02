import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing, figure } from '@conjure/kit';
const questions = {
  form: choice("How are the hoops arranged?", {"six": "A six-hoop rectangular course.", "diamond": "A diamond of four hoops.", "practice": "Two hoops in a straight practice line.", "cluster": "Six hoops packed in two close rows.", "single": "One playing hoop with two spare hoops laid flat."}),
  state: choice("What is happening on the course?", {"ready": "The balls wait near the first hoop.", "through": "A red ball is passing beneath a hoop.", "finish": "A ball rests beside the centre peg.", "empty": "The course waits before players arrive.", "mark": "Small setting-out stakes show the intended route."}),
  detail: choice("What finish do the hoops have?", {"white": "White painted steel.", "black": "Dark iron hoops.", "silver": "Plain galvanized metal.", "green": "Muted green hoops.", "mixed": "Alternating white and dark hoops."}),
  support: choice("How are the feet set?", {"turf": "Hoops are sunk directly into the turf.", "plates": "Little flat fixing plates hold the hoop feet.", "blocks": "Low timber sockets carry each hoop.", "pegs": "Side pegs brace the first hoop.", "practice": "A flat wood practice strip supports the course."}),
  extra: choice("What accompanies the set?", {"peg": "A striped centre winning peg.", "case": "A shallow open hoop carrying box.", "mallet": "A little setting mallet.", "balls": "Four coloured balls in a row.", "none": "Only the playing hoops."}),
  mark: choice("How are the hoop crowns marked?", {"blue": "A blue crown marks the first hoop.", "red": "A red crown marks the finishing hoop.", "numbers": "Small numbered top plaques.", "bands": "Alternating red and blue crown bands.", "plain": "No crown markings."}),
  extent: score("How high are the hoops?", ["Small practice hoops", "Regulation-like lawn hoops", "Tall demonstration hoops"]),
  load: score("How far apart are the hoops?", ["A compact teaching course", "Comfortable practice spacing", "A broad open layout"]),
  closed: noul("Does a thin chalk route connect the hoops?"),
};
export default defineThing({
  questions,
  build(a, context) {
    const s = new Sculpture(context), { random, mood } = context;
    const f = Object.keys(questions.form.options).indexOf(a.form), t = Object.keys(questions.state.options).indexOf(a.state), d = Object.keys(questions.detail.options).indexOf(a.detail), u = Object.keys(questions.support.options).indexOf(a.support), e = Object.keys(questions.extra.options).indexOf(a.extra), m = Object.keys(questions.mark.options).indexOf(a.mark);
    const wood = s.material('#a47c4e'), pale = s.material('#e0d2ac'), metal = s.material('#8f9995', { metalness: 0.7, roughness: 0.35 }), dark = s.material('#3d443c'), green = s.material('#667e50');
    const colors = ['#a64d39', '#497e70', '#d4af55', '#59778c', '#b47b8c'];

    const h=.28+a.extent*.12,w=.13,step=.38+a.load*.32,n=f===2?2:f===1?4:f===4?1:6,points:Array<[number,number]>=[];for(let i=0;i<n;i++){const x=f===1?Math.sin(i*Math.PI/2)*step:f===2?0:(i%2-.5)*step,z=f===1?Math.cos(i*Math.PI/2)*step:f===2?(i-.5)*step:(Math.floor(i/2)-1)*(f===3?step*.6:step);points.push([x,z]);const mat=s.material(d===4?(i%2?'#4b5749':'#d9d6bb'):['#dad9c5','#465347','#919c91','#748a62'][d]);s.tube([[x-w/2,0,z],[x-w/2,h-.04,z],[x-w*.35,h,z],[x+w*.35,h,z],[x+w/2,h-.04,z],[x+w/2,0,z]],.012,mat);if(m!==4){const color=m===1?'#a55c49':m===3&&i%2?'#a55c49':'#5d819a';if(m===2)s.label(String(i+1),.06,.035,[x,h+.005,z+.015]);else if(i===0||m===3)s.rod([x-w*.3,h,z],[x+w*.3,h,z],.014,s.material(color));}if(u===1||u===2)for(const dx of [-w/2,w/2])s.box([.07,.012,.08],[x+dx,.006,z],u===1?metal:wood);if(u===3&&i===0)for(const dx of [-w/2-.04,w/2+.04])s.rod([x+dx,0,z+.05],[x+dx,.13,z+.05],.009,wood);}
    if(u===4)s.box([step*1.5,.014,step*3],[0,.007,0],wood);if(f===4)for(let j=0;j<2;j++)s.tube([[.22+j*.18,.013,-.15],[.22+j*.18,.013,.15],[.35+j*.18,.013,.15],[.35+j*.18,.013,-.15]],.011,metal);const first=points[0];if(t!==3){const x=t===2?0:first[0],z=t===2?0:first[1]+(t===1?0:.13);s.ball([.045,.045,.045],[x,.045,z],s.material('#a65d46'),18);if(t===0)s.ball([.045,.045,.045],[x+.1,.045,z+.02],s.material('#567f92'),18);}if(t===4)for(let i=0;i<4;i++)s.rod([(i%2-.5)*step*1.5,0,(Math.floor(i/2)-.5)*step*2.8],[(i%2-.5)*step*1.5,.12,(Math.floor(i/2)-.5)*step*2.8],.008,wood);
    if(e===0){s.rod([0,0,0],[0,.26,0],.018,wood);for(let i=0;i<4;i++)s.cylinder(.02,.02,.035,[0,.1+i*.037,0],s.material(colors[i]),12);}if(e===1){s.box([.35,.02,.45],[step+.15,.01,0],wood);for(const z of [-.22,.22])s.box([.35,.07,.02],[step+.15,.045,z],wood);}if(e===2){s.rod([step+.1,.018,-.1],[step+.1,.018,.15],.008,wood);s.cylinder(.035,.035,.12,[step+.1,.035,.15],wood,16).rotation.z=Math.PI/2;}if(e===3)for(let i=0;i<4;i++)s.ball([.045,.045,.045],[(i-1.5)*.11,.045,step*1.5],s.material(colors[i]),18);if(a.closed&&points.length>1)for(let i=1;i<points.length;i++)s.rod([points[i-1][0],.003,points[i-1][1]],[points[i][0],.003,points[i][1]],.003,pale);return s.finish();
  },
});
