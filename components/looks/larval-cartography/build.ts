import {choice,defineLook,score} from '@conjure/kit';
import {anatomy,prepare,organ,oval,scene,membrane,crop,rim,vein,line,label,finish,stop,canvas} from './organic';
import {micrograph} from './micrograph';
export default defineLook({questions:{
 inhabitants:choice('What beings are drawn inside the world’s own surfaces?',{masks:'Nested skull-masks, staring faces and little witnesses inhabit the skin.',vermin:'Worms, tooth-beasts, bird larvae and searching roots weave through the surfaces.',settlements:'Tiny doorways, crooked villages and inhabited cliffs grow inside the larger forms.',choir:'A mixed bestiary of faces, creatures, small people and impossible little places.'}),
 hierarchy:score('How do the inner pictures divide their scales?',['A dense web of fine creatures with a few larger masks','Balanced large inhabitants, smaller scenes and tiny pictorial details','Broad masks and creatures whose bodies shelter smaller drawings']),
pigment:choice('Which substances form the image?',{bone:'Pale warm tissue, soft mid shadows and sharp contrasting marks.',rust:'Toned, smouldering stock with heavy shadows and sombre marks.',verdigris:'Cool mineral salts, vivid mid tones and a hot contrasting accent.',charcoal:'Restrained, ashen, near-monochrome on old tissue.'}),
 route:choice('Where does the larva cross the map?',{river:'A gently bending river of embryo chambers descends the right edge.',coil:'A curled larva lies along the lower map edge.',diagonal:'The larva traverses the map diagonally from upper left to lower right.',border:'The segmented body wraps around two chart margins.'}),
 survey:choice('How was the living terrain surveyed?',{contours:'Closely spaced irregular contour lines.',hatching:'Short normal-guided hatches track the terrain.',grid:'A fine ruled survey grid and crosshair marks.',isobars:'Broad looping pressure lines around the larva.'}),
 body:score('How broad is the transparent larval body?',['A slender cartographic specimen','A substantial chain of landscape embryos','An oversized embryonic world']),
 state:choice('What developmental state does the map record?',{gestating:'Closed membranes preserve each embryonic image.',migrating:'Directional chevrons point along the larval route.',molting:'A second empty outline trails the inhabited body.',hatched:'The final chamber has broken open and left a loose shell.'}),
target:choice('What is revealed in the smaller chambers?',{hero:'An enlarged individual from the cast.',witness:'Different supporting witnesses isolated in sequence.',world:'The whole scene repeated as another small world.'}),nesting:score('How far does the image reproduce inside itself?',['One inset within the picture','Nested daughter images','Three generations of images inside images']),},async apply(cap,a,ctx,signal){
const f=await prepare(cap,ctx,signal,a.pigment),d=f.d;

 const map=new Path2D();map.rect(.065,.065,.87,.87);scene(f,map,[.065,.065,.87,.87]);d.strokeStyle=f.p.ink;d.lineWidth=.002;d.stroke(map);
 if(a.survey==='grid')for(let i=0;i<11;i++){line(f,[.065+i*.087,.065,.065+i*.087,.935],f.p.mid,.0009);line(f,[.065,.065+i*.087,.935,.065+i*.087],f.p.mid,.0009);}
 if(a.survey==='hatching')for(let y=0;y<cap.size;y+=14)for(let x=0;x<cap.size;x+=14){const i=(y*cap.size+x)*4;if(cap.identity[i]<1)continue;const nx=(cap.normal[i]/255-.5)*.012,ny=(cap.normal[i+1]/255-.5)*.012;line(f,[.065+x/cap.size*.87,.065+y/cap.size*.87,.065+x/cap.size*.87+nx,.065+y/cap.size*.87+ny],f.p.mid,.0008);}
 if(a.survey==='isobars')for(let j=0;j<11;j++){const path=new Path2D();for(let k=0;k<=96;k++){const t=k/96*Math.PI*2,r=.10+j*.029+Math.sin(t*3+j*.31)*.014;const x=.49+Math.cos(t)*r,y=.49+Math.sin(t)*r*.78;k?path.lineTo(x,y):path.moveTo(x,y);}d.strokeStyle=j%3===0?f.p.accent:f.p.mid;d.globalAlpha=.46;d.lineWidth=j%3===0?.0024:.0013;d.stroke(path);}d.globalAlpha=1;
 if(a.survey==='contours'){
  // Marching-square contours follow captured surface height/light, unlike broad pressure loops.
  const step=8,field=(x:number,y:number)=>{const i=(y*cap.size+x)*4;return cap.identity[i]===0?0:cap.normal[i+1]/255*.55+cap.diffuse[i]/255*.45;};
  d.strokeStyle=f.p.ink;d.globalAlpha=.42;d.lineWidth=.0011;
  for(let level=.15;level<=.95;level+=.08){d.beginPath();for(let y=0;y<cap.size-step;y+=step){stop(signal);for(let x=0;x<cap.size-step;x+=step){const corners=[[x,y],[x+step,y],[x+step,y+step],[x,y+step]],values=corners.map(([xx,yy])=>field(xx,yy)),cuts:number[][]=[];for(let k=0;k<4;k++){const next=(k+1)%4,v=values[k],V=values[next];if((v<level)===(V<level))continue;const q=(level-v)/(V-v);cuts.push([corners[k][0]+(corners[next][0]-corners[k][0])*q,corners[k][1]+(corners[next][1]-corners[k][1])*q]);}for(let k=0;k+1<cuts.length;k+=2){d.moveTo(.065+cuts[k][0]/cap.size*.87,.065+cuts[k][1]/cap.size*.87);d.lineTo(.065+cuts[k+1][0]/cap.size*.87,.065+cuts[k+1][1]/cap.size*.87);}}}d.stroke();}
  d.globalAlpha=1;
 }

 const r=.085+a.body*.05;
 const pts=a.route==='river'?[[.76,.16],[.79,.34],[.74,.52],[.77,.71]]:a.route==='coil'?[[.17,.73],[.35,.82],[.55,.83],[.73,.75]]:a.route==='diagonal'?[[.18,.22],[.38,.39],[.61,.57],[.79,.76]]:[[.17,.17],[.38,.15],[.64,.17],[.81,.34],[.82,.59]];

 for(let i=0;i<pts.length-1;i++){
  const [x,y]=pts[i],[X,Y]=pts[i+1],width=r*(1.78-i*.12),angle=Math.atan2(Y-y,X-x);
  const path=new Path2D();path.moveTo(x,y);path.lineTo(X,Y);anatomy(f,path,width);d.strokeStyle=f.p.ink;d.lineWidth=width;d.stroke(path);d.strokeStyle=f.p.mid;d.lineWidth=width*.88;d.stroke(path);d.strokeStyle=f.p.paper;d.globalAlpha=.35;d.lineWidth=width*.35;d.stroke(path);d.globalAlpha=1;
  for(let k=1;k<7;k++){const t=k/7,cx=x+(X-x)*t,cy=y+(Y-y)*t,nx=-Math.sin(angle),ny=Math.cos(angle);d.beginPath();d.moveTo(cx-nx*width*.46,cy-ny*width*.46);d.quadraticCurveTo(cx+.018*Math.cos(angle),cy+.018*Math.sin(angle),cx+nx*width*.46,cy+ny*width*.46);d.strokeStyle=f.p.ink;d.lineWidth=.002;d.stroke();
   for(const side of [-1,1])line(f,[cx+nx*width*.42*side,cy+ny*width*.42*side,cx+nx*width*.65*side-.012*Math.cos(angle),cy+ny*width*.65*side-.012*Math.sin(angle)],f.p.ink,.0015);
  }
 }
 const head=pts[0];for(const side of [-1,1]){d.beginPath();d.moveTo(head[0]+side*r*.62,head[1]-r*.68);d.quadraticCurveTo(head[0]+side*r*.94,head[1]-r*1.48,head[0]+side*r*.25,head[1]-r*1.24);d.strokeStyle=f.p.ink;d.lineWidth=.005;d.stroke();}

 pts.forEach(([x,y],i)=>{stop(signal);const rr=r*(1-i*.08);membrane(f,x,y,rr,rr*1.13,i===0?[0,0,1,1]:crop(f,a.target,i),'double',.025);
 for(let j=0;j<1+Math.round(a.nesting*2);j++){const tiny=rr*(.34-j*.07);membrane(f,x+rr*.41-j*.008,y+rr*.48-j*.007,tiny,tiny*1.1,[0,0,1,1],'plain',.015);}
 if(a.state==='molting'){d.strokeStyle=f.p.mid;d.lineWidth=.001;d.stroke(organ(x-.028,y+.022,rr*1.08,rr*1.22,.03));}
 if(a.state==='migrating')line(f,[x+rr*1.3,y-.012,x+rr*1.5,y,x+rr*1.3,y+.012],f.p.accent,.003);
 label(f,'L'+String(i+1),x-rr,y-rr*1.3,.010);
 });
 if(a.state==='hatched'){const [x,y]=pts[pts.length-1];d.strokeStyle=f.p.paper;d.lineWidth=.012;d.beginPath();d.moveTo(x,y-r);d.lineTo(x+.03,y-r*.5);d.lineTo(x+.01,y);d.stroke();}
 for(let i=0;i<7;i++){label(f,String(100+i*20),.012,.13+i*.12,.009);line(f,[.052,.13+i*.12,.064,.13+i*.12],f.p.ink,.001);}
 await micrograph(f,a.inhabitants,a.hierarchy);
 label(f,'LARVAL SURVEY / CONTOURS OF A POSSIBLE WORLD',.065,.975,.0094);return finish(f,[a.route+' embryo route',a.survey+' survey',a.state]);

}});
