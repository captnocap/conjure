import * as THREE from 'three';
import { Sculpture, choice, score, noul, diorama, defineThing, defineWorld, figure } from '@conjure/kit';
export default defineThing({
  questions: {
    forks: choice("What fork form is used?", {"square": "Straight square-section steel prongs.", "round": "Round rod steel prongs.", "weighted": "Forks with small sliding weights.", "broad": "Broad flat metal prongs."}),
    rack: choice("What rack holds them?", {"wood": "A timber block with drilled seats.", "rail": "A metal rail on two feet.", "case": "An open fitted wooden case.", "steps": "A stepped timber display rack."}),
    metal: choice("What finish is visible?", {"silver": "Bright steel.", "dark": "Dark blued steel.", "brass": "Brass demonstration forks.", "mixed": "Alternating dark and bright forks."}),
    order: choice("How are pitches ordered?", {"ascending": "Short to long from left to right.", "descending": "Long to short from left to right.", "centre": "Tallest fork at the centre.", "equal": "Equal length paired reference forks."}),
    labels: choice("How are pitches identified?", {"hz": "Frequency number plates.", "notes": "Musical note labels.", "engraved": "Small engraved stem marks.", "none": "Unmarked stems."}),
    mallet: choice("What striking tool is present?", {"rubber": "A rubber headed mallet.", "wood": "A wooden striking mallet.", "leather": "A soft leather faced beater.", "none": "No striking tool."}),
    resonator: choice("What amplifies the sound?", {"box": "A timber resonance box.", "tube": "A short resonating tube.", "plate": "A thin metal sounding plate.", "none": "No resonator."}),
    state: choice("What is being tested?", {"stored": "All forks in their slots.", "selected": "One fork lies across the front.", "marked": "A red marker on one fork.", "empty": "One rack position is empty."}),
    count: score("How many tuning forks are in the set?", ["Three forks", "Five forks", "Eight forks"])
  },
  build(a,context){

 const s=new Sculpture(context),wood=s.material('#9e8759'),steel=s.material(a.metal==='brass'?'#b39c62':a.metal==='dark'?'#516553':'#a7b5a0',{metalness:0.8}),dark=s.material('#4c5d4d'),n=3+Math.round(a.count*5),w=n*0.19+0.18;
 s.box([w,0.1,0.48],[0,0.05,0],a.rack==='rail'?dark:wood);if(a.rack==='case'){for(const z of [-0.23,0.23])s.box([w,0.16,0.025],[0,0.12,z],wood);s.box([w,0.35,0.025],[0,0.27,-0.25],wood);}for(let i=0;i<n;i++){if(a.state==='empty'&&i===1)continue;const x=(i-(n-1)/2)*0.19,rank=a.order==='descending'?n-1-i:a.order==='centre'?n-1-Math.abs(i-(n-1)/2)*2:a.order==='equal'?2:i,h=0.35+rank*0.07,by=a.rack==='steps'?0.12+i*0.04:0.1,m=a.metal==='mixed'&&i%2?dark:steel;if(a.rack==='steps')s.box([0.18,by,0.35],[x,by/2,0],wood);
 const start=s.root.children.length;s.rod([x,by,0],[x,by+0.17,0],0.018,m);s.tube([[x-0.055,by+h,0],[x-0.055,by+0.22,0],[x,by+0.17,0],[x+0.055,by+0.22,0],[x+0.055,by+h,0]],a.forks==='broad'?0.025:0.014,m);if(a.forks==='square'||a.forks==='broad')for(const xx of [x-0.055,x+0.055])s.box([a.forks==='broad'?0.035:0.022,h-0.22,0.025],[xx,by+(h+0.22)/2,0],m);if(a.forks==='weighted')for(const xx of [x-0.055,x+0.055])s.box([0.06,0.06,0.06],[xx,by+h*0.8,0],dark);
 if(a.state==='selected'&&i===1){const g=new THREE.Group();for(const c of s.root.children.slice(start))g.add(c);g.position.set(0,0.12+Math.abs(x),0.23);g.rotation.z=Math.PI/2;s.root.add(g);}if(a.labels==='hz'||a.labels==='notes')s.label(a.labels==='hz'?String(256+i*32):['C','D','E','F','G','A','B','C'][i],0.12,0.06,[x,0.075,0.245],'#ded4b0','#66745b');if(a.labels==='engraved')for(let j=0;j<3;j++)s.box([0.025,0.003,0.005],[x,by+0.08+j*0.014,0.02],dark);if(a.state==='marked'&&i===0)s.ring(0.025,0.006,[x,by+0.12,0],s.material('#a9724e')).rotation.x=Math.PI/2;}
 if(a.mallet!=='none'){s.rod([-0.3,0.125,0.14],[0.15,0.125,0.14],0.012,wood);s.rod([-0.3,0.13,0.08],[-0.3,0.13,0.2],0.035,a.mallet==='wood'?wood:a.mallet==='leather'?s.material('#bbac84'):dark);}if(a.resonator==='box')s.box([0.45,0.14,0.3],[0,0.07,-0.42],wood);if(a.resonator==='tube')s.lathe([[0.07,0],[0.08,0],[0.08,0.3],[0.07,0.3]],steel,[0,0.08,-0.55]).rotation.x=Math.PI/2;if(a.resonator==='plate')s.box([0.5,0.012,0.3],[0,0.006,-0.42],steel);return s.finish();

  },
});
