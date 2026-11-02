import {choice,clamp01,defineLook,mix,rekey,score} from '@conjure/kit';
const hash=(x:number,y:number,s:number)=>{let h=Math.imul(x|0,374761393)^Math.imul(y|0,668265263)^s;h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967296;};
const noise=(x:number,y:number,seed:number)=>{const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,sx=fx*fx*(3-2*fx),sy=fy*fy*(3-2*fy);return mix(mix(hash(ix,iy,seed),hash(ix+1,iy,seed),sx),mix(hash(ix,iy+1,seed),hash(ix+1,iy+1,seed),sx),sy);};
export default defineLook({
 questions:{
  inks:choice('What colours are brushed onto the block? Designed colours follow the palette.',{earth:'Ochre, green and warm red.',coastal:'Blue, teal and sandy gold.',garden:'Green, dusty rose and warm cream.',bold:'Strong red, blue and yellow.'}),
  cut:score('How broad are the white incised lines?', ['Fine hairline divisions','Narrow white cuts','Clear white dividing lines','Broad pale cuts','Bold deeply cut white channels']),
  regions:choice('How are the coloured regions divided?',{objects:'Large regions follow the object silhouettes.',tones:'Tonal planes split each object into several regions.',facets:'More small planes break up the colour.',broad:'Broad simplified colour shapes.'}),
  brush:choice('How does the hand-brushed colour fill each region?',{even:'An even brushed colour.',streak:'Visible parallel brush streaks.',pooled:'Darker pigment pools at the region edge.',mottled:'Soft mottled colour varies across each area.'}),
  grain:choice('What wood grain shows through the colour?',{fine:'Fine quiet grain.',long:'Long clearly visible grain streaks.',knots:'Curved grain bends around small knots.',smooth:'Very little visible wood grain.'}),
  pressure:choice('How strongly is the sheet rubbed onto the block?',{even:'Even pressure gives full colour.',light:'Light pressure leaves pale flecks.',firm:'Firm pressure makes saturated colours.',uneven:'Uneven hand rubbing leaves broad lighter patches.'}),
  registration:choice('How precisely does the brushed ink meet the cuts?',{close:'Colour stops closely at the white channels.',gap:'A little extra paper shows beside the cuts.',over:'Colour occasionally crosses a white channel.',shift:'Small colour offsets soften the cut edge.'}),
  paper:choice('What sheet takes the print?',{cream:'Warm cream paper.',white:'Soft white paper.',buff:'Buff handmade paper.',fibres:'Pale paper with fine visible fibres.'}),
  border:choice('How does the block end at the sheet?',{square:'A square block edge with open margins.',rough:'An irregular carved block edge.',round:'Soft rounded corners.',full:'Colour reaches the edge of the image field.'}),
  impression:choice('What kind of hand-pulled impression is this?',{clean:'A clean finished impression.',pale:'A pale delicate impression.',rich:'A rich heavily coloured impression.',proof:'A proof with a small row of colour tests.'}),
 },
 async apply(capture,a,context,signal){
  signal.throwIfAborted();const{size,color,normal,identity}=capture,u=size/720,out=new Uint8ClampedArray(color.length),radius=Math.max(1,Math.ceil(u*mix(.6,3.2,a.cut)));
  const colors={earth:[[145,75,48],[79,120,85],[192,153,66]],coastal:[[54,99,147],[55,137,137],[197,170,105]],garden:[[75,122,81],[180,116,126],[199,176,109]],bold:[[186,65,52],[49,92,155],[219,177,46]]} as const,sheets={cream:[241,230,205],white:[248,245,230],buff:[219,200,163],fibres:[237,229,207]} as const;
  const d=rekey({ink:colors[a.inks][0],second:colors[a.inks][1],third:colors[a.inks][2],paper:sheets[a.paper]},context.palette,{ink:'ink',second:'second',third:'second',paper:'ground'});
  const index=(x:number,y:number)=>(Math.max(0,Math.min(size-1,y))*size+Math.max(0,Math.min(size-1,x)))*4;
  const extents=new Map<number,[number,number,number,number]>();for(let y=0;y<size;y++){if(y%32===0)signal.throwIfAborted();for(let x=0;x<size;x++){const id=identity[(y*size+x)*4],b=extents.get(id);if(b){b[0]=Math.min(b[0],x);b[1]=Math.min(b[1],y);b[2]=Math.max(b[2],x);b[3]=Math.max(b[3],y);}else extents.set(id,[x,y,x,y]);}}
  const tone=(p:number)=>(color[p]*.2126+color[p+1]*.7152+color[p+2]*.0722)/255;
  const region=(p:number)=>{const count=a.regions==='facets'?6:a.regions==='tones'?3:a.regions==='broad'?2:1;return identity[p]*8+Math.min(count-1,Math.floor(tone(p)*count));};
  for(let y=0;y<size;y++){
   if(y%32===0){signal.throwIfAborted();await new Promise<void>(r=>setTimeout(r,0));}
   for(let x=0;x<size;x++){
    const p=(y*size+x)*4,id=identity[p],X=x/size,Y=y/size,xx=x/u,yy=y/u,n=hash(Math.floor(xx),Math.floor(yy),context.seed),r=region(p);
    const bounds=extents.get(id)!,extent=Math.max(4,Math.min(bounds[2]-bounds[0]+1,bounds[3]-bounds[1]+1)),localRadius=Math.max(1,Math.min(radius,Math.round(extent*.012))),fineRadius=Math.max(1,Math.round(u));
    const near=[index(x-localRadius,y),index(x+localRadius,y),index(x,y-localRadius),index(x,y+localRadius)],fine=[index(x-fineRadius,y),index(x+fineRadius,y),index(x,y-fineRadius),index(x,y+fineRadius)];
    let edge=near.some(q=>identity[q]!==id)||fine.some(q=>region(q)!==r),normalEdge=fine.some(q=>Math.abs(normal[p]-normal[q])+Math.abs(normal[p+1]-normal[q+1])+Math.abs(normal[p+2]-normal[q+2])>70);
    if(a.regions!=='broad'&&normalEdge)edge=true;
    let strength=.53+(1-tone(p))*.45;
    if(id===0)strength=.015;else if(id===1)strength*=.6;
    const grain=a.grain==='long'?noise(xx*.09,yy*.003,context.seed+id*19):a.grain==='knots'?noise(xx*.07+noise(xx*.009,yy*.012,context.seed+id)*3,yy*.009,context.seed+id*31):noise(xx*.16,yy*.012,context.seed+id);
    if(a.grain!=='smooth')strength*=a.grain==='fine'?.96+.04*grain:.9+.1*grain;
    if(a.brush==='streak')strength*=.88+.12*noise(xx*.006,yy*.1,context.seed+id*17);if(a.brush==='mottled')strength*=.88+.12*noise(xx*.025,yy*.021,context.seed+id*11);if(a.brush==='pooled'&&edge)strength+=.12;
    if(a.pressure==='light'&&n>.62)strength*=.8;if(a.pressure==='firm')strength*=1.18;if(a.pressure==='uneven')strength*=.82+.18*noise(xx*.013,yy*.011,context.seed+id*43);
    if(a.impression==='pale')strength*=.82;if(a.impression==='rich')strength*=1.2;
    let white=edge;
    if(a.registration==='over'&&n>.7)white=false;if(a.registration==='gap'&&near.some(q=>identity[p]!==identity[q]))white=true;
    if(a.registration==='shift'){const q=index(x-localRadius,y+localRadius);white=white||region(q)!==r;strength*=.94;}
    if(a.registration==='gap'&&!edge)strength*=.94;
    const hue=clamp01((color[p]-color[p+2])/140+.5),slot=id%3,pigment=slot===0?d.third:slot===1?d.second:d.ink;
    const margin=Math.min(X,Y,1-X,1-Y),limit=a.border==='rough'?.03+.009*Math.sin(xx*.12)*Math.cos(yy*.14):.03;
    let outside=a.border!=='full'&&margin<limit;if(a.border==='round')outside ||= Math.hypot(Math.max(0,Math.abs(X-.5)-.39),Math.max(0,Math.abs(Y-.5)-.39))>.08;
    for(let c=0;c<3;c++){const paper=d.paper[c]+(n-.5)*(a.paper==='fibres'?8:2);let paint=mix(pigment[c],hue>.5?d.third[c]:d.second[c],.2);const cutCoverage=Math.min(1,u*mix(.6,3.2,a.cut)/localRadius);let value=outside?paper:mix(paper,paint,clamp01(strength)*(white?1-cutCoverage:1));if(a.impression==='proof'&&Y>.95&&Y<.974&&X>.3&&X<.6)value=[d.ink,d.second,d.third][Math.min(2,Math.floor((X-.3)/.1))][c];out[p+c]=value;}out[p+3]=255;
   }
  }signal.throwIfAborted();return{pixels:out,notes:[`${a.inks} hand-brushed colour regions`,`${a.regions} divisions separated by white cuts`]};
 }
});
