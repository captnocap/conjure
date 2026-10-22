import {choice,defineLook,score} from '@conjure/kit';
import {prepare,organ,oval,scene,membrane,crop,vein,line,label,finish,stop} from './organic';
import {micrograph} from './micrograph';
export default defineLook({questions:{
 inhabitants:choice('What beings are drawn inside the world’s own surfaces?',{masks:'Nested skull-masks, staring faces and little witnesses inhabit the skin.',vermin:'Worms, tooth-beasts, bird larvae and searching roots weave through the surfaces.',settlements:'Tiny doorways, crooked villages and inhabited cliffs grow inside the larger forms.',choir:'A mixed bestiary of faces, creatures, small people and impossible little places.'}),
 hierarchy:score('How do the inner pictures divide their scales?',['A dense web of fine creatures with a few larger masks','Balanced large inhabitants, smaller scenes and tiny pictorial details','Broad masks and creatures whose bodies shelter smaller drawings']),
 pigment:choice('Which substances stain the tissue?',{bone:'Ivory marrow, olive shadow, a rust-red nucleus.',rust:'Oxidized iron and dried red clay.',verdigris:'Green copper salts on pale mineral tissue.',charcoal:'Carbon, ash and restrained sepia.'}),
 growth:choice('How has the mother cell divided?',{asymmetric:'One giant mother with an eccentric budding daughter.',twins:'A pair of substantial daughter chambers share the mother.',chain:'A descending chain of successively smaller offspring.',colony:'Daughter chambers gather around the mother’s lower margin.'}),
 target:choice('What does each daughter inherit?',{hero:'An enlarged identity from the cast.',witness:'A different supporting witness in each chamber.',world:'The complete scene repeats as another little world.'}),
 depth:score('How many generations can be seen inside the cells?',['One daughter generation','Two generations','Three nested generations']),
 membrane:choice('What forms the membrane?',{double:'Twin concentric mineral walls.',cilia:'A fine fringe of sensory hairs.',sutures:'A seam held shut by transverse stitches.',plain:'One thick dark organic boundary.'}),
 state:choice('What is happening to this tissue?',{incubating:'Closed cells shelter a scene still gestating.',dividing:'A red cleavage line pulls the mother into new worlds.',infected:'Fine vascular connections link every daughter to the mother.',escaped:'An empty ruptured cell outside the mother marks an escape.'}),
 opening:score('How large are the daughter apertures?',['Small nuclei embedded in the scene','Substantial organs opening onto details','Large offspring visibly carrying another world'])
},async apply(cap,a,ctx,signal){
 const f=await prepare(cap,ctx,signal,a.pigment),d=f.d;const mother=organ(.5,.49,.451,.434,.032,ctx.random()*6);
 scene(f,mother,[.065,.055,.87,.87]);membrane(f,.5,.49,.451,.434,[0,0,1,1],a.membrane,.032);
 for(let k=0;k<5;k++){d.strokeStyle=k%2?f.p.accent:f.p.ink;d.lineWidth=.001;d.globalAlpha=.14;d.stroke(organ(.5,.49,.463+k*.004,.447+k*.004,.028,k*.2));}d.globalAlpha=1;

 // Anatomical tissue fills only the unused image regions; cast silhouettes remain intact.
 for(let cluster=0;cluster<12;cluster++){
  let x=0,y=0,found=false;
  for(let attempt=0;attempt<26;attempt++){x=.12+ctx.random()*.76;y=.12+ctx.random()*.74;const xx=Math.max(0,Math.min(cap.size-1,Math.floor((x-.065)/.87*cap.size))),yy=Math.max(0,Math.min(cap.size-1,Math.floor((y-.055)/.87*cap.size)));if(Math.hypot((x-.5)/.43,(y-.49)/.41)<.91&&cap.identity[(yy*cap.size+xx)*4]<2){found=true;break;}}
  if(!found)continue;
  const angle=Math.atan2(y-.49,x-.5),X=.5+Math.cos(angle)*.43,Y=.49+Math.sin(angle)*.416;
  vein(f,X,Y,x,y,.0028+ctx.mood.energy*.0018);
  for(let branch=0;branch<5;branch++){const xx=x+(ctx.random()-.5)*.075,yy=y+(ctx.random()-.5)*.066;vein(f,x,y,xx,yy,.0011);d.strokeStyle=f.p.mid;d.lineWidth=.0012;d.stroke(organ(xx,yy,.008+ctx.random()*.008,.007+ctx.random()*.008,.13,branch));d.fillStyle=f.p.accent;d.globalAlpha=.38;d.fill(oval(xx,yy,.0025));d.globalAlpha=1;}
 }
 const R=.091+a.opening*.061;let cells:number[][];
 if(a.growth==='asymmetric')cells=[[.71,.68,R*1.2],[.25,.30,R*.63]];
 else if(a.growth==='twins')cells=[[.26,.67,R],[.72,.68,R]];
 else if(a.growth==='chain')cells=[[.74,.27,R],[.77,.53,R*.78],[.68,.75,R*.56]];
 else cells=[[.22,.67,R*.77],[.47,.79,R*.67],[.76,.67,R*.83]];
 if(a.state==='infected')for(const [x,y]of cells)vein(f,.49,.48,x,y,.01);
 if(a.state==='dividing'){vein(f,.5,.065,.51,.9,.011);vein(f,.52,.068,.54,.9,.004);}
 cells.forEach(([x,y,r],i)=>{stop(signal);membrane(f,x,y,r,r*.94,crop(f,a.target,i),a.membrane,.04);
  for(let gen=0;gen<1+Math.round(a.depth*2);gen++){const rr=r*(.34-gen*.077),xx=x+r*(.46-gen*.17),yy=y+r*(.38-gen*.12);membrane(f,xx,yy,rr,rr,[0,0,1,1],gen?'plain':a.membrane,.02);}
  label(f,String(i+1).padStart(2,'0'),x-r*.8,y-r*1.17,.009);
 });
 if(a.state==='escaped'){d.fillStyle=f.p.paper;d.fill(organ(.88,.14,.05,.037,.1));d.strokeStyle=f.p.ink;d.lineWidth=.003;d.stroke(organ(.88,.14,.05,.037,.1));vein(f,.83,.16,.78,.22,.003);}
 await micrograph(f,a.inhabitants,a.hierarchy);label(f,'SECTION / THE WORLD IS STILL DEVELOPING',.07,.971,.010);return finish(f,['A full scene in a mother membrane',a.growth,a.state,`${1+Math.round(a.depth*2)} visible daughter generations`]);
}});
