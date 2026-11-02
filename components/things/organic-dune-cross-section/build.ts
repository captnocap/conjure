import * as THREE from 'three';
import { Sculpture, choice, defineThing, score } from '@conjure/kit';
export default defineThing({
  questions:{
    crest: choice('What is the dune crest profile?', {'single': 'One asymmetric sharp crest.', 'double': 'Two nearby crests share the section.', 'flat': 'A broad truncated crest.', 'rounded': 'A low smoothly rounded crest.'}),
    cut: choice('How is the interior exposed?', {'front': 'One clean vertical front section.', 'trench': 'A narrow trench separates two pieces.', 'wedge': 'A side wedge is missing from the deposit.', 'steps': 'The cut is stepped into three excavation ledges.'}),
    bedding: choice('What bedding is visible?', {'parallel': 'Nearly parallel gently inclined beds.', 'cross': 'Alternating packages of steep cross bedding.', 'laminated': 'Many fine horizontal laminations.', 'massive': 'A few broad layers separated by distinct boundaries.'}),
    buried: choice('What older feature lies under the dune?', {'rock': 'A cluster of pale ice blocks.', 'channel': 'A dark filled ancient channel.', 'ridge': 'An older low dune ridge.', 'ice': 'A continuous pale buried ice lens.'}),
    surface: choice('How is the dune surface marked?', {'ripples': 'Fine transverse wind ripples.', 'streaks': 'Long dark wind streaks.', 'stipple': 'Scattered pale salt grains.', 'smooth': 'A smooth unmarked slip surface.'}),
    wind: choice('How is wind direction indicated?', {'arrows': 'Three small directional arrows.', 'vane': 'A tiny survey wind vane.', 'grains': 'A low trail of suspended grains.', 'none': 'No separate wind marker.'}),
    face: choice('What happened to the slip face?', {'fresh': 'A clean steep freshly slipped face.', 'slump': 'A rounded slump bulges at the toe.', 'scar': 'One narrow erosion scar cuts the face.', 'armoured': 'Coarse grains armour the lower slope.'}),
    foot: choice('How does the dune meet the ground?', {'apron': 'A broad fine sediment apron.', 'crust': 'A cracked mineral crust surrounds it.', 'edge': 'A sharp trimmed section edge.', 'overrun': 'The dune partly buries a small marker post.'}),
    scale: score('How high and broad is the dune section?', ['Compact', 'Medium sized', 'Broad and substantial']),
  },
  build(a,context){
    const s=new Sculpture(context),rnd=context.random;
    const size=0.8+a.scale*0.75,h=0.4+a.scale*0.45,depth=0.75;
    const sand=s.material('#a18c5a'),dark=s.material('#625f46'),pale=s.material('#c2bb95'),base=s.material('#91866a');
    s.box([size*2.5,0.06,depth*1.5],[0,0.03,0],base);
    const vertices:[number,number][]=[[-size,0.06],[-size*0.35,h*0.55]];
    if(a.crest==='double')vertices.push([-size*0.1,h],[size*0.12,h*0.55],[size*0.35,h*0.9]);
    else if(a.crest==='flat')vertices.push([-size*0.05,h],[size*0.35,h]);
    else if(a.crest==='rounded')for(let j=0;j<=8;j++){const t=j/8*Math.PI;vertices.push([-size*0.05+j/8*size*0.65,h*0.6+Math.sin(t)*h*0.25]);}
    else vertices.push([size*0.25,h]);vertices.push([size,0.06]);
    const profile=new THREE.Shape();vertices.forEach(([x,y],i)=>i?profile.lineTo(x,y):profile.moveTo(x,y));profile.closePath();
    const sx=a.cut==='wedge'?0.75:1;
    const topY=(x:number)=>{x/=sx;for(let j=0;j<vertices.length-1;j++){const [ax,ay]=vertices[j],[bx,by]=vertices[j+1];if(x>=ax&&x<=bx)return ay+(by-ay)*(x-ax)/(bx-ax);}return 0.06;};
    const parts=a.cut==='trench'?2:a.cut==='steps'?3:1;
    const layers=a.bedding==='laminated'?12:a.bedding==='massive'?4:7;
    for(let part=0;part<parts;part++){
      const thickness=depth/parts*(a.cut==='trench'?0.82:1),z0=-depth/2+part*depth/parts,sy=a.cut==='steps'?0.65+part*0.175:1;
      const mesh=s.mesh(new THREE.ExtrudeGeometry(profile,{depth:thickness,bevelEnabled:false,steps:1}),sand,[0,0,z0]);mesh.scale.set(sx,sy,1);
      for(let layer=1;layer<layers;layer++)for(const z of [z0-0.004,z0+thickness+0.004]){
        const level=0.07+layer/layers*h*0.78,slant=a.bedding==='parallel'?0.035:a.bedding==='cross'?(layer%2?0.12:-0.09):0;
        let run:[number,number,number][]=[];const flush=()=>{if(run.length>1)s.rod(run[0],run[run.length-1],0.005,layer%2?pale:dark);run=[];};
        for(let k=0;k<=60;k++){const x=(-1+k/30)*size*sx,y=level+slant*x/size;if(y<topY(x)-0.008&&y>0.06)run.push([x,y*sy,z]);else flush();}flush();
      }
      if(a.surface==='ripples')for(let j=0;j<11;j++){const x=(-0.8+j*0.15)*size*sx;s.rod([x,topY(x)*sy+0.008,z0+0.018],[x,topY(x)*sy+0.008,z0+thickness-0.018],0.006,dark);}
      if(a.surface==='streaks')for(let j=0;j<3;j++){const z=z0+(j+0.5)/3*thickness;const pts:[number,number,number][]=vertices.map(([x,y])=>[x*sx,y*sy+0.008,z]);for(let k=0;k<pts.length-1;k++)s.rod(pts[k],pts[k+1],0.007,dark);}
      if(a.surface==='stipple')for(let j=0;j<12;j++){const x=(rnd()-0.5)*size*1.7*sx,z=z0+rnd()*thickness;s.ball([0.012,0.008,0.012],[x,topY(x)*sy+0.01,z],pale,6);}
      if(a.face==='scar'){const pts:[number,number,number][]=Array.from({length:12},(_,j)=>{const x=(0.3+j/11*0.65)*size*sx;return [x,topY(x)*sy+0.01,z0+thickness/2];});s.tube(pts,0.02,dark);}
      if(a.face==='armoured')s.scatter(new THREE.IcosahedronGeometry(0.025,0),pale,Array.from({length:16},()=>{const x=size*(0.65+rnd()*0.3)*sx;return {at:[x,topY(x)*sy+0.02,z0+rnd()*thickness] as [number,number,number],size:0.7+rnd()};}));
    }
    if(a.buried==='rock')for(let j=0;j<5;j++)s.ball([0.07,0.05,0.05],[-size*0.45+j*size*0.22,0.11,depth/2+0.015],pale,9);
    if(a.buried==='channel')s.tube([[-size*0.45,0.13,depth/2+0.01],[0,0.07,depth/2+0.01],[size*0.45,0.13,depth/2+0.01]],0.025,dark);
    if(a.buried==='ridge')s.tube([[-size*0.5,0.1,depth/2+0.01],[-size*0.1,0.2,depth/2+0.01],[size*0.5,0.1,depth/2+0.01]],0.014,pale);
    if(a.buried==='ice')s.box([size*1.1,0.035,0.018],[0,0.12,depth/2+0.01],pale);
    if(a.face==='slump')s.ball([0.3,0.1,depth*0.5],[size*0.75,0.12,0],sand,18);
    if(a.wind==='arrows')for(let j=0;j<3;j++)s.rod([-size*0.75,0.12,depth*0.8+j*0.1],[size*0.15,0.12,depth*0.8+j*0.1],0.024,dark,0.001);
    if(a.wind==='vane'){s.rod([-size*1.1,0.03,0],[-size*1.1,0.5,0],0.012,dark);s.rod([-size*1.25,0.48,0],[-size*0.9,0.48,0],0.03,pale,0.001);}
    if(a.wind==='grains')s.scatter(new THREE.IcosahedronGeometry(0.012,0),pale,Array.from({length:35},()=>({at:[(rnd()-0.5)*size*1.5,h+0.1+rnd()*0.15,0.05+rnd()*0.1] as [number,number,number],size:1})));
    if(a.foot==='apron')s.ball([size*1.23,0.025,depth*0.8],[0,0.055,0],sand,24);
    if(a.foot==='crust')for(let j=0;j<7;j++)s.rod([-size*1.15+j*size*0.37,0.063,depth*0.6],[-size*1.1+j*size*0.37,0.063,depth*0.75],0.007,dark);
    if(a.foot==='overrun')s.rod([-size*0.8,0.06,0],[-size*0.8,0.48,0],0.025,pale);

    return s.finish();
  },
});
