import * as THREE from 'three';
import { Sculpture, diorama, choice, score, noul, defineThing, defineWorld } from '@conjure/kit';

export default defineWorld({
  questions: {

    market: choice('What kind of market lane is it?', {food:'A food market with colourful carts and steam pots.', flea:'A flea market of books, records and curios.', flower:'An evening flower and produce market.'}),
    awnings: choice('What canopy style runs along the stalls?', {striped:'Cream and red striped cloth awnings.', patchwork:'Patchwork blue, ochre and sage canvas.', plain:'Plain dark green canvas roofs.'}),
    ground: choice('What is beneath the market stalls?', {cobble:'Small irregular cobbles.', paving:'Pale square paving slabs.', asphalt:'Dark street asphalt with old lane markings.'}),
    lanterns: choice('What hangs over the lane?', {round:'Round paper lanterns.', bulbs:'Bare warm bulbs strung between poles.', flags:'Triangular festival bunting.'}),
    gate: choice('What does the entry banner say?', {market:'NIGHT MARKET', late:'OPEN AFTER DARK', feast:'EAT / MEET / REPEAT', wonders:'SMALL WONDERS'}),
    closing: choice('How are the stalls trading?', {open:'Every stall is open.', mixed:'One stall has its canvas shutter down.', closing:'Stalls are closing with folded goods left out.'}),
    crates: noul('Are spare crates stacked at the roadside edge?'),
    shrine: noul('Is a small candle-lit niche set into the back wall?'),
  },
  build(a, context) {

    const {art:s,world}=diorama(context,{background:'#b5bec0',floor:a.ground==='asphalt'?'#747f78':'#b9b8a7',width:13,depth:11,pitch:32,yaw:21,maxHeight:3,radius:1.2,slots:[[0,2.0],[-2.7,1.0],[2.7,1.0],[-3.2,3.8],[3.2,3.8],[0,-1.2]]});
    const paper=s.material('#ded5b7'),wood=s.material('#9c825b'),dark=s.material('#4e6659'),metal=s.material('#9ea99a',{metalness:0.4}),lantern=s.material('#dcc28a',{emissive:'#d1b474',emissiveIntensity:0.6}),colors=['#a7614b','#79968e','#b19a65'];
    if(a.ground==='paving')for(let x=0;x<13;x++)s.box([0.009,0.007,10.8],[x-6,0.008,0],dark);if(a.ground==='paving')for(let z=0;z<11;z++)s.box([12.8,0.007,0.009],[0,0.008,z-5],dark);
    if(a.ground==='cobble'){const points=[];for(let x=0;x<24;x++)for(let z=0;z<20;z++)points.push({at:[x*0.53-6.12+(z%2)*0.2,0.022,z*0.54-5.12] as const,size:0.43+context.random()*0.06,color:(x+z)%3===0?'#a5aa9b':'#bebdaf'});s.scatter(new THREE.BoxGeometry(1,0.12,0.95),paper,points);}
    if(a.ground==='asphalt')for(let i=0;i<6;i++)s.box([0.09,0.007,0.72],[0,0.008,-4.4+i*1.8],paper);
    s.box([13,2.8,0.15],[0,1.4,-5.41],s.material('#b7b69f'));
    for(let i=0;i<4;i++){const x=(i-1.5)*3.0,c=s.material(a.awnings==='plain'?'#58725e':colors[i%3]);s.box([2.45,0.83,1.06],[x,0.42,-4.15],wood);s.box([2.61,0.055,1.19],[x,0.88,-4.1],paper);for(const xx of [x-1.2,x+1.2])s.rod([xx,0,-4.4],[xx,2.48,-4.4],0.023,metal);for(let j=0;j<8;j++){const roof=s.box([0.325,0.05,1.7],[x+(j-3.5)*0.32,2.42,-4.05],a.awnings==='striped'?(j%2?paper:s.material('#a56551')):c);roof.rotation.x=0.17;s.box([0.325,0.22,0.03],[x+(j-3.5)*0.32,2.19,-3.22],a.awnings==='striped'?(j%2?paper:c):c);}
      s.label(a.market==='food'?['NOODLES','HOT SOUP','BAKERY','TEA'][i]:a.market==='flea'?['BOOKS','RECORDS','CURIOS','REPAIRS'][i]:['FLOWERS','FRUIT','HERBS','ROOTS'][i],1.86,0.2,[x,2.15,-3.195]);
      if(a.closing==='closing'||(a.closing==='mixed'&&i===1)){s.box([2.45,1.07,0.019],[x,1.45,-3.49],c);continue;}
      for(let j=0;j<6;j++){const px=x+(j-2.5)*0.29;if(a.market==='food'){s.cylinder(0.09,0.082,0.08,[px,0.965,-4],s.material(j%2?'#bca974':'#889c8b'),16);if(j%2===0)s.cylinder(0.12,0.12,0.14,[px,1.02,-4.42],metal,20);}else if(a.market==='flea'){s.box([0.19,0.035+0.02*(j%3),0.25],[px,0.932,-4.05],s.material(colors[j%3]));}else if(a.market==='flower'){s.cylinder(0.08,0.055,0.18,[px,1.0,-4.04],metal,12);for(let k=0;k<3;k++){const y=1.28+context.random()*0.13;s.rod([px,1.05,-4.04],[px+(k-1)*0.055,y,-4.04],0.004,dark);s.ball([0.045,0.03,0.035],[px+(k-1)*0.055,y,-4.04],s.material(colors[(j+k)%3]),10);}}}
    }
    for(const x of [-5.55,5.55])s.rod([x,0,3.92],[x,3.6,3.92],0.036,metal);s.tube([[-5.55,3.52,3.92],[0,3.1,3.92],[5.55,3.52,3.92]],0.01,dark);
    for(let i=0;i<11;i++){const x=(i-5)*1.02,y=3.13+0.37*(x/5.55)**2;if(a.lanterns==='round'){s.ball([0.19,0.23,0.19],[x,y-0.25,3.92],lantern,16);s.cylinder(0.065,0.065,0.02,[x,y-0.48,3.92],dark,12);}else if(a.lanterns==='bulbs')s.ball([0.048,0.069,0.048],[x,y-0.1,3.92],lantern,12);else{const flag=s.cylinder(0,0.16,0.3,[x,y-0.17,3.92],s.material(colors[i%3]),3);flag.rotation.z=Math.PI;flag.rotation.y=Math.PI/2;}}
    s.label({market:'NIGHT MARKET',late:'OPEN AFTER DARK',feast:'EAT / MEET / REPEAT',wonders:'SMALL WONDERS'}[a.gate],4.3,0.43,[0,3.25,-5.3], '#eee4c3','#6d8171');
    if(a.crates)for(let i=0;i<3;i++){s.box([0.65,0.38,0.48],[-5.65,0.2+i*0.37,1.2],wood);for(let j=0;j<3;j++)s.box([0.55,0.025,0.007],[-5.65,0.08+i*0.37+j*0.11,1.448],dark);}
    if(a.shrine){s.box([0.81,1.16,0.09],[5.83,1.63,-5.28],dark);s.box([0.91,0.065,0.35],[5.83,1.04,-5.1],wood);for(let i=0;i<3;i++){s.cylinder(0.024,0.024,0.16,[5.64+i*0.19,1.15,-5.0],paper,12);s.ball([0.012,0.022,0.012],[5.64+i*0.19,1.252,-5],lantern,10);}}
    return world;
  },
});
