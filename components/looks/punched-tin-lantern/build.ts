import {choice,clamp01,defineLook,mix,rekey,score} from '@conjure/kit';
const hash=(x:number,y:number,s:number)=>{let h=Math.imul(x|0,374761393)^Math.imul(y|0,668265263)^s;h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967296;};
export default defineLook({
  questions:{
    metal:choice('Which sheet metal carries the punched picture?',{tin:'Pale cool tin with fine brushed marks.',brass:'Warm muted brass with a soft golden surface.',copper:'Red-brown copper with dark punched edges.',iron:'Dark iron with pale light shining through the holes.'}),
    punch:choice('What shape does each punch leave?',{round:'Small round holes with bevelled rims.',diamond:'Four-sided diamond piercings.',slot:'Narrow elongated slits with raised lips.',star:'Small star-shaped piercings.'}),
    pattern:choice('How are the punched marks organised?',{rows:'Regular offset rows.',diagonal:'Diagonal rows follow the design.',radial:'Short fan-shaped groups follow the orientation of each surface.',alternating:'Large and small piercings alternate in each row.'}),
    gauge:score('How fine is the pierced metalwork?', ['Tiny closely spaced holes','Fine pin punches','Clearly visible small piercings','Bold open punch marks','Large ornamental piercings reduced around small subjects']),
    backing:choice('What sits behind the pierced sheet? Colours follow the palette.',{candle:'A warm candle-like light fills the openings.',paper:'Pale translucent paper backs the holes.',dark:'Dark empty space shows through the piercings.',coloured:'A second coloured liner glows through the holes.'}),
    lip:choice('How are the punched edges finished?',{inward:'Small inward bevels leave dark rims.',outward:'Raised outward lips catch the light.',flattened:'Flattened punched edges lie close to the sheet.',burred:'Ragged little burrs remain around the holes.'}),
    structure:choice('How is the sheet formed into a panel?',{flat:'A flat smooth sheet.',fluted:'Broad shallow vertical flutes stiffen the metal.',faceted:'Narrow alternating facets fold the sheet.',arched:'A gentle curved panel catches a broad highlight.'}),
    seams:choice('How are the main picture contours emphasized?',{pierced:'Fine close holes trace the major silhouettes.',scored:'A narrow engraved line follows each contour.',raised:'A lightly embossed ridge follows the contours.',plain:'The pattern changes at silhouettes without a separate outline.'}),
    edge:choice('What border holds the pierced panel?',{rolled:'A narrow rolled metal edge.',riveted:'A broader border with evenly spaced rivets.',pierced:'A row of tiny decorative holes frames the picture.',plain:'The cut sheet runs to the edge of the print.'}),
    repair:choice('What sign of the tinsmith’s work remains?',{clean:'A clean completed panel.',patch:'A small riveted repair plate covers one corner.',guide:'A faint scored guide circle remains near the lower edge.',miss:'One mis-struck group of punches sits beside the lower margin.'}),
  },
  async apply(capture,a,context,signal){
    signal.throwIfAborted();
    const {size,color,identity,normal}=capture,unit=size/720,pixels=new Uint8ClampedArray(color.length);
    const metals={tin:[157,163,153],brass:[165,139,82],copper:[151,94,66],iron:[124,132,127]} as const;
    const dye=rekey({metal:metals[a.metal],dark:[38,43,39],light:[245,217,151],liner:[155,82,54]},context.palette,{metal:'ground',dark:'ink',light:'ground',liner:'second'});
    const minX=new Int32Array(256).fill(size),maxX=new Int32Array(256),minY=new Int32Array(256).fill(size),maxY=new Int32Array(256);
    for(let y=0;y<size;y+=3){if(y%96===0){signal.throwIfAborted();await new Promise<void>(r=>setTimeout(r,0));}for(let x=0;x<size;x+=3){const id=identity[(y*size+x)*4];minX[id]=Math.min(minX[id],x);maxX[id]=Math.max(maxX[id],x);minY[id]=Math.min(minY[id],y);maxY[id]=Math.max(maxY[id],y);}}
    const gauges=Array.from({length:256},(_,id)=>Math.max(2.5,Math.min(mix(3.3,8.5,a.gauge),Math.min(maxX[id]-minX[id],maxY[id]-minY[id])/unit*.075)));
    const step=Math.max(1,Math.round(unit));
    for(let y=0;y<size;y++){
      if(y%32===0){signal.throwIfAborted();await new Promise<void>(r=>setTimeout(r,0));}
      for(let x=0;x<size;x++){
        const p=(y*size+x)*4,id=identity[p],X=x/size,Y=y/size,xx=x/unit,yy=y/unit,gauge=gauges[id];
        let u=xx,v=yy;
        if(a.pattern==='diagonal'){u=(xx+yy)*.707;v=(yy-xx)*.707;}
        if(a.pattern==='radial'){const angle=(normal[p]/255-.5)*.7;u=xx*Math.cos(angle)+yy*Math.sin(angle);v=-xx*Math.sin(angle)+yy*Math.cos(angle);}
        const row=Math.floor(v/gauge),col=Math.floor((u+(row%2)*gauge*.5)/gauge);
        const fx=((u/gauge+(row%2)*.5)%1+1)%1-.5,fy=((v/gauge)%1+1)%1-.5;
        const tone=(color[p]*.2126+color[p+1]*.7152+color[p+2]*.0722)/255;
        const q=(y*size+Math.min(size-1,x+step))*4,r=(Math.min(size-1,y+step)*size+x)*4;
        const contour=id!==identity[q]||id!==identity[r]||Math.abs(color[p]-color[q])>40||Math.abs(normal[p]-normal[q])+Math.abs(normal[p+1]-normal[r+1])>58;
        let radius=.08+(1-tone)*.29;
        if(a.pattern==='alternating')radius*=((row+col)%2===0?1:.65);
        if(a.backing!=='dark')radius*=.7;
        if(id===0)radius=0;
        if(id===1)radius*=.4;
        let d=Math.hypot(fx,fy);
        if(a.punch==='diamond')d=(Math.abs(fx)+Math.abs(fy))*.75;
        if(a.punch==='slot')d=Math.hypot(fx*1.9,fy*.65);
        if(a.punch==='star')d*=1+.23*Math.cos(Math.atan2(fy,fx)*5);
        if(a.seams==='pierced'&&contour)radius=Math.max(radius,.3);
        const noise=hash(Math.floor(xx*1.5),Math.floor(yy*1.5),context.seed);
        if(a.lip==='burred')radius+=(noise-.5)*.045;
        let hole=clamp01((radius-d)*gauge*1.6+.5),rim=clamp01(1-Math.abs(d-radius)*gauge/1.4);
        const margin=Math.min(X,Y,1-X,1-Y),along=Math.min(X,1-X)<Math.min(Y,1-Y)?yy:xx;
        let embossed=0;
        if(a.seams==='scored'&&contour)embossed=-22;
        if(a.seams==='raised'&&contour)embossed=24;
        if(a.edge!=='plain'&&margin<.023){hole=0;rim=0;embossed=8*Math.sin(margin/.023*Math.PI);}
        if(a.edge==='pierced'&&Math.abs(margin-.013)<.003&&Math.abs(Math.sin(along/4))>.7)hole=1;
        const rivet=a.edge==='riveted'&&Math.hypot((along/19-Math.floor(along/19)-.5)*19,(margin-.012)*720)<2;
        const patch=a.repair==='patch'&&X>.8&&X<.92&&Y>.78&&Y<.91;
        if(patch){hole=0;rim=0;embossed=12;}
        if(a.repair==='guide'&&Math.abs(Math.hypot(X-.18,Y-.86)-.044)<.0015)embossed=-16;
        if(a.repair==='miss'&&X>.65&&X<.77&&Y>.92&&Y<.948&&Math.sin(xx*.8+yy*.4)>.35)hole=.9;
        let plane=normal[p+2]/255*.18+(normal[p]/255-.5)*.1;
        if(a.structure==='fluted')plane+=Math.sin(xx*.055)*.1;
        if(a.structure==='faceted')plane+=(Math.floor(xx/24)%2===0?-.08:.08);
        if(a.structure==='arched')plane+=Math.cos((X-.4)*Math.PI)*.15;
        for(let c=0;c<3;c++){
          let base=dye.metal[c]*(id===0?.88:id===1?.6+tone*.33+plane*.25:.25+tone*.75+plane*.6)+Math.sin(yy*2.2+Math.sin(xx*.04)) * 2+(noise-.5)*3+embossed;
          const lip=a.lip==='inward'?-18:a.lip==='outward'?24:a.lip==='flattened'?3:15;
          base+=rim*lip*(.6-fy);
          let inside=a.backing==='dark'?dye.dark[c]:a.backing==='coloured'?dye.liner[c]:a.backing==='paper'?mix(dye.light[c],dye.metal[c],.15):dye.light[c];
          if(a.backing==='candle')inside+=Math.sin(X*3+Y*2)*8;
          if(rivet)base=dye.metal[c]+25-Math.abs(Math.sin(along/19*Math.PI*2))*18;
          if(patch&&(Math.abs(X-.812)<.003||Math.abs(X-.907)<.003)&&(Math.abs(Y-.794)<.004||Math.abs(Y-.894)<.004))base+=27;
          let value=mix(base,inside,id===0?0:hole);
          if(contour&&id>0)value=mix(value,tone<.35?dye.light[c]:dye.dark[c],a.seams==='plain'?.35:.6);
          pixels[p+c]=value;
        }
        pixels[p+3]=255;
      }
    }
    signal.throwIfAborted();return{pixels,notes:[`${a.punch} piercings in ${a.metal}`,`${a.structure} panel with ${a.backing} backing`]};
  },
});
