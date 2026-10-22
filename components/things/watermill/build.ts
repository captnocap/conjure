import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing } from '@conjure/kit';
export default defineThing({questions:{
 building:choice('What millhouse shelters the machinery?',{stone:'A pale stone millhouse with a steep tiled roof.',timber:'A half-timbered millhouse with cream plaster.',shed:'An open timber machine shed.'}),
 size:score('How large is the mill?', ['A small three-metre village mill','A six-metre working millhouse']),
 wheel:choice('How is the waterwheel constructed?',{wood:'A broad wooden paddle wheel.',iron:'A narrow iron wheel with scoop buckets.',double:'Two narrow wooden wheels on the same axle.'}),
 paddles:score('How many paddles circle the wheel?', ['Twelve broad paddles','Twenty-four close paddles']),
 feed:choice('How does water reach the wheel?',{channel:'A short raised wooden supply trough.',undershot:'The wheel dips into a low stone channel.',none:'No visible feed channel, only the mill mechanism.'}),
 sacks:noul('Are grain sacks stacked beside the doorway?'),
 chimney:noul('Does a small brick chimney rise above the roof?'),
},build(a,c){
 const s=new Sculpture(c),k=.75+a.size*.75,w=4*k,d=3.5*k,h=3*k,r=1.7*k,wood=s.material('#917851'),stone=s.material('#b6b19e'),wall=s.material('#d0c5aa'),roof=s.material('#926f5f'),dark=s.material('#4b6267',{metalness:.3}),wx=w*.5+r*.22;
 s.box([w,.35*k,d],[0,.175*k,0],stone);
 if(a.building!=='shed')s.box([w,h,d],[0,.35*k+h/2,0],a.building==='stone'?stone:wall);
 for(const x of [-1,1])for(const z of [-1,1])s.box([.15*k,h,.15*k],[x*w*.48,.35*k+h/2,z*d*.48],wood);
 if(a.building==='timber')for(const z of [-1,1]){s.rod([-w*.47,.4*k,z*d*.5],[w*.47,h+.3*k,z*d*.5],.04*k,wood);s.box([w,.14*k,.14*k],[0,h*.5,z*d*.5],wood);}
 for(const side of [-1,1]){const p=s.box([w*.6,.15*k,d*1.1],[side*w*.24,h+.75*k,0],roof);p.rotation.z=-side*.42;}
 s.box([.85*k,1.7*k,.025],[0,1.2*k,d*.51],wood);s.box([.6*k,.6*k,.025],[-w*.28,2*k,d*.51],dark);
 s.rod([w*.2,r+.12*k,0],[wx+.55*k,r+.12*k,0],.14*k,dark);
 const num=a.wheel==='double'?2:1,n=12+Math.round(a.paddles*12);
 for(let j=0;j<num;j++){const x=wx+j*.48*k;for(const side of [-1,1]){const ring=s.ring(r,.055*k,[x+side*.23*k,r+.12*k,0],a.wheel==='iron'?dark:wood);ring.rotation.y=Math.PI/2;for(let i=0;i<8;i++){const q=i*Math.PI/4;s.rod([x+side*.23*k,r+.12*k,0],[x+side*.23*k,r+.12*k+Math.cos(q)*r,Math.sin(q)*r],.035*k,wood);}}for(let i=0;i<n;i++){const q=i*Math.PI*2/n,p=s.box([.5*k,.16*k,.35*k],[x,r+.12*k+Math.cos(q)*r,Math.sin(q)*r],a.wheel==='iron'?dark:wood);p.rotation.x=-q;}}
 if(a.feed==='channel')s.box([.7*k,.22*k,4*k],[wx,2*r+.13*k,-2*k],wood);
 if(a.feed==='undershot'){for(const x of [-.65,.65])s.box([.25*k,.25*k,5*k],[wx+x*k,.125*k,0],stone);s.box([1.1*k,.04*k,5*k],[wx,.08*k,0],s.material('#82aaa5'));}
 if(a.sacks)for(let i=0;i<4;i++)s.ball([.22*k,.35*k,.22*k],[(i%2-.5)*.45*k,.35*k+Math.floor(i/2)*.3*k,d*.6],s.material('#c0af80'));
 if(a.chimney)s.box([.4*k,1.4*k,.4*k],[-w*.25,h+1.2*k,-d*.2],roof);
 return s.finish();}});
