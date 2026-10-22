import { canvas, stop, type Frame } from './organic';

// A drawn vocabulary, not a stamp font. Every scale has internal figures, and the large
// silhouettes survive because each little drawing is clipped to its host pigment region.
function inhabit(g:CanvasRenderingContext2D,kind:number,r:()=>number,large:boolean){
 const path=(p:number[],close=false,fill=false)=>{g.beginPath();g.moveTo(p[0],p[1]);for(let k=2;k<p.length;k+=2)g.lineTo(p[k],p[k+1]);if(close)g.closePath();fill?g.fill():g.stroke();};
 const eye=(x:number,y:number,rx:number,ry:number,solid=true)=>{g.beginPath();g.ellipse(x,y,rx,ry,(r()-.5)*.6,0,Math.PI*2);solid?g.fill():g.stroke();};
 const teeth=(x:number,y:number,n:number,w:number)=>{for(let j=0;j<n;j++){const xx=x+j*w/n;path([xx,y,xx+w/n*.15,y+.12,xx+w/n*.82,y+.10,xx+w/n,y],false);}};
 const village=(x:number,y:number,s:number)=>{g.save();g.translate(x,y);g.scale(s,s);path([-.4,.25,-.19,.19,-.07,.28,.14,.15,.36,.22]);for(let j=0;j<3;j++){const xx=-.34+j*.25,h=.2+(j%2)*.17;path([xx,.2,xx,-h,xx+.1,-h-.1,xx+.19,-h,xx+.19,.2]);eye(xx+.095,-h*.28,.025,.065,true);}g.restore();};
 g.lineCap='round';g.lineJoin='round';
 if(kind===0){ // a mask whose jaw contains smaller witnesses
  path([-.30,.48,-.36,.23,-.44,-.05,-.36,-.39,-.15,-.48,.15,-.45,.38,-.29,.40,.10,.24,.44,.06,.48],true);
  eye(-.18,-.12,.13,.115);eye(.18,-.14,.12,.14);path([-.04,.04,.02,-.015,.08,.10],true,true);
  path([-.25,.22,-.12,.20,.02,.25,.16,.18,.27,.22]);teeth(-.23,.23,5,.46);
  path([-.40,-.29,-.2,-.34,-.05,-.3,.1,-.37,.31,-.28]);
  if(large){village(0,-.34,.35);for(const side of [-1,1]){eye(side*.28,.10,.035,.055,false);eye(side*.28,.10,.009,.012);}}
 }else if(kind===1){ // larval profile: body is a procession of tiny faces
  g.beginPath();g.moveTo(-.33,.46);g.bezierCurveTo(.43,.38,-.39,.09,.23,-.11);g.bezierCurveTo(.55,-.35,.12,-.5,-.17,-.29);g.stroke();
  g.beginPath();g.moveTo(-.42,.36);g.bezierCurveTo(.20,.34,-.57,.02,.10,-.2);g.bezierCurveTo(.32,-.30,.02,-.39,-.17,-.29);g.stroke();eye(.07,-.30,.04,.045);eye(.19,-.28,.025,.035);
  for(let j=0;j<7;j++){const yy=-.10+j*.075,xx=Math.sin(j*1.1)*.13;path([xx-.11,yy,xx+.07,yy+.026,xx+.15,yy+.07]);if(j%2===0){path([xx-.1,yy,xx-.29,yy-.02,xx-.34,yy+.04]);}}
  if(large){eye(-.08,.17,.035,.032);eye(.035,.19,.025,.026);teeth(-.07,.26,3,.15);}
 }else if(kind===2){ // a settlement growing legs and facing the viewer
  village(0,-.04,1);path([-.36,.27,-.34,.40,-.45,.48]);path([.26,.25,.28,.42,.42,.48]);path([-.05,.27,.02,.39,-.04,.49]);
  for(let j=0;j<4;j++){const x=-.30+j*.17;path([x,-.43,x+.05,-.49,x+.08,-.42]);}
  if(large){eye(-.14,.31,.035,.025);eye(.11,.29,.03,.03);path([-.11,.39,.10,.38]);}
 }else if(kind===3){ // a bird/fish/beast, with a smaller animal in its flank
  path([-.43,.14,-.26,-.04,-.35,-.29,-.11,-.17,.08,-.37,.26,-.24,.39,-.04,.48,.02,.28,.07,.18,.31,-.05,.34,-.25,.23],true);
  eye(.23,-.11,.045,.05);path([-.18,.28,-.27,.44,-.40,.47]);path([.05,.33,.03,.45,.17,.48]);
  path([-.22,-.01,-.05,.10,.15,.06]);for(let j=0;j<4;j++)path([-.15+j*.08,.11,-.19+j*.08,.23]);
  if(large){eye(-.05,.04,.028,.032);path([-.09,.13,.02,.16,.08,.12]);path([-.16,-.12,-.13,-.03,-.02,-.10,.06,-.04]);}
 }else if(kind===4){ // a tooth cliff containing doorways and a miniature ground line
  path([-.39,-.43,-.15,-.38,.02,-.45,.19,-.37,.36,-.41,.33,.21,.22,.46,.05,.19,-.10,.45,-.25,.22,-.40,.38],true);
  for(let j=0;j<3;j++){const x=-.28+j*.2;path([x,-.30,x+.015,-.02,x+.055,.08,x+.08,-.30]);eye(x+.04,-.17,.021,.043);}
  path([-.34,.12,-.18,.04,.04,.12,.26,.05]);if(large)village(0,-.34,.45);
 }else if(kind===5){ // two narrow people share an organ / face
  for(const side of [-1,1]){eye(side*.16,-.29,.09,.13,false);eye(side*.16-.025,-.31,.017,.025);eye(side*.16+.025,-.31,.012,.019);path([side*.16,-.16,side*.26,.12,side*.16,.25,side*.25,.47]);path([side*.16,-.10,side*.04,.11,side*.08,.42]);path([side*.25,.05,side*.40,-.03,side*.44,.11]);}
  eye(0,.13,.07,.085,false);path([-.035,.13,.035,.13]);
 }else{ // open eyes, roots and a small enclosed horizon
  eye(0,-.07,.42,.22,false);eye(0,-.07,.14,.17,false);eye(0,-.07,.055,.07,true);
  for(let j=0;j<5;j++){const x=-.33+j*.16;path([x,.12,x+.02,.26,x-.06,.43]);path([x,.26,x+.14,.39]);}
  path([-.31,-.28,-.23,-.43,-.13,-.34,.03,-.45,.14,-.33,.28,-.41,.35,-.24]);if(large)village(0,.33,.3);
 }
}

