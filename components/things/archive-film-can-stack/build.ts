import { Sculpture, choice, score, noul, defineThing } from '@conjure/kit';

export default defineThing({
  questions:{
    count:choice('How many cans have been brought out?',{one:'One solitary can.',pair:'Two cans, one beside the other.',stack:'Four cans stacked in a tower.',pile:'Six cans in two uneven piles.'}),
    format:choice('What format do the cans hold?',{home:'Small home-movie reels.',school:'Medium sixteen-millimeter reels.',cinema:'Broad theatrical film reels.',mixed:'Mixed diameters from several film formats.'}),
    metal:choice('What are the cans made of?',{silver:'Rolled silver aluminium.',olive:'Olive-painted steel.',blue:'Pale blue archive containers.',rust:'Brown steel with a dark rolled rim.'}),
    lid:choice('How is the upper can opened?',{closed:'Every can is closed.',aside:'A detached lid leans beside the stack.',tilted:'A lid rests diagonally against the upper rim.',flat:'A lid lies flat on the floor beside it.'}),
    contents:choice('If a can is open, what is inside?',{reel:'An open-spoked reel packed with film.',coil:'A tightly wound film core without a reel.',empty:'The can is empty apart from a paper sleeve.',unspooled:'Loose film curls out over the edge.'}),
    label:choice('What is written on the archive labels?',{home:'SUMMER 1974, HOME MOVIES.',news:'NEWSREEL, PRINT 02.',unknown:'UNIDENTIFIED, DO NOT DISCARD.',master:'MASTER NEGATIVE, HANDLE WITH CARE.'}),
    sorting:choice('How have the labels been organised?',{white:'Cream paper labels across the lids.',bands:'Coloured identification bands wrap the rims.',tags:'Dangling paper luggage tags.',red:'Red quarantine labels cover the lids.'}),
    offset:score('How carefully are the cans stacked?',['Perfectly aligned','A little offset','Crooked and precarious']),
    twine:noul('Is cotton tape tied around the closed lower cans?'),
    accessories:choice('What accompanies the cans?',{none:'Nothing else.',notes:'A handwritten archive inventory.',gloves:'A folded pair of white handling gloves.',core:'Two empty plastic film cores.'}),
  },
  build(a,context){
    const s=new Sculpture(context),metal=s.material({silver:'#aeb7b0',olive:'#73785a',blue:'#839da8',rust:'#8d6751'}[a.metal],{metalness:0.65,roughness:0.3+context.mood.wear*0.45}),rim=s.material('#737c76',{metalness:0.8}),dark=s.material('#36392f'),film=s.material('#75553b'),paper=s.material('#e6dcc3');
    const n={one:1,pair:2,stack:4,pile:6}[a.count],radius={home:0.1,school:0.15,cinema:0.2,mixed:0.16}[a.format],h=0.043;let top:[number,number,number]=[0,0,0];let tr=radius;
    for(let i=0;i<n;i++){
      const pile=a.count==='pair'?i:a.count==='pile'?Math.floor(i/3):0,j=a.count==='pair'?0:a.count==='pile'?i%3:i;
      const x=pile*radius*1.95-(a.count==='pair'||a.count==='pile'?radius:0)+(context.random()-0.5)*a.offset*radius*0.5,z=(context.random()-0.5)*a.offset*radius*0.5,y=j*h;
      const r=a.format==='mixed'?radius*(0.78+(i%3)*0.12):radius;
      s.cylinder(r,r,h*0.8,[x,y+h*0.4,z],metal,48);s.ring(r,0.004,[x,y+0.004,z],rim).rotation.x=Math.PI/2;s.ring(r,0.004,[x,y+h*0.8,z],rim).rotation.x=Math.PI/2;
      const last=i===n-1;if(last){top=[x,y+h*0.8,z];tr=r;}
      if(!last||a.lid==='closed'){
        s.cylinder(r*0.99,r*0.99,0.006,[x,y+h*0.87,z],metal,48);
        if(a.sorting==='white'||a.sorting==='red'){const tag=s.label({home:'SUMMER 1974',news:'NEWSREEL 02',unknown:'UNKNOWN',master:'MASTER NEG'}[a.label],r*1.4,r*0.34,[x,y+h*0.96,z],'#333b33',a.sorting==='red'?'#b55b47':'#e2d8ba');tag.rotation.x=-Math.PI/2;}
      }
      if(a.sorting==='bands')s.ring(r+0.001,0.006,[x,y+h*0.47,z],s.material(['#b5a557','#8a4c41','#6b8b83'][i%3])).rotation.x=Math.PI/2;
      if(a.sorting==='tags')s.label(`REEL ${i+1}`,r*0.7,0.045,[x+r*0.65,y+0.02,z+r*0.85],'#38392c','#e7d6ad').rotation.z=-0.25;
      if(a.twine&&!last){s.box([r*2,0.003,0.012],[x,y+h*0.97,z],paper);s.box([0.012,h,0.006],[x-r,y+h/2,z],paper);s.box([0.012,h,0.006],[x+r,y+h/2,z],paper);}
    }
    if(a.lid!=='closed'){
      const [x,y,z]=top;s.cylinder(tr*0.91,tr*0.91,0.003,[x,y+0.002,z],dark,48);s.ring(tr*0.98,0.008,[x,y+0.007,z],metal).rotation.x=Math.PI/2;
      if(a.contents!=='empty'){s.cylinder(tr*0.75,tr*0.75,0.013,[x,y+0.011,z],film,48);for(let i=0;i<6;i++)s.ring(tr*(0.24+i*0.09),0.0015,[x,y+0.019,z],dark).rotation.x=Math.PI/2;}
      if(a.contents==='reel'){s.ring(tr*0.82,0.004,[x,y+0.025,z],rim).rotation.x=Math.PI/2;for(let j=0;j<6;j++){const t=j*Math.PI/3;s.rod([x,y+0.025,z],[x+Math.cos(t)*tr*0.8,y+0.025,z+Math.sin(t)*tr*0.8],0.008,rim);}}
      if(a.contents==='empty'){s.box([tr,0.002,tr*0.7],[x,y+0.005,z],paper).rotation.y=0.3;}
      if(a.contents==='unspooled')s.tube([[x+tr*0.5,y+0.02,z],[x+tr*1.4,y+0.07,z+0.03],[x+tr*1.5,0.02,z+0.11],[x+tr*0.6,0.01,z+tr*1.4]],0.007,film);
      const lid=s.cylinder(tr,tr,0.007,[x+tr*1.8,a.lid==='flat'?0.004:tr*0.9,z],metal,48);if(a.lid==='aside')lid.rotation.z=1.25;if(a.lid==='tilted'){lid.position.set(x+tr*0.8,y+tr*0.52,z);lid.rotation.z=0.8;}
    }
    if(a.accessories==='notes'){const note=s.label('FILM INVENTORY',radius*1.3,radius*0.8,[-radius*1.4,0.003,radius*1.6],'#4b5147','#e8dfc5');note.rotation.x=-Math.PI/2;note.rotation.z=0.15;}
    if(a.accessories==='gloves')for(let j=0;j<2;j++){s.ball([0.035,0.008,0.05],[-radius*1.5+j*0.025,0.01+j*0.009,radius],paper,12);for(let k=0;k<4;k++)s.rod([-radius*1.5+j*0.025+(k-1.5)*0.012,0.015+j*0.008,radius+0.02],[-radius*1.5+j*0.025+(k-1.5)*0.012,0.015+j*0.008,radius+0.085],0.005,paper);}
    if(a.accessories==='core')for(let j=0;j<2;j++){s.ring(0.028,0.01,[-radius*1.4+j*0.065,0.012,radius],paper).rotation.x=Math.PI/2;}
    return s.finish();
  },
});
