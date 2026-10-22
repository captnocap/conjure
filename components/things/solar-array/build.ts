import { Sculpture, choice, score, noul, defineThing } from '@conjure/kit';
export default defineThing({questions:{
 arrangement:choice('How are the solar collectors arranged?',{row:'One long low row of panels.',field:'Two parallel rows of collectors.',tracker:'Four independent high tracking panels.'}),
 extent:score('How many collectors occupy the installation?', ['Three isolated panels','Eight panels per row']),
 cells:choice('What solar surface is used?',{blue:'Blue crystalline cells with silver grid lines.',black:'Dark modern cells with thin pale separators.',old:'Faded blue-green panels with thick old frames.'}),
 tilt:score('How steeply do the panels face the sun?', ['A nearly level ten-degree tilt','A steep sixty-degree tilt']),
 support:choice('What supports the panels?',{steel:'Thin steel posts and cross braces.',concrete:'Short concrete piers.',roof:'Low ballast blocks for a flat roof.'}),
 inverter:noul('Is an inverter cabinet installed beside the row?'),
 maintenance:noul('Is a maintenance walkway or ladder attached?'),
},build(a,c){
 const s=new Sculpture(c),n=a.arrangement==='tracker'?4:3+Math.round(a.extent*5),rows=a.arrangement==='field'?2:1,angle=.17+a.tilt*.88,metal=s.material('#a1b0b6',{metalness:.6}),cell=s.material(a.cells==='black'?'#3a5260':a.cells==='old'?'#668c91':'#476e91',{metalness:.3}),concrete=s.material('#b2b5a8'),dark=s.material('#5e747b');
 for(let z=0;z<rows;z++)for(let i=0;i<n;i++){
  const x=(i-(n-1)/2)*1.9,zz=(z-(rows-1)/2)*3,h=a.arrangement==='tracker'?2.2:1.1;
  if(a.support==='steel')s.rod([x,0,zz],[x,h,zz],.065,metal);else s.box([a.support==='roof'?1.2:.45,a.support==='roof'?.22:h,.6],[x,a.support==='roof'?.11:h/2,zz],concrete);
  if(a.support==='roof')s.rod([x,.22,zz],[x,h,zz],.055,metal);
  s.rod([x-.65,h-.5,zz],[x+.65,h,zz],.025,dark);
  const panel=s.box([1.75,.055,2.45],[x,h,zz],cell);panel.rotation.x=angle;
  for(let cx=0;cx<5;cx++){const line=s.box([.012,.012,2.45],[x+(cx-2)*.34,h+.04,zz],metal);line.rotation.x=angle;}
  for(let cz=0;cz<7;cz++){const dz=(cz-3)*.38;s.box([1.75,.012,.015],[x,h+.04-Math.sin(angle)*dz,zz+Math.cos(angle)*dz],metal).rotation.x=angle;}
 }
 if(a.inverter){s.box([.8,1.2,.65],[n*.95+1,.6,0],concrete);s.box([.55,.24,.012],[n*.95+1,.9,.332],dark);s.label('DC / AC',.6,.14,[n*.95+1,.55,.333]);}
 if(a.maintenance){s.box([n*1.9,.08,.65],[0,.09,2.2],metal);for(const x of [-n*.95,n*.95])s.rod([x,.1,2.2],[x,.9,2.2],.025,dark);}
 return s.finish();}});
