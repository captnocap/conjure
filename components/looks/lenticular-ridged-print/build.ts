import {choice,clamp01,defineLook,mix,rekey,score} from '@conjure/kit';
const hash=(x:number,y:number,s:number)=>{let h=Math.imul(x|0,374761393)^Math.imul(y|0,668265263)^s;h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967296;};
export default defineLook({
  questions:{
    lenses:choice('What shape is the lenticular surface?',{round:'Closely packed rounded cylindrical lenses.',flat:'Shallow flattened lens ridges.',prism:'Small triangular prism ridges.',bead:'A tiny crossed lens array gives a beaded surface.'}),
    pitch:score('How closely are the lens ridges spaced?', ['Very fine almost invisible lenses','Fine ridged print','Clearly visible lenticular ribs','Broad optical ridges','Large novelty-card ridges reduced around small subjects']),
    direction:choice('Which direction do the lens ribs run?',{vertical:'Vertical ribs reveal horizontal view changes.',horizontal:'Horizontal ribs reveal vertical view changes.',diagonal:'Diagonal ribs run across the picture.',crossed:'A crossed grid refracts in both directions.'}),
    views:choice('What is interlaced beneath the lenses?',{depth:'Slightly displaced views give depth to the scene.',echo:'Two offset copies create a small ghosted echo.',tone:'Light and dark versions alternate under the lenses.',colour:'Two differently coloured views are interleaved.'}),
    angle:score('From what viewing angle is the ridged print seen?', ['Far to one side','Slightly from one side','Straight on','Slightly from the other side','Far to the other side']),
    ink:choice('How is the image printed beneath the lens sheet? Designed inks follow the palette.',{local:'Muted local picture colour remains in the print.',duotone:'Two designed inks separate light and shadow.',poster:'Four flat colour levels make a bold novelty print.',mono:'A single ink carries the whole picture.'}),
    alignment:choice('How precisely is the interlaced image aligned?',{exact:'Precisely registered image and lenses.',offset:'A small sideways misalignment doubles a few edges.',wave:'The lens sheet has a slight wavy registration drift.',bands:'Broad bands shift the interlace phase.'}),
    backing:choice('What backs the optical print?',{white:'A pale white printed card.',cream:'A warm cream printed card.',silver:'A reflective silver backing brightens the lens highlights.',dark:'A dark backing deepens the printed shadows.'}),
    border:choice('How is the ridged card edged?',{full:'The ridged picture reaches the edge.',white:'A narrow plain white border surrounds it.',foil:'A thin reflective foil border frames the card.',rounded:'Rounded corners reveal a plain mounting sheet.'}),
    keeping:choice('What condition is the lenticular sheet in?',{fresh:'A new clean novelty print.',scuff:'A few small scuffs soften the lower lens ridges.',bubble:'A small delamination bubble warps one corner.',corner:'One bent corner interrupts the regular ribs.'}),
  },
  async apply(capture,a,context,signal){
    signal.throwIfAborted();
    const {size,color,identity,depth,normal}=capture,unit=size/720,pixels=new Uint8ClampedArray(color.length);
    const dye=rekey({paper:a.backing==='cream'?[233,221,190]:a.backing==='dark'?[72,80,78]:[237,237,222],dark:[40,57,62],middle:[102,133,133],accent:[174,91,59],light:[219,199,151]},context.palette,{paper:'ground',dark:'ink',middle:'ink',accent:'second',light:'ground'});
    const minX=new Int32Array(256).fill(size),maxX=new Int32Array(256),minY=new Int32Array(256).fill(size),maxY=new Int32Array(256);
    for(let y=0;y<size;y+=3){if(y%96===0){signal.throwIfAborted();await new Promise<void>(r=>setTimeout(r,0));}for(let x=0;x<size;x+=3){const id=identity[(y*size+x)*4];minX[id]=Math.min(minX[id],x);maxX[id]=Math.max(maxX[id],x);minY[id]=Math.min(minY[id],y);maxY[id]=Math.max(maxY[id],y);}}
    const pitches=Array.from({length:256},(_,id)=>Math.max(2,Math.min(mix(2.8,10,a.pitch),Math.min(maxX[id]-minX[id],maxY[id]-minY[id])/unit*.06)));
    for(let y=0;y<size;y++){
      if(y%32===0){signal.throwIfAborted();await new Promise<void>(r=>setTimeout(r,0));}
      for(let x=0;x<size;x++){
        const p=(y*size+x)*4,id=identity[p],X=x/size,Y=y/size,xx=x/unit,yy=y/unit,pitch=pitches[id];
        let u=a.direction==='horizontal'?yy:a.direction==='diagonal'?(xx+yy)*.707:xx;
        if(a.direction==='crossed')u+=Math.sin(yy/pitch*3.14)*pitch*.2;
        let drift=a.alignment==='offset'?.23:a.alignment==='wave'?Math.sin(Y*17)*.22:a.alignment==='bands'?Math.floor(Y*7)%2*.24:0;
        if(a.keeping==='bubble'){
          const d=Math.hypot((X-.83)/.065,(Y-.84)/.055);
          if(d<1)drift+=Math.sqrt(1-d*d)*.45;
        }
        if(a.keeping==='corner'&&X+Y>1.78)u+=(X+Y-1.78)*140;
        const phase=((u/pitch+drift)%1+1)%1,lens=phase-.5;
        const rounded=Math.sqrt(Math.max(0,1-lens*lens*4)),prism=1-Math.abs(lens)*2;
        let shape=a.lenses==='prism'?prism:a.lenses==='flat'?Math.min(1,rounded*1.3):rounded;
        if(a.lenses==='bead')shape*=.68+.32*Math.abs(Math.sin(yy/pitch*Math.PI));
        const view=phase+a.angle*.6>.8?1:-1;
        // Decode the linear RGBA depth using Three's current packing weights.
        const linearDepth=depth[p]/256+depth[p+1]/65536+depth[p+2]/16777216+depth[p+3]/4278190080;
        const separation=(a.views==='depth'?(1-linearDepth)*2.3:a.views==='echo'?2:0)*unit;
        const shift=Math.round(view*separation+(a.angle-.5)*unit*2);
        let sx=x,sy=y;
        if(a.direction==='horizontal')sy=Math.min(size-1,Math.max(0,y+shift));else sx=Math.min(size-1,Math.max(0,x+shift));
        // Keep thin silhouettes intact rather than pulling background colour through them.
        let sp=(sy*size+sx)*4;
        if(identity[sp]!==id)sp=p;
        const tone=(color[sp]*.2126+color[sp+1]*.7152+color[sp+2]*.0722)/255;
        const noise=hash(Math.floor(xx),Math.floor(yy),context.seed),margin=Math.min(X,Y,1-X,1-Y);
        const step=Math.max(1,Math.round(unit)),q=(y*size+Math.min(size-1,x+step))*4,r=(Math.min(size-1,y+step)*size+x)*4;
        const edge=id!==identity[q]||id!==identity[r]||Math.abs(color[p]-color[q])+Math.abs(color[p+1]-color[q+1])+Math.abs(color[p+2]-color[q+2])>66||Math.abs(normal[p]-normal[q])+Math.abs(normal[p+1]-normal[q+1])+Math.abs(normal[p+2]-normal[q+2])>65;
        for(let c=0;c<3;c++){
          let printed=mix(dye.dark[c],dye.light[c],tone);
          if(a.ink==='local')printed=mix(printed,color[sp+c],.63);
          if(a.ink==='duotone')printed=tone<.44?mix(dye.dark[c],dye.accent[c],tone/.44):mix(dye.accent[c],dye.light[c],(tone-.44)/.56);
          if(a.ink==='poster')printed=[dye.dark[c],dye.middle[c],dye.accent[c],dye.light[c]][Math.min(3,Math.floor(tone*4))];
          if(a.views==='tone')printed*=view===1?1.07:.9;
          if(a.views==='colour')printed=mix(printed,view===1?dye.accent[c]:dye.middle[c],.23);
          let value=printed*(.83+.17*shape)+Math.pow(shape,9)*(a.backing==='silver'?34:14);
          if(a.backing==='white')value=mix(value,dye.paper[c],.035);
          if(a.backing==='cream')value=mix(value,dye.paper[c],.13);
          if(a.backing==='dark')value=mix(value,dye.dark[c],.09);
          if(id===1)value=mix(dye.paper[c]*(.63+.37*tone),value,.42);
          if(edge&&id>0)value=mix(value,dye.dark[c],.28);
          if(id===0)value=mix(dye.paper[c],value,.24);
          if(a.keeping==='scuff'&&Y>.78&&Y<.91&&X>.62&&X<.89&&Math.sin(xx*.9+yy*.12)>.82)value=mix(value,dye.paper[c],.3);
          if(a.border==='white'&&margin<.03)value=dye.paper[c];
          if(a.border==='foil'&&margin<.02)value=dye.light[c]*(.8+.2*Math.sin((X+Y)*15))+20;
          if(a.border==='rounded'&&Math.hypot(Math.max(0,Math.abs(X-.5)-.42),Math.max(0,Math.abs(Y-.5)-.42))>.07)value=dye.paper[c];
          pixels[p+c]=value+(noise-.5)*1.5;
        }
        pixels[p+3]=255;
      }
    }
    signal.throwIfAborted();return{pixels,notes:[`${a.lenses} ${a.direction} lens array`,`${a.views} interlacing with ${a.ink} inks`]};
  },
});
