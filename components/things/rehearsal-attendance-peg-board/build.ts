import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing, figure } from '@conjure/kit';
const questions = {
  form: choice("How are the choir sections arranged?", {"four": "Four rows for SATB.", "two": "Two broad rows for upper and lower voices.", "columns": "Four vertical section columns.", "small": "A compact two-section board.", "wide": "A wide five-row rehearsal board."}),
  state: choice("How far has check-in progressed?", {"ready": "All name tokens wait on the lower tray.", "some": "A few singers have checked in.", "full": "Most section pegs carry tokens.", "late": "One token remains on the tray.", "clear": "The board is cleared after rehearsal."}),
  detail: choice("What is the board surface?", {"oak": "Natural warm timber.", "green": "A muted green board.", "blue": "A soft blue board.", "cream": "A pale painted board.", "dark": "A charcoal board."}),
  support: choice("What holds the board up?", {"feet": "Two posts with broad feet.", "a": "Two rear leaning braces.", "frame": "A square wheeled frame.", "easel": "A three-legged easel.", "panel": "A full solid lower panel."}),
  extra: choice("What is on the small lower shelf?", {"pencil": "A cup of pencils.", "bell": "A small check-in bell.", "cards": "A stack of blank tokens.", "book": "A closed attendance book.", "none": "The shelf is empty."}),
  mark: choice("What does the header show?", {"choir": "CHOIR REHEARSAL.", "tonight": "TONIGHT.", "welcome": "WELCOME.", "voices": "OUR VOICES.", "practice": "PRACTICE."}),
  extent: score("How wide is the attendance board?", ["A compact board", "A standard choir board", "A broad community board"]),
  load: score("How many pegs are in each section?", ["Three pegs", "Five pegs", "Seven pegs"]),
  closed: noul("Does a small date card hang from the header?"),
};
export default defineThing({
  questions,
  build(a, context) {
    const s = new Sculpture(context), { random, mood } = context;
    const f = Object.keys(questions.form.options).indexOf(a.form), t = Object.keys(questions.state.options).indexOf(a.state), d = Object.keys(questions.detail.options).indexOf(a.detail), u = Object.keys(questions.support.options).indexOf(a.support), e = Object.keys(questions.extra.options).indexOf(a.extra), m = Object.keys(questions.mark.options).indexOf(a.mark);
    const wood = s.material('#a47c4e'), pale = s.material('#e0d2ac'), metal = s.material('#8f9995', { metalness: 0.7, roughness: 0.35 }), dark = s.material('#3d443c'), green = s.material('#667e50');
    const colors = ['#a64d39', '#497e70', '#d4af55', '#59778c', '#b47b8c'];

 const W=(f===3?.55:f===4?1:.75)+a.extent*.55,H=.65,B=.55,n=3+Math.round(a.load*4),rows=f===1||f===3?2:f===4?5:4,mat=s.material(['#b69b72','#73876b','#748f9c','#d1c8ac','#505b52'][d]);s.box([W,H,.035],[0,B+H/2,0],mat);for(const x of [-W*.43,W*.43]){s.rod([x,0,0],[x,B+H+.03,0],.025,wood);if(u===0||u===2)s.box([.12,.04,.5],[x,.02,.05],wood);if(u===1||u===3)s.rod([x,0,-.4],[x,B+H*.7,0],.025,wood);if(u===2)for(const z of [-.16,.24])s.cylinder(.045,.045,.04,[x,.045,z],dark,16).rotation.z=Math.PI/2;}if(u===4)s.box([W*.86,B,.035],[0,B/2,0],wood);s.label(['CHOIR REHEARSAL','TONIGHT','WELCOME','OUR VOICES','PRACTICE'][m],W*.88,.07,[0,B+H-.08,.02]);const token=s.material('#d9c79e'),total=rows*n,filled=t===0||t===4?0:t===1?Math.ceil(total*.35):t===2?total-2:total-1;for(let r=0;r<rows;r++){const rowY=B+H*.71-r*H*.55/rows;s.label(['S','A','T','B','ALL'][r],.04,.045,[f===2?-W*.32+r*W*.64/(rows-1):-W*.44,f===2?B+H*.75:rowY,.021]);for(let j=0;j<n;j++){const x=f===2?-W*.32+r*W*.64/(rows-1):-W*.3+j*W*.66/(n-1),y=f===2?B+H*.65-j*H*.5/n:rowY;s.rod([x,y,.018],[x,y,.075],.006,wood);if(r*n+j<filled){s.cylinder(.025,.025,.007,[x,y-.025,.066],token,16).rotation.x=Math.PI/2;s.label(String(r*n+j+1),.03,.025,[x,y-.025,.071]);}}}s.box([W,.025,.19],[0,B-.06,.08],wood);for(const x of [-W*.4,W*.4])s.rod([x,B-.2,0],[x,B-.06,.15],.012,wood);if(t===0||t===1||t===3)for(let j=0;j<(t===3?1:6);j++)s.cylinder(.025,.025,.008,[-W*.34+j*.055,B-.043,.1],token,16);if(e===0){s.cylinder(.035,.035,.07,[W*.3,B-.012,.1],pale,16);for(let j=0;j<3;j++)s.rod([W*.3+(j-1)*.012,B,.1],[W*.3+(j-1)*.012,B+.1,.1],.003,wood);}if(e===1){s.ball([.05,.035,.05],[W*.3,B-.025,.1],metal,16);s.rod([W*.3,B-.01,.1],[W*.3,B+.025,.1],.005,metal);}if(e===2)s.box([.08,.025,.06],[W*.3,B-.035,.1],pale);if(e===3)s.box([.14,.025,.09],[W*.3,B-.035,.1],green);if(a.closed){s.box([.14,.08,.003],[W*.32,B+H-.18,.025],pale);s.label('THU 7:00',.12,.045,[W*.32,B+H-.18,.028]);}return s.finish();
  },
});
