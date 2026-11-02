import * as THREE from 'three';
import { Sculpture, choice, score, noul, diorama, defineThing, defineWorld, figure } from '@conjure/kit';
export default defineThing({
  questions: {
    rank: choice("What kind of flue pipes are present?", {"metal": "Round metal principal pipes.", "wood": "Square wooden flue pipes.", "mixed": "Alternating metal and wooden pipes.", "stopped": "Round pipes with stopped tops."}),
    count: choice("How many pipes are tested?", {"three": "Three large pipes.", "five": "Five pipes.", "seven": "Seven smaller pipes.", "nine": "Nine narrow pipes."}),
    lengths: choice("How does the rank rise?", {"descending": "An evenly descending rank.", "arch": "Tall pipes at the centre.", "pairs": "Pairs of equal-length pipes.", "level": "An even-height comparison bank."}),
    mouth: choice("What mouth cut is visible?", {"low": "Low narrow mouths.", "high": "Tall wide mouths.", "arched": "Arched upper lips.", "beards": "Small side ears beside each mouth."}),
    tuning: choice("How are pipes tuned?", {"slide": "Sliding sleeves near the tops.", "roll": "Rolled tuning flaps.", "stop": "Wooden stopper handles.", "plain": "Plain open tops."}),
    rack: choice("What holds the pipe rank?", {"bench": "A tall four-leg bench.", "box": "A broad windchest box.", "rails": "Two narrow support rails.", "steps": "A stepped timber rack."}),
    feed: choice("What wind connection is visible?", {"hose": "A flexible wind hose.", "pipe": "A rigid side wind pipe.", "bellows": "A small foot bellows.", "capped": "A capped testing inlet."}),
    state: choice("What voicing detail appears?", {"normal": "All pipes in the rack.", "removed": "One spare pipe lies on the bench.", "labels": "Numbered voicing tags.", "wedge": "A small tuning wedge rests nearby."}),
    height: score("How tall is the longest pipe?", ["Small treble rank", "Middle register rank", "Tall bass test rank"])
  },
  build(a,context){
 const s=new Sculpture(context),metal=s.material('#a3aaa0',{metalness:.6,roughness:.45}),dark=s.material('#444f47'),brass=s.material('#b89e66',{metalness:.65}),wood=s.material('#a38a62'),pale=s.material('#d9cfb1'),leather=s.material('#77614c');

 const n={three:3,five:5,seven:7,nine:9}[a.count],W=n*.17+.2,Y=a.rack==='bench'?.7:.18,H=.75+a.height*.8,R=Math.min(.065,W/(n*3));s.box([W,.14,.45],[0,Y-.07,0],wood);if(a.rack!=='bench')s.box([W*.9,.05,.4],[0,.025,0],wood);if(a.rack==='bench')for(const x of [-W*.43,W*.43])for(const z of [-.17,.17])s.rod([x,0,z],[x,Y,z],.025,wood);if(a.rack==='rails')for(const z of [-.15,.15])s.box([W,.06,.08],[0,.03,z],dark);if(a.rack==='steps')s.box([W,.1,.2],[0,Y+.05,-.12],wood);
 for(let j=0;j<n;j++){const x=(j-(n-1)/2)*.17,f=a.lengths==='level'?1:a.lengths==='arch'?.55+.45*(1-Math.abs(j-(n-1)/2)/(n/2)):a.lengths==='pairs'?1-Math.floor(j/2)/n*.65:1-j/n*.6,h=H*f,wooden=a.rank==='wood'||a.rank==='mixed'&&j%2===0,fy=Y+.2,mh=a.mouth==='high'?.09:.045;s.cylinder(R*.85,.018,.2,[x,Y+.1,0],wooden?wood:metal,20);
 if(wooden){s.box([R*2,h,R*2],[x,fy+h/2,0],wood);s.box([R*1.3,mh,.008],[x,fy+.05+mh/2,R+.005],dark);}else{s.lathe([[R,0],[R,h],[R-.009,h],[R-.009,.01]],metal,[x,fy,0]);s.box([R*1.3,mh,.009],[x,fy+.05+mh/2,R+.006],dark);}
 if(a.mouth==='beards')for(const dx of [-R*.75,R*.75])s.box([.012,.12,.035],[x+dx,fy+.09,R+.012],metal);if(a.mouth==='arched')s.ring(R*.65,.009,[x,fy+.1,R+.012],metal,Math.PI);
 if(a.tuning==='slide')s.lathe([[R+.006,0],[R+.006,.12],[R+.001,.12],[R+.001,0]],metal,[x,fy+h-.12,0]);if(a.tuning==='roll')s.cylinder(.02,.02,R*1.5,[x,fy+h+.01,0],metal,16).rotation.z=Math.PI/2;if(a.rank==='stopped'||a.tuning==='stop'){s.cylinder(R,R,.02,[x,fy+h,0],wood,20);s.rod([x,fy+h,0],[x,fy+h+.1,0],.012,wood);}if(a.state==='labels')s.label(String(j+1),.055,.05,[x,Y-.04,.235],'#ddd1af','#60543f');}
 if(a.feed==='hose')s.tube([[W/2,Y-.06,0],[W/2+.25,.05,.1],[W/2+.3,.025,.4]],.025,leather);if(a.feed==='pipe')s.rod([W/2,Y-.06,0],[W/2+.3,Y-.06,0],.035,metal);if(a.feed==='bellows'){s.box([.35,.04,.3],[W/2+.25,.02,0],wood);s.box([.35,.07,.3],[W/2+.25,.075,0],leather);s.tube([[W/2+.25,.1,0],[W/2,Y-.06,0]],.025,leather);}if(a.feed==='capped')s.cylinder(.06,.06,.025,[W/2,Y-.06,0],brass,20).rotation.z=Math.PI/2;
 if(a.state==='removed')s.rod([-W*.3,Y+.045,.17],[W*.3,Y+.045,.17],.035,metal);if(a.state==='wedge')s.box([.15,.025,.04],[W*.25,Y+.013,.18],wood).rotation.z=.06;return s.finish();

  },
});
