import * as THREE from 'three';
import { Sculpture, diorama, choice, score, noul, defineThing, defineWorld } from '@conjure/kit';

export default defineWorld({
  questions: {

    room: choice('What kind of music room is it?', {practice:'A practical rehearsal room with sound panels.', parlour:'A warm domestic music parlour.', listening:'A dedicated hi-fi listening room.'}),
    floor: choice('What is on the floor?', {boards:'Honey-coloured timber floorboards.', rug:'A large geometric woven rug.', studio:'Grey studio flooring with cable channels.'}),
    wall: choice('What are the walls like?', {panels:'Square sage acoustic panels.', curtains:'Deep rust curtains over the back wall.', timber:'Warm vertical timber slats.'}),
    window: choice('What is the high window like?', {day:'A broad pale window.', night:'Dark glass with a few reflected room lights.', covered:'A partly drawn heavy curtain.'}),
    shelves: choice('What is collected on the shelves?', {records:'Rows of vinyl records.', scores:'Music scores and bound notebooks.', tapes:'Cassette tapes and numbered recording boxes.'}),
    notice: choice('What is on the wall notice?', {practice:'PRACTICE / LISTEN / REPEAT', session:'SESSION AT 8', quiet:'LET THE ROOM BREATHE', song:'ONE MORE SONG'}),
    mic: noul('Is a microphone and stand set up in the practice corner?'),
    stool: noul('Is a simple performer stool set in front of the platform?'),
  },
  build(a, context) {

    const {art:s,world}=diorama(context,{background:'#e1dccb',floor:a.floor==='studio'?'#a7b0a3':'#b69c76',width:10.5,depth:9,pitch:31,yaw:24,maxHeight:2.6,radius:1.15,slots:[[0,1.35],[-2.8,1],[2.8,1],[-2.4,-1.6],[2.4,-1.6],[0,3.2]]});
    const wood=s.material('#9b855c'),wall=s.material('#ddd5ba'),dark=s.material('#4c6154'),metal=s.material('#a5b1a3',{metalness:0.5}),paper=s.material('#e4dbc0');
    s.box([10.5,3.8,0.16],[0,1.9,-4.42],wall);s.box([0.16,3.8,8.85],[-5.17,1.9,0],wall);
    if(a.floor==='boards')for(let i=0;i<26;i++)s.box([0.008,0.01,8.8],[-5+i*0.4,0.011,0],dark);
    if(a.floor==='rug'){s.box([6.2,0.025,4.5],[0,0.018,0.66],s.material('#a98e70'));for(let row=0;row<4;row++)for(let col=0;col<6;col++){const tile=s.box([0.53,0.008,0.53],[(col-2.5)*0.83,0.039,(row-1.5)*0.83+0.66],s.material((row+col)%2?'#789285':'#c3b78e'));tile.rotation.y=Math.PI/4;}}
    if(a.floor==='studio')for(const x of [-4.5,4.5])s.box([0.035,0.009,8.4],[x,0.011,0],dark);
    if(a.wall==='panels')for(let row=0;row<2;row++)for(let col=0;col<7;col++){s.box([1.12,1.11,0.065],[(col-3)*1.35,1.1+row*1.26,-4.31],s.material((row+col)%2?'#7f9680':'#94a58a'));for(let i=0;i<4;i++)s.box([0.016,0.95,0.009],[(col-3)*1.35-0.39+i*0.26,1.1+row*1.26,-4.272],dark);}
    if(a.wall==='curtains')for(let i=0;i<27;i++)s.cylinder(0.09,0.09,3.42,[-4.88+i*0.376,1.82,-4.26],s.material(i%2?'#a47a65':'#b18a73'),12);
    if(a.wall==='timber')for(let i=0;i<34;i++)s.box([0.07,3.4,0.035],[-4.94+i*0.3,1.88,-4.307],wood);
    s.box([3.12,1.07,0.023],[-5.072,2.91,-0.22],s.material(a.window==='day'?'#a0b8ad':'#6a8581')).rotation.y=Math.PI/2;
    for(const z of [-1.8,-0.22,1.37])s.box([0.065,1.18,0.05],[-5.025,2.91,z],wood);if(a.window==='covered')for(let i=0;i<7;i++)s.cylinder(0.085,0.085,1.1,[-5.0,2.91,-1.65+i*0.15],s.material('#8e9176'),12);
    s.box([3.3,0.13,1.45],[2.86,0.069,-3.45],wood);
    const colors=['#b39568','#7c958d','#9d806c','#81979d'];
    for(let row=0;row<3;row++){const y=0.3+row*0.52;s.box([3.2,0.036,0.35],[-2.75,y,-3.93],wood);for(let i=0;i<18;i++){const h=a.shelves==='tapes'?0.15:0.28;s.box([a.shelves==='records'?0.035:0.092,h,0.22],[-4.2+i*0.167,y+h/2+0.02,-3.91],s.material(colors[(i+row)%4]));}}for(const x of [-4.36,-1.14])s.box([0.035,1.64,0.36],[x,0.9,-3.93],wood);
    const sign=s.label({practice:'PRACTICE / LISTEN / REPEAT',session:'SESSION AT 8',quiet:'LET THE ROOM BREATHE',song:'ONE MORE SONG'}[a.notice],3.61,0.37,[0,3.34,-4.235], '#566b50','#e2d8b8');
    if(a.mic){const x=3.1,z=-3.07;for(let i=0;i<3;i++){const phi=i*Math.PI*2/3;s.rod([x,0.2,z],[x+Math.sin(phi)*0.34,0.17,z+Math.cos(phi)*0.34],0.013,metal);}s.rod([x,0.2,z],[x,1.55,z],0.018,metal);s.rod([x,1.55,z],[x-0.33,1.71,z+0.17],0.011,metal);s.ball([0.028,0.029,0.07],[x-0.35,1.71,z+0.2],dark,16);s.tube([[x-0.34,1.71,z+0.21],[x,1.27,z],[x,0.2,z],[x-0.6,0.15,z+0.3]],0.005,dark);}
    if(a.stool){s.cylinder(0.26,0.26,0.06,[2.94,0.65,-2.28],s.material('#8a795b'),24);for(let i=0;i<3;i++){const phi=i*Math.PI*2/3;s.rod([2.94+Math.sin(phi)*0.27,0.15,-2.28+Math.cos(phi)*0.27],[2.94+Math.sin(phi)*0.13,0.61,-2.28+Math.cos(phi)*0.13],0.02,wood);}}
    if(a.room==='listening')for(const x of [-4.4,4.4]){s.box([0.54,1.25,0.42],[x,0.64,-1.8],wood);s.box([0.49,1.16,0.017],[x,0.64,-1.579],dark);for(const y of [0.4,0.8])s.ring(0.16,0.022,[x,y,-1.562],metal);}
    if(a.room==='parlour'){s.box([1.32,0.018,0.83],[-2.49,0.02,2.59],s.material('#9a7b65'));s.label('LISTEN CLOSELY',0.78,0.12,[-2.49,0.036,2.82]).rotation.x=-Math.PI/2;}
    return world;
  },
});
