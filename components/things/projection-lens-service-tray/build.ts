import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing } from '@conjure/kit';

export default defineThing({
  questions:{
    case:choice('What kind of service case holds the optics?',{wood:'A shallow wooden tray with brass corners.',steel:'A grey steel workshop case.',leather:'A brown leather fitted case.',plastic:'A green moulded plastic parts tray.'}),
    lining:choice('What lines the compartments?',{felt:'Dark green felt.',velvet:'Deep burgundy velvet.',foam:'Charcoal cut foam.',cloth:'Cream cotton cloth.'}),
    lens:choice('Which lens is being serviced?',{long:'A long telephoto projection barrel.',short:'A short wide-angle barrel.',anamorphic:'A broad anamorphic double barrel.',dismantled:'Three separated barrel sections laid in sequence.'}),
    elements:choice('How are the glass elements arranged?',{row:'Three glass discs in a careful row.',stack:'A stack of glass elements in one recess.',empty:'Empty circular recesses where glass should be.',scattered:'Glass elements spread irregularly across the tray.'}),
    tint:choice('What colour does the coated glass reflect?',{amber:'Warm amber lens coatings.',green:'Pale green optical coatings.',violet:'Muted violet coatings.',clear:'Nearly clear uncoated glass.'}),
    lid:choice('Where is the lid?',{open:'An open lid stands at the rear.',removed:'The detached lid lies beside the case.',closedhalf:'The lid is propped at forty-five degrees.',none:'An open tray without any lid.'}),
    tool:choice('What precision tool lies across the case?',{spanner:'A two-prong lens spanner.',screwdriver:'A jeweller screwdriver with a red handle.',brush:'A soft dusting brush.',bulb:'A rubber air blower with a pointed nozzle.'}),
    missing:choice('What has interrupted the repair?',{none:'Every part appears accounted for.',ring:'A yellow MISSING RING card fills one compartment.',cracked:'One lens has a visible star-shaped crack.',screw:'A red arrow points to an empty screw well.'}),
    separation:score('How far apart are the lens barrel sections?',['Closely nested','Separated for inspection','Widely spread']),
    chart:noul('Is a striped focus-test chart tucked inside the lid?'),
  },
  build(a,context){
    const s=new Sculpture(context),body=s.material({wood:'#96704c',steel:'#8e9a94',leather:'#73513d',plastic:'#6a7d62'}[a.case],{metalness:a.case==='steel'?0.65:0.05,roughness:0.45+context.mood.wear*0.35}),lining=s.material({felt:'#344e42',velvet:'#613843',foam:'#343b3a',cloth:'#dbd2b9'}[a.lining]),metal=s.material('#aeb5ae',{metalness:0.85,roughness:0.25}),black=s.material('#29312e');
    const w=0.54,d=0.34;s.box([w,0.02,d],[0,0.012,0],body);s.box([w-0.03,0.006,d-0.03],[0,0.026,0],lining);
    for(const x of [-w/2,w/2])s.box([0.014,0.06,d],[x,0.04,0],body);for(const z of [-d/2,d/2])s.box([w,0.06,0.014],[0,0.04,z],body);
    for(const x of [-0.085,0.09])s.box([0.01,0.025,d-0.03],[x,0.04,0],lining);
    const lid=new THREE.Group();if(a.lid!=='none'){
      const shell=new THREE.Mesh(new THREE.BoxGeometry(w,0.018,d),body);shell.position.z=-d/2;shell.castShadow=true;lid.add(shell);
      const pad=new THREE.Mesh(new THREE.BoxGeometry(w-0.025,0.008,d-0.02),lining);pad.position.set(0,0.014,-d/2);lid.add(pad);lid.position.set(0,0.07,-d/2);lid.rotation.x=a.lid==='open'?Math.PI*0.48:a.lid==='closedhalf'?Math.PI/4:0;
      if(a.lid==='removed'){lid.position.set(-0.57,0.016,d/2);lid.rotation.x=0;}s.root.add(lid);
      if(a.chart){const start=s.root.children.length;s.box([0.3,0.002,0.13],[0,0.021,-d/2],s.material('#ded9bd'));for(let j=0;j<15;j++)s.box([j<5?0.01:j<10?0.007:0.004,0.002,0.1],[-0.13+j*0.018,0.023,-d/2],black);for(const mesh of s.root.children.slice(start))lid.add(mesh);}
    }
    const len=a.lens==='long'?0.24:0.13,sections=a.lens==='dismantled'?3:1;
    for(let j=0;j<sections;j++){const x=-0.17,z=(j-(sections-1)/2)*(0.055+a.separation*0.04),l=sections>1?0.045:len;const barrel=s.cylinder(0.042,0.045,l,[x,0.08,z],black,32);barrel.rotation.x=Math.PI/2;
      for(const edge of [-1,1])s.ring(0.044,0.004,[x,0.08,z+edge*l/2],metal);if(a.lens==='anamorphic'){const second=s.cylinder(0.036,0.036,l,[x+0.055,0.08,z],black,24);second.rotation.x=Math.PI/2;}
      for(let k=0;k<8;k++){const t=k*Math.PI/4;s.rod([x+Math.sin(t)*0.046,0.08+Math.cos(t)*0.046,z-l*0.2],[x+Math.sin(t)*0.046,0.08+Math.cos(t)*0.046,z+l*0.2],0.0025,metal);}}
    const glass=new THREE.MeshPhysicalMaterial({color:{amber:'#c5aa71',green:'#8bb6a0',violet:'#a598b8',clear:'#b9c3bf'}[a.tint],metalness:0.1,roughness:0.08,transparent:true,opacity:0.52,depthWrite:false,side:THREE.DoubleSide});
    for(let j=0;j<3;j++){
      const x=a.elements==='stack'?0:(a.elements==='scattered'?(context.random()-0.5)*0.12:0.005),z=a.elements==='stack'?0:(j-1)*0.09,y=0.036+(a.elements==='stack'?j*0.013:0);
      s.ring(0.034,0.004,[x,y,z],metal).rotation.x=Math.PI/2;
      if(a.elements!=='empty'){s.ball([0.03,0.005,0.03],[x,y,z],glass,24);if(a.missing==='cracked'&&j===1)for(let k=0;k<4;k++){const t=k*1.5;s.rod([x,y+0.007,z],[x+Math.sin(t)*0.026,y+0.007,z+Math.cos(t)*0.026],0.0014,metal);}}
    }
    const tx=0.19;
    if(a.tool==='spanner'){for(const x of [tx-0.025,tx+0.025])s.rod([x,0.045,-0.11],[x,0.045,0.08],0.004,metal);s.rod([tx-0.035,0.05,0.025],[tx+0.035,0.05,0.025],0.008,metal);}
    if(a.tool==='screwdriver'){s.rod([tx,0.047,-0.12],[tx,0.047,0.04],0.004,metal);s.rod([tx,0.047,0.04],[tx,0.047,0.11],0.012,s.material('#9b3e30'));}
    if(a.tool==='brush'){s.rod([tx,0.045,-0.11],[tx,0.045,0.04],0.01,body);for(let j=0;j<8;j++)s.rod([tx+(j-3.5)*0.003,0.047,0.04],[tx+(j-3.5)*0.004,0.047,0.11],0.002,s.material('#b7a37c'));}
    if(a.tool==='bulb'){s.ball([0.035,0.025,0.05],[tx,0.055,0.03],black,20);s.rod([tx,0.06,-0.01],[tx,0.06,-0.1],0.008,metal,0.003);}
    if(a.missing==='ring'||a.missing==='screw'){const note=s.label(a.missing==='ring'?'MISSING RING':'SCREW ?',0.13,0.04,[0.04,0.064,0.115],'#a23e2b','#e0d299');note.rotation.x=-Math.PI/2;}
    for(const x of [-0.18,0.18])s.box([0.035,0.02,0.008],[x,0.045,d/2+0.008],metal);
    return s.finish();
  },
});
