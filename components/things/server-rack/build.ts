import { Sculpture, choice, score, noul, defineThing } from '@conjure/kit';
export default defineThing({questions:{
 cabinet:choice('What sort of server enclosure is this?',{open:'An open four-post equipment frame.',closed:'A cabinet with closed mesh doors.',portable:'A short rugged mobile rack on casters.'}),
 height:score('How tall is the rack?', ['A compact one-metre rack','A full two-metre equipment cabinet']),
 load:score('How fully is the rack populated?', ['Mostly empty with a few units','Dense equipment from bottom to top']),
 purpose:choice('What equipment fills the rack?',{compute:'Uniform compute servers with narrow front panels.',storage:'Storage arrays with many removable disk drawers.',network:'Network switches and rows of brightly coloured patch leads.'}),
 cooling:choice('What cooling hardware is visible?',{fans:'Circular fan grilles on selected units.',vents:'Parallel ventilation slots.',liquid:'Two tall coolant manifold pipes.'}),
 indicators:noul('Are status indicators active?'),
 cables:choice('How are the patch cables routed?',{neat:'Neat bundled coloured service loops.',tangled:'Many loose hanging patch cables.',none:'A clean rack with no external patch leads.'}),
},build(a,c){
 const s=new Sculpture(c),h=1+a.height,w=.65,d=.85,black=s.material('#33434c',{metalness:.45}),silver=s.material('#86949b',{metalness:.6}),dark=s.material('#21343d'),glow=s.material('#80b7a2',{emissive:'#599778',emissiveIntensity:.7});
 for(const x of [-1,1])for(const z of [-1,1])s.box([.035,h,.035],[x*w*.5,h/2,z*d*.5],black);for(const y of [.04,h-.04])s.box([w,.08,d],[0,y,0],black);
 if(a.cabinet!=='open')s.box([w,h*.96,.03],[0,h/2,-d*.5],black);
 const n=3+Math.round(a.load*13),unit=(h-.22)/18;
 for(let i=0;i<n;i++){
  const y=.14+(i+.5)*(h-.22)/n;s.box([w*.9,unit*.85,d*.87],[0,y,0],silver);s.box([w*.9,unit*.8,.025],[0,y,d*.45],dark);
  if(a.purpose==='storage')for(let j=0;j<6;j++){s.box([.075,unit*.5,.014],[(j-2.5)*.087,y,d*.475],silver);s.box([.025,unit*.25,.006],[(j-2.5)*.087,y,d*.486],dark);}
  else if(a.purpose==='network')for(let j=0;j<12;j++)s.box([.026,.021,.015],[(j-5.5)*.037,y,d*.475],silver);
  else{for(const x of [-.25,.25])s.box([.012,unit*.53,.025],[x,y,d*.48],silver);s.box([.18,.018,.01],[0,y,d*.48],silver);}
  if(a.cooling==='vents')for(let j=0;j<6;j++)s.box([.09,.005,.009],[-.16,y+(j-2.5)*unit*.09,d*.477],black);
  if(a.cooling==='fans'&&i%3===0)for(const x of [-.17,.17])s.ring(unit*.27,.006,[x,y,d*.49],silver);
  if(a.indicators)for(const x of [.19,.23])s.ball([.008,.008,.006],[x,y,d*.49],glow,10);
  if(a.cables!=='none'&&i%2===0){const tint=s.material(['#587ba5','#b18b5f','#6c9e91'][i%3]),drop=a.cables==='tangled'?.25:.09;s.tube([[.16,y,d*.51],[.34,y-drop,d*.58],[.35,y-drop-.07,d*.38],[.32,y-.06,d*.2]],.008,tint);}
 }
 if(a.cabinet==='closed'){for(let i=0;i<18;i++)s.box([w*.95,.013,.012],[0,.1+i*(h-.2)/17,d*.515],black);for(let i=0;i<10;i++)s.box([.01,h*.95,.012],[(i-4.5)*w*.095,h/2,d*.515],black);s.box([.03,.18,.035],[w*.37,h*.5,d*.54],silver);}
 if(a.cooling==='liquid')for(const x of [-1,1])s.rod([x*w*.4,.15,-d*.2],[x*w*.4,h-.1,-d*.2],.025,silver);
 if(a.cabinet==='portable')for(const x of [-1,1])for(const z of [-1,1])s.ball([.045,.045,.03],[x*w*.4,-.01,z*d*.4],black,12);
 return s.finish();}});
