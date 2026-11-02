import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing } from '@conjure/kit';

export default defineThing({
  questions:{
    body:choice('What material frames the slide viewer?',{wood:'Dark polished wood with brass corners.',black:'Black technical metal with chrome rails.',cream:'Cream plastic with a brown eyepiece.',red:'Red-painted folding travel viewer.'}),
    bellows:choice('What colour are the accordion folds?',{black:'Matte black cloth.',burgundy:'Dark burgundy leather.',tan:'Warm tan leather.',silver:'Silver-grey coated fabric.'}),
    extension:score('How far are the bellows extended?',['Compressed almost shut','Halfway open','Fully extended']),
    image:choice('What image is on the slide?',{holiday:'A sun over hills and a small house.',portrait:'A single portrait silhouette.',flowers:'A vase holding three bright flowers.',blank:'An empty bright slide with no image.'}),
    carrier:choice('How does the slide enter the gate?',{single:'One white cardboard slide mount.',magazine:'A vertical stack of mounted slides.',strip:'An exposed film strip hangs from the gate.',glass:'A large glass plate in a wooden holder.'}),
    hood:choice('What surrounds the viewing eyepiece?',{round:'A circular rubber eye cup.',square:'A deep square viewing hood.',folded:'A folded leather shade rests below.',bare:'A bare polished lens rim.'}),
    stand:choice('How does the viewer stand?',{feet:'Four small rubber feet.',tripod:'A short three-legged tabletop stand.',tilt:'A folding wire tilt stand.',rail:'A long low focusing rail.'}),
    slide:choice('Where are the spare slides?',{none:'No spare slides.',pile:'Three overlapping cardboard mounts.',box:'An open slotted slide box.',sheet:'A contact sheet lies beside the viewer.'}),
    cable:noul('Does a curled power lead trail from the illuminated gate?'),
    memory:choice('What identifies the photograph?',{date:'A handwritten 1968 date on the mount.',name:'A small HOME label on the mount.',number:'A red frame number 24.',unknown:'A QUESTION MARK tag hangs from the carrier.'}),
  },
  build(a,context){
    const s=new Sculpture(context);const body=s.material({wood:'#735336',black:'#303936',cream:'#d6c5a2',red:'#9b4638'}[a.body],{roughness:0.4+context.mood.wear*0.3}),metal=s.material(a.body==='wood'?'#a38950':'#b0b6b1',{metalness:0.75,roughness:0.3}),dark=s.material('#29322f'),cloth=s.material({black:'#262d2b',burgundy:'#5f3338',tan:'#99754d',silver:'#8f9892'}[a.bellows],{roughness:0.9});
    const len=0.1+a.extension*0.2,base=a.stand==='tripod'?0.13:0.035,cy=base+0.09;
    if(a.stand==='tripod')for(let j=0;j<3;j++){const t=j*Math.PI*2/3;s.rod([0,base,0],[Math.sin(t)*0.14,0.008,Math.cos(t)*0.14],0.009,metal);}else{
      s.box([0.18,0.025,len+0.15],[0,0.02,0],body);
      if(a.stand==='tilt')s.tube([[-0.09,0.015,-0.12],[-0.09,0.085,0.03],[0.09,0.085,0.03],[0.09,0.015,-0.12]],0.006,metal);
      if(a.stand==='feet')for(const x of [-0.065,0.065])for(const z of [-len/2,len/2])s.ball([0.014,0.008,0.014],[x,0.008,z],dark,10);
    }
    for(const x of [-0.075,0.075])s.rod([x,base+0.01,-len/2-0.07],[x,base+0.01,len/2+0.07],0.006,metal);
    s.box([0.19,0.18,0.026],[0,cy,-len/2-0.018],body);s.box([0.14,0.14,0.027],[0,cy,len/2+0.018],body);
    // A continuous folded skin: alternating rectangular sections join without open gaps.
    cloth.side=THREE.DoubleSide;
    const corners=[[-1,-1],[1,-1],[1,1],[-1,1],[-1,-1]];
    s.surface((u,v,t)=>{
      const edge=Math.min(3,Math.floor(u*4)),f=u*4-edge;
      const at=v*18,fold=Math.min(17,Math.floor(at)),along=at-fold;
      const r0=fold%2===0?0.085:0.068,r1=fold%2===0?0.068:0.085,r=r0+(r1-r0)*along;
      const x=corners[edge][0]+(corners[edge+1][0]-corners[edge][0])*f;
      const y=corners[edge][1]+(corners[edge+1][1]-corners[edge][1])*f;
      t.set(x*r,cy+y*r,-len/2+v*len);
    },cloth,{segments:[4,18],wrap:true});
    const rim=s.cylinder(0.034,0.042,0.045,[0,cy,len/2+0.05],metal,32);rim.rotation.x=Math.PI/2;
    s.ring(0.025,0.008,[0,cy,len/2+0.079],dark);
    if(a.hood==='round')s.ring(0.039,0.012,[0,cy,len/2+0.089],dark);
    if(a.hood==='square'){for(const x of [-0.047,0.047])s.box([0.008,0.1,0.065],[x,cy,len/2+0.095],dark);for(const y of [-0.047,0.047])s.box([0.1,0.008,0.065],[0,cy+y,len/2+0.095],dark);}
    if(a.hood==='folded')s.box([0.09,0.012,0.05],[0,base+0.008,len/2+0.075],cloth);
    const card=s.material('#d9d3bd'),picture=s.material('#cfb577',{emissive:'#c1ae71',emissiveIntensity:0.25+context.mood.cheer*0.25});
    const wz=-len/2-0.035;s.box([a.carrier==='glass'?0.18:0.14,0.15,0.005],[0,cy+0.07,wz],card);s.box([0.102,0.09,0.006],[0,cy+0.075,wz+0.005],picture);
    if(a.image==='holiday'){s.ball([0.012,0.012,0.002],[-0.028,cy+0.098,wz+0.01],s.material('#e3cc89'),10);s.box([0.1,0.018,0.003],[0,cy+0.04,wz+0.011],s.material('#75856a'));s.box([0.018,0.021,0.003],[0.026,cy+0.052,wz+0.014],body);}
    if(a.image==='portrait'){s.ball([0.016,0.02,0.002],[0,cy+0.09,wz+0.012],dark,12);s.ball([0.028,0.02,0.002],[0,cy+0.055,wz+0.012],dark,12);}
    if(a.image==='flowers'){s.box([0.024,0.027,0.003],[0,cy+0.045,wz+0.012],body);for(let j=0;j<3;j++){s.rod([0,cy+0.06,wz+0.012],[(j-1)*0.024,cy+0.098-(j%2)*0.01,wz+0.012],0.002,dark);s.ball([0.011,0.012,0.003],[(j-1)*0.024,cy+0.098-(j%2)*0.01,wz+0.012],s.material('#a35d47'),12);}}
    if(a.carrier==='magazine')for(let j=0;j<4;j++)s.box([0.14,0.02,0.012],[0,cy+0.15+j*0.02,wz],card);
    if(a.carrier==='strip'){s.box([0.05,0.17,0.003],[0.065,cy+0.01,wz],s.material('#6c4b32'));for(let j=0;j<5;j++)s.box([0.028,0.022,0.002],[0.065,cy+0.07-j*0.03,wz+0.003],picture);}
    s.label({date:'1968',name:'HOME',number:'24',unknown:'?'}[a.memory],0.08,0.018,[0,cy+0.137,wz+0.006],'#5a4435','#ded5b9');
    if(a.slide==='pile'||a.slide==='box')for(let j=0;j<3;j++){const x=0.18+(j-1)*0.014;s.box([0.065,0.003,0.065],[x,0.008+j*0.007,0],card);s.box([0.04,0.004,0.034],[x,0.011+j*0.007,0],picture);}if(a.slide==='box'){s.box([0.09,0.01,0.11],[0.18,0.007,0],body);for(const x of [0.13,0.23])s.box([0.01,0.07,0.11],[x,0.04,0],body);}
    if(a.slide==='sheet'){const sheet=s.label('01  02  03',0.15,0.09,[0.2,0.003,0],'#544a36','#d7cba8');sheet.rotation.x=-Math.PI/2;}
    if(a.cable)s.tube([[-0.08,base,-len/2],[-0.2,0.015,-0.17],[-0.23,0.01,0.02],[-0.17,0.01,0.1],[-0.12,0.01,0.04]],0.004,dark);
    return s.finish();
  },
});
