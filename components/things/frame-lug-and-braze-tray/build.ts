import * as THREE from 'three';
import { Sculpture, choice, score, noul, diorama, defineThing, defineWorld, figure } from '@conjure/kit';
export default defineThing({
  questions: {
    tray: choice("What holds the parts?", {"wood": "A divided wooden tray.", "steel": "A folded steel parts tray.", "cloth": "A leather tool roll laid open.", "enamel": "A cream enamel tray."}),
    lugs: choice("What kind of lugs are laid out?", {"plain": "Plain socket lugs.", "ornate": "Decorative scalloped lugs.", "long": "Long reinforced touring sockets.", "mixed": "Mixed lug sizes and tube diameters."}),
    metal: choice("What finish is on the fittings?", {"raw": "Dark raw steel.", "silver": "Polished silver.", "gold": "Golden brass brazing.", "red": "Red oxide primer."}),
    arrangement: choice("How are they arranged?", {"row": "A neat graduated row.", "paired": "Matched left and right pairs.", "pile": "A loose central cluster.", "sample": "One lug with tube samples inserted."}),
    rods: choice("How are brazing rods stored?", {"bundle": "A tied bundle of golden rods.", "tube": "Rods protruding from a narrow tube.", "loose": "Individual rods laid separately.", "none": "No rods in the tray."}),
    flux: choice("What flux container is present?", {"tin": "An open round tin.", "jar": "A squat glass-like jar.", "brush": "A brush over a small dish.", "none": "No flux container."}),
    tool: choice("What hand tool is beside the lugs?", {"file": "A long flat file.", "reamer": "A T handled reamer.", "caliper": "A sliding vernier caliper.", "saw": "A small pierced saw frame."}),
    state: choice("What is the condition of the job?", {"clean": "Clean parts ready for assembly.", "used": "One socket has pale flux residue.", "reject": "A split lug set apart.", "tagged": "Paper size tags beside the fittings."}),
    count: score("How many joint fittings are present?", ["A few fittings", "A frame set", "Several frame sets"])
  },
  build(a,context){

    const s=new Sculpture(context),base=s.material({wood:'#a18658',steel:'#7b8b7e',cloth:'#856947',enamel:'#d3cdb2'}[a.tray]),metal=s.material({raw:'#57635c',silver:'#b4bdb2',gold:'#b39a5e',red:'#9e6851'}[a.metal],{metalness:0.7}),dark=s.material('#3f4b45'),gold=s.material('#baa363',{metalness:0.7});
    s.box([1.05,0.035,0.72],[0,0.018,0],base);if(a.tray!=='cloth')for(const z of [-0.35,0.35])s.box([1.05,0.08,0.025],[0,0.06,z],base);for(const x of [-0.51,0.51])s.box([0.025,0.08,0.72],[x,0.06,0],base);
    const n=3+Math.round(a.count*5);for(let i=0;i<n;i++){const x=a.arrangement==='pile'?(context.random()-0.5)*0.4:a.arrangement==='paired'?-0.36+Math.floor(i%4/2)*0.42+(i%2)*0.12:-0.4+(i%4)*0.2,z=a.arrangement==='pile'?(context.random()-0.5)*0.25:-0.15+Math.floor(i/4)*0.18,r=a.lugs==='mixed'?0.035+i%3*0.008:0.045,h=a.lugs==='long'?0.13:0.09;
      s.cylinder(r,r,h,[x,0.07,z],metal,20).rotation.x=Math.PI/2;s.cylinder(r*0.67,r*0.67,h+0.002,[x,0.07,z],dark,20).rotation.x=Math.PI/2;s.rod([x,0.07,z],[x+0.06,0.14,z],r*0.8,metal);
      if(a.lugs==='ornate')for(let j=0;j<4;j++)s.ball([0.012,0.018,0.008],[x+Math.cos(j*Math.PI/2)*r,0.07+Math.sin(j*Math.PI/2)*r,z+h/2],metal,8);
      if(a.arrangement==='sample'&&i===0)s.rod([x-0.16,0.07,z],[x+0.16,0.07,z],0.028,gold);
      if(a.state==='tagged')s.label(String(28+i%3*2),0.07,0.045,[x,0.039,z+0.08],'#5b6455','#e2d7b6').rotation.x=-Math.PI/2;
      if(a.state==='used'&&i===0)s.ring(r,0.012,[x,0.07,z+h/2],s.material('#c4bfa5'));
      if(a.state==='reject'&&i===n-1)s.rod([x-0.025,0.1,z],[x+0.02,0.08,z+0.06],0.006,dark);
    }
    if(a.rods!=='none')for(let i=0;i<7;i++)s.rod([-0.43,0.06,0.25+i*0.008],[0.12,0.06,0.25+i*0.008],0.004,gold);if(a.rods==='tube')s.box([0.28,0.05,0.08],[-0.3,0.07,0.275],base);if(a.rods==='bundle')for(const x of [-0.3,0])s.box([0.012,0.025,0.075],[x,0.065,0.275],dark);
    if(a.flux!=='none'){s.cylinder(0.08,0.08,a.flux==='jar'?0.12:0.06,[0.35,0.07,-0.2],base,24);s.cylinder(0.07,0.07,0.008,[0.35,a.flux==='jar'?0.135:0.104,-0.2],s.material('#d9d1b2'),24);if(a.flux==='brush')s.rod([0.26,0.12,-0.28],[0.45,0.12,-0.1],0.012,dark);}
    if(a.tool==='file'){s.box([0.42,0.015,0.05],[0.18,0.08,0.22],metal);s.rod([0.39,0.08,0.22],[0.51,0.08,0.22],0.025,base);}if(a.tool==='reamer'){s.rod([0.13,0.09,0.15],[0.4,0.09,0.15],0.015,metal);s.rod([0.4,0.09,0.05],[0.4,0.09,0.25],0.018,base);}if(a.tool==='caliper'){s.box([0.35,0.014,0.025],[0.22,0.06,0.17],metal);for(const x of [0.08,0.25])s.box([0.025,0.014,0.12],[x,0.06,0.21],metal);}if(a.tool==='saw')s.tube([[0.1,0.08,0.12],[0.1,0.08,0.28],[0.45,0.08,0.28],[0.45,0.08,0.12],[0.1,0.08,0.12]],0.01,metal);
    return s.finish();

  },
});
