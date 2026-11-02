import * as THREE from 'three';
import { Sculpture, choice, defineThing, score } from '@conjure/kit';
export default defineThing({questions:{
    tripod:choice('What tripod supports the instrument?', {'timber': 'Broad wooden tripod legs.', 'metal': 'Thin telescopic aluminium legs.', 'snow': 'Wide snow shoes at each foot.', 'pier': 'A squat three-foot survey pier.'}),
    instrument:choice('What optical head is fitted?', {'classic': 'A traditional long telescope between two uprights.', 'total': 'A compact total station with a large front objective.', 'laser': 'A small coaxial laser head in an open cradle.', 'digital': 'A broad electronic head with a side screen.'}),
    sight:choice('Where is the telescope aimed?', {'level': 'Horizontally across the ice.', 'up': 'Raised toward a high survey target.', 'down': 'Tilted down toward a nearby marker.', 'side': 'Turned sideways across the transect.'}),
    target:choice('What stands beside the instrument?', {'staff': 'A tall graduated survey staff.', 'prism': 'A small reflector prism on its own pole.', 'board': 'A square black and white target board.', 'none': 'No separate target.'}),
    base:choice('What levelling hardware is visible?', {'screws': 'Three large levelling screws.', 'bubble': 'A broad circular bubble level.', 'tribrach': 'A triangular quick release tribrach.', 'plummet': 'A hanging optical plummet below the head.'}),
    hood:choice('How are the optics protected?', {'bare': 'Bare lenses and exposed eyepiece.', 'shade': 'A long sunshade around the objective.', 'cover': 'A folded canvas rain cover hangs behind.', 'caps': 'One detached lens cap hangs on a cord.'}),
    record:choice('How is the observation recorded?', {'notebook': 'An open field notebook on a side tray.', 'screen': 'A bright instrument display with measurement lines.', 'logger': 'A separate cable-connected data logger.', 'none': 'Only the optical instrument.'}),
    event:choice('What state is the survey in?', {'ready': 'Set up and ready to sight.', 'adjusting': 'A large adjustment knob is extended.', 'snowed': 'Snow caps the tripod head and target base.', 'packed': 'A closed carrying case rests beside the tripod.'}),
    size:score('How tall is the tripod?', ['Compact','Medium','Broad']),
},build(a,context){
const s=new Sculpture(context),rnd=context.random;
const snow=s.material('#d8ded7'),ice=s.material('#94b8bc'),dark=s.material('#435a5d'),metal=s.material('#9aa7a2',{metalness:0.6}),orange=s.material('#b8703f');
const H=0.85+a.size*0.55,R=a.tripod==='pier'?0.35:0.55,paint=s.material('#9fae84'),wood=s.material('#a59066');
for(let j=0;j<3;j++){const t=j/3*Math.PI*2,x=Math.cos(t)*R,z=Math.sin(t)*R;s.rod([x,0.04,z],[Math.cos(t)*0.13,H,Math.sin(t)*0.13],a.tripod==='timber'?0.045:0.026,a.tripod==='timber'?wood:metal);s.rod([x*0.95,0.15,z*0.95],[Math.cos(t)*0.13,H*0.75,Math.sin(t)*0.13],0.016,dark);if(a.tripod==='snow')s.ball([0.16,0.025,0.16],[x,0.025,z],snow,16);else s.cylinder(0.045,0.025,0.08,[x,0.04,z],dark,12);}
s.cylinder(0.2,0.17,0.1,[0,H,0],metal,24);if(a.base==='screws')for(let j=0;j<3;j++){const t=j/3*Math.PI*2;s.cylinder(0.045,0.045,0.09,[Math.cos(t)*0.14,H+0.09,Math.sin(t)*0.14],dark,16);}if(a.base==='bubble'){s.cylinder(0.13,0.13,0.025,[0,H+0.08,0],ice,24);s.ball([0.025,0.01,0.025],[0.02,H+0.1,0],snow,10);}if(a.base==='tribrach')s.cylinder(0.2,0.2,0.07,[0,H+0.08,0],paint,3);if(a.base==='plummet'){s.rod([0,H,0],[0,H-0.42,0],0.005,dark);s.cylinder(0.025,0,0.08,[0,H-0.45,0],metal,12);}
const y=H+0.36;for(const x of [-0.16,0.16])s.box([0.06,0.3,0.09],[x,H+0.25,0],paint);s.rod([-0.2,y,0],[0.2,y,0],0.035,metal);
const start=s.root.children.length,head=new THREE.Group();if(a.instrument==='classic'||a.instrument==='laser'){const tube=s.cylinder(a.instrument==='laser'?0.065:0.08,0.055,a.instrument==='classic'?0.45:0.25,[0,0,0],paint,24);tube.rotation.x=Math.PI/2;}else s.box([0.26,0.22,0.28],[0,0,0],paint);s.cylinder(0.065,0.065,0.025,[0,0,0.22],dark,24).rotation.x=Math.PI/2;s.cylinder(0.045,0.045,0.028,[0,0,0.237],ice,24).rotation.x=Math.PI/2;s.cylinder(0.035,0.035,0.09,[0,0,-0.24],dark,16).rotation.x=Math.PI/2;
if(a.hood==='shade')s.cylinder(0.095,0.095,0.2,[0,0,0.3],dark,24).rotation.x=Math.PI/2;
for(const c of s.root.children.slice(start))head.add(c);head.position.y=y;head.rotation.x=a.sight==='up'?-0.42:a.sight==='down'?0.4:0;head.rotation.y=a.sight==='side'?1.1:0;s.root.add(head);
s.cylinder(0.045,0.045,a.event==='adjusting'?0.16:0.06,[0.23,y,0],dark,16).rotation.z=Math.PI/2;
if(a.target!=='none'){const x=R+0.45;s.rod([x,0.03,0.15],[x,H+0.55,0.15],0.025,metal);s.cylinder(0.14,0.14,0.03,[x,0.025,0.15],snow,20);if(a.target==='staff'){s.box([0.09,H+0.5,0.035],[x,(H+0.5)/2,0.15],snow);for(let j=0;j<14;j++)s.box([0.08,0.035,0.01],[x,0.1+j*(H+0.35)/14,0.175],j%2?orange:dark);}if(a.target==='prism')s.mesh(new THREE.OctahedronGeometry(0.12),ice,[x,H+0.5,0.15]);if(a.target==='board'){s.box([0.35,0.35,0.025],[x,H+0.4,0.15],snow);for(const d of [-1,1])s.box([0.16,0.16,0.01],[x+d*0.085,H+0.4+d*0.085,0.17],dark);}}
if(a.hood==='caps'){s.tube([[0.13,y,0.15],[0.28,y-0.17,0.2],[0.2,y-0.24,0.15]],0.006,dark);s.cylinder(0.07,0.07,0.018,[0.2,y-0.24,0.15],dark,20).rotation.x=Math.PI/2;}if(a.hood==='cover')s.drape({size:[0.4,0.35],at:[0,H+0.35,-0.35],over:[{box:[0.35,0.05,0.08],at:[0,H+0.25,-0.35]}],floor:H+0.05,detail:16},s.material('#8e9a84'));
if(a.record==='screen'||a.instrument==='digital'){s.box([0.02,0.17,0.2],[0.2,H+0.24,0],dark);for(let j=0;j<4;j++)s.box([0.005,0.008,0.12],[0.214,H+0.19+j*0.03,0],ice);}if(a.record==='notebook'){s.rod([-0.1,H+0.1,0],[-0.4,H+0.05,0.2],0.018,metal);s.box([0.3,0.02,0.22],[-0.4,H+0.07,0.2],snow);s.box([0.012,0.005,0.2],[-0.4,H+0.084,0.2],dark);}if(a.record==='logger'){s.box([0.23,0.12,0.19],[-R,0.07,0.4],dark);s.tube([[-0.15,H+0.1,0],[-0.25,H*0.4,0.2],[-R,0.14,0.4]],0.009,orange);}
if(a.event==='packed')s.box([0.4,0.22,0.3],[-R-0.25,0.11,0],dark);if(a.event==='snowed')s.ball([0.21,0.035,0.18],[0,H+0.13,0],snow,20);

return s.finish();
}});
