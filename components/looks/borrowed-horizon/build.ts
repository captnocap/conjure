import { choice, defineLook, score } from '@conjure/kit';
import { detail, finish, glyphs, inset, line, prepare } from './studio';
import { micrograph } from './micro';
export default defineLook({questions:{
 micrography:choice('Which small inhabitants are drawn into the larger forms?',{watchers:'Architectural masks contain eyes, tiny chapels and stairwells in their faces.',stairbeasts:'Ribbed corridor beasts carry inhabited steps along their bodies.',livingcity:'Bent little towers grow faces, claws and smaller interior worlds.',mixed:'Masks, corridor beasts, living towers and nested passages interweave.'}),
 hierarchy:score('How abruptly does one drawing open into smaller drawings?',['Closely related rooms, creatures and micro glyphs','Three clear scales of inhabited drawing','Large architectural beasts descend into much smaller faces and minute corridors']),
 geography:choice('What impossible distance opens behind the surface?',{valleys:'Broad eye shaped valleys span the empty air.',faults:'Long jagged geological faults contain distant rooms.',islands:'Floating cutaway islands reveal small horizons under their crust.'}),
 horizon:choice('How does the distant scene repeat?',{procession:'Whole scenes repeat as tiny settlements along the horizon.',mirage:'The complete scene is stretched into one distant mirage.',inhabitants:'Magnified inhabitants become mountains behind little versions of their world.'}),
 story:choice('What has happened to the borrowed distance?',{receding:'Each lower horizon is further away than the one above it.',flooded:'A dark reflective waterline doubles the little settlements.',excavated:'Thin strata expose older scenes under the newest one.',stitched:'The fissures are held shut with fine black stitches.'}),
 strata:score('How many horizons lie behind one another?',['Two broad horizons','Four strata of distance','Six narrow nested horizons']),
 relief:score('How forcefully does the distant land bend?',['Shallow sediment bands','Rolling impossible valleys','Tall angular mountain folds']),
 pigment:choice('What colours belong to the borrowed country?',{bone:'Dust coloured limestone and brown black.',rust:'Red mesas and pale clay with iron shadows.',ink:'Cold slate sea and blue grey horizons.',acid:'Sulphur hills and olive black marshes.'})
},async apply(c,a,context,signal){
 const t=prepare(c,context,signal,a.pigment),{g,p,source,boxes}=t,r=context.random,m=context.mood,n=2+Math.round(a.strata*4);
 const rim=(x:number,y:number,w:number,h:number,j:number)=>{g.beginPath();g.moveTo(x,y+h*.45);for(let k=0;k<=20;k++){const u=k/20,edge=Math.sin(u*Math.PI);const jag=a.geography==='faults'?(k%2?.8:-.4)*h*.1:0;g.lineTo(x+w*u,y+h*.4-edge*h*(.3+a.relief*.28)+Math.sin(k*.8+j)*h*.04+jag);}for(let k=20;k>=0;k--){const u=k/20;g.lineTo(x+w*u,y+h*.45+Math.sin(u*Math.PI)*h*.55+Math.sin(k*.7+j)*h*.025);}g.closePath();};
 for(let j=0;j<n;j++){
  signal.throwIfAborted();const f=1-j*.08,w=650*f,h=(a.geography==='islands'?115:95)+(1-a.strata)*60,x=(720-w)/2+(r()-.5)*24;
  const y=j%2===0?30+Math.floor(j/2)*89:548-Math.floor(j/2)*76;
  rim(x+5,y+9,w,h,j);g.fillStyle=p.ink;g.fill();rim(x,y,w,h,j);g.fillStyle=p.paper;g.fill();g.save();rim(x,y,w,h,j);g.clip();
  // The scene's own colour field is the atmosphere of a wholly different scale.
  g.globalAlpha=.35;g.drawImage(source,x,y,w,h);g.globalAlpha=1;
  for(let layer=0;layer<4;layer++){g.fillStyle=layer%2?p.soft:p.accent;g.globalAlpha=.18+layer*.12;g.beginPath();g.moveTo(x,y+h);for(let k=0;k<=24;k++){const u=k/24,yy=y+h*(.42+layer*.1)-Math.sin(u*7+layer+j)*h*(.04+a.relief*.08);g.lineTo(x+u*w,yy);}g.lineTo(x+w,y+h);g.closePath();g.fill();}g.globalAlpha=1;
  if(a.horizon==='mirage'){g.drawImage(source,x+w*.18,y+h*.03,w*.64,h*.68);}
  else if(a.horizon==='inhabitants'&&boxes.length){g.globalAlpha=.72;detail(g,source,boxes[j%boxes.length],x+w*.2,y+h*.03,w*.6,h*.68);g.globalAlpha=1;}
  const count=a.horizon==='procession'?4:2,sw=w/(count*2.8),sh=Math.min(h*.63,sw*.85);
  for(let k=0;k<count;k++){
   const sx=x+w*(k+.5)/count-sw/2,sy=y+h*.55-sh;
   g.drawImage(source,sx,sy,sw,sh);inset(g,source,p,sx+sw*.62,sy+sh*.2,sw*.26,sh*.42,3,'rect',k%2===1);
   if(a.story==='flooded'){g.save();g.translate(sx,sy+sh*2);g.scale(1,-1);g.globalAlpha=.32;g.drawImage(source,0,0,sw,sh);g.restore();}
  }
  if(a.story==='excavated')for(let k=0;k<5;k++){line(g,x,y+h*(.65+k*.055),x+w,y+h*(.65+k*.055),p.ink,.65);}
  g.restore();rim(x,y,w,h,j);g.strokeStyle=p.ink;g.lineWidth=1.7;g.stroke();
  for(let k=1;k<18;k++){const u=k/18,xx=x+w*u,yy=y+h*.4-Math.sin(u*Math.PI)*h*(.3+a.relief*.28);if(a.story==='stitched')line(g,xx-4,yy-6,xx+4,yy+8,p.ink,.9);else line(g,xx,yy,xx-2,yy-2-r()*6,p.accent,.7);}
  if(a.geography==='islands'){for(let k=0;k<18;k++){const xx=x+w*(k+.5)/18,yy=y+h*.45+Math.sin((k+.5)/18*Math.PI)*h*.55;line(g,xx,yy,xx+(r()-.5)*8,yy+8+r()*18,p.ink,.6);}}
  glyphs(g,p,x+w*.4,y+h+12,w*.2,context.seed+j);
 }
 return {pixels:await micrograph(finish(t,c,signal),c,context,signal,{pigment:a.pigment,vocabulary:a.micrography,hierarchy:a.hierarchy},t.base),notes:[`${n} ${a.geography} containing ${a.horizon} horizons`,`${a.story} distance; layered terrain, full-scene settlements and recursive inset rooms`]};
}});
