import * as THREE from 'three';
import { choice, defineWorld, diorama, score } from '@conjure/kit';
export default defineWorld({
  questions:{
    channels:choice('How does the delta divide?',{braided:'Several narrow channels weave around gravel islands.',fan:'Four distributaries spread from a single upstream throat.',meander:'One broad sinuous channel crosses the delta.',abandoned:'A disconnected chain of dark oxbow pools.'}),
    shore:choice('What lies at the channel mouths?',{lake:'A broad dark lake below a scalloped shore.',terrace:'Pale stepped evaporite shelves.',beach:'An exposed low cobble beach.',cliff:'A cut ice bluff along one side of the basin.'}),
    weather:choice('What has just happened here?',{rain:'Fresh rainfall leaves many shallow puddles.',dry:'Retreating liquid leaves cracked pale deposits.',flood:'The channel spreads into a wide sheet near the mouth.',survey:'Straight ranging lines and stakes cross the shore.'}),
    ridges:choice('What defines the distant terrain?',{dunes:'Low parallel organic dunes.',domes:'Several rounded cryovolcanic ice domes.',scarps:'Terraced ice scarps with exposed bands.',flat:'A low smooth plain with scattered ice boulders.'}),
    station:choice('What sampling station stands on the bank?',{none:'Only a short flagged survey stake.',platform:'A raised square sampling platform with rails.',shelter:'An angular open equipment shelter.',mast:'A tall instrument mast with a reflector.'}),
    surface:choice('What is exposed between the channels?',{pebbles:'Rounded pale ice cobbles on tan sediment.',polygons:'Broad polygonal cracking in pale ice.',ripple:'Closely spaced dark sediment ripples.',smooth:'Smooth ivory ice with only a few scattered blocks.'}),
    horizon:choice('How does the haze meet the horizon?',{orange:'Soft ochre haze with a clear distant ridge.',cream:'Pale cream over an almost white ice plain.',banded:'Three subtle horizontal layers of ochre haze.',grey:'Muted taupe haze over the wet delta.'}),
    access:choice('How do instruments reach the near bank?',{ramp:'A low sloped access ramp.',bridge:'A narrow supported bridge spans the side channel.',pads:'Three separate level instrument pads.',tracks:'Two shallow rover tracks reach the shore.'}),
    spread:score('How widely does the delta fan spread?',['Narrow','Open','Very broad']),
    relief:score('How deeply are the channels cut?',['Shallow rills','Low banks','Strong terraced edges']),
  },
  build(a,context){
    const bed=0.1+a.relief*0.24;
    const {art:s,world}=diorama(context,{floor:'#b9ad87',background:{orange:'#cbbb91',cream:'#e4dcc0',banded:'#c5b387',grey:'#b5b2a1'}[a.horizon],width:15,depth:12,maxHeight:2.6,radius:1.6,pitch:34,yaw:20,slots:[[0,2.1,bed+0.08],[-4,1.6,bed+0.08],[4,1.6,bed+0.08],[-4,-1.8,bed],[4,-1.8,bed],[0,-3.3,bed]]});
    const ice=s.material('#d0c7a3'),dark=s.material('#4f5b50',{roughness:0.25}),sand=s.material('#9d8c65'),white=s.material('#ddd6bb'),metal=s.material('#777f70',{metalness:0.5});
    s.box([14,bed,10.8],[0,bed/2,0],ice);
    const paths:[number,number,number][][]=[];
    const count=a.channels==='fan'?4:a.channels==='braided'?3:1;
    for(let i=0;i<count;i++){const pts:[number,number,number][]=[];for(let j=0;j<=30;j++){const t=j/30,z=-5+t*10,x=a.channels==='fan'?(i-1.5)*t*(1.4+a.spread):a.channels==='braided'?(i-1)*2.1+Math.sin(t*8+i)*0.65:Math.sin(t*7)*1.8;pts.push([x,bed+0.012,z]);}paths.push(pts);}
    for(const pts of paths){if(a.channels==='abandoned'){for(let i=3;i<28;i+=6)s.ball([0.8,0.025,0.5],[pts[i][0],bed+0.015,pts[i][2]],dark,24);}else {const curve=new THREE.CatmullRomCurve3(pts.map(p=>new THREE.Vector3(...p)));const ch=s.mesh(new THREE.TubeGeometry(curve,72,a.weather==='flood'?0.48:0.25,8,false),dark);ch.scale.y=0.065;ch.position.y=bed+0.012;for(const side of [-1,1])s.tube(pts.map(p=>[p[0]+side*(a.weather==='flood'?0.5:0.28),bed+0.018,p[2]]),0.045,sand);}}
    if(a.shore==='lake')s.ball([6.7,0.045,1.2],[0,bed+0.02,4.7],dark,40);
    if(a.shore==='terrace')for(let j=0;j<4;j++)s.box([12-j*0.6,0.07,0.4],[0,bed+0.02+j*0.035,4.1+j*0.32],j%2?white:sand);
    if(a.shore==='beach')s.scatter(new THREE.IcosahedronGeometry(0.12,1),white,Array.from({length:85},()=>({at:[(context.random()-0.5)*13,bed+0.1,4+context.random()] as [number,number,number],size:0.5+context.random()})));
    if(a.shore==='cliff')for(let j=0;j<4;j++)s.box([0.65,0.45,8-j*0.6],[-6.6+j*0.18,bed+j*0.4,-0.5],j%2?white:sand);
    for(let j=0;j<5;j++){const x=-5+j*2.5;if(a.ridges==='domes')s.ball([1.3,0.55+context.random()*0.5,0.8],[x,bed,-5],white,20);else if(a.ridges==='scarps')for(let k=0;k<3;k++)s.box([2.3,0.28,0.5],[x,bed+k*0.28,-5+k*0.24],k%2?ice:sand);else if(a.ridges==='dunes')s.ball([1.6,0.32,0.45],[x,bed,-5],sand,20);else s.ball([0.3,0.18,0.25],[x,bed,-5],white,16);}
    if(a.surface==='pebbles'||a.surface==='smooth')s.scatter(new THREE.IcosahedronGeometry(0.11,1),white,Array.from({length:a.surface==='pebbles'?110:18},()=>({at:[(context.random()-0.5)*12,bed+0.08,(context.random()-0.5)*8] as [number,number,number],size:0.4+context.random()})));
    if(a.surface==='polygons')for(let x=-5;x<=5;x+=2)for(let z=-3;z<=3;z+=2){const pts:[number,number,number][]=[];for(let i=0;i<=6;i++){const t=i/6*Math.PI*2;pts.push([x+Math.cos(t)*0.8,bed+0.012,z+Math.sin(t)*0.8]);}s.tube(pts,0.018,sand);}
    if(a.surface==='ripple')for(let i=0;i<20;i++)s.rod([-6,bed+0.035,-3.8+i*0.42],[-4.6,bed+0.035,-3.8+i*0.42],0.045,sand);
    if(a.weather==='rain')for(let j=0;j<14;j++)s.ball([0.15+context.random()*0.3,0.01,0.14+context.random()*0.2],[(context.random()-0.5)*12,bed+0.02,(context.random()-0.5)*7],dark,16);
    if(a.weather==='dry')for(let j=0;j<12;j++)s.rod([2.7,bed+0.02,-3+j*0.5],[3.3+(j%2)*0.3,bed+0.02,-2.85+j*0.5],0.025,sand);
    if(a.weather==='survey')for(const x of [-3,3]){s.rod([x,bed,-3],[x,bed+1,-3],0.04,metal);s.rod([x,bed,3],[x,bed+1,3],0.04,metal);s.rod([x,bed+0.5,-3],[x,bed+0.5,3],0.012,white);}
    const sx=5,sz=-3.5;
    if(a.station==='none')s.rod([sx,bed,sz],[sx,bed+1.5,sz],0.04,metal);
    if(a.station==='mast'){s.rod([sx,bed,sz],[sx,bed+3,sz],0.065,metal);s.box([0.7,0.7,0.04],[sx,bed+2.7,sz],white);for(const d of [-1,1])s.rod([sx+d,bed,sz],[sx,bed+1.9,sz],0.018,metal);}
    if(a.station==='shelter'||a.station==='platform'){for(const dx of [-0.8,0.8])for(const dz of [-0.65,0.65])s.rod([sx+dx,bed,sz+dz],[sx+dx,bed+(a.station==='shelter'?2.2:0.45),sz+dz],0.06,metal);s.box([1.8,0.14,1.5],[sx,bed+0.42,sz],sand);if(a.station==='shelter'){s.box([2,0.1,1.7],[sx,bed+2.25,sz],white);s.box([1.8,1.6,0.05],[sx,bed+1.35,sz-0.65],sand);}else for(const dx of [-0.8,0.8]){s.rod([sx+dx,bed+0.5,sz-0.6],[sx+dx,bed+1.15,sz-0.6],0.04,metal);s.rod([sx+dx,bed+0.5,sz+0.6],[sx+dx,bed+1.15,sz+0.6],0.04,metal);s.rod([sx+dx,bed+1.15,sz-0.6],[sx+dx,bed+1.15,sz+0.6],0.04,metal);}}
    if(a.horizon==='banded')for(let j=0;j<3;j++)s.box([15,0.6,0.02],[0,0.5+j*0.6,-5.9],s.material(j%2?'#b8a77f':'#d5c59c',{transparent:true,opacity:0.24,depthWrite:false}));
    if(a.access==='bridge'){s.box([2.5,0.12,0.7],[-2,bed+0.28,3.2],metal);for(const x of [-3,-1])s.box([0.12,0.3,0.65],[x,bed+0.13,3.2],sand);}
    if(a.access==='ramp'){const r=s.box([1.5,0.16,1.8],[-4.8,bed+0.15,3.6],metal);r.rotation.x=0.12;}
    if(a.access==='pads')for(const x of [-4,0,4])s.box([2.2,0.08,2.2],[x,bed+0.04,2.1],white);
    if(a.access==='tracks')for(const x of [-4.9,-4.2])for(let j=0;j<14;j++)s.box([0.38,0.018,0.1],[x,bed+0.018,j*0.23],sand);
    return world;
  }
});
