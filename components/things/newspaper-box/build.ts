import * as THREE from 'three';
import { Sculpture, diorama, choice, score, noul, defineThing, defineWorld } from '@conjure/kit';

export default defineThing({
  questions: {

    format: choice('What is the newspaper dispenser shape?', {pedestal:'A tall box on a narrow pedestal.', cabinet:'A square cabinet standing on four legs.', free:'A low open free-paper bin.'}),
    color: choice('What colour is the box painted?', {red:'Newsroom red.', blue:'Civic blue.', yellow:'Ochre yellow.'}),
    edition: choice('What is printed on the lead page?', {daily:'DAILY NEWS', local:'THE NEIGHBOUR', evening:'EVENING EDITION', future:'TOMORROW TODAY'}),
    headline: choice('What is the headline?', {home:'EVERYONE COMES HOME', rain:'RAIN ENDS AT LAST', lost:'ONE STREET MISSING', game:'THE CITY WINS'}),
    door: choice('How is the paper door positioned?', {closed:'Closed behind a glass panel.', cracked:'Pulled slightly outward.', open:'Swung open for a reader.'}),
    sold: noul('Is the dispenser sold out?'),
    stickers: noul('Are small concert stickers attached to its side?'),
    stack: score('If newspapers remain, how thick is the stack?', ['A single last newspaper', 'A thick stack of the morning edition']),
  },
  build(a, context) {

    const s=new Sculpture(context),paint=s.material({red:'#ac5348',blue:'#537e9c',yellow:'#c0a454'}[a.color],{metalness:0.3}),dark=s.material('#39453e'),paper=s.material('#e9e4cf'),chrome=s.material('#b4bcb1',{metalness:0.6});
    const y=a.format==='free'?0.58:0.97,w=a.format==='free'?0.7:0.53;
    if(a.format==='pedestal'){s.box([0.48,0.055,0.47],[0,0.035,0],paint);s.box([0.17,0.65,0.22],[0,0.37,-0.06],paint);}else for(const x of [-w/2+0.04,w/2-0.04])for(const z of [-0.18,0.18])s.box([0.055,y-0.25,0.055],[x,(y-0.25)/2,z],paint);
    s.box([w,0.61,0.055],[0,y,-0.24],paint);for(const x of [-w/2,w/2])s.box([0.04,0.61,0.49],[x,y,0],paint);s.box([w,0.045,0.5],[0,y-0.28,0],paint);s.box([w+0.055,0.045,0.54],[0,y+0.32,0],paint);
    s.box([w*0.95,0.14,0.036],[0,y+0.2,0.255],paint);s.label({daily:'DAILY NEWS',local:'THE NEIGHBOUR',evening:'EVENING EDITION',future:'TOMORROW TODAY'}[a.edition],w*0.86,0.1,[0,y+0.2,0.277],'#f0e7cc',{red:'#ac5348',blue:'#537e9c',yellow:'#af9447'}[a.color]);
    const angle=a.door==='open'?0.78:a.door==='cracked'?0.24:0;
    const door=new THREE.Group();door.position.set(-w/2,y-0.05,0.272);s.root.add(door);for(const [size,at] of [[[w,0.04,0.028],[w/2,0.22,0]],[[w,0.04,0.028],[w/2,-0.21,0]],[[0.04,0.45,0.028],[0.02,0,0]],[[0.04,0.45,0.028],[w-0.02,0,0]]] as const){const mesh=new THREE.Mesh(new THREE.BoxGeometry(size[0],size[1],size[2]),paint);mesh.position.set(at[0],at[1],at[2]);mesh.castShadow=true;door.add(mesh);}const glass=new THREE.Mesh(new THREE.BoxGeometry(w-0.07,0.38,0.014),s.material('#93b1ad',{transparent:true,opacity:0.3}));glass.position.set(w/2,0,0);door.add(glass);door.rotation.y=-angle;
    if(!a.sold){const h=0.025+a.stack*0.13;s.box([w*0.84,h,0.34],[0,y-0.23+h/2,-0.015],paper);for(let i=0;i<5;i++)s.box([w*0.84,0.002,0.33],[0,y-0.21+i*h/6,-0.014],s.material('#b9b8a4'));s.box([w*0.84,0.36,0.008],[0,y-0.06,0.214],paper);s.label({home:'EVERYONE COMES HOME',rain:'RAIN ENDS AT LAST',lost:'ONE STREET MISSING',game:'THE CITY WINS'}[a.headline],w*0.74,0.075,[0,y+0.04,0.221]);s.box([w*0.65,0.11,0.005],[0,y-0.065,0.225],s.material('#808b7b'));for(let i=0;i<4;i++)s.box([w*0.7,0.003,0.004],[0,y-0.145-i*0.014,0.227],dark);}else s.label('SOLD OUT',w*0.78,0.13,[0,y-0.05,-0.2]);
    s.rod([w*0.31,y-0.08,0.295],[w*0.31,y+0.05,0.295],0.013,chrome);s.box([0.06,0.07,0.009],[w*0.36,y+0.21,0.282],chrome);s.box([0.034,0.006,0.007],[w*0.36,y+0.225,0.29],dark);
    if(a.stickers)for(let i=0;i<3;i++){const sticker=s.label(['LIVE','FRI 8PM','RADIO'][i],0.16,0.09,[w/2+0.024,y-0.14+i*0.11,0],i%2?'#eee3c2':'#483b46',i%2?'#8a645b':'#bd9c5c');sticker.rotation.y=Math.PI/2;sticker.rotation.z=(context.random()-0.5)*0.1;}
    return s.finish();
  },
});