export async function micrograph(f:Frame,imagery:string,hierarchy:number){
 const s=f.s,hosts=f.h.getImageData(0,0,f.s,f.s).data,source=f.d.getImageData(0,0,s,s),base=new Uint8ClampedArray(source.data),out=source.data,r=f.ctx.random;
 const hex=(h:string)=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];
 const ink=hex(f.p.ink),paper=hex(f.p.paper),accent=hex(f.p.accent),tone=new Float32Array(s*s);
 // Broad pigment masses hold the image at a distance. Fine imagery supplies the middle tones.
 for(let y=0;y<s;y++){if(y%96===0){stop(f.signal);await new Promise<void>(resolve=>setTimeout(resolve,0));}for(let x=0;x<s;x++){const i=(y*s+x)*4,L=(base[i]*.23+base[i+1]*.62+base[i+2]*.15)/255;tone[y*s+x]=L;
  const dark=L<.30?.98:L<.47?.80:L<.62?.49:L<.76?.12:0;
  let edge=0;if(x>2&&x<s-3&&y>2&&y<s-3){for(const off of [-8,8,-s*8,s*8])edge=Math.max(edge,Math.abs(base[i]-base[i+off])+Math.abs(base[i+1]-base[i+off+1])+Math.abs(base[i+2]-base[i+off+2]));}
  for(let k=0;k<3;k++){const ground=paper[k]*(1-dark)+ink[k]*dark;out[i+k]=ground*.90+base[i+k]*.10;if(edge>110&&L>.40)out[i+k]=out[i+k]*.30+ink[k]*.70;}out[i+3]=255;
 }}
 const tile=canvas(128),g=tile.getContext('2d',{willReadFrequently:true})!;
 const occupied=new Uint8Array(Math.ceil(s/8)**2),grid=Math.ceil(s/8);
 const families:Record<string,number[]>={masks:[0,0,0,5,4,6,3],vermin:[1,1,3,3,6,0,4],settlements:[2,2,2,4,5,0,6],choir:[0,1,2,3,4,5,6]};
 const kinds=families[imagery]??families.choir;
 const anchors:{x:number;y:number;scale:number;index:number}[]=[];
 const bridge=canvas(s),bg=bridge.getContext('2d',{willReadFrequently:true})!;
 const scales=[{size:58+hierarchy*25,count:240,tier:3},{size:22+hierarchy*9,count:1050,tier:2},{size:8+hierarchy*4,count:1700,tier:1}];
 for(const layer of scales){for(let n=0;n<layer.count;n++){if(n%70===0){stop(f.signal);await new Promise<void>(resolve=>setTimeout(resolve,0));}
  let x=Math.floor((.025+r()*.95)*s),y=Math.floor((.045+r()*.88)*s);
  // The small population lives inside/along the larger inhabitants; the next level does
  // not simply sprinkle another equally spaced field over the whole image.
  let parent:typeof anchors[number]|undefined;
  if(layer.tier<3&&anchors.length&&r()<.66){parent=anchors[Math.floor(r()*anchors.length)];x=Math.round(parent.x+(r()-.5)*parent.scale*.88);y=Math.round(parent.y+(r()-.5)*parent.scale*.88);}
  if(x<3||x>=s-3||y<3||y>=s-3)continue;
  const i=(y*s+x)*4,L=tone[y*s+x],gx=Math.floor(x/8),gy=Math.floor(y/8);
  if(hosts[i]<24)continue;if(hosts[i]<180&&r()>.43)continue;
  const paperDistance=(Math.abs(base[i]-paper[0])+Math.abs(base[i+1]-paper[1])+Math.abs(base[i+2]-paper[2]))/3;
  if(paperDistance<8&&hosts[i]<180)continue;
  const quiet=(Math.sin(x/s*11+f.ctx.seed*.001)+Math.sin(y/s*13)+Math.sin((x+y)/s*9))*.17+.55;
  if(!parent&&r()>quiet)continue;
  if(layer.tier<3&&(out[i]*.23+out[i+1]*.62+out[i+2]*.15)<70)continue;

  // Size varies in the source field; broad clear planes accept a large inhabitant, narrow
  // shapes get small limbs and eyes instead. Clusters never rely on a repeating glyph grid.
  let scale=layer.size*(.72+r()*.52)*s/720;const diff=(xx:number,yy:number)=>{const q=(Math.max(0,Math.min(s-1,yy))*s+Math.max(0,Math.min(s-1,xx)))*4;return Math.abs(base[q]-base[i])+Math.abs(base[q+1]-base[i+1])+Math.abs(base[q+2]-base[i+2]);};
  if(layer.tier===3&&Math.max(diff(x+Math.floor(scale*.4),y),diff(x-Math.floor(scale*.4),y),diff(x,y+Math.floor(scale*.4)),diff(x,y-Math.floor(scale*.4)))>180)scale*=.62;
  if(layer.tier>1&&(occupied[gy*grid+gx]&(1<<layer.tier)))continue;
  if(L<.30&&layer.tier===1&&r()<.74)continue;
  const rr=Math.max(1,Math.floor(scale/22));if(layer.tier>1)for(let yy=Math.max(0,gy-rr);yy<=Math.min(grid-1,gy+rr);yy++)for(let xx=Math.max(0,gx-rr);xx<=Math.min(grid-1,gx+rr);xx++)occupied[yy*grid+xx]|=(1<<layer.tier);
  
  if(layer.tier===3){
   let near:typeof anchors[number]|undefined,best=s*.24;
   for(const a of anchors){const distance=Math.hypot(a.x-x,a.y-y),q=a.index,delta=(Math.abs(base[q]-base[i])+Math.abs(base[q+1]-base[i+1])+Math.abs(base[q+2]-base[i+2]))/3;if(delta<24&&distance<best&&distance>scale*.5){best=distance;near=a;}}
   if(near){
    const ax=near.x,ay=near.y,dist=Math.hypot(x-ax,y-ay),vx=(x-ax)/dist,vy=(y-ay)/dist,sx=ax+vx*near.scale*.37,sy=ay+vy*near.scale*.37,ex=x-vx*scale*.35,ey=y-vy*scale*.35;
    const bend=(r()-.5)*dist*.3,minX=Math.max(0,Math.floor(Math.min(sx,ex)-Math.abs(bend)-12)),minY=Math.max(0,Math.floor(Math.min(sy,ey)-Math.abs(bend)-12)),maxX=Math.min(s,Math.ceil(Math.max(sx,ex)+Math.abs(bend)+12)),maxY=Math.min(s,Math.ceil(Math.max(sy,ey)+Math.abs(bend)+12));
    bg.clearRect(minX,minY,maxX-minX,maxY-minY);bg.lineCap='round';bg.lineJoin='round';const width=(4+r()*4)*s/720;
    const curve=()=>{bg.beginPath();bg.moveTo(sx,sy);bg.bezierCurveTo(sx+(ex-sx)*.3-vy*bend,sy+(ey-sy)*.3+vx*bend,sx+(ex-sx)*.7+vy*bend,sy+(ey-sy)*.7-vx*bend,ex,ey);};
    curve();bg.strokeStyle=L<.45?f.p.paper:f.p.ink;bg.lineWidth=width;bg.stroke();curve();bg.strokeStyle=L<.45?f.p.ink:f.p.paper;bg.lineWidth=width*.46;bg.stroke();
    for(let j=1;j<10;j++){const z=j/10,m=1-z,cx=m*m*m*sx+3*m*m*z*(sx+(ex-sx)*.3-vy*bend)+3*m*z*z*(sx+(ex-sx)*.7+vy*bend)+z*z*z*ex,cy=m*m*m*sy+3*m*m*z*(sy+(ey-sy)*.3+vx*bend)+3*m*z*z*(sy+(ey-sy)*.7-vx*bend)+z*z*z*ey;bg.beginPath();bg.moveTo(cx-vy*width*.7,cy+vx*width*.7);bg.lineTo(cx+vy*width*.7,cy-vx*width*.7);bg.strokeStyle=L<.45?f.p.paper:f.p.ink;bg.lineWidth=.8*s/720;bg.stroke();}
    const b=bg.getImageData(minX,minY,maxX-minX,maxY-minY).data;
    for(let yy=minY;yy<maxY;yy++)for(let xx=minX;xx<maxX;xx++){const bi=((yy-minY)*(maxX-minX)+xx-minX)*4,q=(yy*s+xx)*4,delta=(Math.abs(base[q]-base[i])+Math.abs(base[q+1]-base[i+1])+Math.abs(base[q+2]-base[i+2]))/3,alpha=b[bi+3]/255*Math.max(0,Math.min(1,(40-delta)/20))*.70*hosts[q]/255;if(alpha<=0)continue;for(let k=0;k<3;k++)out[q+k]=out[q+k]*(1-alpha)+b[bi+k]*alpha;}
   }
   anchors.push({x,y,scale,index:i});
  }

  const offset=3,dx=tone[y*s+Math.min(s-1,x+offset)]-tone[y*s+Math.max(0,x-offset)],dy=tone[Math.min(s-1,y+offset)*s+x]-tone[Math.max(0,y-offset)*s+x];
  let angle=Math.abs(dx)+Math.abs(dy)>.09?Math.atan2(dy,dx)+Math.PI/2:(r()-.5)*1.0;
  if(parent&&r()<.7)angle=Math.atan2(y-parent.y,x-parent.x)+Math.PI/2+(r()-.5)*.4;
  if(layer.tier===1)angle+=(r()-.5)*.8;
  g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,128,128);g.translate(64,64);g.rotate(angle);g.scale(102,102);g.transform(1,(r()-.5)*.22,(r()-.5)*.28,.82+r()*.35,0,0);g.strokeStyle=g.fillStyle='#000';g.lineWidth=layer.tier===3?.020:layer.tier===2?.026:.048;
  inhabit(g,kinds[Math.floor(r()*kinds.length)],r,layer.tier===3);
  const glyph=g.getImageData(0,0,128,128).data,size=Math.ceil(scale*1.25),half=Math.floor(size/2),col=L<.56?paper:(n%11===0?accent:ink);
  const strength=(layer.tier===3?.95:layer.tier===2?.67:.40)*(L>.40&&L<.66?.68:1);
  for(let yy=0;yy<size;yy++){const Y=y+yy-half;if(Y<0||Y>=s)continue;for(let xx=0;xx<size;xx++){const X=x+xx-half;if(X<0||X>=s)continue;const ga=glyph[(Math.min(127,Math.floor(yy/size*128))*128+Math.min(127,Math.floor(xx/size*128)))*4+3]/255;if(ga<.02)continue;const q=(Y*s+X)*4;
    const delta=(Math.abs(base[q]-base[i])+Math.abs(base[q+1]-base[i+1])+Math.abs(base[q+2]-base[i+2]))/3,mask=Math.max(0,Math.min(1,(44-delta)/23));
    const a=ga*mask*strength*(L<.32?.32:1)*hosts[q]/255;for(let k=0;k<3;k++)out[q+k]=out[q+k]*(1-a)+col[k]*a;
  }}
 }}
 f.d.putImageData(source,0,0);stop(f.signal);
}
