import { choice, defineLook, score } from '@conjure/kit';
import { detail, finish, glyphs, inset, line, prepare } from './studio';
import { micrograph } from './micro';
export default defineLook({questions:{
 micrography:choice('Which small inhabitants are drawn into the larger forms?',{watchers:'Architectural masks contain eyes, tiny chapels and stairwells in their faces.',stairbeasts:'Ribbed corridor beasts carry inhabited steps along their bodies.',livingcity:'Bent little towers grow faces, claws and smaller interior worlds.',mixed:'Masks, corridor beasts, living towers and nested passages interweave.'}),
 hierarchy:score('How abruptly does one drawing open into smaller drawings?',['Closely related rooms, creatures and micro glyphs','Three clear scales of inhabited drawing','Large architectural beasts descend into much smaller faces and minute corridors']),
 stage:choice('How has the theatre folded?',{accordion:'Side scenery zigzags like accordion bellows around the live stage.',hanging:'Little complete stages hang from the fly tower above the large stage.',reversed:'The wings face the audience while a miniature proscenium hangs inside out.'}),
 backdrop:choice('What is painted on the impossible scenery?',{world:'The whole scene repeats on every piece of scenery.',cast:'The actual inhabitants appear as enormous painted details on the wings.',interleaved:'World scenes and cast details alternate across the folded wings.'}),
 story:choice('What performance is happening?',{abandoned:'The curtains stand open to a play whose audience has gone.',rehearsal:'Fine rigging and exposed stage marks reveal the repetition.',closing:'A heavy curtain has begun descending over the smaller inner stages.',torn:'Torn openings in the curtain reveal yet another performance.'}),
 nesting:score('How many performances are nested?', ['Two small stages','Four stages within stages','Six stages disappearing into the fly tower']),
 curtain:choice('What is the curtain made of?',{pleats:'Heavy ruled cloth with deep vertical pleats.',strips:'Thin rag strips separate like teeth at the opening.',gauze:'A pale translucent veil printed with the repeated scene.'}),
 pigment:choice('What material colours the theatre?',{bone:'Faded pale canvas against soft dark velvet.',rust:'Deep toned theatrical cloth with a hot accent.',ink:'Cold, quiet velvet and chalky even flats.',acid:'Sour, sickly old curtains with vivid shadows.'})
},async apply(c,a,context,signal){
 const t=prepare(c,context,signal,a.pigment),{g,p,source,boxes}=t,r=context.random,m=context.mood;
 // The original capture is reframed as the large live stage: the entire composition now sits inside the fabrication.
 g.fillStyle=p.ink;g.fillRect(0,0,720,720);const bg=g.createLinearGradient(0,0,0,720);bg.addColorStop(0,p.soft);bg.addColorStop(.5,p.paper);bg.addColorStop(1,p.accent);g.fillStyle=bg;g.fillRect(25,25,670,670);
 const live={x:90,y:122,w:540,h:518};g.drawImage(source,live.x,live.y,live.w,live.h);
 // Perspective floorboards converge towards the miniature stage's image-space centre.
 g.fillStyle=p.soft;g.beginPath();g.moveTo(90,608);g.lineTo(630,608);g.lineTo(720,720);g.lineTo(0,720);g.closePath();g.fill();
 for(let j=0;j<24;j++)line(g,360+(j-12)*12,608,(j-2)*36,720,p.ink,.7);
 for(let j=0;j<6;j++)line(g,0,630+j*j*3,720,630+j*j*3,p.paper,.7);
 const folds=3+Math.round(m.density*2);
 for(let side=0;side<2;side++)for(let j=0;j<folds;j++){
  signal.throwIfAborted();const w=43-j*3,h=440-j*40,x=side?674-j*26:4+j*26,y=132+j*25,slant=(j%2?-.25:.25)*(side?-1:1);
  g.save();g.translate(x,y);g.transform(1,slant,0,1,0,0);g.fillStyle=p.ink;g.fillRect(-3,-3,w+6,h+6);g.drawImage(source,0,0,w,h);
  if((a.backdrop==='cast'||a.backdrop==='interleaved'&&j%2===1)&&boxes.length)detail(g,source,boxes[j%boxes.length],0,0,w,h);
  g.globalAlpha=.28;g.fillStyle=j%2?p.ink:p.paper;g.fillRect(0,0,w,h);g.globalAlpha=1;
  for(let k=0;k<3;k++)inset(g,source,p,5,y*.02+25+k*(h-70)/3,w-10,(w-10)*1.2,3,'arch',j%2===1);
  line(g,0,0,0,h,p.paper,2);line(g,w,0,w,h,p.ink,2);g.restore();
 }
 const mini=2+Math.round(a.nesting*4);
 for(let j=0;j<mini;j++){
  const w=a.stage==='hanging'?100-j*7:168*Math.pow(.72,j),h=w*.73,x=a.stage==='hanging'?75+j*540/mini:360-w/2,y=a.stage==='hanging'?35+(j%2)*24:30+j*13;
  line(g,x+w*.15,0,x+w*.15,y,p.ink,.8);line(g,x+w*.85,0,x+w*.85,y,p.ink,.8);
  inset(g,source,p,x,y,w,h,3,'rect',a.stage==='reversed');
  for(const side of [0,1]){g.fillStyle=p.accent;g.beginPath();g.moveTo(x+side*w,y);g.lineTo(x+w*(side?.83:.17),y);g.quadraticCurveTo(x+w*(side?.82:.18),y+h*.5,x+w*(side?.98:.02),y+h);g.lineTo(x+side*w,y+h);g.closePath();g.fill();}
  if(a.story==='closing'){g.fillStyle=p.soft;g.fillRect(x,y,w,h*.38);for(let k=0;k<10;k++)line(g,x+k*w/10,y,x+k*w/10,y+h*.38,p.ink,.6);}
 }
 // A large curtain wraps the whole image; its pleats scale all the way down to the little stages.
 for(let side=0;side<2;side++){
  const width=78+(a.curtain==='gauze'?20:0);g.save();g.globalAlpha=a.curtain==='gauze'?.43:1;g.fillStyle=p.accent;g.beginPath();g.moveTo(side?720:0,0);g.lineTo(side?720-width:width,0);g.bezierCurveTo(side?720-width*.3:width*.3,180,side?720-width*.2:width*.2,330,side?720-width*.8:width*.8,440);g.lineTo(side?720:0,590);g.closePath();g.fill();
  for(let j=0;j<13;j++){const xx=side?720-j*width/13:j*width/13;line(g,xx,0,side?720-j*width/20:j*width/20,430,p.ink,a.curtain==='strips'?3:.8);}
  g.restore();
 }
 for(let j=0;j<35;j++){const x=j*720/34,hh=22+Math.sin(j*.55)*8;g.fillStyle=j%2?p.soft:p.accent;g.fillRect(x,0,22,hh);line(g,x,0,x,hh,p.ink,.8);}
 if(a.story==='rehearsal')for(let j=0;j<7;j++){const x=75+j*95;line(g,x,0,x,90+r()*45,p.ink,.7);line(g,x-6,672,x+6,684,p.ink,1);line(g,x+6,672,x-6,684,p.ink,1);}
 if(a.story==='torn')for(let j=0;j<4;j++){const x=j%2?684:9,y=110+j*110;inset(g,source,p,x,y,25,70,3,'eye');}
 glyphs(g,p,290,700,140,context.seed);
 return {pixels:await micrograph(finish(t,c,signal,false),c,context,signal,{pigment:a.pigment,vocabulary:a.micrography,hierarchy:a.hierarchy},t.base),notes:[`${a.stage} theatre; original scene is the large complete live stage`,`${a.backdrop} scenery, ${a.curtain} curtain, ${a.story}; ${mini} smaller nested performances`]};
}});
