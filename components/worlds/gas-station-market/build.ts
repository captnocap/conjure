import * as THREE from 'three';
import { diorama, choice, noul, defineWorld } from '@conjure/kit';

export default defineWorld({
  questions: {

    era: choice('What kind of roadside market is it?', {classic:'Cream and red, a modest old highway stop.', modern:'White, teal and brushed steel.', faded:'Faded yellow and brown, a place bypassed by the highway.'}),
    floor: choice('What lies under the shelves?', {checker:'Alternating cream and dark floor tiles.', vinyl:'Pale worn vinyl tile.', concrete:'Plain service-station concrete.'}),
    sign: choice('What does the back-wall sign say?', {open:'OPEN 24 HOURS', stop:'LAST STOP', market:'FOOD / COFFEE / ICE', welcome:'WELCOME BACK'}),

  },
  build(a, context) {
    const {mood, random} = context;
    const {art: s, world} = diorama(context, {background:'#e2e4d6',floor:'#c6c3b4',width:14,depth:11,maxHeight:2.9,radius:1.35,pitch:29,yaw:24,slots:[[0,1.4],[-3.5,-1.3],[3.5,-1.3],[-3.5,2.6],[3.5,2.6],[0,-2.3]]});

    const colour={classic:'#9e4f3e',modern:'#40877f',faded:'#ab9362'}[a.era],wall=s.material('#e4deca'),trim=s.material(colour),steel=s.material('#9ba5a0',{metalness:0.45});
    for(let x=0;x<14;x++)for(let z=0;z<11;z++)if(a.floor==='checker'&&(x+z)%2===0)s.box([0.97,0.018,0.97],[x-6.5,0.015,z-5],s.material('#7c8077'));
    s.box([14,4.2,0.22],[0,2.1,-5.4],wall);s.box([0.22,4.2,10.8],[-6.9,2.1,0],wall);
    s.box([14,0.4,0.25],[0,3.45,-5.2],trim);
    s.label({open:'OPEN 24 HOURS',stop:'LAST STOP',market:'FOOD / COFFEE / ICE',welcome:'WELCOME BACK'}[a.sign],5.5,0.65,[0,3.6,-5.02],colour,'#f1e8c9');
    for(let i=0;i<4;i++){
      s.box([1.6,2.4,0.3],[-3.2+i*1.75,1.3,-5],steel);s.box([1.42,2.05,0.04],[-3.2+i*1.75,1.32,-4.83],s.material('#536e70'));
      for(let j=0;j<4;j++)s.box([1.3,0.04,0.04],[-3.2+i*1.75,0.5+j*0.5,-4.78],wall);
      s.rod([-2.57+i*1.75,1,-4.74],[-2.57+i*1.75,1.55,-4.74],0.02,steel);
    }
    for(const x of [-3,3])s.box([3.3,0.08,0.3],[x,4,-1.9],s.material('#fff8d5',{emissive:'#fff6c4',emissiveIntensity:0.65}));
    s.box([1.5,1,1],[-5.6,0.5,3.6],trim);s.box([1.65,0.1,1.1],[-5.6,1.05,3.6],steel);

    return world;
  },
});
