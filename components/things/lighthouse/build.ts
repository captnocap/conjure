import * as THREE from 'three';
import { Sculpture, choice, score, noul, mix, defineThing } from '@conjure/kit';

export default defineThing({
  questions: {

    tower: choice('What kind of lighthouse is it?', {round:'A tapering round masonry tower.', square:'A square harbour beacon.', striped:'A tall tower with alternating red and cream bands.'}),
    lantern: choice('What crowns the tower?', {copper:'A copper lantern roof.', slate:'A slate-grey conical roof.', red:'A painted red lantern roof.'}),
    lit: noul('Is the lamp shining?'),

  },
  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;

    const pale=s.material('#e0daca'),red=s.material('#ae5d48'),trim=s.material('#5b6b6a',{metalness:0.4});
    if(a.tower==='square')s.box([1.3,4.2,1.3],[0,2.1,0],pale);else for(let i=0;i<7;i++)s.cylinder(0.56+i*0.01,0.58+i*0.01,0.6,[0,4.2-i*0.6-0.3,0],a.tower==='striped'&&i%2?red:pale);
    s.cylinder(0.95,0.95,0.13,[0,4.2,0],trim);s.cylinder(0.55,0.55,0.7,[0,4.6,0],s.material(a.lit?'#eadb8d':'#65858a',{emissive:a.lit?'#edc965':'#000000',emissiveIntensity:a.lit?0.7:0}));
    for(let i=0;i<10;i++){const t=i*Math.PI/5;s.rod([Math.cos(t)*0.82,4.25,Math.sin(t)*0.82],[Math.cos(t)*0.82,4.7,Math.sin(t)*0.82],0.025,trim);}
    const rail=s.ring(0.82,0.025,[0,4.7,0],trim);rail.rotation.x=Math.PI/2;
    s.cylinder(0,0.75,0.6,[0,5.25,0],s.material({copper:'#6f9987',slate:'#54616b',red:'#b65f4b'}[a.lantern]));
    s.box([0.38,0.8,0.05],[0,0.4,0.7],trim);

    return s.finish();
  },
});
