import {choice,defineLook,score} from '@conjure/kit';
import {anatomy,prepare,organ,oval,scene,membrane,crop,rim,vein,line,label,finish,stop,canvas} from './organic';
import {micrograph} from './micrograph';
export default defineLook({questions:{
 inhabitants:choice('What beings are drawn inside the world’s own surfaces?',{masks:'Nested skull-masks, staring faces and little witnesses inhabit the skin.',vermin:'Worms, tooth-beasts, bird larvae and searching roots weave through the surfaces.',settlements:'Tiny doorways, crooked villages and inhabited cliffs grow inside the larger forms.',choir:'A mixed bestiary of faces, creatures, small people and impossible little places.'}),
 hierarchy:score('How do the inner pictures divide their scales?',['A dense web of fine creatures with a few larger masks','Balanced large inhabitants, smaller scenes and tiny pictorial details','Broad masks and creatures whose bodies shelter smaller drawings']),
pigment:choice('Which substances form the image?',{bone:'Ivory marrow, olive shadows and rust-red markings.',rust:'Iron oxide, dried red clay and pale flesh.',verdigris:'Green copper salts and bone with a rusty accent.',charcoal:'Carbon, ash and sepia on old tissue.'}),
 colony:choice('How are the viewing spores arranged?',{canopy:'A giant mushroom lens shelters a row of smaller spores.',orbit:'Satellite spores orbit one large off-centre observation lens.',drift:'A diagonal rising drift of spores at successively smaller scales.',twin:'Two lens-bearing fruiting bodies lean toward each other.'}),
 cap:choice('What anatomy does each lens reveal?',{gills:'Radiating gill marks beneath each lens.',hairs:'A fine radial sensory fringe.',ridges:'Concentric ridges around the glassy spore.',facets:'An angular mineral wall grown around the spore.'}),
 magnify:score('How large is the observatory’s foremost spore?',['A modest lens on the scene','A large window into the scene','An enormous world-bearing cap']),
 state:choice('What is the fungal colony doing?',{watching:'Spore lenses remain attached to their tall stalks.',releasing:'Small image-bearing spores detach and drift upward.',rooted:'All stalks join a dense shared mycelium at the foot.',dormant:'The lower stalks fold into fine dark curls.'}),
target:choice('What is revealed in the smaller chambers?',{hero:'An enlarged individual from the cast.',witness:'Different supporting witnesses isolated in sequence.',world:'The whole scene repeated as another small world.'}),nesting:score('How far does the image reproduce inside itself?',['One inset within the picture','Nested daughter images','Three generations of images inside images']),},async apply(cap,a,ctx,signal){
const f=await prepare(cap,ctx,signal,a.pigment),d=f.d;

 const bg=new Path2D();bg.rect(.04,.04,.92,.89);scene(f,bg,[.04,.04,.92,.89],[0,0,1,1],.66);d.fillStyle=f.p.paper;d.globalAlpha=.10;d.fill(bg);d.globalAlpha=1;
 const R=.245+a.magnify*.08;
 const nodes=a.colony==='canopy'?[[.48,.39,R],[.18,.71,.105],[.77,.69,.13]]:a.colony==='orbit'?[[.42,.47,R],[.81,.20,.10],[.81,.73,.13],[.15,.16,.068]]:a.colony==='drift'?[[.3,.65,R],[.67,.34,.17],[.83,.12,.072]]:[[.28,.43,R*.84],[.73,.48,R*.85],[.53,.80,.08]];
 nodes.forEach(([x,y,r],i)=>{stop(signal);
  // A fleshy tapering stalk and visible lamellar underside distinguish fruiting bodies from hand lenses.
  const stalk=new Path2D();stalk.moveTo(x-r*.15,y+r*.45);stalk.bezierCurveTo(x-r*.18,y+r*.8,x-.065,.88,x-.065,.92);stalk.quadraticCurveTo(x-.025,.94,x+.008,.91);stalk.bezierCurveTo(x-.018,.83,x+r*.08,y+r*.83,x+r*.17,y+r*.45);stalk.closePath();
  const sg=d.createLinearGradient(x-r*.16,0,x+r*.14,0);sg.addColorStop(0,f.p.ink);sg.addColorStop(.35,f.p.mid);sg.addColorStop(.65,f.p.paper);sg.addColorStop(1,f.p.mid);d.fillStyle=sg;d.fill(stalk);anatomy(f,stalk);rim(f,stalk,.003,false);
  const underside=new Path2D();underside.moveTo(x-r*.93,y+r*.35);underside.bezierCurveTo(x-r*.60,y+r*1.1,x+r*.6,y+r*1.1,x+r*.93,y+r*.35);underside.quadraticCurveTo(x,y+r*.64,x-r*.93,y+r*.35);underside.closePath();d.fillStyle=f.p.mid;d.fill(underside);anatomy(f,underside);rim(f,underside,.004,false);
  for(let k=0;k<29;k++){const t=k/28*Math.PI;d.beginPath();d.moveTo(x,y+r*.91);d.quadraticCurveTo(x+Math.cos(t)*r*.42,y+r*.86,x+Math.cos(t)*r*.91,y+r*(.37+Math.sin(t)*.48));d.strokeStyle=k%3?f.p.ink:f.p.paper;d.globalAlpha=.6;d.lineWidth=.0012;d.stroke();}d.globalAlpha=1;
if(a.state==='dormant'){d.beginPath();d.ellipse(x-.05,.85,.045,.018,.3,0,Math.PI*1.8);d.strokeStyle=f.p.ink;d.lineWidth=.003;d.stroke();}
  membrane(f,x,y,r,r*.80,i===0?[0,0,1,1]:crop(f,a.target,i),'double',a.cap==='facets'?.08:.01);
  if(a.cap==='gills')for(let j=0;j<23;j++){const t=Math.PI*.08+j/22*Math.PI*.84;line(f,[x+Math.cos(t)*r*.94,y+Math.sin(t)*r*.78,x+Math.cos(t)*r*.7,y+Math.sin(t)*r*.9],f.p.ink,.0012);}
  if(a.cap==='hairs')for(let j=0;j<54;j++){const t=j/54*Math.PI*2;line(f,[x+Math.cos(t)*r,y+Math.sin(t)*r*.8,x+Math.cos(t)*(r+.014),y+Math.sin(t)*(r*.8+.014)],f.p.ink,.001);}
  if(a.cap==='ridges')for(let j=0;j<4;j++){d.lineWidth=.0013;d.strokeStyle=f.p.accent;d.stroke(oval(x,y,r+.006+j*.004,r*.8+.006+j*.004));}
  for(let j=0;j<1+Math.round(a.nesting*2);j++){const rr=r*(.25-j*.05);membrane(f,x+r*.5-j*.018,y+r*.34-j*.011,rr,rr*.8,[0,0,1,1],'double',.02);}
 });
 if(a.state==='rooted')for(let i=0;i<32;i++)vein(f,.08+ctx.random()*.84,.94,.12+ctx.random()*.78,.85,.0015);
 if(a.state==='releasing')for(let i=0;i<7;i++){const x=.59+i*.044,y=.24-i*.027,r=.02+(i%2)*.006;membrane(f,x,y,r,r,[0,0,1,1],'plain',.02);}
 await micrograph(f,a.inhabitants,a.hierarchy);
 label(f,'MYCOLOGICAL OBSERVATORY / CULTURE OF PLACES',.045,.975,.0095);return finish(f,[a.colony+' fungal lenses',a.cap+' anatomy',a.state]);

}});
