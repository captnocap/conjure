import {choice,clamp01,defineLook,mix,rekey,score} from '@conjure/kit';
const hash=(x:number,y:number,s:number)=>{let h=Math.imul(x|0,374761393)^Math.imul(y|0,668265263)^s;h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967296;};
const distance=(v:number,period:number)=>Math.abs(v/period-Math.floor(v/period)-.5)*period;

export default defineLook({
  questions:{
    master:choice('How was the duplicator master drawn?',{pen:'Fine pen contours and parallel hatching.',pencil:'Soft wax-pencil strokes with a granular transfer.',brush:'Broad brushed passages beside narrow outlines.',screen:'Small regular dots carry the continuous tones.'}),
    ink:choice('What kind of transfer dye carries the picture? Colours follow the chosen palette.',{violet:'Classic violet spirit-copy dye.',blue:'Deep blue transfer dye on a pale sheet.',sepia:'Warm brown dye with softly coloured highlights.',two:'A second red-brown master marks the darker contours.'}),
    charge:score('How much dye is left in the master?', ['A faint late copy with delicate remaining lines','A light copy','A clear middle-run impression','A richly charged early copy','A saturated first impression']),
    roller:choice('How did the roller pull the sheet through?',{even:'Even pressure across the whole sheet.',left:'The left edge received the stronger impression.',bands:'Broad horizontal pressure bands cross the copy.',centre:'The centre is strong and the outer edges print lightly.'}),
    tooth:choice('What paper received the transfer?',{smooth:'Smooth thin office paper.',laid:'Fine horizontal laid lines in the stock.',pulp:'Open fibrous paper with small unprinted flecks.',news:'Soft newsprint with a visible muted grain.'}),
    bleed:choice('How far has the transferred dye spread?',{sharp:'A clean sharp solvent transfer.',soft:'Soft slightly feathered edges.',halo:'A pale dye halo sits beside the stronger marks.',drag:'Tiny downward dragged traces follow dark edges.'}),
    registration:choice('How is the image registered on the sheet?',{square:'A square clean master without a second impression.',echo:'A faint offset ghost follows the original master.',double:'A visible second impression is slightly misplaced.',jitter:'Each horizontal strip has a small sideways registration shift.'}),
    format:choice('What working-sheet format remains around the picture?',{plain:'An unruled sheet with an open margin.',ruled:'Faint guide rules run across the sheet.',grid:'A pale square plotting grid underlies the print.',frame:'A simple ruled frame encloses the picture.'}),
    binding:choice('How was the copied sheet kept?',{loose:'A loose sheet without binding marks.',punched:'Two punched holes remain down the left margin.',staple:'A little staple and its shadow remain in the upper corner.',perforated:'A fine tear-off perforation crosses the upper margin.'}),
    handling:choice('What trace of classroom or office handling remains?',{fresh:'A newly copied sheet.',fold:'One horizontal fold leaves a pale interrupted line.',thumb:'A soft dye-smudged thumb mark rests in the lower corner.',ticks:'Three hand-drawn checking ticks remain in the margin.'}),
  },
  async apply(capture,a,context,signal){
    signal.throwIfAborted();
    const {size,color,identity,normal}=capture,unit=size/720,out=new Uint8ClampedArray(color.length);
    const stocks={violet:{paper:[237,228,211],dye:[89,51,135],second:[154,70,65]},blue:{paper:[231,231,217],dye:[42,71,122],second:[145,69,59]},sepia:{paper:[235,220,188],dye:[102,65,47],second:[147,70,46]},two:{paper:[236,227,207],dye:[89,51,135],second:[155,59,53]}} as const;
    const dyes=rekey(stocks[a.ink],context.palette,{paper:'ground',dye:'ink',second:'second'});
    const extent=new Float32Array(256).fill(size),minX=new Int32Array(256).fill(size),maxX=new Int32Array(256),minY=new Int32Array(256).fill(size),maxY=new Int32Array(256);
    for(let y=0;y<size;y+=3){if(y%96===0){signal.throwIfAborted();await new Promise<void>(r=>setTimeout(r,0));}for(let x=0;x<size;x+=3){const id=identity[(y*size+x)*4];minX[id]=Math.min(minX[id],x);maxX[id]=Math.max(maxX[id],x);minY[id]=Math.min(minY[id],y);maxY[id]=Math.max(maxY[id],y);}}
    for(let i=0;i<256;i++)extent[i]=Math.max(2.5,Math.min(5.5,Math.min(maxX[i]-minX[i],maxY[i]-minY[i])/unit*.055));
    const step=Math.max(1,Math.round(unit));
    const luminance=(x:number,y:number)=>{const p=(Math.max(0,Math.min(size-1,y))*size+Math.max(0,Math.min(size-1,x)))*4;return (color[p]*.2126+color[p+1]*.7152+color[p+2]*.0722)/255;};
    for(let y=0;y<size;y++){
      if(y%32===0){signal.throwIfAborted();await new Promise<void>(r=>setTimeout(r,0));}
      for(let x=0;x<size;x++){
        const X=x/size,Y=y/size,xx=x/unit,yy=y/unit;
        const offset=a.registration==='jitter'?Math.round((hash(0,Math.floor(yy/26),context.seed)-.5)*3*unit):0;
        const sx=Math.min(size-1,Math.max(0,x+offset)),p=(y*size+x)*4,sp=(y*size+sx)*4,id=identity[sp];
        const q=(y*size+Math.min(size-1,sx+step))*4,r=(Math.min(size-1,y+step)*size+sx)*4;
        const edge=id!==identity[q]||id!==identity[r]||Math.abs(normal[sp]-normal[q])+Math.abs(normal[sp+1]-normal[r+1])>90;
        const tone=luminance(sx,y),dark=Math.pow(1-tone,.85),spacing=extent[id],noise=hash(Math.floor(xx),Math.floor(yy),context.seed);
        let mark=dark*.24;
        if(a.master==='pen')mark+=distance(xx*.67+yy,spacing)<.45?dark*.78:0;
        if(a.master==='pencil')mark+=distance(xx*.43+yy+Math.sin(xx*.05),spacing*.7)<.65?dark*.6*(.5+noise):0;
        if(a.master==='brush')mark+=dark*.5+Math.sin(yy*.7+normal[sp]/70)*dark*.12;
        if(a.master==='screen')mark+=Math.hypot(distance(xx,spacing),distance(yy,spacing))<spacing*.44*Math.sqrt(dark)?dark*.9:0;
        if(edge&&id>0)mark=Math.max(mark,.68);
        if(id===0)mark*=.12;
        const margin=Math.min(X,Y,1-X,1-Y);
        if(a.registration==='echo'||a.registration==='double')mark+=Math.max(0,1-luminance(sx-3*step,y-2*step))*(a.registration==='double'?.24:.12);
        if(a.bleed==='soft')mark=mark*.83+(1-luminance(sx+step,y+step))*.12;
        if(a.bleed==='halo')mark+=Math.max(0,tone-luminance(sx-2*step,y))*.4;
        if(a.bleed==='drag')mark+=Math.max(0,tone-luminance(sx,y-3*step))*.32;
        const pressure=a.roller==='left'?1.15-X*.55:a.roller==='bands'?.78+.2*Math.sin(yy*.037):a.roller==='centre'?.68+.38*Math.sin(X*Math.PI):1;
        mark*=mix(.45,1.4,a.charge)*pressure;
        if(a.tooth==='pulp'&&noise<.12)mark*=.35;
        if(margin<.025)mark=0;
        if(a.format==='ruled'&&distance(yy,29)<.45)mark=Math.max(mark,.14);
        if(a.format==='grid'&&(distance(yy,36)<.4||distance(xx,36)<.4))mark=Math.max(mark,.12);
        if(a.format==='frame'&&Math.abs(margin-.04)<.0011)mark=.55;
        if(a.handling==='fold'&&Math.abs(Y-.53)<.0025)mark*=.3;
        if(a.handling==='thumb'&&Math.pow((X-.91)/.025,2)+Math.pow((Y-.89)/.046,2)<1)mark=Math.max(mark,.15+.09*Math.sin(yy*1.6+Math.sin(xx*.25)*3));
        if(a.handling==='ticks'&&X>.025&&X<.05&&Y>.25&&Y<.72&&Math.abs((Y*6)%1-.3-Math.abs(X-.033)*15)<.012)mark=.8;
        let hole=false,metal=false;
        if(a.binding==='punched')hole=Math.hypot(X-.018,Y-.31)<.009||Math.hypot(X-.018,Y-.69)<.009;
        if(a.binding==='staple')metal=X>.022&&X<.055&&Math.abs(Y-.025-(X-.022)*.3)<.002;
        if(a.binding==='perforated'&&Math.abs(Y-.025)<.0015&&Math.floor(xx/4)%2===0)mark=.5;
        for(let c=0;c<3;c++){
          const ink=a.ink==='two'&&edge?dyes.second[c]:dyes.dye[c];
          let paper=dyes.paper[c]+(noise-.5)*(a.tooth==='smooth'?2:a.tooth==='news'?10:5);
          if(a.tooth==='laid')paper+=Math.sin(yy*2.1)*3;
          let value=mix(paper,ink,clamp01(mark));
          if(hole)value=dyes.paper[c]*.59;
          if(metal)value=dyes.dye[c]*.6+22;
          out[p+c]=value;
        }
        out[p+3]=255;
      }
    }
    signal.throwIfAborted();return{pixels:out,notes:[`${a.master} master in ${a.ink} transfer dye`,`${a.roller} roller pressure on ${a.tooth} paper`]};
  },
});
