import {choice,clamp01,defineLook,mix,rekey,score} from '@conjure/kit';
const hash=(x:number,y:number,s:number)=>{let h=Math.imul(x|0,374761393)^Math.imul(y|0,668265263)^s;h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967296;};
export default defineLook({
 questions:{
  grain:choice('What aquatint ground makes the tonal grain?',{fine:'A fine even resin dust gives close velvety grain.',coarse:'Larger resin islands leave a visibly open grain.',cluster:'Irregular clustered resin makes small broken islands.',sugar:'Loose painterly sugar-lift shapes carry a stippled aquatint grain.'}),
  bite:score('How deeply were the shadow passages bitten?', ['A pale short bite','Light open greys','An even range of middle values','Deep strongly printed shadows','Rich nearly solid dark passages']),
  stops:choice('How many stopped-out tonal stages are visible?',{four:'Four broad clearly separated tonal levels.',six:'Six close steps shape the middle values.',smooth:'Closely blended tonal stages form a soft image.',islands:'Uneven stopping-out leaves small island edges in each tone.'}),
  wiping:choice('How was the copper plate wiped?',{clean:'Clean lights with very little surface ink.',veil:'A thin even veil of plate tone.',swirl:'Soft circular wiping traces cross quiet passages.',edge:'Slightly heavier ink remains near the plate edges.'}),
  drawing:choice('What linework accompanies the aquatint?',{soft:'Only soft tonal edges define the scene.',etched:'Fine dark etched contours sharpen the objects.',open:'Light etched detail lies inside dark tonal masses.',brush:'Broken brushed outlines mix into the tonal grain.'}),
  ink:choice('Which inks colour the impression? Designed colours follow the palette.',{charcoal:'Warm charcoal ink on ivory paper.',sepia:'Brown-black ink with a warm pale sheet.',blue:'A deep blue-black tonal impression.',duet:'Brown shadows and cool grey middle values overlap.'}),
  register:choice('How do neighbouring tonal areas meet?',{exact:'The tonal stages are tightly registered.',halo:'A tiny pale gap separates a few tonal boundaries.',overlap:'Small dark overlaps collect on the edges.',drift:'The finest grain shifts slightly across broad horizontal bands.'}),
  paper:choice('What paper takes the impression?',{cotton:'Soft warm cotton paper.',laid:'Pale paper with fine laid lines.',buff:'A warm buff sheet with small fibre flecks.',smooth:'Smooth almost white paper takes crisp grain.'}),
  edge:choice('How is the plate edge presented?',{square:'A square-cornered embossed plate mark.',round:'A rounded rectangular plate mark.',deckle:'An irregular pale sheet edge surrounds the plate.',crop:'The tonal field reaches all four edges.'}),
  proof:choice('What state of the aquatint print is kept?',{edition:'A clean final edition impression.',trial:'A working proof with a small tonal test strip.',worn:'A later impression with slightly weakened grain.',retouch:'A few brushed retouches deepen an otherwise finished print.'}),
 },
 async apply(capture,a,context,signal){
  signal.throwIfAborted();const{size,color,normal,identity}=capture,unit=size/720,out=new Uint8ClampedArray(color.length),step=Math.max(1,Math.round(unit));
  const inks={charcoal:[42,43,39],sepia:[76,48,31],blue:[31,51,71],duet:[76,49,37]} as const;
  const papers={cotton:[238,229,211],laid:[239,234,218],buff:[220,202,166],smooth:[246,244,232]} as const;
  const d=rekey({ink:inks[a.ink],paper:papers[a.paper],second:[73,105,112]},context.palette,{ink:'ink',paper:'ground',second:'second'});
  for(let y=0;y<size;y++){
   if(y%32===0){signal.throwIfAborted();await new Promise<void>(r=>setTimeout(r,0));}
   for(let x=0;x<size;x++){
    const p=(y*size+x)*4,id=identity[p],X=x/size,Y=y/size,xx=x/unit,yy=y/unit,q=(y*size+Math.min(size-1,x+step))*4,r=(Math.min(size-1,y+step)*size+x)*4;
    const lum=(color[p]*.2126+color[p+1]*.7152+color[p+2]*.0722)/255;
    const boundary=id!==identity[q]||id!==identity[r]||Math.abs(normal[p]-normal[q])+Math.abs(normal[p+1]-normal[q+1])+Math.abs(normal[p+2]-normal[q+2])>55||Math.abs(color[p]-color[q])+Math.abs(color[p+1]-color[q+1])+Math.abs(color[p+2]-color[q+2])>70;
    const pitch=a.grain==='coarse'?2.8:a.grain==='cluster'?2.1:a.grain==='sugar'?1.7:1.1;
    const shift=a.register==='drift'?(Math.floor(Y*9)%2)*1.3:0;
    const noise=hash(Math.floor((xx+shift)/pitch),Math.floor(yy/pitch),context.seed),fine=hash(Math.floor(xx*1.7),Math.floor(yy*1.7),context.seed+17);
    let darkness=clamp01((1-lum)*mix(.72,1.55,a.bite));
    if(a.stops==='four')darkness=Math.round(darkness*4)/4;
    if(a.stops==='six')darkness=Math.round(darkness*6)/6;
    if(a.stops==='islands')darkness=Math.round(clamp01(darkness+Math.sin(xx*.045+Math.sin(yy*.038)*2)*.055)*5)/5;
    let grain=noise;
    if(a.grain==='cluster')grain=mix(noise,hash(Math.floor(xx/7),Math.floor(yy/7),context.seed+83),.37);
    if(a.grain==='sugar')darkness*=.86+.14*Math.abs(Math.sin(xx*.041+Math.sin(yy*.029)*2));
    let ink=darkness*.58+(grain<darkness?.42:0)*darkness;
    if(a.grain==='fine')ink=mix(ink,darkness,.2);
    if(boundary&&id>0){
      if(a.drawing==='etched')ink=Math.max(ink,.71);
      if(a.drawing==='open')ink=darkness>.5?ink*.45:Math.max(ink,.37);
      if(a.drawing==='brush')ink=Math.max(ink,.45+noise*.3);
      if(a.register==='halo')ink*=.62;
      if(a.register==='overlap')ink=clamp01(ink+.23);
    }
    if(a.drawing==='soft')ink=mix(ink,darkness,.18);
    if(id===0)ink*=.035;else if(id===1)ink*=.72;
    const margin=Math.min(X,Y,1-X,1-Y);
    if(a.wiping==='veil')ink+=.065;
    if(a.wiping==='swirl')ink+=.035+.045*Math.sin(Math.hypot(X-.4,Y-.6)*31)**2;
    if(a.wiping==='edge')ink+=.14*Math.exp(-margin*15);
    if(a.proof==='worn')ink*=.77+.13*fine;
    if(a.proof==='retouch'&&X>.64&&X<.74&&Y>.79&&Y<.87)ink+=.12*Math.sin(xx*.13)**2;
    let outside=a.edge!=='crop'&&margin<.035;
    if(a.edge==='round')outside ||= Math.hypot(Math.max(0,Math.abs(X-.5)-.4),Math.max(0,Math.abs(Y-.5)-.4))>.065;
    if(a.edge==='deckle')outside=margin<.029+.004*Math.sin(xx*.19)*Math.cos(yy*.23);
    if(a.proof==='trial'&&Y>.94&&Y<.966&&X>.12&&X<.44){ink=Math.floor((X-.12)/.064)/5;outside=false;}
    for(let c=0;c<3;c++){
      let paper=d.paper[c]+(fine-.5)*(a.paper==='smooth'?1.5:a.paper==='buff'?10:3);
      if(a.paper==='laid')paper+=Math.sin(yy*1.55)*2.4;
      const pigment=a.ink==='duet'?mix(d.ink[c],d.second[c],clamp01(1-darkness*1.2)):d.ink[c];
      let value=outside?paper:mix(paper,pigment,clamp01(ink));
      if(a.edge!=='crop'&&Math.abs(margin-.035)<.0018)value=paper+(margin<.035?-14:5);
      out[p+c]=value;
    }out[p+3]=255;
   }
  }signal.throwIfAborted();return{pixels:out,notes:[`${a.grain} ground with ${a.stops} stopping-out`,`${a.proof} impression and ${a.wiping} wiping`]};
 }
});
