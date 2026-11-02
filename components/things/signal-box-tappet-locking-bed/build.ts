import * as THREE from 'three';
import { Sculpture, choice, score, noul, diorama, defineThing, defineWorld, figure } from '@conjure/kit';
export default defineThing({
  questions: {
    layout: choice("How are the tappets arranged?", {"parallel": "Parallel straight tappet bars.", "double": "Two opposing banks of bars.", "fan": "Bars fan toward a narrow connection.", "stagger": "Staggered length tappets."}),
    count: choice("How many tappets?", {"four": "Four tappets.", "six": "Six tappets.", "eight": "Eight tappets.", "ten": "Ten tappets."}),
    support: choice("What carries the locking bed?", {"bench": "A waist-high timber bench.", "legs": "Four slender iron legs.", "low": "A low display base.", "cabinet": "A timber locking cabinet."}),
    cover: choice("How is the cover shown?", {"open": "The locking bed is fully exposed.", "half": "One half is covered.", "raised": "A rear cover stands upright.", "aside": "A removed cover leans beside the bed."}),
    locks: choice("What cross-lock pattern is visible?", {"blocks": "Individual rectangular locking dogs.", "bars": "Long transverse locking bars.", "pins": "Round locking pins.", "mixed": "Alternating bars and pins."}),
    rods: choice("How do the connecting rods leave?", {"front": "They extend from the front.", "rear": "They leave through the back.", "both": "They extend from both sides.", "short": "Only short connection stubs."}),
    state: choice("What operating state is shown?", {"normal": "All tappets aligned.", "route": "Alternate tappets shifted.", "single": "One tappet shifted fully.", "service": "A spare tappet rests on the base."}),
    details: choice("What inspection aid is present?", {"numbers": "Numbered bar ends.", "oil": "An oil can beside the mechanism.", "gauge": "A rule across one edge.", "plain": "No added inspection aid."}),
    length: score("How long is the locking table?", ["Short locking table", "Standard locking bed", "Long station locking bed"])
  },
  build(a,context){
 const s=new Sculpture(context),iron=s.material('#52665c',{metalness:.5}),dark=s.material('#39463f'),brass=s.material('#b79d67',{metalness:.7}),wood=s.material('#947651'),pale=s.material('#d8ceb3'),red=s.material('#a45f4f');

 const n={four:4,six:6,eight:8,ten:10}[a.count],W=.7+a.length*.6,D=.85,H=a.support==='low'?.12:.75;
 s.box([W+.2,.07,D+.2],[0,H-.035,0],wood);if(a.support==='cabinet'){s.box([W+.1,H-.07,D+.1],[0,(H-.07)/2,0],wood);for(const x of [-W*.25,W*.25])s.box([W*.45,H*.65,.02],[x,H*.4,.48],dark);}else for(const x of [-W*.43,W*.43])for(const z of [-.36,.36])s.rod([x,0,z],[x,H,z],a.support==='bench'?.035:.02,a.support==='bench'?wood:iron);
 const step=W/(n+1);for(let j=0;j<n;j++){const x=-W/2+(j+1)*step,shift=a.state==='route'&&j%2===0?.12:a.state==='single'&&j===0?.2:0,l=a.layout==='stagger'?.55+(j%3)*.1:.75,xx=a.layout==='fan'?x*.5:x;s.rod([x,H+.035,-l/2+shift],[xx,H+.035,l/2+shift],.016,brass);if(a.layout==='double')s.rod([x,H+.08,-l/2],[x,H+.08,l/2],.012,iron);
 for(const z of [-.25,0,.25])s.box([.055,.06,.04],[x,H+.04,z],iron);for(const side of a.rods==='both'?[-1,1]:[a.rods==='rear'?-1:1])s.rod([x,H+.035,side*l/2+shift],[x,H+.035,side*(a.rods==='short'?.48:.7)+shift],.01,iron);if(a.details==='numbers')s.label(String(j+1),.055,.04,[x,H+.05,.43],'#e5dab7','#625640');}
 for(let j=0;j<3;j++){const z=-.22+j*.22;if(a.locks==='bars'||a.locks==='mixed'&&j%2===0)s.box([W*.85,.025,.025],[0,H+.075,z],iron);else for(let k=0;k<Math.min(n,6);k++){const x=-W*.4+k*W*.8/(Math.min(n,6)-1);if(a.locks==='blocks')s.box([.08,.03,.07],[x,H+.065,z],iron);else s.cylinder(.025,.025,.06,[x,H+.075,z],iron,12);}}
 if(a.cover==='half')for(const z of [-.35,.35])s.box([W*.45,.12,.03],[W/4,H+.06,z],iron);if(a.cover==='half')s.box([W/2,.025,D],[W/4,H+.13,0],iron);if(a.cover==='raised')s.box([W,.55,.025],[0,H+.275,-.48],iron);if(a.cover==='aside'){const cover=s.box([W,.7,.025],[W/2+.2,.35,0],iron);cover.rotation.x=-.15;}if(a.state==='service')s.rod([-W*.35,H+.02,.48],[W*.35,H+.02,.48],.018,brass);if(a.details==='oil'){s.cylinder(.045,.06,.09,[W/2+.035,H+.045,.25],brass,16);s.rod([W/2+.035,H+.08,.25],[W/2+.1,H+.17,.25],.008,brass);}if(a.details==='gauge'){s.box([W,.008,.035],[0,H+.014,-.46],pale);for(let j=0;j<15;j++)s.box([.002,.003,.018],[-W*.45+j*W*.9/14,H+.02,-.46],dark);}return s.finish();

  },
});
