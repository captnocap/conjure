import * as THREE from 'three';
import { Sculpture, choice, score, noul, mix, defineThing } from '@conjure/kit';

export default defineThing({
  questions: {

    form: choice('How has erosion shaped the butte?', {table:'One broad flat-topped mesa.', towers:'Three narrow sandstone towers.', arch:'Two pillars joined by a natural bridge.'}),
    layers: choice('What colours reveal the strata?', {copper:'Copper, ochre and red clay.', chalk:'Chalk, cream and warm grey.', dusk:'Muted mauve and blue-grey.'}),
    relic: noul('Is a tiny ruin visible on the top?'),

  },
  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;

    const colours={copper:['#b27756','#cb936c','#965d49'],chalk:['#c8bf9e','#e0d3ae','#aaa794'],dusk:['#928398','#ada1ad','#716e89']}[a.layers];
    const n=a.form==='table'?1:a.form==='towers'?3:2;
    for(let k=0;k<n;k++){const x=(k-(n-1)/2)*1.5,base=a.form==='table'?1.9:0.65;
      for(let i=0;i<8;i++)s.cylinder(base*(0.75+i*0.015),base*(0.8+i*0.012),0.34,[x,0.17+i*0.34,0],s.material(colours[i%3],{flatShading:true}),7);
    }
    if(a.form==='arch')s.box([2.5,0.45,1],[0,2.5,0],s.material(colours[1]));
    if(a.relic)for(let i=0;i<4;i++)s.box([0.18,0.35,0.17],[-0.4+i*0.26,2.9,0],s.material('#857b6b'));

    return s.finish();
  },
});
