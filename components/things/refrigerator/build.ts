import * as THREE from 'three';
import { Sculpture, diorama, choice, score, noul, defineThing, defineWorld } from '@conjure/kit';

export default defineThing({
  questions: {

    style: choice('What form is the refrigerator?', {retro:'A rounded single-door vintage fridge.', topfreezer:'A tall fridge with a smaller freezer above.', double:'A wide side-by-side refrigerator.'}),
    enamel: choice('What colour is its enamel?', {cream:'Warm cream.', mint:'Pale mint green.', steel:'Brushed stainless steel.'}),
    door: choice('How is the main door positioned?', {closed:'Closed, covered with domestic traces.', ajar:'Open a few inches.', open:'Wide open with its shelves exposed.'}),
    stock: choice('What is inside?', {family:'Milk, jars, vegetables and leftovers.', sparse:'A carton, a lemon and an almost empty shelf.', party:'Bottles, a cake and prepared snacks.'}),
    magnets: choice('What is held on the door?', {none:'No magnets or notes.', notes:'Shopping list and a tiny appointment note.', photos:'Two family photos and colourful magnets.', map:'A postcard from far away.'}),
    top: choice('What sits on top?', {empty:'Nothing on top.', cereal:'Two cereal boxes.', plant:'A small houseplant.'}),
    ice: noul('Does it have an ice dispenser in the second door?'),
    height: score('How tall is the refrigerator?', ['A modest compact apartment fridge', 'A large family refrigerator']),
  },
  build(a, context) {

    const s=new Sculpture(context),h=1.45+a.height*0.55,w=a.style==='double'?0.94:0.68,d=0.63,color={cream:'#ddd6bb',mint:'#aec6b4',steel:'#aab7b0'}[a.enamel],body=s.material(color,{metalness:a.enamel==='steel'?0.7:0.15}),inside=s.material('#e6e4d2'),dark=s.material('#526157'),steel=s.material('#b3bcb0',{metalness:0.65});
    s.box([w,0.08,d],[0,0.065,0],dark);s.box([w, h-0.1,0.04],[0,h/2+0.05,-d/2],body);for(const x of [-w/2,w/2])s.box([0.045,h-0.1,d],[x,h/2+0.05,0],body);s.box([w,0.06,d],[0,h+0.02,0],body);s.box([w,0.05,d],[0,0.12,0],inside);
    for(let row=0;row<4;row++){const y=0.28+row*(h-0.48)/4;s.box([w*0.88,0.012,d*0.87],[0,y,-0.02],inside);if(a.stock==='sparse'&&row>1)continue;const n=a.stock==='sparse'?1:3;for(let col=0;col<n;col++){const x=(col-(n-1)/2)*w*0.26;if(a.stock==='party'&&row===2){s.cylinder(0.14,0.14,0.08,[x,y+0.05,0],s.material('#c3a18b'),20);s.cylinder(0.135,0.14,0.01,[x,y+0.095,0],inside,20);}else if((row+col)%2){s.cylinder(0.043,0.045,0.18,[x,y+0.1,0],s.material(['#789c7b','#b49663','#aa795c'][col%3]),12);s.cylinder(0.03,0.03,0.025,[x,y+0.201,0],body,12);}else{s.box([0.1,0.19,0.1],[x,y+0.11,0],s.material('#d3d8c2'));s.box([0.1,0.03,0.1],[x,y+0.21,0],s.material('#84a7a0'));}}}
    const doorW=a.style==='double'?w/2:w,doorH=a.style==='topfreezer'?h*0.69:h-0.08,dy=0.1+doorH/2,angle=a.door==='open'?1.15:a.door==='ajar'?0.3:0;
    const moving=new THREE.Group();moving.position.set(-w/2,dy,d/2+0.02);s.root.add(moving);
    const add=(geo:THREE.BufferGeometry,mat:THREE.Material,at:[number,number,number])=>{const m=new THREE.Mesh(geo,mat);m.position.set(...at);m.castShadow=m.receiveShadow=true;moving.add(m);return m;};
    add(new THREE.BoxGeometry(doorW,doorH,0.06),body,[doorW/2,0,0]);add(new THREE.BoxGeometry(0.025,doorH*0.31,0.055),steel,[doorW-0.08,doorH*0.13,0.05]);moving.rotation.y=-angle;
    if(a.style==='double')s.box([doorW,h-0.08,0.065],[w/4,h/2+0.06,d/2+0.023],body);
    if(a.style==='topfreezer'){s.box([w,h*0.27,0.068],[0,h*0.865,d/2+0.025],body);s.rod([w*0.2,h*0.86,d/2+0.075],[w*0.37,h*0.86,d/2+0.075],0.014,steel);}
    if(a.ice&&a.style==='double'){s.box([0.21,0.23,0.021],[w*0.25,h*0.57,d/2+0.068],dark);s.box([0.18,0.02,0.1],[w*0.25,h*0.46,d/2+0.09],steel);}
    if(a.magnets!=='none'){for(let i=0;i<2;i++){const x=doorW*(0.31+i*0.31),y=doorH*0.2-i*0.24;add(new THREE.BoxGeometry(0.16,0.18,0.004),s.material(a.magnets==='photos'?(i?'#9b8170':'#7e9d9a'):'#e3ddbf'),[x,y,0.034]);add(new THREE.SphereGeometry(0.014,8,6),s.material(i?'#ad6550':'#bfab5e'),[x,y+0.087,0.039]);for(let j=0;j<3;j++)add(new THREE.BoxGeometry(0.1,0.003,0.003),dark,[x,y+0.03-j*0.017,0.038]);}}
    if(a.top==='cereal')for(let i=0;i<2;i++){s.box([0.16,0.29,0.09],[(i-0.5)*0.22,h+0.19,0],s.material(i?'#b68557':'#bdaa6f'));s.label(i?'OATS':'CRUNCH',0.12,0.085,[(i-0.5)*0.22,h+0.21,0.051]);}
    if(a.top==='plant'){s.cylinder(0.075,0.05,0.13,[0,h+0.12,0],s.material('#ad7756'),16);for(let i=0;i<6;i++)s.ball([0.04,0.13,0.05],[(context.random()-0.5)*0.15,h+0.28,(context.random()-0.5)*0.1],s.material('#62836a'),12);}
    if(a.door!=='closed')s.box([0.09,0.035,0.04],[w*0.35,h*0.83,-d*0.39],s.material('#fbefc2',{emissive:'#e9c884',emissiveIntensity:0.5}));
    return s.finish();
  },
});
