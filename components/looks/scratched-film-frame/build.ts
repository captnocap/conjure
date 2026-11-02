import {choice,clamp01,defineLook,mix,rekey,score} from '@conjure/kit';
const hash=(x:number,y:number,s:number)=>{let h=Math.imul(x|0,374761393)^Math.imul(y|0,668265263)^s;h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967296;};
const periodic=(v:number,p:number)=>Math.abs(v/p-Math.floor(v/p)-.5)*p;
export default defineLook({
  questions:{
    stock:choice('What film base is scratched into?',{black:'Opaque black leader with pale scratched marks.',amber:'Warm amber film with dark painted fields.',clear:'Clear film with dark ink and scraped light passages.',dyed:'A deep coloured emulsion holds bright scratches.'}),
    tool:choice('Which tool cuts the drawing into the film?',{needle:'Very fine needle scratches.',knife:'Broader knife cuts with slightly uneven edges.',comb:'Groups of close parallel comb scratches.',brush:'Abrasive brush marks leave short granular streaks.'}),
    drawing:choice('How are the scratched marks organised?',{hatch:'Diagonal scratch hatching describes the shadows.',contour:'Short scratches follow each surface.',cross:'Crossed scratch fields build the tonal masses.',dots:'Small punctured dots interrupt fine contour scratches.'}),
    width:score('How heavy is each scratched mark?', ['Hairline scratches','Fine narrow cuts','Clearly visible scratch lines','Broad scraping','Heavy exposed cuts, reduced around small subjects']),
    colour:choice('How is colour added to the film? Painted dyes follow the palette.',{mono:'One pale scratch colour against the film base.',tints:'Transparent coloured inks tint the scratched shapes.',blocks:'Separate painted colour blocks lie beneath the scratches.',split:'Warm and cool dyes alternate between adjacent forms.'}),
    fill:choice('How completely are the forms worked into the emulsion?',{line:'Contour lines with sparse interior scratches.',tonal:'Fine scratches and scraped middle values.',solid:'Broad scraped areas with small islands of remaining emulsion.',reverse:'Dark marks sit inside pale scraped shapes.'}),
    weave:choice('How is the hand-worked film registered?',{steady:'A steady carefully centred frame.',offset:'One colour layer is slightly offset.',echo:'A faint displaced contour suggests the next frame.',strip:'Short horizontal strips have tiny sideways shifts.'}),
    surface:choice('What marks remain on the film surface?',{clean:'Clean film outside the deliberate drawing.',grain:'Fine granular emulsion texture.',dust:'A few small pale dust flecks.',vertical:'Long faint vertical handling scratches.'}),
    edge:choice('How is the film frame presented?',{crop:'The drawn frame fills the picture.',perforations:'Small sprocket holes run down both sides.',gate:'A dark rounded projector gate frames the picture.',strip:'A narrow exposed strip border retains frame division marks.'}),
    repair:choice('What sign of editing the film remains?',{none:'An intact single frame.',splice:'A narrow horizontal tape splice crosses the bottom.',patch:'A small clear repair patch overlaps one corner.',test:'A short row of scratched test marks remains at the foot.'}),
  },
  async apply(capture,a,context,signal){
    signal.throwIfAborted();
    const {size,color,identity,normal}=capture,unit=size/720,pixels=new Uint8ClampedArray(color.length);
    const bases={black:[31,34,37],amber:[152,106,51],clear:[229,222,196],dyed:[72,61,86]} as const;
    const dye=rekey({base:bases[a.stock],line:a.stock==='clear'?[43,48,47]:[229,219,173],warm:[191,91,54],cool:[87,149,144]},context.palette,{base:'ink',line:'ground',warm:'second',cool:'ink'});
    const minX=new Int32Array(256).fill(size),maxX=new Int32Array(256),minY=new Int32Array(256).fill(size),maxY=new Int32Array(256);
    for(let y=0;y<size;y+=3){if(y%96===0){signal.throwIfAborted();await new Promise<void>(r=>setTimeout(r,0));}for(let x=0;x<size;x+=3){const id=identity[(y*size+x)*4];minX[id]=Math.min(minX[id],x);maxX[id]=Math.max(maxX[id],x);minY[id]=Math.min(minY[id],y);maxY[id]=Math.max(maxY[id],y);}}
    const spacings=Array.from({length:256},(_,id)=>Math.max(1.8,Math.min(5,Math.min(maxX[id]-minX[id],maxY[id]-minY[id])/unit*.055)));
    const step=Math.max(1,Math.round(unit));
    for(let y=0;y<size;y++){
      if(y%32===0){signal.throwIfAborted();await new Promise<void>(r=>setTimeout(r,0));}
      for(let x=0;x<size;x++){
        const p=(y*size+x)*4,X=x/size,Y=y/size,xx=x/unit,yy=y/unit;
        const sx=Math.min(size-1,Math.max(0,x+(a.weave==='strip'?Math.round((hash(0,Math.floor(yy/31),context.seed)-.5)*3*unit):0))),sp=(y*size+sx)*4,id=identity[sp];
        const tone=(color[sp]*.2126+color[sp+1]*.7152+color[sp+2]*.0722)/255;
        const q=(y*size+Math.min(size-1,sx+step))*4,r=(Math.min(size-1,y+step)*size+sx)*4;
        const edge=id!==identity[q]||id!==identity[r]||Math.abs(normal[sp]-normal[q])+Math.abs(normal[sp+1]-normal[r+1])>85;
        const noise=hash(Math.floor(xx),Math.floor(yy),context.seed),spacing=spacings[id];
        const angle=a.drawing==='contour'?(normal[sp]/255-.5)*1.2:.64;
        const u=xx*Math.cos(angle)+yy*Math.sin(angle),v=-xx*Math.sin(angle)+yy*Math.cos(angle);
        const width=mix(.2,.83,a.width)*(a.tool==='knife'?1.4:a.tool==='needle'?.7:1);
        let cut=periodic(v+Math.sin(u*.08)*.45,spacing)<width?1:0;
        if(a.tool==='comb')cut=periodic(v,spacing*2)<width||periodic(v+1,spacing*2)<width*.55?1:0;
        if(a.tool==='brush')cut*=noise>.22?.8:0;
        if(a.drawing==='cross'&&periodic(u+v*.3,spacing*1.2)<width)cut=1;
        if(a.drawing==='dots')cut=Math.hypot(periodic(u,spacing),periodic(v,spacing))<width*1.2?1:0;
        let light=(1-tone)*(.12+cut*.8);
        if(edge&&id>0)light=Math.max(light,.82);
        if(a.fill==='line')light*=edge?.95:.53;
        if(a.fill==='solid')light=Math.max(light,(1-tone)*.67);
        if(a.fill==='reverse')light=id>0?clamp01(.8-light*.75):light*.2;
        if(id===0)light*=.14;
        if(a.weave==='echo'){
          const echo=(y*size+Math.max(0,sx-3*step))*4;
          if(identity[echo]!==id)light=Math.max(light,.25);
        }
        if(a.surface==='dust'&&hash(Math.floor(xx/2),Math.floor(yy/2),context.seed+71)>.997)light=Math.max(light,.65);
        if(a.surface==='vertical'&&periodic(xx+Math.sin(yy*.02)*.4,91)<.3)light=Math.max(light,.2);
        const margin=Math.min(X,Y,1-X,1-Y);
        const edgeZone=(a.edge==='perforations'&&Math.min(X,1-X)<.045)||(a.edge==='strip'&&margin<.025)||(a.edge==='gate'&&(margin<.03||Math.hypot(Math.max(0,Math.abs(X-.5)-.42),Math.max(0,Math.abs(Y-.5)-.42))>.055));
        if(a.repair==='test'&&X>.1&&X<.26&&Y>.94&&Y<.965&&periodic(xx+yy*.3,6)<.5)light=.8;
        for(let c=0;c<3;c++){
          let base=dye.base[c],scratch=dye.line[c];
          if(a.colour==='tints')scratch=mix(scratch,id%2?dye.warm[c]:dye.cool[c],.4);
          if(a.colour==='blocks'&&id>0)base=mix(base,id%2?dye.warm[c]:dye.cool[c],.4+tone*.25);
          if(a.colour==='split')scratch=mix(scratch,id%2?dye.cool[c]:dye.warm[c],.7);
          if(a.weave==='offset'&&c===0&&edge)base=mix(base,dye.warm[c],.6);
          let value=mix(base,scratch,clamp01(light));
          if(a.surface==='grain')value+=(noise-.5)*13;
          if(edgeZone)value=dye.base[c]*.65;
          if(a.edge==='perforations'&&Math.min(X,1-X)>.012&&Math.min(X,1-X)<.032&&periodic(yy,30)<7)value=dye.line[c];
          if(a.edge==='strip'&&margin<.025&&periodic(yy,120)<.7)value=dye.line[c]*.6;
          if(a.repair==='splice'&&Y>.88&&Y<.904)value=mix(value,dye.line[c],.23)+(Math.abs(Y-.88)<.002?-12:0);
          if(a.repair==='patch'&&X>.76&&X<.91&&Y>.75&&Y<.87)value=mix(value,dye.line[c],.19);
          pixels[p+c]=value;
        }
        pixels[p+3]=255;
      }
    }
    signal.throwIfAborted();return{pixels,notes:[`${a.tool} drawing on ${a.stock} film`,`${a.fill} scratched image with ${a.edge} presentation`]};
  },
});
