import * as THREE from 'three';
import { Sculpture, diorama, choice, score, noul, defineThing, defineWorld } from '@conjure/kit';

export default defineThing({
  questions: {

    structure: choice('How is the newsstand built?', {kiosk:'A small enclosed timber kiosk with an open sales hatch.', stall:'An open metal stall beneath a striped awning.', cart:'A wheeled folding news cart.'}),
    awning: choice('What colours are on the canopy?', {red:'Cream and red stripes.', green:'Cream and forest-green stripes.', blue:'Faded blue and white stripes.'}),
    stock: choice('What dominates its stock?', {news:'Newspapers and political headlines.', magazines:'Bright fashion, music and hobby magazines.', travel:'Maps, postcards and city guides.'}),
    headline: choice('What is the lead story?', {moon:'NEW MOON TONIGHT', strike:'CITY TAKES A BREAK', weather:'SUN RETURNS', mystery:'MISSING SINCE TUESDAY'}),
    sideRack: noul('Is there an extra rotating postcard rack?'),
    shutter: choice('How open is the sales hatch?', {open:'Fully open and ready for business.', half:'A shutter halfway down over the counter.', closed:'A shutter closed except for a small delivery slot.'}),
    sign: choice('What is the kiosk called?', {corner:'CORNER NEWS', daily:'THE DAILY', press:'PRESS / MAPS / GIFTS'}),
    counter: score('How wide is the public counter?', ['A narrow one-person hatch', 'A wide busy street counter']),
  },
  build(a, context) {

    const s=new Sculpture(context),w=1.3+a.counter*0.9,wood=s.material('#a98c64'),steel=s.material('#7b8d83',{metalness:0.4}),paper=s.material('#e6dfc7'),dark=s.material('#4b5144'),accent=s.material({red:'#a65844',green:'#476b55',blue:'#638ba0'}[a.awning]);
    const baseHeight=a.structure==='cart'?0.65:0.88;s.box([w,baseHeight,0.83],[0,baseHeight/2,0],a.structure==='kiosk'?wood:steel);s.box([w+0.08,0.06,0.98],[0,baseHeight+0.03,0.07],wood);
    if(a.structure==='kiosk'){s.box([w,1.4,0.09],[0,1.47,-0.39],wood);for(const x of [-w/2,w/2])s.box([0.09,1.4,0.85],[x,1.47,0],wood);for(let i=0;i<10;i++)s.box([w,0.018,0.008],[0,0.16+i*0.06,0.424],dark);}
    else for(const x of [-w/2,w/2])s.rod([x,baseHeight,-0.37],[x,2.05,-0.37],0.025,steel);
    if(a.structure==='cart')for(const x of [-w/2+0.08,w/2-0.08])for(const z of [-0.3,0.3])s.cylinder(0.09,0.09,0.04,[x,0.07,z],dark,16).rotation.z=Math.PI/2;
    for(let i=0;i<10;i++){const piece=s.box([w/10,0.045,1.12],[(i-4.5)*w/10,2.12,0.1],i%2?paper:accent);piece.rotation.x=0.11;s.box([w/10,0.18,0.045],[(i-4.5)*w/10,1.99,0.66],i%2?paper:accent);}
    s.label({corner:'CORNER NEWS',daily:'THE DAILY',press:'PRESS / MAPS / GIFTS'}[a.sign],w*0.85,0.21,[0,1.98,0.69],'#e9e2c9',{red:'#9b4937',green:'#476b55',blue:'#557b90'}[a.awning]);
    const paints=['#af715a','#798f8a','#c0a763','#829aa6'].map(c=>s.material(c));
    for(let row=0;row<2;row++){const y=0.97+row*0.31;s.box([w*0.9,0.06,0.18],[0,y,0.43],steel);for(let col=0;col<Math.floor(w/0.23);col++){const x=-w*0.39+col*0.23;const cover=s.box([0.19,0.26,0.017],[x,y+0.14,0.46],a.stock==='news'?paper:paints[(row+col)%4]);cover.rotation.z=(context.random()-0.5)*0.05;if(a.stock==='news'){s.box([0.15,0.008,0.003],[x,y+0.2,0.471],dark);for(let j=0;j<4;j++)s.box([0.14,0.003,0.003],[x,y+0.13-j*0.014,0.471],dark);}else{s.box([0.11,0.1,0.004],[x,y+0.14,0.473],paper);s.box([0.15,0.025,0.004],[x,y+0.24,0.473],dark);}}}
    for(let i=0;i<3;i++)s.box([0.31,0.025,0.24],[-w*0.24,baseHeight+0.08+i*0.025,0.06],paper);
    s.label({moon:'NEW MOON TONIGHT',strike:'CITY TAKES A BREAK',weather:'SUN RETURNS',mystery:'MISSING SINCE TUESDAY'}[a.headline],w*0.75,0.12,[0,0.54,0.425]);
    if(a.shutter!=='open'){const h=a.shutter==='closed'?0.83:0.4;const mat=s.material('#9a9d88');s.box([w*0.9,h,0.027],[0,1.83-h/2,0.42],mat);for(let j=0;j<Math.floor(h/0.08);j++)s.box([w*0.88,0.01,0.008],[0,1.79-j*0.08,0.44],steel);}
    if(a.sideRack){const x=w/2+0.29;s.cylinder(0.18,0.21,0.055,[x,0.04,0],steel);s.rod([x,0.05,0],[x,1.55,0],0.018,steel);for(let row=0;row<3;row++)for(let side=0;side<4;side++){const phi=side*Math.PI/2;const mesh=s.box([0.17,0.2,0.017],[x+Math.sin(phi)*0.13,0.67+row*0.29,Math.cos(phi)*0.13],paints[(row+side)%4]);mesh.rotation.y=phi;s.rod([x,0.56+row*0.29,0],[x+Math.sin(phi)*0.18,0.56+row*0.29,Math.cos(phi)*0.18],0.009,steel);}}
    return s.finish();
  },
});
