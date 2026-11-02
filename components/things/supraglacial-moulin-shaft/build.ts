import * as THREE from 'three';
import { Sculpture, choice, defineThing, score } from '@conjure/kit';
export default defineThing({questions:{
    mouth:choice('What shape is the moulin opening?', {'round': 'A round vertical shaft.', 'oval': 'An elongated oval shaft.', 'keyhole': 'A round opening joins a narrow inlet slot.', 'double': 'Two linked shafts share an ice collar.'}),
    rim:choice('What surrounds the opening?', {'smooth': 'A smoothly scalloped ice lip.', 'fractured': 'Angular blocks break the rim.', 'snow': 'A thick rounded snow cornice.', 'blue': 'Bare blue ice with deep vertical striations.'}),
    inlet:choice('How does meltwater reach the shaft?', {'single': 'A single stream cuts across the collar.', 'fork': 'Two narrow streams meet at the opening.', 'cascade': 'A stepped cascade descends from a raised ice ledge.', 'dry': 'A dry incised channel leads to the shaft.'}),
    bridge:choice('What spans part of the opening?', {'none': 'The whole shaft mouth is open.', 'snow': 'A narrow natural snow bridge.', 'ice': 'A thick clear ice arch.', 'ladder': 'A short aluminium survey ladder spans the lip.'}),
    depth:choice('How is the shaft interior exposed?', {'dark': 'A dark opening with little detail below.', 'steps': 'Several internal ice ledges are visible.', 'spiral': 'A spiral groove descends along the inner wall.', 'cutaway': 'One front quadrant is removed to show the shaft wall.'}),
    rope:choice('What survey line reaches into the opening?', {'none': 'No survey equipment.', 'single': 'A single anchored rope drops inside.', 'tripod': 'A three-legged survey tripod supports a weighted line.', 'cross': 'A two-anchor rope traverses the mouth.'}),
    cracks:choice('What cracks cross the surrounding ice?', {'radial': 'Five radiating cracks.', 'parallel': 'Three parallel crevasse traces.', 'network': 'An angular branching crack network.', 'none': 'Unbroken smooth ice outside the shaft.'}),
    event:choice('What has recently happened?', {'flowing': 'Pale foam grains cluster at the inlet.', 'collapse': 'A fallen snow block lies at the bottom.', 'measured': 'Three small numbered stakes mark the rim.', 'frozen': 'Thin icicles hang from the upper lip.'}),
    size:score('How broad is the ice collar?', ['Compact','Medium','Broad']),
},build(a,context){
const s=new Sculpture(context),rnd=context.random;
const snow=s.material('#d8ded7'),ice=s.material('#94b8bc'),dark=s.material('#435a5d'),metal=s.material('#9aa7a2',{metalness:0.6}),orange=s.material('#b8703f');
const R=0.8+a.size*0.6,rz=a.mouth==='oval'?R*0.68:R,outer=R*1.6,H=0.62,wall=s.material('#60959e'),pool=s.material('#294c57',{roughness:0.2});
const hole=(cx:number,rr:number)=>{const localOuter=a.mouth==='double'?R*0.9:outer;const max=a.depth==='cutaway'?Math.PI*1.5:Math.PI*2;
s.surface((u,v,p)=>{const t=u*max+0.2,r=rr+(localOuter-rr)*v,scallop=Math.cos(t*7)*0.025;p.set(cx+Math.cos(t)*r,H+Math.sin(v*Math.PI)*0.12+scallop,Math.sin(t)*r*rz/R);},a.rim==='snow'?snow:ice,{segments:[48,12]});
s.surface((u,v,p)=>{const t=u*max+0.2,r=rr*(0.84+v*0.16);p.set(cx+Math.cos(t)*r,0.04+v*H,Math.sin(t)*r*rz/R);},wall,{segments:[48,12]});
s.surface((u,v,p)=>{const t=u*max+0.2;p.set(cx+Math.cos(t)*localOuter,v*(H+Math.cos(t*7)*0.025),Math.sin(t)*localOuter*rz/R);},ice,{segments:[48,2],flip:true});
s.cylinder(rr*0.86,rr*0.86,0.035,[cx,0.025,0],pool,32).scale.z=rz/R;
if(a.depth==='steps')for(let j=0;j<3;j++){const ring=s.ring(rr*(0.86+j*0.04),0.035,[cx,0.12+j*0.16,0],ice,max);ring.rotation.x=Math.PI/2;ring.scale.y=rz/R;}
if(a.depth==='spiral'){const pts:[number,number,number][]=Array.from({length:75},(_,j)=>{const t=j/74*Math.PI*5,y=0.08+j/74*0.5,r=rr*(0.84+y/H*0.16);return [cx+Math.cos(t)*r,y,Math.sin(t)*r*rz/R];});s.tube(pts,0.025,ice);}
for(let j=0;j<14;j++){const t=j/14*max+0.2,x=cx+Math.cos(t)*rr,z=Math.sin(t)*rr*rz/R;if(a.rim==='fractured'){const b=s.mesh(new THREE.IcosahedronGeometry(0.16,0),snow,[x,H+0.05,z]);b.scale.set(1,0.5,0.8);}if(a.rim==='blue')s.rod([x,H-0.05,z],[cx+(x-cx)*0.9,0.15,z*0.9],0.014,ice);if(a.event==='frozen')s.cylinder(0.025,0,0.2,[x*0.98,H-0.1,z*0.98],snow,8);}
};if(a.mouth==='double'){hole(-R*0.65,R*0.45);hole(R*0.65,R*0.45);}else hole(0,R*0.64);
const centers=a.mouth==='double'?[-R*0.65,R*0.65]:[0],inner=a.mouth==='double'?R*0.45:R*0.64,localOuter=a.mouth==='double'?R*0.9:outer;
for(const cx of centers)for(let j=0;j<(a.inlet==='fork'?2:1);j++){
  const theta=(a.depth==='cutaway'?Math.PI:-Math.PI/2)+(a.inlet==='fork'?(j-0.5)*0.35:0),width=a.mouth==='keyhole'?0.12:0.065;
  s.surface((u,v,p)=>{const r=localOuter-(localOuter-inner)*v,t=theta+(u-0.5)*width/R,rad=(r-inner)/(localOuter-inner);p.set(cx+Math.cos(t)*r,H+Math.sin(rad*Math.PI)*0.12+Math.cos(t*7)*0.025+0.009,Math.sin(t)*r*rz/R);},a.inlet==='dry'?dark:wall,{segments:[4,24],flip:true});
  if(a.inlet==='cascade')for(let k=0;k<3;k++){const rr=inner+(localOuter-inner)*(0.55+k*0.15),rad=(rr-inner)/(localOuter-inner);s.box([0.3,0.07,0.12],[cx+Math.cos(theta)*rr,H+Math.sin(rad*Math.PI)*0.12+0.035,Math.sin(theta)*rr*rz/R],ice);}
}
if(a.bridge==='snow')s.box([R*1.5,0.13,0.23],[0,H+0.1,0],snow);if(a.bridge==='ice'){const pts:[number,number,number][]=Array.from({length:17},(_,j)=>{const t=j/16*Math.PI;return [Math.cos(t)*R*0.75,H+Math.sin(t)*0.2,0];});s.tube(pts,0.09,ice);}if(a.bridge==='ladder'){for(const z of [-0.17,0.17])s.rod([-R,H+0.05,z],[R,H+0.05,z],0.025,metal);for(let j=0;j<9;j++)s.rod([-R+j*R/4,H+0.05,-0.17],[-R+j*R/4,H+0.05,0.17],0.018,metal);}
if(a.rope==='single'||a.rope==='cross'){const z=a.rope==='cross'?0.15:0;s.rod([-R*1.25,H,z],[-R*1.25,H+0.28,z],0.025,orange);s.tube([[-R*1.25,H+0.2,z],[-R*0.5,H+0.05,z],[0,0.15,z]],0.012,orange);if(a.rope==='cross'){s.rod([R*1.25,H,0.15],[R*1.25,H+0.28,0.15],0.025,orange);s.tube([[0,0.15,0.15],[R*0.5,H+0.05,0.15],[R*1.25,H+0.2,0.15]],0.012,orange);}}
if(a.rope==='tripod'){for(let j=0;j<3;j++){const t=j/3*Math.PI*2;s.rod([Math.cos(t)*R,H,Math.sin(t)*R],[0,H+1,0],0.025,metal);}s.rod([0,H+1,0],[0,0.15,0],0.008,orange);s.ball([0.05,0.08,0.05],[0,0.15,0],dark,10);}
if(a.cracks!=='none')for(const cx of centers)for(let j=0;j<(a.cracks==='parallel'?3:5);j++){
 const angle=a.cracks==='parallel'?0.4+j*0.18:0.3+j/5*(a.depth==='cutaway'?4.4:Math.PI*2);
 const pts:[number,number,number][]=Array.from({length:17},(_,k)=>{const v=k/16,r=inner+0.04+(localOuter-inner-0.06)*v,t=angle+(a.cracks==='network'?Math.sin(k*1.7)*0.05:0),rad=(r-inner)/(localOuter-inner);return [cx+Math.cos(t)*r,H+Math.sin(rad*Math.PI)*0.12+Math.cos(t*7)*0.025+0.006,Math.sin(t)*r*rz/R];});s.tube(pts,0.009,dark);
}
if(a.event==='flowing')for(let j=0;j<16;j++)s.ball([0.025,0.01,0.025],[(rnd()-0.5)*0.1,H+0.12,-rz*(0.7+rnd()*0.15)],snow,6);if(a.event==='collapse')s.mesh(new THREE.IcosahedronGeometry(0.2,0),snow,[0,0.15,0]);if(a.event==='measured')for(let j=0;j<3;j++){const x=(j-1)*R;s.rod([x,H,R],[x,H+0.35,R],0.016,orange);s.label(String(j+1),0.08,0.09,[x,H+0.3,R+0.02],'#33474a','#d2d1b3');}

return s.finish();
}});
