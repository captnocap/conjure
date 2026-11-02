import {choice,clamp01,defineLook,mix,rekey,score} from '@conjure/kit';
const hash=(x:number,y:number,s:number)=>{let h=Math.imul(x|0,374761393)^Math.imul(y|0,668265263)^s;h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967296;};
export default defineLook({
 questions:{
  plate:choice('How is the image prepared for the relief plate?',{solid:'Broad solid shapes with three tone levels.',screen:'A fine relief dot screen carries the shading.',line:'Parallel relief rules carry the middle tones.',cutout:'Bold silhouettes retain only the strongest interior detail.'}),
  impression:score('How deeply is the plate pressed into the paper?', ['A light kiss impression','A slight paper indentation','A clear pressed edge','Deep cotton-paper debossing','A very deep sculpted impression']),
  edge:choice('How does ink sit against the pressed edge?',{clean:'Clean edges with little squeeze-out.',squeeze:'A dark rim of squeezed ink.',dry:'A slightly broken dry edge.',soft:'Soft rounded ink edges on the cotton.'}),
  ink:choice('Which ink colours print the image? Designed colours follow the palette.',{black:'Charcoal ink.',navy:'Deep navy ink.',red:'Warm brick red ink.',duet:'Navy forms with a terracotta tint plate.'}),
  paper:choice('What stock receives the impression?',{cotton:'Thick warm cotton paper.',white:'Heavy white card.',kraft:'Buff kraft board.',grey:'Pale grey handmade stock.'}),
  tooth:choice('What surface texture is pressed into the sheet?',{smooth:'A smooth polished sheet.',felt:'Fine irregular felt texture.',woven:'A light woven paper texture.',fleck:'Scattered small fibres in the stock.'}),
  rolling:choice('How evenly is the plate inked?',{even:'Even full ink coverage.',dry:'A dry roller leaves small pinholes.',stripe:'Very faint bands from the roller.',fade:'The ink film grows lighter toward the lower edge.'}),
  register:choice('How does the coloured impression align with its deboss?',{exact:'Ink and paper impression coincide.',right:'Ink is offset very slightly right.',down:'Ink sits a little below the indentation.',diagonal:'A slight diagonal offset reveals the pale pressed edge.'}),
  light:choice('Which way does light rake across the pressed paper?',{left:'Light from upper left.',right:'Light from upper right.',top:'Light from directly above the sheet.',low:'Low side light exaggerates the paper relief.'}),
  finish:choice('What finishing mark belongs to the impression?',{plain:'A plain sheet with open margins.',rule:'A thin inset printer rule.',crop:'Short crop marks surround the image.',proof:'Small ink-density swatches sit at the foot.'}),
 },
 async apply(capture,a,context,signal){
  signal.throwIfAborted();const{size,color,normal,identity}=capture,u=size/720,out=new Uint8ClampedArray(color.length),px=Math.max(1,Math.round(u));
  const inks={black:[38,39,34],navy:[28,50,73],red:[151,56,43],duet:[31,48,66]} as const,papers={cotton:[239,227,205],white:[247,245,234],kraft:[202,170,119],grey:[213,216,206]} as const;
  const d=rekey({ink:inks[a.ink],paper:papers[a.paper],second:[172,87,60]},context.palette,{ink:'ink',paper:'ground',second:'second'});
  const field=(x:number,y:number)=>{const p=(Math.max(0,Math.min(size-1,y))*size+Math.max(0,Math.min(size-1,x)))*4;if(identity[p]===0)return 0;let t=1-(color[p]*.2126+color[p+1]*.7152+color[p+2]*.0722)/255;if(identity[p]===1)t*=.45;else t=.1+Math.pow(t,.88)*.9;return clamp01(a.plate==='cutout'?(t>.32?.88:.1):t);};
  for(let y=0;y<size;y++){
   if(y%32===0){signal.throwIfAborted();await new Promise<void>(r=>setTimeout(r,0));}
   for(let x=0;x<size;x++){
    const p=(y*size+x)*4,X=x/size,Y=y/size,xx=x/u,yy=y/u,n=hash(Math.floor(xx*1.5),Math.floor(yy*1.5),context.seed),id=identity[p];
    const dx=a.register==='right'||a.register==='diagonal'?px*2:0,dy=a.register==='down'||a.register==='diagonal'?px*2:0;
    const tone=field(x-dx,y-dy),here=field(x,y),left=field(x-px*2,y),right=field(x+px*2,y),up=field(x,y-px*2),down=field(x,y+px*2);
    const edge=Math.max(Math.abs(here-left),Math.abs(here-right),Math.abs(here-up),Math.abs(here-down));
    let ink=a.plate==='solid'?Math.round(tone*3)/3:tone;
    if(a.plate==='screen'){const cx=((xx/4)%1)-.5,cy=((yy/4)%1)-.5;ink=Math.hypot(cx,cy)<Math.sqrt(tone)*.63?Math.max(.3,tone):tone*.16;}
    if(a.plate==='line')ink=Math.abs(Math.sin((xx+yy*.3)*1.25))<tone*.85?Math.max(.8,tone):tone*.18;
    if(a.edge==='squeeze')ink+=edge*.6;if(a.edge==='dry'&&edge>.08)ink*=.4+n*.6;if(a.edge==='soft')ink=mix(ink,(here+left+right+up+down)/5,.3);
    if(a.rolling==='dry'&&n>.87)ink*=.4;if(a.rolling==='stripe')ink*=.85+.15*Math.sin(yy*.025)**2;if(a.rolling==='fade')ink*=1-Y*.35;
    const light=a.light==='left'?(left-right+up-down)*.7:a.light==='right'?(right-left+up-down)*.7:a.light==='top'?up-down:(left-right)*1.4;
    let relief=light*mix(2,48,a.impression)-edge*mix(0,9,a.impression);
    const normalEdge=Math.abs(normal[p]-normal[(y*size+Math.min(size-1,x+px))*4]);if(id>1&&normalEdge>30){relief-=a.impression*3;ink=Math.max(ink,.24);}
    let texture=(n-.5)*(a.tooth==='smooth'?1:a.tooth==='felt'?9:5);
    if(a.tooth==='woven')texture+=2*Math.sin(xx*1.7)+2*Math.sin(yy*1.7);
    if(a.tooth==='fleck'&&hash(Math.floor(xx/3),Math.floor(yy*2),context.seed+57)>.96)texture-=12;
    const margin=Math.min(X,Y,1-X,1-Y);
    if(margin<.045){ink=0;relief=0;}
    if(a.finish==='rule'&&Math.abs(margin-.04)<.0014)ink=.7;
    if(a.finish==='crop'&&((X>.025&&X<.06&&(Math.abs(Y-.07)<.0015||Math.abs(Y-.93)<.0015))||(Y>.025&&Y<.06&&(Math.abs(X-.07)<.0015||Math.abs(X-.93)<.0015))))ink=.8;
    if(a.finish==='proof'&&Y>.95&&Y<.973&&X>.25&&X<.55)ink=Math.floor((X-.25)/.06)/5;
    for(let c=0;c<3;c++){const paper=d.paper[c]+texture+relief,base=a.ink==='duet'?mix(paper,d.second[c],tone*.25):paper;out[p+c]=mix(base,d.ink[c]+relief*.2,clamp01(ink));}out[p+3]=255;
   }
  }signal.throwIfAborted();return{pixels:out,notes:[`${a.plate} relief plate with pressed ${a.paper} paper`,`${a.rolling} ink film and ${a.register} registration`]};
 }
});
