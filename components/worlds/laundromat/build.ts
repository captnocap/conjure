import * as THREE from 'three';
import { Sculpture, diorama, choice, score, noul, defineThing, defineWorld } from '@conjure/kit';

export default defineWorld({
  questions: {

    building: choice('What kind of laundromat is it?', {old:'An older mint-and-cream neighbourhood laundry.', modern:'A white and stainless self-service laundry.', roadside:'A faded roadside wash house.'}),
    machines: choice('What kind of machines line the back wall?', {round:'A row of round-door front loaders.', stacked:'Two levels of compact washer and dryer doors.', giant:'Three oversized commercial drum washers.'}),
    floor: choice('What is the laundry floor?', {tiles:'Small blue-grey square tiles.', checker:'Cream and sage checker tiles.', concrete:'A plain pale concrete floor.'}),
    sign: choice('What does the large sign say?', {wash:'WASH / DRY / FOLD', night:'OPEN UNTIL MIDNIGHT', lonely:'SPIN CYCLE', clean:'A FRESH START'}),
    folding: choice('What is on the folding counter?', {empty:'An empty steel folding counter.', towels:'Neat piles of folded towels.', scattered:'Loose clothes awaiting collection.'}),
    vending: noul('Is there a little detergent vending box on the wall?'),
    notice: choice('What is the community notice?', {lost:'LOST SOCKS / FOUND FRIENDS', quiet:'PLEASE EMPTY YOUR POCKETS', jobs:'LOCAL JOBS & ROOMS'}),
    window: choice('What is visible through the side window?', {street:'A pale street and passing lights.', frosted:'Frosted glass with a laundry logo.', shutters:'Closed striped shutters.'}),
  },
  build(a, context) {

    const {art:s,world}=diorama(context,{background:'#e1e7dc',floor:'#c7cdc0',width:11,depth:8.5,pitch:31,yaw:22,maxHeight:2.4,radius:1.13,slots:[[0,1.2],[-3.1,1.6],[3.1,1.6],[-2,-1.1],[2,-1.1],[0,3.1]]});
    const colour={old:'#83a399',modern:'#a5b5b2',roadside:'#ad9c6b'}[a.building],wall=s.material('#e2dfca'),trim=s.material(colour),metal=s.material('#acb9b2',{metalness:0.6}),glass=s.material('#526e72'),dark=s.material('#4d5d53');
    s.box([11,3.7,0.16],[0,1.85,-4.17],wall);s.box([0.16,3.7,8.35],[-5.42,1.85,0],wall);s.box([11,0.23,0.18],[0,1.08,-4.05],trim);
    if(a.floor!=='concrete')for(let x=0;x<14;x++)for(let z=0;z<11;z++){const alt=(x+z)%2===0;if(a.floor==='checker'&&alt)s.box([0.76,0.009,0.75],[x*0.78-5.07,0.011,z*0.76-3.8],trim);if(a.floor==='tiles'){s.box([0.008,0.011,8.4],[x*0.78-5.4,0.012,0],metal);if(x===0)s.box([10.8,0.011,0.008],[0,0.012,z*0.76-4.1],metal);}}
    const count=a.machines==='giant'?3:5,mw=a.machines==='giant'?2.4:1.4,levels=a.machines==='stacked'?2:1;
    for(let i=0;i<count;i++)for(let level=0;level<levels;level++){const x=(i-(count-1)/2)*(mw+0.1),h=a.machines==='giant'?1.8:1.12,y=h/2+0.15+level*1.25;s.box([mw,h,0.74],[x,y,-3.68],metal);s.ring(mw*0.31,0.07,[x,y-0.05,-3.282],trim);s.ball([mw*0.27,mw*0.27,0.015],[x,y-0.05,-3.27],glass,24);s.box([mw*0.6,0.1,0.019],[x,y+h*0.36,-3.286],dark);s.label('WASH '+String(i+1+level*count).padStart(2,'0'),mw*0.54,0.072,[x,y+h*0.36,-3.27],'#e9e9c6','#4d5d53');s.ball([0.036,0.036,0.009],[x+mw*0.35,y+h*0.35,-3.269],trim,12);}
    s.label({wash:'WASH / DRY / FOLD',night:'OPEN UNTIL MIDNIGHT',lonely:'SPIN CYCLE',clean:'A FRESH START'}[a.sign],6,0.45,[0,3.26,-4.066],colour,'#eee9cf');
    s.box([0.88,0.87,2.9],[-4.79,0.44,1.28],trim);s.box([1.02,0.06,3.03],[-4.74,0.91,1.28],metal);
    if(a.folding!=='empty')for(let i=0;i<5;i++){const z=0.26+i*0.48,y=0.95;if(a.folding==='towels')for(let j=0;j<3;j++)s.box([0.52,0.065,0.33],[-4.72,y+j*0.065,z],s.material(i%2?'#ded9c3':'#8fa49a'));else{s.ball([0.27,0.06,0.24],[-4.74+(context.random()-0.5)*0.15,y,z],s.material(['#a78072','#829992','#b5ab7c'][i%3]),12);}}
    s.box([0.018,1.46,2.53],[-5.323,2.45,0.8],s.material(a.window==='street'?'#93aca8':'#bac7b8'));for(const z of [-0.47,0.8,2.07])s.box([0.03,1.58,0.05],[-5.3,2.45,z],metal);if(a.window==='shutters')for(let i=0;i<11;i++)s.box([0.039,0.07,2.53],[-5.28,1.76+i*0.13,0.8],trim);
    if(a.window==='frosted'){const l=s.label('LAUNDRY',1.5,0.28,[-5.27,2.5,0.8],colour,'#d2d8c3');l.rotation.y=Math.PI/2;}
    if(a.vending){s.box([0.1,0.95,0.67],[-5.26,1.73,-1.96],trim);const l=s.label('SOAP / 50c',0.57,0.19,[-5.2,2.05,-1.96]);l.rotation.y=Math.PI/2;for(let j=0;j<3;j++)s.box([0.028,0.07,0.12],[-5.18,1.64,-2.13+j*0.17],dark);}
    s.box([1.23,0.79,0.06],[4.43,2.43,-4.06],s.material('#a48c64'));s.label({lost:'LOST SOCKS / FOUND FRIENDS',quiet:'PLEASE EMPTY YOUR POCKETS',jobs:'LOCAL JOBS & ROOMS'}[a.notice],1.13,0.6,[4.43,2.43,-4.016]);
    for(const x of [-1.3,0,1.3]){s.box([0.95,0.075,0.45],[x,0.47,3.55],trim);for(const dx of [-0.32,0.32])s.rod([x+dx,0,3.55],[x+dx,0.45,3.55],0.018,metal);}
    return world;
  },
});
