import * as THREE from 'three';
import { Sculpture, choice, defineThing, score } from '@conjure/kit';
export default defineThing({questions:{
    wedge:choice('What absorber profile is shown?', {'triangles': 'Deep triangular wedge rows.', 'pyramids': 'A grid of pointed pyramids.', 'cones': 'A grid of round tapered cones.', 'grooves': 'Broad parallel V-shaped channels.'}),
    layout:choice('How are the elements laid out?', {'parallel': 'All elements follow one direction.', 'crossed': 'Adjacent tiles rotate by a right angle.', 'stepped': 'The tile heights rise in steps.', 'patchwork': 'A small mixed group of deep and shallow tiles.'}),
    core:choice('What does the section reveal?', {'foam': 'A uniform open-cell foam interior.', 'fibre': 'A pale fibrous core inside a darker skin.', 'layers': 'Alternating layers of absorptive material.', 'hollow': 'A hollow-backed cellular support.'}),
    backing:choice('What carries the absorber?', {'panel': 'A flat rigid backing board.', 'mesh': 'A rear wire mounting mesh.', 'rails': 'Two narrow metal mounting rails.', 'frame': 'A deep rectangular perimeter frame.'}),
    cut:choice('How is the sample exposed?', {'whole': 'A complete absorber module.', 'corner': 'One corner is cut away.', 'half': 'Half of the module exposes a flat section.', 'single': 'One full wedge is lifted out beside the module.'}),
    mount:choice('How is the sample displayed?', {'flat': 'The module lies flat.', 'upright': 'The module stands on a small rear foot.', 'tilted': 'The module tilts on a triangular support.', 'stack': 'The absorber rests on a thick ribbed comparison module.'}),
    edge:choice('How is the module edge finished?', {'bare': 'Raw cut material edges.', 'trim': 'A thin metal edge trim.', 'seam': 'A dark stitched fabric seam.', 'clips': 'Four retaining clips grip the module.'}),
    state:choice('What has happened to the absorber?', {'new': 'Clean uncompressed points.', 'crushed': 'Several points are compressed.', 'tested': 'A small compression weight rests on one tile.', 'tagged': 'A small material test card lies beside it.'}),
    size:score('How deep are the acoustic wedges?', ['Compact','Medium','Broad']),
},build(a,context){
const s=new Sculpture(context),rnd=context.random;
const metal=s.material('#9da7a1',{metalness:0.65}),dark=s.material('#3e5150'),pale=s.material('#c6c5ad'),accent=s.material('#b27a47'),foam=s.material('#7a8374');
const W=0.9,D=0.65,H=0.2+a.size*0.45,start=s.root.children.length,group=new THREE.Group();s.box([W*2,0.08,D*2],[0,0.04,0],dark);const nx=6,nz=4;
for(let x=0;x<nx;x++)for(let z=0;z<nz;z++){if(a.cut==='corner'&&x>3&&z>1)continue;if(a.cut==='half'&&x>2)continue;const xx=(x-(nx-1)/2)*W*2/nx,zz=(z-(nz-1)/2)*D*2/nz,height=H*(a.layout==='stepped'?0.5+x*0.15:a.layout==='patchwork'?(x+z)%2?0.55:1:1)*(a.state==='crushed'&&(x+z)%5===0?0.45:1),mat=a.core==='fibre'&&x===0?pale:foam;
if(a.wedge==='pyramids')s.cylinder(0,0.19,height,[xx,0.08+height/2,zz],mat,4).rotation.y=Math.PI/4;else if(a.wedge==='cones')s.cylinder(0,0.13,height,[xx,0.08+height/2,zz],mat,16);else {const sh=new THREE.Shape();sh.moveTo(-0.145,0);sh.lineTo(a.wedge==='grooves'?-0.075:0,height);if(a.wedge==='grooves')sh.lineTo(0.075,height);sh.lineTo(0.145,0);sh.closePath();const m=s.mesh(new THREE.ExtrudeGeometry(sh,{depth:D*2/nz*0.92,bevelEnabled:false}),mat,[xx,0.08,zz-D/nz*0.92]);if(a.layout==='crossed'&&(x+z)%2)m.rotation.y=Math.PI/2;}
if(a.core==='layers')for(let j=0;j<3;j++)s.box([0.27*(1-j*0.2),0.012,0.01],[xx,0.1+j*height/4,zz+D/nz*0.94],j%2?pale:dark);}
if(a.cut==='half'||a.cut==='corner'){const xx=a.cut==='half'?W*0.5:W*0.65,zz=a.cut==='half'?0:D*0.5;s.box([a.cut==='half'?W:W*0.65,0.12,a.cut==='half'?D*2:D],[xx,0.1,zz],a.core==='fibre'?pale:foam);if(a.core==='hollow')for(let j=0;j<4;j++)s.box([0.1,0.008,0.25],[xx+(j-1.5)*0.15,0.165,zz],dark);}
if(a.cut==='single'){const sh=new THREE.Shape();sh.moveTo(-0.14,0);sh.lineTo(0,H);sh.lineTo(0.14,0);sh.closePath();s.mesh(new THREE.ExtrudeGeometry(sh,{depth:0.3,bevelEnabled:false}),pale,[W+0.3,0,-0.15]);}
if(a.backing==='frame')for(const x of [-W,W])s.box([0.04,0.2,D*2],[x,0.1,0],metal);if(a.backing==='rails')for(const z of [-D*0.7,D*0.7])s.box([W*2.2,0.04,0.07],[0,-0.02,z],metal);if(a.backing==='mesh')for(let j=0;j<9;j++)s.rod([-W+j*W/4,0.005,-D],[-W+j*W/4,0.005,D],0.007,metal);
if(a.edge==='trim'||a.edge==='seam')for(const z of [-D,D])s.rod([-W,0.09,z],[W,0.09,z],a.edge==='trim'?0.02:0.012,a.edge==='trim'?metal:dark);if(a.edge==='clips')for(const x of [-W,W])for(const z of [-D*0.7,D*0.7])s.box([0.09,0.12,0.08],[x,0.09,z],metal);
if(a.state==='tested')s.cylinder(0.13,0.13,0.18,[0,0.1+H,0],metal,20);if(a.state==='tagged')s.label('ABS 03',0.35,0.17,[0,0.012,D+0.15],'#344a45','#d6cfb1').rotation.x=-Math.PI/2;
for(const c of s.root.children.slice(start))group.add(c);if(a.mount==='upright'){group.rotation.x=Math.PI/2;group.position.y=D+0.05;s.box([W*1.7,0.07,0.65],[0,0.035,0],dark);}if(a.mount==='tilted'){group.rotation.x=-0.5;group.position.y=D*Math.sin(0.5)+0.04;for(const x of [-W*0.7,W*0.7])s.rod([x,0.02,-D*0.7],[x,D*Math.sin(0.5)*1.6,-D*0.7],0.04,metal);}s.root.add(group);if(a.mount==='stack'){s.box([W*2,0.2,D*2],[0,-0.1,0],pale);for(let j=0;j<6;j++)s.box([0.24,0.03,D*1.9],[(j-2.5)*0.3,-0.22,0],foam);}

return s.finish();
}});
