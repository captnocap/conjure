import * as THREE from 'three';
import { Sculpture, choice, score, noul, diorama, defineThing, defineWorld, figure } from '@conjure/kit';
export default defineThing({
  questions: {
    rack: choice("How is the rack arranged?", {"upright": "A tall freestanding vertical rack.", "lean": "A leaning wall rack.", "horizontal": "A low horizontal trestle rack.", "cart": "A wheeled narrow storage cart."}),
    stock: choice("What battens fill it?", {"wood": "Pale spruce battens.", "bamboo": "Warm segmented bamboo strips.", "glass": "Cream fibreglass strips.", "mixed": "Alternating dark and pale timber."}),
    profile: choice("How have the battens been shaped?", {"straight": "Straight constant-width strips.", "taper": "Long tapering strips.", "curve": "Gently bowed strips.", "rounded": "Battens with thick rounded ends."}),
    sorting: choice("How are the lengths sorted?", {"height": "Short to long from left to right.", "paired": "Matching pairs of equal length.", "random": "Uneven mixed lengths.", "bundle": "Two tied bundles."}),
    ends: choice("What protects the ends?", {"caps": "Dark rubber end caps.", "tape": "Red tape wraps each end.", "bare": "Bare sanded ends.", "holes": "Small drilled fastening holes."}),
    labels: choice("How are the sizes marked?", {"tags": "Paper length tags.", "chalk": "Chalk numbers on the rack.", "bands": "Coloured bands across each bundle.", "plain": "No labels."}),
    tools: choice("What shaping tool waits beside it?", {"plane": "A small hand plane.", "sand": "A wooden sanding block.", "saw": "A fine-toothed backsaw.", "none": "No tool."}),
    state: choice("What is happening to the stock?", {"ready": "The stock is ready to fit.", "split": "One cracked strip lies discarded.", "trial": "A sample batten is bent in a testing arch.", "offcuts": "Short offcuts collect at the foot."}),
    number: score("How many battens are stored?", ["Four strips", "Eight strips", "Twelve strips"])
  },
  build(a,context){

    const s=new Sculpture(context),wood=s.material('#98764b'),metal=s.material('#667b69',{metalness:0.6}),dark=s.material('#354237'),stock=s.material(a.stock==='glass'?'#d7d6b5':a.stock==='bamboo'?'#af965e':'#c5b17e');
    const n=4+Math.round(a.number*8),width=0.9;for(const x of [-0.48,0.48]){s.box([0.08,1.5,0.08],[x,0.8,-0.06],wood);s.box([0.13,0.08,0.65],[x,0.06,0],wood);if(a.rack==='cart')for(const z of [-0.25,0.25])s.cylinder(0.065,0.065,0.06,[x,0.065,z],dark,14).rotation.z=Math.PI/2;}
    for(const y of [0.2,0.8,1.45])s.box([1.04,0.09,0.12],[0,y,-0.04],wood);
    for(let i=0;i<n;i++){const x=(i-(n-1)/2)*width/n,h=a.sorting==='paired'?1.35+Math.floor(i/2)*0.09:a.sorting==='random'?1.35+context.random()*0.7:1.3+i/n*0.8;
      const mat=a.stock==='mixed'&&i%2?s.material('#897047'):stock;
      if(a.profile==='curve')s.tube([[x,0.16,0.08],[x+0.045,h*0.5,0.14],[x,h,0.08]],0.012,mat);else{s.box([0.028,h-0.16,0.014],[x,(h+0.16)/2,0.08],mat);if(a.profile==='taper')s.box([0.012,h*0.45,0.008],[x,h*0.77,0.09],mat);}
      if(a.profile==='rounded')s.ball([0.017,0.024,0.011],[x,h,0.08],mat,10);
      if(a.stock==='bamboo')for(let j=0;j<5;j++)s.box([0.031,0.015,0.018],[x,0.3+j*0.3,0.08],wood);
      if(a.ends==='caps'||a.ends==='tape')s.box([0.035,0.06,0.025],[x,h-0.02,0.08],a.ends==='caps'?dark:s.material('#a7593d'));if(a.ends==='holes')s.ball([0.005,0.005,0.002],[x,h-0.03,0.089],dark,8);
      if(a.labels==='tags'&&i%3===0)s.label(String(Math.round(h*100))+' cm',0.13,0.045,[x,0.45,0.11],'#47513d','#ddd3ae');
    }
    if(a.sorting==='bundle'||a.labels==='bands')for(const x of [-0.23,0.23])for(const y of [0.5,1.1])s.box([0.38,0.045,0.035],[x,y,0.095],a.labels==='bands'?s.material('#697f94'):wood);
    if(a.labels==='chalk')s.label('180 / 210',0.55,0.08,[0,0.8,0.027],'#e2dabd','#92764e');
    if(a.tools==='plane'){s.box([0.16,0.04,0.06],[0.63,0.025,0.05],metal);s.box([0.04,0.04,0.05],[0.63,0.065,0.05],wood).rotation.z=0.4;}if(a.tools==='sand')s.box([0.16,0.04,0.08],[0.63,0.025,0.05],wood);if(a.tools==='saw'){s.box([0.32,0.08,0.006],[0.65,0.045,0],metal);s.ring(0.045,0.015,[0.85,0.05,0],wood);}
    if(a.state==='offcuts')for(let j=0;j<7;j++)s.box([0.25+context.random()*0.15,0.018,0.025],[-0.15+j*0.05,0.015+j*0.007,0.3],stock).rotation.y=(context.random()-0.5)*1.2;
    if(a.state==='split')for(const z of [0.25,0.3])s.box([0.65,0.006,0.013],[0.13,0.005,z],stock).rotation.y=z===0.25?0.15:-0.1;
    if(a.state==='trial')s.tube([[-0.45,0.03,0.4],[0,0.4,0.4],[0.45,0.03,0.4]],0.012,stock);
    if(a.rack==='lean')s.root.rotation.x=-0.17;if(a.rack==='horizontal')s.root.rotation.x=-Math.PI/2;
    return s.finish();

  },
});
