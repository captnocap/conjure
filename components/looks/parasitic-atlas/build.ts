import {choice,defineLook,score} from '@conjure/kit';
import {anatomy,prepare,organ,oval,scene,membrane,crop,rim,vein,line,label,finish,stop,canvas} from './organic';
import {micrograph} from './micrograph';
export default defineLook({questions:{
 inhabitants:choice('What beings are drawn inside the world’s own surfaces?',{masks:'Nested skull-masks, staring faces and little witnesses inhabit the skin.',vermin:'Worms, tooth-beasts, bird larvae and searching roots weave through the surfaces.',settlements:'Tiny doorways, crooked villages and inhabited cliffs grow inside the larger forms.',choir:'A mixed bestiary of faces, creatures, small people and impossible little places.'}),
 hierarchy:score('How do the inner pictures divide their scales?',['A dense web of fine creatures with a few larger masks','Balanced large inhabitants, smaller scenes and tiny pictorial details','Broad masks and creatures whose bodies shelter smaller drawings']),
pigment:choice('Which substances form the image?',{bone:'Pale warm tissue, soft mid shadows and sharp contrasting marks.',rust:'Toned, smouldering stock with heavy shadows and sombre marks.',verdigris:'Cool mineral salts, vivid mid tones and a hot contrasting accent.',charcoal:'Restrained, ashen, near-monochrome on old tissue.'}),
 circuit:choice('How does the parasite organize its atlas?',{spine:'A central vertical spinal trunk feeds chambers on both sides.',radial:'A central feeding site sends arteries to the sheet’s corners.',margin:'A cluster of scene organs grows along the right margin.',ladder:'Paired transverse vessels climb the scene like ribs.'}),
 anatomy:choice('What is the vessel tissue?',{arteries:'Thick dark vessels with red living cores.',roots:'Fine branching roots with tapering tendrils.',sutures:'Stitched cords held at regular cross ties.',double:'Parallel vessels like a dissected nervous system.'}),
 aperture:score('How broad are the feeding windows?',['Small tissue samples','Large diagnostic windows','Dominant scene organs']),
 state:choice('What has happened to the host?',{feeding:'Every organ still feeds from a marked point in the scene.',quarantined:'Barred boundary marks isolate every sampled organ.',severed:'Disconnected vessel ends lie beside one collapsed sample.',reversed:'Arrows point inward: the samples are feeding the original world.'}),
target:choice('What is revealed in the smaller chambers?',{hero:'An enlarged individual from the cast.',witness:'Different supporting witnesses isolated in sequence.',world:'The whole scene repeated as another small world.'}),nesting:score('How far does the image reproduce inside itself?',['One inset within the picture','Nested daughter images','Three generations of images inside images']),},async apply(cap,a,ctx,signal){
const f=await prepare(cap,ctx,signal,a.pigment),d=f.d;

 const main=new Path2D();main.rect(.065,.07,.87,.85);scene(f,main,[.065,.07,.87,.85]);d.strokeStyle=f.p.ink;d.lineWidth=.002;d.stroke(main);
 const host=canvas(f.s);host.getContext('2d')!.drawImage(f.outCanvas,0,0);const hostMask=canvas(f.s);hostMask.getContext('2d')!.drawImage(f.host,0,0);
 const R=.073+a.aperture*.055;
 let nodes:number[][]=a.circuit==='margin'?[[.79,.24,R],[.79,.52,R],[.77,.79,R*.85]]:a.circuit==='radial'?[[.17,.2,R],[.81,.2,R],[.18,.78,R],[.8,.78,R]]:a.circuit==='spine'?[[.2,.3,R],[.8,.48,R],[.22,.74,R]]:[[.18,.23,R],[.8,.29,R],[.18,.73,R],[.8,.78,R]];
 if(a.circuit==='spine'||a.circuit==='ladder')vein(f,.49,.11,.52,.89,.018);
 nodes.forEach(([x,y,r],i)=>{stop(signal);const source=crop(f,a.target,i),sx=source[0]+source[2]/2,sy=source[1]+source[3]/2;const ax=.065+sx*.87,ay=.07+sy*.85;
  const thick=a.anatomy==='roots'?.004:.013;vein(f,ax,ay,x,y,thick);if(a.anatomy==='double')vein(f,ax+.012,ay,x+.012,y,.004);
  if(a.anatomy==='roots')for(let k=0;k<7;k++)vein(f,ax+(k-3)*.013,ay+.06,x+(k-3)*.006,y,.0015);
  if(a.anatomy==='sutures')for(let k=0;k<10;k++){const t=k/10;line(f,[ax+(x-ax)*t-.008,ay+(y-ay)*t-.008,ax+(x-ax)*t+.008,ay+(y-ay)*t+.008],f.p.ink,.002);}
  d.strokeStyle=f.p.accent;d.lineWidth=.0015;d.stroke(oval(ax,ay,.015));line(f,[ax-.025,ay,ax+.025,ay],f.p.accent,.001);
  membrane(f,x,y,r,r*.76,source,a.anatomy==='sutures'?'sutures':'double',.07);
  for(let j=0;j<1+Math.round(a.nesting*2);j++){const rr=r*(.32-j*.07);membrane(f,x+r*.5-j*.014,y+r*.4-j*.009,rr,rr*.8,[0,0,1,1],'plain',.02);}
  if(a.state==='quarantined'){d.strokeStyle=f.p.accent;d.lineWidth=.002;d.setLineDash([.008,.005]);d.stroke(organ(x,y,r*1.15,r*.9,.03));d.setLineDash([]);}
  if(a.state==='reversed'){line(f,[ax+.014,ay-.024,ax,ay,ax+.028,ay],f.p.accent,.003);}
  if(a.state==='severed'&&i===0){const mx=.3125*ax+.6875*x-.0225,my=.5*(ay+y)+.00375;d.save();d.clip(oval(mx,my,.035));d.drawImage(host,0,0,1,1);d.restore();f.h.save();f.h.clip(oval(mx,my,.035));f.h.drawImage(hostMask,0,0,1,1);f.h.restore();line(f,[mx-.012,my+.036,mx+.003,my+.044,mx+.012,my+.038],f.p.accent,.0025);}
  label(f,'HOST '+String(i+1).padStart(2,'0'),x-r,y-r-.022,.010);
 });
 await micrograph(f,a.inhabitants,a.hierarchy);
 label(f,'PARASITIC ATLAS / FEEDING RELATIONS',.065,.97,.011);return finish(f,[a.circuit+' vascular chart',a.state,'Identity-selected organs containing smaller complete worlds']);

}});
