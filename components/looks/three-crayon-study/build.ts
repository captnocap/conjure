import {choice,clamp01,defineLook,mix,rekey,score} from '@conjure/kit';
const hash=(x:number,y:number,s:number)=>{let h=Math.imul(x|0,374761393)^Math.imul(y|0,668265263)^s;h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967296;};
export default defineLook({
 questions:{
  balance:choice('How do the three chalks divide the modelling?',{classic:'Black shadows, red middle tones and white lights.',red:'Red chalk dominates with restrained black accents.',black:'Black leads, with red used sparingly.',white:'White chalk strongly builds the illuminated planes.'}),
  pressure:score('How strongly are the chalk marks pressed?',['Faint exploratory strokes','Light layered drawing','Confident chalk modelling','Dense velvety colour','Very strong three-colour contrast']),
  paper:choice('What colour is the toned paper?',{buff:'Warm buff drawing paper.',blue:'Cool blue-grey paper.',olive:'Muted olive-grey paper.',rose:'Pale rose-brown paper.'}),
  stroke:choice('What kind of chalk mark shapes the forms?',{hatched:'Fine diagonal hatching.',broad:'Broad side-of-chalk masses.',crossed:'Closely crossed hatch layers.',curved:'Curved strokes follow surface planes.'}),
  red:choice('Which red chalk character is used? Designed colours follow the palette.',{sanguine:'Warm sanguine earth red.',brick:'Deep brick-red chalk.',rose:'A soft dusty rose chalk.',ochre:'Pale red ochre.'}),
  grain:choice('How strongly does the paper tooth appear?',{smooth:'Almost smooth prepared paper.',fine:'Fine even tooth.',rough:'Large irregular paper grain.',laid:'Fine horizontal laid lines.'}),
  blend:choice('How are the chalk layers blended?',{separate:'Separate chalk strokes remain legible.',stump:'A paper stump merges the middle tones.',rubbed:'Broad rubbing softens all three colours.',layered:'Fine independent layers visibly overlap.'}),
  whites:choice('How are white accents placed?',{hatch:'Short white hatches.',points:'Small bright white points.',planes:'Broad white illuminated planes.',rim:'Narrow white edge accents.'}),
  contour:choice('Which contour remains around the forms?',{black:'A fine black chalk contour.',red:'A red preparatory contour.',double:'Black and red searching contours coexist.',lost:'The contour is lost in the masses.'}),
  sheet:choice('How is the study presented on its sheet?',{open:'Wide untouched toned-paper margins.',close:'Narrow margins around the drawing.',uneven:'An uneven softly rubbed perimeter.',rule:'A fine dark rule encloses the study.'}),
 },
 async apply(capture,a,context,signal){
  signal.throwIfAborted();const{size,color,normal,identity}=capture,u=size/720,out=new Uint8ClampedArray(color.length),step=Math.max(1,Math.round(u));
  const reds={sanguine:[155,72,47],brick:[125,49,37],rose:[173,103,103],ochre:[184,112,66]}as const,papers={buff:[207,181,143],blue:[158,179,187],olive:[177,180,150],rose:[192,162,150]}as const;
  const d=rekey({ink:[35,33,29],second:reds[a.red],paper:papers[a.paper]},context.palette,{ink:'ink',second:'second',paper:'ground'});
  const at=(x:number,y:number)=>(Math.max(0,Math.min(size-1,Math.round(y)))*size+Math.max(0,Math.min(size-1,Math.round(x))))*4;
  for(let y=0;y<size;y++){
   if(y%32===0){signal.throwIfAborted();await new Promise<void>(r=>setTimeout(r,0));}
   for(let x=0;x<size;x++){
    const p=(y*size+x)*4,id=identity[p],xx=x/u,yy=y/u,X=x/size,Y=y/size,n=hash(Math.floor(xx*1.7),Math.floor(yy*1.7),context.seed),coarse=hash(Math.floor(xx/2.2),Math.floor(yy/2.2),context.seed+41);
    const lum=(color[p]*.2126+color[p+1]*.7152+color[p+2]*.0722)/255,dark=clamp01(1-lum),angle=a.stroke==='curved'?Math.atan2(normal[p+1]-128,normal[p]-128):.65;
    const coord=-xx*Math.sin(angle)+yy*Math.cos(angle),hatch=Math.abs(Math.sin(coord*1.35)),cross=Math.abs(Math.sin((xx*.7+yy*.71)*1.45));
    const tooth=a.grain==='smooth'?.85:a.grain==='fine'?.6+n*.4:a.grain==='rough'?.35+coarse*.65:.65+.35*Math.sin(yy*2.3)**2;
    const pressure=mix(.48,1.65,a.pressure),mass=a.stroke==='broad'?.78+.22*Math.sin(coord*.16)**2:clamp01((dark+.16-hatch)*4)*.72+.2;
    let black=clamp01((dark-.17)*1.25)*mass*tooth*pressure,red=(.15+dark*.55)*(1-dark*.55)*tooth*pressure,white=clamp01((lum-.42)*1.35)*tooth;
    if(a.stroke==='crossed')black=Math.max(black,clamp01((dark-.15-cross)*4)*.55*pressure);
    if(a.balance==='red'){black*=.55;red*=1.42;}if(a.balance==='black'){black*=1.2;red*=.43;}if(a.balance==='white'){white*=1.5;red*=.76;}
    if(a.blend==='separate')red*=.42+.58*Math.sin(coord*1.31+1.4)**2;
    if(a.blend==='stump'){black=mix(black,dark*.67,.4);red*=.83;}
    if(a.blend==='rubbed'){black=mix(black,dark*.7,.68);red=mix(red,dark*.45,.6);white=mix(white,clamp01(lum-.45),.6);}
    if(a.blend==='layered'){red*=.62+.38*Math.sin((xx*.78-yy*.62)*1.6)**2;black*=.83+.17*n;}
    const r=at(x+step,y),b=at(x,y+step),edge=id!==identity[r]||id!==identity[b]||Math.abs(normal[p]-normal[r])+Math.abs(normal[p+1]-normal[r+1])>65;
    if(a.whites==='hatch')white*=clamp01((.22-hatch)*6);if(a.whites==='points')white*=n>.87?1:.06;if(a.whites==='planes')white*=.75;if(a.whites==='rim')white*=edge?1.2:.06;
    if(edge&&id>0){if(a.contour==='black')black=Math.max(.6,black);if(a.contour==='red')red=Math.max(.8,red);if(a.contour==='lost'){black*=.6;red*=.7;}}
    if(a.contour==='double'&&id>0){if(edge)black=Math.max(.58,black);if(identity[at(x+3*step,y+2*step)]!==id)red=Math.max(.7,red);}
    if(id===0){black=0;red=0;white=0;}if(id===1){black*=.45;red*=.45;white*=.4;}
    const margin=Math.min(X,Y,1-X,1-Y),limit=a.sheet==='open'?.065:a.sheet==='close'?.02:a.sheet==='uneven'?.035+Math.sin(xx*.05)*Math.cos(yy*.07)*.016:.035;if(margin<limit){black=0;red=0;white=0;}if(a.sheet==='rule'&&Math.abs(margin-.031)<.0015)black=.6;
    for(let c=0;c<3;c++){const base=mix(d.paper[c]+(tooth-.6)*5,d.second[c],clamp01(red));const shade=mix(base,d.ink[c],clamp01(black));out[p+c]=mix(shade,mix(d.paper[c],250,.88),clamp01(white));}out[p+3]=255;
   }
  }signal.throwIfAborted();return{pixels:out,notes:[`${a.balance} black, ${a.red} red and white chalk`,`${a.stroke} marks on ${a.paper} toned paper`]};
 }
});
