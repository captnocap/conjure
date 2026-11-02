import * as THREE from 'three';
import { Sculpture, choice, score, noul, diorama, defineThing, defineWorld, figure } from '@conjure/kit';
export default defineThing({
  questions: {
    chassis: choice("What carries the weights?", {"timber": "A heavy timber cart.", "iron": "A riveted iron chassis.", "open": "An open steel ladder frame.", "box": "A shallow timber ballast box."}),
    ballast: choice("What supplies the tension?", {"plates": "Stacked iron plates.", "stones": "Rough stone ballast blocks.", "sand": "Four rounded sandbags.", "barrel": "A squat ballast barrel."}),
    wheels: choice("How does it travel?", {"flange": "Four flanged rail wheels.", "wood": "Four plain wooden wheels.", "rollers": "Six low steel rollers.", "sled": "Wooden runners instead of wheels."}),
    hook: choice("What joins it to the rope?", {"swivel": "A tall swivel and open hook.", "ring": "A large closed attachment eye.", "fork": "A two-pronged rope fork.", "bar": "A broad crossbar for several strands."}),
    line: choice("How is the rope connected?", {"taut": "A taut line leads away.", "slack": "A line droops to the floor.", "cut": "Only a short attached tail.", "empty": "No line attached."}),
    brake: choice("How is it arrested?", {"lever": "A long hand brake lever.", "chock": "Two wooden wheel chocks.", "screw": "A vertical screw brake.", "none": "No brake fitted."}),
    measure: choice("How is travel read?", {"rule": "A long side travel rule.", "flag": "A tall red position flag.", "marks": "White position stripes on the frame.", "none": "No measurement mark."}),
    state: choice("What is the work state?", {"moving": "Loaded and ready to travel.", "unloading": "One weight sits beside the trolley.", "tied": "A rope secures the ballast.", "tagged": "A job card hangs on the hook."}),
    load: score("How heavily is the trolley ballasted?", ["Light tension", "Working tension", "Heavy rope tension"])
  },
  build(a,context){

    const s=new Sculpture(context),wood=s.material('#95774b'),iron=s.material('#5e6e61',{metalness:0.6}),stone=s.material('#a29d85'),rope=s.material('#b8a16c'),n=2+Math.round(a.load*4);
    for(const x of [-0.45,0.45])s.box([0.13,0.13,1.2],[x,0.25,0],a.chassis==='timber'?wood:iron);for(const z of [-0.5,0.5])s.box([1,0.13,0.13],[0,0.25,z],wood);if(a.chassis==='open')for(const z of [-0.2,0.2])s.box([0.9,0.06,0.08],[0,0.34,z],iron);if(a.chassis!=='open')s.box([0.9,0.06,1.1],[0,0.34,0],a.chassis==='iron'?iron:wood);if(a.chassis==='box')for(const x of [-0.45,0.45])s.box([0.06,0.28,1.1],[x,0.48,0],wood);
    if(a.wheels==='sled')for(const x of [-0.4,0.4])s.box([0.15,0.18,1.4],[x,0.09,0],wood);else for(const x of [-0.49,0.49])for(let j=0;j<(a.wheels==='rollers'?3:2);j++){const z=a.wheels==='rollers'?-0.45+j*0.45:-0.45+j*0.9;s.cylinder(0.15,0.15,0.08,[x,0.15,z],a.wheels==='wood'?wood:iron,24).rotation.z=Math.PI/2;if(a.wheels==='flange')s.ring(0.16,0.014,[x+Math.sign(x)*0.04,0.15,z],iron).rotation.y=Math.PI/2;}
    for(let j=0;j<n;j++){if(a.ballast==='plates')s.box([0.65,0.075,0.7],[0,0.4+j*0.08,0],iron);else if(a.ballast==='stones')s.box([0.28,0.18,0.4],[(j%2-0.5)*0.32,0.46+Math.floor(j/2)*0.18,0],stone).rotation.y=(context.random()-0.5)*0.15;else if(a.ballast==='sand')s.ball([0.24,0.12,0.3],[(j%2-0.5)*0.35,0.46+Math.floor(j/2)*0.16,0],rope,16);}
    if(a.ballast==='barrel'){s.cylinder(0.28,0.25,0.5+a.load*0.25,[0,0.62+a.load*0.125,0],wood,24);for(const y of [0.42,0.75+a.load*0.2])s.ring(0.28,0.025,[0,y,0],iron).rotation.x=Math.PI/2;}
    s.rod([0,0.3,0.52],[0,1.25,0.52],0.04,iron);if(a.hook==='ring')s.ring(0.13,0.025,[0,1.38,0.52],iron);else if(a.hook==='fork')for(const x of [-0.1,0.1])s.rod([0,1.1,0.52],[x,1.4,0.52],0.025,iron);else if(a.hook==='bar')s.rod([-0.35,1.3,0.52],[0.35,1.3,0.52],0.03,iron);else s.tube([[0,1.2,0.52],[0,1.4,0.52],[0.1,1.44,0.52],[0.16,1.34,0.52]],0.024,iron);
    if(a.line!=='empty')s.tube([[0,1.3,0.52],[0,a.line==='slack'?0.15:1.25,0.85],[0,a.line==='slack'?0.03:1.25,a.line==='cut'?0.95:1.5]],0.02,rope);
    if(a.brake==='lever')s.rod([0.5,0.3,-0.3],[0.65,1,-0.25],0.025,iron);if(a.brake==='screw'){s.rod([0.5,0.2,-0.3],[0.5,0.85,-0.3],0.02,iron);s.rod([0.38,0.85,-0.3],[0.62,0.85,-0.3],0.015,wood);}if(a.brake==='chock')for(const x of [-0.5,0.5])s.box([0.18,0.08,0.15],[x,0.04,0.65],wood).rotation.x=-0.15;
    if(a.measure==='rule'){s.box([0.03,0.07,1.1],[0.54,0.4,0],stone);for(let j=0;j<10;j++)s.box([0.034,0.05,0.015],[0.54,0.4,-0.5+j*0.1],iron);}if(a.measure==='flag'){s.rod([-0.45,0.3,-0.4],[-0.45,1.6,-0.4],0.015,wood);s.box([0.22,0.15,0.005],[-0.34,1.52,-0.4],s.material('#a8644c'));}if(a.measure==='marks')for(let j=0;j<5;j++)s.box([0.14,0.02,0.04],[0.45,0.32,-0.4+j*0.2],stone);
    if(a.state==='unloading')s.box([0.45,0.1,0.5],[-0.85,0.05,0],iron);if(a.state==='tied')s.tube([[-0.45,0.25,0],[-0.35,0.5+n*0.08,0],[0.35,0.5+n*0.08,0],[0.45,0.25,0]],0.016,rope);if(a.state==='tagged')s.label('LAY 18',0.24,0.1,[0.15,1.2,0.56],'#61634e','#dfd2aa');return s.finish();

  },
});
