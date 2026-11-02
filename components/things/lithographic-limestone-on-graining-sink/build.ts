import * as THREE from 'three';
import { Sculpture, choice, score, noul, diorama, defineThing, defineWorld, figure } from '@conjure/kit';
export default defineThing({
  questions: {
    sink: choice("What basin supports the stone?", {"stone": "A thick masonry graining sink.", "wood": "A planked waterproof sink.", "iron": "A thin iron trough.", "twin": "Two adjacent wet compartments."}),
    stand: choice("How is the sink raised?", {"legs": "Four stout wooden legs.", "piers": "Two broad masonry piers.", "skids": "A low pair of timber runners.", "bench": "A long braced workbench."}),
    slab: choice("What shape is the printing stone?", {"square": "A broad square slab.", "long": "A long rectangular slab.", "bevel": "A slab with bevelled corner strips.", "pair": "Two smaller slabs side by side."}),
    position: choice("Where is the stone being worked?", {"flat": "Flat across two supporting rails.", "tilted": "The stone leans slightly on a wedge.", "aside": "Stone shifted to one end of the sink.", "empty": "The sink contains only its supporting rails."}),
    levigator: choice("What graining tool is fitted?", {"disk": "A broad round graining disk with a bridge handle.", "bar": "A rectangular rubbing block.", "pair": "Two small rubbing stones.", "none": "No tool rests on the slab."}),
    water: choice("How is water supplied?", {"tap": "A high curved tap above the basin.", "jug": "A handled pouring jug on the side shelf.", "pipe": "A low perforated rinse pipe.", "none": "No fixed water supply."}),
    drain: choice("How does runoff leave?", {"spout": "A short open runoff spout.", "elbow": "A downward bent drain pipe.", "bucket": "A bucket below a side spout.", "plug": "A closed drain plug."}),
    abrasive: choice("What grit supplies are present?", {"bowls": "Three shallow abrasive bowls.", "jars": "Two capped grit jars.", "tray": "A divided grit tray.", "clear": "An uncluttered side shelf."}),
    rail: choice("What holds the slab above runoff?", {"slats": "Three narrow support slats.", "bars": "Two round iron support bars.", "blocks": "Four small stone bearing blocks.", "grid": "A rectangular lattice support."}),
    state: choice("What preparation stage is visible?", {"wet": "Shallow water surrounds the stone.", "chalk": "Crossed pencil lines check flatness.", "ready": "A clean prepared stone.", "scrape": "A scraper lies on the sink rim."}),
    width: score("How broad is the graining station?", ["Small graining sink", "Standard workshop sink", "Large stone preparation sink"])
  },
  build(a,context){
 const s=new Sculpture(context),wood=s.material('#9b805b'),light=s.material('#c0a97d'),iron=s.material('#536b61',{metalness:.42}),dark=s.material('#3e4b42'),stone=s.material('#c4c3a6'),paper=s.material('#eee4c5',{side:THREE.DoubleSide}),leather=s.material('#78644b'),water=s.material('#93b6a7',{transparent:true,opacity:.5,depthWrite:false});

 const W=1.1+a.width*.6,D=.85,Y=a.stand==='skids'?.16:.68,H=.26,mat=a.sink==='stone'?stone:a.sink==='iron'?iron:wood;
 if(a.stand==='piers')for(const x of [-W*.35,W*.35])s.box([.28,Y,.7],[x,Y/2,0],stone);else if(a.stand==='skids')for(const z of [-.3,.3])s.box([W+.2,.16,.12],[0,.08,z],wood);else{for(const x of [-W*.42,W*.42])for(const z of [-.32,.32])s.box([.09,Y,.1],[x,Y/2,z],wood);if(a.stand==='bench')for(const z of [-.3,.3])s.rod([-W*.42,.1,z],[W*.42,Y-.1,z],.025,wood);}
 s.box([W,.08,D],[0,Y-.04,0],mat);for(const z of [-D/2,D/2])s.box([W,H,.06],[0,Y+H/2,z],mat);for(const x of [-W/2,W/2])s.box([.06,H,D],[x,Y+H/2,0],mat);if(a.sink==='twin')s.box([.05,H,D],[0,Y+H/2,0],mat);
 const by=Y+H+.02;for(const x of a.rail==='slats'?[-W*.3,0,W*.3]:[-W*.3,W*.3])if(a.rail==='bars')s.rod([x,by,-.48],[x,by,.48],.025,iron);else if(a.rail==='blocks')for(const z of [-.28,.28])s.box([.12,.06,.12],[x,by,z],stone);else s.box([.09,.05,1],[x,by,0],wood);if(a.rail==='grid')for(const z of [-.28,0,.28])s.box([W*.8,.05,.07],[0,by,z],wood);
 const sy=by+.09,sx=a.position==='aside'?W*.16:0,sw=a.slab==='long'?W*.75:W*.6,sd=a.slab==='long'?.45:.66;if(a.position!=='empty'){const g=new THREE.Group();s.root.add(g);g.position.set(sx,sy,0);const prior=s.root.children.slice();for(const x of a.slab==='pair'?[-sw*.26,sw*.26]:[0])s.box([a.slab==='pair'?sw*.46:sw,.12,sd],[x,0,0],stone);if(a.slab==='bevel')for(const z of [-sd*.47,sd*.47])s.box([sw,.035,.05],[0,.055,z],light);if(a.position==='tilted')s.box([sw*.7,.07,.15],[0,-.075,-.22],wood);
 if(a.levigator!=='none'){for(const x of a.levigator==='pair'?[-.13,.13]:[0]){if(a.levigator==='bar')s.box([.34,.07,.2],[x,.095,0],dark);else s.cylinder(a.levigator==='pair'?.09:.17,a.levigator==='pair'?.09:.17,.065,[x,.0925,0],dark,24);for(const xx of [-.055,.055])s.rod([x+xx,.125,0],[x+xx,.22,0],.012,wood);s.rod([x-.055,.22,0],[x+.055,.22,0],.014,wood);}}
 if(a.state==='chalk')for(const x of [-sw*.3,0,sw*.3])s.rod([x,.062,-sd*.4],[x+.05,.062,sd*.4],.002,dark);for(const obj of s.root.children.slice())if(!prior.includes(obj))g.add(obj);if(a.position==='tilted')g.rotation.x=.1;}
 const rx=W/2+.19;s.box([.38,.06,.8],[rx,Y+H-.02,0],wood);for(const z of [-.3,.3])s.rod([W/2,Y-.05,z],[rx+.12,Y+H-.05,z],.025,wood);
 if(a.water==='tap'){s.tube([[-W*.4,Y,-.4],[-W*.4,Y+.65,-.4],[-W*.4,Y+.68,-.15],[-W*.4,Y+.57,-.1]],.025,iron);s.rod([-W*.46,Y+.4,-.4],[-W*.34,Y+.4,-.4],.018,wood);}if(a.water==='pipe'){s.rod([-W*.4,Y+.34,-.35],[W*.4,Y+.34,-.35],.025,iron);for(const x of [-W*.4,W*.4])s.rod([x,Y,-.35],[x,Y+.34,-.35],.018,iron);}if(a.water==='jug'){s.lathe([[0,0],[.08,0],[.1,.18],[.065,.25],[.055,.25],[.08,.03],[0,.03]],stone,[rx,Y+H+.01,-.17]);s.ring(.07,.012,[rx+.09,Y+H+.14,-.17],iron);}
 if(a.drain!=='plug'){s.tube([[W/2,Y+.05,.1],[W/2+.22,Y+.05,.1],[W/2+.22,a.drain==='spout'?Y+.05:Y-.07,.1]],.035,iron);if(a.drain==='bucket')s.lathe([[0,0],[.13,0],[.18,.35],[.16,.35],[.11,.02],[0,.02]],iron,[W/2+.22,0,.1]);}else s.cylinder(.035,.035,.04,[W/2+.02,Y+.05,.1],dark,16).rotation.z=Math.PI/2;
 if(a.abrasive==='bowls')for(let j=0;j<3;j++)s.lathe([[0,0],[.07,0],[.085,.06],[.075,.06],[0,.015]],light,[rx,Y+H+.01,-.25+j*.25]);if(a.abrasive==='jars')for(const z of [-.18,.18]){s.cylinder(.08,.08,.15,[rx,Y+H+.085,z],stone,20);s.cylinder(.085,.085,.025,[rx,Y+H+.17,z],wood,20);}if(a.abrasive==='tray'){s.box([.3,.035,.6],[rx,Y+H+.028,0],light);for(const z of [-.3,0,.3])s.box([.3,.07,.02],[rx,Y+H+.065,z],wood);}if(a.state==='wet')s.box([W-.1,.012,D-.1],[0,Y+.1,0],water);if(a.state==='scrape')s.box([.28,.025,.065],[0,Y+H+.045,.45],iron);
return s.finish();
  },
});
