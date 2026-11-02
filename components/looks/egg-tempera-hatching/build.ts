import {choice,clamp01,defineLook,mix,rekey,score} from '@conjure/kit';
const hash=(x:number,y:number,s:number)=>{let h=Math.imul(x|0,374761393)^Math.imul(y|0,668265263)^s;h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967296;};
export default defineLook({
 questions:{
  strokes:choice('How are the small tempera strokes arranged?',{parallel:'Fine parallel strokes.',crossed:'Two crossed hatch layers.',contour:'Short hatches turn with the form.',feather:'Tapering feathered strokes overlap.'}),
  fineness:score('How fine is the brushwork?',['Broad individual strokes','Small separate hatches','Fine layered hatching','Very fine close brushwork','Minute tightly packed marks']),
  pigments:choice('What pigment family models the forms? Designed colours follow the palette.',{earth:'Warm umber and yellow ochre.',green:'Green earth under warm flesh-coloured passages.',ultramarine:'Deep ultramarine and warm pale ochre.',vermilion:'Red-orange pigment and cool blue-grey.'}),
  ground:choice('What preparation lies beneath the paint?',{gesso:'Smooth ivory gesso.',warm:'A warm pale ochre preparation.',cool:'A cool grey prepared panel.',linen:'A lightly textured linen-faced panel.'}),
  coats:choice('How are the paint layers accumulated?',{thin:'A thin first colour layer leaves the ground visible.',three:'Three translucent layers build the middle tones.',dense:'Many close layers create luminous dense colour.',broken:'Uneven layers retain small flecks of the ground.'}),
  lights:choice('How are the lights picked out?',{hatched:'Pale hatches follow illuminated planes.',dots:'Tiny pale stipples mark the highlights.',smooth:'A smooth thin final light layer.',reserve:'The lightest areas remain exposed preparation.'}),
  drawing:choice('How much preparatory drawing remains visible?',{none:'The drawing is covered.',brown:'A fine brown contour remains.',dark:'Clear dark contours articulate each form.',incised:'Pale incised guide lines border the forms.'}),
  handling:choice('How do the brushmarks end?',{neat:'Neat fine pointed ends.',split:'Slightly split brush tips.',dry:'Dry broken strokes.',soft:'Softly merged overlapping ends.'}),
  finish:choice('How is the surface finished?',{matte:'Quiet matte paint.',wax:'A softly waxed sheen.',polished:'A subtly polished panel.',aged:'A fine irregular craquelure crosses the dry surface.'}),
  border:choice('How is the panel framed within the sheet?',{plain:'An open pale margin.',gold:'A narrow muted gold-painted border.',red:'A thin red painted rule.',full:'Paint fills the entire field.'}),
 },
 async apply(capture,a,context,signal){
  signal.throwIfAborted();const{size,color,normal,identity}=capture,u=size/720,out=new Uint8ClampedArray(color.length),step=Math.max(1,Math.round(u));
  const pigments={earth:[[83,55,32],[186,139,65]],green:[[73,91,61],[196,145,112]],ultramarine:[[38,58,132],[206,169,102]],vermilion:[[165,59,39],[113,139,153]]}as const;
  const grounds={gesso:[243,236,216],warm:[224,205,165],cool:[211,217,213],linen:[234,224,197]}as const;
  const d=rekey({ink:pigments[a.pigments][0],second:pigments[a.pigments][1],paper:grounds[a.ground],border:[175,142,67]},context.palette,{ink:'ink',second:'second',paper:'ground',border:'second'});
  const at=(x:number,y:number)=>(Math.max(0,Math.min(size-1,y))*size+Math.max(0,Math.min(size-1,x)))*4;
  for(let y=0;y<size;y++){
   if(y%32===0){signal.throwIfAborted();await new Promise<void>(r=>setTimeout(r,0));}
   for(let x=0;x<size;x++){
    const p=(y*size+x)*4,id=identity[p],xx=x/u,yy=y/u,X=x/size,Y=y/size,n=hash(Math.floor(xx*1.8),Math.floor(yy*1.8),context.seed);
    const lum=(color[p]*.2126+color[p+1]*.7152+color[p+2]*.0722)/255,dark=clamp01(1-lum),spacing=mix(4.4,1.4,a.fineness);
    const angle=a.strokes==='contour'?Math.atan2(normal[p+1]-128,normal[p]-128):a.strokes==='feather'?.65+Math.sin(yy*.045)*.3:.55;
    const along=xx*Math.cos(angle)+yy*Math.sin(angle),across=-xx*Math.sin(angle)+yy*Math.cos(angle);
    const phase=Math.abs(Math.sin(across/spacing*Math.PI)),other=Math.abs(Math.sin((xx*.63+yy*.78)/spacing*Math.PI));
    const segment=hash(Math.floor(along/13),Math.floor(across/spacing),context.seed+17),end=(along/13-Math.floor(along/13));
    let hatch=clamp01((dark*.82+.17-phase)*5);
    if(a.strokes==='crossed')hatch=Math.max(hatch,clamp01((dark*.75-.13-other)*5));
    if(a.strokes==='feather')hatch*=Math.sin(end*Math.PI)*.6+.4;
    if(a.handling==='split')hatch*=phase<.055?.4:1;if(a.handling==='dry')hatch*=n>.32?1:.25;if(a.handling==='neat')hatch*=.65+.35*Math.sin(end*Math.PI);if(a.handling==='soft')hatch=mix(hatch,dark,.3);
    const coats=a.coats==='thin'?.52:a.coats==='three'?.75:a.coats==='dense'?.94:.75*(n>.16?1:.3);
    let coverage=clamp01((dark*.55+hatch*.4+.13)*coats),highlight=0;
    if(a.lights==='hatched')highlight=(1-dark)*clamp01((.13-phase)*8)*.22;
    if(a.lights==='dots')highlight=n>.92?(1-dark)*.26:0;
    if(a.lights==='smooth')highlight=(1-dark)**3*.2;
    if(a.lights==='reserve'&&lum>.72)coverage*=.6;
    if(id>0)coverage=Math.max(.14,coverage);
    const r=at(x+step,y),b=at(x,y+step),edge=id!==identity[r]||id!==identity[b]||Math.abs(normal[p]-normal[r])+Math.abs(normal[p+1]-normal[r+1])>65;
    if(edge&&id>0){if(a.drawing==='none')coverage=Math.max(coverage,.24);if(a.drawing==='brown')coverage=Math.max(coverage,.68);if(a.drawing==='dark')coverage=.96;if(a.drawing==='incised')coverage*=.2;}
    const crack=Math.abs(Math.sin(xx*.071+Math.sin(yy*.04)*2)+Math.sin(yy*.061+Math.sin(xx*.027)))<.023;
    if(a.finish==='aged'&&crack)coverage=clamp01(coverage+.18);
    let sheen=a.finish==='wax'?Math.max(0,(normal[p+2]/255-.78))*14:a.finish==='polished'?Math.max(0,(normal[p+2]/255-.86))*32:0;
    if(id===0){coverage*=.035;highlight=0;sheen=0;}if(id===1)coverage*=.92;
    const margin=Math.min(X,Y,1-X,1-Y);let frame=false;if(a.border!=='full'&&margin<.045){coverage=0;highlight=0;sheen=0;}
    if(a.border==='gold'&&margin>.035&&margin<.041)frame=true;if(a.border==='red'&&Math.abs(margin-.04)<.0016)frame=true;
    const hue=clamp01((color[p]-color[p+2])/170+.45),texture=a.ground==='linen'?Math.sin(xx*2.8)*Math.sin(yy*2.8)*2:(n-.5)*1.5;
    for(let c=0;c<3;c++){let pigment=mix(d.ink[c],d.second[c],hue);if(a.drawing==='dark'&&edge)pigment=mix(pigment,d.ink[c]*.55,.65);const painted=mix(d.paper[c]+texture,pigment,coverage);out[p+c]=frame?(a.border==='gold'?d.border[c]:d.ink[c]):mix(painted,248,highlight)+sheen+(segment-.5)*1.4;}out[p+3]=255;
   }
  }signal.throwIfAborted();return{pixels:out,notes:[`${a.strokes} egg-tempera hatching in ${a.coats} layers`,`${a.ground} preparation with ${a.lights} lights`]};
 }
});
