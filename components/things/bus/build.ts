import { Sculpture, choice, score, noul, defineThing } from '@conjure/kit';
export default defineThing({questions:{
 service:choice('What route does this bus serve?',{city:'A square low-floor city bus.',coach:'A long-distance coach with luggage bays.',school:'A yellow school bus with a projecting engine hood.'}),
 length:score('How long is the bus?', ['A compact six-metre minibus','A twelve-metre full-size bus']),
 deck:choice('How many passenger decks are there?',{single:'One enclosed passenger deck.',double:'Two enclosed decks.',open:'An open upper sightseeing deck.'}),
 livery:choice('What is the vehicle livery?',{cream:'Cream body with a green band.',red:'Muted red body with pale trim.',blue:'Blue-grey body with cream trim.'}),
 route:choice('What destination is displayed?',{home:'LAST BUS / HOME',airport:'AIRPORT / 24',school:'SCHOOL SERVICE'}),
 door:noul('Is the boarding door open?'),
 luggage:noul('Does roof or rear storage carry travel luggage?'),
},build(a,c){
 const s=new Sculpture(c),l=6+a.length*6,w=2.45,h=a.deck==='single'?2.9:4.2,body=s.material(a.service==='school'?'#c2a160':a.livery==='cream'?'#c7c4ab':a.livery==='red'?'#a76d5e':'#718da0'),trim=s.material('#d4cfbc'),dark=s.material('#354f5d'),metal=s.material('#728790',{metalness:.45});
 s.box([w,h-1,l],[0,.8+(h-1)/2,0],body);s.box([w*1.01,.15,l],[0,h+.02,0],a.deck==='open'?dark:trim);
 const decks=a.deck==='single'?1:2;for(let d=0;d<decks;d++)for(const side of [-1,1]){const y=1.95+d*1.35;if(a.deck==='open'&&d===1){s.rod([side*w*.5,y+.2,-l*.45],[side*w*.5,y+.2,l*.45],.035,metal);for(let i=0;i<8;i++)s.rod([side*w*.5,y-.35,(i-3.5)*l*.12],[side*w*.5,y+.2,(i-3.5)*l*.12],.025,metal);}else for(let i=0;i<8;i++)s.box([.02,.72,l*.088],[side*w*.505,y,(i-3.5)*l*.113],dark);}
 for(const side of [-1,1])for(const z of [-l*.31,l*.3]){const wheel=s.cylinder(.42,.42,.24,[side*w*.47,.43,z],dark,20);wheel.rotation.z=Math.PI/2;s.cylinder(.2,.2,.25,[side*w*.47,.43,z],metal,16).rotation.z=Math.PI/2;}
 s.box([w*.83,1,.03],[0,2.04,l*.503],dark);s.label(a.route==='home'?'LAST BUS':a.route==='airport'?'AIRPORT / 24':'SCHOOL',w*.84,.28,[0,h-.3,l*.512],'#e0d3aa','#354f5d');
 if(a.service==='school')s.box([w*.88,.9,l*.15],[0,1.15,l*.53],body);
 if(a.service==='coach')for(let i=0;i<4;i++)s.box([.018,.42,l*.18],[w*.507,1,(i-1.5)*l*.22],trim);
 const dz=l*.32;s.box([.03,1.8,.8],[w*.515,1.7,dz],a.door?dark:trim);if(a.door)s.box([.4,.1,.9],[w*.65,.65,dz],metal);
 for(const x of [-.82,.82]){s.box([.3,.1,.04],[x,1.14,l*.51],trim);s.rod([x,2.3,l*.47],[x*1.7,2.3,l*.5],.025,metal);s.box([.13,.28,.08],[x*1.7,2.3,l*.5],dark);}
 if(a.luggage)for(let i=0;i<4;i++)s.box([.5,.35,.7],[(i%2-.5)*.6,h+.28,(Math.floor(i/2)-.5)*1],s.material(i%2?'#9b8662':'#6c8c8b'));
 return s.finish();}});
