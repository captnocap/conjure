import {choice,clamp01,defineLook,mix,rekey,score} from '@conjure/kit';
const hash=(x:number,y:number,s:number)=>{let h=Math.imul(x|0,374761393)^Math.imul(y|0,668265263)^s;h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967296;};
export default defineLook({
  questions:{
    ribbon:choice('Which ribbon is stitched into the picture?',{silk:'Soft silk ribbon with a bright narrow sheen.',satin:'Smooth satin tape with broad highlights.',organza:'Translucent organza layers show their crossed edges.',velvet:'Soft matte velvet ribbon has deep plush shadows.'}),
    stitch:choice('How are the ribbon stitches shaped?',{straight:'Short flat ribbon stitches overlap at their ends.',loop:'Plump loop stitches rise softly from the ground.',leaf:'Pointed leaf-shaped stitches taper at each end.',twisted:'Slightly twisted ribbon stitches cross from light to dark.'}),
    width:score('How wide is the ribbon?', ['Very fine narrow ribbon','Fine closely laid stitches','Medium clearly visible ribbons','Broad overlapping ribbon','Large lush ribbon scaled down around small subjects']),
    direction:choice('Which way do the stitches travel?',{surface:'The stitches follow the picture surfaces.',vertical:'Upright ribbon stitches build the forms.',diagonal:'Long diagonal groups carry the picture.',fan:'Stitches fan in small curved groups.'}),
    laying:choice('How are adjacent ribbons laid together?',{close:'Close rows meet with tiny gaps.',shingle:'Rows overlap like small shingles.',open:'Open stitches leave the backing cloth visible.',basket:'Alternate groups cross over and under one another.'}),
    dyes:choice('How are the ribbons dyed? Designed colours follow the palette.',{tonal:'A small tonal family carries the light and shadow.',local:'Muted local scene colours remain in the ribbons.',variegated:'The ribbon slowly changes shade along its length.',two:'Two contrasting ribbons alternate through the forms.'}),
    backing:choice('What cloth supports the embroidery?',{linen:'Pale visible woven linen.',silk:'Smooth softly shining ground fabric.',denim:'Dark blue-grey coarse cloth.',felt:'Soft muted felt with a fibrous surface.'}),
    contour:choice('How are the embroidered shapes outlined?',{none:'Ribbon stitches meet without a separate outline.',cord:'A thin twisted cord follows the silhouettes.',chain:'Small chain stitches pick out the main outlines.',beads:'Tiny spaced seed beads trace the contours.'}),
    border:choice('How is the stitched panel finished?',{plain:'Plain fabric extends to the picture edge.',hem:'A narrow double-turned hem surrounds the picture.',scallop:'A curved ribbon scallop trims the edge.',frame:'A simple fabric-covered frame holds the panel.'}),
    work:choice('What trace of the embroiderer’s work remains?',{finished:'A completed neatly trimmed panel.',tail:'A short curling ribbon tail rests near a corner.',needle:'A threaded needle remains tucked into the lower margin.',mended:'A small visibly restitched patch uses contrasting ribbon.'}),
  },
  async apply(capture,a,context,signal){
    signal.throwIfAborted();
    const {size,color,identity,normal}=capture,unit=size/720,pixels=new Uint8ClampedArray(color.length);
    const dyes=rekey({ground:a.backing==='denim'?[89,106,116]:a.backing==='felt'?[187,179,153]:[229,220,192],dark:[47,65,67],middle:[111,137,132],light:[217,201,157],accent:[172,84,67]},context.palette,{ground:'ground',dark:'ink',middle:'ink',light:'ground',accent:'second'});
    const minX=new Int32Array(256).fill(size),maxX=new Int32Array(256),minY=new Int32Array(256).fill(size),maxY=new Int32Array(256);
    for(let y=0;y<size;y+=3){if(y%96===0){signal.throwIfAborted();await new Promise<void>(r=>setTimeout(r,0));}for(let x=0;x<size;x+=3){const id=identity[(y*size+x)*4];minX[id]=Math.min(minX[id],x);maxX[id]=Math.max(maxX[id],x);minY[id]=Math.min(minY[id],y);maxY[id]=Math.max(maxY[id],y);}}
    const widths=Array.from({length:256},(_,id)=>Math.max(2.7,Math.min(mix(3.2,8.5,a.width),Math.min(maxX[id]-minX[id],maxY[id]-minY[id])/unit*.085)));
    const step=Math.max(1,Math.round(unit));
    for(let y=0;y<size;y++){
      if(y%32===0){signal.throwIfAborted();await new Promise<void>(r=>setTimeout(r,0));}
      for(let x=0;x<size;x++){
        const p=(y*size+x)*4,id=identity[p],X=x/size,Y=y/size,xx=x/unit,yy=y/unit,width=id===1?Math.min(3.2,widths[id]):widths[id];
        let angle=a.direction==='surface'?(normal[p]/255-.5)*1.1+(normal[p+1]/255-.5)*.7:a.direction==='diagonal'?.7:a.direction==='fan'?Math.sin(Math.floor(xx/40)*.7+id)*.35:0;
        if(a.laying==='basket')angle+=(Math.floor(xx/(width*4))+Math.floor(yy/(width*4)))%2?Math.PI/2:0;
        const u=xx*Math.cos(angle)+yy*Math.sin(angle),v=-xx*Math.sin(angle)+yy*Math.cos(angle);
        const row=Math.floor(v/(width*2.8)),offset=a.laying==='shingle'?row%2*.5:0;
        const fx=((u/width+offset)%1+1)%1-.5,fy=((v/(width*2.8))%1+1)%1;
        const noise=hash(Math.floor(xx),Math.floor(yy),context.seed),cell=hash(Math.floor(u/width),row,context.seed+id*13);
        const rawTone=(color[p]*.2126+color[p+1]*.7152+color[p+2]*.0722)/255;
        const tone=id===0?.98:rawTone*(id===1?.9:.82);
        let half=a.laying==='open'?.28:a.laying==='shingle'?.49:.43;
        if(a.stitch==='leaf')half*=Math.pow(Math.sin(fy*Math.PI),.65);
        if(a.stitch==='loop')half*=.67+.33*Math.sin(fy*Math.PI);
        let center=a.stitch==='twisted'?Math.sin(fy*Math.PI*2)*.17:0;
        const transverse=Math.abs(fx-center)/Math.max(.02,half),body=clamp01((1-transverse)*width+.4)*clamp01(Math.min(fy,1-fy)*width*3);
        const ridge=Math.sqrt(Math.max(0,1-Math.min(1,transverse)**2)),lengthLift=a.stitch==='loop'?Math.sin(fy*Math.PI):.65+.35*Math.sin(fy*Math.PI);
        const q=(y*size+Math.min(size-1,x+step))*4,r=(Math.min(size-1,y+step)*size+x)*4;
        const edge=id!==identity[q]||id!==identity[r]||Math.abs(color[p]-color[q])>40||Math.abs(normal[p]-normal[q])+Math.abs(normal[p+1]-normal[r+1])>58;
        const margin=Math.min(X,Y,1-X,1-Y),along=Math.min(X,1-X)<Math.min(Y,1-Y)?yy:xx;
        for(let c=0;c<3;c++){
          let ground=dyes.ground[c]+(noise-.5)*(a.backing==='felt'?9:2);
          if(a.backing==='linen'||a.backing==='denim')ground+=Math.sin(xx*2.3)*Math.sin(yy*2.3)*(a.backing==='denim'?8:4);
          if(a.backing==='silk')ground+=Math.sin(X*4+Y)*5;
          let ribbon=tone<.5?mix(dyes.dark[c],dyes.middle[c],tone*2):mix(dyes.middle[c],dyes.light[c],(tone-.5)*2);
          if(a.dyes==='local')ribbon=mix(ribbon,color[p+c],.55);
          if(a.dyes==='variegated')ribbon=mix(ribbon,dyes.accent[c],.25+.22*Math.sin(v*.035+cell));
          if(a.dyes==='two')ribbon=mix(mix(dyes.dark[c],dyes.light[c],tone),dyes.accent[c]*(.35+.65*tone),Math.floor(u/width)%2===0?.32:.04);
          const underpainting=ribbon;
          let sheen=a.ribbon==='silk'?Math.pow(ridge,7)*29:a.ribbon==='satin'?Math.pow(ridge,2)*22:a.ribbon==='velvet'?ridge*7:ridge*20;
          ribbon=ribbon*(.83+.17*ridge)+sheen*lengthLift*.6+(noise-.5)*(a.ribbon==='velvet'?7:2);
          if(a.ribbon==='organza')ribbon=mix(underpainting,ribbon,.75);
          let value=mix(underpainting*.84,ribbon,body);
          if(id===1)value=mix(ground*(.62+.38*rawTone),value,.25);
          if(edge&&id>0)value=mix(value,rawTone<.32?dyes.light[c]:dyes.dark[c],.38);
          if(id===0)value=ground+(noise-.5)*2;
          if(edge&&id>0&&a.contour==='cord')value=dyes.dark[c]+Math.sin((xx+yy)*2)*5;
          if(edge&&id>0&&a.contour==='chain')value=mix(dyes.accent[c],dyes.light[c],.5+.5*Math.sin((xx+yy)*1.4));
          if(edge&&id>0&&a.contour==='beads'&&Math.sin((xx+yy)*.9)>.3)value=dyes.light[c]+22;
          if(a.border==='hem'&&margin<.025)value=ground-5+Math.sin(margin*720*.9)*3;
          if(a.border==='scallop'&&Math.abs(margin-.019-.007*Math.sin(along/10))<.003)value=dyes.accent[c]+ridge*20;
          if(a.border==='frame'&&margin<.035)value=dyes.middle[c]*(.7+.3*Math.sin(margin/.035*Math.PI));
          if(a.work==='tail'&&X>.68&&X<.9&&Math.abs(Y-.91-.018*Math.sin(X*40))<.006)value=dyes.accent[c]+Math.sin(yy)*12;
          if(a.work==='needle'&&X>.75&&X<.88&&Math.abs(Y-.925+(X-.75)*.25)<.0016)value=dyes.light[c]+25;
          if(a.work==='needle'&&X>.65&&X<.76&&Math.abs(Y-.925-Math.sin(X*35)*.008)<.001)value=dyes.accent[c];
          if(a.work==='mended'&&X>.12&&X<.24&&Y>.78&&Y<.88)value=mix(dyes.dark[c],dyes.accent[c]+sheen,body);
          pixels[p+c]=value;
        }
        pixels[p+3]=255;
      }
    }
    signal.throwIfAborted();return{pixels,notes:[`${a.ribbon} ribbon in ${a.stitch} stitches`,`${a.laying} laying on ${a.backing} ground`]};
  },
});
