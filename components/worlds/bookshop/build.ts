import * as THREE from 'three';
import { Sculpture, diorama, choice, score, noul, defineThing, defineWorld } from '@conjure/kit';

export default defineWorld({
  questions: {

    shop: choice('What kind of bookshop is it?', {secondhand:'A secondhand shop of warm timber and handwritten signs.', modern:'A bright contemporary shop with pale shelving.', antique:'A dark-timber antiquarian bookshop.'}),
    layout: choice('How are the shelves arranged?', {back:'Tall shelves along the back wall.', alcove:'Shelves turn into a reading alcove on the left.', islands:'Back shelves plus a low central book island.'}),
    floor: choice('What floor is under the shelves?', {boards:'Narrow timber floorboards.', tile:'Cream and muted green tiles.', carpet:'A faded warm carpet.'}),
    display: choice('What books dominate the window display?', {fiction:'Fiction and poetry.', travel:'Maps, travel writing and atlases.', science:'Science, inventions and astronomy.', mysteries:'Mysteries and forgotten local histories.'}),
    sign: choice('What does the shop sign say?', {chapter:'ANOTHER CHAPTER', shelter:'BOOKS ARE SHELTER', open:'OPEN / COME BROWSE', lost:'LOST & FOUND BOOKS'}),
    reading: choice('What is in the reading corner?', {chair:'A soft reading chair and side table.', desk:'A small timber reading desk.', none:'An open corner ready for a visitor.'}),
    ladder: noul('Is there a rail-mounted ladder at the book wall?'),
    counter: choice('What is on the shop counter?', {empty:'An empty counter with a little bell.', stacks:'A pile of purchases and a wrapping-paper roll.', coffee:'Two cups and a notebook.'}),
  },
  build(a, context) {

    const {art:s,world}=diorama(context,{background:'#e5e0cf',floor:a.floor==='carpet'?'#b39a80':'#bba582',width:11,depth:9,pitch:31,yaw:23,maxHeight:2.8,radius:1.16,slots:[[0,1.5],[-2.8,0.7],[2.8,0.7],[-2.5,3.05],[2.5,3.05],[0,-1.3]]});
    const wood=s.material(a.shop==='modern'?'#c4b78f':a.shop==='antique'?'#7c674a':'#a89161'),wall=s.material('#dfd7bd'),dark=s.material('#566551'),paper=s.material('#e5dbc0');
    s.box([11,3.9,0.16],[0,1.95,-4.42],wall);s.box([0.16,3.9,8.85],[-5.42,1.95,0],wall);
    if(a.floor==='boards')for(let i=0;i<27;i++)s.box([0.009,0.01,8.8],[-5.2+i*0.4,0.011,0],dark);if(a.floor==='tile')for(let x=0;x<11;x++)for(let z=0;z<9;z++)if((x+z)%2===0)s.box([0.97,0.01,0.97],[x-5,0.012,z-4],s.material('#9fae98'));
    const books=[] as {at:readonly[number,number,number];size:number;color:string}[],colours=['#ab765c','#7e9384','#b7a36f','#82949c','#948776'];
    for(let bay=0;bay<6;bay++){const x=(bay-2.5)*1.6;for(const xx of [x-0.76,x+0.76])s.box([0.045,2.95,0.45],[xx,1.6,-4.08],wood);for(let row=0;row<6;row++){const y=0.18+row*0.55;s.box([1.5,0.035,0.48],[x,y,-4.05],wood);if(row===5)continue;for(let i=0;i<17;i++){if(context.random()>0.78+context.mood.density*0.2)continue;const size=0.85+context.random()*0.3;books.push({at:[x-0.67+i*0.081,y+0.02+0.125*size,-3.985] as const,size,color:colours[(i+row+bay)%5]});}}}
    s.scatter(new THREE.BoxGeometry(0.06,0.25,0.27),wood,books);s.label({chapter:'ANOTHER CHAPTER',shelter:'BOOKS ARE SHELTER',open:'OPEN / COME BROWSE',lost:'LOST & FOUND BOOKS'}[a.sign],6.1,0.41,[0,3.51,-4.31],'#627051','#e6d9b7');
    const heading={fiction:'FICTION / POETRY',travel:'MAPS / JOURNEYS',science:'SCIENCE / STARS',mysteries:'MYSTERIES / HISTORIES'}[a.display];s.label(heading,2.0,0.15,[0.8,2.89,-3.803]);
    if(a.layout==='alcove'){for(let i=0;i<3;i++){s.box([0.41,1.94,1.25],[-5.1,1.07,-2.56+i*1.41],wood);for(let row=0;row<4;row++)s.box([0.46,0.03,1.18],[-4.88,0.3+row*0.49,-2.56+i*1.41],paper);}}
    if(a.layout==='islands'){s.box([3.2,0.72,0.9],[0,0.36,-1.43],wood);s.box([3.33,0.055,1.02],[0,0.76,-1.43],paper);for(let i=0;i<8;i++)s.box([0.3,0.06,0.42],[(i-3.5)*0.37,0.82,-1.43],s.material(colours[i%5]));}
    s.box([1.6,0.93,0.75],[4.34,0.47,2.93],wood);s.box([1.73,0.057,0.87],[4.34,0.97,2.93],paper);
    if(a.counter==='stacks')for(let i=0;i<5;i++)s.box([0.38,0.044,0.3],[4.25,1.01+i*0.044,2.95],s.material(colours[i%5]));if(a.counter==='coffee')for(const x of [4.08,4.58])s.cylinder(0.05,0.04,0.085,[x,1.05,2.98],paper,16);if(a.counter==='empty')s.ball([0.06,0.03,0.06],[4.4,1.03,3.1],s.material('#adad8a',{metalness:0.6}),16);
    if(a.reading==='chair'){const cloth=s.material('#889879');s.box([0.91,0.29,0.79],[-4.26,0.33,2.7],cloth);s.box([0.91,0.78,0.19],[-4.26,0.65,2.39],cloth);for(const x of [-4.65,-3.87])s.box([0.17,0.32,0.79],[x,0.61,2.7],cloth);s.cylinder(0.3,0.3,0.035,[-3.41,0.58,2.76],wood,24);s.rod([-3.41,0.03,2.76],[-3.41,0.57,2.76],0.028,wood);}
    if(a.reading==='desk'){s.box([1.91,0.065,0.85],[-3.69,0.78,2.58],wood);for(const x of [-4.45,-2.93])for(const z of [2.25,2.91])s.rod([x,0,z],[x,0.75,z],0.029,wood);s.box([0.45,0.006,0.3],[-3.69,0.819,2.58],paper);}
    if(a.ladder){for(const x of [-2.92,-2.45])s.rod([x,0,-2.86],[x,2.88,-3.87],0.021,wood);for(let row=0;row<8;row++)s.rod([-2.92,0.23+row*0.34,-2.94-row*0.119],[-2.45,0.23+row*0.34,-2.94-row*0.119],0.018,wood);s.rod([-5,2.91,-3.75],[5,2.91,-3.75],0.021,dark);}
    return world;
  },
});
