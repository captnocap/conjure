import * as THREE from 'three';
import { diorama, choice, noul, defineWorld } from '@conjure/kit';

export default defineWorld({
  questions: {

    tiles: choice('What is the tile palette?', {mint:'Mint green and cream.', white:'White tile with charcoal grout.', cobalt:'Deep cobalt and pale blue.'}),
    window: choice('What kind of window admits light?', {square:'One high square window.', strips:'A row of small clerestory windows.', none:'A windowless interior.'}),
    fixtures: choice('What is built into the room?', {pipes:'Exposed industrial pipes.', bench:'A low bench against the back wall.', drain:'Only a central floor drain.'}),

  },
  build(a, context) {
    const {mood, random} = context;
    const {art: s, world} = diorama(context, {background:'#e4e9e2',floor:'#adb6ad',width:12,depth:10,maxHeight:3,radius:1.2,pitch:32});

    const tile=s.material({mint:'#adc7b4',white:'#dfdfd4',cobalt:'#7898b3'}[a.tiles]),grout=s.material('#7c8b86');
    s.box([12,4,0.15],[0,2,-5],grout);s.box([0.15,4,10],[-6,2,0],grout);
    for(let x=0;x<15;x++)for(let y=0;y<5;y++)s.box([0.77,0.77,0.03],[-5.6+x*0.8,0.4+y*0.8,-4.9],tile);
    if(a.window!=='none')for(let i=0;i<(a.window==='strips'?4:1);i++)s.box([a.window==='strips'?1.2:2.4,1,0.05],[a.window==='strips'?-3+i*2:0,2.9,-4.82],s.material('#e4ecdc',{emissive:'#c5ddd5',emissiveIntensity:0.2}));
    if(a.fixtures==='pipes'){s.rod([-5.7,0.2,-4.6],[-5.7,3.65,-4.6],0.065,grout);s.rod([-5.7,3.65,-4.6],[5.7,3.65,-4.6],0.065,grout);}
    if(a.fixtures==='bench')s.box([8,0.3,0.65],[0,0.55,-4],s.material('#ac9576'));
    s.box([0.6,0.018,0.6],[0,0.015,3.5],s.material('#5b6a68'));

    return world;
  },
});
