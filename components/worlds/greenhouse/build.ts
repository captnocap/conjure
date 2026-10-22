import * as THREE from 'three';
import { diorama, choice, noul, defineWorld } from '@conjure/kit';

export default defineWorld({
  questions: {

    frame: choice('What supports the greenhouse?', {iron:'Dark painted iron ribs.', timber:'Warm timber ribs.', white:'White painted metal ribs.'}),
    glazing: choice('How much glass remains?', {clear:'Clear panes along the back.', misted:'Pale misted glass.', skeleton:'An open skeleton with no glass.'}),
    season: choice('What lies on the floor?', {pots:'A few empty terracotta pots.', tools:'Trays and gardening tools.', leaves:'Scattered fallen leaves.'}),

  },
  build(a, context) {
    const {mood, random} = context;
    const {art: s, world} = diorama(context, {background:'#e3e7d4',floor:'#b9bbaa',width:13,depth:10,maxHeight:3,radius:1.3,pitch:29});

    const frame=s.material({iron:'#50665d',timber:'#a48a61',white:'#d8ddd3'}[a.frame]);
    for(let i=0;i<6;i++){const x=-6+i*2.4;s.rod([x,0,-4.6],[x,4,-4.6],0.055,frame);s.rod([x,4,-4.6],[x,5.2,-1],0.055,frame);}
    s.rod([-6,5.2,-1],[6,5.2,-1],0.07,frame);s.rod([-6,2,-4.6],[6,2,-4.6],0.055,frame);
    if(a.glazing!=='skeleton')s.box([12,3.8,0.025],[0,2,-4.7],s.material(a.glazing==='misted'?'#b4cbc0':'#a1b9ac',{transparent:true,opacity:0.28,depthWrite:false}));
    for(let i=0;i<7;i++){const x=-5.4+i*1.8;
      if(a.season==='pots')s.cylinder(0.25,0.17,0.35,[x,0.175,-4],s.material('#ad765a'));
      if(a.season==='tools')s.box([0.65,0.12,0.45],[x,0.06,-4],frame);
      if(a.season==='leaves'){const leaf=s.ball([0.23,0.015,0.08],[x,0.025,3.8],s.material('#ba9c58'),8);leaf.rotation.y=random()*3;}
    }

    return world;
  },
});
