import {choice,clamp01,defineLook,mix,rekey,score} from '@conjure/kit';
const hash=(x:number,y:number,s:number)=>{let h=Math.imul(x|0,374761393)^Math.imul(y|0,668265263)^s;h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967296;};
export default defineLook({
  questions:{
    coating:choice('Which interference coating covers the picture? Hues follow the selected palette.',{goldgreen:'Gold shifts into muted leaf green.',roseamber:'Rose copper shifts into warm amber.',bluebronze:'Blue-grey shifts into bronze.',pearl:'Pale pearl shifts through restrained green and rose.'}),
    thickness:score('How many colour bands arise from the film thickness?', ['One broad colour transition','Two broad interference bands','Several clear colour bands','Close repeated interference bands','Fine iridescent banding across the surfaces']),
    layer:choice('How are the interference layers laid down?',{even:'Even coating follows each surface.',wedge:'A slowly varying wedge of coating crosses each form.',patches:'Separate overlapping film patches build the image.',laminate:'Thin crossed laminate layers add a secondary colour shift.'}),
    orientation:choice('Which direction reveals the colour change?',{horizontal:'The coating changes across horizontally turned surfaces.',vertical:'Vertical surface tilt drives the colour shift.',diagonal:'A diagonal viewing direction catches the film.',radial:'The film turns in broad radial fans.'}),
    substrate:choice('What supports the thin coloured film?',{glass:'Clear polished glass with a pale transmitted body.',foil:'Reflective metal foil with crisp highlights.',paper:'Coated paper softens the interference sheen.',black:'A dark backing brings out saturated reflected colour.'}),
    forming:choice('How is the film physically shaped?',{flat:'Flat carefully laid film.',folded:'Broad angular folds cross the film.',wrinkled:'Fine shallow wrinkles break up the colour bands.',arched:'A gently curved sheet holds one broad highlight.'}),
    seams:choice('How do the separate film pieces meet?',{flush:'Flush invisible joins at the subject boundaries.',overlap:'Narrow doubled overlaps follow the contours.',cut:'Fine dark cut edges separate the pieces.',lift:'Small lifted edges catch pale reflected light.'}),
    finish:choice('How smooth is the outer surface?',{polished:'A polished outer layer has sharp highlights.',satin:'Satin coating gives a broad quiet sheen.',brushed:'Fine directional brushing runs through the highlights.',dimpled:'Tiny dimples gently stipple the reflections.'}),
    mount:choice('How is the optical sample presented?',{full:'The optical film fills the sheet.',window:'A pale card window surrounds the sample.',clips:'Small dark mounting clips hold four corners.',strip:'A narrow clear sample strip remains along one side.'}),
    condition:choice('What state is the laminated film in?',{new:'A newly finished laminate.',bubble:'A small trapped bubble distorts a corner.',peeling:'One corner is partly lifted and pale.',test:'Three small test-coating swatches remain along the lower edge.'}),
  },
  async apply(capture,a,context,signal){
    signal.throwIfAborted();
    const {size,color,identity,normal}=capture,unit=size/720,pixels=new Uint8ClampedArray(color.length);
    const schemes={goldgreen:{first:[183,141,62],second:[91,139,110],third:[133,98,94]},roseamber:{first:[175,99,105],second:[208,163,76],third:[94,124,115]},bluebronze:{first:[78,127,160],second:[169,123,71],third:[157,166,137]},pearl:{first:[207,191,188],second:[173,205,182],third:[204,185,141]}} as const;
    const dye=rekey({...schemes[a.coating],dark:[34,46,48],paper:[235,230,211]},context.palette,{first:'second',second:'ink',third:'ground',dark:'ink',paper:'ground'});
    const step=Math.max(1,Math.round(unit));
    for(let y=0;y<size;y++){
      if(y%32===0){signal.throwIfAborted();await new Promise<void>(r=>setTimeout(r,0));}
      for(let x=0;x<size;x++){
        const p=(y*size+x)*4,id=identity[p],X=x/size,Y=y/size,xx=x/unit,yy=y/unit,nx=normal[p]/255-.5,ny=normal[p+1]/255-.5,nz=normal[p+2]/255;
        const tone=(color[p]*.2126+color[p+1]*.7152+color[p+2]*.0722)/255;
        const noise=hash(Math.floor(xx),Math.floor(yy),context.seed);
        let tilt=a.orientation==='horizontal'?nx:a.orientation==='vertical'?ny:a.orientation==='diagonal'?(nx+ny)*.707:Math.hypot(nx,ny)*1.5-.3;
        if(a.forming==='folded')tilt+=(Math.floor((xx+yy*.3)/55)%2?-.16:.16);
        if(a.forming==='wrinkled')tilt+=Math.sin(xx*.2+Math.sin(yy*.12))* .08;
        if(a.forming==='arched')tilt+=Math.sin(X*Math.PI)*.3;
        if(a.layer==='wedge')tilt+=(X+Y*.3)*.7;
        if(a.layer==='patches')tilt+=(hash(Math.floor(xx/65),Math.floor(yy/70),context.seed+id)-.5)*.45;
        if(a.layer==='laminate')tilt+=Math.sin((X-Y)*14)*.17;
        let phase=(tilt+nz*.22+id*.053)*mix(2.7,12,a.thickness);
        if(a.condition==='bubble'){
          const d=Math.hypot((X-.85)/.06,(Y-.83)/.045);
          if(d<1)phase+=Math.sqrt(1-d*d)*2.8;
        }
        const blend=.5+.5*Math.sin(phase),secondary=.5+.5*Math.sin(phase*1.17+2.3);
        const q=(y*size+Math.min(size-1,x+step))*4,r=(Math.min(size-1,y+step)*size+x)*4;
        const edge=id!==identity[q]||id!==identity[r]||Math.abs(color[p]-color[q])>40||Math.abs(normal[p]-normal[q])+Math.abs(normal[p+1]-normal[r+1])>60;
        const broad=Math.max(0,.6+nz*.25+nx*.4-ny*.35),spec=Math.pow(broad,a.finish==='polished'?19:5);
        const margin=Math.min(X,Y,1-X,1-Y);
        for(let c=0;c<3;c++){
          let film=mix(mix(dye.first[c],dye.second[c],blend),dye.third[c],secondary*.24);
          let body=film*(.44+tone*.54);
          if(a.substrate==='glass')body=mix(body,dye.paper[c],.12+tone*.08);
          if(a.substrate==='foil')body+=spec*38;
          if(a.substrate==='paper')body=mix(body,dye.paper[c],.15)+(noise-.5)*3;
          if(a.substrate==='black')body=mix(dye.dark[c],body,.75);
          body+=spec*(a.finish==='polished'?34:17);
          if(a.finish==='brushed')body+=Math.sin(xx*2.2+yy*.11)*spec*8;
          if(a.finish==='dimpled')body+=(noise-.5)*spec*16;
          if(edge&&a.seams==='overlap')body=mix(body,dye.second[c],.35);
          if(edge&&a.seams==='cut')body=mix(body,dye.dark[c],.55);
          if(edge&&a.seams==='lift')body=mix(body,dye.paper[c],.7);
          if(id===0)body=mix(dye.paper[c],body,.14);
          if(id===1)body=mix(dye.paper[c]*(.75+.25*tone),body,.3);
          if(edge&&id>0&&a.seams==='flush')body=mix(body,dye.dark[c],.28);
          if(a.mount==='window'&&margin<.045)body=dye.paper[c];
          if(a.mount==='clips'&&Math.min(X,1-X)<.06&&Math.min(Y,1-Y)<.022)body=dye.dark[c];
          if(a.mount==='strip'&&X>.935)body=mix(dye.paper[c],film,.3);
          if(a.condition==='peeling'&&X>.78&&Y>.82&&X+Y>1.7)body=mix(body,dye.paper[c],.6)+Math.sin((X+Y)*40)*8;
          if(a.condition==='test'&&Y>.93&&Y<.97&&X>.1&&X<.36){const which=Math.floor((X-.1)/.09);body=which===0?dye.first[c]:which===1?dye.second[c]:dye.third[c];if((X-.1)%.09>.075)body=dye.paper[c];}
          pixels[p+c]=body;
        }
        pixels[p+3]=255;
      }
    }
    signal.throwIfAborted();return{pixels,notes:[`${a.coating} interference on ${a.substrate}`,`${a.layer} coating with ${a.forming} forming`]};
  },
});
