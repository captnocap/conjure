import {choice,defineLook,score} from '@conjure/kit';
import {anatomy,prepare,organ,oval,scene,membrane,crop,rim,vein,line,label,finish,stop,canvas} from './organic';
import {micrograph} from './micrograph';
export default defineLook({questions:{
 inhabitants:choice('What beings are drawn inside the world’s own surfaces?',{masks:'Nested skull-masks, staring faces and little witnesses inhabit the skin.',vermin:'Worms, tooth-beasts, bird larvae and searching roots weave through the surfaces.',settlements:'Tiny doorways, crooked villages and inhabited cliffs grow inside the larger forms.',choir:'A mixed bestiary of faces, creatures, small people and impossible little places.'}),
 hierarchy:score('How do the inner pictures divide their scales?',['A dense web of fine creatures with a few larger masks','Balanced large inhabitants, smaller scenes and tiny pictorial details','Broad masks and creatures whose bodies shelter smaller drawings']),
pigment:choice('Which substances form the image?',{bone:'Pale warm tissue, soft mid shadows and sharp contrasting marks.',rust:'Toned, smouldering stock with heavy shadows and sombre marks.',verdigris:'Cool mineral salts, vivid mid tones and a hot contrasting accent.',charcoal:'Restrained, ashen, near-monochrome on old tissue.'}),
 incision:choice('How has the skin of the place opened?',{peel:'A broad lower flap peels back to expose layered worlds.',fault:'A diagonal fault opens three nested image strata.',windows:'Three slit incisions expose scene organs under the surface.',fold:'A central fold curls one half of the image into its own smaller duplicate.'}),
 grain:choice('What anatomy covers the surface?',{creases:'Thin branching crease lines.',scales:'Overlapping short mineral scale marks.',pores:'Small pores and follicle rings.',stitches:'Transverse stitches close the old creases.'}),
 exposure:score('How much of the hidden skin is exposed?',['A few narrow openings','Substantial inner image strata','Wide flaps revealing a world beneath the world']),
 state:choice('What happened to the skin?',{healing:'Scar lines join the openings with pale raised seams.',mapped:'Measured incision marks chart the hidden strata.',shedding:'A translucent duplicate outline has slipped away from the surface.',reopened:'Dark rivulets run from old seams into the lower layer.'}),
target:choice('What is revealed in the smaller chambers?',{hero:'An enlarged individual from the cast.',witness:'Different supporting witnesses isolated in sequence.',world:'The whole scene repeated as another small world.'}),nesting:score('How far does the image reproduce inside itself?',['One inset within the picture','Nested daughter images','Three generations of images inside images']),},async apply(cap,a,ctx,signal){
const f=await prepare(cap,ctx,signal,a.pigment),d=f.d;


 d.fillStyle=f.p.mid;d.globalAlpha=.28;d.fillRect(0,0,1,1);d.globalAlpha=1;
 const skin=new Path2D();skin.moveTo(.07,.09);skin.bezierCurveTo(.3,.035,.64,.115,.94,.06);skin.lineTo(.9,.31);skin.quadraticCurveTo(.94,.55,.89,.77);skin.lineTo(.93,.92);skin.bezierCurveTo(.64,.88,.42,.98,.065,.91);skin.quadraticCurveTo(.12,.61,.06,.38);skin.closePath();
 d.save();d.translate(.009,.018);d.fillStyle=f.p.accent;d.fill(skin);d.restore();scene(f,skin,[.045,.034,.91,.892]);rim(f,skin,.007);
 // Long tension folds read as a material sheet before the individual incisions are noticed.
 for(let i=0;i<3;i++){const crease=new Path2D();crease.moveTo(.08,.19+i*.26);crease.bezierCurveTo(.30,.11+i*.26,.64,.29+i*.21,.91,.17+i*.28);d.strokeStyle=f.p.ink;d.globalAlpha=.18;d.lineWidth=.015;d.stroke(crease);anatomy(f,crease,.015);d.globalAlpha=.55;d.strokeStyle=f.p.paper;d.lineWidth=.004;d.stroke(crease);}d.globalAlpha=1;

 for(let j=0;j<24;j++){const y=.10+j*.033;d.beginPath();d.moveTo(.06,y);for(let k=0;k<=40;k++){const x=.06+k*.022;d.lineTo(x,y+Math.sin(x*15+j*.24)*.009+Math.sin(x*33+j)*.003);}d.strokeStyle=f.p.mid;d.globalAlpha=.15;d.lineWidth=.0009;d.stroke();}d.globalAlpha=1;
 const e=.06+a.exposure*.065;
 const flap=(x:number,y:number,w:number,h:number,i:number)=>{const p=new Path2D();p.moveTo(x-w,y);p.bezierCurveTo(x-w*.75,y-h,x+w*.8,y-h*.92,x+w,y);p.bezierCurveTo(x+w*.65,y+h*.55,x-w*.7,y+h*.45,x-w,y);scene(f,p,[x-w,y-h,w*2,h*1.5],crop(f,a.target,i));rim(f,p,.007);d.beginPath();d.moveTo(x-w,y);d.bezierCurveTo(x-w*.4,y+h*.77,x+w*.5,y+h*.6,x+w,y);d.strokeStyle=f.p.paper;d.lineWidth=.011;d.stroke();d.strokeStyle=f.p.ink;d.lineWidth=.0015;d.stroke();
 const lip=new Path2D();lip.moveTo(x-w,y);lip.bezierCurveTo(x-w*.6,y+h*.53,x+w*.6,y+h*.53,x+w,y);lip.bezierCurveTo(x+w*.60,y+h*1.02,x-w*.62,y+h*.94,x-w,y);lip.closePath();const grad=d.createLinearGradient(0,y,0,y+h);grad.addColorStop(0,f.p.ink);grad.addColorStop(.42,f.p.mid);grad.addColorStop(.66,f.p.paper);grad.addColorStop(1,f.p.accent);d.fillStyle=grad;d.fill(lip);anatomy(f,lip);d.lineWidth=.0015;d.strokeStyle=f.p.ink;d.stroke(lip);
 for(let k=0;k<15;k++){const xx=x-w*.76+k*w*1.52/14,arc=1-((xx-x)/w)**2;line(f,[xx,y+h*.33*arc,xx+.008,y+h*.75*arc],f.p.mid,.001);}

 for(let j=0;j<1+Math.round(a.nesting*2);j++)membrane(f,x+w*.5-j*.012,y-h*.25,w*(.19-j*.04),h*(.24-j*.05),[0,0,1,1],'plain',.03);};
 if(a.incision==='peel'){for(let k=2;k>=0;k--){const p=new Path2D();p.moveTo(.09,.73+k*.055);p.bezierCurveTo(.31,.62+k*.055,.65,.92+k*.025,.91,.70+k*.055);p.lineTo(.91,.94);p.lineTo(.09,.94);p.closePath();scene(f,p,[.09,.65+k*.055,.82,.31],[0,0,1,1]);rim(f,p,.004);}flap(.74,.36,.15,e*1.2,0);}
 else if(a.incision==='fault'){for(let i=0;i<3;i++)flap(.25+i*.25,.24+i*.22,.16,e*1.3,i);}
 else if(a.incision==='windows'){flap(.25,.29,.16,e,0);flap(.72,.37,.17,e*1.2,1);flap(.52,.75,.23,e*1.1,2);}
 else {flap(.54,.51,.33,e*1.7,0);flap(.7,.78,.14,e*.7,1);}
 for(let i=0;i<90;i++){const x=.08+ctx.random()*.84,y=.08+ctx.random()*.8;if(a.grain==='pores'){d.strokeStyle=f.p.mid;d.lineWidth=.0007;d.stroke(oval(x,y,.0025));}else if(a.grain==='scales'){d.beginPath();d.arc(x,y,.007,0,Math.PI);d.strokeStyle=f.p.mid;d.lineWidth=.001;d.stroke();}else if(a.grain==='stitches')line(f,[x-.003,y-.006,x+.003,y+.006],f.p.ink,.001);else line(f,[x-.009,y,x,y+.003,x+.01,y-.002],f.p.mid,.0008);}
 if(a.state==='reopened')for(let i=0;i<4;i++)vein(f,.3+i*.14,.66,.28+i*.16,.87,.003);
 if(a.state==='shedding'){d.strokeStyle=f.p.mid;d.lineWidth=.0015;d.stroke(organ(.516,.49,.466,.446,.035,1.4));}
 if(a.state==='healing')for(let i=0;i<5;i++)line(f,[.16+i*.14,.90,.19+i*.14,.85],f.p.paper,.004);
 if(a.state==='mapped')for(let i=0;i<8;i++){line(f,[.11+i*.1,.95,.11+i*.1,.935],f.p.ink,.001);label(f,String(i+1),.105+i*.1,.968,.009);}
 await micrograph(f,a.inhabitants,a.hierarchy);
 return finish(f,[a.incision+' dermal opening',a.grain+' surface',a.state]);

}});
