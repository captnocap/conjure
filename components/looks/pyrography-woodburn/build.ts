import { choice, clamp01, defineLook, mix, rekey, score } from '@conjure/kit';

const hash=(x:number,y:number,seed:number)=>{let n=Math.imul(x|0,374761393)^Math.imul(y|0,668265263)^seed;n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967296;};

export default defineLook({
  questions:{
    board:choice('What character does the wooden panel have? Its tones follow the picture palette.',{
      maple:'A pale fine-grained board with sharp dark burn marks.',pine:'An open-grained board with strongly contrasting growth lines.',
      birch:'An even, light panel with a softly mottled surface.',walnut:'A deep-toned board with restrained pale grain and near-black cuts.',
    }),
    grain:choice('How is the wood grain cut across the picture?',{vertical:'Long vertical fibres.',horizontal:'Horizontal flowing fibres.',diagonal:'Diagonal grain through the panel.',end:'Concentric end-grain rings with small irregularities.'}),
    tip:choice('What burner tip makes the marks?',{point:'A fine pointed nib makes small precise marks.',spoon:'A broad spoon tip lays overlapping soft burns.',chisel:'A flat chisel makes short square-ended strokes.',wire:'A bent wire nib makes thin loops and narrow dark strokes.'}),
    shading:choice('How are the dark areas worked?',{hatch:'Parallel burned hatching follows the surfaces.',stipple:'Clusters of small burnt dots build the shade.',contour:'Wavering bands follow the shapes and their tone.',wash:'Broad overlapping scorched areas make continuous shade.'}),
    heat:score('How hot is the burner?', ['Faint warm tracing','Light browned marks','Clearly dark lines','Strong charred strokes','Dense black charring with a broad scorch halo']),
    grainSize:score('How broad are the growth lines?', ['Very fine close grain','Fine grain','Clearly visible fibres','Broad flowing grain','Wide end-grain bands']),
    contour:choice('How are the contours finished?',{fine:'One precise thin outline.',double:'Two close outline passes.',soft:'A broad soft scorch follows the silhouette.',bold:'A firm dark outline holds the subject together.'}),
    finish:choice('How has the wood been finished?',{raw:'Dry raw wood with an open tooth.',oil:'Oil deepens the wood and the broad dark marks.',wax:'A restrained wax sheen catches raised fibres.',varnish:'A glossy clear finish catches a broad diagonal reflection.'}),
    edge:choice('How is the panel edge treated?',{plain:'The picture runs to a simple straight edge.',bevel:'A pale bevel surrounds the burnt panel.',frame:'A dark wooden frame borders the image.',scallop:'A shallow scalloped burnt border runs inside the edge.'}),
    history:choice('What trace of making remains?',{fresh:'Cleanly finished and brushed free of dust.',smudge:'A little soot has rubbed across the lower margin.',reburn:'A small area has been gone over twice and burned deeper.',repair:'A narrow inlaid repair interrupts the lower corner.'}),
  },
  async apply(capture,a,context,signal){
    signal.throwIfAborted();
    const {size,color,normal,identity}=capture,u=size/720,out=new Uint8ClampedArray(color.length);
    const sets={maple:{wood:[221,187,132],char:[43,27,18],light:[245,219,166],scorch:[137,75,34]},pine:{wood:[202,159,91],char:[39,25,14],light:[239,210,148],scorch:[146,81,28]},birch:{wood:[224,204,158],char:[54,38,28],light:[248,235,196],scorch:[148,99,52]},walnut:{wood:[118,81,48],char:[24,18,15],light:[174,133,83],scorch:[77,43,24]}} as const;
    const inks=rekey(sets[a.board],context.palette,{wood:'ground',char:'ink',light:'ground',scorch:'second'});
    const widths=new Float32Array(256),mins=new Int32Array(256).fill(size),maxs=new Int32Array(256);
    for(let y=0;y<size;y+=3){if(y%96===0){signal.throwIfAborted();await new Promise<void>(r=>setTimeout(r,0));}for(let x=0;x<size;x+=3){const id=identity[(y*size+x)*4];mins[id]=Math.min(mins[id],x);maxs[id]=Math.max(maxs[id],x);}}
    for(let i=0;i<256;i++)widths[i]=Math.max(3,(maxs[i]-mins[i])/u);
    const tone=(p:number)=>(color[p]*.2126+color[p+1]*.7152+color[p+2]*.0722)/255;
    const step=Math.max(1,Math.round(u)),span=4+22*a.grainSize;
    for(let y=0;y<size;y++){
      if(y%32===0){signal.throwIfAborted();await new Promise<void>(r=>setTimeout(r,0));}
      for(let x=0;x<size;x++){
        const p=(y*size+x)*4,id=identity[p],t=tone(p),xx=x/u,yy=y/u,X=x/size,Y=y/size;
        const q=(y*size+Math.min(size-1,x+step))*4,r=(Math.min(size-1,y+step)*size+x)*4;
        const edge=id!==identity[q]||id!==identity[r]||Math.abs(t-tone(q))+Math.abs(t-tone(r))>.19;
        const q2=(y*size+Math.max(0,x-step*3))*4,r2=(Math.max(0,y-step*3)*size+x)*4;
        const echo=id!==identity[q2]||id!==identity[r2]||Math.abs(t-tone(q2))>.27;
        const fibre=a.grain==='horizontal'?yy:a.grain==='diagonal'?xx*.72+yy*.7:a.grain==='end'?Math.hypot(xx-250,yy-360):xx;
        const along=a.grain==='horizontal'?xx:yy;
        const grain=Math.sin(fibre/span*Math.PI*2+Math.sin(along/91)*.8+Math.sin(along/33)*.12);
        const growth=Math.pow(Math.max(0,grain),8),noise=hash(Math.floor(xx),Math.floor(yy),context.seed);
        const scale=Math.max(.8,Math.min(3.4,widths[id]/70)),nx=normal[p]/127.5-1,ny=normal[p+1]/127.5-1;
        const angle=Math.atan2(ny,nx)+.7,across=xx*Math.cos(angle)+yy*Math.sin(angle),run=-xx*Math.sin(angle)+yy*Math.cos(angle);
        let mark=0,shade=id?clamp01((1-t)*(.58+a.heat*.7)):0;
        if(a.shading==='hatch')mark=Math.abs(Math.sin(across/(scale*1.7)))<shade*.8?1:0;
        if(a.shading==='stipple'){const gx=Math.floor(xx/(scale*2.8)),gy=Math.floor(yy/(scale*2.8));const jitter=hash(gx,gy,context.seed+19);const dx=(xx/(scale*2.8))%1-.5,dy=(yy/(scale*2.8))%1-.5;mark=dx*dx+dy*dy<shade*.16&&jitter<.4+shade*.6?1:0;}
        if(a.shading==='contour')mark=Math.abs(Math.sin((t*16+across/(70*scale))*Math.PI))<shade*.65?1:0;
        if(a.shading==='wash')mark=shade*(.8+.2*Math.sin(across/(scale*6)+Math.sin(run/(scale*8))));
        if(a.tip==='spoon')mark=clamp01(mark*.78+shade*.24);
        if(a.tip==='chisel')mark*=.45+.55*(Math.floor(run/(scale*3))%3!==0?1:.25);
        if(a.tip==='wire')mark*=.6+.4*Math.abs(Math.sin(run/(scale*1.9)));
        const margin=Math.min(X,Y,1-X,1-Y),border=a.edge==='frame'&&margin<.027;
        for(let c=0;c<3;c++){
          let value=inks.wood[c]+(noise-.5)*(a.finish==='raw'?7:3)+(a.board==='pine'?13:7)*grain-growth*(a.board==='pine'?19:9);
          if(id)value=mix(value,inks.scorch[c],shade*.34);
          value=mix(value,inks.char[c],mark*(.25+a.heat*.65));
          if(edge)value=mix(value,inks.char[c],a.contour==='bold'?.94:a.contour==='soft'?.6:.78);
          if(echo&&a.contour==='double')value=mix(value,inks.char[c],.55);
          if(echo&&a.contour==='soft')value=mix(value,inks.scorch[c],.36);
          if(a.finish==='oil')value*=.91;
          if(a.finish==='wax')value+=Math.max(0,grain)*4;
          if(a.finish==='varnish')value+=Math.max(0,1-Math.abs(X-Y*.65-.1)/.13)*19;
          if(a.edge==='bevel'&&margin<.018)value=inks.light[c]-(X<Y?3:13);
          if(border)value=inks.char[c]+(grain+1)*5;
          if(a.edge==='scallop'&&Math.abs(margin-.025-Math.sin((X+Y)*170)*.004)<.002)value=inks.char[c];
          if(a.history==='smudge'&&Y>.84&&X>.14&&X<.46)value=mix(value,inks.char[c],.15*noise);
          if(a.history==='reburn'&&X>.64&&X<.83&&Y>.61&&Y<.76)value=mix(value,inks.char[c],.14+(id?shade*.13:0));
          if(a.history==='repair'&&X>.8&&X<.84&&Y>.73&&Y<.95)value=mix(inks.light[c],inks.scorch[c],.25+growth*.2);
          out[p+c]=value;
        }
        out[p+3]=255;
      }
    }
    signal.throwIfAborted();return{pixels:out,notes:[`${a.tip} woodburn with ${a.shading} shading`,`${a.grain} grain and ${a.finish} finish`]};
  },
});
