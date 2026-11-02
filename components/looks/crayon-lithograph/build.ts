import {choice,clamp01,defineLook,mix,rekey,score} from '@conjure/kit';
const noise=(x:number,y:number,seed:number)=>{let h=Math.imul(x|0,374761393)^Math.imul(y|0,668265263)^seed;h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967296;};
export default defineLook({
 questions:{
  crayon:choice('What lithographic crayon made the drawing?',{hard:'A hard sharp crayon leaves small broken marks.',soft:'Soft greasy crayon makes dense velvety marks.',broad:'The crayon side leaves broad rubbed strokes.',stump:'A rubbing stump blends the crayon into cloudy tones.'}),
  stone:choice('What is the lithographic stone grain?',{fine:'Closely ground stone gives a fine tooth.',coarse:'A coarse ground breaks the drawing into larger grains.',uneven:'Uneven patches of tooth interrupt the marks.',smooth:'Smooth stone produces a soft, tight texture.'}),
  pressure:score('How firmly is the crayon pressed?', ['Barely touching the stone','Light broken drawing','Steady middle pressure','Firm dense marks','A heavily worked rich drawing']),
  strokes:choice('Which way do the rubbed strokes run?',{rising:'Diagonal strokes rise to the right.',falling:'Diagonal strokes fall to the right.',crossed:'Two crossing directions model the forms.',curved:'Curved rubbings sweep around the composition.'}),
  contour:choice('How are the contours drawn?',{crayon:'Broken dark crayon contours.',wash:'Soft wash-like edges.',scrape:'A fine scraped light line opens dark edges.',double:'A second loose contour sits beside the first.'}),
  tint:choice('What tinted stone accompanies the drawing? Designed colours follow the palette.',{plain:'A single charcoal-black impression.',ochre:'Ochre tint beneath black crayon.',green:'Cool green tint beneath the dark drawing.',rose:'A pale rose tint with a brown-black drawing.'}),
  register:choice('How is the tint stone registered?',{exact:'Tint and drawing meet precisely.',right:'The tint slips slightly to the right.',down:'The tint sits slightly low.',halo:'A narrow untinted halo outlines the drawing.'}),
  paper:choice('What paper receives the crayon marks?',{white:'Clean white paper.',cream:'Soft warm cream paper.',fleck:'Cream paper with dark fibre flecks.',laid:'Paper carrying fine horizontal laid lines.'}),
  handling:choice('What traces of handling remain?',{clean:'A clean finished impression.',rubbed:'Small rubbed patches lighten the dark drawing.',smudge:'A light greasy thumb-smudge sits at the lower edge.',proof:'A short row of crayon test marks lies below the image.'}),
  margin:choice('How does the image meet the paper edge?',{open:'A broad quiet unprinted border.',tight:'A narrow paper border.',rough:'A rough rubbed edge fades unevenly.',bleed:'Crayon tone continues to the edge.'}),
 },
 async apply(capture,a,context,signal){
  signal.throwIfAborted();const{size,color,normal,identity}=capture,u=size/720,out=new Uint8ClampedArray(color.length),step=Math.max(1,Math.round(u));
  const paper={white:[245,244,234],cream:[236,226,204],fleck:[230,219,193],laid:[239,233,213]} as const;
  const tint={plain:[128,124,111],ochre:[174,140,62],green:[92,125,103],rose:[177,116,111]} as const;
  const p=rekey({paper:paper[a.paper],ink:a.tint==='rose'?[63,43,33]:[35,38,35],tint:tint[a.tint]},context.palette,{paper:'ground',ink:'ink',tint:'second'});
  for(let y=0;y<size;y++){
   if(y%32===0){signal.throwIfAborted();await new Promise<void>(r=>setTimeout(r,0));}
   for(let x=0;x<size;x++){
    const k=(y*size+x)*4,X=x/size,Y=y/size,xx=x/u,yy=y/u,id=identity[k];
    const q=(y*size+Math.min(size-1,x+step))*4,r=(Math.min(size-1,y+step)*size+x)*4;
    const edge=id!==identity[q]||id!==identity[r]||Math.abs(normal[k]-normal[q])+Math.abs(normal[k+1]-normal[q+1])+Math.abs(normal[k+2]-normal[q+2])>55;
    const lum=(.2126*color[k]+.7152*color[k+1]+.0722*color[k+2])/255;
    const pitch=a.stone==='fine'?1:a.stone==='coarse'?2.8:a.stone==='uneven'?1.7:.65;
    const grain=noise(Math.floor(xx/pitch),Math.floor(yy/pitch),context.seed),fine=noise(Math.floor(xx*1.7),Math.floor(yy*1.7),context.seed+11);
    const angle=a.strokes==='rising'?xx+yy:a.strokes==='falling'?xx-yy:a.strokes==='curved'?Math.hypot(xx-300,yy-400)*1.3:Math.min(Math.abs(Math.sin((xx+yy)*.12)),Math.abs(Math.sin((xx-yy)*.12)))*24;
    const streak=.5+.5*Math.sin(angle*(a.crayon==='broad'?.22:.72));
    let dark=clamp01((1-lum)*mix(.65,1.5,a.pressure));
    if(a.stone==='uneven')dark*=.78+.22*noise(Math.floor(xx/21),Math.floor(yy/21),context.seed+21);
    const softness=a.crayon==='soft'?.63:a.crayon==='stump'?.82:a.crayon==='broad'?.35:.15;
    let coverage=dark*softness+(grain<dark*(.65+.35*streak)?dark*(1-softness):0);
    if(a.crayon==='stump')coverage*=.9+.1*Math.sin(xx*.019+Math.cos(yy*.015));
    if(edge&&id>0){if(a.contour==='crayon')coverage=Math.max(coverage,.68+grain*.2);if(a.contour==='scrape')coverage*=.35;if(a.contour==='double')coverage=Math.max(coverage,.75);}
    if(a.contour==='double'){const prev=(y*size+Math.max(0,x-step*3))*4;if(identity[prev]!==id&&id>0)coverage=Math.max(coverage,.48);}
    if(a.contour==='wash')coverage=mix(coverage,dark,.27);
    if(id===0)coverage*=.025;else if(id===1)coverage*=.64;
    const tx=Math.max(0,Math.min(size-1,x-(a.register==='right'?step*3:0))),ty=Math.max(0,Math.min(size-1,y-(a.register==='down'?step*3:0))),tk=(ty*size+tx)*4;
    let tintStrength=a.tint==='plain'?.04:clamp01((1-(color[tk]+color[tk+1]+color[tk+2])/765)*.48+.08);
    if(identity[tk]===0)tintStrength*=.05;if(a.register==='halo'&&edge)tintStrength=0;
    if(a.handling==='rubbed')coverage*=.78+.22*Math.sin(xx*.041+Math.sin(yy*.03))**2;
    if(a.handling==='smudge')coverage+=.18*Math.exp(-((X-.78)**2+(Y-.91)**2)*900)*(.55+.45*streak);
    if(a.handling==='proof'&&Y>.935&&Y<.96&&X>.13&&X<.38)coverage=Math.floor((X-.13)/.05)/5;
    const margin=Math.min(X,Y,1-X,1-Y),bound=a.margin==='open'?.065:a.margin==='tight'?.024:a.margin==='rough'?.025+.012*Math.sin(xx*.09)*Math.cos(yy*.12):0;
    for(let c=0;c<3;c++){let sheet=p.paper[c]+(fine-.5)*(a.paper==='fleck'?11:2);if(a.paper==='laid')sheet+=2*Math.sin(yy*1.5);let value=mix(mix(sheet,p.tint[c],tintStrength),p.ink[c],clamp01(coverage));if(margin<bound)value=sheet;out[k+c]=value;}out[k+3]=255;
   }
  }signal.throwIfAborted();return{pixels:out,notes:[`${a.crayon} crayon on ${a.stone} stone`,`${a.tint} impression with ${a.strokes} rubbing`]};
 }
});
