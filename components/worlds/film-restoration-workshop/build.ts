import { choice, score, noul, diorama, defineWorld } from '@conjure/kit';

export default defineWorld({
  questions:{
    room:choice('What kind of film-restoration workroom is it?',{archive:'A pale institutional film-archive laboratory.',backroom:'A timber-lined cinema backroom.',college:'A blue-grey college film workshop.',cooperative:'A warm brick community repair studio.'}),
    benches:choice('How are the workbenches arranged?',{island:'One broad island bench in the centre.',long:'One long communal workbench across the room.',separate:'Three separate workstations.',return:'An L-shaped bench extends along the left wall.'}),
    floor:choice('What covers the workshop floor?',{linoleum:'Square muted green linoleum tiles.',boards:'Long worn wooden boards.',concrete:'Plain pale concrete.',rubber:'Dark rubber matting around the workbench.'}),
    storage:choice('How are archived films stored?',{cans:'Open shelving holds round metal film cans.',drawers:'Tall narrow drawers hold carefully catalogued film.',crates:'Wooden transport crates sit on the back shelves.',empty:'Empty shelving waits for an incoming collection.'}),
    window:choice('What is behind the rear viewing window?',{booth:'A small projection booth with a square glass port.',daylight:'A broad frosted window admits diffuse light.',curtain:'A dark curtain covers most of the window.',boarded:'Wooden boards cross a disused window.'}),
    work:choice('What work is visibly underway?',{repair:'Red repair cards and missing-frame notes cover the wall.',catalogue:'Numbered inventory sheets form a neat grid.',screening:'A white pull-down screen waits for a test projection.',packing:'Open boxes and paper sleeves await a finished print.'}),
    strips:choice('How does loose film hang in the room?',{none:'No loose film is hanging.',drying:'Short film strips hang from a drying rail.',loops:'Long loops of leader hang from hooks.',tangle:'One tangled ribbon hangs beside the archive shelf.'}),
    lighting:choice('Which work lights are fitted?',{tubes:'Two broad fluorescent housings above the benches.',lamps:'Articulated inspection lamps stand on the workbenches.',pendants:'Two enamel pendant shades hang above the room.',bare:'A single exposed maintenance lamp hangs from a cable.'}),
    benchTop:choice('What protects the bench surfaces?',{felt:'Dark green felt work pads.',rubber:'Black antistatic rubber mats.',paper:'Cream protective paper rolls.',wood:'Bare honey-coloured wooden tops.'}),
    collection:score('How much of the stored collection is present?',['Almost empty shelves','Half occupied','Shelves packed with cans']),
    sink:noul('Is there a small washing sink at the end of the workroom?'),
    notice:choice('What notice is posted beside the door?',{quiet:'QUIET / FILM IN PROGRESS.',fragile:'HANDLE WITH CARE.',open:'REPAIR NIGHT / ALL WELCOME.',closed:'FINAL SCREENING / TONIGHT.'}),
  },
  build(a,context){
    const {art:s,world}=diorama(context,{width:7.4,depth:5.5,background:'#e2dfcf',floor:{linoleum:'#a8b1a2',boards:'#ae9270',concrete:'#b5b7ad',rubber:'#8c9488'}[a.floor],maxHeight:0.75,radius:0.42,pitch:35,yaw:22,slots:[[0,0.25,0.86,1.25],[-1.25,0.25,0.86,0.9],[1.25,0.25,0.86,0.9],[-2.5,-1.75,0.86,0.8],[0.7,-1.75,0.86,0.8],[2.6,1.5,0,0.75]]});
    const wall=s.material({archive:'#d3d7c9',backroom:'#b49d7b',college:'#a4b5b8',cooperative:'#b28368'}[a.room]),wood=s.material('#9d7952'),metal=s.material('#8c9a91',{metalness:0.5,roughness:0.5}),dark=s.material('#35463e'),pale=s.material('#e0d8bc'),pad=s.material({felt:'#446556',rubber:'#35403b',paper:'#e4dbc1',wood:'#b89262'}[a.benchTop]);
    s.box([7.4,3.1,0.15],[0,1.55,-2.7],wall);s.box([0.15,3.1,5.4],[-3.65,1.55,0],wall);s.box([7.3,0.18,0.1],[0,0.09,-2.59],dark);
    if(a.room==='cooperative')for(let row=0;row<9;row++)for(let col=0;col<11;col++){if((row+col)%3===0)s.box([0.58,0.009,0.006],[-3.3+col*0.64+(row%2)*0.22,0.25+row*0.31,-2.617],pale);}
    if(a.floor==='boards')for(let i=0;i<14;i++)s.box([7.3,0.003,0.012],[0,0.005,-2.6+i*0.39],wood);
    if(a.floor==='linoleum')for(let x=0;x<10;x++)for(let z=0;z<7;z++)if((x+z)%2===0)s.box([0.71,0.005,0.75],[-3.3+x*0.73,0.004,-2.3+z*0.76],s.material('#b8bfaa'));
    if(a.floor==='rubber')s.box([5.1,0.018,2.6],[0,0.01,0.8],dark);
    const bench=(x:number,z:number,w:number,d:number)=>{s.box([w,0.08,d],[x,0.81,z],wood);s.box([w-0.05,0.012,d-0.05],[x,0.858,z],pad);for(const dx of [-w/2+0.1,w/2-0.1])for(const dz of [-d/2+0.08,d/2-0.08])s.box([0.07,0.78,0.07],[x+dx,0.39,z+dz],metal);s.rod([x-w/2+0.1,0.25,z],[x+w/2-0.1,0.25,z],0.035,metal);};
    if(a.benches==='separate')for(const x of [-1.3,0,1.3])bench(x,0.25,1.12,1.05);else bench(0,0.25,a.benches==='island'?4.2:5.4,a.benches==='island'?1.65:1.05);
    bench(-0.9,-1.75,4.5,0.9);if(a.benches==='return')bench(-2.9,-0.2,0.7,2.2);
    for(const x of [-2.9,-0.8])s.box([0.07,2.2,0.06],[x,1.3,-2.34],metal);
    for(let row=0;row<4;row++){
      const y=0.7+row*0.48;s.box([2.25,0.055,0.36],[-1.85,y,-2.31],wood);
      const count=Math.round(2+a.collection*5);
      if(a.storage==='cans')for(let j=0;j<count;j++){const x=-2.78+j*1.85/Math.max(count-1,1);const r=0.12+(j%2)*0.025;s.cylinder(r,r,0.07,[x,y+0.063,-2.29],metal,24);s.ring(r,0.006,[x,y+0.1,-2.29],pale).rotation.x=Math.PI/2;}
      if(a.storage==='drawers')for(let j=0;j<4;j++){const x=-2.64+j*0.52;s.box([0.47,0.4,0.31],[x,y+0.22,-2.28],dark);s.label(String(row*4+j+1).padStart(2,'0'),0.15,0.07,[x,y+0.26,-2.118],'#4b5144','#d8cfb3');s.box([0.13,0.025,0.02],[x,y+0.15,-2.1],metal);}
      if(a.storage==='crates')for(let j=0;j<2;j++){const x=-2.4+j*1.06;s.box([0.88,0.34,0.31],[x,y+0.2,-2.29],wood);for(const dx of [-0.31,0.31])s.box([0.045,0.35,0.018],[x+dx,y+0.2,-2.125],pale);}
    }
    const windowX=1.65;s.box([2.2,1.3,0.06],[windowX,1.95,-2.58],dark);
    const window=s.material(a.window==='booth'?'#788b83':'#cad4bf',{emissive:'#d4d9bf',emissiveIntensity:a.window==='daylight'?0.4:0.03});s.box([2,1.1,0.03],[windowX,1.95,-2.535],window);
    if(a.window==='booth'){s.box([1.1,1.1,0.04],[1.1,1.95,-2.5],wall);s.box([0.6,0.43,0.04],[1.8,1.78,-2.49],dark);s.ring(0.13,0.03,[1.8,1.78,-2.45],metal);}
    if(a.window==='curtain')for(let j=0;j<9;j++)s.cylinder(0.08,0.085,1.2,[0.75+j*0.14,1.94,-2.45],s.material('#715748'),12);
    if(a.window==='boarded')for(let j=0;j<3;j++)s.box([2.12,0.16,0.05],[windowX,1.55+j*0.4,-2.47],wood).rotation.z=(j-1)*0.12;
    if(a.work==='screening'){s.box([2.4,0.07,0.09],[1.2,2.8,-2.33],metal);s.box([2.3,1.45,0.016],[1.2,2.04,-2.3],pale);s.box([2.35,0.035,0.03],[1.2,1.3,-2.29],dark);}
    if(a.work==='catalogue'||a.work==='repair')for(let j=0;j<6;j++){s.label(a.work==='repair'?['MISSING 03','REPAIR','RECHECK'][j%3]:`REEL ${j+1}`,0.46,0.28,[-3.565,1.65+Math.floor(j/3)*0.42,-1.8+(j%3)*0.68],a.work==='repair'?'#a94d38':'#3f5146','#e2d7b7').rotation.y=Math.PI/2;}
    if(a.work==='packing')for(let j=0;j<3;j++){const x=2.5+(j%2)*0.7,z=-1.7+j*0.7;s.box([0.62,0.06,0.55],[x,0.03,z],wood);for(const dx of [-0.3,0.3])s.box([0.025,0.42,0.55],[x+dx,0.24,z],wood);s.box([0.62,0.42,0.025],[x,0.24,z-0.26],wood);}
    if(a.strips!=='none'){
      s.rod([-3.45,2.65,-0.6],[-3.45,2.65,1.5],0.018,metal);
      const film=s.material('#75593c');for(let j=0;j<5;j++){const z=-0.45+j*0.4,h=a.strips==='drying'?0.6:1.4;
        if(a.strips==='loops')s.tube([[-3.4,2.62,z],[-3.2,2.05,z],[-3.3,1.25,z],[-3.5,2.0,z],[-3.4,2.62,z]],0.02,film);else s.box([0.04,h,0.012],[-3.4,2.62-h/2,z],film).rotation.z=a.strips==='tangle'?(j-2)*0.3:0;}
    }
    const glow=s.material('#e5dcc0',{emissive:'#dfd2a4',emissiveIntensity:0.3+context.mood.energy*0.4});
    if(a.lighting==='tubes')for(const x of [-1.8,1.8]){s.box([1.8,0.08,0.2],[x,2.7,-0.3],metal);s.box([1.7,0.025,0.16],[x,2.65,-0.3],glow);}
    if(a.lighting==='lamps')for(const x of [-2.3,2.3]){s.cylinder(0.12,0.13,0.04,[x,0.89,0.05],dark,20);s.rod([x,0.9,0.05],[x,1.4,-0.1],0.02,metal);s.rod([x,1.4,-0.1],[x+0.35,1.5,0.1],0.02,metal);s.cylinder(0.06,0.16,0.16,[x+0.35,1.44,0.1],dark,24);}
    if(a.lighting==='pendants')for(const x of [-1.4,1.4]){s.rod([x,3,-0.3],[x,2.45,-0.3],0.012,dark);s.cylinder(0.09,0.27,0.2,[x,2.35,-0.3],dark,24);s.cylinder(0.23,0.23,0.02,[x,2.24,-0.3],glow,24);}
    if(a.lighting==='bare'){s.rod([0,3,0],[0,2.5,0],0.012,dark);s.ball([0.09,0.13,0.09],[0,2.4,0],glow,16);}
    if(a.sink){s.box([0.8,0.8,0.65],[2.9,0.4,-1.65],metal);s.box([0.72,0.025,0.57],[2.9,0.83,-1.65],dark);s.box([0.56,0.02,0.42],[2.9,0.84,-1.65],pale);s.tube([[2.9,0.85,-1.92],[2.9,1.1,-1.92],[2.9,1.14,-1.7],[2.9,1.04,-1.7]],0.02,metal);}
    s.label({quiet:'QUIET / FILM IN PROGRESS',fragile:'HANDLE WITH CARE',open:'REPAIR NIGHT',closed:'FINAL SCREENING'}[a.notice],1.6,0.29,[0,2.75,-2.6],'#465143','#e6dcc0');
    return world;
  },
});
