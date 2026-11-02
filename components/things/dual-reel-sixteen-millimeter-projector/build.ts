import * as THREE from 'three';
import { Sculpture, choice, score, defineThing } from '@conjure/kit';

export default defineThing({
  questions: {
    cabinet: choice('What sort of projector cabinet is it?', { portable: 'A compact green school projector on rubber feet.', chrome: 'A silver travel projector with black panels.', bakelite: 'A rounded brown early projector.', theatre: 'A tall cream projection head on a short pedestal.' }),
    reels: choice('What reels are mounted?', { large: 'Two large open six-spoked reels.', small: 'Two compact three-spoked reels.', mixed: 'A large supply reel and a small take-up reel.', empty: 'Only the supply reel; the take-up spindle is bare.' }),
    threading: choice('What is happening to the film?', { running: 'A taut strip follows the gate and both reels.', leader: 'A pale leader is threaded through the gate.', spill: 'A loose loop of brown film spills down beside the machine.', unthreaded: 'The film path is empty and the gate is open.' }),
    panel: choice('How is the side cover arranged?', { shut: 'The side cover is shut, its ventilation slots visible.', open: 'The removed cover leans beside the machine and exposes gears.', hinged: 'A service flap hangs open below the film gate.', absent: 'The lamp housing is exposed without its cover.' }),
    lens: choice('Which lens is fitted?', { normal: 'A short black projection lens.', long: 'A long telephoto lens with bright metal focus rings.', anamorphic: 'A broad oval anamorphic attachment.', missing: 'An empty lens socket with no glass.' }),
    lamp: choice('What can be seen through the lens?', { dark: 'A dark unlit lens.', warm: 'A warm amber lamp glows behind the glass.', white: 'A cool white projector lamp shines.', test: 'A red maintenance light glows in the gate.' }),
    handle: choice('Where is the carrying handle?', { up: 'A rigid handle arches above the cabinet.', folded: 'The carrying handle is folded against the top.', strap: 'A leather carrying strap hangs beside it.', none: 'No handle remains; two mounting lugs are exposed.' }),
    companion: choice('What stands beside the projector?', { none: 'Nothing, just the projector.', speaker: 'A matching perforated speaker cabinet.', case: 'An open fitted carrying case.', control: 'A wired remote speed control lies on the floor.' }),
    focus: score('How far is the focus barrel extended?', ['Fully retracted', 'Partly extended', 'Fully extended']),
    history: choice('What note is attached to the machine?', { hired: 'A small HIRE RETURN tag.', repaired: 'A green TESTED tag.', faulty: 'A large red LAMP FAULT card.', archive: 'A cream ARCHIVE 16 label.' }),
  },
  build(a, context) {
    const s = new Sculpture(context);
    const body = s.material({portable:'#627b69',chrome:'#b4b9b7',bakelite:'#614535',theatre:'#d1c7ab'}[a.cabinet], {metalness:a.cabinet==='chrome'?0.7:0.15,roughness:0.45+context.mood.wear*0.35});
    const black=s.material('#262c2c'), metal=s.material('#a8ada9',{metalness:0.8,roughness:0.3}), film=s.material(a.threading==='leader'?'#e5dac2':'#5c3827'), amber=s.material(a.lamp==='test'?'#b13d25':'#ead79b',{emissive:a.lamp==='white'?'#ffffff':a.lamp==='test'?'#e94722':'#e6b35d',emissiveIntensity:a.lamp==='dark'?0:0.7+context.mood.energy*0.6});
    const lift=a.cabinet==='theatre'?0.22:0;
    s.box([0.37,0.045,0.27],[0,0.035,0],black);
    for(const x of [-0.14,0.14])for(const z of [-0.09,0.09])s.cylinder(0.018,0.024,0.025,[x,0.013,z],black,12);
    if(lift)s.box([0.11,lift,0.11],[0,0.06+lift/2,0],body);
    s.box([0.34,0.35,0.2],[0,0.235+lift,0],body);
    s.box([0.19,0.25,0.02],[-0.035,0.235+lift,0.112],black);
    for(let j=0;j<7;j++)s.box([0.1,0.008,0.008],[0.105,0.15+lift+j*0.025,0.109],black);
    const reels: THREE.Group[]=[];
    const reel=(x:number,y:number,r:number,spokes:number)=>{
      const start=s.root.children.length;
      s.ring(r,0.008,[0,0,0],metal);
      s.ring(r*0.83,0.004,[0,0,-0.025],metal);
      const hub=s.cylinder(0.027,0.027,0.06,[0,0,-0.01],black,16);hub.rotation.x=Math.PI/2;
      for(let i=0;i<spokes;i++){const t=i*Math.PI*2/spokes; s.rod([Math.cos(t)*0.025,Math.sin(t)*0.025,0],[Math.cos(t)*r,Math.sin(t)*r,0],0.012,metal);}
      const roll=s.cylinder(r*0.66,r*0.66,0.018,[0,0,-0.02],film,40);roll.rotation.x=Math.PI/2;
      const group=new THREE.Group();for(const child of s.root.children.slice(start))group.add(child);group.position.set(x,y,0.16);s.root.add(group);reels.push(group);
    };
    const r=a.reels==='small'?0.115:0.18;
    for(const [x,y] of [[-0.2,0.55+lift],[0.22,0.5+lift]])s.rod([0,0.37+lift,0.08],[x,y,0.12],0.018,metal);
    reel(-0.2,0.55+lift,r,a.reels==='small'?3:6);
    if(a.reels!=='empty')reel(0.22,0.5+lift,a.reels==='mixed'?0.11:r,a.reels==='small'?3:6);else s.rod([0.22,0.5+lift,0.08],[0.22,0.5+lift,0.18],0.015,metal);
    if(a.threading!=='unthreaded')s.tube([[-0.2+r,0.55+lift,0.15],[-0.07,0.41+lift,0.14],[-0.08,0.19+lift,0.14],[0.12,0.17+lift,0.14],[0.22,0.5+lift-r,0.15]],0.006,film);
    if(a.threading==='spill')s.tube([[-0.09,0.2+lift,0.18],[-0.32,0.12,0.23],[-0.4,0.025,0.1],[-0.28,0.02,-0.03],[-0.21,0.16,0.12]],0.007,film);
    const length=(a.lens==='long'?0.18:0.09)+a.focus*0.06;
    const lens=s.cylinder(0.045,0.05,length,[0.025,0.23+lift,0.14+length/2],black,32);lens.rotation.x=Math.PI/2;
    if(a.lens!=='missing'){
      for(let j=0;j<3;j++)s.ring(0.047,0.004,[0.025,0.23+lift,0.18+j*length/4],metal);
      const glass=s.cylinder(0.038,0.038,0.006,[0.025,0.23+lift,0.145+length],amber,32);glass.rotation.x=Math.PI/2;if(a.lens==='anamorphic')glass.scale.x=1.7;
    }
    if(a.panel==='open'){s.box([0.22,0.28,0.015],[-0.31,0.14,0],body).rotation.z=-0.2;}
    if(a.panel!=='shut')for(let i=0;i<3;i++){s.ring(0.035+i*0.006,0.008,[-0.08+i*0.075,0.25+lift+(i%2)*0.08,0.128],metal);}
    if(a.panel==='hinged')s.box([0.16,0.014,0.12],[-0.02,0.105+lift,0.18],body);
    if(a.handle==='up')s.tube([[-0.1,0.42+lift,0],[-0.1,0.49+lift,0],[0.08,0.49+lift,0],[0.08,0.42+lift,0]],0.012,black);
    if(a.handle==='folded')s.box([0.2,0.025,0.045],[0,0.425+lift,-0.035],black);
    if(a.handle==='strap')s.tube([[-0.16,0.4+lift,-0.07],[-0.26,0.2+lift,-0.07],[-0.2,0.11+lift,-0.06],[0.14,0.4+lift,-0.07]],0.01,s.material('#795139'));
    if(a.handle==='none')for(const x of [-0.1,0.1])s.box([0.025,0.02,0.04],[x,0.42+lift,0],metal);
    if(a.companion==='speaker'){s.box([0.22,0.28,0.14],[0.45,0.14,0],body);s.box([0.18,0.22,0.01],[0.45,0.14,0.076],black);for(let j=0;j<8;j++)s.box([0.17,0.004,0.008],[0.45,0.05+j*0.025,0.083],metal);}
    if(a.companion==='case'){s.box([0.34,0.035,0.28],[0.46,0.02,0],black);s.box([0.34,0.24,0.025],[0.46,0.145,-0.13],body);for(const x of [0.3,0.62])s.box([0.02,0.07,0.28],[x,0.055,0],body);}
    if(a.companion==='control'){s.box([0.09,0.025,0.14],[0.31,0.015,0.14],body);s.cylinder(0.02,0.02,0.01,[0.31,0.035,0.14],black);s.tube([[0.15,0.09,0],[0.24,0.02,-0.1],[0.38,0.015,-0.05],[0.31,0.025,0.06]],0.004,black);}
    s.label({hired:'HIRE RETURN',repaired:'TESTED',faulty:'LAMP FAULT',archive:'ARCHIVE 16'}[a.history],0.13,a.history==='faulty'?0.06:0.035,[-0.06,0.125+lift,0.128],a.history==='faulty'?'#9c211f':'#324239',a.history==='repaired'?'#b7c4a4':'#eadfc3');
    return s.finish({update:(dt)=>{if(a.threading==='running'||a.threading==='leader')for(const reel of reels)reel.rotation.z-=dt*(0.25+context.mood.energy*1.4);}});
  },
});
