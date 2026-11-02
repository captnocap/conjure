import {choice,defineLook,score} from '@conjure/kit';
import {anatomy,prepare,organ,oval,scene,membrane,crop,rim,vein,line,label,finish,stop,canvas,tint} from './organic';
import {micrograph} from './micrograph';
export default defineLook({questions:{
 inhabitants:choice('What beings are drawn inside the world’s own surfaces?',{masks:'Nested skull-masks, staring faces and little witnesses inhabit the skin.',vermin:'Worms, tooth-beasts, bird larvae and searching roots weave through the surfaces.',settlements:'Tiny doorways, crooked villages and inhabited cliffs grow inside the larger forms.',choir:'A mixed bestiary of faces, creatures, small people and impossible little places.'}),
 hierarchy:score('How do the inner pictures divide their scales?',['A dense web of fine creatures with a few larger masks','Balanced large inhabitants, smaller scenes and tiny pictorial details','Broad masks and creatures whose bodies shelter smaller drawings']),
pigment:choice('Which substances form the image?',{bone:'Pale warm tissue, soft mid shadows and sharp contrasting marks.',rust:'Toned, smouldering stock with heavy shadows and sombre marks.',verdigris:'Cool mineral salts, vivid mid tones and a hot contrasting accent.',charcoal:'Restrained, ashen, near-monochrome on old tissue.'}),
 section:choice('How was the colossal bone sectioned?',{shaft:'A long horizontal femur opens into one broad marrow landscape.',vertebra:'A vertebral ring surrounds a central landscape and four smaller cavities.',jaw:'A curved jawbone carries a row of tooth-like image sockets.',ribs:'Overlapping rib arches surround the main landscape cavity.'}),
 marrow:choice('What fills the cavity rims?',{lace:'Fine branching ivory trabeculae.',pores:'Clusters of round dark pores.',fibres:'Parallel fibrous scratches following the bone.',crystals:'Angular mineral spurs at the bone edge.'}),
 opening:score('How far has the bone been opened?',['A narrow surgical window','An exposed central cavity','A broad landscape inside the skeleton']),
 state:choice('What happened to the bone?',{excavated:'Fine excavation lines and three measured cut marks.',healing:'Bony bridges are regrowing across peripheral windows.',fractured:'A black diagonal fracture splits the upper skeleton.',inhabited:'Small nested worlds occupy every surviving cavity.'}),
target:choice('What is revealed in the smaller chambers?',{hero:'An enlarged individual from the cast.',witness:'Different supporting witnesses isolated in sequence.',world:'The whole scene repeated as another small world.'}),nesting:score('How far does the image reproduce inside itself?',['One inset within the picture','Nested daughter images','Three generations of images inside images']),},async apply(cap,a,ctx,signal){
const f=await prepare(cap,ctx,signal,a.pigment),d=f.d;

 d.fillStyle=f.p.mid;d.globalAlpha=.35;d.fillRect(0,0,1,1);d.globalAlpha=1;
 const bone=new Path2D();
 if(a.section==='shaft'){
 bone.moveTo(.08,.31);bone.bezierCurveTo(.01,.10,.26,.10,.30,.27);bone.bezierCurveTo(.44,.32,.60,.32,.72,.24);bone.bezierCurveTo(.80,.08,.99,.15,.92,.34);bone.bezierCurveTo(.85,.44,.85,.53,.94,.65);bone.bezierCurveTo(.99,.84,.76,.89,.70,.70);bone.bezierCurveTo(.56,.66,.41,.66,.28,.74);bone.bezierCurveTo(.17,.93,.01,.82,.08,.64);bone.bezierCurveTo(.15,.53,.15,.42,.08,.31);bone.closePath();
 }else if(a.section==='vertebra'){
 bone.moveTo(.47,.035);bone.lineTo(.54,.035);bone.lineTo(.59,.22);bone.bezierCurveTo(.71,.25,.77,.29,.80,.36);bone.lineTo(.97,.33);bone.lineTo(.97,.47);bone.lineTo(.86,.55);bone.bezierCurveTo(.91,.70,.84,.86,.68,.88);bone.lineTo(.59,.97);bone.lineTo(.51,.86);bone.lineTo(.40,.96);bone.lineTo(.33,.84);bone.bezierCurveTo(.13,.84,.10,.69,.15,.55);bone.lineTo(.03,.47);bone.lineTo(.03,.33);bone.lineTo(.20,.36);bone.bezierCurveTo(.25,.27,.32,.24,.41,.22);bone.closePath();
 }else{
 bone.moveTo(.07,.26);bone.bezierCurveTo(.02,.65,.08,.84,.5,.90);bone.bezierCurveTo(.92,.84,.98,.65,.93,.26);bone.lineTo(.80,.23);bone.bezierCurveTo(.78,.37,.70,.39,.5,.40);bone.bezierCurveTo(.30,.39,.22,.37,.20,.23);bone.closePath();
 }
 const bg=d.createLinearGradient(.1,.1,.8,.95);bg.addColorStop(0,tint('#f2e7c9',ctx,'ground'));bg.addColorStop(.28,f.p.paper);bg.addColorStop(.66,f.p.mid);bg.addColorStop(1,tint('#eee1c0',ctx,'ground'));d.fillStyle=bg;d.fill(bone);anatomy(f,bone);rim(f,bone,.009,false);
 const rx=a.section==='vertebra'?.30:.35,ry=.225+a.opening*.036;
 const cavity=organ(.5,.51,rx,ry,.022,.7);scene(f,cavity,[.5-rx,.51-ry,rx*2,ry*2]);d.strokeStyle=f.p.ink;d.lineWidth=.013;d.stroke(cavity);d.strokeStyle=f.p.paper;d.lineWidth=.004;d.stroke(cavity);
 // Mineral trabeculae are clipped to the solid bone, with a clear central marrow landscape.
 const pale=tint('#eee4c8',ctx,'ground');d.save();d.clip(bone);f.h.save();f.h.clip(bone);
 for(let i=0;i<360;i++){stop(signal);const t=ctx.random()*Math.PI*2,band=ctx.random(),x=.5+Math.cos(t)*(rx+.025+band*.14),y=.51+Math.sin(t)*(ry+.022+band*.17),r=.002+ctx.random()*.008;
  if(a.marrow==='pores'){d.fillStyle=f.p.ink;d.globalAlpha=.45;d.fill(oval(x,y,r,r*.7));}
  else if(a.marrow==='fibres')line(f,[x,y,x+Math.cos(t)*.028,y+Math.sin(t)*.022],f.p.mid,.0014);
  else if(a.marrow==='crystals')line(f,[x-r,y+r,x,y-r*2,x+r,y+r],f.p.ink,.0012);
  else{line(f,[x,y,x+Math.cos(t)*.025,y+Math.sin(t)*.025],pale,.004);line(f,[x,y,x+.014,y-.012],f.p.ink,.0011);}
 }d.globalAlpha=1;d.restore();f.h.restore();
 const sockets=a.section==='jaw'?[[.18,.26],[.34,.28],[.50,.30],[.66,.28],[.82,.26]]:a.section==='vertebra'?[[.1,.41],[.9,.41],[.28,.79],[.73,.79]]:[[.15,.26],[.84,.25],[.16,.73],[.84,.73]];
 sockets.forEach(([x,y],i)=>{const r=a.section==='jaw'?.054:.059;let opening:Path2D;
 if(a.section==='jaw'){opening=new Path2D();opening.moveTo(x-r,y+.025);opening.lineTo(x-r*.8,y-.07);opening.quadraticCurveTo(x,y-.10,x+r*.8,y-.07);opening.lineTo(x+r,y+.025);opening.closePath();}else opening=organ(x,y,r,r*.75,.12,i);
 scene(f,opening,[x-r,y-.07,r*2,.10],crop(f,a.target,i));rim(f,opening,.009);for(let j=0;j<1+Math.round(a.nesting*2);j++){const rr=r*(.34-j*.075);membrane(f,x+r*.42-j*.007,y+r*.20,rr,rr*.72,[0,0,1,1],'plain',.05);}
 if(a.state==='healing')line(f,[x-r,y+r*.2,x+r,y-r*.2],f.p.paper,.009);
 });
 if(a.section==='ribs')for(let k=0;k<5;k++){const y=.18+k*.116;for(const side of [-1,1]){const rib=new Path2D();rib.moveTo(.5,y);rib.bezierCurveTo(.5+side*.52,y-.055,.5+side*.47,y+.19,.5+side*.27,y+.27);anatomy(f,rib,.025);d.strokeStyle=f.p.ink;d.lineWidth=.025;d.stroke(rib);d.strokeStyle=f.p.paper;d.lineWidth=.017;d.stroke(rib);}}
 if(a.state==='fractured')line(f,[.18,.15,.29,.22,.23,.27,.37,.32],f.p.ink,.008);
 if(a.state==='excavated')for(let i=0;i<3;i++)line(f,[.22+i*.25,.93,.27+i*.25,.89],f.p.accent,.003);
 if(a.state==='inhabited')for(let i=0;i<4;i++)membrane(f,.27+i*.15,.92,.031,.022,crop(f,a.target,i),'plain',.05);
 await micrograph(f,a.inhabitants,a.hierarchy);
 label(f,'MARROW SECTION / HABITABLE BONE',.07,.965,.011);return finish(f,[a.section+' skeletal section',a.marrow+' bone texture',a.state]);

}});
