import { choice, clamp01, defineLook, mix, rekey, score } from '@conjure/kit';
const hash=(x:number,y:number,s:number)=>{let h=Math.imul(x|0,374761393)^Math.imul(y|0,668265263)^s;h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967296;};
const stripe=(v:number,pitch:number)=>Math.abs(v/pitch-Math.floor(v/pitch)-.5)*pitch;
export default defineLook({
 questions:{
  tool:choice('Which point made the incisions?',{needle:'Fine needle lines with narrow soft edges.',diamond:'Clean bright diamond-point scratches.',roulette:'Tiny close roulette marks break the engraved lines.',scraper:'Broad scraped passages accompany the incised lines.'}),
  drawing:choice('How is the drypoint drawing constructed?',{parallel:'Long close parallel hatching.',cross:'Crosshatching deepens the darker areas.',contour:'Short hatching turns around the visible surfaces.',stipple:'Small incised dots build the middle tones.'}),
  burr:score('How much raised burr still holds ink?', ['A nearly worn-away clean line','A small remaining velvet edge','A soft freshly printed burr','Rich dark fringes surround the cuts','Broad velvety ink beside the deepest lines']),
  pitch:choice('How tightly are the marks spaced?',{fine:'Very fine close incisions.',regular:'Even medium-spaced marks.',open:'Open visible hatching with quiet paper between.',varied:'Fine details and broader background strokes alternate.'}),
  wiping:choice('How was the plate surface wiped?',{clean:'The surface is clean with clear paper between cuts.',tone:'A soft veil of plate tone covers the image.',palm:'Broad palm-wiped lights cross the plate.',edge:'A little ink remains near the plate edge.'}),
  ink:choice('What ink was worked into the plate? Ink colours follow the palette.',{black:'Warm black ink on cream paper.',brown:'Deep brown ink on pale buff paper.',green:'A dark green-black impression.',two:'A second warm ink accents the contour lines.'}),
  paper:choice('What dampened paper received the image?',{cotton:'Soft cotton paper with a strong plate mark.',laid:'Light laid lines remain in the sheet.',smooth:'Smooth pale paper takes very fine lines.',fleck:'Warm flecked paper holds the ink softly.'}),
  pull:choice('Which impression of the plate is this?',{early:'An early rich impression from a fresh burr.',middle:'A clear even middle impression.',late:'A lighter late impression with worn soft edges.',proof:'A working proof retains trial scratches in the margin.'}),
  plate:choice('How is the plate boundary shown?',{rectangle:'A clear rectangular embossed plate edge.',rounded:'Rounded plate corners press into the paper.',cropped:'The printed field runs to the sheet edges.',uneven:'A slightly irregular hand-cut plate edge remains.'}),
  correction:choice('What trace of revision remains?',{none:'The finished image has no visible correction.',burnish:'A small softly burnished passage lightens one corner.',ghost:'Fine erased construction lines remain in the margin.',patch:'A small patch of new crosshatching repairs a weak area.'}),
 },
 async apply(capture,a,context,signal){
  signal.throwIfAborted();
  const {size,color,normal,identity}=capture,unit=size/720,out=new Uint8ClampedArray(color.length);
  const stocks={black:{paper:[239,229,207],ink:[42,44,39],accent:[142,77,49]},brown:{paper:[235,222,193],ink:[87,58,39],accent:[146,71,40]},green:{paper:[229,228,204],ink:[39,65,54],accent:[132,90,47]},two:{paper:[238,228,204],ink:[40,50,49],accent:[155,74,43]}} as const;
  const dye=rekey(stocks[a.ink],context.palette,{paper:'ground',ink:'ink',accent:'second'});
  const minX=new Int32Array(256).fill(size),minY=new Int32Array(256).fill(size),maxX=new Int32Array(256),maxY=new Int32Array(256);
  for(let y=0;y<size;y+=3){if(y%96===0){signal.throwIfAborted();await new Promise<void>(r=>setTimeout(r,0));}for(let x=0;x<size;x+=3){const id=identity[(y*size+x)*4];minX[id]=Math.min(minX[id],x);maxX[id]=Math.max(maxX[id],x);minY[id]=Math.min(minY[id],y);maxY[id]=Math.max(maxY[id],y);}}
  const widths=Array.from({length:256},(_,id)=>Math.max(1.8,Math.min(a.pitch==='fine'?2.5:a.pitch==='open'?5.5:a.pitch==='varied'?(id<=1?5:3):3.6,Math.min(maxX[id]-minX[id],maxY[id]-minY[id])/unit*.05)));
  const step=Math.max(1,Math.round(unit));
  for(let y=0;y<size;y++){
   if(y%32===0){signal.throwIfAborted();await new Promise<void>(r=>setTimeout(r,0));}
   for(let x=0;x<size;x++){
    const p=(y*size+x)*4,id=identity[p],X=x/size,Y=y/size,xx=x/unit,yy=y/unit,pitch=widths[id];
    const tone=(color[p]*.2126+color[p+1]*.7152+color[p+2]*.0722)/255,dark=Math.pow(clamp01(1-tone),.76),noise=hash(Math.floor(xx),Math.floor(yy),context.seed);
    const q=(y*size+Math.min(size-1,x+step))*4,r=(Math.min(size-1,y+step)*size+x)*4;
    const edge=id!==identity[q]||id!==identity[r]||Math.abs(color[p]-color[q])>38||Math.abs(normal[p]-normal[q])+Math.abs(normal[p+1]-normal[r+1])>56;
    const angle=a.drawing==='contour'?(normal[p]/255-.5)*.5+(normal[p+1]/255-.5)*.3:.55;
    const u=xx*Math.cos(angle)+yy*Math.sin(angle),v=-xx*Math.sin(angle)+yy*Math.cos(angle);
    let distance=stripe(v+Math.sin(u*.055)*.3,pitch);
    if(a.drawing==='cross'&&dark>.3)distance=Math.min(distance,stripe(xx*.75+yy*.66,pitch*.93));
    if(a.drawing==='stipple')distance=Math.hypot(stripe(xx,pitch),stripe(yy,pitch));
    const fresh=a.pull==='late'?.5:a.pull==='middle'?.8:1;
    const burr=mix(.08,.75,a.burr)*fresh*(a.tool==='diamond'?.45:1);
    const width=(a.tool==='needle'?.17:a.tool==='scraper'?.36:.23)+dark*.43;
    let mark=clamp01((width-distance)*1.7+.3)+Math.exp(-distance*distance/(burr*burr+.025))*.5;
    if(a.tool==='roulette')mark*=.45+.55*Math.pow(Math.max(0,Math.cos(u*2.5)),2);
    if(a.tool==='scraper')mark*=.65+.35*Math.abs(Math.sin(u*.16+Math.sin(v*.07)));
    mark=mark*dark*.85+dark*.21;
    if(id===0)mark*=.08;else if(id===1)mark*=.65;
    if(edge&&id>0)mark=Math.max(mark,.48+dark*.3);
    let plateTone=a.wiping==='tone'?.1:a.wiping==='palm'?.05+.07*Math.sin(X*7+Y*3)**2:a.wiping==='edge'?.13*Math.exp(-Math.min(X,Y,1-X,1-Y)*12):.015;
    if(a.paper==='fleck'&&noise>.97)mark+=.11;
    mark=(mark+plateTone)*(a.pull==='early'?1.1:a.pull==='late'?.72:1);
    const margin=Math.min(X,Y,1-X,1-Y),edgeAt=a.plate==='uneven'?.035+.0025*Math.sin(xx*.18)*Math.sin(yy*.13):.035;
    let outside=a.plate!=='cropped'&&margin<edgeAt;
    if(a.plate==='rounded')outside ||= Math.hypot(Math.max(0,Math.abs(X-.5)-.405),Math.max(0,Math.abs(Y-.5)-.405))>.06;
    if(a.correction==='burnish'&&Math.hypot((X-.78)/.11,(Y-.83)/.055)<1)mark*=.42;
    if(a.correction==='ghost'&&X>.12&&X<.29&&Y>.9&&Y<.94&&stripe(xx*.6+yy,6)<.32){mark=Math.max(mark,.17);outside=false;}
    if(a.correction==='patch'&&X>.12&&X<.23&&Y>.8&&Y<.88&&Math.min(stripe(xx+yy,3),stripe(xx-yy,3))<.45)mark=Math.max(mark,.68);
    if(a.pull==='proof'&&X>.63&&X<.89&&Y>.94&&Y<.965&&stripe(xx+yy*.4,5)<.55){mark=.6;outside=false;}
    for(let c=0;c<3;c++){
     let paper=dye.paper[c]+(noise-.5)*(a.paper==='smooth'?1:a.paper==='fleck'?9:3);
     if(a.paper==='laid')paper+=Math.sin(yy*1.5)*2.5;
     const ink=a.ink==='two'&&edge?dye.accent[c]:dye.ink[c];
     let value=mix(paper,ink,clamp01(mark));
     if(outside)value=paper;
     if(a.plate!=='cropped'&&Math.abs(margin-edgeAt)<.0018)value=paper+(margin<edgeAt?-14:6)*(a.paper==='cotton'?1:.6);
     out[p+c]=value;
    }
    out[p+3]=255;
   }
  }
  signal.throwIfAborted();return{pixels:out,notes:[`${a.tool} incisions with ${a.drawing} drawing`,`${a.pull} drypoint impression and ${a.wiping} wiping`]};
 }
});
