import {choice,defineLook,score} from '@conjure/kit';
import {anatomy,prepare,organ,oval,scene,membrane,crop,rim,vein,line,label,finish,stop,canvas} from './organic';
import {micrograph} from './micrograph';
export default defineLook({questions:{
 inhabitants:choice('What beings are drawn inside the world’s own surfaces?',{masks:'Nested skull-masks, staring faces and little witnesses inhabit the skin.',vermin:'Worms, tooth-beasts, bird larvae and searching roots weave through the surfaces.',settlements:'Tiny doorways, crooked villages and inhabited cliffs grow inside the larger forms.',choir:'A mixed bestiary of faces, creatures, small people and impossible little places.'}),
 hierarchy:score('How do the inner pictures divide their scales?',['A dense web of fine creatures with a few larger masks','Balanced large inhabitants, smaller scenes and tiny pictorial details','Broad masks and creatures whose bodies shelter smaller drawings']),
pigment:choice('Which substances form the image?',{bone:'Pale warm tissue, soft mid shadows and sharp contrasting marks.',rust:'Toned, smouldering stock with heavy shadows and sombre marks.',verdigris:'Cool mineral salts, vivid mid tones and a hot contrasting accent.',charcoal:'Restrained, ashen, near-monochrome on old tissue.'}),
 fossil:choice('What kind of time has preserved the place?',{ammonite:'A broad spiral of ribbed ammonite chambers.',stump:'Concentric annual rings surround the remembered scene.',vertebra:'An open spiral of vertebral image chambers.',accretion:'Uneven mineral layers wrap the scene like a pearl.'}),
 ribs:choice('What separates the fossil chambers?',{septa:'Heavy dark radial septa.',striations:'Many fine parallel growth striations.',teeth:'Pointed mineral teeth along the outer rim.',cracks:'Thin branching cracks with rusty cores.'}),
 aperture:score('How much of the central memory survives?',['A small old scene inside broad fossil chambers','A substantial central memory','The scene fills most of the fossil']),
 state:choice('What state is the fossil in?',{buried:'A complete fossil still held in its dark matrix.',excavated:'Measured cuts and labelled chamber numbers mark an excavation.',split:'One long dark fault cuts across the outer chambers.',regrowing:'Tiny new image chambers bud outside the fossil rim.'}),
target:choice('What is revealed in the smaller chambers?',{hero:'An enlarged individual from the cast.',witness:'Different supporting witnesses isolated in sequence.',world:'The whole scene repeated as another small world.'}),nesting:score('How far does the image reproduce inside itself?',['One inset within the picture','Nested daughter images','Three generations of images inside images']),},async apply(cap,a,ctx,signal){
const f=await prepare(cap,ctx,signal,a.pigment),d=f.d;

 d.fillStyle=f.p.ink;d.globalAlpha=.12;d.fillRect(0,0,1,1);d.globalAlpha=1;
 const outer=organ(.5,.49,.448,.425,a.fossil==='accretion'?.045:.012,0);d.fillStyle=f.p.paper;d.fill(outer);anatomy(f,outer);rim(f,outer,.008);
 const central=.22+a.aperture*.105;
 membrane(f,.49,.49,central,central,[0,0,1,1],'double',a.fossil==='accretion'?.025:.006);
 if(a.fossil==='stump'||a.fossil==='accretion')for(let j=0;j<12;j++){const r=central+.014+j*(.43-central)/12;d.strokeStyle=j%3?f.p.mid:f.p.accent;d.lineWidth=j%3?.001:.002;d.stroke(organ(.49,.49,r,r*.96,a.fossil==='accretion'?.025:.008,j*.2));}

 const count=a.fossil==='vertebra'?10:15;
 for(let i=0;i<count;i++){stop(signal);const ta=-Math.PI*.7+i/count*Math.PI*2,tb=-Math.PI*.7+(i+1)/count*Math.PI*2;
 const radial=(t:number)=>a.fossil==='ammonite'?.26+(t+Math.PI*.7)/(Math.PI*2)*.17:.425;
 const thick=a.fossil==='ammonite'?.13:Math.max(.085,.425-central-.018),chamber=new Path2D();
 let minX=1,minY=1,maxX=0,maxY=0;
 const point=(t:number,r:number,move=false)=>{const x=.49+Math.cos(t)*r,y=.49+Math.sin(t)*r*.97;minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);move?chamber.moveTo(x,y):chamber.lineTo(x,y);};
 for(let k=0;k<=12;k++){const t=ta+(tb-ta)*k/12;point(t,radial(t),k===0);}
 for(let k=12;k>=0;k--){const t=ta+(tb-ta)*k/12;point(t,radial(t)-thick);}
 chamber.closePath();
 const x=(minX+maxX)/2,y=(minY+maxY)/2,r=Math.min(maxX-minX,maxY-minY)*.40;
 if(a.fossil==='vertebra'){
  const rr=.064;const vertebra=organ(x,y,rr,rr*.84,.18,i);scene(f,vertebra,[x-rr,y-rr*.84,rr*2,rr*1.68],crop(f,a.target,i));rim(f,vertebra,.014);line(f,[x-rr*.7,y,x-rr*1.4,y-.025],f.p.paper,.016);line(f,[x+rr*.7,y,x+rr*1.4,y+.025],f.p.paper,.016);
 }else{scene(f,chamber,[minX,minY,maxX-minX,maxY-minY],crop(f,a.target,i));d.strokeStyle=f.p.ink;d.lineWidth=.013;d.stroke(chamber);anatomy(f,chamber,.013);d.strokeStyle=f.p.paper;d.lineWidth=.007;d.stroke(chamber);d.strokeStyle=f.p.mid;d.lineWidth=.0016;d.stroke(chamber);}
 for(let j=0;j<1+Math.round(a.nesting*2);j++){const rr=r*(.31-j*.065);membrane(f,x+r*.30-j*.004,y+r*.25-j*.003,rr,rr*.9,[0,0,1,1],'plain',.01);}
 if(a.state==='excavated')label(f,String(i+1).padStart(2,'0'),x-r*.3,y-r*1.1,.008);
 }
 // A continuous involute unites the chambers into one shell, never a necklace of unrelated lenses.
 if(a.fossil==='ammonite'){const spiral=new Path2D();for(let k=0;k<=260;k++){const t=-Math.PI*.7+k/260*Math.PI*4,r=.025+Math.pow(k/260,1.1)*.412,x=.49+Math.cos(t)*r,y=.49+Math.sin(t)*r*.97;k?spiral.lineTo(x,y):spiral.moveTo(x,y);}d.strokeStyle=f.p.ink;d.lineWidth=.008;d.stroke(spiral);anatomy(f,spiral,.008);d.strokeStyle=f.p.paper;d.lineWidth=.003;d.stroke(spiral);}
 membrane(f,.49,.49,Math.min(central,.25),Math.min(central,.25),[0,0,1,1],'plain',a.fossil==='accretion'?.025:.006);
 for(let i=0;i<100;i++){const t=i/100*Math.PI*2,r1=.417,r2=.447;const x=.5+Math.cos(t)*r1,y=.49+Math.sin(t)*r1*.96;
 if(a.ribs==='septa'||a.ribs==='striations')line(f,[x,y,.5+Math.cos(t)*r2,.49+Math.sin(t)*r2*.96],i%4?f.p.mid:f.p.ink,a.ribs==='septa'&&i%4===0?.003:.001);
 else if(a.ribs==='teeth')line(f,[x,y,.5+Math.cos(t+.012)*.455,.49+Math.sin(t+.012)*.438,.5+Math.cos(t+.025)*r1,.49+Math.sin(t+.025)*r1*.96],f.p.ink,.0012);
 else if(i%5===0)line(f,[x,y,x+Math.cos(t)*.016+.005,y+Math.sin(t)*.014,x+Math.cos(t)*.032,y+Math.sin(t)*.03],f.p.accent,.0017);
 }
 if(a.state==='split')line(f,[.16,.23,.31,.26,.27,.33,.36,.39],f.p.ink,.008);
 if(a.state==='regrowing')for(let i=0;i<4;i++)membrane(f,.81+i*.025,.79-i*.04,.029-i*.003,.024-i*.002,[0,0,1,1],'double',.03);
 if(a.state==='buried'){d.strokeStyle=f.p.mid;d.lineWidth=.01;d.stroke(organ(.5,.49,.462,.44,.02));}
 await micrograph(f,a.inhabitants,a.hierarchy);
 label(f,'FOSSILIZED ECHO / A RECORD OLDER THAN ITS WORLD',.055,.975,.0094);return finish(f,[a.fossil+' memory fossil',a.ribs+' growth anatomy',a.state]);

}});
