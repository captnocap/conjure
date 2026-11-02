import {choice,clamp01,defineLook,mix,rekey,score} from '@conjure/kit';
const hash=(x:number,y:number,s:number)=>{let h=Math.imul(x|0,374761393)^Math.imul(y|0,668265263)^s;h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967296;};
export default defineLook({
  questions:{
    sheet:choice('Which wood sheet is sawn into the picture?',{birch:'Pale birch plywood with fine visible grain.',walnut:'Dark walnut-faced ply with warm cut edges.',basswood:'Very pale fine-grained basswood.',painted:'A painted wood face retains dark sawn edges.'}),
    cutting:choice('How are the pierced shapes cut?',{scroll:'Rounded scroll-sawn slots follow the forms.',angular:'Straight angular cutouts give crisp faceted openings.',leaf:'Small pointed leaf cutouts open the tonal areas.',keyhole:'Round-ended keyhole cuts have narrow stems.'}),
    pattern:choice('How are the openwork cuts arranged?',{upright:'Upright rows of elongated openings.',diagonal:'Diagonal rows give the picture a sloping rhythm.',surface:'Cutouts follow the visible surface orientation.',fan:'Small fan-shaped arrays follow the subjects.'}),
    gauge:score('How large are the pierced openings?', ['Tiny close fretwork','Fine pierced details','Medium visible openings','Bold decorative openings','Large open scrollwork reduced around small subjects']),
    bridges:choice('How are the isolated shapes connected?',{thin:'Fine narrow bridges join the cut shapes.',thick:'Broad structural bridges give a sturdy toy-like panel.',cross:'Horizontal crossbars join the openings.',offset:'Staggered short bridges alternate between rows.'}),
    depth:choice('How thick is the sawn panel?',{veneer:'A thin veneer face leaves a narrow cut edge.',three:'Three clearly visible plywood layers.',seven:'A thick seven-layer ply edge.',stacked:'Two cut panels are stacked with a small gap.'}),
    finish:choice('How is the fretwork surface finished? Finish hues follow the palette.',{natural:'Natural wood with a soft matte surface.',oiled:'Warm oiled wood with deeper grain.',stained:'Contrasting stained face and light cut edges.',paint:'A thin coloured coat follows the major picture values.'}),
    backing:choice('What is visible through the sawn openings?',{shadow:'Dark empty space behind the sheet.',felt:'A muted felt backing.',paper:'Pale paper glows softly through the openings.',second:'A second contrasting coloured board sits behind the fretwork.'}),
    frame:choice('How is the wooden panel supported?',{plain:'An unframed cut sheet.',square:'A plain square wooden frame.',rounded:'A frame with rounded inner corners.',pegs:'Small wooden mounting pegs surround the panel.'}),
    making:choice('What evidence of the sawing process remains?',{finished:'A clean finished panel.',pilot:'Several small pilot holes remain near the lower border.',tab:'Two small uncut holding tabs remain in the lower openings.',repair:'A narrow glued strip repairs one corner.'}),
  },
  async apply(capture,a,context,signal){
    signal.throwIfAborted();
    const {size,color,identity,normal}=capture,unit=size/720,pixels=new Uint8ClampedArray(color.length);
    const woods={birch:[214,183,130],walnut:[125,88,59],basswood:[235,212,165],painted:[148,167,150]} as const;
    const dye=rekey({face:woods[a.sheet],cut:[103,66,40],pale:[231,210,162],back:[39,48,45],second:[153,75,57]},context.palette,{face:'ground',cut:'ink',pale:'ground',back:'ink',second:'second'});
    const minX=new Int32Array(256).fill(size),maxX=new Int32Array(256),minY=new Int32Array(256).fill(size),maxY=new Int32Array(256);
    for(let y=0;y<size;y+=3){if(y%96===0){signal.throwIfAborted();await new Promise<void>(r=>setTimeout(r,0));}for(let x=0;x<size;x+=3){const id=identity[(y*size+x)*4];minX[id]=Math.min(minX[id],x);maxX[id]=Math.max(maxX[id],x);minY[id]=Math.min(minY[id],y);maxY[id]=Math.max(maxY[id],y);}}
    const gauges=Array.from({length:256},(_,id)=>Math.max(3,Math.min(mix(3.2,8,a.gauge),Math.min(maxX[id]-minX[id],maxY[id]-minY[id])/unit*.09)));
    const step=Math.max(1,Math.round(unit));
    for(let y=0;y<size;y++){
      if(y%32===0){signal.throwIfAborted();await new Promise<void>(r=>setTimeout(r,0));}
      for(let x=0;x<size;x++){
        const p=(y*size+x)*4,id=identity[p],X=x/size,Y=y/size,xx=x/unit,yy=y/unit,gauge=gauges[id];
        const angle=a.pattern==='diagonal'?.65:a.pattern==='surface'?(normal[p]/255-.5)*1.1:a.pattern==='fan'?Math.sin(Math.floor(xx/45)*.7+id)*.35:0;
        const u=xx*Math.cos(angle)+yy*Math.sin(angle),v=-xx*Math.sin(angle)+yy*Math.cos(angle),row=Math.floor(v/(gauge*1.8));
        const fx=((u/gauge+(row%2)*.5)%1+1)%1-.5,fy=((v/(gauge*1.8))%1+1)%1-.5;
        const tone=(color[p]*.2126+color[p+1]*.7152+color[p+2]*.0722)/255;
        const q=(y*size+Math.min(size-1,x+step))*4,r=(Math.min(size-1,y+step)*size+x)*4;
        const edge=id!==identity[q]||id!==identity[r]||Math.abs(color[p]-color[q])>38||Math.abs(normal[p]-normal[q])+Math.abs(normal[p+1]-normal[r+1])>58;
        const noise=hash(Math.floor(xx),Math.floor(yy),context.seed);
        const radius=.09+(1-tone)*.32;
        let dist=Math.hypot(fx*1.7,fy*.9);
        if(a.cutting==='angular')dist=Math.max(Math.abs(fx)*1.5,Math.abs(fy));
        if(a.cutting==='leaf')dist=Math.abs(fx)*1.4+Math.abs(fy)*.7;
        if(a.cutting==='keyhole')dist=Math.min(Math.hypot(fx*1.7,(fy+.18)*1.2),Math.max(Math.abs(fx)*3,Math.abs(fy-.1)*1.2));
        let aperture=clamp01((radius-dist)*gauge*2+.5);
        if(a.bridges==='thin')aperture*=Math.abs(fy)<.018?0:1;
        if(a.bridges==='thick')aperture*=Math.abs(fy)<.075?0:1;
        if(a.bridges==='cross')aperture*=Math.abs(fy)<.05||Math.abs(fx)<.035?0:1;
        if(a.bridges==='offset')aperture*=Math.abs(fy-(row%2===0?.14:-.14))<.045?0:1;
        if(edge)aperture*=.12;
        if(id===0)aperture=0;
        if(id===1)aperture*=.28;
        const cutWidth=a.depth==='veneer'?.045:a.depth==='three'?.085:a.depth==='seven'?.13:.16;
        const cut=(id===0?0:id===1?.15:1)*clamp01(1-Math.abs(dist-radius)/(cutWidth+.01));
        const margin=Math.min(X,Y,1-X,1-Y),along=Math.min(X,1-X)<Math.min(Y,1-Y)?yy:xx;
        const frame=a.frame!=='plain'&&margin<.035;
        if(frame)aperture=0;
        if(a.frame==='rounded'&&Math.hypot(Math.max(0,Math.abs(X-.5)-.39),Math.max(0,Math.abs(Y-.5)-.39))>.07)aperture=0;
        if(a.making==='tab'&&X>.4&&X<.6&&Y>.8&&Y<.85)aperture*=Math.abs(fy)<.14?0:1;
        const pilot=a.making==='pilot'&&Y>.94&&Y<.953&&X>.1&&X<.28&&Math.hypot((xx/17-Math.floor(xx/17)-.5)*17,(Y-.9465)*720)<1.8;
        for(let c=0;c<3;c++){
          let grain=Math.sin(xx*.052+Math.sin(yy*.01)*2)*4+Math.sin(xx*.4+Math.sin(yy*.017))*2;
          let face=dye.face[c]*(id===0?.96:id===1?.7+.3*tone:.24+.76*tone)+grain+(noise-.5)*2;
          if(a.finish==='oiled')face=face*.88+grain*1.6;
          if(a.finish==='stained')face=mix(face,dye.second[c]*(id===0?.96:.3+.7*tone),.34);
          if(a.finish==='paint')face=mix(face,mix(dye.second[c],dye.pale[c],tone)*(id===0?1:.4+.6*tone),.65);
          let edgeInk=mix(dye.cut[c],dye.pale[c],.3+.22*Math.sin((dist-radius)*gauge*(a.depth==='seven'?18:9)));
          if(a.depth==='stacked')edgeInk*=.8+.2*Math.sin((fx+fy)*18);
          let backing=a.backing==='shadow'?dye.back[c]:a.backing==='felt'?mix(dye.back[c],dye.second[c],.55)+(noise-.5)*8:a.backing==='paper'?dye.pale[c]:dye.second[c];
          let value=mix(face,edgeInk,cut*.7*(1-aperture));
          value=mix(value,backing,aperture);
          if(edge&&id>0)value=mix(value,tone<.3?dye.pale[c]:dye.cut[c]*.6,.5);
          if(frame)value=dye.face[c]*(.7+.3*Math.sin(margin/.035*Math.PI))+grain;
          if(a.frame==='pegs'&&margin<.025&&Math.hypot((along/70-Math.floor(along/70)-.5)*70,(margin-.014)*720)<3)value=dye.pale[c]-12;
          if(pilot)value=dye.back[c];
          if(a.making==='repair'&&X>.8&&X<.92&&Y>.86&&Y<.883)value=dye.pale[c]+grain*1.2;
          pixels[p+c]=value;
        }
        pixels[p+3]=255;
      }
    }
    signal.throwIfAborted();return{pixels,notes:[`${a.cutting} cuts through ${a.sheet}`,`${a.bridges} bridges over ${a.backing} backing`]};
  },
});
