import * as THREE from 'three';
import { Sculpture, choice, score, noul, mix, defineThing } from '@conjure/kit';

export default defineThing({
  questions: {

    game: choice('What kind of game is it?', {space:'A space shooter with a pixel starfield.', maze:'A bright maze game.', race:'A road racing game.', silent:'An unlit forgotten cabinet.'}),
    cabinet: choice('What is its cabinet style?', {upright:'A tall upright machine.', cocktail:'A low cocktail-table machine.'}),
    paint: choice('What is its colour scheme?', {purple:'Plum with gold trim.', teal:'Teal with coral trim.', black:'Charcoal with red trim.'}),

  },
  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;

    const h=a.cabinet==='upright'?1.75:0.8,colour={purple:'#725a87',teal:'#588e88',black:'#435157'}[a.paint],body=s.material(colour),dark=s.material('#1c3440'),light=s.material('#81d0bf',{emissive:'#67bbaa',emissiveIntensity:0.65});
    s.box([0.72,h,0.67],[0,h/2,0],body);s.box([0.57,0.47,0.04],[0,h-0.47,0.36],dark);s.box([0.76,0.1,0.32],[0,h-0.85,0.39],body);
    if(a.game!=='silent'){for(let i=0;i<18;i++){const x=(random()-0.5)*0.49,y=h-0.65+random()*0.35;s.box([0.017,0.017,0.004],[x,y,0.386],light);}if(a.game==='maze')for(let i=0;i<4;i++)s.box([0.42,0.013,0.004],[0,h-0.64+i*0.08,0.39],light);if(a.game==='race')for(const x of [-0.15,0.15])s.box([0.014,0.4,0.004],[x,h-0.47,0.39],light);}
    s.rod([-0.17,h-0.82,0.47],[-0.17,h-0.69,0.47],0.018,dark);s.ball([0.035,0.035,0.035],[-0.17,h-0.68,0.47],s.material('#c77b57'),12);
    for(let i=0;i<3;i++)s.cylinder(0.025,0.025,0.017,[0.08+i*0.08,h-0.787,0.47],light,12);
    s.label({space:'STAR DRIFT',maze:'NIGHT MAZE',race:'LAST LAP',silent:'INSERT COIN'}[a.game],0.65,0.18,[0,h-0.13,0.35]);

    return s.finish();
  },
});
