import * as THREE from 'three';
import { Sculpture, choice, score, noul, diorama, defineThing, defineWorld, figure } from '@conjure/kit';
export default defineThing({
  questions: {
    rack: choice("What supports the hanging rail?", {"gantry": "A freestanding steel gantry.", "wood": "A sturdy timber rack.", "wheels": "A wheeled drying rack.", "double": "Two parallel hanging rails."}),
    frames: choice("What frames hang here?", {"road": "Diamond road frames.", "step": "Low step-through frames.", "mixed": "Alternating road and step-through frames.", "forks": "Forks hang between smaller frames."}),
    finish: choice("What stage is the paint at?", {"primer": "All frames in red primer.", "colours": "Different finished colours.", "bare": "Bare silver tubing.", "masked": "Coloured tubes with masked joints."}),
    hooks: choice("What suspends the frames?", {"wire": "Thin wire hooks.", "chain": "Short chain hangers.", "bar": "Rigid S hooks.", "wood": "Wooden hanging pegs."}),
    spacing: choice("How is the rack filled?", {"even": "Frames evenly spaced along the rail.", "cluster": "Frames clustered at one end.", "alternating": "Alternating high and low hangers.", "one": "One solitary finished frame."}),
    floor: choice("What catches paint below?", {"tray": "A broad metal drip tray.", "paper": "Brown protective paper.", "cloth": "A pale canvas drop cloth.", "bare": "Bare floor below the rack."}),
    supplies: choice("What finishing supplies remain?", {"cans": "Three small paint cans.", "gun": "A spray gun on a side hook.", "swatches": "A line of painted sample cards.", "none": "No finishing supplies."}),
    state: choice("What happened to the batch?", {"drying": "Frames are drying quietly.", "tagged": "Paper job tags hang on each frame.", "rework": "One frame has a contrasting repair band.", "packed": "The first frame is wrapped in protective paper."}),
    number: score("How many frames are in the batch?", ["Two frames", "Four frames", "Six frames"])
  },
  build(a,context){

    const s=new Sculpture(context),steel=s.material('#69776d',{metalness:0.65}),wood=s.material('#9a8158'),base=a.rack==='wood'?wood:steel,n=a.spacing==='one'?1:2+Math.round(a.number*4),width=1.4+n*0.35;
    for(const x of [-width/2,width/2]){s.rod([x,0.08,-0.2],[x,2.3,-0.2],0.035,base);s.box([0.08,0.08,0.8],[x,0.05,0],base);if(a.rack==='wheels')for(const z of [-0.3,0.3])s.cylinder(0.055,0.055,0.04,[x,0.055,z],steel,16).rotation.z=Math.PI/2;}
    s.rod([-width/2,2.3,-0.2],[width/2,2.3,-0.2],0.035,base);if(a.rack==='double')s.rod([-width/2,2.3,0.25],[width/2,2.3,0.25],0.035,base);
    for(let i=0;i<n;i++){const x=a.spacing==='cluster'?-width/2+0.35+i*0.25:(i-(n-1)/2)*0.42,y=1.9-(a.spacing==='alternating'?i%2*0.2:0),mat=s.material(a.finish==='primer'?'#a56852':a.finish==='bare'?'#adb7aa':['#628784','#b69d59','#8d695c','#8397a2'][i%4],{metalness:0.4}),start=s.root.children.length;
      const p:[number,number,number][]=[[0,0,0],[-0.2,0.48,0],[0.4,0.43,0],[0.48,0.27,0],[-0.48,0.02,0]];
      for(const [u,v] of [[0,1],[0,3],[2,3],[1,4],[0,4]])s.rod(p[u],p[v],0.018,mat);s.rod(p[1],a.frames==='step'||a.frames==='mixed'&&i%2?[0.3,0.14,0]:p[2],0.018,mat);if(a.frames==='forks')for(const z of [-0.04,0.04])s.rod([0.48,0.27,z],[0.55,-0.08,z],0.012,mat);
      if(a.finish==='masked'||a.state==='packed'&&i===0)for(const p0 of p)s.ball([0.028,0.04,0.028],p0,s.material('#d4c6a3'),10);if(a.state==='rework'&&i===0)s.rod([-0.14,0.34,0],[-0.2,0.48,0],0.022,wood);
      const g=new THREE.Group();for(const child of s.root.children.slice(start))g.add(child);g.rotation.y=Math.PI/2-0.35;g.position.set(x,y-0.48,0);s.root.add(g);
      s.tube([[x,2.32,-0.2],[x,2.42,-0.2],[x,2.35,0],[x,y,0]],a.hooks==='wire'?0.005:a.hooks==='wood'?0.015:0.01,a.hooks==='wood'?wood:steel);
      if(a.state==='tagged')s.label('JOB '+(i+1),0.18,0.1,[x,y-0.3,0.15],'#59604d','#ddd2af');
    }
    if(a.floor!=='bare')s.box([width+0.3,0.012,1.15],[0,0.007,0],s.material(a.floor==='tray'?'#8f9b8b':a.floor==='paper'?'#b6a079':'#d4cbb0'));
    if(a.supplies==='cans')for(let i=0;i<3;i++)s.cylinder(0.075,0.075,0.14,[width/2-0.2-i*0.18,0.08,0.35],s.material(['#628784','#b69d59','#8d695c'][i]),20);
    if(a.supplies==='gun'){s.rod([width/2,1.4,0],[width/2+0.2,1.4,0],0.025,steel);s.cylinder(0.07,0.06,0.15,[width/2+0.12,1.51,0],steel,16);s.rod([width/2+0.03,1.4,0],[width/2,1.25,0],0.018,wood);}
    if(a.supplies==='swatches')for(let i=0;i<4;i++)s.box([0.12,0.2,0.005],[-0.3+i*0.2,2.12,-0.21],s.material(['#628784','#b69d59','#8d695c','#8397a2'][i]));return s.finish();

  },
});
