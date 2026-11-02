import * as THREE from 'three';
import { Sculpture, choice, score, noul, diorama, defineThing, defineWorld, figure } from '@conjure/kit';
export default defineThing({
  questions: {
    shape: choice("What insulator is the mould for?", {"pin": "A short pin-type insulator.", "post": "A tall multi-shed post.", "disc": "A broad suspension disc.", "spool": "A compact spool insulator."}),
    opening: choice("How are the halves arranged?", {"open": "Two halves opened side by side.", "book": "The halves open like a book.", "closed": "The two halves are strapped together.", "one": "One half stands alone."}),
    plaster: choice("What colour is the plaster?", {"white": "Bright white plaster.", "cream": "Cream aged plaster.", "grey": "Cool grey casting plaster.", "pink": "Faintly pink tinted plaster."}),
    keys: choice("What locates the two halves?", {"round": "Round registration keys.", "square": "Square alignment keys.", "metal": "Small brass locating pins.", "none": "Plain mating faces."}),
    gate: choice("Where is the pouring gate?", {"top": "A funnel opening at the top.", "side": "A short side pouring channel.", "double": "Two narrow top gates.", "sealed": "The gate is plugged with clay."}),
    straps: choice("What binds the mould?", {"rope": "Two rope ties.", "rubber": "Broad rubber bands.", "clamp": "Two steel clamps.", "none": "No bindings are present."}),
    casting: choice("What has been cast?", {"empty": "An empty mould cavity.", "green": "A pale greenware casting nearby.", "slip": "White slip pooled at the mouth.", "broken": "A broken casting beside the mould."}),
    state: choice("What production detail appears?", {"clean": "Clean ready-to-cast mould.", "stained": "Darkened cavity surfaces.", "number": "A large mould number.", "repair": "A patched plaster corner."}),
    height: score("How tall is the mould?", ["A small mould", "A working mould", "A tall industrial mould"])
  },
  build(a,context){

    const s=new Sculpture(context),plaster=s.material({white:'#dedbc6',cream:'#c9c0a0',grey:'#b7c0b2',pink:'#cfb5a2'}[a.plaster]),inside=s.material(a.state==='stained'?'#92977d':'#aab39c'),clay=s.material('#bfc4a4'),metal=s.material('#778878'),rope=s.material('#a29165'),h=0.45+a.height*0.4,r=a.shape==='disc'?0.22:0.13;
    const halves=a.opening==='one'?1:2;for(let k=0;k<halves;k++){const start=s.root.children.length;const x=a.opening==='closed'?(k-0.5)*0.25:(k-0.5)*0.7;s.box([0.5,h,0.25],[0,h/2,-0.1],plaster);s.box([r*1.4,h*0.74,0.015],[0,h*0.5,0.033],inside);
      const count=a.shape==='post'?5:a.shape==='pin'?3:a.shape==='spool'?2:1;for(let j=0;j<count;j++){const y=count===1?h/2:0.14+j*(h-0.28)/Math.max(1,count-1);s.cylinder(r,r,0.045,[0,y,0.04],inside,32).rotation.x=Math.PI/2;s.ring(r,0.015,[0,y,0.05],plaster,Math.PI).rotation.z=Math.PI;}
      if(a.keys!=='none')for(const xx of [-0.19,0.19])for(const yy of [h*0.12,h*0.88]){if(a.keys==='square')s.box([0.05,0.05,0.025],[xx,yy,0.04],plaster);else s.cylinder(0.025,0.025,0.03,[xx,yy,0.05],a.keys==='metal'?metal:plaster,16).rotation.x=Math.PI/2;}
      if(a.gate==='top'||a.gate==='double')for(const xx of a.gate==='double'?[-0.06,0.06]:[0])s.box([0.06,h*0.2,0.02],[xx,h*0.9,0.04],inside);if(a.gate==='side')s.box([0.25,0.06,0.02],[0.12,h*0.65,0.04],inside);if(a.gate==='sealed')s.ball([0.07,0.04,0.05],[0,h,0],clay,16);
      const g=new THREE.Group();for(const c of s.root.children.slice(start))g.add(c);g.position.x=x;if(a.opening==='book')g.rotation.y=k?-.5:.5;if(a.opening==='closed'&&k)g.rotation.y=Math.PI;s.root.add(g);}
    if(a.straps!=='none'&&a.opening==='closed')for(const y of [h*0.25,h*0.75])s.tube([[-0.4,y,-0.25],[-0.4,y,0.15],[0.4,y,0.15],[0.4,y,-0.25],[-0.4,y,-0.25]],a.straps==='rubber'?0.025:0.012,a.straps==='clamp'?metal:rope);
    if(a.casting==='green')for(let j=0;j<3;j++)s.cylinder(0.15,0.08,0.07,[0.75,0.035+j*0.07,0.1],clay,24);if(a.casting==='broken')for(let j=0;j<5;j++)s.box([0.1,0.04,0.08],[0.6+context.random()*0.2,0.025,(context.random()-0.5)*0.3],clay).rotation.y=j;if(a.casting==='slip')s.ball([0.1,0.012,0.09],[a.opening==='one'?0:a.opening==='closed'?-0.125:-0.35,h+0.006,-0.1],s.material('#e0d9bd'),16);
    if(a.state==='number')s.label('MOULD 16',0.3,0.12,[-0.35,h*0.5,-0.23],'#6e775f','#d5cbae').rotation.y=Math.PI;if(a.state==='repair')s.box([0.12,0.12,0.26],[-0.54,h-0.06,-0.1],s.material('#e2d8b7'));return s.finish();

  },
});
