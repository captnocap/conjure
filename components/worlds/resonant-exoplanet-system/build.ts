import * as THREE from 'three';
import { choice, defineWorld, diorama, score } from '@conjure/kit';

export default defineWorld({
  questions:{
    layout:choice('How does the orbital atlas organise its systems?',{fan:'Orbital planes fan out from a rear stellar focus.',stacked:'Several reference planes rise in a stepped arrangement.',corridor:'A long spatial corridor links two stellar regions.',tilted:'A single strongly tilted reference plane cuts through the scene.'}),
    primary:choice('What stellar focus anchors the atlas?',{single:'One pale golden star.',binary:'Two close stars of unequal size.',triple:'Three small stars in a triangular arrangement.',remnant:'A compact white remnant inside a broad faint shell.'}),
    rings:choice('How are the large reference orbits drawn?',{continuous:'Thin continuous circular paths.',segments:'Separate curved segments suggest incomplete surveys.',beads:'Small beads mark evenly sampled positions.',ribbons:'Broad thin annuli reveal the plane geometry.'}),
    frame:choice('What spatial measuring frame surrounds the atlas?',{none:'No external frame beyond the orbital traces.',axes:'Three thin axes and short graduation marks.',meridians:'Two intersecting great circle meridians.',cage:'A sparse cubical survey cage with corner marks.'}),
    epoch:choice('What phase of planetary history is pictured?',{forming:'A narrow stream of dust joins the system.',settled:'Clear orbital lanes and only a few distant grains.',resonant:'Fine connecting spokes emphasise repeated alignments.',disrupted:'A broken arc scatters fragments beyond its former path.'}),
    captions:choice('How is the atlas annotated?',{none:'A silent map without lettering.',periods:'Small cards mark orbital period ratios.',directions:'North and travel-direction arrows.',measure:'Short radial ruler bars at the edge of the scene.'}),
    plane:choice('What marks the main reference plane?',{bare:'Only the thin perimeter line.',grid:'A faint square survey grid.',radial:'A wheel of fine radial divisions.',bands:'Several separated nested annular bands.'}),
    ground:choice('What is the atlas backdrop?',{chalk:'Pale chalk white, a scientific plate.',slate:'Soft slate grey, distant space without total darkness.',parchment:'Warm parchment, like an old celestial chart.',mist:'Pale blue grey, an airy astronomical model.'}),
    eccentricity:score('How elongated are the reference ellipses?',['Nearly circular','Moderately elliptical','Long and narrow ellipses']),
    spread:score('How widely are the reference orbits spaced?',['Closely nested','Clearly separated','Broad open intervals']),
  },
  build(a,context){
    const rear=a.layout==='corridor'?-4.1:-3.2;
    const {art:s,world}=diorama(context,{floor:null,background:{chalk:'#e1e3dc',slate:'#88959b',parchment:'#d8cdb2',mist:'#cbd7dc'}[a.ground],width:13,depth:10,maxHeight:2.7,radius:1.55,floating:true,pitch:34,yaw:22,slots:[[0,1.5],[-3.8,-0.5],[3.8,-0.5],[-3.8,3.4],[3.8,3.4],[0,-2.7]]});
    const trace=s.material('#344e54'),dark=s.material('#3f5960'),star=s.material('#dfbc76',{emissive:'#c9a45c',emissiveIntensity:0.35}),pale=s.material('#c7d3cb');
    const path=(points:[number,number,number][],radius:number,material:THREE.Material)=>s.mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),Math.min(128,points.length*2),radius,5,false),material);
    const ring=(radius:number,y:number,tilt:number,offset=0)=>{
      const points:[number,number,number][]=[];
      const max=a.rings==='segments'?Math.PI*1.65:Math.PI*2;
      for(let i=0;i<=96;i++){const t=i/96*max+offset;points.push([Math.cos(t)*radius, y+Math.sin(t)*radius*Math.sin(tilt),Math.sin(t)*radius*(1-a.eccentricity*0.45)*Math.cos(tilt)]);}
      if(a.rings==='beads')s.scatter(new THREE.IcosahedronGeometry(0.09,0),trace,points.filter((_,i)=>i%3===0).map(at=>({at,size:1})));
      else path(points,a.rings==='ribbons'?0.075:0.035,trace);
    };
    const starCount=a.primary==='binary'?2:a.primary==='triple'?3:1;
    for(let i=0;i<starCount;i++){const x=(i-(starCount-1)/2)*1.25,y=2.6+(a.primary==='triple'&&i===1?0.65:0);s.ball([0.6-i*0.08,0.6-i*0.08,0.6-i*0.08],[x,y,rear],star,24);}
    if(a.primary==='remnant'){const shell=s.ring(1.2,0.035,[0,2.6,rear],pale);shell.rotation.y=0.3;}
    for(let j=0;j<4;j++){const r=2.3+j*(0.55+a.spread*0.5),tilt=a.layout==='fan'?(j-1.5)*0.14:a.layout==='tilted'?0.72:0;ring(r,a.layout==='stacked'?0.25+j*0.5:0.2,tilt,j*0.12);}
    if(a.layout==='corridor'){s.ball([0.3,0.3,0.3],[0,2.6,3.6],pale,20);path([[0,2.6,rear],[0,3.3,0],[0,2.6,3.6]],0.026,dark);}
    if(a.plane==='grid')for(let j=-4;j<=4;j++){s.rod([-4.5,0.15,j],[4.5,0.15,j],0.018,dark);s.rod([j,0.15,-4.5],[j,0.15,4.5],0.018,dark);}
    if(a.plane==='radial')for(let j=0;j<16;j++){const t=j/16*Math.PI*2;s.rod([0,0.15,0],[Math.cos(t)*4.8,0.15,Math.sin(t)*4.8],0.018,dark);}
    if(a.plane==='bands')for(let j=0;j<5;j++)ring(1+j*0.7,0.14,0);
    if(a.frame==='axes'){s.rod([-6,0.1,0],[6,0.1,0],0.028,dark);s.rod([0,0.1,-5],[0,0.1,5],0.028,dark);s.rod([0,0,0],[0,5,0],0.028,dark);}
    if(a.frame==='meridians')for(const rotation of [0,Math.PI/2]){const meridian=s.ring(5,0.012,[0,0.8,0],dark);meridian.rotation.y=rotation;}
    if(a.frame==='cage'){for(const x of [-5.7,5.7])for(const z of [-4.5,4.5])s.rod([x,0,z],[x,4.7,z],0.026,dark);for(const y of [0,4.7])for(const z of [-4.5,4.5])s.rod([-5.7,y,z],[5.7,y,z],0.026,dark);for(const y of [0,4.7])for(const x of [-5.7,5.7])s.rod([x,y,-4.5],[x,y,4.5],0.026,dark);}
    if(a.epoch==='resonant')for(let i=0;i<9;i++){const t=i/9*Math.PI*2;s.rod([0,2.6,rear],[Math.cos(t)*4.5,0.2,Math.sin(t)*4.5],0.024,pale);}
    const grains=a.epoch==='settled'?20:a.epoch==='forming'?90:55;
    s.scatter(new THREE.IcosahedronGeometry(1,0),pale,Array.from({length:grains},(_,i)=>{const t=i/grains*Math.PI*2,rr=4.8+context.random()*1.2;const at:[number,number,number]=a.epoch==='forming'?[Math.cos(t)*rr,0.3+t*0.12,Math.sin(t)*rr]:[Math.cos(t)*rr,(context.random()-0.5)*0.6,Math.sin(t)*rr];return {at,size:0.025+context.random()*0.04};}));
    if(a.epoch==='disrupted')for(let j=0;j<8;j++){const t=j*0.12;s.rod([Math.cos(t)*4.8,0.2,Math.sin(t)*4.8],[Math.cos(t)*5.7,0.5,Math.sin(t)*5.7],0.018,trace);}
    if(a.captions==='periods')for(let i=0;i<3;i++)s.label(['4 : 2 : 1','T / 2','2 T'][i],0.65,0.2,[-4+i*4,0.3,4.5],'#3c5555','#d9d5bc').rotation.x=-Math.PI/3;
    if(a.captions==='directions')for(const x of [-4.8,4.8])s.rod([x,0.2,3],[x,0.2,3.7],0.07,dark,0.001);
    if(a.captions==='measure')for(let j=0;j<10;j++)s.rod([-4.5+j,0.15,4.4],[-4.5+j,0.15,4.7+(j%2)*0.12],0.015,dark);
    return world;
  },
});
