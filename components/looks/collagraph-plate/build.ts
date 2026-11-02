import {choice,clamp01,defineLook,mix,rekey,score} from '@conjure/kit';
const hash=(x:number,y:number,s:number)=>{let h=Math.imul(x|0,374761393)^Math.imul(y|0,668265263)^s;h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967296;};
const periodic=(x:number,p:number)=>Math.abs(x/p-Math.floor(x/p)-.5)*p;
export default defineLook({
  questions:{
    plate:choice('What base supports the collaged printing plate?',{card:'Layered card leaves softly compressed edges.',hardboard:'Hardboard leaves crisp relief and a square plate boundary.',fabric:'A cloth-covered board carries a fine woven texture.',corrugated:'Cut corrugated card leaves short parallel channels.'}),
    collage:choice('Which attached materials make the image?',{paper:'Torn papers and overlapping cardboard planes.',cloth:'Woven cloth and lace alternate across the forms.',grit:'Sand and gritty paste make coarse textured shapes.',mixed:'Card, cloth and sand alternate between separate subjects.'}),
    relief:score('How high are the pasted shapes above the plate?', ['Almost flat thin-paper collage','Shallow paper steps','Clearly raised card shapes','Strong layered relief','Deep layered collage with pronounced compressed edges']),
    sealing:choice('How is the assembled plate sealed?',{smooth:'Smooth varnish gives a clear even transfer.',brushed:'Directional varnish brush marks remain visible.',pooled:'Sealer pools at the pasted shape edges.',porous:'A lightly sealed plate retains small absorbent voids.'}),
    inking:choice('Where is the plate inked? Ink hues follow the palette.',{intaglio:'Dark ink stays in recessed textures and seams.',relief:'Raised surfaces print dark and recesses stay pale.',both:'One ink fills recesses while another rolls across the raised shapes.',rubbed:'A softly rubbed single ink retains middle values.'}),
    roll:choice('How does the roller lay its top colour?',{even:'An even roll covers every raised area.',split:'A split roller shifts between two inks across the sheet.',diagonal:'Diagonal roller bands overlap across the plate.',patch:'Small separately inked patches follow the individual shapes.'}),
    seam:choice('How are the edges between collage pieces built?',{torn:'Soft irregular torn paper edges.',cut:'Sharp cut-card edges with a slight pressed rim.',string:'A thin glued string follows the major contours.',stepped:'Multiple offset paper steps surround the silhouettes.'}),
    paper:choice('What dampened paper takes the print?',{cotton:'Thick soft cotton paper receives a clear emboss.',japanese:'Thin long-fibred paper takes delicate ink.',oatmeal:'Warm flecked paper remains visible in uninked patches.',grey:'Cool grey paper holds pale and dark ink.'}),
    boundary:choice('How is the edge of the plate shown?',{cropped:'The plate image runs to the sheet edge.',square:'A square embossed plate mark surrounds the print.',deckle:'An irregular light deckled margin frames the plate.',round:'The plate corners are rounded inside a pale margin.'}),
    state:choice('What working state of the handmade plate was printed?',{new:'A complete freshly sealed plate.',repair:'A small cloth patch repairs one corner of the plate.',peel:'A lifted paper edge leaves a pale tapered gap.',proof:'A short row of trial textures is retained at the foot of the print.'}),
  },
  async apply(capture,a,context,signal){
    signal.throwIfAborted();
    const {size,color,identity,normal}=capture,unit=size/720,pixels=new Uint8ClampedArray(color.length);
    const dye=rekey({paper:a.paper==='grey'?[186,194,188]:a.paper==='oatmeal'?[225,211,176]:[239,230,206],ink:[53,62,62],top:[154,91,51],light:[203,176,112]},context.palette,{paper:'ground',ink:'ink',top:'second',light:'ground'});
    const minX=new Int32Array(256).fill(size),maxX=new Int32Array(256),minY=new Int32Array(256).fill(size),maxY=new Int32Array(256);
    for(let y=0;y<size;y+=3){if(y%96===0){signal.throwIfAborted();await new Promise<void>(r=>setTimeout(r,0));}for(let x=0;x<size;x+=3){const id=identity[(y*size+x)*4];minX[id]=Math.min(minX[id],x);maxX[id]=Math.max(maxX[id],x);minY[id]=Math.min(minY[id],y);maxY[id]=Math.max(maxY[id],y);}}
    const marks=Array.from({length:256},(_,id)=>Math.max(1.6,Math.min(5.5,Math.min(maxX[id]-minX[id],maxY[id]-minY[id])/unit*.06)));
    const step=Math.max(1,Math.round(unit));
    const idAt=(x:number,y:number)=>identity[(Math.min(size-1,Math.max(0,y))*size+Math.min(size-1,Math.max(0,x)))*4];
    for(let y=0;y<size;y++){
      if(y%32===0){signal.throwIfAborted();await new Promise<void>(r=>setTimeout(r,0));}
      for(let x=0;x<size;x++){
        const p=(y*size+x)*4,id=identity[p],X=x/size,Y=y/size,xx=x/unit,yy=y/unit,mark=marks[id];
        const tone=(color[p]*.2126+color[p+1]*.7152+color[p+2]*.0722)/255;
        const grain=hash(Math.floor(xx),Math.floor(yy),context.seed),cell=hash(Math.floor(xx/mark),Math.floor(yy/mark),context.seed+id*71);
        const material=a.collage==='mixed'?['paper','cloth','grit'][id%3]:a.collage;
        const u=xx+(normal[p]/255-.5)*11,v=yy+(normal[p+1]/255-.5)*9;
        let texture=.5;
        if(material==='paper')texture=.45+.2*Math.sin(u*.11+Math.sin(v*.14))+.14*grain;
        if(material==='cloth')texture=.18+.35*Math.abs(Math.sin(u/mark*Math.PI))+.35*Math.abs(Math.sin(v/mark*Math.PI));
        if(material==='grit')texture=cell*.65+grain*.35;
        if(a.plate==='fabric')texture=texture*.75+.25*Math.abs(Math.sin(xx*1.8)*Math.sin(yy*1.8));
        if(a.plate==='corrugated')texture=texture*.67+.33*(.5+.5*Math.sin(v/mark*2));
        if(a.plate==='hardboard')texture=Math.pow(texture,.8);
        const right=idAt(x+step,y),down=idAt(x,y+step),left=idAt(x-step,y),up=idAt(x,y-step);
        let edge=id!==right||id!==down||id!==left||id!==up;
        const rim=(id!==left||id!==up?1:0)-(id!==right||id!==down?1:0);
        let recess=clamp01((1-tone)*.75+(1-texture)*.22),top=clamp01((1-tone)*.7+texture*.17);
        if(id===0){recess*=.12;top*=.12;}
        if(a.seam==='stepped'&&id>0&&(id!==idAt(x+step*3,y+step*3)||id!==idAt(x-step*3,y-step*3)))recess=Math.max(recess,.5);
        if(a.seam==='torn'&&edge)recess=Math.max(recess,.5+grain*.25);
        if(a.seam==='cut'&&edge)recess=Math.max(recess,.68);
        if(a.seam==='string'&&edge){recess=Math.max(recess,.82);top=.25;}
        if(a.sealing==='brushed'){recess*=.85+.15*Math.sin(xx*.48+yy*.11);top*=.9+.1*Math.sin(xx*.6);}
        if(a.sealing==='pooled'&&edge)recess*=1.18;
        if(a.sealing==='porous'&&grain>.87){recess*=.25;top*=.4;}
        let roll=a.roll==='split'?X:a.roll==='diagonal'?.5+.4*Math.sin((X+Y)*13):a.roll==='patch'?hash(id,Math.floor(tone*4),context.seed+8):.4;
        const margin=Math.min(X,Y,1-X,1-Y),border=a.boundary==='deckle'?.038+.003*Math.sin(xx*.41)*Math.sin(yy*.28):.035;
        let outside=a.boundary!=='cropped'&&margin<border;
        if(a.boundary==='round')outside||=Math.hypot(Math.max(0,Math.abs(X-.5)-.4),Math.max(0,Math.abs(Y-.5)-.4))>.065;
        if(a.state==='repair'&&X>.76&&X<.89&&Y>.78&&Y<.9){texture=.5+.4*Math.sin(xx*1.7)*Math.sin(yy*1.7);recess=.25+texture*.3;top=.3;}
        if(a.state==='peel'&&X>.12&&X<.31&&Y>.8&&Y<.8+(X-.12)*.3){recess*=.2;top*=.2;}
        if(a.state==='proof'&&X>.08&&X<.35&&Y>.94&&Y<.969){recess=.3+.4*Math.abs(Math.sin(xx*.9));top=.3;outside=false;}
        for(let c=0;c<3;c++){
          let paper=dye.paper[c]+(grain-.5)*(a.paper==='oatmeal'?11:3);
          if(a.paper==='japanese')paper+=Math.sin(xx*2.1)*2.5;
          let value=paper;
          if(a.inking==='intaglio')value=mix(paper,dye.ink[c],clamp01(recess));
          if(a.inking==='relief')value=mix(paper,mix(dye.ink[c],dye.top[c],roll),clamp01(top));
          if(a.inking==='both')value=mix(mix(paper,dye.ink[c],clamp01(recess)),dye.top[c],clamp01(top*.55+roll*.12));
          if(a.inking==='rubbed')value=mix(paper,mix(dye.ink[c],dye.top[c],roll*.4),clamp01(recess*.6+top*.25));
          value+=rim*mix(2,23,a.relief)*(a.paper==='cotton'?1.1:.7);
          // Height also changes the pressed texture within a piece, not only its edge.
          value+=(texture-.5)*mix(1,10,a.relief);
          if(outside)value=paper;
          if(a.boundary==='square'&&Math.abs(margin-.035)<.0015)value=paper-17;
          pixels[p+c]=value;
        }
        pixels[p+3]=255;
      }
    }
    signal.throwIfAborted();return{pixels,notes:[`${a.collage} collage on ${a.plate}`,`${a.inking} ink transfer with ${a.seam} seams`]};
  },
});
