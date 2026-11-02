import * as THREE from 'three';
import { Sculpture, choice, score, noul, diorama, defineThing, defineWorld, figure } from '@conjure/kit';
export default defineThing({
  questions: {
    tools: choice("What tool set is displayed?", {"pair": "A croze and a howell.", "trio": "Two crozes and one howell.", "large": "One large adjustable croze.", "mixed": "A croze with a chamfer knife."}),
    fence: choice("What fence shape is used?", {"arc": "A broad curved timber fence.", "square": "A rectangular fence.", "round": "A round-bottomed fence.", "segmented": "A three-piece adjustable fence."}),
    handles: choice("What handles are fitted?", {"horns": "Two upturned horn handles.", "knobs": "Two round wooden knobs.", "bar": "A continuous transverse grip.", "plain": "An unhandled fence body."}),
    blade: choice("What cutting iron is visible?", {"narrow": "A narrow grooving iron.", "wide": "A broad smoothing blade.", "double": "Paired groove cutters.", "skew": "A skewed cutting edge."}),
    adjustment: choice("What depth adjustment is fitted?", {"screw": "A brass screw adjuster.", "wedge": "A wooden locking wedge.", "wing": "A wing-nut clamp.", "fixed": "A fixed blade setting."}),
    display: choice("How are tools presented?", {"board": "On a wooden tool board.", "tray": "In a shallow divided tray.", "rack": "On a low upright rack.", "loose": "Directly on the floor."}),
    sample: choice("What rim sample accompanies the tools?", {"groove": "A curved stave with a head groove.", "chamfer": "A bevelled rim sample.", "head": "A small head-board sample.", "none": "No sample piece."}),
    state: choice("What working detail appears?", {"ready": "Complete fitted tools.", "spare": "A spare iron beside the tools.", "shavings": "Thin curled shavings.", "rule": "A short setting rule."}),
    size: score("How large are the tools?", ["Small keg tools", "Standard cooper tools", "Large vat tools"])
  },
  build(a,context){
 const s=new Sculpture(context),wood=s.material('#a68a5e'),light=s.material('#c0a46e'),dark=s.material('#5b543f'),iron=s.material('#606f5d',{metalness:.5}),brass=s.material('#b59e63'),pale=s.material('#dfd0a7');

 const S=.8+a.size*.5,n=a.tools==='trio'?3:a.tools==='large'?1:2,Y=a.display==='rack'?.2:a.display==='loose'?0:.025,W=n*.42;if(a.display!=='loose')s.box([W+.2,.025,.6],[0,.0125,0],wood);if(a.display==='rack')for(const x of [-W*.4,W*.4])s.box([.04,.2,.4],[x,.1,0],dark);if(a.display==='tray')for(const z of [-.3,.3])s.box([W+.2,.05,.02],[0,.025,z],wood);
 for(let j=0;j<n;j++){const x=(j-(n-1)/2)*.42,g=new THREE.Group();g.position.set(x,Y,0);if(a.display==='rack')g.rotation.x=-.5;s.root.add(g);const start=s.root.children.length;if(a.fence==='arc'||a.fence==='round'){for(const y of [0,.04])s.surface((u,v,p)=>{const t=(u-.5)*Math.PI*.7,r=.23+v*.07;return p.set(Math.sin(t)*r,y,Math.cos(t)*r-.2);},wood,{segments:[20,3]});for(const r of [.23,.3])s.surface((u,v,p)=>{const t=(u-.5)*Math.PI*.7;return p.set(Math.sin(t)*r,v*.04,Math.cos(t)*r-.2);},wood,{segments:[20,2]});}else s.box([.36,.06,.16],[0,.03,0],wood);if(a.fence==='segmented')for(const xx of [-.12,.12])s.box([.025,.075,.18],[xx,.0375,0],dark);
 if(a.handles==='horns')for(const xx of [-.16,.16])s.tube([[xx,.04,0],[xx*1.2,.13,0],[xx*1.25,.18,.04]],.025,wood);if(a.handles==='knobs')for(const xx of [-.12,.12])s.ball([.04,.045,.04],[xx,.09,0],dark,12);if(a.handles==='bar')s.rod([-.22,.07,0],[.22,.07,0],.025,dark);
 for(const dx of a.blade==='double'?[-.035,.035]:[0]){const b=s.box([a.blade==='wide'?.09:.025,.012,.22],[dx,.065,.09],iron);b.rotation.y=a.blade==='skew'?.25:0;}if(a.adjustment==='screw'||a.adjustment==='wing'){s.rod([0,.03,.08],[0,.14,.08],.009,brass);if(a.adjustment==='wing')s.rod([-.04,.13,.08],[.04,.13,.08],.008,brass);else s.cylinder(.025,.025,.02,[0,.14,.08],brass,12);}if(a.adjustment==='wedge')s.box([.06,.035,.12],[0,.09,.05],light).rotation.x=.1;for(const o of s.root.children.slice(start))g.add(o);}
 if(a.sample!=='none'){const x=W/2+.2;s.box([.16,.05,.4],[x,.025,0],light);if(a.sample==='groove')s.box([.17,.006,.012],[x,.054,.12],dark);if(a.sample==='chamfer')s.box([.16,.025,.08],[x,.045,.16],wood).rotation.x=.25;if(a.sample==='head')for(let j=0;j<3;j++)s.box([.048,.012,.39],[x-.05+j*.05,.056,0],wood);}if(a.state==='spare')s.box([.05,.009,.23],[0,.0045,.4],iron);if(a.state==='rule'){s.box([.4,.008,.04],[0,.004,.4],pale);for(let j=0;j<10;j++)s.box([.003,.003,.02],[-.18+j*.04,.01,.4],dark);}if(a.state==='shavings')for(let j=0;j<4;j++)s.ring(.025,.004,[-.15+j*.1,.008,.4],light,Math.PI*1.6).rotation.x=Math.PI/2;s.root.scale.setScalar(S);return s.finish();

  },
});
