import { choice, defineLook, score } from '@conjure/kit';
import { detail, finish, glyphs, inset, line, prepare } from './studio';
import { micrograph } from './micro';
export default defineLook({questions:{
 micrography:choice('Which small inhabitants are drawn into the larger forms?',{watchers:'Architectural masks contain eyes, tiny chapels and stairwells in their faces.',stairbeasts:'Ribbed corridor beasts carry inhabited steps along their bodies.',livingcity:'Bent little towers grow faces, claws and smaller interior worlds.',mixed:'Masks, corridor beasts, living towers and nested passages interweave.'}),
 hierarchy:score('How abruptly does one drawing open into smaller drawings?',['Closely related rooms, creatures and micro glyphs','Three clear scales of inhabited drawing','Large architectural beasts descend into much smaller faces and minute corridors']),
 house:choice('What shape has the cutaway nursery taken?',{gable:'A looming gabled dollhouse with narrow side rooms.',cabinet:'A tall hinged cabinet of little bedrooms.',terrace:'A stepped terrace of houses, one growing out of another.'}),
 room:choice('What waits inside the miniature rooms?',{cradle:'Empty cradles stand in front of the copied scene.',curtains:'Pale parted curtains hide the edges of each copied room.',mirrors:'Tiny standing mirrors hold close views of real objects in the scene.',doors:'Every room has an open door into another smaller room.'}),
 story:choice('What happened to the nursery?',{abandoned:'The house has been abandoned with every room still watching.',unpacked:'The rooms hang from strings as if recently unpacked.',sealed:'Some rooms have been crossed shut with thin timber strips.',remembering:'Small photographs of the cast remain in the rooms they left.'}),
 descent:score('How far inward does childhood recede?',['Two rooms inside a room','Four diminishing rooms','Six nested rooms']),
 aperture:score('How large is the enclosing dollhouse?',['Narrow side cupboards','A house looming over the scene','A huge cutaway whose roof almost leaves the frame']),
 pigment:choice('What material holds this domestic dream?',{bone:'Bone white painted wood and brown graphite.',rust:'Old red nursery paint and tobacco paper.',ink:'Cold ink, chalk and faded blue grey.',acid:'Sallow wallpaper and green stained wood.'})
},async apply(c,a,context,signal){
 const t=prepare(c,context,signal,a.pigment),{g,p,source,boxes}=t,r=context.random,m=context.mood;
 // Rebuild the macro image as a cutaway: the source scene is the inhabited central room.
 const side=90+a.aperture*34,top=86;
 g.fillStyle=p.paper;g.fillRect(0,0,720,720);
 for(let j=0;j<34;j++){line(g,0,j*23,720,j*23,p.soft,.3);}
 g.fillStyle=p.ink;g.beginPath();g.moveTo(8,196);g.lineTo(360,9);g.lineTo(712,196);g.lineTo(691,211);g.lineTo(360,38);g.lineTo(29,211);g.closePath();g.fill();
 g.fillStyle=p.soft;g.beginPath();g.moveTo(38,188);g.lineTo(360,39);g.lineTo(681,188);g.closePath();g.fill();
 for(let j=0;j<12;j++)line(g,360,40,45+j*57,188,p.ink,.65);
 g.fillStyle=p.ink;g.fillRect(30,188,660,478);g.fillStyle=p.paper;g.fillRect(43,202,634,448);
 // The main chamber is an image-bearing space with perspective side walls and its own floor.
 const mainX=side+35,mainW=650-side*2,mainY=225,mainH=413;
 g.fillStyle=p.soft;g.fillRect(mainX-8,mainY-8,mainW+16,mainH+16);
 g.drawImage(source,mainX,mainY,mainW,mainH);
 g.fillStyle=p.ink;g.fillRect(mainX-11,202,11,448);g.fillRect(mainX+mainW,202,11,448);
 for(let j=0;j<9;j++)line(g,mainX+mainW/2,592,mainX+j*mainW/8,647,p.ink,.6);
 line(g,40,650,680,650,p.ink,15);line(g,40,205,680,205,p.ink,12);
 // A small complete cross-section is embedded in the central room's back wall.
 const ix=mainX+mainW*.63,iy=mainY+20,iw=mainW*.32,ih=112;
 g.fillStyle=p.ink;g.fillRect(ix-5,iy-5,iw+10,ih+10);g.fillStyle=p.paper;g.fillRect(ix,iy,iw,ih);
 inset(g,source,p,ix+5,iy+7,iw-10,ih*.6,3,'rect');
 for(let j=0;j<4;j++)line(g,ix+iw*.5,iy+ih*.65,ix+j*iw/3,iy+ih,p.ink,.55);
 line(g,ix,iy+ih*.7,ix+iw,iy+ih*.7,p.ink,3);
 if(a.house==='cabinet'){for(const x of [25,695]){line(g,x,185,x,670,p.accent,9);for(let j=0;j<4;j++){g.fillStyle=p.ink;g.fillRect(x-7,240+j*100,14,23);}}}
 const floors=a.house==='terrace'?4:3;
 for(let wing=0;wing<2;wing++)for(let j=0;j<floors;j++){
  signal.throwIfAborted();let x=wing?688-side:45,y=221+j*(414/floors),w=side-20+(j%2?8:-5),h=414/floors-19;
  if(a.house==='terrace'){x+=wing?-j*8:j*8;w-=j*5;}
  if(a.house==='gable'&&j===0){h-=18;y+=18;}
  const room=(xx:number,yy:number,ww:number,hh:number,depth:number)=>{
   if(depth<1||ww<9||hh<12)return;g.fillStyle=p.ink;g.fillRect(xx-4,yy-4,ww+8,hh+8);g.fillStyle=p.soft;g.fillRect(xx,yy,ww,hh);
   g.save();g.beginPath();g.rect(xx,yy,ww,hh);g.clip();g.globalAlpha=.93;g.drawImage(source,xx+ww*.07,yy+hh*.06,ww*.86,hh*.75);g.globalAlpha=1;
   for(let k=0;k<6;k++){line(g,xx+ww/2,yy+hh*.55,xx+k*ww/5,yy+hh,p.ink,.45);}
   line(g,xx,yy+hh*.77,xx+ww,yy+hh*.77,p.accent,2);
   if(a.room==='curtains'){g.fillStyle=p.paper;for(const s of [0,1]){g.beginPath();g.moveTo(xx+s*ww,yy);g.lineTo(xx+ww*(s?.78:.22),yy);g.lineTo(xx+ww*(s?.94:.06),yy+hh*.7);g.lineTo(xx+s*ww,yy+hh*.8);g.fill();}}
   if(a.room==='cradle'){const by=yy+hh*.83;g.strokeStyle=p.ink;g.lineWidth=1.2;g.strokeRect(xx+ww*.15,by-hh*.14,ww*.5,hh*.12);for(let k=0;k<5;k++)line(g,xx+ww*(.15+k*.125),by-hh*.14,xx+ww*(.15+k*.125),by,p.ink,.8);line(g,xx+ww*.17,by,xx+ww*.13,by+7,p.ink,1.4);line(g,xx+ww*.62,by,xx+ww*.67,by+7,p.ink,1.4);}
   g.restore();
   if(depth>1)room(xx+ww*.54,yy+hh*.16,ww*.36,hh*.4,depth-1);
   if(a.room==='mirrors'&&boxes.length){g.fillStyle=p.ink;g.fillRect(xx+5,yy+hh*.44,ww*.28,hh*.3);detail(g,source,boxes[j%boxes.length],xx+7,yy+hh*.46,ww*.24,hh*.26);}
  };
  room(x,y,w,h,2+Math.round(a.descent*4));
  line(g,x-6,y+h+5,x+w+6,y+h+5,p.ink,5);glyphs(g,p,x+5,y+h+15,w-10,context.seed+j+wing*8);
  if(a.story==='sealed'){line(g,x,y,x+w,y+h,p.accent,5);line(g,x+w,y,x,y+h,p.accent,5);}
  if(a.story==='remembering'&&boxes.length){detail(g,source,boxes[j%boxes.length],x+w*.1,y+h*.08,w*.28,h*.25);}
 }
 // A mobile of hanging houses recedes across the attic, each with its own picture.
 const dolls=3+Math.round(m.density*3);for(let j=0;j<dolls;j++){
  const x=side+35+j*(620-side*2)/Math.max(1,dolls-1),y=128+Math.sin(j*1.9)*17,w=36+(a.story==='unpacked'?18:0),h=w*.85;
  line(g,x+w/2,15,x+w/2,y-12,p.ink,.8);g.fillStyle=p.accent;g.beginPath();g.moveTo(x-4,y);g.lineTo(x+w/2,y-18);g.lineTo(x+w+4,y);g.fill();inset(g,source,p,x,y,w,h,3,'rect',j%2===1);
 }
 for(let j=0;j<22+m.wear*60;j++){const x=r()<.5?15+r()*side:705-r()*side,y=top+r()*590;line(g,x,y,x+r()*7,y+2+r()*7,p.accent,.5);}
 return {pixels:await micrograph(finish(t,c,signal,false),c,context,signal,{pigment:a.pigment,vocabulary:a.micrography,hierarchy:a.hierarchy,region:'cutaway'},t.base),notes:[`${a.house} dollhouse cutaway; ${a.room} in ${floors*2} side rooms`,`${a.story}; ${2+Math.round(a.descent*4)} room generations and identity-detail keepsakes`]};
}});
