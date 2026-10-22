import { Sculpture, choice, score, noul, defineThing } from '@conjure/kit';
export default defineThing({questions:{
 enclosure:choice('What form does the transit booth take?',{kiosk:'An enclosed street kiosk with a broad front opening.',frame:'A bare transit arch over a threshold platform.',industrial:'A rugged laboratory booth with external braces.'}),
 height:score('How tall is the transit opening?', ['A compact two-metre threshold','A three-metre equipment portal']),
 system:choice('What transit system is installed?',{rails:'Vertical luminous transit rails.',rings:'A stack of thin horizontal field rings.',grid:'A diagonal wireframe energy lattice.'}),
 destination:choice('Where is the kiosk keyed to?',{station:'STATION / 07',home:'HOME / RETURN',unknown:'UNKNOWN / WAIT'}),
 status:choice('What state is the doorway in?',{ready:'A cyan ready threshold.',waiting:'Amber waiting lamps.',closed:'A dark shut transit surface.'}),
 console:noul('Is a side control console attached?'),
 baggage:noul('Is a small baggage shelf fitted?'),
},build(a,c){
 const s=new Sculpture(c),h=2+a.height,w=1.4+h*.12,d=1.35,body=s.material('#8399a3'),dark=s.material('#3f5867'),col=a.status==='ready'?'#7fc3c6':a.status==='waiting'?'#d2b276':'#5d707c',glow=s.material(col,{emissive:col,emissiveIntensity:a.status==='closed'?0:.7}),trim=s.material('#c8c9b7');
 s.box([w+.4,.18,d+.35],[0,.09,0],dark);for(const x of [-1,1])s.box([.18,h,.22],[x*w*.5,h/2+.18,d*.45],body);s.box([w+.18,.25,.3],[0,h+.2,d*.45],body);
 if(a.enclosure!=='frame'){s.box([w,h,.14],[0,h/2+.18,-d*.5],body);for(const x of [-1,1])s.box([.12,h,d],[x*w*.5,h/2+.18,0],a.enclosure==='industrial'?dark:body);s.box([w+.25,.15,d+.1],[0,h+.3,0],body);}
 if(a.status==='closed')s.box([w-.2,h-.1,.04],[0,h/2+.2,d*.47],dark);
 else if(a.system==='rails')for(const x of [-1,1])for(const z of [-1,1])s.rod([x*w*.4,.2,z*d*.35],[x*w*.4,h+.05,z*d*.35],.025,glow);
 else if(a.system==='rings')for(let i=0;i<8;i++){const r=s.ring(w*.43,.018,[0,.35+i*(h-.35)/8,0],glow);r.rotation.x=Math.PI/2;}
 else for(let i=0;i<7;i++){const y=.3+i*(h-.4)/7;s.rod([-w*.4,y,d*.48],[w*.4,Math.min(h,y+.5),d*.48],.015,glow);}
 s.label(a.destination==='station'?'STATION 07':a.destination==='home'?'HOME':'WAIT',w*.9,.24,[0,h+.2,d*.62],'#d0d3bd','#3f5867');
 if(a.enclosure==='industrial')for(const x of [-1,1])s.rod([x*(w*.5+.35),.05,-d*.3],[x*w*.5,h*.8,-d*.3],.06,dark);
 if(a.console){s.box([.45,1.1,.4],[w*.5+.35,.55,.15],body);s.box([.32,.23,.015],[w*.5+.35,.82,.359],glow);for(let i=0;i<3;i++)s.ball([.025,.025,.015],[w*.5+.23+i*.12,.58,.36],trim,10);}
 if(a.baggage)s.box([.6,.09,.65],[-w*.5-.3,.6,0],trim);
 return s.finish();}});
