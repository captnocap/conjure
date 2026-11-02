import * as THREE from 'three';
import { Sculpture, choice, score, noul, diorama, defineThing, defineWorld, figure } from '@conjure/kit';
export default defineWorld({
  questions: {
    architecture: choice("What is the room architecture?", {"vault": "A high barrel-vault rib structure.", "timber": "A steep timber roof frame.", "gallery": "A two-level workshop gallery.", "loft": "A low sloping attic loft."}),
    floor: choice("What working floor is used?", {"boards": "Long timber floorboards.", "tiles": "Large stone floor tiles.", "platform": "A raised central testing platform.", "split": "Two stepped working levels."}),
    storage: choice("What fixed pipe storage is present?", {"tall": "Tall vertical pipe bays.", "shelves": "Long horizontal pipe shelves.", "fans": "Fan-shaped end-wall racks.", "clear": "Clear back walls."}),
    wind: choice("How is wind carried across the room?", {"trunk": "A square timber wind trunk.", "pipe": "A large round wind pipe.", "floor": "Wind trunks run along the floor.", "hidden": "No exposed wind supply."}),
    light: choice("What openings admit light?", {"clerestory": "High clerestory openings.", "gable": "A tall gable-end window.", "side": "Three narrow side windows.", "roof": "Rooflight frames."}),
    bench: choice("What fixed workbench is fitted?", {"long": "A long wall bench.", "corner": "An L-shaped corner bench.", "islands": "Two small freestanding tables.", "clear": "No fixed benches."}),
    acoustic: choice("What acoustic surfaces are visible?", {"slats": "Vertical timber wall slats.", "panels": "Large hanging acoustic panels.", "curtain": "A heavy end-wall curtain.", "bare": "Plain plaster walls."}),
    state: choice("What work stage is shown?", {"ready": "The testing room is ready.", "delivery": "Two empty transport trestles.", "notes": "A large voicing chart.", "quiet": "A low listening barrier."}),
    width: score("How broad is the voicing room?", ["Small organ workshop", "Standard voicing room", "Large church-organ shop"])
  },
  build(a,context){

 const W=9+a.width*3,D=9;const {world,art:s}=diorama(context,{width:W,depth:D,background:'#e0dfd3',floor:'#b9ac8a',radius:1,maxHeight:2.6,pitch:33,yaw:29,scale:[.65,1.35],slots:[[-2.7,1.5,.12],[0,1.7,.12],[2.8,1,.12],[-1.5,-.8,.12]]});const wood=s.material('#a48d66'),pale=s.material('#d7cdb0'),dark=s.material('#5a6454'),metal=s.material('#a0a99a');s.box([W,.12,D],[0,.06,0],wood);s.box([W,3,.16],[0,1.62,-4.2],pale);for(const x of [-W/2+.15,W/2-.15])s.box([.15,1.2,8],[x,.72,0],pale);
 if(a.floor==='boards')for(let j=0;j<20;j++)s.box([.012,.005,8.8],[-W*.48+j*W*.96/19,.124,0],dark);if(a.floor==='tiles')for(let j=0;j<9;j++){s.box([W,.005,.012],[0,.124,-4+j],dark);s.box([.012,.005,9],[-4+j,.124,0],dark);}if(a.floor==='platform')s.box([3,.15,2],[0,.195,-2],wood);if(a.floor==='split')s.box([W,.3,2],[0,.27,-3.2],wood);
 if(a.architecture==='vault')for(const z of [-3.6,0,3]){const r=W*.43;for(const x of [-r,r])s.rod([x,.12,z],[x,2.8,z],.08,wood);s.ring(r,.09,[0,2.8,z],wood,Math.PI);}else if(a.architecture==='gallery'){s.box([W,.15,1.3],[0,2.9,-3.5],wood);for(const x of [-W*.44,W*.44])s.rod([x,.12,-3.1],[x,3.7,-3.1],.06,wood);s.rod([-W*.44,3.7,-3.1],[W*.44,3.7,-3.1],.035,dark);}else for(const z of [-3.6,0,3]){for(const x of [-W*.46,W*.46])s.rod([x,.12,z],[x,3.2,z],.07,wood);s.rod([-W*.46,3.2,z],[0,a.architecture==='loft'?3.8:5.2,z],.08,wood);s.rod([0,a.architecture==='loft'?3.8:5.2,z],[W*.46,3.2,z],.08,wood);}
 if(a.storage==='tall')for(let j=0;j<7;j++){const x=-W*.4+j*W*.8/6;s.box([.7,2.4,.55],[x,1.32,-3.8],wood);for(let k=0;k<3;k++)s.rod([x-.18+k*.18,.25,-3.45],[x-.18+k*.18,1.6+k*.35,-3.45],.045,metal);}if(a.storage==='shelves')for(const y of [.7,1.4,2.1]){s.box([W*.8,.08,.6],[0,y,-3.8],wood);for(const x of [-W*.37,W*.37])s.rod([x,.12,-3.8],[x,2.2,-3.8],.04,wood);s.rod([-W*.3,y+.12,-3.7],[W*.3,y+.12,-3.7],.1,metal);}if(a.storage==='fans')for(let j=0;j<9;j++)s.rod([0,.3,-3.7],[(j-4)*.5,2.3,-3.7],.045,metal);
 if(a.wind==='trunk')s.box([W*.8,.3,.3],[0,.32,-2.9],wood);if(a.wind==='pipe')s.rod([-W*.4,.45,-2.9],[W*.4,.45,-2.9],.14,metal);if(a.wind==='floor')for(const x of [-2,2])s.box([.25,.25,5],[x,.245,-.8],wood);
 if(a.wind==='trunk'||a.wind==='pipe')for(const x of [-W*.3,0,W*.3])s.box([.3,a.wind==='pipe'?.2:.08,.4],[x,a.wind==='pipe'?.22:.16,-2.9],wood);
 if(a.light==='roof')for(const z of [-1.7,-.3]){for(const x of [-W*.46,W*.46])s.rod([x,.12,z],[x,3.6,z],.06,wood);s.rod([-W*.46,3.6,z],[W*.46,3.6,z],.06,wood);}
 if(a.light==='clerestory')for(let j=0;j<5;j++)s.box([1,.55,.02],[-W*.35+j*W*.7/4,2.6,-4.105],metal);if(a.light==='gable')s.box([1.8,1.8,.02],[0,2.15,-4.105],metal);if(a.light==='side')for(const z of [-2.5,0,2.5])s.box([.025,1,.6],[-W/2+.24,1.7,z],metal);if(a.light==='roof')for(const x of [-2,2]){s.box([1.2,.04,1.5],[x,3.6,-1],metal);for(const z of [-1.7,-.3])s.rod([x-.6,3.6,z],[x+.6,3.6,z],.04,wood);}
 const bench=(x:number,z:number,w:number,d:number)=>{s.box([w,.08,d],[x,.92,z],wood);for(const xx of [-w*.4,w*.4])for(const zz of [-d*.35,d*.35])s.rod([x+xx,.12,z+zz],[x+xx,.88,z+zz],.035,wood);};if(a.bench==='long')bench(0,-2.6,W*.65,.6);if(a.bench==='corner'){bench(W/2-1,-1.5,1,2.5);bench(W/2-2.2,-2.6,2.5,.6);}if(a.bench==='islands'){bench(-W*.35,-.5,1.3,.7);bench(W*.35,-.5,1.3,.7);}
 if(a.acoustic==='slats')for(let j=0;j<26;j++)s.box([.08,2.5,.08],[-W*.47+j*W*.94/25,1.45,-4.05],wood);if(a.acoustic==='panels')for(const x of [-W*.3,0,W*.3])s.box([1.2,1.5,.15],[x,1.9,-4],wood);if(a.acoustic==='curtain')for(let j=0;j<20;j++)s.cylinder(.09,.09,2.5,[-W*.43+j*W*.86/19,1.45,-3.95],dark,12);
 if(a.state==='delivery')for(const x of [-1.2,1.2]){s.box([1,.08,.4],[x,.65,3.1],wood);for(const dx of [-.4,.4])s.rod([x+dx,.12,3.1],[x+dx,.61,3.1],.04,wood);}if(a.state==='notes')s.label('VOICING',1.4,.6,[0,2,-3.98],'#e4dbb8','#61563f');if(a.state==='quiet'){for(const x of [-2,2])s.rod([x,.12,3.2],[x,.9,3.2],.035,wood);s.rod([-2,.9,3.2],[2,.9,3.2],.025,dark);}return world;

  },
});
