import * as THREE from 'three';
import { Sculpture, choice, defineThing, score } from '@conjure/kit';
export default defineThing({
  questions:{
    form: choice('What is the broad shape of the ice dome?', {'rounded': 'A rounded inflated dome.', 'flat': 'A low broad shield with a flattened crown.', 'twin': 'Two joined domes share one flow apron.', 'ridge': 'An elongated fissure ridge.'}),
    vent: choice('Where has material escaped?', {'central': 'One dark central vent.', 'fissure': 'A long open central fissure.', 'ring': 'Several vents follow a circular fracture.', 'flank': 'A single side vent breaks through the flank.'}),
    fractures: choice('How is the dome fractured?', {'radial': 'Radial fractures run down from the summit.', 'concentric': 'Concentric cracks surround the high point.', 'polygon': 'An irregular polygonal crack network.', 'bare': 'An unfractured smooth cap.'}),
    flows: choice('What flow lobes surround the dome?', {'broad': 'Two broad rounded flow tongues.', 'fingers': 'Several narrow fingered flows.', 'ropes': 'Corded parallel ridges follow one flow.', 'none': 'No flow apron beyond the dome.'}),
    surface: choice('How is the frozen surface textured?', {'smooth': 'Smooth pale ice with a soft sheen.', 'plates': 'Angular overlapping plates.', 'pitted': 'Small dark pits dot the surface.', 'rubble': 'A few broken ice blocks sit on the flanks.'}),
    state: choice('What stage of activity is visible?', {'inflated': 'The cap is fully inflated and intact.', 'collapsed': 'The summit has sagged into a shallow caldera.', 'fresh': 'Dark fresh material occupies the newest flow.', 'quiet': 'An old quiet dome with filled fractures.'}),
    survey: choice('What remote survey marker is present?', {'none': 'No sign of an expedition.', 'stakes': 'A line of small survey stakes.', 'beacon': 'A squat transmitter on three legs.', 'target': 'A bright three-panel calibration target.'}),
    plume: choice('What rises from the vent?', {'none': 'Nothing rises from the ice.', 'wisps': 'A few faint curved wisps.', 'jet': 'A narrow pale frozen spray.', 'fallout': 'Fine bright grains settle around the vent.'}),
    scale: score('How tall is the ice dome?', ['Compact', 'Medium sized', 'Broad and substantial']),
  },
  build(a,context){
    const s=new Sculpture(context),rnd=context.random;
    const ice=s.material('#c1c8bb',{roughness:0.55}),shade=s.material('#768d88'),fresh=s.material('#4e6965',{roughness:0.23}),h=0.32+a.scale*0.7;
    const centres=a.form==='twin'?[-0.45,0.45]:[0];
    const capY=(r:number)=>0.03+h*(a.form==='flat'?Math.min(0.75,Math.cos(r*Math.PI/2)):Math.cos(r*Math.PI/2))-(a.state==='collapsed'?Math.exp(-r*r/0.06)*h*0.5:0);
    for(const cx of centres){
      const rx=a.form==='ridge'?1.35:a.form==='twin'?0.85:1.2,rz=a.form==='ridge'?0.65:1.1;
      s.surface((u,v,p)=>{const t=u*Math.PI*2,r=v,cap=a.form==='flat'?Math.min(0.75,Math.cos(r*Math.PI/2)):Math.cos(r*Math.PI/2);const sag=a.state==='collapsed'?Math.exp(-r*r/0.06)*h*0.5:0;p.set(cx+Math.cos(t)*rx*r,0.03+h*cap-sag,Math.sin(t)*rz*r);},ice,{segments:[48,18],wrap:true});
      const vy=0.03+h*(a.form==='flat'?0.75:1)-(a.state==='collapsed'?h*0.5:0);
      if(a.vent==='central')s.cylinder(0.16,0.12,0.015,[cx,vy+0.008,0],fresh,20);
      if(a.vent==='fissure')s.tube([[cx-0.45,capY(0.45/rx)+0.012,0],[cx,vy+0.012,0.02],[cx+0.45,capY(0.45/rx)+0.012,0]],0.045,fresh);
      if(a.vent==='ring')for(let j=0;j<6;j++){const t=j/6*Math.PI*2;s.cylinder(0.07,0.05,0.02,[cx+Math.cos(t)*0.35,capY(0.35/rz)+0.012,Math.sin(t)*0.35],fresh,10);}
      if(a.vent==='flank')s.ball([0.18,0.04,0.12],[cx+rx*0.7,capY(0.7)+0.015,0.1],fresh,14);
      if(a.fractures==='radial'||a.fractures==='polygon')for(let j=0;j<9;j++){const t=j/9*Math.PI*2,pts:[number,number,number][]=[];for(let k=2;k<12;k++){const r=k/12,tt=t+(a.fractures==='polygon'?Math.sin(k*2)*0.07:0);pts.push([cx+Math.cos(tt)*rx*r,capY(r)+0.012,Math.sin(tt)*rz*r]);}s.tube(pts,a.state==='quiet'?0.006:0.014,shade);}
      if(a.fractures==='concentric')for(let j=0;j<3;j++){const rr=0.35+j*0.2;const pts:[number,number,number][]=Array.from({length:49},(_,k)=>{const t=k/48*Math.PI*2;return [cx+Math.cos(t)*rx*rr,capY(rr)+0.012,Math.sin(t)*rz*rr];});s.tube(pts,0.012,shade);}
      for(let j=0;j<(a.surface==='smooth'?0:18);j++){const t=rnd()*Math.PI*2,r=0.3+rnd()*0.6,x=cx+Math.cos(t)*rx*r,z=Math.sin(t)*rz*r,y=capY(r)+0.012;
        if(a.surface==='pitted')s.ball([0.04,0.008,0.04],[x,y,z],shade,8);else if(a.surface==='plates'){const plate=s.box([0.13,0.025,0.1],[x,y,z],ice);plate.rotation.set(r*0.4,t,0.1);}else{const rock=s.mesh(new THREE.DodecahedronGeometry(0.085),ice,[x,y+0.025,z]);rock.scale.y=0.6;}
      }
    }
    if(a.flows!=='none')for(let j=0;j<(a.flows==='broad'?2:5);j++){const t=-0.5+j*0.3,x=Math.sin(t)*1.1,z=Math.cos(t)*1.1;const lobe=s.ball([a.flows==='broad'?0.42:0.13,0.035,0.65],[x,0.035,z],a.state==='fresh'?fresh:ice,18);lobe.rotation.y=t;if(a.flows==='ropes')for(let k=0;k<3;k++)s.tube([[x+(k-1)*0.04,0.08,z-0.5],[x+(k-1)*0.04+0.05,0.09,z],[x+(k-1)*0.04,0.065,z+0.5]],0.012,shade);}
    if(a.survey==='stakes')for(let j=0;j<4;j++)s.rod([-1.1+j*0.65,0.02,1.7],[-1.1+j*0.65,0.25,1.7],0.01,shade);
    if(a.survey==='beacon'){for(let j=0;j<3;j++){const t=j/3*Math.PI*2;s.rod([1.5,0.25,0],[1.5+Math.cos(t)*0.15,0.02,Math.sin(t)*0.15],0.012,shade);}s.box([0.18,0.13,0.14],[1.5,0.29,0],shade);s.rod([1.5,0.35,0],[1.5,0.6,0],0.006,shade);}
    if(a.survey==='target')for(let j=0;j<3;j++){const plate=s.box([0.18,0.2,0.015],[-1.5,0.1,0],s.material(j%2?'#4d625c':'#d8d7bc'));plate.rotation.y=j*Math.PI*2/3;}
    const haze=s.material('#d9ddd2',{transparent:true,opacity:0.24,depthWrite:false});
    if(a.plume==='wisps')for(let j=0;j<3;j++)s.tube([[0,h+0.03,0],[0.08+j*0.03,h+0.25,0.05],[0.18+j*0.05,h+0.5,0.1]],0.02,haze);
    if(a.plume==='jet')s.cylinder(0.01,0.07,0.7,[0,h+0.38,0],haze,16);
    if(a.plume==='fallout')s.scatter(new THREE.IcosahedronGeometry(0.015,0),ice,Array.from({length:45},()=>({at:[(rnd()-0.5)*0.8,h+0.1+rnd()*0.5,(rnd()-0.5)*0.8] as [number,number,number],size:1})));

    return s.finish();
  },
});
