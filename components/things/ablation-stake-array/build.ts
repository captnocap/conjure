import * as THREE from 'three';
import { Sculpture, choice, defineThing, score } from '@conjure/kit';
export default defineThing({questions:{
    layout:choice('How are the stakes laid out?', {'line': 'Four stakes along a straight transect.', 'cross': 'Five stakes in a cross.', 'grid': 'Nine stakes in a square grid.', 'arc': 'Six stakes follow a curved ice margin.'}),
    material:choice('What kind of stakes are installed?', {'bamboo': 'Slender pale bamboo poles with nodes.', 'aluminium': 'Metal poles with bright collars.', 'fibreglass': 'Thick orange fibreglass poles.', 'wood': 'Square wooden survey stakes.'}),
    exposure:choice('What melt profile does the transect show?', {'level': 'Every exposed pole has equal height.', 'slope': 'Exposed lengths grow steadily along the line.', 'hollow': 'The central stakes stand much higher.', 'tilted': 'Alternating poles lean under ice movement.'}),
    head:choice('What is fitted to the stake heads?', {'caps': 'Simple rounded caps.', 'flags': 'Small triangular survey flags.', 'crossbars': 'Short horizontal reference bars.', 'targets': 'Square photographic targets.'}),
    base:choice('What surrounds the boreholes?', {'collars': 'Round drill collars in smooth ice.', 'cones': 'Low snow cones around every pole.', 'melt': 'Dark melt depressions at each hole.', 'blocks': 'Small raised ice blocks surround the holes.'}),
    line:choice('How is the transect connected?', {'none': 'Independent poles without connections.', 'cord': 'A low taut cord joins the stake tops.', 'tape': 'A ground measuring tape follows the line.', 'markers': 'Small orange markers lie between stakes.'}),
    reading:choice('What shows the measurements?', {'bands': 'Alternating dark calibration bands.', 'tags': 'Hanging numbered tags.', 'sleeves': 'One sliding orange reference sleeve per pole.', 'scale': 'A tall separate graduated staff.'}),
    event:choice('What happened at the site?', {'fresh': 'Fresh drill cuttings surround the holes.', 'surveyed': 'A notebook and pencil rest on a low ice block.', 'pulled': 'One extracted spare stake lies on the ground.', 'fracture': 'An open crack crosses the transect patch.'}),
    size:score('How long is the transect?', ['Compact','Medium','Broad']),
},build(a,context){
const s=new Sculpture(context),rnd=context.random;
const snow=s.material('#d8ded7'),ice=s.material('#94b8bc'),dark=s.material('#435a5d'),metal=s.material('#9aa7a2',{metalness:0.6}),orange=s.material('#b8703f');
const r=0.7+a.size*0.7; s.ball([r*1.7,0.07,r*1.3],[0,0.06,0],snow,28);
const pts:[number,number][]=[];if(a.layout==='line')for(let i=0;i<4;i++)pts.push([(i-1.5)*r*0.7,0]);else if(a.layout==='cross')pts.push([0,0],[-r,0],[r,0],[0,-r],[0,r]);else if(a.layout==='grid')for(let x=-1;x<=1;x++)for(let z=-1;z<=1;z++)pts.push([x*r*0.75,z*r*0.75]);else for(let i=0;i<6;i++){const t=-1.1+i*0.44;pts.push([Math.sin(t)*r*1.3,Math.cos(t)*r*0.8]);}
const tips:[number,number,number][]=[];pts.forEach(([x,z],i)=>{const h=a.exposure==='slope'?0.65+i*0.13:a.exposure==='hollow'?1.3-Math.abs(i-(pts.length-1)/2)*0.1:1;const lean=a.exposure==='tilted'?(i%2?0.18:-0.18):0;const mat=a.material==='fibreglass'?orange:a.material==='aluminium'?metal:snow;
if(a.material==='wood'){const p=s.box([0.045,h,0.045],[x+lean/2,0.13+h/2,z],s.material('#b4a37c'));p.rotation.z=-Math.atan2(lean,h);}else s.rod([x,0.12,z],[x+lean,h+0.12,z],0.023,mat);tips.push([x+lean,h+0.12,z]);
for(let j=1;j<9;j++)if(a.reading==='bands'||a.material==='bamboo'){const yy=h*j/9;s.ring(0.025,a.material==='bamboo'?0.004:0.01,[x+lean*j/9,0.12+yy,z],dark).rotation.x=Math.PI/2;}
if(a.head==='caps')s.ball([0.035,0.025,0.035],[x+lean,h+0.14,z],dark,12);if(a.head==='crossbars')s.rod([x+lean-0.14,h+0.1,z],[x+lean+0.14,h+0.1,z],0.016,metal);if(a.head==='flags'){const sh=new THREE.Shape();sh.moveTo(0,0);sh.lineTo(0.2,-0.04);sh.lineTo(0,-0.12);sh.closePath();const m=s.mesh(new THREE.ShapeGeometry(sh),orange,[x+lean,h+0.12,z]);orange.side=THREE.DoubleSide;}if(a.head==='targets')s.box([0.18,0.18,0.018],[x+lean,h+0.08,z],orange);
if(a.base==='collars')s.ring(0.075,0.018,[x,0.13,z],metal).rotation.x=Math.PI/2;if(a.base==='cones')s.cylinder(0.035,0.18,0.2,[x,0.2,z],snow,16);if(a.base==='melt')s.ball([0.16,0.015,0.13],[x,0.13,z],dark,16);if(a.base==='blocks')s.box([0.26,0.14,0.24],[x,0.15,z],ice);
if(a.reading==='sleeves')s.cylinder(0.04,0.04,0.13,[x+lean*0.55,0.12+h*0.55,z],orange,12);if(a.reading==='tags')s.label(String(i+1),0.1,0.1,[x+lean*0.7+0.05,0.12+h*0.7,z+0.03],'#33474a','#d4d2b5');if(a.event==='fresh')for(let j=0;j<5;j++)s.ball([0.035,0.02,0.03],[x+(rnd()-0.5)*0.3,0.14,z+(rnd()-0.5)*0.3],snow,8);});
if(a.line==='cord')s.tube(tips,0.006,dark);if(a.line==='tape')s.tube(pts.map(([x,z])=>[x,0.14,z+0.2]),0.012,orange);if(a.line==='markers')for(const [x,z] of pts)s.box([0.1,0.025,0.1],[x+0.2,0.14,z],orange);
if(a.reading==='scale'){s.box([0.09,1.4,0.035],[-r*1.5,0.8,0],snow);for(let j=0;j<14;j++)s.box([0.07,0.025,0.01],[-r*1.5,0.15+j*0.1,0.022],dark);}
if(a.event==='surveyed'){s.box([0.3,0.12,0.2],[0,0.16,-r],ice);s.box([0.19,0.018,0.14],[0,0.23,-r],dark);s.rod([-0.09,0.25,-r],[0.09,0.25,-r+0.04],0.006,orange);}if(a.event==='pulled')s.rod([-r,0.15,-r*0.5],[r,0.15,-r*0.6],0.025,snow);if(a.event==='fracture')s.tube([[-r*1.4,0.125,-0.4],[-0.3,0.13,-0.2],[0.1,0.13,0.15],[r*1.4,0.125,0.3]],0.03,dark);

return s.finish();
}});
