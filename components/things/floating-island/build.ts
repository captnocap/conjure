import * as THREE from 'three';
import { Sculpture, choice, score, noul, mix, defineThing } from '@conjure/kit';

export default defineThing({
  questions: {

    surface: choice('What lives on top?', {meadow:'A soft meadow cap.', desert:'A dry sandy cap.', garden:'A cultivated garden terrace.'}),
    underside: choice('What hangs beneath?', {stone:'A jagged inverted mountain.', roots:'Long exposed roots.', crystal:'Faceted crystals growing downward.'}),
    stream: noul('Does a small waterfall spill over the edge?'),

  },
  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;

    const rock=s.material('#8d8778',{flatShading:true}),top=s.material({meadow:'#859b66',desert:'#c8ae7f',garden:'#78907c'}[a.surface]);
    s.cylinder(2.1,0.3,2.5,[0,1.25,0],rock,9);s.cylinder(2.12,2.1,0.24,[0,2.62,0],top,9);
    if(a.underside==='roots')for(let i=0;i<10;i++){const t=i*Math.PI/5;s.tube([[Math.cos(t)*1.4,2.5,Math.sin(t)*1.4],[Math.cos(t)*0.9,1.4,Math.sin(t)*0.9],[Math.cos(t)*0.5,0.1,Math.sin(t)*0.5]],0.04,s.material('#675a45'));}
    if(a.underside==='crystal')for(let i=0;i<12;i++){const x=(random()-0.5)*2,z=(random()-0.5)*2,c=s.cylinder(0.22,0,0.8,[x,0.8,z],s.material('#a5bfbd'),5);}
    if(a.surface==='garden')for(let i=0;i<4;i++)s.box([2.6,0.08,0.17],[0,2.79,-0.75+i*0.5],s.material('#b3ad82'));
    if(a.stream)s.tube([[0,2.77,0],[0.7,2.77,0.6],[1.8,2.6,0.7],[1.95,0.2,0.7]],0.1,s.material('#78b8c2',{emissive:'#386b81',emissiveIntensity:0.2}));

    return s.finish();
  },
});
