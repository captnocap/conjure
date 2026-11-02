import * as THREE from 'three';
import { Sculpture, choice, score, noul, diorama, defineThing, defineWorld, figure } from '@conjure/kit';
export default defineThing({
  questions: {
    rim: choice("What rim is being trued?", {"silver": "A silver alloy rim.", "black": "A black anodized rim.", "wood": "A wooden rim.", "deep": "A deep section racing rim."}),
    spokes: choice("How are the spokes arranged?", {"radial": "Straight radial spokes.", "crossed": "Crossed tangential spokes.", "sparse": "A sparse aerodynamic pattern.", "incomplete": "Several spokes are missing."}),
    tyre: choice("What is on the rim?", {"bare": "The bare rim without a tyre.", "road": "A thin road tyre.", "wide": "A broad touring tyre.", "tape": "Visible ochre rim tape."}),
    stand: choice("What supports the wheel?", {"steel": "A blue steel fork stand.", "wood": "A timber workshop stand.", "folding": "A folding A-frame stand.", "bench": "A stand bolted to a bench."}),
    feelers: choice("How is runout checked?", {"arms": "Two inward pointing feeler arms.", "dial": "A circular dial indicator.", "roller": "A small bottom contact roller.", "none": "No feelers touch the rim."}),
    hub: choice("What hub is at the centre?", {"small": "A compact polished hub.", "drum": "A broad drum brake hub.", "gear": "A large internal gear hub.", "dynamo": "A ribbed hub dynamo."}),
    tools: choice("What lies beside the stand?", {"wrench": "A small spoke key.", "tension": "A spring spoke tension meter.", "nipples": "A tray of brass spoke nipples.", "none": "The work surface is clear."}),
    state: choice("What stage is the wheelbuilding at?", {"true": "The wheel is fully tensioned.", "marked": "One spoke carries a red tape flag.", "loose": "A handful of loose spokes on the base.", "tagged": "A finished wheel tag hangs at the axle."}),
    diameter: score("How large is the wheel?", ["A small wheel", "A road wheel", "A large touring wheel"])
  },
  build(a,context){

    const s=new Sculpture(context),metal=s.material('#a5b0a4',{metalness:0.7}),dark=s.material('#47534c'),base=s.material(a.stand==='wood'?'#a68d5d':'#597d88'),rim=s.material(a.rim==='wood'?'#a99062':a.rim==='black'?'#454d4b':'#b2bbb0',{metalness:a.rim==='wood'?0:0.7}),r=0.28+a.diameter*0.12,cy=r+0.25;
    s.box([0.8,0.06,0.7],[0,0.03,0],base);for(const z of [-0.15,0.15]){s.rod([0,0.06,z],[0,cy,z],0.025,base);if(a.stand==='folding')for(const x of [-0.25,0.25])s.rod([x,0.05,z],[0,cy,z],0.022,base);}if(a.stand==='bench'){for(const x of [-0.3,0.3])for(const z of [-0.25,0.25])s.box([0.045,0.45,0.045],[x,-0.2,z],base);}
    s.ring(r,a.rim==='deep'?0.035:0.016,[0,cy,0],rim);if(a.tyre!=='bare')s.ring(r+0.015,a.tyre==='wide'?0.034:a.tyre==='tape'?0.01:0.02,[0,cy,0],a.tyre==='tape'?s.material('#c3a16a'):dark);
    const hubr=a.hub==='small'?0.035:a.hub==='gear'?0.09:0.075;s.cylinder(hubr,hubr,0.16,[0,cy,0],metal,24).rotation.x=Math.PI/2;s.rod([0,cy,-0.2],[0,cy,0.2],0.012,metal);
    if(a.hub==='dynamo')for(let i=0;i<5;i++)s.ring(hubr,0.008,[0,cy,-0.06+i*0.03],dark);
    const count=a.spokes==='sparse'?12:28;for(let i=0;i<count;i++){if(a.spokes==='incomplete'&&i%5===0)continue;const t=i/count*Math.PI*2,off=a.spokes==='crossed'?(i%2?0.45:-0.45):0;s.rod([Math.cos(t+off)*hubr,cy+Math.sin(t+off)*hubr,i%2?0.06:-0.06],[Math.cos(t)*r,cy+Math.sin(t)*r,0],0.0025,metal);}
    if(a.feelers==='arms')for(const z of [-0.1,0.1])s.rod([0,0.15,z],[0,cy-r+0.02,z*0.25],0.01,dark);if(a.feelers==='roller')s.cylinder(0.025,0.025,0.07,[0,cy-r-0.02,0],metal,16).rotation.x=Math.PI/2;
    if(a.feelers==='dial'){s.rod([0.25,0.05,0.18],[0.25,0.4,0.18],0.015,metal);s.cylinder(0.06,0.06,0.03,[0.25,0.42,0.18],s.material('#d4cdb0'),24).rotation.x=Math.PI/2;s.rod([0.25,0.42,0.2],[0.27,0.46,0.2],0.004,dark);}
    if(a.tools==='wrench'){s.ring(0.03,0.012,[0.25,0.075,0.23],metal).rotation.x=Math.PI/2;s.rod([0.25,0.075,0.23],[0.35,0.075,0.23],0.013,metal);}if(a.tools==='tension'){s.box([0.18,0.025,0.06],[-0.25,0.075,0.2],base);s.rod([-0.3,0.09,0.2],[-0.15,0.12,0.2],0.008,metal);}if(a.tools==='nipples')for(let i=0;i<12;i++)s.cylinder(0.006,0.009,0.025,[0.22+context.random()*0.1,0.08,0.2+context.random()*0.1],s.material('#b59a57'),8);
    if(a.state==='marked')s.box([0.07,0.04,0.008],[r*0.6,cy+0.05,0.01],s.material('#b66b4f'));if(a.state==='loose')for(let i=0;i<6;i++)s.rod([-0.3,0.07,-0.25+i*0.018],[0.2,0.07,-0.2+i*0.018],0.0025,metal);if(a.state==='tagged')s.label('TRUED',0.16,0.08,[0.1,cy-0.08,0.08],'#535e4e','#dfd6b9');return s.finish();

  },
});
