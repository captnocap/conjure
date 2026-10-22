import * as THREE from 'three';
import { Sculpture, diorama, choice, score, noul, defineThing, defineWorld } from '@conjure/kit';

export default defineThing({
  questions: {

    crate: choice('What kind of produce crate is it?', {slatted:'A shallow slatted timber market crate.', deep:'A deep open wooden packing crate.', stack:'Two stacked timber produce crates.'}),
    wood: choice('What is the crate wood like?', {pine:'Pale unfinished pine.', blue:'Faded blue painted wood.', dark:'Dark reclaimed timber.'}),
    produce: choice('What produce does it contain?', {apples:'Red and green apples.', citrus:'Oranges and lemons.', pears:'Green and golden pears.', roots:'Carrots, potatoes and turnips.'}),
    arrangement: choice('How is the produce arranged?', {rows:'Careful rows of matching fruit.', heap:'A loose irregular heap.', paper:'Individual fruits tucked into paper wraps.'}),
    stamp: choice('What is stamped on the crate?', {orchard:'ORCHARD No. 3', local:'LOCAL GROWN', fresh:'FRESH / THIS MORNING', miles:'MILES FROM HOME'}),
    leaves: noul('Are small leaves still attached to some fruit?'),
    spill: noul('Have a few fruits rolled out beside the crate?'),
    size: score('How broad is the crate?', ['A small home delivery crate', 'A broad market display crate']),
  },
  build(a, context) {

    const s=new Sculpture(context),w=0.45+a.size*0.42,d=w*0.65,h=a.crate==='deep'?0.31:0.21,color={pine:'#bda877',blue:'#829d9e',dark:'#8a7755'}[a.wood],wood=s.material(color),dark=s.material('#6b714f'),paper=s.material('#e2d8bb'),paint=s.material('#b75c48');
    const crate=(y:number)=>{s.box([w,0.018,d],[0,y+0.009,0],wood);for(const x of [-w/2,w/2])for(const z of [-d/2,d/2])s.box([0.035,h,0.035],[x,y+h/2,z],wood);for(let row=0;row<3;row++){const yy=y+0.048+row*h*0.3;for(const z of [-d/2,d/2])s.box([w,0.043,0.02],[0,yy,z],wood);for(const x of [-w/2,w/2])s.box([0.02,0.043,d],[x,yy,0],wood);}};
    crate(0);if(a.crate==='stack')crate(h+0.025);const base=a.crate==='stack'?h+0.045:0.02;
    const fruit=(x:number,y:number,z:number,i:number)=>{const mat=s.material(a.produce==='apples'?(i%3?'#b9674c':'#90a26a'):a.produce==='citrus'?(i%3?'#ce9749':'#cabb59'):a.produce==='pears'?(i%2?'#9ca56b':'#b8aa65'):'#b38f5d');if(a.produce==='roots'&&i%2===0){const carrot=s.cylinder(0.016,0.006,0.11,[x,y,z],s.material('#bb8346'),10);carrot.rotation.z=0.8;s.rod([x-0.035,y+0.035,z],[x-0.063,y+0.08,z],0.003,dark);}else if(a.produce==='pears'){s.ball([0.037,0.037,0.037],[x,y,z],mat,12);s.ball([0.021,0.028,0.023],[x,y+0.043,z],mat,12);}else s.ball([0.04,0.037,0.037],[x,y,z],mat,16);s.rod([x,y+0.03,z],[x+0.003,y+0.05,z],0.002,dark);if(a.leaves&&i%3===0)s.ball([0.016,0.004,0.008],[x+0.014,y+0.05,z],dark,8);if(a.arrangement==='paper')s.ball([0.052,0.013,0.049],[x,y-0.023,z],paper,12);};
    const cols=Math.max(4,Math.floor(w/0.085)),rows=3;for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){const x=(col-(cols-1)/2)*w*0.83/cols,z=(row-1)*d*0.27;fruit(x+(a.arrangement==='heap'?(context.random()-0.5)*0.05:0),base+0.055+(a.arrangement==='heap'?context.random()*0.05:0),z,row*cols+col);}
    s.label({orchard:'ORCHARD No. 3',local:'LOCAL GROWN',fresh:'FRESH THIS MORNING',miles:'MILES FROM HOME'}[a.stamp],w*0.82,0.09,[0,h*0.48,d/2+0.014],'#596346',color);
    if(a.spill)for(let i=0;i<3;i++)fruit(w*0.62+(context.random()-0.5)*0.12,0.038,(context.random()-0.5)*d,i+1);
    return s.finish();
  },
});
