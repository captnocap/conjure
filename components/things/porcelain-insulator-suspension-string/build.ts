import * as THREE from 'three';
import { Sculpture, choice, score, noul, diorama, defineThing, defineWorld, figure } from '@conjure/kit';
export default defineThing({
  questions: {
    profile: choice("What disc profile is used?", {"broad": "Broad shallow umbrella sheds.", "deep": "Deep bell-shaped porcelain sheds.", "double": "Paired narrow rain sheds.", "smooth": "Smooth rounded disc profiles."}),
    glaze: choice("What glaze covers the porcelain?", {"brown": "Glossy brown glaze.", "white": "Cream white glaze.", "green": "Muted green glaze.", "blue": "Pale blue-grey glaze."}),
    arrangement: choice("How is the string displayed?", {"vertical": "A straight vertical chain.", "angled": "A chain angled between supports.", "paired": "Two parallel suspension strings.", "horizontal": "A horizontal string on trestles."}),
    caps: choice("What caps join the discs?", {"steel": "Galvanized steel caps.", "dark": "Blackened iron caps.", "brass": "Warm brass demonstration caps.", "rust": "Rust coloured older caps."}),
    support: choice("What carries the chain?", {"frame": "A steel testing A-frame.", "wood": "A timber display frame.", "beam": "A wide overhead support beam.", "stand": "A narrow single-post stand."}),
    end: choice("What terminates the chain?", {"clevis": "A forked steel clevis.", "ring": "A large attachment ring.", "clamp": "A cable suspension clamp.", "bare": "A plain terminal pin."}),
    mark: choice("What markings are visible?", {"numbers": "Small painted disc numbers.", "stamp": "A makers stamp on the lowest disc.", "stripe": "One coloured inspection stripe.", "none": "No painted markings."}),
    state: choice("What testing state is shown?", {"sound": "All porcelain discs are sound.", "chip": "A contrasting chipped rim spot.", "reject": "A red rejection tag.", "spare": "A spare disc rests below."}),
    count: score("How long is the suspension string?", ["Three discs", "Five discs", "Eight discs"])
  },
  build(a,context){

    const s=new Sculpture(context),cer=s.material({brown:'#826348',white:'#d5d4ba',green:'#84957d',blue:'#8fa6a5'}[a.glaze],{roughness:0.24}),steel=s.material({steel:'#a2ae9f',dark:'#526052',brass:'#ac975c',rust:'#97694e'}[a.caps],{metalness:0.7}),support=s.material(a.support==='wood'?'#a28a5b':'#64796d'),n=3+Math.round(a.count*5),h=0.5+n*0.24;
    const strings=a.arrangement==='paired'?2:1;for(const x of [-0.55,0.55]){s.rod([x*1.25,0,-0.3],[x,h+0.2,0],0.04,support);s.rod([x*1.25,0,0.3],[x,h+0.2,0],0.04,support);}s.rod([-0.55,h+0.2,0],[0.55,h+0.2,0],0.045,support);if(a.support==='beam')s.box([1.5,0.14,0.18],[0,h+0.25,0],support);if(a.support==='stand')s.rod([0,0,-0.25],[0,h+0.2,-0.25],0.075,support);
    for(let k=0;k<strings;k++){const start=s.root.children.length,x=(k-(strings-1)/2)*0.5;for(let j=0;j<n;j++){const y=0.32+j*0.24,r=a.profile==='broad'?0.22:a.profile==='deep'?0.18:0.19;
      s.lathe(a.profile==='smooth'?[[0,0],[r,0.025],[r*0.8,0.08],[0.055,0.12],[0,0.12]]:[[0,0],[r,0],[r*0.95,0.035],[0.06,a.profile==='deep'?0.18:0.12],[0,0.12]],cer,[x,y,0]);if(a.profile==='double')s.cylinder(0.15,0.07,0.03,[x,y+0.1,0],cer,28);s.cylinder(0.06,0.07,0.09,[x,y+0.16,0],steel,20);s.rod([x,y+0.18,0],[x,y+0.28,0],0.02,steel);
      if(a.mark==='numbers')s.label(String(j+1),0.05,0.04,[x,y+0.05,r*0.88],'#e3d9b8','#7a7054');if(a.state==='chip'&&j===1)s.box([0.08,0.035,0.055],[x+r*0.8,y+0.02,0.05],s.material('#e1d2b0'));}
      if(a.end==='ring')s.ring(0.09,0.018,[x,0.23,0],steel);else if(a.end==='clamp')s.box([0.32,0.08,0.12],[x,0.22,0],steel);else if(a.end==='clevis')for(const xx of [x-0.05,x+0.05])s.rod([xx,0.16,0],[xx,0.3,0],0.012,steel);else s.rod([x,0.16,0],[x,0.3,0],0.02,steel);
      const g=new THREE.Group();for(const child of s.root.children.slice(start))g.add(child);if(a.arrangement==='angled'){g.rotation.z=0.2;g.position.x=0.2;}if(a.arrangement==='horizontal'){g.rotation.z=Math.PI/2;g.position.set(h/2,0.6,0);}s.root.add(g);
      if(a.arrangement==='vertical'||a.arrangement==='paired')s.rod([x,0.32+(n-1)*0.24+0.27,0],[x,h+0.2,0],0.018,steel);
    }
    if(a.arrangement==='horizontal')for(const x of [-h/2+0.3,h/2-0.3]){s.box([0.08,0.58,0.5],[x,0.29,0],support);s.box([0.3,0.05,0.5],[x,0.6,0],support);}if(a.arrangement==='angled')s.rod([0,h+0.2,0],[-Math.sin(0.2)*(0.32+(n-1)*0.24+0.27)+0.2,Math.cos(0.2)*(0.32+(n-1)*0.24+0.27),0],0.018,steel);
    if(a.mark==='stripe')s.ring(0.22,0.008,[0,0.35,0],s.material('#b1794f')).rotation.x=Math.PI/2;if(a.mark==='stamp')s.label('P 18',0.1,0.05,[0,0.36,0.18],'#5c6756','#d4cfb3');if(a.state==='reject')s.label('REJECT',0.25,0.12,[0.25,0.6,0.15],'#e6d8ba','#a6654c');if(a.state==='spare')s.cylinder(0.21,0.08,0.08,[0.6,0.04,0.3],cer,32);return s.finish();

  },
});
