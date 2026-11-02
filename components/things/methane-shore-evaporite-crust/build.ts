import * as THREE from 'three';
import { Sculpture, choice, defineThing, score } from '@conjure/kit';
export default defineThing({
  questions:{
    outline: choice('What shape does the crust form?', {'crescent': 'A crescent around a dark inner pool.', 'fan': 'A broad fan spreading from one narrow inlet.', 'ring': 'An almost closed circular shoreline.', 'tongue': 'An elongated terrace ending in a rounded tongue.'}),
    layers: choice('How many depositional ledges are exposed?', {'two': 'Two broad ledges.', 'three': 'Three stepped ledges.', 'four': 'Four closely spaced terraces.', 'six': 'Six thin concentric rims.'}),
    crystal: choice('What crystal habit grows along the edge?', {'plates': 'Thin overlapping mineral plates.', 'needles': 'Short upright needle clusters.', 'cubes': 'Small angular cubic crystals.', 'rosettes': 'Low radial crystal rosettes.'}),
    channel: choice('What cuts through the crust?', {'none': 'An unbroken crust with no inlet.', 'single': 'One shallow dark inlet crosses the rim.', 'forked': 'Two tributaries converge at the pool.', 'network': 'A branching set of narrow seep channels.'}),
    surface: choice('How is the exposed surface patterned?', {'polygons': 'Wide polygonal contraction cracks.', 'wrinkled': 'Low concentric wrinkles.', 'pitted': 'Round shallow dissolution pits.', 'smooth': 'Smooth flat crust with only its layered edge.'}),
    edge: choice('What happened to the outer rim?', {'intact': 'A complete unbroken ledge.', 'broken': 'Fragments have fallen away from one side.', 'undercut': 'An overhanging lip stands above a recessed base.', 'rolled': 'A narrow broken edge has curled upward.'}),
    liquid: choice('How high is the dark liquid?', {'dry': 'The inner basin has dried to a dark stain.', 'shallow': 'A shallow dark lens occupies the bottom.', 'high': 'The pool nearly reaches the lowest rim.', 'receding': 'An inner waterline is separated from the fresh exposed terrace.'}),
    story: choice('What recent event remains visible?', {'quiet': 'An untouched and quiet shoreline.', 'overflow': 'A darker spill tongue breaches one rim.', 'fractured': 'A wide fracture cuts the terrace in two.', 'surveyed': 'Three small sample stakes mark a measured transect.'}),
    scale: score('How broad and thick is the crust deposit?', ['Compact', 'Medium sized', 'Broad and substantial']),
  },
  build(a,context){
    const s=new Sculpture(context),rnd=context.random;
    const width=0.65+a.scale*0.8,n={two:2,three:3,four:4,six:6}[a.layers];
    const crust=s.material('#c6bea1'),edge=s.material('#9f997d'),wet=s.material('#394e4b',{roughness:0.18}),crystal=s.material('#ded7b6');
    const rx=width,rz=width*(a.outline==='tongue'?1.4:a.outline==='fan'?0.7:1),maxAngle=a.outline==='crescent'?Math.PI*1.55:a.outline==='fan'?Math.PI*1.1:Math.PI*2;
    const terraceY=(r:number)=>0.01+Math.min(n-1,Math.max(0,Math.floor((1-r)/0.1)))*0.045;
    for(let level=0;level<n;level++){
      const rad=1-level*0.1,y=0.035+level*0.045,max=a.outline==='crescent'?Math.PI*1.55:a.outline==='fan'?Math.PI*1.1:Math.PI*2;
      const points:[number,number,number][]=[];for(let j=0;j<=64;j++){const t=j/64*max+0.3;points.push([Math.cos(t)*rx*rad,y,Math.sin(t)*rz*rad]);}
      s.tube(points,0.035,level%2?edge:crust,a.outline==='ring'||a.outline==='tongue');
      s.surface((u,v,p)=>{const t=u*max+0.3,rr=rad*(0.22+v*0.78);p.set(Math.cos(t)*rx*rr,y-0.025,Math.sin(t)*rz*rr);},crust,{segments:[48,8]});
    }
    const ly=a.liquid==='high'?0.035+(n-1)*0.045+0.004:0.035+(n-1)*0.045;
    const pool=s.cylinder(rx*(a.liquid==='receding'?0.27:0.42),rx*0.4,a.liquid==='dry'?0.002:0.012,[0,ly,0],wet,48);pool.scale.z=rz/rx;
    const count=10+Math.round(context.mood.density*10);
    for(let i=0;i<count;i++){const t=i/count*maxAngle+0.3,r=0.86+0.06*rnd(),x=Math.cos(t)*rx*r,z=Math.sin(t)*rz*r;
      if(a.crystal==='needles')for(let k=0;k<3;k++)s.cylinder(0.004,0.015,0.1,[x+k*0.015,0.08,z],crystal,5);
      if(a.crystal==='cubes'){const block=s.box([0.045,0.05,0.045],[x,0.065,z],crystal);block.rotation.y=t;}
      if(a.crystal==='plates'){const plate=s.box([0.09,0.012,0.04],[x,0.05,z],crystal);plate.rotation.set(0.2,t,0.2);}
      if(a.crystal==='rosettes')for(let k=0;k<4;k++){const tt=k*Math.PI/2;const petal=s.box([0.07,0.015,0.02],[x,0.055,z],crystal);petal.rotation.y=tt+t;}
    }
    const channels=a.channel==='none'?0:a.channel==='single'?1:a.channel==='forked'?2:4;
    for(let j=0;j<channels;j++){const angle=-0.4+j*0.35;s.tube([[Math.cos(angle)*rx,0.07,Math.sin(angle)*rz],[rx*0.62,ly+0.015,j*0.08],[0,ly+0.015,0]],0.018,wet);}
    if(a.surface==='polygons')for(let j=0;j<8;j++){const t=j/8*Math.PI*2;s.tube([[Math.cos(t)*rx*0.5,ly+0.018,Math.sin(t)*rz*0.5],[Math.cos(t+0.08)*rx*0.72,0.09,Math.sin(t+0.08)*rz*0.72],[Math.cos(t-0.05)*rx*0.95,0.055,Math.sin(t-0.05)*rz*0.95]],0.006,edge);}
    if(a.surface==='wrinkled')for(let j=0;j<3;j++){const rr=0.52+j*0.08;const pts:[number,number,number][]=Array.from({length:49},(_,k)=>{const t=k/48*maxAngle+0.3;return [Math.cos(t)*rx*rr,terraceY(rr)+0.01,Math.sin(t)*rz*rr];});s.tube(pts,0.012,edge);}
    if(a.surface==='pitted')for(let j=0;j<12;j++){const t=rnd()*Math.PI*2,r=0.55+rnd()*0.3;s.cylinder(0.035,0.035,0.004,[Math.cos(t)*rx*r,ly+0.012,Math.sin(t)*rz*r],edge,12);}
    if(a.edge==='broken')for(let j=0;j<6;j++){const chip=s.mesh(new THREE.DodecahedronGeometry(0.06),crust,[rx*(1.03+rnd()*0.2),0.03,(rnd()-0.5)*rz]);chip.scale.y=0.3;}
    if(a.edge==='undercut')s.box([rx*0.9,0.07,0.12],[0,0.04,rz*0.9],wet);
    if(a.edge==='rolled')s.tube([[rx*0.8,0.06,rz*0.2],[rx*0.9,0.17,rz*0.3],[rx*0.85,0.21,rz*0.4]],0.035,crust);
    if(a.story==='overflow')s.tube([[0,ly+0.025,0],[0,0.1,rz*0.75],[0.2,0.025,rz*1.2]],0.08,wet);
    if(a.story==='fractured')s.tube([[-rx,0.06,-rz*0.2],[0,ly+0.022,0],[rx,0.06,rz*0.3]],0.025,wet);
    if(a.story==='surveyed')for(let j=0;j<3;j++){s.rod([-rx*0.7+j*rx*0.7,ly,-rz*0.6],[-rx*0.7+j*rx*0.7,ly+0.22,-rz*0.6],0.008,edge);s.box([0.07,0.06,0.008],[-rx*0.7+j*rx*0.7,ly+0.2,-rz*0.6],crystal);}

    return s.finish();
  },
});
