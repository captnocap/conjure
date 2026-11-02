import * as THREE from 'three';
import { Sculpture, choice, defineThing, score } from '@conjure/kit';
export default defineThing({
  questions:{
    hull: choice('How does the buoy float?', {'triangle': 'Three pontoons form a triangular raft.', 'square': 'Four short pontoons surround a square deck.', 'twin': 'Two long parallel pontoons.', 'ring': 'A segmented annular float around an open centre.'}),
    reflector: choice('What radar reflector is mounted?', {'corner': 'Three perpendicular plates make a corner reflector.', 'cross': 'Four triangular reflector vanes cross around the mast.', 'octahedral': 'Eight triangular faces make an open octahedral reflector.', 'stacked': 'Two separated corner reflectors share the mast.'}),
    mast: choice('How is the mast arranged?', {'short': 'A short broad central mast.', 'tall': 'A tall slender survey mast.', 'folded': 'The reflector mast folds sideways toward the deck.', 'offset': 'A braced mast stands at one edge.'}),
    anchor: choice('What keeps the buoy in place?', {'chain': 'A short heavy chain leads to an anchor block.', 'cable': 'A long fine cable runs to a ground weight.', 'stake': 'A nearby shore stake holds the tether.', 'drogue': 'A small conical drogue trails below a short line.'}),
    deck: choice('What occupies the deck?', {'bare': 'A plain deck with access panels.', 'instrument': 'A sealed recorder case and cable loops.', 'solar': 'Two inclined dark power panels.', 'hatch': 'A large open instrument hatch.'}),
    state: choice('What is happening to the buoy?', {'moored': 'It sits level on a taut tether.', 'drifting': 'The tether lies slack and a float trails behind.', 'retrieval': 'A raised lifting bridle is ready for recovery.', 'iced': 'Pale deposits coat the float rims.'}),
    marks: choice('How is it marked for identification?', {'stripe': 'Broad orange bands on the floats.', 'checker': 'Alternating black and pale deck squares.', 'number': 'One large numbered identification plate.', 'none': 'No marks beyond the reflector.'}),
    arms: choice('What stabilises the reflector?', {'none': 'No extra stabilisers.', 'three': 'Three thin guy wires run to the deck.', 'four': 'Four rigid diagonal braces.', 'floats': 'Two small outrigger floats on narrow arms.'}),
    scale: score('How broad is the buoy footprint?', ['Compact', 'Medium sized', 'Broad and substantial']),
  },
  build(a,context){
    const s=new Sculpture(context),rnd=context.random;
    const metal=s.material('#a9b3ad',{metalness:0.75}),float=s.material('#c2b17b'),dark=s.material('#3d5554'),orange=s.material('#b86f39');
    const radius=0.45+a.scale*0.4;
    const points:[number,number][]=[];
    if(a.hull==='triangle')for(let i=0;i<3;i++){const t=i/3*Math.PI*2;points.push([Math.sin(t)*radius,Math.cos(t)*radius]);}
    else if(a.hull==='square')for(const x of [-radius,radius])for(const z of [-radius,radius])points.push([x,z]);
    else if(a.hull==='twin')for(const x of [-radius,radius])points.push([x,0]);
    else for(let i=0;i<10;i++){const t=i/10*Math.PI*2;points.push([Math.sin(t)*radius,Math.cos(t)*radius]);}
    for(const [x,z] of points){const pontoon=s.cylinder(0.14,0.14,a.hull==='twin'?radius*2.5:0.4,[x,0.17,z],float,16);pontoon.rotation.x=Math.PI/2;if(a.marks==='stripe')for(const zz of [-0.09,0.09])s.ring(0.142,0.022,[x,0.17,z+zz],orange);if(a.state==='iced')s.box([0.2,0.04,0.28],[x,0.31,z],s.material('#d6d3bd'));}
    s.box([radius*1.65,0.06,radius*1.65],[0,0.3,0],metal);
    const mx=a.mast==='offset'?radius*0.6:0,my=a.mast==='tall'?1.45:a.mast==='short'?0.8:1.15;
    const tip:[number,number,number]=[a.mast==='folded'?radius*1.2:mx,a.mast==='folded'?0.65:my,0];s.rod([mx,0.33,0],tip,0.025,metal);
    const reflector=(y:number)=>{const size=0.28;
      if(a.reflector==='corner'||a.reflector==='stacked'){s.box([size,0.01,size],[tip[0],y,0],metal);s.box([size,size,0.01],[tip[0],y+size/2,-size/2],metal);s.box([0.01,size,size],[tip[0]-size/2,y+size/2,0],metal);}
      else {const shape=new THREE.Shape();shape.moveTo(0,0);shape.lineTo(size,0);shape.lineTo(0,size);shape.closePath();for(let i=0;i<(a.reflector==='cross'?4:8);i++){const plate=s.mesh(new THREE.ShapeGeometry(shape),metal,[tip[0],y,0]);plate.rotation.y=i*Math.PI/2;if(i>=4)plate.rotation.z=Math.PI;}metal.side=THREE.DoubleSide;}
    };reflector(tip[1]);if(a.reflector==='stacked')reflector(tip[1]-0.4);
    if(a.arms==='three'||a.arms==='four')for(let i=0;i<(a.arms==='three'?3:4);i++){const t=i/(a.arms==='three'?3:4)*Math.PI*2;s.rod([Math.cos(t)*radius*0.7,0.33,Math.sin(t)*radius*0.7],[mx,my*0.65,0],a.arms==='three'?0.004:0.015,dark);}
    if(a.arms==='floats')for(const sign of [-1,1]){s.rod([0,0.3,0],[sign*radius*1.6,0.2,0],0.018,metal);s.ball([0.16,0.12,0.3],[sign*radius*1.6,0.17,0],float,14);}
    const ax=radius*1.4,az=radius*0.9;
    s.tube([[radius*0.6,0.3,0.1],[radius, a.state==='drifting'?0.03:0.15,0.5],[ax,0.06,az]],a.anchor==='chain'?0.018:0.006,dark);
    if(a.anchor==='stake')s.rod([ax,0.01,az],[ax,0.6,az],0.025,metal);
    else if(a.anchor==='drogue')s.cylinder(0.14,0.025,0.3,[ax,0.18,az],dark,12).rotation.z=0.6;
    else s.box([0.23,0.1,0.2],[ax,0.05,az],dark);
    if(a.deck==='instrument'){s.box([0.26,0.16,0.23],[-radius*0.35,0.41,0.1],dark);s.tube([[-radius*0.35,0.48,0.1],[-0.1,0.4,0.25],[mx,0.35,0]],0.007,orange);}
    if(a.deck==='solar')for(const sign of [-1,1]){const p=s.box([0.25,0.018,0.45],[sign*radius*0.45,0.43,0],dark);p.rotation.z=sign*0.25;for(let j=0;j<4;j++)s.box([0.22,0.004,0.006],[sign*radius*0.45,0.45,-0.18+j*0.12],metal);}
    if(a.deck==='hatch'){s.box([0.25,0.014,0.25],[radius*0.3,0.34,0.1],dark);const lid=s.box([0.27,0.025,0.27],[radius*0.3,0.47,-0.02],metal);lid.rotation.x=0.9;}
    if(a.marks==='checker')for(let x=0;x<4;x++)for(let z=0;z<4;z++)if((x+z)%2===0)s.box([radius*0.35,0.004,radius*0.35],[(x-1.5)*radius*0.38,0.333,(z-1.5)*radius*0.38],dark);
    if(a.marks==='number')s.label('T 07',0.35,0.18,[0,0.45,radius*0.84],'#222f2b','#cbbd86');
    if(a.state==='retrieval'){s.tube([[-radius,0.3,0],[0,1.15,0],[radius,0.3,0]],0.014,orange);s.ring(0.07,0.015,[0,1.17,0],metal);}

    return s.finish();
  },
});
