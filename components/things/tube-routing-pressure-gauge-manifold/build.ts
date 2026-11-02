import * as THREE from 'three';
import { Sculpture, choice, score, noul, diorama, defineThing, defineWorld, figure } from '@conjure/kit';
export default defineThing({
  questions: {
    count: choice("How many routes are monitored?", {"two": "Two routes.", "three": "Three routes.", "four": "Four routes.", "six": "Six routes."}),
    gauges: choice("What pressure instruments are used?", {"round": "Round dial gauges.", "utube": "Vertical U-tube gauges.", "square": "Square-faced pressure meters.", "mixed": "Alternating dial and tube gauges."}),
    layout: choice("How is the bank arranged?", {"row": "One horizontal row.", "tiers": "Two stepped rows.", "arch": "A rising centre bank.", "vertical": "A narrow vertical bank."}),
    board: choice("What supports the manifold?", {"wood": "A wooden backboard on feet.", "metal": "A perforated metal panel.", "frame": "An open pipe frame.", "desk": "A low sloping desk."}),
    valves: choice("What shutoff valves are fitted?", {"wheel": "Small handwheels.", "lever": "Quarter-turn levers.", "taps": "Crossbar taps.", "plain": "Plain capped takeoffs."}),
    pipes: choice("What supply manifold is used?", {"copper": "A single brass main.", "double": "Paired supply and vacuum mains.", "loop": "A looped main pipe.", "hoses": "Individual flexible hoses."}),
    readings: choice("What pressure state is indicated?", {"even": "All needles at mid pressure.", "low": "All needles near zero.", "mixed": "Different route readings.", "high": "All needles at high pressure."}),
    details: choice("What identification is present?", {"numbers": "Numbered route plates.", "tags": "Hanging service tags.", "test": "A separate test connection.", "plain": "Unlabelled instruments."}),
    size: score("How broad is the manifold?", ["Small desk manifold", "Standard gauge bank", "Large exchange panel"])
  },
  build(a,context){
 const s=new Sculpture(context),metal=s.material('#718879',{metalness:.5}),dark=s.material('#3f5247'),brass=s.material('#bca66e',{metalness:.7}),wood=s.material('#a58d64'),pale=s.material('#dbd1b1'),red=s.material('#a86d53');

 const n={two:2,three:3,four:4,six:6}[a.count],W=.55+a.size*.65,H=a.layout==='vertical'?n*.3+.35:1.1,Y=.15;for(const x of [-W*.45,W*.45])s.box([.12,.1,.4],[x,.05,0],metal);if(a.board==='frame'){for(const x of [-W/2,W/2])s.rod([x,.05,0],[x,H,0],.025,metal);for(const y of [.2,H])s.rod([-W/2,y,0],[W/2,y,0],.025,metal);}else s.box([W+.12,H,.05],[0,H/2,.0],a.board==='metal'?metal:wood);
 const mainY=.25;s.rod([-W*.48,mainY,.12],[W*.48,mainY,.12],.025,brass);if(a.pipes==='double')s.rod([-W*.48,.16,.12],[W*.48,.16,.12],.025,brass);if(a.pipes==='loop')s.tube([[-W*.48,.25,.12],[-W*.48,.8,.12],[W*.48,.8,.12],[W*.48,.25,.12]],.02,brass);
 for(let j=0;j<n;j++){const x=a.layout==='vertical'?0:-W*.4+j*W*.8/(n-1),y=a.layout==='vertical'?.45+j*.3:a.layout==='tiers'?.65+(j%2)*.28:a.layout==='arch'?.65+.2*(1-Math.abs(j-(n-1)/2)/n):.8;s.tube([[x,mainY,.12],[x,y-.1,.12],[x,y-.1,.18]],.012,a.pipes==='hoses'?dark:brass);const tube=a.gauges==='utube'||a.gauges==='mixed'&&j%2===0;
 if(tube){s.box([.11,.3,.03],[x,y,.08],pale);s.tube([[x-.025,y+.12,.105],[x-.025,y-.1,.105],[x+.025,y-.1,.105],[x+.025,y+.12,.105]],.006,brass);s.rod([x-.025,y-.09,.112],[x-.025,y+(a.readings==='low'?-.04:.07),.112],.004,red);}else{if(a.gauges==='square')s.box([.19,.19,.04],[x,y,.13],metal);else s.cylinder(.1,.1,.04,[x,y,.13],metal,24).rotation.x=Math.PI/2;s.cylinder(.085,.085,.007,[x,y,.155],pale,24).rotation.x=Math.PI/2;const angle=a.readings==='low'?-1:a.readings==='high'?1:a.readings==='mixed'?-1+j*2/n:0;s.rod([x,y,.163],[x+Math.sin(angle)*.065,y+Math.cos(angle)*.065,.163],.004,dark);}
 const vy=.38;if(a.valves==='wheel'){s.rod([x,vy,.12],[x,vy,.2],.01,brass);s.ring(.045,.008,[x,vy,.2],brass);}if(a.valves==='lever')s.rod([x,vy,.13],[x+.07,vy+.03,.13],.012,red);if(a.valves==='taps')s.rod([x-.04,vy,.15],[x+.04,vy,.15],.008,brass);if(a.details==='numbers')s.label(String(j+1),.07,.045,[x,y-.17,.045],'#e0d3ad','#56614b');if(a.details==='tags'){s.rod([x,vy,.15],[x+.04,vy-.08,.16],.002,wood);s.label(String(j+1),.06,.04,[x+.04,vy-.09,.16],'#e3d4b0','#5a5940');}}
 if(a.details==='test')s.rod([W*.48,mainY,.12],[W*.48+.15,mainY,.12],.018,brass);if(a.board==='desk'){for(const x of [-W*.4,W*.4])s.rod([x,0,-.3],[x,H*.7,0],.025,wood);}return s.finish();

  },
});
