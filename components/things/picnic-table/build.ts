import * as THREE from 'three';
import { Sculpture, diorama, choice, score, noul, defineThing, defineWorld } from '@conjure/kit';

export default defineThing({
  questions: {

    construction: choice('What kind of picnic table is it?', {timber:'A classic A-frame timber picnic table.', metal:'A park table with tubular metal frame.', round:'A round campground table with four small seats.'}),
    finish: choice('What is the tabletop finish?', {pine:'Natural pale pine.', red:'Weather-red painted boards.', grey:'Silver-grey timber.'}),
    setting: choice('What is laid out on the table?', {empty:'An empty table.', lunch:'A loaf, cups and small plates.', game:'Playing cards and a board-game box.', camp:'A thermos, map and metal mugs.'}),
    cloth: choice('Is there a table covering?', {none:'No covering.', checked:'A red and cream checked cloth.', runner:'A narrow blue runner.'}),
    parasol: noul('Does an open parasol shade the table?'),
    basket: noul('Is a woven picnic basket tucked under one bench?'),
    inscription: noul('Are carved initials visible on the tabletop?'),
    length: score('How many people can gather here?', ['A small table for two', 'A long table for eight']),
  },
  build(a, context) {

    const s=new Sculpture(context),w=1.3+a.length*1.1,wood=s.material({pine:'#baa276',red:'#9f5e4b',grey:'#9ba398'}[a.finish]),frame=s.material(a.construction==='metal'?'#52776d':'#917951',{metalness:a.construction==='metal'?0.6:0}),cream=s.material('#e9dfc2');
    if(a.construction==='round'){s.cylinder(w*0.41,w*0.41,0.065,[0,0.77,0],wood,32);s.cylinder(0.11,0.22,0.7,[0,0.36,0],frame);for(let i=0;i<4;i++){const angle=i*Math.PI/2,x=Math.sin(angle)*w*0.56,z=Math.cos(angle)*w*0.56;s.cylinder(0.22,0.22,0.065,[x,0.45,z],wood,20);s.rod([x,0.41,z],[x,0.04,z],0.034,frame);}}
    else{for(const x of [-w*0.32,w*0.32]){s.rod([x,0.045,-0.68],[x,0.73,-0.15],0.054,frame);s.rod([x,0.045,0.68],[x,0.73,0.15],0.054,frame);s.rod([x,0.4,-0.75],[x,0.4,0.75],0.038,frame);}for(let i=0;i<5;i++)s.box([w,0.057,0.17],[0,0.77,-0.35+i*0.175],wood);for(const z of [-0.66,0.66])for(let j=0;j<2;j++)s.box([w,0.057,0.13],[0,0.45,z+(j-0.5)*0.14],wood);s.rod([-w*0.32,0.42,0],[w*0.32,0.42,0],0.036,frame);}
    if(a.cloth==='runner')s.box([w*0.95,0.007,0.24],[0,0.806,0],s.material('#718f9b'));
    if(a.cloth==='checked'){s.box([w*0.84,0.009,0.6],[0,0.807,0],cream);const red=s.material('#a35f53');for(let x=0;x<10;x++)for(let z=0;z<5;z++)if((x+z)%2===0)s.box([w*0.083,0.003,0.119],[(x-4.5)*w*0.083,0.814,(z-2)*0.12],red);}
    if(a.setting!=='empty'){for(const x of [-w*0.24,w*0.24]){s.cylinder(0.11,0.095,0.013,[x,0.824,0.13],cream);s.cylinder(0.037,0.028,0.07,[x,0.858,-0.1],cream,16);s.ring(0.02,0.005,[x+0.042,0.86,-0.1],cream).rotation.y=Math.PI/2;}
      if(a.setting==='lunch'){s.ball([0.21,0.075,0.09],[0,0.89,0],s.material('#b6874c'),16);for(let i=0;i<4;i++)s.rod([-0.14+i*0.085,0.95,-0.04],[-0.12+i*0.085,0.95,0.04],0.006,cream);}
      if(a.setting==='game'){s.box([0.28,0.07,0.2],[0,0.85,-0.08],s.material('#8b695a'));for(let i=0;i<5;i++){const card=s.box([0.06,0.004,0.1],[-0.1+i*0.052,0.827,0.15],cream);card.rotation.y=(context.random()-0.5)*0.4;s.ball([0.007,0.002,0.009],[-0.1+i*0.052,0.83,0.15],s.material('#a4574e'),8);}}
      if(a.setting==='camp'){s.cylinder(0.056,0.055,0.24,[0.1,0.94,0],s.material('#637f79'));s.cylinder(0.045,0.045,0.05,[0.1,1.085,0],frame);s.box([0.33,0.005,0.2],[-0.1,0.825,0],s.material('#b8c1a1'));}}
    if(a.parasol){s.rod([0,0.05,0],[0,2.05,0],0.022,frame);s.cylinder(0,1.13,0.44,[0,1.87,0],s.material('#d2bf8d'),8);for(let i=0;i<8;i++){const angle=i*Math.PI/4;s.rod([0,2.09,0],[Math.sin(angle)*1.13,1.65,Math.cos(angle)*1.13],0.006,frame);}}
    if(a.basket){const mat=s.material('#aa8e5c');s.box([0.38,0.25,0.25],[-w*0.2,0.125,0.25],mat);for(let i=0;i<6;i++)s.box([0.384,0.006,0.254],[-w*0.2,0.05+i*0.035,0.25],frame);s.tube([[-w*0.2-0.14,0.25,0.25],[-w*0.2-0.12,0.4,0.25],[-w*0.2+0.12,0.4,0.25],[-w*0.2+0.14,0.25,0.25]],0.012,frame);}
    if(a.inscription){const label=s.label('J + M',0.25,0.095,[w*0.3,0.82,0.1],'#78664b',{pine:'#baa276',red:'#9f5e4b',grey:'#9ba398'}[a.finish]);label.rotation.x=-Math.PI/2;}
    return s.finish();
  },
});
