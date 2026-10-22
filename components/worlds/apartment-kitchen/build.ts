import * as THREE from 'three';
import { Sculpture, diorama, choice, score, noul, defineThing, defineWorld } from '@conjure/kit';

export default defineWorld({
  questions: {

    layout: choice('What is the kitchen layout?', {corner:'An L-shaped kitchen along two walls.', galley:'One straight run of kitchen cabinets.', studio:'A compact studio kitchenette with a breakfast bar.'}),
    cabinets: choice('What are the cabinet fronts like?', {cream:'Plain cream painted cabinets.', mint:'Sage green cabinets with brass handles.', timber:'Warm timber veneer cabinets.'}),
    floor: choice('What is on the kitchen floor?', {tiles:'Pale square ceramic tiles.', checker:'Cream and muted terracotta checker tiles.', boards:'Narrow honey-coloured timber boards.'}),
    backsplash: choice('What is behind the worktop?', {white:'White subway tiles.', blue:'Small blue mosaic tiles.', plaster:'Plain warm plaster.'}),
    window: choice('What is visible through the kitchen window?', {city:'A close view of opposite apartment windows.', trees:'Soft tree shapes beyond the glass.', blinds:'Partly lowered horizontal blinds.'}),
    table: choice('What sort of breakfast furniture is present?', {round:'A small round table with two chairs.', bar:'A narrow breakfast bar with stools.', none:'No furniture: an open kitchen floor.'}),
    domestic: choice('What domestic trace appears on the wall?', {calendar:'A wall calendar marked with appointments.', recipe:'A handwritten recipe pinned above the sink.', art:'A small childlike drawing.'}),
    drying: noul('Is a dish rack full of plates beside the sink?'),
  },
  build(a, context) {

    const {art:s,world}=diorama(context,{background:'#e8e2d1',floor:'#c9bd9d',width:10,depth:8.5,pitch:31,yaw:23,maxHeight:2.5,radius:1.1,slots:[[0,1.1],[-2.3,1.2],[2.6,1.1],[-1.8,-1.2],[1.8,-1.3],[0,3.0]]});
    const color={cream:'#d8d0b3',mint:'#8eaa96',timber:'#a78b61'}[a.cabinets],body=s.material(color),wall=s.material('#e5dac0'),work=s.material('#b0b6a8'),metal=s.material('#b5beb0',{metalness:0.6}),dark=s.material('#5b6b5c'),ink=s.material('#8b8c78');
    s.box([10,3.65,0.16],[0,1.83,-4.17],wall);s.box([0.16,3.65,8.35],[-4.92,1.83,0],wall);
    if(a.floor==='boards')for(let i=0;i<24;i++)s.box([0.007,0.008,8.4],[-4.82+i*0.42,0.009,0],ink);else for(let x=0;x<10;x++)for(let z=0;z<9;z++){if(a.floor==='checker'&&(x+z)%2===0)s.box([0.97,0.009,0.93],[x-4.5,0.011,z*0.94-3.76],s.material('#b2836b'));if(a.floor==='tiles'){s.box([0.009,0.008,8.3],[x-4.7,0.01,0],ink);if(x===0)s.box([9.8,0.008,0.009],[0,0.01,z*0.94-4.1],ink);}}
    const cabinet=(x:number,z:number,side=false)=>{const start=s.root.children.length;s.box([1.34,0.85,0.64],[x,0.43,z],body);s.box([1.4,0.055,0.74],[x,0.89,z+0.02],work);for(let j=0;j<2;j++){s.box([0.6,0.74,0.018],[x+(j-0.5)*0.66,0.43,z+0.333],body);s.rod([x+(j-0.5)*0.66+0.15,0.61,z+0.353],[x+(j-0.5)*0.66+0.15,0.7,z+0.353],0.009,metal);}if(side)for(const mesh of s.root.children.slice(start)){mesh.position.applyAxisAngle(new THREE.Vector3(0,1,0),Math.PI/2);mesh.rotateY(Math.PI/2);}};
    for(let i=0;i<6;i++)cabinet((i-2.5)*1.38,-3.66);if(a.layout==='corner')for(let i=0;i<3;i++)cabinet(-2.5+i*1.4,-4.27,true);
    s.box([0.9,0.016,0.47],[0,0.928,-3.57],metal);s.box([0.75,0.009,0.34],[0,0.938,-3.57],dark);s.tube([[0,0.94,-3.82],[0,1.26,-3.82],[0,1.31,-3.62],[0,1.2,-3.5]],0.018,metal);
    for(const x of [-0.19,0.19])s.cylinder(0.033,0.043,0.024,[x,0.94,-3.81],metal,12);
    if(a.backsplash!=='plaster')for(let x=0;x<20;x++)for(let row=0;row<3;row++)s.box([0.47,0.22,0.018],[-4.5+x*0.48+(row%2)*0.15,1.13+row*0.23,-4.064],s.material(a.backsplash==='blue'?(x+row)%3===0?'#86a6a6':'#9db8b0':'#ece5cf'));
    for(const x of [-3.45,3.45]){s.box([2.57,1.02,0.44],[x,2.39,-3.92],body);for(let i=0;i<4;i++){s.box([0.57,0.91,0.026],[x+(i-1.5)*0.62,2.39,-3.681],body);s.rod([x+(i-1.5)*0.62+0.17,2.06,-3.657],[x+(i-1.5)*0.62+0.17,2.21,-3.657],0.008,metal);}}
    s.box([2.76,1.72,0.036],[0,2.49,-4.047],s.material('#98b1ac'));for(const x of [-1.41,0,1.41])s.box([0.055,1.86,0.06],[x,2.49,-4.015],wall);for(const y of [1.59,3.4])s.box([2.86,0.055,0.07],[0,y,-4.005],wall);
    if(a.window==='blinds')for(let i=0;i<7;i++)s.box([2.74,0.065,0.02],[0,3.27-i*0.12,-3.968],work);if(a.window==='city')for(let i=0;i<8;i++)s.box([0.16,0.2,0.008],[(i%4-1.5)*0.57,2.09+Math.floor(i/4)*0.7,-4.018],s.material(i%2?'#c9caa7':'#73918c'));if(a.window==='trees')for(let i=0;i<5;i++)s.ball([0.21,0.39,0.025],[(i-2)*0.5,2.15,-4.01],s.material('#7f9b83'),12);
    if(a.table==='round'){s.cylinder(0.84,0.84,0.065,[-3.31,0.76,1.51],s.material('#b59b6c'),32);s.cylinder(0.09,0.27,0.7,[-3.31,0.37,1.51],dark);for(const z of [0.57,2.45]){s.box([0.48,0.044,0.46],[-3.31,0.44,z],body);s.box([0.47,0.51,0.045],[-3.31,0.72,z+(z<1?-0.19:0.19)],body);for(const dx of [-0.18,0.18])for(const dz of [-0.17,0.17])s.rod([-3.31+dx,0,z+dz],[-3.31+dx,0.42,z+dz],0.016,dark);}}
    if(a.table==='bar'||a.layout==='studio'){s.box([3.25,0.08,0.72],[-2.3,1.04,2.32],work);for(const x of [-3.57,-1.03])s.rod([x,0.02,2.32],[x,1.0,2.32],0.04,dark);for(const x of [-3.15,-1.45]){s.cylinder(0.22,0.22,0.08,[x,0.74,3.21],body,20);s.rod([x,0,3.21],[x,0.72,3.21],0.035,metal);}}
    s.box([0.95,1.13,0.022],[4.32,2.48,-4.045],s.material('#bba77b'));s.label({calendar:'MON TUE WED THU FRI',recipe:'SOUP FOR TWO',art:'OUR HOUSE'}[a.domestic],0.85,0.56,[4.32,2.58,-4.025]);
    if(a.drying){s.box([0.51,0.03,0.39],[0.94,0.946,-3.55],metal);for(let i=0;i<5;i++){s.cylinder(0.11,0.11,0.012,[0.78+i*0.065,1.06,-3.55],wall,24).rotation.z=Math.PI/2;s.rod([0.78+i*0.065,0.94,-3.69],[0.78+i*0.065,1.02,-3.69],0.004,metal);}}
    return world;
  },
});
