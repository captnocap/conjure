import { choice, defineLook, score } from '@conjure/kit';
import { arch, detail, finish, inset, line, prepare, quiet } from './studio';
import { micrograph } from './micro';
export default defineLook({questions:{
 micrography:choice('Which small inhabitants are drawn into the larger forms?',{watchers:'Architectural masks contain eyes, tiny chapels and stairwells in their faces.',stairbeasts:'Ribbed corridor beasts carry inhabited steps along their bodies.',livingcity:'Bent little towers grow faces, claws and smaller interior worlds.',mixed:'Masks, corridor beasts, living towers and nested passages interweave.'}),
 hierarchy:score('How abruptly does one drawing open into smaller drawings?',['Closely related rooms, creatures and micro glyphs','Three clear scales of inhabited drawing','Large architectural beasts descend into much smaller faces and minute corridors']),
 anatomy:choice('What form does the impossible observer take?',{lid:'One enormous almond window hangs above the scene.',compound:'Several ocular chambers crowd the margins at different scales.',socket:'A deep round socket contains a room and smaller sockets.'}),
 gaze:choice('What is visible in the observer?',{world:'The whole scene fills the iris like a tiny inhabited room.',witness:'A real cast member fills both the iris and its magnifying pupil.',both:'An enlarged witness watches its own world inside a smaller pupil.'}),
 story:choice('What is the eye doing?',{opening:'The upper membrane lifts to reveal successive inner rooms.',weeping:'Thin ink tears carry miniature rooms down from the corners.',blindfold:'A narrow dark band crosses the iris, leaving the room partly exposed.',multiplying:'Small new eyes bud from the lash roots.'}),
 aperture:score('How large is the observing aperture?',['A wide eye in the upper wall','A looming lens spanning the scene','An enormous socket continuing beyond the frame']),
 membrane:choice('What forms the iris?',{fibres:'Fine radial fibres like an engraved biological plate.',stairs:'Tiny radial stair treads recede into the pupil.',rings:'Concentric architectural rings with little image cells.'}),
 pigment:choice('What substance colours the observer?',{bone:'Pale sclera and a soft, dry dark iris.',rust:'Deep toned membranes and hot, heavy tears.',ink:'Cold, quiet, pearly sclera with a deep iris.',acid:'Sickly sclera with a sharp, vivid iris.'})
},async apply(c,a,context,signal){
 const t=prepare(c,context,signal,a.pigment),{g,p,source,boxes}=t,r=context.random,m=context.mood;
 const eye=(x:number,y:number,w:number,h:number,level:number)=>{
  signal.throwIfAborted();const cx=x+w/2,cy=y+h/2,rx=w*.24,ry=h*.57;
  g.save();arch(g,x+8,y+9,w,h,a.anatomy==='socket'?'oval':'eye');g.fillStyle=p.ink;g.fill();arch(g,x,y,w,h,a.anatomy==='socket'?'oval':'eye');g.fillStyle=p.paper;g.fill();g.strokeStyle=p.ink;g.lineWidth=3;g.stroke();g.clip();
  g.globalAlpha=.14;g.drawImage(source,x,y,w,h);g.globalAlpha=1;
  // Irregular veins carry geometry away from the aperture into the sclera.
  for(let side=0;side<2;side++)for(let k=0;k<9;k++){const xx=side?x+w:x,yy=y+h*(k+.5)/9;g.strokeStyle=p.accent;g.lineWidth=.65;g.beginPath();g.moveTo(xx,yy);g.bezierCurveTo(xx+(side?-1:1)*w*.12,yy+Math.sin(k)*h*.1,cx+(side?rx:-rx)*1.3,cy+(k-4)*h*.055,cx+(side?rx:-rx),cy+(k-4)*h*.04);g.stroke();}
  g.fillStyle=p.ink;g.beginPath();g.ellipse(cx,cy,rx+5,ry+5,0,0,Math.PI*2);g.fill();g.save();g.beginPath();g.ellipse(cx,cy,rx,ry,0,0,Math.PI*2);g.clip();g.drawImage(source,cx-rx,cy-ry,rx*2,ry*2);
  if((a.gaze==='witness'||a.gaze==='both')&&boxes.length){g.globalAlpha=.92;detail(g,source,boxes[level%boxes.length],cx-rx,cy-ry,rx*2,ry*2);g.globalAlpha=1;}
  g.restore();
  const rays=a.membrane==='stairs'?36:78;for(let k=0;k<rays;k++){
   const q=k/rays*Math.PI*2,cr=Math.cos(q),sr=Math.sin(q),outer=.92+(r()-.5)*.09,inner=a.membrane==='rings'?.8:.68+r()*.1;
   line(g,cx+cr*rx*inner,cy+sr*ry*inner,cx+cr*rx*outer,cy+sr*ry*outer,k%3?p.ink:p.paper,a.membrane==='stairs'?2:.7);
  }
  if(a.membrane==='rings')for(let k=0;k<5;k++){g.beginPath();g.ellipse(cx,cy,rx*(.7+k*.06),ry*(.7+k*.06),0,0,Math.PI*2);g.strokeStyle=k%2?p.paper:p.ink;g.lineWidth=1.2;g.stroke();}
  const iw=rx*.8,ih=ry*.92;let pupilSource=source;
  if(a.gaze==='witness'&&boxes.length){
   // Witness mode keeps the actual identity inside its magnifying pupil; both mode nests the whole world there.
   pupilSource=document.createElement('canvas');pupilSource.width=pupilSource.height=256;
   detail(pupilSource.getContext('2d')!,source,boxes[level%boxes.length],0,0,256,256);
  }
  inset(g,pupilSource,p,cx-iw/2,cy-ih/2,iw,ih,4,a.anatomy==='socket'?'arch':'eye',level%2===1);
  if(a.story==='blindfold'){g.fillStyle=p.ink;g.globalAlpha=.84;g.fillRect(x,cy-h*.055,w,h*.11);g.globalAlpha=1;}
  g.restore();
  for(let k=0;k<24;k++){const u=(k+.5)/24,xx=x+w*u,yy=y+h*.5-Math.sin(u*Math.PI)*h*.47,len=7+r()*15+m.energy*9;line(g,xx,yy,xx+(u-.5)*len,yy-len,p.ink,.8);}
  if(a.story==='weeping')for(let k=0;k<3;k++){const xx=x+w*(.18+k*.31),yy=y+h*.6;line(g,xx,yy,xx-7,yy+60+20*k,p.accent,1.5);inset(g,source,p,xx-15,yy+46+20*k,18,27,2,'oval');}
  if(a.story==='multiplying'&&level===0)for(let k=0;k<3;k++)eye(x+w*(.1+k*.3),y-25-r()*15,w*.16,h*.24,level+1);
 };
 const w=420+a.aperture*320,h=a.anatomy==='socket'?240+a.aperture*170:150+a.aperture*150;
 eye((720-w)/2,15-a.aperture*22,w,h,0);
 if(a.anatomy==='compound'){eye(8,310,190,108,1);eye(520,440,190,110,2);eye(70,598,240,95,3);}
 else if(a.anatomy==='socket'){eye(38,480,210,175,1);eye(490,485,185,152,2);}
 else {for(let j=0;j<3;j++){const x=j%2?575:30,y=345+j*105;if(quiet(c,x,y,110,55)<2.5)eye(x,y,110,55,j+1);}}
 return {pixels:await micrograph(finish(t,c,signal),c,context,signal,{pigment:a.pigment,vocabulary:a.micrography,hierarchy:a.hierarchy},t.base),notes:[`${a.anatomy} ocular architecture with ${a.membrane} irises`,`${a.story}; ${a.gaze} imagery inside four nested pupil apertures`]};
}});
