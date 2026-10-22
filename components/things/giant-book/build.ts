import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing } from '@conjure/kit';
export default defineThing({questions:{
 pose:choice('How is the book presented?',{open:'An open spread resting on its covers.',closed:'A closed heavy volume with a decorated front cover.',standing:'A closed volume standing upright on its lower edge.'}),
 size:score('How monumental is the book?', ['A small hand-bound volume','A three-metre fantasy book']),
 binding:choice('What protects the pages?',{leather:'Oxide-red leather with brass corner guards.',cloth:'Deep blue cloth with embossed pale trim.',wood:'Dark wooden boards with metal straps.'}),
 content:choice('What appears on the visible pages or cover?',{text:'Orderly lines of dark manuscript.',map:'An abstract branching map with marked locations.',stars:'A constellation chart with small circles and connecting lines.'}),
 thickness:score('How many pages has the book?', ['A thin folio','A thick densely bound tome']),
 bookmark:noul('Does a ribbon bookmark trail out?'),
 clasp:noul('Is there an old metal fastening clasp?'),
},build(a,c){
 const s=new Sculpture(c),k=.3+a.size*2.7,w=k*.7,d=k,t=k*(.09+a.thickness*.16),cover=s.material(a.binding==='leather'?'#984f42':a.binding==='cloth'?'#455d7c':'#73664b'),paper=s.material('#d5cdb5'),ink=s.material('#4c5c59'),gold=s.material('#b69b60',{metalness:.5});
 if(a.pose==='open'){
  for(const side of [-1,1]){s.box([w,.035,d],[side*w*.51,.025,0],cover);s.box([w*.97,t,d*.94],[side*w*.51,.055+t/2,0],paper);const page=s.box([w,.012,d*.94],[side*w*.51,.06+t,0],paper);page.rotation.z=side*.04;}
  s.cylinder(.035,.035,d,[0,.07,0],cover).rotation.x=Math.PI/2;
  for(let j=0;j<8;j++)for(const side of [-1,1])s.box([w*.97,.008,.012],[side*w*.51,.065+j*t/8,d*.475],ink);
 }else{
  s.box([w,t,d],[0,t/2+.035,0],paper);for(const y of [.017,t+.06])s.box([w*1.05,.035,d*1.04],[0,y,0],cover);s.box([.06,t+.08,d*1.04],[-w*.52,t/2+.035,0],cover);
  for(let j=0;j<7;j++)s.box([w,.006,.012],[0,.05+j*t/7,d*.505],ink);
 }
 const top=t+.067,pages=a.pose==='open'?[-1,1]:[0];
 for(const side of pages){const cx=side*w*.51;
  if(a.content==='text')for(let j=0;j<11;j++)s.box([w*(.55+(j%3)*.07),.006,.014],[cx,top,-d*.34+j*d*.062],a.pose==='open'?ink:gold);
  if(a.content==='map')for(let j=0;j<6;j++){const x=cx+(c.random()-.5)*w*.65,z=(c.random()-.5)*d*.65;s.rod([cx,top,0],[x,top,z],.008,ink);s.ball([.02,.009,.02],[x,top,z],gold);}
  if(a.content==='stars'){const pts=Array.from({length:7},()=>[cx+(c.random()-.5)*w*.7,top,(c.random()-.5)*d*.7] as const);pts.forEach((p,i)=>{s.ball([.014,.006,.014],p,gold);if(i) s.rod(pts[i-1],p,.004,ink);});}
 }
 if(a.bookmark){const ribbon=s.box([w*.055,.012,d*.6],[w*.15,.07+t,d*.5],s.material('#ad6556'));ribbon.rotation.y=.16;}
 if(a.clasp){s.box([w*.16,.025,d*.1],[a.pose==='open'?w*.9:w*.47,t+.085,0],gold);s.box([.025,t,d*.1],[a.pose==='open'?w:w*.53,t/2+.055,0],gold);}
 if(a.pose==='standing'){s.root.rotation.x=Math.PI/2;s.root.updateMatrixWorld(true);}
 return s.finish();}});
