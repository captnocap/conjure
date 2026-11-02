import {choice,clamp01,defineLook,mix,rekey,score} from '@conjure/kit';
const hash=(x:number,y:number,s:number)=>{let h=Math.imul(x|0,374761393)^Math.imul(y|0,668265263)^s;h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967296;};
export default defineLook({
  questions:{
    plate:choice('What plate was the monotype painted on?',{glass:'Smooth glass leaves soft wet joins.',copper:'A polished copper plate leaves a crisp plate edge.',acrylic:'A lightly scratched acrylic sheet interrupts the paint.',textured:'A lightly stippled plate adds fine transfer pits.'}),
    tool:choice('Which tool lays down the main painted shapes?',{flat:'Broad flat brushes with parallel bristle grooves.',round:'Rounded brush dabs with soft tapered ends.',rag:'Soft rag-wiped masses with cloudy edges.',roller:'Overlapping roller bands with small stippled voids.'}),
    scale:score('How broad are the painted marks?', ['Fine short marks preserve tiny details','Small brush dabs','Medium visible marks','Broad expressive brush strokes','Large sweeping masses, reduced around small subjects']),
    direction:choice('How do the painted strokes travel?',{surface:'Strokes follow the surfaces in the picture.',diagonal:'Strokes run in long diagonals.',upright:'Mostly upright strokes pull the image together.',crossed:'Alternating groups of horizontal and vertical strokes.'}),
    ink:choice('What ink body was worked across the plate?',{fluid:'Fluid ink pools softly at stroke ends.',tacky:'Tacky ink breaks into small transfer islands.',opaque:'Opaque dense paint gives solid brush silhouettes.',thin:'Thin transparent ink leaves pale passages and streaks.'}),
    palette:choice('How are the painted colours separated? Designed colours follow the palette.',{duet:'Two contrasting inks overlap on a pale sheet.',tonal:'One ink makes a wide range of rubbed values.',local:'Muted local picture colours remain in the painted masses.',split:'Warm shadow ink and cool light ink meet in the middle values.'}),
    subtraction:choice('How were light passages wiped out of the painted plate?',{none:'Brushwork is left intact.',finger:'Short pale finger-width wipes curve through the lightest planes.',rake:'Closely spaced pale rake marks cross the highlights.',cloth:'Soft wiped patches open the brightest passages.'}),
    pressure:choice('How did the paper take the ink?',{even:'Even pressure transfers the whole painted plate.',hand:'Hand rubbing leaves broad uneven pressure patches.',edge:'Edges transfer crisply while the centre stays soft.',slip:'A slight sideways slip makes narrow doubled edges.'}),
    paper:choice('What sheet was lifted from the plate?',{smooth:'Smooth ivory printmaking paper.',rough:'Rough fibrous paper catches broken paint.',tissue:'A thin translucent sheet with fine vertical fibres.',blue:'A muted blue-grey prepared sheet.'}),
    impression:choice('Which impression was kept?',{first:'The rich first pulled impression.',ghost:'A lighter second ghost pull retains broad traces.',margin:'The first pull keeps a clean blank border and plate mark.',test:'A small brush test remains below the picture.'}),
  },
  async apply(capture,a,context,signal){
    signal.throwIfAborted();
    const {size,color,identity,normal}=capture,unit=size/720,pixels=new Uint8ClampedArray(color.length);
    const dyes=rekey({paper:a.paper==='blue'?[185,200,199]:[236,226,202],dark:[37,52,62],middle:[108,127,121],accent:[166,80,48],light:[209,181,130]},context.palette,{paper:'ground',dark:'ink',middle:'ink',accent:'second',light:'ground'});
    const minX=new Int32Array(256).fill(size),maxX=new Int32Array(256),minY=new Int32Array(256).fill(size),maxY=new Int32Array(256);
    for(let y=0;y<size;y+=3){if(y%96===0){signal.throwIfAborted();await new Promise<void>(r=>setTimeout(r,0));}for(let x=0;x<size;x+=3){const id=identity[(y*size+x)*4];minX[id]=Math.min(minX[id],x);maxX[id]=Math.max(maxX[id],x);minY[id]=Math.min(minY[id],y);maxY[id]=Math.max(maxY[id],y);}}
    const spans=Array.from({length:256},(_,id)=>Math.max(2,Math.min(mix(5,22,a.scale),Math.min(maxX[id]-minX[id],maxY[id]-minY[id])/unit*.11)));
    const step=Math.max(1,Math.round(unit));
    for(let y=0;y<size;y++){
      if(y%32===0){signal.throwIfAborted();await new Promise<void>(r=>setTimeout(r,0));}
      for(let x=0;x<size;x++){
        const p=(y*size+x)*4,id=identity[p],X=x/size,Y=y/size,xx=x/unit,yy=y/unit;
        const nx=normal[p]/255-.5,ny=normal[p+1]/255-.5;
        const theta=a.direction==='surface'?Math.round((Math.atan2(ny,nx)*.55+.4)*3)/3:a.direction==='diagonal'?.65:a.direction==='upright'?0:Math.floor(xx/55+yy/45)%2?0:Math.PI/2;
        const u=xx*Math.cos(theta)+yy*Math.sin(theta),v=-xx*Math.sin(theta)+yy*Math.cos(theta),span=spans[id];
        const col=Math.floor(u/span),row=Math.floor(v/(span*2.8)),fu=(u/span-col),fv=v/(span*2.8)-row;
        const cell=hash(col,row,context.seed+id*19),noise=hash(Math.floor(xx),Math.floor(yy),context.seed);
        const bristle=.5+.5*Math.sin(u*2.5+Math.sin(v*.18)*.7+cell*9),end=Math.pow(Math.sin(fv*Math.PI),.35);
        const tone=(color[p]*.2126+color[p+1]*.7152+color[p+2]*.0722)/255;
        const q=(y*size+Math.min(size-1,x+step))*4,r=(Math.min(size-1,y+step)*size+x)*4;
        const edge=id!==identity[q]||id!==identity[r]||Math.abs(color[p]-color[q])+Math.abs(color[p+1]-color[q+1])+Math.abs(color[p+2]-color[q+2])>65||Math.abs(normal[p]-normal[q])+Math.abs(normal[p+1]-normal[q+1])+Math.abs(normal[p+2]-normal[q+2])>58;
        let pigment=clamp01((1-tone)*1.2+.17),texture=1;
        if(a.tool==='flat')texture=.66+.22*bristle+.12*end;
        if(a.tool==='round')texture=.63+.37*Math.pow(Math.max(0,Math.sin(fu*Math.PI)*Math.sin(fv*Math.PI)),.25);
        if(a.tool==='rag')texture=.77+.23*Math.sin(u*.13+Math.sin(v*.07)*2);
        if(a.tool==='roller')texture=.78+.12*Math.sin(v*.35)+.1*noise;
        if(a.ink==='fluid')texture+=Math.exp(-Math.min(fv,1-fv)*20)*.18;
        if(a.ink==='tacky'&&noise<.1+bristle*.12)texture*=.3;
        if(a.ink==='opaque')pigment=Math.min(.98,.19+pigment*1.18);
        if(a.ink==='thin')pigment*=.82;
        if(id===0)pigment*=.16;
        if(a.pressure==='hand')texture*=.77+.23*Math.sin(X*14+Math.sin(Y*9)*2);
        if(a.pressure==='edge')texture*=.8+.2*Math.abs(X-.5)*2;
        if(a.pressure==='slip'&&edge)texture*=.62;
        if(a.subtraction==='finger'&&tone>.57&&Math.abs(fu-.48-.15*Math.sin(fv*4))<.09)texture*=.42;
        if(a.subtraction==='rake'&&tone>.52&&Math.sin(u*1.1)>.82)texture*=.25;
        if(a.subtraction==='cloth'&&tone>.64)texture*=.48+.25*noise;
        if(a.plate==='acrylic'&&Math.sin(xx*1.7+yy*.35)>.992)texture*=.55;
        if(a.plate==='textured'&&noise>.88)texture*=.6;
        if(a.plate==='glass')texture=mix(texture,1,.12);
        if(id===1)texture=mix(texture,1,.75);
        if(edge&&id>0){pigment=Math.max(pigment,.65);texture=Math.max(texture,.82);}
        if(a.impression==='ghost')pigment*=.72;
        const margin=Math.min(X,Y,1-X,1-Y);
        if((a.impression==='margin'||a.plate==='copper')&&margin<.035)pigment=0;
        if(a.impression==='test'&&X>.06&&X<.26&&Y>.94&&Y<.966){pigment=.6;texture=.6+bristle*.4;}
        const shade=clamp01(tone*.86+cell*.14),opacity=clamp01(pigment*texture);
        for(let c=0;c<3;c++){
          let ink=mix(dyes.dark[c],dyes.middle[c],shade);
          if(a.palette==='duet')ink=mix(ink,dyes.accent[c],clamp01(.45+nx*.8-ny*.4));
          if(a.palette==='local')ink=mix(ink,color[p+c],.38);
          if(a.palette==='split')ink=mix(dyes.accent[c],dyes.middle[c],clamp01(tone*1.2));
          let paper=dyes.paper[c]+(noise-.5)*(a.paper==='rough'?10:3);
          if(a.paper==='tissue')paper+=Math.sin(xx*2.2)*3;
          let value=mix(paper,ink,opacity);
          if(a.ink==='fluid')value-=Math.exp(-Math.min(fv,1-fv)*30)*pigment*5;
          if((a.impression==='margin'||a.plate==='copper')&&Math.abs(margin-.035)<.0012)value=paper-17;
          pixels[p+c]=value;
        }
        pixels[p+3]=255;
      }
    }
    signal.throwIfAborted();return{pixels,notes:[`${a.tool} painted ${a.ink} ink on ${a.plate}`,`${a.impression} impression with ${a.subtraction} wiping`]};
  },
});
