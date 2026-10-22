import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing } from '@conjure/kit';
export default defineThing({questions:{
 architecture:choice('What structure circles the orbit?',{single:'One uninterrupted habitation ring.',double:'Two concentric rings tied by radial spokes.',broken:'An incomplete ring with exposed construction ends.'}),
 diameter:score('How expansive is the ring model?', ['A compact orbital diagram','A vast structural ring']),
 crosssection:choice('What does the orbital track carry?',{rail:'A narrow transit rail with repeating sleepers.',habitat:'Wide habitation modules with bright windows.',garden:'Green enclosed garden segments.'}),
 docks:score('How many docking pylons interrupt the track?', ['Two lonely service ports','Eight busy orbital docks']),
 elevators:noul('Do elevator tethers descend toward the centre?'),
 panels:noul('Are large solar radiator wings deployed?'),
 centre:choice('What anchors the centre of the ring model?',{empty:'An empty centre showing the sheer scale of the ring.',earth:'A blue-green planetary sphere.',moon:'A crater-coloured airless body.'}),
},build(a,c){
 const s=new Sculpture(c),r=14+a.diameter*42,y=r*.35,metal=s.material('#adb8c1',{metalness:.6}),dark=s.material('#435564'),glass=s.material(a.crosssection==='garden'?'#6e9883':'#68aec0',{emissive:'#315a69',emissiveIntensity:.4}),solar=s.material('#405b8d');
 const arc=a.architecture==='broken'?Math.PI*1.7:Math.PI*2,ring=s.ring(r,r*.028,[0,y,0],metal,arc);ring.rotation.x=Math.PI/2;
 if(a.architecture==='double'){const out=s.ring(r*1.17,r*.023,[0,y,0],dark);out.rotation.x=Math.PI/2;for(let i=0;i<16;i++){const q=i*Math.PI/8;s.rod([Math.cos(q)*r,y,Math.sin(q)*r],[Math.cos(q)*r*1.17,y,Math.sin(q)*r*1.17],r*.007,metal);}}
 const segments=a.crosssection==='rail'?48:28;for(let i=0;i<segments;i++){const q=i/segments*arc;const m=s.box([r*.1,r*.05,a.crosssection==='rail'?r*.06:r*.13],[Math.cos(q)*r,y,Math.sin(q)*r],a.crosssection==='rail'?dark:metal);m.rotation.y=-q;if(a.crosssection!=='rail'){const w=s.box([r*.055,r*.028,r*.135],[Math.cos(q)*r,y+r*.005,Math.sin(q)*r],glass);w.rotation.y=-q;}}
 const n=2+Math.round(a.docks*6);for(let i=0;i<n;i++){const q=(i+.3)/n*arc,x=Math.cos(q),z=Math.sin(q);s.rod([x*r,y,z*r],[x*r*1.35,y+r*.12,z*r*1.35],r*.015,metal);const port=s.cylinder(r*.055,r*.055,r*.1,[x*r*1.35,y+r*.12,z*r*1.35],dark);port.rotation.z=Math.PI/2;port.rotation.y=-q;}
 if(a.elevators)for(let i=0;i<4;i++){const q=i*Math.PI/2;s.rod([Math.cos(q)*r,y,Math.sin(q)*r],[Math.cos(q)*r*.28,y-r*.23,Math.sin(q)*r*.28],r*.004,metal);}
 if(a.panels)for(let i=0;i<8;i++){const q=i*Math.PI/4;const p=s.box([r*.2,r*.008,r*.1],[Math.cos(q)*r*1.28,y,Math.sin(q)*r*1.28],solar);p.rotation.y=-q;}
 if(a.centre!=='empty'){s.ball([r*.29,r*.29,r*.29],[0,y-r*.15,0],s.material(a.centre==='earth'?'#6c9caf':'#b9afa0'),32);if(a.centre==='earth')s.scatter(new THREE.DodecahedronGeometry(1),s.material('#749180'),Array.from({length:24},()=>{const q=c.random()*Math.PI*2,v=c.random()*Math.PI;return {at:[Math.cos(q)*Math.sin(v)*r*.285,y-r*.15+Math.cos(v)*r*.285,Math.sin(q)*Math.sin(v)*r*.285] as const,size:r*.04};}));}
 return s.finish();}});
