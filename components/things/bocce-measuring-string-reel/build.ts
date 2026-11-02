import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing, figure } from '@conjure/kit';
const questions = {
  form: choice("What kind of court measure is used?", {"reel": "A hand-held wooden string reel.", "tape": "A round metal measuring tape.", "caliper": "A wide hinged wooden calliper.", "rod": "A telescopic measuring rod.", "chain": "A short marked measuring chain on a spool."}),
  state: choice("What is being measured?", {"packed": "The measure is packed with its string wound in.", "near": "A red ball sits very close to the cream jack.", "tie": "Two balls lie at nearly equal distances.", "wide": "A long measure is stretched between distant balls.", "dispute": "Three balls surround the jack and the measure points between them."}),
  detail: choice("How is the distance marked?", {"knots": "Knots tied at regular intervals.", "stripes": "Alternating dark and pale bands.", "beads": "Small bright counting beads.", "ticks": "Fine ruler ticks.", "flags": "Small triangular marker pennants."}),
  support: choice("What holds the reel?", {"base": "A flat round resting base.", "handle": "A short wooden turning handle.", "bracket": "A low metal cradle.", "grip": "A broad loop grip.", "bare": "A bare reel laid on its rim."}),
  extra: choice("What is in the measuring kit?", {"pencil": "A thick scoring pencil.", "chalk": "A stub of white chalk.", "clip": "A small spring clip for the jack end.", "brush": "A short lane brush.", "card": "A paper results card."}),
  mark: choice("What is written on the casing?", {"metric": "METRES.", "club": "COURT 2.", "ref": "REFEREE.", "initials": "A pair of ownership initials.", "plain": "No writing."}),
  extent: score("How long is the measuring span?", ["A close judgement", "A normal shot", "A long disputed shot"]),
  load: score("How much of the measure is unwound?", ["A short free end", "Half the line", "A long taut line"]),
  closed: noul("Is the measure enclosed in a protective half-shell?"),
};
export default defineThing({
  questions,
  build(a, context) {
    const s = new Sculpture(context), { random, mood } = context;
    const f = Object.keys(questions.form.options).indexOf(a.form), t = Object.keys(questions.state.options).indexOf(a.state), d = Object.keys(questions.detail.options).indexOf(a.detail), u = Object.keys(questions.support.options).indexOf(a.support), e = Object.keys(questions.extra.options).indexOf(a.extra), m = Object.keys(questions.mark.options).indexOf(a.mark);
    const wood = s.material('#a47c4e'), pale = s.material('#e0d2ac'), metal = s.material('#8f9995', { metalness: 0.7, roughness: 0.35 }), dark = s.material('#3d443c'), green = s.material('#667e50');
    const colors = ['#a64d39', '#497e70', '#d4af55', '#59778c', '#b47b8c'];

    const span=.36+a.extent*.75, r=.075, line=s.material('#d5ac4f'), red=s.material('#b65843');
    const cx=-span/2,cz=-.08;s.cylinder(r,r,.035,[cx,.08,cz],f===1?metal:wood,20).rotation.x=Math.PI/2;
    for(const z of [cz-.025,cz+.025])s.cylinder(r+.012,r+.012,.012,[cx,.08,z],wood,20).rotation.x=Math.PI/2;
    if(f===2){for(const sign of [-1,1])s.rod([cx,.03,cz],[cx+span*.8,.03,cz+sign*.15],.012,wood);s.ball([.025,.025,.025],[cx,.03,cz],metal,10);}
    else if(f===3){s.rod([cx,.04,cz],[cx+span,.04,cz],.014,metal);s.rod([cx+span*.3,.04,cz],[cx+span,.04,cz],.009,pale);}
    else {for(let i=0;i<6;i++)s.ring(r*.8,.004,[cx,.08,cz-.018+i*.007],line);const length=t===0?.12:span*(.45+a.load*.55);s.rod([cx,.025,cz+.08],[cx+length,.025,cz+.08],f===4?.005:.0025,line);for(let i=1;i<9;i++){const x=cx+length*i/9;if(d===0||d===2)s.ball([.005,.006,.005],[x,.026,cz+.08],d===0?line:red,8);if(d===1||d===3)s.box([.005,.003,d===3?.03:.012],[x,.028,cz+.08],dark);if(d===4)s.mesh(new THREE.ConeGeometry(.013,.025,3),red,[x,.04,cz+.08]).rotation.z=Math.PI/2;}}
    if(a.closed)s.ball([r*1.1,r*1.1,.017],[cx,.08,cz+.03],metal,16);
    if(u===0)s.cylinder(.11,.11,.012,[cx,.008,cz],wood,18);if(u===1)s.rod([cx,.08,cz+.04],[cx,.08,cz+.12],.012,wood);if(u===2)for(const x of [cx-.09,cx+.09])s.rod([x,0,cz],[cx,.08,cz],.009,metal);if(u===3)s.ring(.1,.01,[cx-.12,.1,cz],dark);if(u===4)s.root.rotation.y=.18;
    if(t>0){s.ball([.022,.022,.022],[span/2,.022,.2],pale,12);const count=t===2?2:t===4?3:1;for(let i=0;i<count;i++)s.ball([.055,.055,.055],[span/2-.12-i*.12,.055,.22+(i%2)*.13],i%2?green:red,14);}
    if(e===0)s.rod([cx+.02,.008,.24],[cx+.22,.008,.24],.006,line);if(e===1)s.rod([cx+.08,.009,.24],[cx+.14,.009,.24],.009,pale);if(e===2)s.box([.035,.012,.065],[cx+.12,.012,.23],metal);if(e===3){s.box([.14,.02,.07],[cx+.12,.04,.24],wood);for(let i=0;i<7;i++)s.box([.012,.03,.06],[cx+.06+i*.02,.018,.24],pale);}if(e===4)s.label('POINT',.17,.08,[cx+.15,.006,.24]).rotation.x=-Math.PI/2;
    if(m<4)s.label(['METRES','COURT 2','REFEREE','A.G.'][m],.12,.035,[cx,.08,cz+.052]);return s.finish();
  },
});
