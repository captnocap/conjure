import * as THREE from 'three';
import { Sculpture, choice, defineThing, score } from '@conjure/kit';
export default defineThing({questions:{
    profile:choice('How is the snowpit cut?', {'straight': 'A broad straight wall.', 'corner': 'Two walls meet at a right angle.', 'steps': 'Three broad excavation steps.', 'trench': 'A narrow trench with two parallel walls.'}),
    strata:choice('What layers are exposed?', {'even': 'Six even horizontal snow layers.', 'lens': 'Two blue ice lenses interrupt white snow.', 'storm': 'A thick recent layer caps thin older beds.', 'tilted': 'The layers slope gently across the face.'}),
    roof:choice('What remains at the upper edge?', {'clean': 'A clean cut upper edge.', 'lip': 'An overhanging snow cornice.', 'scallop': 'A scalloped broken rim.', 'blocks': 'Loose excavated blocks sit behind the rim.'}),
    scale:choice('How are depths recorded?', {'staff': 'A tall striped measuring staff.', 'tape': 'A hanging narrow metric tape.', 'pins': 'Orange pins mark selected horizons.', 'frame': 'A rectangular sampling grid on the face.'}),
    samples:choice('What was taken from the layers?', {'none': 'No samples removed.', 'cubes': 'Three square sample holes.', 'tubes': 'Round coring tubes enter the face.', 'bags': 'Three collected sample bags sit below.'}),
    floor:choice('What covers the trench floor?', {'snow': 'A smooth level snow floor.', 'chips': 'A pile of loose excavated chips.', 'ice': 'A blue basal ice sheet.', 'water': 'A shallow dark melt puddle.'}),
    tools:choice('What tool was left here?', {'none': 'No loose tool.', 'shovel': 'A broad snow shovel leans nearby.', 'saw': 'A serrated snow saw lies at the foot.', 'brush': 'A wide soft sampling brush.'}),
    study:choice('What is being examined?', {'density': 'A small balance pan holds a snow block.', 'grain': 'A dark grain card shows pale crystals.', 'temperature': 'A thin probe enters the middle layer.', 'shear': 'A separated column stands beside the wall.'}),
    size:score('How broad is the snow profile?', ['Compact','Medium','Broad']),
},build(a,context){
const s=new Sculpture(context),rnd=context.random;
const snow=s.material('#d8ded7'),ice=s.material('#94b8bc'),dark=s.material('#435a5d'),metal=s.material('#9aa7a2',{metalness:0.6}),orange=s.material('#b8703f');
const w=1.2+a.size, h=1.25;const count=6;for(let i=0;i<count;i++){const hh=a.strata==='storm'?(i===5?0.42:0.17):h/count;const yy=a.strata==='storm'?(i<5?i*0.17+hh/2:0.85+hh/2):i*h/count+hh/2;const mat=a.strata==='lens'&&(i===1||i===4)?ice:i%2?snow:s.material('#c2cfcb');const b=s.box([w,hh,0.36],[0,yy+0.1,-0.2],mat);if(a.strata==='tilted')b.rotation.z=0.08;if(a.profile==='corner')s.box([0.36,hh,0.85],[-w/2+0.18,yy+0.1,0.18],mat);if(a.profile==='trench')s.box([w,hh,0.28],[0,yy+0.1,0.9],mat);}
s.box([w+0.35,0.1,1.4],[0,0.05,0.25],a.floor==='ice'?ice:snow);
if(a.profile==='steps')for(let j=0;j<3;j++)s.box([w,0.18+j*0.16,0.28],[0,0.1+(0.18+j*0.16)/2,0.9-j*0.28],snow);
if(a.roof==='lip')s.box([w+0.15,0.16,0.55],[0,1.43,-0.12],snow);if(a.roof==='scallop')for(let j=0;j<7;j++)s.ball([w/12,0.08,0.15],[-w/2+j*w/6,1.4,-0.22],snow,12);if(a.roof==='blocks')for(let j=0;j<5;j++){const b=s.box([0.17,0.12,0.13],[-w*0.4+j*w*0.2,1.46,-0.27],snow);b.rotation.y=j*0.4;}
if(a.scale==='staff'||a.scale==='tape'){s.box([a.scale==='staff'?0.09:0.035,1.5,0.02],[w*0.42,0.76,0.01],orange);for(let j=0;j<15;j++)s.box([0.055,0.025,0.01],[w*0.42,0.1+j*0.09,0.027],dark);}if(a.scale==='pins')for(let j=0;j<5;j++)s.rod([w*0.35,0.25+j*0.23,-0.02],[w*0.35,0.25+j*0.23,0.13],0.018,orange);if(a.scale==='frame')for(let j=0;j<5;j++){s.rod([-w*0.38,0.2+j*0.25,0.012],[w*0.38,0.2+j*0.25,0.012],0.005,dark);s.rod([-w*0.38+j*w*0.19,0.2,0.012],[-w*0.38+j*w*0.19,1.2,0.012],0.005,dark);}
for(let j=0;j<3;j++){const x=-w*0.28+j*w*0.24,y=0.35+j*0.28;if(a.samples==='cubes')s.box([0.12,0.12,0.02],[x,y,-0.008],dark);if(a.samples==='tubes')s.cylinder(0.055,0.055,0.27,[x,y,0.1],metal,16).rotation.x=Math.PI/2;if(a.samples==='bags')s.ball([0.12,0.12,0.07],[x,0.21,0.65],ice,12);}
if(a.floor==='chips')for(let j=0;j<25;j++)s.mesh(new THREE.IcosahedronGeometry(0.055,0),snow,[(rnd()-0.5)*w,0.13,0.2+rnd()*0.7]);if(a.floor==='water')s.ball([w*0.4,0.01,0.38],[0,0.11,0.55],dark,24);
if(a.tools==='shovel'){s.rod([w*0.6,0.16,0.65],[w*0.52,1.1,0.42],0.025,metal);s.box([0.27,0.3,0.04],[w*0.6,0.23,0.65],orange);s.ring(0.08,0.018,[w*0.52,1.14,0.42],dark);}if(a.tools==='saw'){s.box([0.55,0.025,0.09],[0,0.14,0.8],metal);for(let j=0;j<12;j++)s.cylinder(0,0.015,0.04,[-0.25+j*0.045,0.14,0.86],metal,3).rotation.x=Math.PI/2;}if(a.tools==='brush'){s.box([0.18,0.04,0.1],[0,0.16,0.65],orange);for(let j=0;j<8;j++)s.rod([-0.08+j*0.023,0.14,0.65],[-0.08+j*0.023,0.11,0.76],0.006,dark);}
if(a.study==='density'){s.cylinder(0.18,0.13,0.04,[-w*0.4,0.15,0.7],metal,24);s.box([0.12,0.12,0.12],[-w*0.4,0.23,0.7],snow);}if(a.study==='grain'){s.box([0.25,0.015,0.2],[0,0.12,0.35],dark);for(let j=0;j<12;j++)s.ball([0.009,0.01,0.009],[(rnd()-0.5)*0.2,0.14,0.35+(rnd()-0.5)*0.15],snow,6);}if(a.study==='temperature')s.rod([-w*0.25,0.72,-0.03],[-w*0.25,0.72,0.4],0.015,orange);if(a.study==='shear')s.box([0.25,0.7,0.25],[-w*0.6,0.45,0.3],snow);

return s.finish();
}});
