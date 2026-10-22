import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing } from '@conjure/kit';
export default defineThing({
  questions: {
    dome: choice('What observatory enclosure shelters the instrument?', {classic:'A white hemispherical dome above a circular stone building.',industrial:'A ribbed metal dome on a utility cylinder.',remote:'A compact robotic dome on a raised service deck.'}),
    aperture: score('How far has the observing slit opened?', ['A narrow closed seam','A broad open slice with the telescope exposed']),
    instrument: choice('What telescope waits in the slit?', {refractor:'A long brass refractor with a narrow front lens.',reflector:'A large short reflecting telescope with a dark open mouth.',radio:'An open wire radio dish instead of an optical instrument.'}),
    elevation: score('How high does the telescope point?', ['Toward a low horizon','Almost straight at the zenith']),
    access: choice('How does the observer reach the instrument?', {stairs:'An exterior flight of utilitarian stairs.',ladder:'A vertical maintenance ladder.',none:'A sealed autonomous building with no outside access.'}),
    annex: noul('Is a low control room attached?'),
    signal: choice('What indicates the observatory status?', {red:'A red night-safe operating lamp.',amber:'An amber maintenance beacon.',quiet:'No signal, only a numbered door.'}),
  },
  build(a,c) {
    const s=new Sculpture(c), r=a.dome==='remote'?2.1:3.2, h=a.dome==='remote'?1.4:2.8;
    const shell=s.material(a.dome==='classic'?'#dfd8c9':'#929ea4',{metalness:.25}), dark=s.material('#273441'), stone=s.material('#b2aaa0'), brass=s.material('#bba270',{metalness:.65});
    s.cylinder(r,r,h,[0,h/2,0],a.dome==='classic'?stone:shell,40);
    s.cylinder(r+.15,r+.15,.17,[0,h,0],dark,40);
    const slit=.06+a.aperture*.8;
    s.mesh(new THREE.SphereGeometry(r,40,20,slit/2,Math.PI*2-slit,0,Math.PI/2),shell,[0,h,0]);
    for(let i=0;i<10;i++){const t=i*Math.PI*2/10;s.rod([Math.sin(t)*r*.985,h,Math.cos(t)*r*.985],[Math.sin(t)*r*.8,h+r*.58,Math.cos(t)*r*.8],.025,dark);}
    s.cylinder(.22,.4,h*.55,[0,h+h*.25,0],dark);
    const elev=.25+a.elevation*1.15, len=a.instrument==='reflector'?2.3:3.5, start:[number,number,number]=[0,h+.6,0], end:[number,number,number]=[0,h+.6+Math.sin(elev)*len,Math.cos(elev)*len];
    s.rod(start,end,a.instrument==='reflector'?.5:.14,a.instrument==='refractor'?brass:shell);
    s.ball([a.instrument==='reflector'?.45:.16,.08,a.instrument==='reflector'?.45:.16],end,dark);
    if(a.instrument==='radio'){const dish=s.mesh(new THREE.SphereGeometry(1,24,12,0,Math.PI*2,0,.65),shell,end);dish.scale.set(1.1,.4,1.1);dish.rotation.x=elev;}
    s.box([.8,1.6,.1],[0,.8,r+.04],dark);s.label('OBS 07',.65,.22,[0,1.2,r+.101]);
    for(const x of [-.23,.23])s.box([.12,.2,.04],[x,1.5,r+.13],brass);
    if(a.access==='stairs')for(let i=0;i<9;i++)s.box([1,.16,.44],[r+.65,.08+i*h/9,r-2.9+i*.36],dark);
    if(a.access==='ladder'){for(const x of [-.25,.25])s.rod([r+.2,.1,x],[r+.2,h+.8,x],.04,dark);for(let i=0;i<12;i++)s.rod([r+.2,.22+i*.27,-.25],[r+.2,.22+i*.27,.25],.035,dark);}
    if(a.annex){s.box([2.2,1.4,2],[r+1, .7,0],shell);s.box([1.8,.12,2.2],[r+1,1.46,0],dark);s.box([1.4,.45,.03],[r+1,.95,1.02],dark);}
    if(a.signal!=='quiet')s.ball([.1,.1,.1],[.55,1.6,r+.11],s.material(a.signal==='red'?'#c84841':'#e1b657',{emissive:a.signal==='red'?'#c84841':'#e1b657',emissiveIntensity:1}));
    return s.finish();
  }
});
