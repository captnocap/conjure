import * as THREE from 'three';
import { Sculpture, choice, score, noul, diorama, defineThing, defineWorld, figure } from '@conjure/kit';
export default defineThing({
  questions: {
    shape: choice("What shape is the separator?", {"cone": "A long tapered wooden cone.", "pear": "A rounded pear shaped top.", "short": "A squat heavy top.", "cylinder": "A parallel grooved cylinder."}),
    grooves: choice("How many strand grooves are cut?", {"three": "Three broad grooves.", "four": "Four narrow grooves.", "six": "Six fine grooves.", "two": "Two deep channels."}),
    wood: choice("What is it made from?", {"beech": "Pale polished beech.", "oak": "Golden oak.", "dark": "Dark oil soaked hardwood.", "paint": "Red painted timber."}),
    holder: choice("How is it supported?", {"cradle": "A shallow timber cradle.", "handle": "A long side carrying handle.", "sled": "A small sliding sled.", "bare": "It rests directly on the bench."}),
    strands: choice("What surrounds the top?", {"taut": "Separate taut strands converge.", "loose": "Loose strands fall around it.", "short": "Only short demonstration lengths.", "empty": "The grooves are empty."}),
    rope: choice("What rope is being made?", {"hemp": "Golden hemp rope.", "white": "Cream cotton rope.", "dark": "Dark tarred line.", "mixed": "Alternating pale and dark strands."}),
    end: choice("What finishes the narrow end?", {"cap": "A small brass nose cap.", "hole": "A dark axial bore.", "peg": "A wooden nose peg.", "plain": "A smooth rounded nose."}),
    state: choice("What use marks the top?", {"ready": "A clean top ready for laying.", "split": "A long dark grain split.", "repair": "Two metal repair bands.", "tag": "A paper gauge label."}),
    length: score("How long is the separator?", ["A small separator", "A substantial separator", "A long shipyard separator"])
  },
  build(a,context){

    const s=new Sculpture(context),wood=s.material({beech:'#c2ab77',oak:'#a88a53',dark:'#6c6042',paint:'#ad6c52'}[a.wood]),dark=s.material('#5e604c'),metal=s.material('#aa9c6c',{metalness:0.65}),rope=s.material({hemp:'#bca66f',white:'#ded5ae',dark:'#585a47',mixed:'#bca66f'}[a.rope]),len=0.4+a.length*0.45,r=a.shape==='short'?0.2:0.15,y=(a.holder==='bare'||a.holder==='handle')?r:r+0.125;
    const profile=a.shape==='pear'?[[0,0],[r*0.6,0.03],[r,len*0.3],[r*0.8,len*0.6],[0.04,len],[0,len]]:a.shape==='cylinder'?[[0,0],[r,0],[r,len],[0,len]]:[[0,0],[r,0],[r*0.95,len*0.2],[0.045,len],[0,len]];
    const top=s.lathe(profile as [number,number][],wood,[0,y,-len/2]);top.rotation.x=Math.PI/2;
    const n={three:3,four:4,six:6,two:2}[a.grooves];for(let j=0;j<n;j++){const t=j/n*Math.PI*2,xx=Math.cos(t),yy=Math.sin(t);s.tube([[xx*r,y+yy*r,-len/2],[xx*r*0.8,y+yy*r*0.8,0],[xx*0.04,y+yy*0.04,len/2]],0.014,dark);if(a.strands!=='empty')s.tube([[xx*(r+0.08),Math.max(0.025,y+yy*(r+0.08)),-len/2-0.25],[xx*r,y+yy*r,-len/2],[xx*0.05,y+yy*0.05,len/2],[0,a.strands==='loose'?0.05:y,len/2+(a.strands==='short'?0.1:0.4)]],0.013,a.rope==='mixed'&&j%2?s.material('#ded5ae'):rope);}
    if(a.holder==='cradle'||a.holder==='sled'){s.box([0.5,0.055,len+0.1],[0,0.03,0],wood);for(const z of [-len*0.3,len*0.3])s.box([0.35,0.07,0.06],[0,0.09,z],wood);if(a.holder==='sled')for(const x of [-0.2,0.2])s.box([0.035,0.04,len+0.22],[x,0.02,0],dark);}if(a.holder==='handle')s.rod([r,y,0],[0.5,y,0],0.025,wood);
    if(a.end==='cap')s.ball([0.05,0.05,0.04],[0,y,len/2],metal,16);if(a.end==='hole')s.cylinder(0.025,0.025,0.005,[0,y,len/2+0.002],dark,16).rotation.x=Math.PI/2;if(a.end==='peg')s.rod([0,y,len/2],[0,y,len/2+0.12],0.02,wood);
    if(a.state==='split')s.rod([r*0.65,y+r*0.65,-len*0.4],[r*0.22,y+r*0.22,len*0.3],0.006,dark);if(a.state==='repair')for(const z of [-len*0.3,0])s.ring(z<0?r:r*0.65,0.01,[0,y,z],metal);if(a.state==='tag')s.label('TOP '+n,0.18,0.08,[0.3,0.01,0.2],'#5d604c','#dfd2ad').rotation.x=-Math.PI/2;return s.finish();

  },
});
