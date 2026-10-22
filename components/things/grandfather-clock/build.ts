import * as THREE from 'three';
import { Sculpture, diorama, choice, score, noul, defineThing, defineWorld } from '@conjure/kit';

export default defineThing({
  questions: {

    case: choice('What is the clock case style?', {carved:'A carved timber longcase with an arched crown.', simple:'A plain narrow modern longcase.', gothic:'A dark pointed case with little finials.'}),
    wood: choice('What timber finish does it have?', {oak:'Golden oak.', walnut:'Deep walnut.', painted:'Cream painted wood.'}),
    dial: choice('What kind of clock face is it?', {roman:'Cream face with Roman numerals.', arabic:'Pale face with Arabic numerals.', moon:'An ornate face with a moon-phase arch.'}),
    time: choice('What time does the clock show?', {midnight:'Midnight, both hands at twelve.', afternoon:'Quarter past three.', dawn:'Six oclock, before the house wakes.', stopped:'Twenty to eight, a remembered stopped hour.'}),
    door: choice('How is the pendulum door arranged?', {glass:'Closed behind a glass window.', open:'The door stands open to one side.', solid:'A solid panel with a small oval window.'}),
    weights: noul('Are two hanging brass weights visible?'),
    key: noul('Is a little winding key hanging from its side?'),
    motion: noul('Is the pendulum moving?'),
  },
  build(a, context) {

    const s=new Sculpture(context),h=2.15,color={oak:'#aa8e5e',walnut:'#756047',painted:'#d8cfb2'}[a.wood],wood=s.material(color),brass=s.material('#b9a368',{metalness:0.65}),dark=s.material('#4c4e3c'),paper=s.material('#e3d9b9');
    s.box([0.63,0.14,0.45],[0,0.08,0],wood);s.box([0.5,1.48,0.35],[0,0.86,-0.035],wood);s.box([0.64,0.58,0.4],[0,1.79,0],wood);s.box([0.71,0.07,0.47],[0,2.11,0],wood);
    if(a.case==='carved'){s.ball([0.33,0.17,0.2],[0,2.15,0],wood);for(const x of [-0.265,0.265])s.rod([x,1.58,0.2],[x,2.06,0.2],0.025,brass);}
    if(a.case==='gothic'){s.cylinder(0,0.33,0.28,[0,2.28,0],wood,4).rotation.y=Math.PI/4;for(const x of [-0.31,0.31]){s.cylinder(0,0.035,0.14,[x,2.2,0.17],brass,8);}}
    s.cylinder(0.235,0.235,0.018,[0,1.85,0.215],brass,40).rotation.x=Math.PI/2;s.ball([0.214,0.214,0.004],[0,1.85,0.232],paper,32);
    const numerals=a.dial==='arabic'?['12','3','6','9']:['XII','III','VI','IX'];for(let i=0;i<4;i++){const phi=i*Math.PI/2;s.label(numerals[i],0.065,0.038,[Math.sin(phi)*0.163,1.85+Math.cos(phi)*0.163,0.239]);}
    const times={midnight:[0,0],afternoon:[Math.PI/2,Math.PI/2],dawn:[Math.PI,0],stopped:[Math.PI*1.23,Math.PI*1.33]}[a.time];for(let i=0;i<2;i++)s.rod([0,1.85,0.248],[Math.sin(times[i])*(i?0.16:0.11),1.85+Math.cos(times[i])*(i?0.16:0.11),0.248],i?0.006:0.009,dark);
    if(a.dial==='moon'){s.box([0.35,0.12,0.014],[0,2.058,0.216],dark);s.ball([0.049,0.049,0.005],[0.04,2.058,0.228],brass,16);}
    s.box([0.38,1.16,0.011],[0,0.9,0.153],dark);
    const pendulum=new THREE.Group();pendulum.position.set(0,1.39,0.181);s.root.add(pendulum);const rod=new THREE.Mesh(new THREE.CylinderGeometry(0.009,0.009,0.88,12),brass);rod.position.y=-0.44;rod.castShadow=true;pendulum.add(rod);const bob=new THREE.Mesh(new THREE.SphereGeometry(1,24,12),brass);bob.scale.set(0.13,0.13,0.035);bob.position.set(0,-0.89,0);bob.castShadow=true;pendulum.add(bob);
    if(a.weights)for(const x of [-0.12,0.12]){s.rod([x,1.43,0.18],[x,0.84,0.18],0.004,brass);s.cylinder(0.03,0.03,0.23,[x,0.73,0.18],brass,16);}
    const glass=s.material('#b4c7b8',{transparent:true,opacity:0.2});if(a.door==='glass')s.box([0.39,1.16,0.012],[0,0.9,0.219],glass);else if(a.door==='solid'){s.box([0.38,1.15,0.023],[0,0.9,0.219],wood);s.ball([0.12,0.36,0.018],[0,0.94,0.24],glass,24);}else{const door=s.box([0.39,1.15,0.019],[-0.4,0.9,0.255],glass);door.rotation.y=-0.95;}
    if(a.key){s.ring(0.028,0.005,[0.283,1.22,0.04],brass).rotation.y=Math.PI/2;s.rod([0.283,1.19,0.04],[0.283,1.12,0.04],0.006,brass);s.box([0.025,0.02,0.01],[0.283,1.12,0.04],brass);}
    const phase=context.random()*Math.PI*2;return s.finish({update:(_dt,time)=>{pendulum.rotation.z=a.motion?Math.sin(time*2.4+phase)*0.055:0;}});
  },
});
