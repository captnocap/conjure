import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing, figure } from '@conjure/kit';
const questions = {
  form: choice("What kind of fermentation weight is used?", {"halves": "Two semicircular ceramic half weights.", "disc": "A single heavy round disk with a finger hole.", "stones": "Three smooth river stones.", "cross": "Two crossed wood pressing boards.", "rings": "Two thick ceramic ring weights."}),
  state: choice("How are the weights arranged?", {"paired": "The pieces are fitted into a circle.", "apart": "The paired weights lie apart to dry.", "stacked": "The weights are stacked for storage.", "leaf": "A broad cabbage leaf lies beneath them.", "lift": "One weight rests on its edge in a drying cradle."}),
  detail: choice("What material is visible?", {"cream": "Pale unglazed ceramic.", "brown": "Brown stoneware.", "stone": "Grey river stone.", "green": "Muted green glazed clay.", "dark": "Dark charcoal stone."}),
  support: choice("What holds the weights?", {"board": "A low round wood board.", "cloth": "A folded cotton cloth.", "tray": "A shallow metal tray.", "mat": "A woven rush mat.", "bare": "A clear worktop."}),
  extra: choice("What rests beside them?", {"jar": "A little brine sample jar.", "leaf": "A loose cabbage leaf.", "cord": "A short lifting cord.", "brush": "A small cleaning brush.", "none": "Only the weights."}),
  mark: choice("What identifies the set?", {"dots": "Two small matching incised dots.", "number": "A stamped 02 on each piece.", "blue": "A blue edge stripe.", "holes": "Paired finger recess marks.", "plain": "No marking."}),
  extent: score("How broad is the weight set?", ["For a small jar", "For a family crock", "For a large preserving pot"]),
  load: score("How thick are the weights?", ["Thin light weights", "Heavy household weights", "Thick stone pressers"]),
  closed: noul("Is a small cloth drying cover folded beside them?"),
};
export default defineThing({
  questions,
  build(a, context) {
    const s = new Sculpture(context), { random, mood } = context;
    const f = Object.keys(questions.form.options).indexOf(a.form), t = Object.keys(questions.state.options).indexOf(a.state), d = Object.keys(questions.detail.options).indexOf(a.detail), u = Object.keys(questions.support.options).indexOf(a.support), e = Object.keys(questions.extra.options).indexOf(a.extra), m = Object.keys(questions.mark.options).indexOf(a.mark);
    const wood = s.material('#a47c4e'), pale = s.material('#e0d2ac'), metal = s.material('#8f9995', { metalness: 0.7, roughness: 0.35 }), dark = s.material('#3d443c'), green = s.material('#667e50');
    const colors = ['#a64d39', '#497e70', '#d4af55', '#59778c', '#b47b8c'];

    const r=.12+a.extent*.09,h=.025+a.load*.035,base=u===4?0:.012,mat=s.material(['#d3c6a5','#a28a65','#959c8a','#8c9f7d','#5c6758'][d]);if(u===0||u===3)s.cylinder(r*1.35,r*1.35,base,[0,base/2,0],u===0?wood:pale,28);if(u===1)s.box([r*2.6,base,r*2.4],[0,base/2,0],pale);if(u===2)s.box([r*2.7,base,r*2.5],[0,base/2,0],metal);if(t===3)s.ball([r*1.1,.004,r*.9],[0,base+.004,0],green,20);
    const n=f===2?3:f===1?1:2;for(let i=0;i<n;i++){let x=t===1||f===4&&t!==2?(i-(n-1)/2)*r*1.45:0,y=base+h/2+(t===2?i*h:0),z=0;let mesh:THREE.Object3D;if(f===0){const shape=new THREE.Shape();shape.absarc(0,0,r,0,Math.PI,false);shape.lineTo(r,0);const geo=new THREE.ExtrudeGeometry(shape,{depth:h,bevelEnabled:false,curveSegments:20});geo.rotateX(-Math.PI/2);mesh=s.mesh(geo,mat,[x,base+(t===2?i*h:0),0]);mesh.rotation.y=i*Math.PI;if(t===1)mesh.position.z=(i-.5)*.02;}else if(f===1||f===4){mesh=s.ring(f===1?r*.8:r*.7,f===1?r*.3:r*.2,[x,y,z],mat);mesh.rotation.x=Math.PI/2;mesh.scale.z=h/(f===1?r*.6:r*.4);}else if(f===2){x=t===2?0:(i-1)*r*.75;mesh=s.ball([r*.52,h*.65,r*.45],[x,base+h*.65+(t===2?i*h:0),0],mat,16);}else{mesh=s.box([r*2,h,r*.55],[x,y,0],wood);mesh.rotation.y=i*Math.PI/2;}if(t===4&&i===0){mesh.rotation.z=.75;mesh.position.y=base+r*.7;s.box([r*2,.025,r*.4],[0,.012,0],wood);s.rod([r*.5,0,0],[r*.5,r*.75,0],.012,wood);}if((m===0||m===3)&&!(t===4&&i===0)&&f!==1&&f!==4)for(const dz of [-.025,.025])s.ball([.01,.001,.01],[x,base+h+.002+(t===2?i*h:0),dz],dark,10);if(m===1&&!(t===4&&i===0))s.label('02',.04,.025,[x+(f===1||f===4?r*.75:0),base+h+.003,0]).rotation.x=-Math.PI/2;if(m===2&&f!==0&&!(t===4&&i===0))s.ring(r*(f===2?.43:.7),.004,[x,base+h*.8,0],s.material('#657f94')).rotation.x=Math.PI/2;}
    const x=r*1.7;if(e===0){s.cylinder(.04,.04,.08,[x,.04,0],s.material('#adbeaa',{transparent:true,opacity:.4,depthWrite:false}),18);s.cylinder(.042,.042,.012,[x,.086,0],metal,18);}if(e===1)s.ball([.09,.005,.06],[x,.005,0],green,16);if(e===2)s.ring(.05,.004,[x,.004,0],pale).rotation.x=Math.PI/2;if(e===3){s.box([.07,.015,.035],[x,.025,0],wood);s.box([.07,.025,.035],[x,.013,0],pale);}if(a.closed)s.box([.15,.015,.13],[-r*1.7,.008,0],pale);return s.finish();
  },
});
