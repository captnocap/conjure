import * as THREE from 'three';
import { Sculpture, choice, score, noul, diorama, defineThing, defineWorld, figure } from '@conjure/kit';
export default defineThing({
  questions: {
    horse: choice("What shaving-horse structure is used?", {"beam": "A single long beam horse.", "plank": "A broad plank bench.", "fork": "A forked twin-beam horse.", "stout": "A heavy short shaving horse."}),
    clamp: choice("What clamping head is fitted?", {"bar": "A straight crossbar head.", "block": "A large square head.", "fork": "A forked grip head.", "round": "A rounded pressure head."}),
    pedal: choice("What foot control is visible?", {"bar": "A broad foot crossbar.", "board": "A flat footboard.", "pair": "Two small foot pedals.", "long": "A long swinging treadle."}),
    stave: choice("What workpiece is clamped?", {"bow": "A bowed barrel stave.", "flat": "A flat rough stave.", "short": "A short shaped stave.", "none": "An empty clamping jaw."}),
    knife: choice("What drawknife rests on the stave?", {"straight": "A straight two-handled blade.", "curved": "A curved drawknife.", "small": "A small finishing knife.", "none": "No drawknife."}),
    seat: choice("What seat is fitted?", {"plain": "A plain timber seat.", "saddle": "A wide saddle-shaped seat.", "pad": "A small padded seat.", "slat": "Two narrow seat slats."}),
    braces: choice("What leg bracing is used?", {"cross": "Crossed diagonal braces.", "rails": "Horizontal leg rails.", "single": "One diagonal brace.", "plain": "Unbraced stout legs."}),
    state: choice("What work detail appears?", {"working": "A set-up shaving horse.", "shavings": "Curled wood shavings beneath.", "spare": "A spare stave rests beside it.", "wedge": "A loose clamp wedge."}),
    length: score("How long is the horse?", ["Compact horse", "Standard cooper horse", "Long vat-stave horse"])
  },
  build(a,context){
 const s=new Sculpture(context),wood=s.material('#a68a5e'),light=s.material('#c0a46e'),dark=s.material('#5b543f'),iron=s.material('#606f5d',{metalness:.5}),brass=s.material('#b59e63'),pale=s.material('#dfd0a7');

 const L=1.1+a.length*.65,Y=.48,W=a.horse==='plank'?.4:.28;for(const x of [-L*.36,L*.36])for(const z of [-.13,.13])s.rod([x*1.1,0,z*1.65],[x,Y,z],.035,wood);if(a.horse==='fork')for(const z of [-.1,.1])s.box([L,.1,.1],[0,Y-.05,z],wood);else s.box([L,.1,W],[0,Y-.05,0],wood);
 if(a.braces!=='plain')for(const z of [-.15,.15]){if(a.braces==='rails')s.rod([-L*.38,.2,z],[L*.38,.2,z],.02,dark);else{s.rod([-L*.38,.15,z],[L*.38,Y-.1,z],.02,dark);if(a.braces==='cross')s.rod([L*.38,.15,z],[-L*.38,Y-.1,z],.02,dark);}}
 const sx=-L*.28;if(a.seat==='slat')for(const z of [-.1,.1])s.box([.35,.035,.12],[sx,Y+.0175,z],wood);else s.box([a.seat==='saddle'?.42:.32,a.seat==='pad'?.06:.035,.34],[sx,Y+(a.seat==='pad'?.03:.0175),0],a.seat==='pad'?dark:wood);
 for(const x of [L*.08,L*.32]){const h=.085+(x-L*.2)*Math.tan(.13);s.box([.08,h,.18],[x,Y+h/2,0],wood);}
 const cx=L*.19;s.box([L*.45,.07,.22],[L*.2,Y+.12,0],wood).rotation.z=.13;for(const z of [-.17,.17])s.rod([cx-.12,.12,z],[cx+.06,Y+.38,z],.025,wood);const hy=Y+.23;if(a.clamp==='round')s.cylinder(.075,.075,.42,[cx+.04,hy,0],dark,20).rotation.x=Math.PI/2;else s.box([a.clamp==='block'?.16:.08,.1,a.clamp==='fork'?.48:.4],[cx+.04,hy,0],dark);if(a.clamp==='fork')for(const z of [-.2,.2])s.box([.13,.18,.08],[cx+.04,hy-.04,z],wood);
 if(a.pedal==='board'||a.pedal==='long')s.box([a.pedal==='long'?.4:.2,.04,.46],[cx-.12,.12,0],wood);else for(const z of a.pedal==='pair'?[-.18,.18]:[0])s.box([.1,.05,a.pedal==='pair'?.16:.5],[cx-.12,.12,z],dark);
 if(a.stave!=='none'){const sl=a.stave==='short'?.5:L*.65;if(a.stave==='bow')s.surface((u,v,p)=>p.set(L*.2+(u-.5)*sl,Y+.155+(u-.5)*sl*Math.tan(.13)+Math.sin(u*Math.PI)*.035,(v-.5)*.11),light,{segments:[20,2]});else s.box([sl,.035,.11],[L*.2,Y+.1725,0],light).rotation.z=.13;}
 if(a.knife!=='none'){const kx=L*.05,ky=Y+(a.stave==='none'?.164:a.stave==='bow'?.164+Math.sin((.5-.15/.65)*Math.PI)*.035:.199)-L*.15*Math.tan(.13),span=a.knife==='small'?.22:.36;if(a.knife==='curved')s.tube([[kx,ky,-span/2],[kx+.04,ky,0],[kx,ky,span/2]],.009,iron);else s.rod([kx,ky,-span/2],[kx,ky,span/2],.009,iron);for(const z of [-span/2,span/2])s.rod([kx,ky,z],[kx-.1,ky,z],.018,dark);}
 if(a.state==='shavings')for(let j=0;j<6;j++)s.ring(.045,.006,[-.2+j*.1,.012,.35],light,Math.PI*1.5).rotation.x=Math.PI/2;if(a.state==='spare')s.box([L*.8,.04,.12],[0,.02,.42],light);if(a.state==='wedge')s.box([.15,.025,.06],[0,.0125,.35],wood);return s.finish();

  },
});
