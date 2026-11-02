import * as THREE from 'three';
import { Sculpture, choice, score, noul, diorama, defineThing, defineWorld, figure } from '@conjure/kit';
export default defineThing({
  questions: {
    bench: choice("What bench carries the comb?", {"trestle": "A broad trestle bench.", "block": "A solid chopping-block stand.", "long": "A long two-station bench.", "low": "A low seated working bench."}),
    teeth: choice("How fine is the pin bed?", {"coarse": "Widely spaced thick pins.", "fine": "Closely spaced thin pins.", "mixed": "Two different pin beds.", "worn": "A few pins are bent."}),
    plate: choice("What holds the teeth?", {"iron": "A dark iron mounting plate.", "wood": "Teeth driven into hardwood.", "brass": "A warm brass mounting plate.", "rim": "A metal plate with a raised rim."}),
    fibre: choice("What is being combed?", {"hemp": "Golden long hemp fibres.", "flax": "Pale flax fibres.", "tow": "Short rough brown tow.", "empty": "A clear pin bed."}),
    bundle: choice("How is the fibre arranged?", {"across": "Strands drawn across the teeth.", "tuft": "A large loose tuft at one side.", "tied": "A tied bundle on the bench.", "hanging": "A long hank hangs over the end."}),
    storage: choice("What is beneath the bench?", {"basket": "A round waste basket.", "bundles": "Tied bundles of finished fibre.", "tray": "A shallow tow-catching tray.", "clear": "Open space below."}),
    tool: choice("What hand tool rests nearby?", {"comb": "A smaller handheld comb.", "knife": "A broad scraping knife.", "mallet": "A wooden pin-setting mallet.", "none": "No extra tool."}),
    state: choice("What traces of the work remain?", {"clean": "The bench has been swept.", "waste": "Loose short fibres around the feet.", "cover": "A wooden cover protects one comb.", "tag": "A small numbered bundle tag."}),
    length: score("How long is the work bench?", ["A short bench", "A normal bench", "An extended bench"])
  },
  build(a,context){

    const s=new Sculpture(context),wood=s.material('#a78b5e'),iron=s.material('#657163',{metalness:0.65}),fibre=s.material(a.fibre==='flax'?'#d1c7a1':a.fibre==='tow'?'#927b50':'#bfaa78'),w=0.9+a.length*0.8,y=a.bench==='low'?0.45:0.85;
    s.box([w,0.11,0.65],[0,y-0.055,0],wood);if(a.bench==='block')s.box([w*0.65,y-0.1,0.5],[0,(y-0.1)/2,0],wood);else for(const x of [-w*0.38,w*0.38])for(const z of [-0.22,0.22])s.rod([x,y-0.1,z],[x*1.12,0.03,z*1.25],0.045,wood);
    const stations=a.bench==='long'||a.teeth==='mixed'?2:1;for(let k=0;k<stations;k++){const cx=(k-(stations-1)/2)*w*0.45;s.box([0.38,0.035,0.36],[cx,y+0.02,0],a.plate==='wood'?wood:a.plate==='brass'?s.material('#a28b52'):iron);const n=a.teeth==='fine'?8:5;for(let i=0;i<n;i++)for(let j=0;j<n;j++){const x=cx+(i-(n-1)/2)*0.3/n,z=(j-(n-1)/2)*0.3/n,h=0.12+(i%3)*0.015;s.rod([x,y+0.035,z],[x+(a.teeth==='worn'&&i===j?0.035:0),y+0.035+h,z],a.teeth==='coarse'?0.008:0.004,iron,0.001);}if(a.plate==='rim')for(const z of [-0.19,0.19])s.box([0.4,0.05,0.02],[cx,y+0.04,z],iron);}
    if(a.fibre!=='empty')for(let i=0;i<26;i++){const z=(i-13)*0.006,x=a.bundle==='tuft'?w*0.32:0;if(a.bundle==='hanging')s.tube([[0,y+0.06,z],[w/2,y+0.03,z],[w/2+0.05,0.12,z]],0.003,fibre);else s.tube([[x-0.3,y+0.04,z],[x,y+(a.bundle==='across'?0.12:0.06)+context.random()*0.03,z],[x+0.3,y+0.035,z+(context.random()-0.5)*0.1]],0.003,fibre);}
    if(a.bundle==='tied')s.ring(0.055,0.008,[0,y+0.05,0],iron).rotation.y=Math.PI/2;
    if(a.storage==='basket'){s.cylinder(0.2,0.15,0.28,[0,0.14,0],wood,24);s.cylinder(0.18,0.18,0.01,[0,0.285,0],fibre,24);for(let i=0;i<4;i++)s.ring(0.16+i*0.01,0.01,[0,0.04+i*0.06,0],iron).rotation.x=Math.PI/2;}
    if(a.storage==='tray')s.box([w*0.7,0.045,0.5],[0,0.08,0],wood);if(a.storage==='bundles')for(let j=0;j<3;j++)s.rod([-0.3,0.07+j*0.07,0],[0.3,0.07+j*0.07,0],0.05,fibre);
    if(a.tool==='comb'){s.box([0.22,0.025,0.05],[-w*0.32,y+0.025,0.22],wood);for(let i=0;i<8;i++)s.rod([-w*0.32-0.09+i*0.025,y+0.03,0.22],[-w*0.32-0.09+i*0.025,y+0.03,0.32],0.004,iron);}if(a.tool==='knife')s.box([0.3,0.01,0.07],[-w*0.3,y+0.015,0.22],iron);if(a.tool==='mallet'){s.rod([-w*0.35,y+0.025,0.1],[-w*0.35,y+0.025,0.35],0.016,wood);s.box([0.13,0.05,0.06],[-w*0.35,y+0.04,0.1],wood);}
    if(a.state==='cover')s.box([0.4,0.05,0.4],[0,y+0.2,0],wood);if(a.state==='waste')for(let i=0;i<15;i++)s.rod([(context.random()-0.5)*w,0.01,0.4+context.random()*0.15],[(context.random()-0.5)*w,0.01,0.4+context.random()*0.15],0.003,fibre);if(a.state==='tag')s.label('HEMP 12',0.24,0.08,[w*0.3,y+0.01,0.2],'#66634d','#dfd1aa').rotation.x=-Math.PI/2;return s.finish();

  },
});
