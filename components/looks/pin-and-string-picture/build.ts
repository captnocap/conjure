import {choice,clamp01,defineLook,mix,rekey,score} from '@conjure/kit';
const hash=(x:number,y:number,s:number)=>{let h=Math.imul(x|0,374761393)^Math.imul(y|0,668265263)^s;h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967296;};
const line=(x:number,y:number,ax:number,ay:number,bx:number,by:number)=>{const dx=bx-ax,dy=by-ay,t=clamp01(((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy));return Math.hypot(x-ax-t*dx,y-ay-t*dy);};
export default defineLook({
  questions:{
    thread:choice('What is wound around the pins?',{cotton:'Fine matte cotton thread.',silk:'Smooth bright silk thread.',wool:'Soft thicker wool with a slight halo.',wire:'Thin metallic wire catches tiny highlights.'}),
    pins:choice('What kind of pin holds the threads?',{brass:'Small warm brass nail heads.',steel:'Flat cool steel pins.',ball:'Tiny round pin heads.',dark:'Dark unobtrusive headless brads.'}),
    layout:choice('How do the thread paths connect the pins?',{triangles:'Overlapping triangular thread paths.',fan:'Several threads fan from each common anchor.',lattice:'Crossed diagonal threads make open diamonds.',zigzag:'Long zigzag paths lace between opposite rows.'}),
    span:score('How far apart are the anchor pins?', ['Tiny closely spaced anchors','Fine close pinwork','Medium open thread spans','Long visible thread spans','Wide spanning threads reduced around small subjects']),
    layers:score('How many thread passes build the values?', ['Sparse single thread passes','A few crossing passes','Several layered thread paths','Dense repeated windings','Many overlapping windings preserve deep shadows']),
    colour:choice('How are the threads coloured? Designed thread colours follow the palette.',{single:'A single dark thread describes all the forms.',duet:'Two contrasting thread colours cross.',local:'Muted local scene colours remain in the windings.',pale:'Pale thread lies on a darker board.'}),
    board:choice('What supports the pins?',{wood:'A natural wood board with fine grain.',linen:'Pale linen covers the backing board.',felt:'Soft dark felt hides the thread shadows.',painted:'A smooth muted painted board.'}),
    tension:choice('How taut are the thread spans?',{taut:'Straight taut threads connect every pin.',soft:'Small downward bows soften the spans.',uneven:'Alternate spans sag by different amounts.',pulled:'Strongly tensioned threads form especially fine straight lines.'}),
    contour:choice('How are the main silhouettes bounded?',{open:'Interior windings stop at the silhouette.',rim:'A continuous dark thread outlines each subject.',double:'Two closely spaced outline threads surround each subject.',pin:'A close row of tiny pin heads traces the contours.'}),
    ends:choice('What is left where the thread work ends?',{tidy:'All ends are tucked away.',knot:'A small cluster of tied thread ends rests near a corner.',tail:'A loose curling thread tail crosses the lower board.',spare:'A few spare pin heads remain along the lower edge.'}),
  },
  async apply(capture,a,context,signal){
    signal.throwIfAborted();
    const {size,color,identity,normal}=capture,unit=size/720,pixels=new Uint8ClampedArray(color.length);
    const dye=rekey({board:a.board==='felt'?[71,80,72]:a.board==='wood'?[205,180,133]:[228,219,191],dark:[43,53,51],accent:[170,78,57],pale:[228,211,165],pin:[170,141,88]},context.palette,{board:'ground',dark:'ink',accent:'second',pale:'ground',pin:'second'});
    const minX=new Int32Array(256).fill(size),maxX=new Int32Array(256),minY=new Int32Array(256).fill(size),maxY=new Int32Array(256);
    for(let y=0;y<size;y+=3){if(y%96===0){signal.throwIfAborted();await new Promise<void>(r=>setTimeout(r,0));}for(let x=0;x<size;x+=3){const id=identity[(y*size+x)*4];minX[id]=Math.min(minX[id],x);maxX[id]=Math.max(maxX[id],x);minY[id]=Math.min(minY[id],y);maxY[id]=Math.max(maxY[id],y);}}
    const spans=Array.from({length:256},(_,id)=>Math.max(3.2,Math.min(id<=1?8:mix(6,17,a.span),Math.min(maxX[id]-minX[id],maxY[id]-minY[id])/unit*.1)));
    const step=Math.max(1,Math.round(unit)),passes=2+Math.round(a.layers*4);
    const idAt=(x:number,y:number)=>identity[(Math.max(0,Math.min(size-1,y))*size+Math.max(0,Math.min(size-1,x)))*4];
    for(let y=0;y<size;y++){
      if(y%32===0){signal.throwIfAborted();await new Promise<void>(r=>setTimeout(r,0));}
      for(let x=0;x<size;x++){
        const p=(y*size+x)*4,id=identity[p],X=x/size,Y=y/size,xx=x/unit,yy=y/unit,span=spans[id];
        const col=Math.floor(xx/span),row=Math.floor(yy/span),fx=xx/span-col,fy=yy/span-row,cell=hash(col,row,context.seed+id*19);
        const tone=(color[p]*.2126+color[p+1]*.7152+color[p+2]*.0722)/255,noise=hash(Math.floor(xx),Math.floor(yy),context.seed);
        const sag=a.tension==='soft'?.12:a.tension==='uneven'?.04+cell*.15:0;
        const py=fy-sag*Math.sin(fx*Math.PI);
        let distance=1,second=1;
        for(let k=0;k<passes;k++){
          const t=(k+1)/(passes+1);
          let d=1;
          if(a.layout==='triangles')d=Math.min(line(fx,py,.06,.94,t,.06),line(fx,py,t,.06,.94,.94));
          if(a.layout==='fan')d=line(fx,py,.06,.94,.94,t*.85+.05);
          if(a.layout==='lattice')d=Math.min(line(fx,py,0,t,1,1-t),line(fx,py,t,0,1-t,1));
          if(a.layout==='zigzag')d=Math.min(line(fx,py,0,t,.5,1-t),line(fx,py,.5,1-t,1,t));
          if(k%2===0)distance=Math.min(distance,d);else second=Math.min(second,d);
        }
        const thickness=(a.thread==='wool'?.95:a.thread==='wire'?.42:.63)*(a.tension==='pulled'?.65:1);
        let first=clamp01((thickness-distance*span)*1.4+.25),other=clamp01((thickness-second*span)*1.4+.25);
        const darkness=clamp01((1-tone)*1.3+(id>=2?.16:.04)),visible=id===0?.008:1;
        first*=darkness*visible;other*=darkness*visible;
        const pinDistance=Math.min(Math.hypot(fx-.06,fy-.94),Math.hypot(fx-.94,fy-.94),Math.hypot(fx-.5,fy-.06))*span;
        let pin=pinDistance<(a.pins==='ball'?.85:a.pins==='dark'?.35:.55)&&id>0;
        const q=(y*size+Math.min(size-1,x+step))*4,r=(Math.min(size-1,y+step)*size+x)*4;
        const edge=id!==idAt(x+step,y)||id!==idAt(x,y+step)||Math.abs(normal[p]-normal[q])+Math.abs(normal[p+1]-normal[r+1])>65||Math.abs(color[p]-color[q])+Math.abs(color[p+1]-color[r+1])>75;
        const edge2=id!==idAt(x+step*3,y)||id!==idAt(x,y+step*3);
        if(a.contour==='pin'&&edge&&Math.sin((xx+yy)*.55)>.35)pin=true;
        const knot=a.ends==='knot'&&Math.hypot(X-.85,Y-.88)<.012;
        const tail=a.ends==='tail'&&X>.63&&X<.9&&Math.abs(Y-.92-.014*Math.sin(X*47))<.0016;
        const spare=a.ends==='spare'&&X>.08&&X<.27&&Math.hypot((xx/17-Math.floor(xx/17)-.5)*17,(Y-.955)*720)<1.3;
        for(let c=0;c<3;c++){
          let board=dye.board[c]+(noise-.5)*(a.board==='felt'?7:2);
          if(a.board==='wood')board+=Math.sin(xx*.085+Math.sin(yy*.01))*4;
          if(a.board==='linen')board+=Math.sin(xx*2.1)*Math.sin(yy*2.1)*3;
          if(a.colour==='pale')board=mix(board,dye.dark[c],.72);
          let thread=a.colour==='pale'||a.board==='felt'?dye.pale[c]:dye.dark[c];
          if(a.colour==='local')thread=mix(thread,color[p+c],.6);
          let highlight=a.thread==='silk'?first*12:a.thread==='wire'?first*28:a.thread==='wool'?(noise-.5)*7:0;
          let value=mix(board,thread+highlight,first);
          value=mix(value,a.colour==='duet'?dye.accent[c]:thread+highlight,other);
          if(id>0)value=mix(value,mix(board,thread,.6),darkness*.26);
          if(edge&&id>0)value=mix(value,thread,a.contour==='open'?.42:.75);
          if(a.contour==='double'&&edge2)value=mix(value,thread,.62);
          if(pin||spare)value=mix(value,a.pins==='dark'?dye.dark[c]:a.pins==='steel'?mix(dye.pale[c],dye.dark[c],.4)+13:dye.pin[c]+Math.max(0,1-pinDistance)*17,.72);
          if(knot)value=mix(dye.dark[c],dye.accent[c],.5+.4*Math.sin(xx*2)*Math.sin(yy*2));
          if(tail)value=dye.accent[c];
          pixels[p+c]=value;
        }
        pixels[p+3]=255;
      }
    }
    signal.throwIfAborted();return{pixels,notes:[`${a.thread} thread in ${a.layout} paths`,`${a.pins} pins over ${a.board} board`]};
  },
});
