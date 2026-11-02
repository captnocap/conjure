import {choice,clamp01,defineLook,mix,rekey,score} from '@conjure/kit';

const hash=(x:number,y:number,seed:number)=>{let h=Math.imul(x|0,374761393)^Math.imul(y|0,668265263)^seed;h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967296;};
const segment=(x:number,y:number,ax:number,ay:number,bx:number,by:number)=>{const dx=bx-ax,dy=by-ay,t=clamp01(((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy));return Math.hypot(x-ax-dx*t,y-ay-dy*t);};

export default defineLook({
  questions:{
    yarn:choice('What yarn makes the knitted picture?',{wool:'Soft matte wool with a light halo of fibres.',cotton:'Smooth firm cotton with crisp stitch definition.',silk:'Fine glossy yarn with bright strand highlights.',tweed:'Uneven yarn with small flecks of contrasting fibre.'}),
    stitch:choice('Which knitted structure carries the picture?',{stocking:'Regular linked V-shaped stocking stitches.',garter:'Alternating horizontal ridges and open loops.',seed:'Alternating small knit and purl knots.',cable:'Narrow crossing cable columns between plain stitches.'}),
    gauge:score('How large are the stitches?', ['Very fine picture knitting','Close small stitches','Medium clearly visible loops','Chunky hand knitting','Large soft stitches, reduced around small subjects']),
    dyes:choice('How is the picture divided into yarn colours? Designed dyes follow the palette.',{tonal:'Four tonal yarns describe the scene.',scene:'Muted local scene colours are worked into the yarn.',two:'Two strong yarn values make a bold knitted silhouette.',marled:'Two subtly different strands twist together in each stitch.'}),
    tension:score('How tightly is the fabric knitted?', ['Loose open loops with visible gaps','Relaxed loops','Even hand tension','Firm compact stitches','Tight close-woven loops']),
    joins:choice('How are the colour-block joins worked?',{flat:'Flat intarsia joins meet neatly at the contour.',chain:'A chain-like embroidered edge follows each colour block.',ridge:'Raised dark seams separate the main forms.',staggered:'The joins step sideways on alternate rows.'}),
    direction:choice('Which way do the stitch columns run?',{up:'Straight upright rows.',down:'Rows turned upside down.',diagonal:'Columns run diagonally across the fabric.',chevron:'Columns change direction in shallow chevrons.'}),
    hem:choice('How is the edge of the knitted panel finished?',{plain:'A plain cast-off edge.',rib:'A broad ribbed hem.',roll:'A softly rolled stocking-stitch edge.',scallop:'A small scalloped knitted border.'}),
    repair:choice('What evidence of handwork remains?',{none:'An even newly finished panel.',darn:'A small rectangular darn uses a contrasting yarn.',ladder:'One short ladder of dropped stitches runs near the lower edge.',tail:'An untrimmed yarn tail curls across a corner.'}),
    relief:choice('How strongly does the yarn rise from the cloth?',{flat:'Low soft stitches with little shadow.',rounded:'Rounded strands with gentle highlights.',deep:'Deep plush loops casting small shadows.',pressed:'Pressed flat yarn with broad satin-like highlights.'}),
  },
  async apply(capture,a,context,signal){
    signal.throwIfAborted();
    const {size,color,identity,normal}=capture,unit=size/720,out=new Uint8ClampedArray(color.length);
    const dyes=rekey({dark:[38,42,49],middle:[103,126,130],light:[181,189,173],cream:[237,226,193],accent:[174,91,67]},context.palette,{dark:'ink',middle:'ink',light:'ground',cream:'ground',accent:'second'});
    const yarns=[dyes.dark,dyes.middle,dyes.light,dyes.cream];
    const minX=new Int32Array(256).fill(size),maxX=new Int32Array(256),minY=new Int32Array(256).fill(size),maxY=new Int32Array(256);
    for(let y=0;y<size;y+=3){if(y%96===0){signal.throwIfAborted();await new Promise<void>(r=>setTimeout(r,0));}for(let x=0;x<size;x+=3){const id=identity[(y*size+x)*4];minX[id]=Math.min(minX[id],x);maxX[id]=Math.max(maxX[id],x);minY[id]=Math.min(minY[id],y);maxY[id]=Math.max(maxY[id],y);}}
    const step=Math.max(1,Math.round(unit));
    for(let y=0;y<size;y++){
      if(y%32===0){signal.throwIfAborted();await new Promise<void>(r=>setTimeout(r,0));}
      for(let x=0;x<size;x++){
        const p=(y*size+x)*4,id=identity[p],X=x/size,Y=y/size,xx=x/unit,yy=y/unit;
        const extent=Math.min(maxX[id]-minX[id],maxY[id]-minY[id])/unit;
        const gauge=Math.max(2.3,Math.min(id===0?4.2:3.5+4*a.gauge,extent*.065)),h=gauge*1.18;
        let u=xx,v=yy;
        if(a.direction==='down')v=-yy;
        if(a.direction==='diagonal'){u=(xx+yy)*.707;v=(yy-xx)*.707;}
        if(a.direction==='chevron')v=yy+Math.abs((xx/55)%2-1)*22;
        const row=Math.floor(v/h),col=Math.floor(u/gauge),fx=((u/gauge)%1+1)%1,fy=((v/h)%1+1)%1;
        let d=Math.min(segment(fx,fy,.17,.05,.5,.85),segment(fx,fy,.83,.05,.5,.85));
        if(a.stitch==='garter')d=row%2===0?Math.abs(fy-.5+Math.sin(fx*Math.PI*2)*.1):Math.min(d,Math.abs(fy-.16)*1.2);
        if(a.stitch==='seed'&&(row+col)%2===0)d=Math.abs(Math.hypot((fx-.5)*1.2,(fy-.5)*.9)-.25);
        if(a.stitch==='cable'&&((col%6)+6)%6<2){const drift=Math.sin(v/h*.65)*.24;d=Math.min(segment(fx,fy,.2+drift,.02,.65-drift,.98),segment(fx,fy,.7-drift,.02,.3+drift,.98));}
        const thickness=mix(.08,.2,a.tension)*(a.relief==='pressed'?1.3:1),inside=clamp01((thickness-d)*16+.5);
        const ridge=clamp01(1-d/Math.max(.01,thickness)),fuzz=hash(Math.floor(xx*1.5),Math.floor(yy*1.5),context.seed);
        const rawTone=(color[p]*.2126+color[p+1]*.7152+color[p+2]*.0722)/255;
        const tone=id===0?.98:rawTone*(id===1?.91:.86);
        let level=Math.max(0,Math.min(3,Math.floor(tone*3.5)));
        if(a.dyes==='two')level=tone>.55?3:0;
        const q=(y*size+Math.min(size-1,x+step))*4,r=(Math.min(size-1,y+step)*size+x)*4;
        const boundary=id!==identity[q]||id!==identity[r]||Math.abs(color[p]-color[q])>42||Math.abs(normal[p]-normal[q])+Math.abs(normal[p+1]-normal[r+1])>60;
        const margin=Math.min(X,Y,1-X,1-Y),along=Math.min(X,1-X)<Math.min(Y,1-Y)?yy:xx;
        let seam=boundary&&id>0?.38:0;
        if(boundary){if(a.joins==='chain')seam=.55+.25*Math.sin((xx+yy)*1.7);if(a.joins==='ridge')seam=.8;if(a.joins==='staggered')seam=row%2===0?.6:.15;}
        for(let c=0;c<3;c++){
          let yarn=yarns[level][c];
          if(a.dyes==='two'&&level===3&&id>0)yarn*=id===1?.94:.86;
          if(a.dyes==='scene')yarn=mix(yarn,color[p+c],.52);
          if(a.dyes==='marled')yarn=mix(yarn,dyes.accent[c],(.5+.5*Math.sin((u+v)*2.4))*.27);
          let value=mix(yarn*(id>0?.76:.5),yarn,inside);
          const lift=a.relief==='flat'?3:a.relief==='deep'?17:a.relief==='pressed'?10:11;
          value+=ridge*lift-(1-inside)*(a.relief==='deep'?12:4);
          if(a.yarn==='wool')value+=(fuzz-.5)*11;
          if(a.yarn==='cotton')value+=(fuzz-.5)*3;
          if(a.yarn==='silk')value+=Math.pow(ridge,5)*28;
          if(a.yarn==='tweed'&&hash(col,row,context.seed+31)>.8&&fx>.25&&fx<.55&&fy>.4&&fy<.65)value=mix(value,dyes.accent[c],.8);
          value=mix(value,dyes.dark[c],seam);
          if(id===0)value=mix(yarns[3][c],value,.36);
          if(a.hem==='rib'&&margin<.04)value=mix(dyes.middle[c]*.6,dyes.light[c],.4+.6*Math.pow(Math.max(0,Math.sin(along/gauge*3.14)),.6));
          if(a.hem==='roll'&&margin<.025)value=dyes.light[c]*(.6+.4*Math.sin(margin/.025*Math.PI));
          if(a.hem==='scallop'&&margin<.035+.008*Math.sin(along/8))value=mix(dyes.cream[c]*.65,dyes.accent[c],inside);
          if(a.repair==='darn'&&X>.76&&X<.88&&Y>.79&&Y<.89)value=mix(dyes.accent[c],dyes.cream[c],Math.abs(Math.sin(xx*1.3))*.4);
          if(a.repair==='ladder'&&X>.15&&X<.166&&Y>.76&&Y<.93)value=fy>.38&&fy<.58?dyes.middle[c]:dyes.dark[c];
          if(a.repair==='tail'&&X>.63&&X<.9&&Math.abs(Y-.9-Math.sin(X*43)*.018)<.0025)value=dyes.accent[c]+ridge*10;
          // A small surface-facing lift keeps curved objects legible within the stitches.
          value+=(normal[p+2]/255-.5)*(id?3:0);
          out[p+c]=value;
        }
        out[p+3]=255;
      }
    }
    signal.throwIfAborted();return{pixels:out,notes:[`${a.stitch} stitches in ${a.yarn} yarn`,`${a.dyes} colour work and ${a.hem} edge`]};
  },
});
