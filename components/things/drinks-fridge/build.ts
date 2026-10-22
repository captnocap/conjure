import * as THREE from 'three';
import { Sculpture, choice, score, noul, mix, defineThing } from '@conjure/kit';

export default defineThing({
  questions: {

    doors: choice('How wide is the cooler?', {single:'A narrow single-door fridge.', double:'A two-door drinks wall.'}),
    stock: choice('What is kept cold?', {soda:'Rows of coloured soda bottles.', milk:'Pale milk and juice cartons.', water:'Clear-looking water bottles.', empty:'Mostly empty shelves.'}),
    header: choice('What is written on the cooler?', {cold:'COLD DRINKS', fresh:'FRESH DAILY', ice:'ICE COLD'}),

  },
  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;

    const w=a.doors==='double'?1.8:0.95,body=s.material('#deded1'),trim=s.material('#667678',{metalness:0.5}),inside=s.material('#a6babc');
    s.box([w,1.9,0.72],[0,0.95,0],body);s.box([w-0.15,1.43,0.045],[0,1.02,0.377],inside);
    for(let j=0;j<4;j++){const y=0.42+j*0.34;s.box([w-0.14,0.025,0.27],[0,y,0.41],body);
      for(let i=0;i<(a.stock==='empty'?1:Math.floor(w*7));i++){const x=-w/2+0.15+i*0.135,colour=a.stock==='milk'?'#e6ded0':a.stock==='water'?'#aacbd0':['#aa6951','#83a382','#bb9b5e'][i%3],mat=s.material(colour);
        if(a.stock==='milk')s.box([0.1,0.23,0.1],[x,y+0.13,0.4],mat);else{s.cylinder(0.045,0.05,0.19,[x,y+0.13,0.4],mat,10);s.cylinder(0.023,0.025,0.05,[x,y+0.25,0.4],body,8);}
      }
    }
    for(let i=0;i<(a.doors==='double'?2:1);i++){const x=a.doors==='double'?(i-0.5)*0.85:0;s.box([a.doors==='double'?0.82:0.81,1.43,0.008],[x,1.02,0.57],s.material('#c3dbe0',{transparent:true,opacity:0.15,depthWrite:false}));s.rod([x+0.28,0.8,0.61],[x+0.28,1.25,0.61],0.022,trim);}
    for(let i=0;i<7;i++)s.box([w-0.14,0.01,0.03],[0,0.08+i*0.027,0.38],trim);
    s.label({cold:'COLD DRINKS',fresh:'FRESH DAILY',ice:'ICE COLD'}[a.header],w-0.1,0.2,[0,1.76,0.38]);

    return s.finish();
  },
});
