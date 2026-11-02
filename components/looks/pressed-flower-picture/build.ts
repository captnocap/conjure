import {choice,clamp01,defineLook,mix,rekey,score} from '@conjure/kit';
const hash=(x:number,y:number,s:number)=>{let h=Math.imul(x|0,374761393)^Math.imul(y|0,668265263)^s;h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967296;};
export default defineLook({
  questions:{
    flowers:choice('What pressed flower shapes build the picture?',{daisy:'Small narrow-petalled daisy heads.',violet:'Broad five-petalled flower shapes.',poppy:'Thin overlapping rounded petals.',mixed:'Small flowers, broad petals and seed heads alternate.'}),
    foliage:choice('Which pressed leaves fill the spaces between flowers?',{oval:'Small oval leaves with a clear central vein.',fern:'Tiny paired fern leaflets.',willow:'Long narrow willow-like leaves.',round:'Small rounded leaves with radiating veins.'}),
    size:score('How large are the individual pressed pieces?', ['Tiny fragments make a detailed picture','Small close petals','Medium readable flowers and leaves','Broad pressed pieces','Large whole flower heads, reduced around small subjects']),
    arrangement:choice('How are the botanical fragments arranged?',{scatter:'Loose small scattered fragments overlap.',rows:'Close tidy rows of flowers build the forms.',sprigs:'Short diagonal sprigs link flowers and leaves.',fan:'Small fans of petals spread across each subject.'}),
    colour:choice('How are the pressed plants selected? Designed botanical colours follow the palette.',{natural:'Muted green, ochre and faded flower colours.',tonal:'A narrow tonal family of dried plants.',local:'Petal colours follow the scene colours.',contrast:'Dark leaves contrast with pale flower petals.'}),
    drying:choice('How were the plant pieces pressed?',{flat:'Very flat evenly dried petals.',wrinkled:'Fine wrinkles radiate through the dried petals.',translucent:'Thin translucent petals show their overlaps.',curled:'Slightly curled edges catch soft highlights.'}),
    stems:choice('How are the plant pieces connected?',{none:'Individual loose leaves and petals.',fine:'Fine short stems join the clusters.',branch:'A branching stem structure crosses each cluster.',thread:'Thin mounting threads secure the small sprigs.'}),
    mount:choice('What paper supports the botanical picture?',{cream:'Cream botanical mounting paper.',blue:'Muted blue-grey paper.',kraft:'Warm brown kraft paper with visible fibres.',white:'Pale smooth white paper.'}),
    border:choice('How is the collection framed?',{plain:'An unadorned paper margin.',rule:'A fine ruled botanical-study border.',petals:'A row of small pressed petals runs around the margin.',tape:'Four narrow mounting-tape corners hold the sheet.'}),
    keeping:choice('What evidence of keeping and handling remains?',{fresh:'A newly arranged collection.',label:'A small ruled specimen label rests at the lower edge.',lost:'A few tiny leaf fragments have fallen away from the lower corner.',repair:'A strip of translucent repair paper holds one torn petal area.'}),
  },
  async apply(capture,a,context,signal){
    signal.throwIfAborted();
    const {size,color,identity,normal}=capture,unit=size/720,pixels=new Uint8ClampedArray(color.length);
    const papers={cream:[238,228,201],blue:[191,207,211],kraft:[192,166,121],white:[243,240,225]} as const;
    const dye=rekey({paper:papers[a.mount],leaf:[77,94,55],petal:[182,122,91],pale:[216,189,118],deep:[57,63,43]},context.palette,{paper:'ground',leaf:'ink',petal:'second',pale:'ground',deep:'ink'});
    const minX=new Int32Array(256).fill(size),maxX=new Int32Array(256),minY=new Int32Array(256).fill(size),maxY=new Int32Array(256);
    for(let y=0;y<size;y+=3){if(y%96===0){signal.throwIfAborted();await new Promise<void>(r=>setTimeout(r,0));}for(let x=0;x<size;x+=3){const id=identity[(y*size+x)*4];minX[id]=Math.min(minX[id],x);maxX[id]=Math.max(maxX[id],x);minY[id]=Math.min(minY[id],y);maxY[id]=Math.max(maxY[id],y);}}
    const spans=Array.from({length:256},(_,id)=>Math.max(3.2,Math.min(mix(3.5,9,a.size),Math.min(maxX[id]-minX[id],maxY[id]-minY[id])/unit*.09)));
    const step=Math.max(1,Math.round(unit));
    for(let y=0;y<size;y++){
      if(y%32===0){signal.throwIfAborted();await new Promise<void>(r=>setTimeout(r,0));}
      for(let x=0;x<size;x++){
        const p=(y*size+x)*4,id=identity[p],X=x/size,Y=y/size,xx=x/unit,yy=y/unit,span=id===1?Math.min(3,spans[id]):spans[id];
        const angle=a.arrangement==='sprigs'?.6:a.arrangement==='fan'?Math.sin(Math.floor(xx/50)*.8+id)*.4:0;
        const u=xx*Math.cos(angle)+yy*Math.sin(angle),v=-xx*Math.sin(angle)+yy*Math.cos(angle),row=Math.floor(v/span),col=Math.floor(u/span);
        const cell=hash(col,row,context.seed+id*17),jitter=a.arrangement==='scatter'?.15:.035;
        const fx=(u/span-col-.5)+(cell-.5)*jitter,fy=(v/span-row-.5)+(hash(col,row,context.seed+31)-.5)*jitter;
        const polar=Math.atan2(fy,fx)+cell*5,rad=Math.hypot(fx,fy),tone=(color[p]*.2126+color[p+1]*.7152+color[p+2]*.0722)/255;
        const family=a.flowers==='mixed'?['daisy','violet','poppy'][Math.floor(cell*3)]:a.flowers;
        const lobes=family==='daisy'?10:family==='violet'?5:4;
        const petalRadius=(family==='daisy'?.26:family==='violet'?.31:.34)+Math.cos(polar*lobes)*(family==='daisy'?.15:.095);
        let flower=clamp01((petalRadius-rad)*span*2+.5);
        const isLeaf=(col+row+id)%3===0;
        let leaf=0,vein=0;
        if(isLeaf){
          if(a.foliage==='oval')leaf=clamp01((1-Math.hypot(fx*2.6,fy*4.3))*span+.3);
          if(a.foliage==='willow')leaf=clamp01((1-Math.abs(fx)*2.1-Math.abs(fy)*8)*span+.3);
          if(a.foliage==='round')leaf=clamp01((.34-rad)*span*2+.5);
          if(a.foliage==='fern')leaf=clamp01((.2-Math.abs(fy)-Math.abs(Math.sin(fx*20))*.13)*span*2+.3)*clamp01((.46-Math.abs(fx))*span*2);
          vein=Math.abs(fy)<.018||Math.abs(fy-Math.sin(fx*19)*.12)<.012?.4:0;
          flower=leaf;
        }
        let stem=0;
        if(a.stems==='fine'&&Math.abs(fx)<.018&&fy>.1)stem=.65;
        if(a.stems==='branch'&&(Math.abs(fx)<.018||Math.abs(fx-Math.max(0,fy)*.6)<.018))stem=.65;
        if(a.stems==='thread'&&Math.abs(fy-.29)<.018)stem=.4;
        const q=(y*size+Math.min(size-1,x+step))*4,r=(Math.min(size-1,y+step)*size+x)*4;
        const edge=id!==identity[q]||id!==identity[r]||Math.abs(color[p]-color[q])>38||Math.abs(normal[p]-normal[q])+Math.abs(normal[p+1]-normal[r+1])>58;
        const noise=hash(Math.floor(xx),Math.floor(yy),context.seed),margin=Math.min(X,Y,1-X,1-Y),along=Math.min(X,1-X)<Math.min(Y,1-Y)?yy:xx;
        let opacity=flower*(id===0?0:id===1?.25:.8)+stem*(id===0?0:id===1?.2:1);
        if(a.drying==='translucent')opacity*=.72;
        if(a.keeping==='lost'&&X>.77&&X<.91&&Y>.8&&Y<.91&&cell>.45)opacity*=.08;
        for(let c=0;c<3;c++){
          const paper=dye.paper[c]+(noise-.5)*(a.mount==='kraft'?9:3);
          let pigment=isLeaf?dye.leaf[c]:mix(dye.petal[c],dye.pale[c],cell);
          if(a.colour==='tonal')pigment=mix(dye.deep[c],dye.pale[c],tone*.85);
          if(a.colour==='local')pigment=mix(pigment,color[p+c],.65);
          if(a.colour==='contrast')pigment=isLeaf?dye.deep[c]:dye.pale[c];
          pigment=mix(mix(dye.deep[c],dye.pale[c],tone),pigment*(.3+.7*tone),.45);
          if(isLeaf)pigment-=vein*18;
          if(!isLeaf&&rad<.065)pigment=dye.deep[c]+(noise-.5)*18;
          if(a.drying==='wrinkled')pigment+=Math.sin(polar*23+rad*19)*7;
          if(a.drying==='curled')pigment+=Math.pow(Math.max(0,1-Math.abs(rad-petalRadius)*30),2)*22;
          // A dense bed of tiny plant fragments carries the complete image between whole petals.
          const bed=id===0?paper:id===1?mix(paper,mix(dye.deep[c],dye.pale[c],tone),.35):mix(dye.deep[c],dye.pale[c],tone*.92);
          let value=mix(bed,pigment,clamp01(opacity));
          if(edge&&id>0)value=mix(value,tone<.3?dye.pale[c]:dye.deep[c],.48);
          if(a.border==='rule'&&Math.abs(margin-.032)<.0012)value=dye.leaf[c];
          if(a.border==='petals'&&Math.abs(margin-.02)<.006&&Math.sin(along/7)>.15)value=mix(dye.petal[c],dye.pale[c],.5+.4*Math.sin(along/7));
          if(a.border==='tape'&&Math.min(X,1-X)<.065&&Math.min(Y,1-Y)<.022)value=mix(value,dye.pale[c],.5);
          if(a.keeping==='label'&&X>.64&&X<.91&&Y>.92&&Y<.973){value=paper+5;if(Y>.935&&Y<.962&&Math.sin(yy*.7)>.8&&X<.87)value=dye.leaf[c];}
          if(a.keeping==='repair'&&X>.13&&X<.31&&Y>.83&&Y<.867)value=mix(value,paper,.36);
          pixels[p+c]=value;
        }
        pixels[p+3]=255;
      }
    }
    signal.throwIfAborted();return{pixels,notes:[`${a.flowers} flowers and ${a.foliage} leaves`,`${a.drying} pressings on ${a.mount} paper`]};
  },
});
