import {choice,defineLook,score} from '@conjure/kit';
import {anatomy,prepare,organ,oval,scene,membrane,crop,rim,vein,line,label,finish,stop,canvas,tint} from './organic';
import {micrograph} from './micrograph';
export default defineLook({questions:{
 inhabitants:choice('What beings are drawn inside the world’s own surfaces?',{masks:'Nested skull-masks, staring faces and little witnesses inhabit the skin.',vermin:'Worms, tooth-beasts, bird larvae and searching roots weave through the surfaces.',settlements:'Tiny doorways, crooked villages and inhabited cliffs grow inside the larger forms.',choir:'A mixed bestiary of faces, creatures, small people and impossible little places.'}),
 hierarchy:score('How do the inner pictures divide their scales?',['A dense web of fine creatures with a few larger masks','Balanced large inhabitants, smaller scenes and tiny pictorial details','Broad masks and creatures whose bodies shelter smaller drawings']),
pigment:choice('Which substances form the image?',{bone:'Pale warm tissue, soft mid shadows and sharp contrasting marks.',rust:'Toned, smouldering stock with heavy shadows and sombre marks.',verdigris:'Cool mineral salts, vivid mid tones and a hot contrasting accent.',charcoal:'Restrained, ashen, near-monochrome on old tissue.'}),
 branching:choice('What form has the inhabited coral grown?',{fan:'A broad fan of branching arms around a root chamber.',antler:'Tall irregular antlers bearing scene chambers at their tips.',chandelier:'Drooping branches suspend the little inhabited rooms.',reef:'A low stepped reef of squared image chambers.'}),
 chamber:choice('What shape are the coral rooms?',{arches:'Arched chambers with scalloped coral crowns.',boxes:'Rectangular rooms built from rounded calcified walls.',polyps:'Oval polyps with a fringe of small teeth.',towers:'Narrow tall chambers stacked like tiny chapels.'}),
 spread:score('How far do the branches reach?',['A compact domestic cluster','A wide fan of chambers','A tall spreading architecture']),
 state:choice('What has happened to the colony?',{inhabited:'Each branch carries a fresh miniature inhabited room.',bleached:'Chalk-white ridges trace the outer skeleton.',broken:'One branch ends in a snapped bare stump.',budding:'New tiny room buds emerge beside the older chambers.'}),
target:choice('What is revealed in the smaller chambers?',{hero:'An enlarged individual from the cast.',witness:'Different supporting witnesses isolated in sequence.',world:'The whole scene repeated as another small world.'}),nesting:score('How far does the image reproduce inside itself?',['One inset within the picture','Nested daughter images','Three generations of images inside images']),},async apply(cap,a,ctx,signal){
const f=await prepare(cap,ctx,signal,a.pigment),d=f.d;

 const extent=.70+a.spread*.23;
 let nodes:number[][]=a.branching==='fan'?[[.15,.28,.13],[.4,.16,.13],[.67,.18,.13],[.85,.40,.12]]:a.branching==='antler'?[[.18,.35,.12],[.36,.17,.13],[.66,.14,.12],[.84,.34,.12]]:a.branching==='chandelier'?[[.15,.58,.12],[.34,.31,.12],[.67,.35,.12],[.85,.61,.12]]:[[.14,.63,.12],[.34,.34,.13],[.64,.30,.13],[.85,.58,.12]];
 nodes=nodes.map(([x,y,r])=>[Math.max(.15,Math.min(.85,.5+(x-.5)*extent/.85)),Math.max(.16,Math.min(.8,.5+(y-.5)*extent/.85)),r]);
 const stem=(x:number,y:number,X:number,Y:number,w:number)=>{const angle=Math.atan2(Y-y,X-x),nx=-Math.sin(angle),ny=Math.cos(angle),p=new Path2D();for(const side of [-1,1])for(let k=0;k<=22;k++){const t=side<0?k/22:1-k/22,bulge=Math.sin(t*17)*.06+Math.sin(t*37)*.03,half=w*(.6-t*.28)*(1+bulge),cx=x+(X-x)*t+Math.sin(t*Math.PI)*.025,cy=y+(Y-y)*t;const xx=cx+nx*half*side,yy=cy+ny*half*side;if(side<0&&k===0)p.moveTo(xx,yy);else p.lineTo(xx,yy);}p.closePath();const g=d.createLinearGradient(x-w,y,X+w,Y);g.addColorStop(0,f.p.mid);g.addColorStop(.4,f.p.paper);g.addColorStop(.7,f.p.paper);g.addColorStop(1,f.p.mid);d.fillStyle=g;d.fill(p);anatomy(f,p);d.strokeStyle=f.p.ink;d.lineWidth=.002;d.stroke(p);for(let k=0;k<18;k++){const t=k/18,cx=x+(X-x)*t,cy=y+(Y-y)*t;d.strokeStyle=f.p.mid;d.lineWidth=.001;d.stroke(oval(cx+nx*w*.12,cy+ny*w*.12,.0025,.0035));}};
 stem(.5,.94,.5,.57,.10);
 const base=organ(.5,.92,.17,.044,.14,2);d.fillStyle=f.p.mid;d.fill(base);anatomy(f,base);rim(f,base,.004,false);for(let i=0;i<8;i++)stem(.5,.92,.35+i*.043,.95,.022);

 nodes.forEach(([x,y],i)=>{if(a.state==='broken'&&i===0){stem(.5,.79,.5+(x-.5)*.86,.79+(y-.79)*.86,.07);return;}stem(.5,.79,x,y,.07);stem(.5,.82,x+.045,y+.04,.024);
 for(let k=1;k<5;k++){const q=k/5,xx=.5+(x-.5)*q,yy=.79+(y-.79)*q;stem(xx,yy,xx+(i%2?1:-1)*(.045+k*.006),yy-.035,.016);}
});
 const room=(x:number,y:number,r:number,which:number)=>{let shape:Path2D;let h=r*.86,w=r;if(a.chamber==='towers'){h=r*1.25;w=r*.68;}if(a.chamber==='polyps')shape=organ(x,y,w,h,.07);else{shape=new Path2D();shape.moveTo(x-w,y+h);shape.lineTo(x-w,y-h*.45);if(a.chamber==='arches'||a.chamber==='towers')shape.bezierCurveTo(x-w,y-h*1.65,x+w,y-h*1.65,x+w,y-h*.45);else shape.lineTo(x+w,y-h*.45);shape.lineTo(x+w,y+h);shape.closePath();}
 scene(f,shape,[x-w,y-h,w*2,h*2],which<0?[0,0,1,1]:crop(f,a.target,which));rim(f,shape,.017);d.strokeStyle=f.p.accent;d.lineWidth=.002;d.stroke(shape);
 for(let j=0;j<1+Math.round(a.nesting*2);j++){const rr=r*(.27-j*.055);membrane(f,x+r*.45-j*.012,y+r*.43-j*.01,rr,rr*.78,[0,0,1,1],'plain',.01);}
 for(let k=0;k<18;k++){const t=k/18*Math.PI*2,xx=x+Math.cos(t)*w,yy=y+Math.sin(t)*h;if(a.chamber==='polyps'||Math.sin(t)>.25){const rr=.0035+(k%3)*.0014;d.fillStyle=f.p.paper;d.fill(oval(xx,yy,rr));d.strokeStyle=f.p.mid;d.lineWidth=.001;d.stroke(oval(xx,yy,rr));}}
 for(let k=0;k<10;k++){const xx=x-w+k*w*2/9;line(f,[xx,y+h+.006,xx+.008,y+h+.02],f.p.mid,.0015);}

 };
 room(.5,.62,.255,-1);nodes.forEach(([x,y,r],i)=>{if(a.state!=='broken'||i!==0)room(x,y,r,i);});
 if(a.state==='broken'){const [x,y]=nodes[0],ex=.5+(x-.5)*.86,ey=.79+(y-.79)*.86,angle=Math.atan2(y-.79,x-.5),dx=Math.cos(angle),dy=Math.sin(angle),nx=-dy,ny=dx;line(f,[ex-nx*.026,ey-ny*.026,ex-nx*.009+dx*.012,ey-ny*.009+dy*.012,ex+nx*.004-dx*.009,ey+ny*.004-dy*.009,ex+nx*.026,ey+ny*.026],f.p.ink,.004);for(let k=0;k<3;k++)line(f,[ex+dx*(.035+k*.012)+nx*.012,ey+dy*(.035+k*.012)+ny*.012,ex+dx*(.042+k*.012)+nx*.019,ey+dy*(.042+k*.012)+ny*.019],f.p.mid,.003);}

 if(a.state==='budding')nodes.forEach(([x,y,r],i)=>{membrane(f,x+r*.8,y+r,.032,.026,crop(f,a.target,i),'plain',.06);});
 if(a.state==='bleached'){const bleach=tint('#f5e9ca',ctx,'ground');d.strokeStyle=bleach;d.lineWidth=.002;for(let i=0;i<20;i++)line(f,[.3+i*.02,.93,.33+i*.017,.84],bleach,.002);}
 await micrograph(f,a.inhabitants,a.hierarchy);
 label(f,'REEF OF INTERIORS / THE COLONY REMEMBERS',.045,.976,.010);return finish(f,[a.branching+' coral architecture',a.chamber+' image chambers',a.state]);

}});
