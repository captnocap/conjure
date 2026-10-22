import { Sculpture, choice, score, noul, defineThing } from '@conjure/kit';
export default defineThing({questions:{
 cabin:choice('What travels on the haul cable?',{gondola:'An enclosed sightseeing gondola.',chair:'An open four-seat chair lift with a safety bar.',freight:'An open cargo platform with stacked crates.'}),
 size:score('How large is the suspended carrier?', ['A compact private carrier','A broad six-person aerial cabin']),
 colour:choice('How is the carrier painted?',{red:'Oxide red with cream trim.',blue:'Slate blue with silver trim.',yellow:'Safety yellow with dark trim.'}),
 glazing:choice('What sort of glazing is fitted if enclosed?',{panoramic:'Large uninterrupted panoramic windows.',framed:'Small framed individual windows.',dark:'Dark opaque tinted windows.'}),
 hanger:choice('What supports the carrier?',{curved:'A curved single hanger neck.',double:'A paired straight hanger frame.',truss:'A wide triangulated hanger assembly.'}),
 doors:noul('Are the boarding doors open?'),
 baggage:noul('Is luggage or ski equipment attached outside?'),
},build(a,c){
 const s=new Sculpture(c),k=.7+a.size*.8,w=2*k,d=1.4*k,h=1.7*k,y=.15,paint=s.material(a.colour==='red'?'#a96b58':a.colour==='blue'?'#64879b':'#bca363'),metal=s.material('#6f858f',{metalness:.6}),glass=s.material(a.glazing==='dark'?'#334c59':'#7eabb4'),cream=s.material('#d1cbb8');
 if(a.cabin==='gondola'){
  s.box([w,.6*k,d],[0,y+.3*k,0],paint);s.box([w*.98,.95*k,d*.98],[0,y+1.07*k,0],glass);s.box([w*1.04,.13*k,d*1.04],[0,y+h,0],cream);
  for(const x of [-1,1])for(const z of [-1,1])s.rod([x*w*.48,y+.55*k,z*d*.48],[x*w*.48,y+h,z*d*.48],.035*k,cream);
  if(a.glazing==='framed')for(let i=0;i<5;i++)s.rod([(i-2)*w*.19,y+.55*k,d*.5],[(i-2)*w*.19,y+h,d*.5],.025*k,cream);
  s.box([w*.32,h*.8,.03],[0,y+h*.48,d*.51],a.doors?metal:glass);
 }else{
  s.box([w,.14*k,d],[0,y,0],metal);if(a.cabin==='chair'){s.box([w,.12*k,d*.45],[0,y+.5*k,-d*.15],paint);s.box([w,.6*k,.08*k],[0,y+.84*k,-d*.38],paint);s.rod([-w*.5,y+.9*k,d*.3],[w*.5,y+.9*k,d*.3],.035*k,cream);for(const x of [-1,1])s.rod([x*w*.48,y,x*d*.4],[x*w*.48,y+h,0],.045*k,metal);}else for(let i=0;i<5;i++)s.box([.48*k,.6*k,.55*k],[(i%3-1)*.52*k,y+.36*k,(Math.floor(i/3)-.5)*.58*k],s.material('#a18a62'));}
 const top=y+h+1.15*k;
 if(a.hanger==='curved')s.tube([[0,y+h,0],[0,y+h+.55*k,0],[.3*k,top,0],[0,top+.1*k,0]],.055*k,metal);
 else for(const x of [-1,1])s.rod([x*w*.35,y+h,0],[a.hanger==='truss'?0:x*w*.2,top,0],.045*k,metal);
 s.box([.55*k,.13*k,.4*k],[0,top+.05*k,0],metal);for(const x of [-.17,.17]){const pulley=s.cylinder(.1*k,.1*k,.075*k,[x*k,top+.17*k,0],cream,16);pulley.rotation.x=Math.PI/2;}
 s.rod([-w,top+.22*k,0],[w,top+.22*k,0],.015*k,metal);
 if(a.baggage){s.box([w*.7,.17*k,.45*k],[0,y+.15*k,-d*.68],metal);for(let i=0;i<3;i++)s.box([.2*k,.5*k,.25*k],[(i-1)*.3*k,y+.4*k,-d*.68],paint);}
 return s.finish();}});
