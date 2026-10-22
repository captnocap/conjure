import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing } from '@conjure/kit';
export default defineThing({questions:{
 plan:choice('What is the tower plan?',{round:'A round stone keep.',square:'A square defensive tower.',octagon:'An eight-sided palace watchtower.'}),
 height:score('How tall does the tower rise?', ['A low six-metre watchtower','A twenty-two-metre keep']),
 masonry:choice('What stone was used?',{limestone:'Pale limestone and darker mortar.',basalt:'Blue-grey basalt blocks.',sandstone:'Warm weathered sandstone.'}),
 crown:choice('How is the tower crowned?',{battlements:'An open crenellated fighting platform.',roof:'A steep slate cone roof.',ruin:'A broken irregular parapet.'}),
 windows:choice('What openings pierce the wall?',{slits:'Narrow defensive arrow slits.',arched:'Tall dark arched windows.',sealed:'Only tiny sealed ventilation holes.'}),
 banner:noul('Does a long banner hang from the upper wall?'),
 approach:choice('How is the door approached?',{steps:'Stone steps rise to a heavy timber door.',bridge:'A short projecting wooden drawbridge.',locked:'A sealed iron door at ground level.'}),
},build(a,c){
 const s=new Sculpture(c),h=6+a.height*16,r=1.8+a.height*1.2,seg=a.plan==='square'?4:a.plan==='octagon'?8:32,stone=s.material(a.masonry==='limestone'?'#bfbbaa':a.masonry==='basalt'?'#77848c':'#b69b78'),dark=s.material('#334147'),trim=s.material('#9d998b'),wood=s.material('#796c53');
 const shell=s.cylinder(r,r*1.15,h,[0,h/2,0],stone,seg);if(a.plan==='square')shell.rotation.y=Math.PI/4;
 for(let j=0;j<8;j++){const band=s.cylinder(r*(1.15-.15*j/8)+.025,r*(1.15-.15*j/8)+.025,.04,[0,j*h/8,0],trim,seg);if(a.plan==='square')band.rotation.y=Math.PI/4;}
 const para=s.cylinder(r*1.13,r*1.13,.4,[0,h+.2,0],stone,seg);if(a.plan==='square')para.rotation.y=Math.PI/4;
 for(let i=0;i<12;i++){if(a.crown==='ruin'&&c.random()<.3)continue;const q=i*Math.PI/6,m=s.box([r*.34,.65,r*.34],[Math.sin(q)*r,h+.7,Math.cos(q)*r],stone);m.rotation.y=q;}
 for(let j=0;j<3;j++)for(let i=0;i<4;i++){const q=i*Math.PI/2,x=Math.sin(q)*r*1.055,z=Math.cos(q)*r*1.055,wh=a.windows==='arched'?1:.6,ww=a.windows==='sealed'?.14:a.windows==='slits'?.17:.5;const slit=s.box([ww,wh,.025],[x,h*(.28+j*.21),z],dark);slit.rotation.y=q;}
 if(a.crown==='roof'){const roof=s.cylinder(0,r*1.35,h*.32,[0,h*1.16+.4,0],dark,seg);if(a.plan==='square')roof.rotation.y=Math.PI/4;s.rod([0,h*1.32+.4,0],[0,h*1.4+.4,0],.04,wood);}
 const doorY=a.approach==='steps'?1.3:1;s.box([1.1,1.9,.06],[0,doorY,r*1.1],wood);for(let i=0;i<5;i++)s.box([.025,1.8,.025],[-.45+i*.225,doorY,r*1.1+.046],trim);for(const y of [-.5,.5])s.box([1.05,.08,.035],[0,doorY+y,r*1.1+.055],dark);
 if(a.approach==='steps')for(let i=0;i<4;i++)s.box([1.6,.15,1.3-i*.22],[0,.075+i*.15,r*1.25+.55-i*.11],stone);
 if(a.approach==='bridge'){s.box([1.3,.16,2.7],[0,.2,r+1.5],wood);for(const x of [-.6,.6])s.rod([x,2,r*1.1],[x,.3,r+2.85],.025,dark);}
 if(a.banner){const flag=s.material(c.mood.cheer>.5?'#a85d54':'#596b92');s.rod([r*.5,h*.77,r],[r*.5,h*.98,r],.03,dark);s.box([.6,h*.24,.018],[r*.5,h*.81,r+.04],flag);s.box([.08,h*.22,.022],[r*.5,h*.81,r+.06],trim);}
 return s.finish();}});
