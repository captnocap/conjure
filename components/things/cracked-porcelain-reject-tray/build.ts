import * as THREE from 'three';
import { Sculpture, choice, score, noul, diorama, defineThing, defineWorld, figure } from '@conjure/kit';
export default defineThing({
  questions: {
    tray: choice("What receives the rejects?", {"wood": "A slatted wooden tray.", "steel": "A dark folded steel tray.", "basket": "A shallow woven basket.", "tile": "A square fireclay sorting tile."}),
    parts: choice("What failed pieces lie here?", {"sheds": "Curved suspension-disc fragments.", "cups": "Broken cup-shaped pin insulators.", "rings": "Split ceramic spool rings.", "mixed": "A mixture of ceramic shapes."}),
    glaze: choice("What glaze covers the fragments?", {"brown": "Brown glazed faces.", "white": "White glazed porcelain.", "green": "Green-grey glaze.", "mixed": "Mixed brown and pale glaze."}),
    break: choice("What kind of break is visible?", {"clean": "Sharp clean pale edges.", "crazed": "Fine dark glaze cracks.", "blister": "Raised glaze blisters.", "split": "Long split pieces with broad gaps."}),
    sorting: choice("How are rejects arranged?", {"pile": "A central heap of overlapping pieces.", "rows": "Fragments sorted in neat rows.", "edge": "Pieces piled against one edge.", "sample": "One large failed sample in the centre."}),
    label: choice("How is the rejection recorded?", {"red": "A red reject tag.", "chalk": "A chalk tally on the tray edge.", "card": "A paper inspection card.", "none": "No label remains."}),
    tool: choice("What inspection aid is nearby?", {"lens": "A small circular magnifying lens.", "hammer": "A small tapping hammer.", "gauge": "A metal thickness gauge.", "none": "No inspection tool."}),
    state: choice("What happened to this batch?", {"fresh": "Fresh sharp breakage.", "dust": "A dusting of pale ceramic chips.", "repair": "Two pieces aligned for comparison.", "kept": "One sound sample has been retained."}),
    amount: score("How many pieces were rejected?", ["A few pieces", "A tray of fragments", "A large rejected batch"])
  },
  build(a,context){

    const s=new Sculpture(context),base=s.material(a.tray==='steel'?'#6f7e6b':a.tray==='tile'?'#b59f76':'#9b8254'),core=s.material('#d4ceb1'),glaze=s.material(a.glaze==='green'?'#81917a':a.glaze==='white'?'#dcd8bd':'#84674b',{roughness:0.26}),dark=s.material('#5c6755');
    s.box([1.15,0.045,0.8],[0,0.025,0],base);if(a.tray!=='tile')for(const z of [-0.39,0.39])s.box([1.15,0.12,0.025],[0,0.09,z],base);for(const x of [-0.56,0.56])s.box([0.025,0.12,0.8],[x,0.09,0],base);if(a.tray==='basket')for(let j=0;j<8;j++)s.box([1.14,0.006,0.012],[0,0.05,-0.35+j*0.1],dark);
    const n=a.sorting==='sample'?1:4+Math.round(a.amount*8);for(let j=0;j<n;j++){const r=a.sorting==='sample'?0.3:0.1+(j%3)*0.025,x=a.sorting==='rows'?-0.4+(j%4)*0.27:a.sorting==='edge'?-0.38+(context.random()*0.2):(context.random()-0.5)*0.75,z=a.sorting==='rows'?-0.24+Math.floor(j/4)*0.19:(context.random()-0.5)*0.5,y=0.06+(a.sorting==='pile'?j*0.009:0),arc=a.break==='split'?Math.PI*0.8:Math.PI*(0.6+(j%3)*0.2),mat=a.glaze==='mixed'&&j%2?core:glaze;
      const shape=a.parts==='mixed'?j%3:a.parts==='sheds'?0:a.parts==='cups'?1:2;if(shape===2){const ring=s.ring(r,0.025,[x,y+0.025,z],mat,arc);ring.rotation.set(Math.PI/2,0,j*0.8);s.ball([0.024,0.018,0.024],[x+r,y+0.025,z],core,10);}else{s.surface((u,v,t)=>{const a0=u*arc+j*0.8,rr=r*(0.3+v*0.7);t.set(x+Math.cos(a0)*rr,y+(shape===1?(1-v)*r:Math.sin(v*Math.PI)*0.025),z+Math.sin(a0)*rr);},mat,{segments:[12,4],flip:true});for(const angle of [j*0.8,j*0.8+arc])s.rod([x+Math.cos(angle)*r*0.3,y+0.015,z+Math.sin(angle)*r*0.3],[x+Math.cos(angle)*r,y+0.015,z+Math.sin(angle)*r],0.008,core);}
      if(a.break==='crazed')s.rod([x,y+0.025,z],[x+r*0.7,y+0.028,z+r*0.3],0.003,dark);if(a.break==='blister')s.ball([0.025,0.015,0.025],[x+r*0.6,y+0.035,z],mat,10);}
    if(a.label!=='none')s.label(a.label==='red'?'REJECT':a.label==='chalk'?'////  ////':'BATCH 23',0.32,0.12,[0.25,0.055,0.25],a.label==='red'?'#e0d1af':'#5e674f',a.label==='red'?'#a5644c':'#d4c8a4').rotation.x=-Math.PI/2;
    if(a.tool==='lens'){s.ring(0.065,0.012,[-0.35,0.06,0.26],dark).rotation.x=Math.PI/2;s.rod([-0.35,0.06,0.26],[-0.48,0.06,0.31],0.015,dark);}if(a.tool==='hammer'){s.rod([-0.4,0.06,0.2],[-0.15,0.06,0.2],0.014,base);s.box([0.05,0.04,0.1],[-0.4,0.08,0.2],dark);}if(a.tool==='gauge')s.box([0.35,0.012,0.06],[-0.25,0.06,0.28],dark);
    if(a.state==='dust')for(let j=0;j<18;j++)s.ball([0.008,0.004,0.006],[(context.random()-0.5),0.052,(context.random()-0.5)*0.65],core,6);if(a.state==='kept')s.cylinder(0.08,0.04,0.07,[0.4,0.09,-0.2],glaze,24);if(a.state==='repair')for(const x of [-0.08,0.08])s.ring(0.1,0.018,[x,0.075,0],core,Math.PI).rotation.x=Math.PI/2;return s.finish();

  },
});
