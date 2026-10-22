import * as THREE from 'three';
import { Sculpture, diorama, choice, score, noul, defineThing, defineWorld } from '@conjure/kit';

export default defineThing({
  questions: {

    layout: choice('How is the booth arranged?', {double:'Two facing upholstered benches with a table between.', corner:'A deep L-shaped corner bench.', single:'A single bench with its own small table.'}),
    upholstery: choice('What is the seat upholstery?', {cherry:'Cherry red pleated vinyl.', turquoise:'Turquoise vinyl with ivory piping.', caramel:'Caramel brown leatherette.'}),
    tabletop: choice('What pattern is on the table?', {speckled:'Cream laminate dotted with grey flecks.', chrome:'A polished metal diner tabletop.', checker:'A cream tabletop with a red check runner.'}),
    meal: choice('What remains of the meal?', {breakfast:'A plate of eggs, toast and a coffee cup.', pie:'A slice of pie under a little dome.', empty:'An empty table set for the next visitor.'}),
    divider: choice('What separates the booth from its neighbours?', {none:'No divider above the seat.', glass:'A fluted frosted screen.', plant:'A narrow planter of leaves.'}),
    jukebox: noul('Is there a little tabletop jukebox selector?'),
    condiments: noul('Is there a cluster of ketchup, mustard and napkins?'),
    length: score('How many people does the bench seat?', ['A cosy two-person bench', 'A long bench for a whole family']),
  },
  build(a, context) {

    const s=new Sculpture(context), w=1.35+a.length*0.8;
    const vinyl=s.material({cherry:'#a43c3e',turquoise:'#3f9195',caramel:'#a87648'}[a.upholstery]), edge=s.material('#d8d8c9',{metalness:0.65}), dark=s.material('#453b36'), cream=s.material('#f0e4c4');
    const bench=(x:number,z:number,turn=false)=>{const before=s.root.children.length;s.box([w,0.36,0.65],[x,0.26,z],dark);s.box([w,0.18,0.66],[x,0.49,z],vinyl);s.box([w,0.69,0.19],[x,0.84,z-0.26],vinyl);for(let i=0;i<Math.floor(w/0.14);i++)s.rod([x-w/2+0.09+i*0.14,0.59,z-0.151],[x-w/2+0.09+i*0.14,1.12,z-0.151],0.006,edge);s.rod([x-w/2,1.18,z-0.26],[x+w/2,1.18,z-0.26],0.018,edge);if(turn)for(const mesh of s.root.children.slice(before)){mesh.position.applyAxisAngle(new THREE.Vector3(0,1,0),Math.PI);mesh.rotateY(Math.PI);}};
    bench(0,-0.82);if(a.layout==='double')bench(0,-0.82,true);else if(a.layout==='corner'){const start=s.root.children.length;bench(0,-0.82);for(const mesh of s.root.children.slice(start)){mesh.position.applyAxisAngle(new THREE.Vector3(0,1,0),Math.PI/2);mesh.rotateY(Math.PI/2);mesh.position.x-=w/2-0.27;}}
    const top=s.material(a.tabletop==='chrome'?'#a6b4b5':'#e9dfc5',{metalness:a.tabletop==='chrome'?0.7:0});s.cylinder(0.13,0.25,0.67,[0,0.38,0],edge);s.box([w*0.93,0.065,0.78],[0,0.75,0],top);s.box([w*0.94,0.04,0.8],[0,0.714,0],edge);
    if(a.tabletop==='speckled')for(let i=0;i<24;i++)s.box([0.015,0.003,0.012],[(context.random()-0.5)*w*0.8,0.785,(context.random()-0.5)*0.65],dark);
    if(a.tabletop==='checker')for(let x=0;x<6;x++)for(let z=0;z<4;z++)if((x+z)%2===0)s.box([w*0.08,0.007,0.09],[(x-2.5)*w*0.08,0.787,(z-1.5)*0.09],vinyl);
    if(a.meal!=='empty'){const plate=s.cylinder(0.19,0.16,0.022,[-0.2,0.8,0],cream);if(a.meal==='breakfast'){s.ball([0.064,0.01,0.05],[-0.26,0.822,0],cream,12);s.ball([0.025,0.013,0.025],[-0.26,0.828,0],s.material('#dfa737'),12);s.box([0.1,0.025,0.12],[-0.12,0.83,0.01],s.material('#bd8449'));}else{s.cylinder(0.075,0.1,0.09,[-0.2,0.85,0],s.material('#b97b48'),3);s.ball([0.17,0.13,0.17],[-0.2,0.93,0],s.material('#abc7c9',{transparent:true,opacity:0.22}));}s.cylinder(0.06,0.044,0.085,[0.33,0.833,0.1],cream);s.ring(0.032,0.008,[0.398,0.837,0.1],cream).rotation.y=Math.PI/2;}
    if(a.condiments){for(let i=0;i<2;i++){s.cylinder(0.027,0.045,0.15,[w*0.3+i*0.085,0.863,-0.23],s.material(i?'#d5ac43':'#ac403a'),12);s.cylinder(0.014,0.02,0.035,[w*0.3+i*0.085,0.956,-0.23],cream,10);}s.box([0.13,0.09,0.09],[w*0.3-0.11,0.83,-0.23],edge);}
    if(a.jukebox){s.box([0.22,0.29,0.13],[-w*0.35,0.94,-0.19],edge);s.box([0.18,0.22,0.009],[-w*0.35,0.94,-0.116],cream);s.label('SELECT',0.17,0.06,[-w*0.35,1.015,-0.11]);for(let i=0;i<5;i++)s.box([0.12,0.008,0.007],[-w*0.35,0.96-i*0.026,-0.105],vinyl);}
    if(a.divider==='glass')s.box([w,0.45,0.045],[0,1.4,-1.12],s.material('#bacbca',{transparent:true,opacity:0.55}));
    if(a.divider==='plant'){s.box([w,0.15,0.22],[0,1.27,-1.11],dark);for(let i=0;i<8;i++)s.ball([0.06,0.19,0.09],[(i-3.5)*w/8,1.49,-1.11],s.material('#668267'),12);}
    return s.finish();
  },
});
