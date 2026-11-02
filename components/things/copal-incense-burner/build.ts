import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type V3 = [number, number, number];

export default defineThing({
  questions: {
    finish: choice('What finish covers the vessel?', { earthen: 'Unglazed clay or satin brass.', polished: 'A burnished polished surface.', glazed: 'A clear glossy glaze or polished lacquer over the metal.', smoked: 'A dark smoke-fired surface.' }),
    piercing: choice('If the censer is pierced, what shape are the openings?', { triangle: 'Triangular openings.', round: 'Small round openings.', diamond: 'Diamond-shaped openings.', slot: 'Narrow vertical slots.' }),
    rimDetail: choice('How is the lip of the bowl finished?', { plain: 'A simple thickened rim.', braid: 'Two intertwining raised cords.', studs: 'A row of rounded clay or metal studs.', scallops: 'Small scalloped loops around the lip.' }),
    baseDetail: choice('What surrounds the feet or pedestal?', { plain: 'No additional base.', ring: 'A low round supporting ring.', square: 'A low square ceramic plinth.', petals: 'A six-petalled low clay base.' }),
    coalLayout: choice('How is the charcoal arranged inside?', { heap: 'A central heap of irregular pieces.', ring: 'A ring of coals around the resin.', split: 'Two side-by-side mounds with a clear central channel.', rows: 'Two orderly rows of short charcoal pieces.' }),
    underlay: choice('What catches the ash below the burner and its tools?', { bare: 'The surface is bare.', tile: 'A broad terracotta tile.', cloth: 'A folded woven cloth.', sand: 'A shallow tray with an inset sand bed.' }),
    vessel: choice('What kind of censer is it?', {
      tripod: 'A plain terracotta bowl on three stubby feet, the village kind.',
      painted: 'A tripod bowl whitewashed and dotted with bright painted flowers, bought at the market.',
      goblet: 'A black polished clay goblet with a pedestal, a handle and triangular cut-outs that glow.',
      effigy: 'An old red clay bowl with a skull face modelled on the front, eyes hollow.',
      thurible: 'A brass church thurible with a pierced domed lid and chains.',
    }),
    smoke: score('How much smoke is it giving off?', ['None at all', 'A single thin thread', 'A steady curling ribbon', 'Thick rolling clouds']),
    shape: choice('How does the smoke move?', {
      column: 'Straight up in a still room.',
      curl: 'In slow lazy curls.',
      drift: 'Dragged sideways by a draught from an open door.',
      spirit: 'It gathers into something like a standing figure, as if someone has come.',
    }),
    embers: score('How alive are the coals?', ['Cold grey ash', 'A dull red eye under the ash', 'Glowing orange', 'Blazing, with a lick of flame']),
    resin: choice('What is burning on the coals?', {
      white: 'White copal tears, like chips of chalk.',
      gold: 'Golden amber-coloured resin lumps.',
      dark: 'Dark sticky resin, almost black.',
      herbs: 'Resin with sprigs of dried herbs laid across.',
    }),
    beside: choice('What lies beside it?', {
      nothing: 'Nothing.',
      dish: 'A saucer of spare resin with a small spoon.',
      fan: 'A fan of feathers used to waft the smoke over people.',
      tongs: 'Spare charcoal and a pair of iron tongs.',
      ash: 'Spilled ash and burnt-out crumbs from many nights of use.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const ground=(node:THREE.Object3D,floor=0)=>{node.updateMatrixWorld(true);node.position.y+=floor-new THREE.Box3().setFromObject(node,true).min.y;};
    const seat=(node:THREE.Object3D,support:THREE.Object3D[])=>{node.updateMatrixWorld(true);support.forEach(x=>x.updateMatrixWorld(true));const ray=new THREE.Raycaster(),point=new THREE.Vector3();let gap=Infinity;node.traverse(x=>{if(!(x instanceof THREE.Mesh))return;const p=x.geometry.getAttribute('position');for(let i=0;i<p.count;i++){point.fromBufferAttribute(p,i).applyMatrix4(x.matrixWorld);ray.set(new THREE.Vector3(point.x,1,point.z),new THREE.Vector3(0,-1,0));gap=Math.min(gap,point.y-(ray.intersectObjects(support,true)[0]?.point.y??0));}});if(Number.isFinite(gap))node.position.y-=gap;};
    const surface=(colour:string,metalness=0)=>s.material(a.finish==='smoked'?'#392d29':colour,{roughness:a.finish==='glazed'?.13:a.finish==='polished'?.28:.8,metalness});
    const piercedShell=(profile:[number,number][],thickness:number,mat:THREE.Material,windows:[number,number,number,number][])=>{
      const nx=160,ny=96,y0=profile[0][1],y1=profile[profile.length-1][1],positions:number[]=[],indices:number[]=[];
      const radius=(y:number)=>{for(let k=1;k<profile.length;k++)if(y<=profile[k][1])return mix(profile[k-1][0],profile[k][0],(y-profile[k-1][1])/(profile[k][1]-profile[k-1][1]));return profile[profile.length-1][0];};
      const opening=(t:number,y:number)=>windows.some(([tc,yc,tw,yh])=>{const dt=Math.atan2(Math.sin(t-tc),Math.cos(t-tc))/tw,dy=(y-yc)/yh;return a.piercing==='round'?dt*dt+dy*dy<1:a.piercing==='diamond'?Math.abs(dt)+Math.abs(dy)<1:a.piercing==='slot'?Math.abs(dt)<.45&&Math.abs(dy)<1:dy>-.8&&dy<1&&Math.abs(dt)<(1-dy)*.55;});
      const open=Array.from({length:ny},(_,j)=>Array.from({length:nx},(_,i)=>opening((i+.5)/nx*Math.PI*2,mix(y0,y1,(j+.5)/ny))));
      const vertex=(i:number,j:number,inner:boolean):V3=>{const t=i/nx*Math.PI*2,y=mix(y0,y1,j/ny),r=Math.max(.0001,radius(y)-(inner?thickness:0));return[Math.sin(t)*r,y,Math.cos(t)*r];};
      const quad=(p:V3,q:V3,r:V3,t:V3)=>{const k=positions.length/3;positions.push(...p,...q,...r,...t);indices.push(k,k+1,k+2,k,k+2,k+3);};
      for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){if(open[j][i])continue;quad(vertex(i,j,false),vertex(i+1,j,false),vertex(i+1,j+1,false),vertex(i,j+1,false));quad(vertex(i,j+1,true),vertex(i+1,j+1,true),vertex(i+1,j,true),vertex(i,j,true));
        if(j===0||open[j-1][i])quad(vertex(i,j,false),vertex(i,j,true),vertex(i+1,j,true),vertex(i+1,j,false));
        if(j===ny-1||open[j+1][i])quad(vertex(i+1,j+1,false),vertex(i+1,j+1,true),vertex(i,j+1,true),vertex(i,j+1,false));
        if(open[j][(i+nx-1)%nx])quad(vertex(i,j+1,false),vertex(i,j+1,true),vertex(i,j,true),vertex(i,j,false));
        if(open[j][(i+1)%nx])quad(vertex(i+1,j,false),vertex(i+1,j,true),vertex(i+1,j+1,true),vertex(i+1,j+1,false));}
      const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();const material=mat.clone();material.side=THREE.DoubleSide;return s.mesh(geometry,material);
    };
    const heat = Math.min(1, a.embers);
    const glowColour = new THREE.Color('#ff5a14').lerp(new THREE.Color('#ffb02e'), heat);
    const glowMat = (strength: number) => new THREE.MeshStandardMaterial({ color: '#1a120e', emissive: glowColour, emissiveIntensity: strength * heat * 1.6, roughness: 0.9 });
    let rimY = 0.1, rimR = 0.062, vents: V3[] = [];
    const lidded = a.vessel === 'thurible';

    if (a.vessel === 'tripod' || a.vessel === 'painted' || a.vessel === 'effigy') {
      const colour = a.vessel === 'painted' ? '#f1ebdc' : a.vessel === 'effigy' ? '#9a4630' : '#b8663e';
      const clay = surface(colour);
      s.lathe([[0, 0.036], [0.04, 0.037], [0.068, 0.06], [0.076, 0.09], [0.071, 0.102], [0.064, 0.102], [0.066, 0.088], [0.058, 0.064], [0, 0.052]], clay);
      for (let i = 0; i < 3; i++) {
        const ang = Math.PI / 2 + i * Math.PI * 2 / 3 + Math.PI;
        s.rod([Math.cos(ang) * 0.05, 0, Math.sin(ang) * 0.05], [Math.cos(ang) * 0.036, 0.05, Math.sin(ang) * 0.036], 0.011, clay, 0.018);
      }
      s.ring(0.0745, 0.0035, [0, 0.086, 0], clay).rotation.x = Math.PI / 2;
      if (a.vessel === 'painted') {
        const hues = ['#e5257e', '#18b5b0', '#f6c21c', '#49b848', '#7a3fc0', '#f2702a'];
        const dots: { at: V3; size: number; color: string }[] = [];
        for (let i = 0; i < 9; i++) {
          const ang = i / 9 * 6.28, y = 0.072, rr = 0.0725, hue = hues[i % hues.length];
          for (let p = 0; p < 5; p++) dots.push({ at: [Math.sin(ang + Math.cos(p * 1.257) * 0.1) * rr, y + Math.sin(p * 1.257) * 0.0075, Math.cos(ang + Math.cos(p * 1.257) * 0.1) * rr], size: 0.0042, color: hue });
          dots.push({ at: [Math.sin(ang) * (rr + 0.002), y, Math.cos(ang) * (rr + 0.002)], size: 0.003, color: '#fff3c0' });
          dots.push({ at: [Math.sin(ang + 0.35) * 0.076, 0.096, Math.cos(ang + 0.35) * 0.076], size: 0.0034, color: hues[(i + 3) % hues.length] });
        }
        s.scatter(new THREE.SphereGeometry(1, 8, 6), s.material('#ffffff', { roughness: 0.5 }), dots);
      } else if (a.vessel === 'effigy') {
        const face = s.ball([0.036, 0.034, 0.02], [0, 0.074, 0.062], clay, 64);
        face.geometry.scale(.036,.034,.02);face.scale.setScalar(1);face.geometry.rotateX(-.25);
        const positions=face.geometry.getAttribute('position');for(let i=0;i<positions.count;i++){const x=positions.getX(i),y=positions.getY(i)+.074,z=positions.getZ(i)+.062;let inset=0;if(z>.064)for(const side of [-1,1]){const q=((x-side*.014)/.010)**2+((y-.082)/.011)**2;if(q<1)inset=Math.max(inset,.011*(1-q)**2);}positions.setZ(i,positions.getZ(i)-inset);}positions.needsUpdate=true;face.geometry.computeVertexNormals();
        for (const side of [-1, 1]) {
          s.ball([.007,.008,.002],[side*.014,.082,.071],glowMat(.8),12);
          s.ball([0.016, 0.006, 0.008], [side * 0.014, 0.096, 0.07], clay, 10);
        }
        s.ball([0.004, 0.007, 0.004], [0, 0.07, 0.082], s.material('#2a1410'), 8);
        for (let i = -2; i <= 2; i++) s.box([0.0055, 0.008, 0.004], [i * 0.0068, 0.055, 0.078 - Math.abs(i) * 0.002], s.material('#e8d8b8'));
        for (const side of [-1, 1]) s.ball([0.012, 0.018, 0.006], [side * 0.07, 0.082, 0.02], clay, 10);
      } else for (let i = 0; i < 16; i++) { const ang = i / 16 * 6.28; s.ball([0.0045, 0.0045, 0.0045], [Math.sin(ang) * 0.072, 0.102, Math.cos(ang) * 0.072], clay, 8); }
    } else if (a.vessel === 'goblet') {
      const black = surface('#1e1c1e',.25);
      s.lathe([[0,0],[.048,0],[.043,.012],[.019,.032],[.016,.06],[.03,.076],[0,.076]],black);
      const windows:[number,number,number,number][]=Array.from({length:8},(_,i)=>[i*Math.PI/4+.2,.123,.18,.013]);
      piercedShell([[.03,.076],[.06,.1],[.068,.14],[.066,.146]],.004,black,windows);
      const handle = s.ring(0.026, 0.007, [-0.075, 0.115, 0], black, Math.PI * 1.1); handle.rotation.z = Math.PI / 2 - 0.2;
      rimY = 0.146; rimR = 0.058;
    } else {
      const brass = surface('#c9a23a',.6);
      s.lathe([[0, 0], [0.04, 0], [0.036, 0.01], [0.014, 0.022], [0.014, 0.034], [0.04, 0.044], [0.062, 0.07], [0.064, 0.092], [.058,.092],[.057,.073],[.036,.05],[0,.046]], brass);
      s.ring(0.065, 0.004, [0, 0.092, 0], brass).rotation.x = Math.PI / 2;
      const windows:[number,number,number,number][]=[];
      for(let row=0;row<3;row++)for(let i=0;i<10-row*2;i++){const angle=i/(10-row*2)*Math.PI*2+row*.3,y=[.108,.131,.151][row],radius=[.0598,.0512,.0348][row];windows.push([angle,y,.105+row*.03,.0055]);if(row===1&&i%3===0)vents.push([Math.sin(angle)*radius,y,Math.cos(angle)*radius]);}
      piercedShell([[.063,.094],[.056,.125],[.036,.15],[.014,.162],[.012,.18],[.02,.19],[.001,.2]],.002,brass,windows);
      s.box([.005,.032,.005],[0,.214,0],brass);s.box([.02,.005,.005],[0,.218,0],brass);
      const chain = s.material('#a8842a', { metalness: 0.6, roughness: 0.35 });
      for (let i = 0; i < 3; i++) {
        const ang = i * 2.094 + 0.5, ex = 0.15 + i * 0.012, ez = 0.07 - i * 0.05;
        s.tube([[Math.sin(ang) * 0.064, 0.094, Math.cos(ang) * 0.064], [Math.sin(ang) * 0.085, 0.07, Math.cos(ang) * 0.085], [Math.sin(ang) * 0.09 + 0.02, 0.006, Math.cos(ang) * 0.09 + 0.02], [ex * 0.75, 0.003, ez + (i - 1) * 0.02], [ex, 0.003, ez]], 0.002, chain);
      }
      s.ring(0.014, 0.003, [0.165, 0.004, 0.02], chain).rotation.x = Math.PI / 2;
      rimY = 0.2; rimR = 0.04;
    }

    const body=new THREE.Group();for(const child of [...s.root.children])body.add(child);s.root.add(body);ground(body);
    const raised=body.position.y;rimY+=raised;vents=vents.map(([x,y,z])=>[x,y+raised,z]);
    const lipHeight=(lidded?.092:rimY-raised)+raised,lipRadius=lidded?.065:rimR+.008,lipMat=surface(lidded?'#c9a23a':a.vessel==='goblet'?'#1e1c1e':a.vessel==='painted'?'#f1ebdc':'#b8663e',lidded?.6:0);
    if(a.rimDetail==='braid')for(const side of [-1,1]){const points:V3[]=[];for(let k=0;k<=120;k++){const t=k/120*Math.PI*2,r=lipRadius+Math.cos(t*18)*.0012*side;points.push([Math.sin(t)*r,lipHeight+Math.sin(t*18)*.0012*side,Math.cos(t)*r]);}s.tube(points,.0014,lipMat);}
    if(a.rimDetail==='studs')for(let i=0;i<28;i++){const t=i*Math.PI/14;s.ball([.0025,.0025,.0025],[Math.sin(t)*lipRadius,lipHeight,Math.cos(t)*lipRadius],lipMat,6);}
    if(a.rimDetail==='scallops')for(let i=0;i<18;i++){const t=i*Math.PI/9,points:V3[]=[];for(let k=0;k<=8;k++){const u=k/8,q=t+u*Math.PI/9;points.push([Math.sin(q)*lipRadius,lipHeight+Math.sin(u*Math.PI)*.004,Math.cos(q)*lipRadius]);}s.tube(points,.0011,lipMat);}
    // The ash bed fills the bowl; coals rest on it and one another.
    const coalY = lidded?.075+raised:rimY-(a.vessel==='goblet'?.03:.022);
    {

      const ashBed=s.cylinder(rimR*.9,0,coalY-(a.vessel==='goblet'?.076:.046)-raised,[0,(coalY+(a.vessel==='goblet'?.076:.046)+raised)/2-.007,0],s.material('#8d8a86',{roughness:1}),24);
      const supports:THREE.Object3D[]=[ashBed],coalPoints:V3[]=[];
      const coals = 6 + Math.floor(random() * 4);
      for (let i = 0; i < coals; i++) {
        const ang=a.coalLayout==='ring'?i/coals*Math.PI*2:i*2.399963+random()*.1,d=a.coalLayout==='ring'?rimR*.55:Math.sqrt((i+.5)/coals)*rimR*.55;
        const hot = heat * mix(0.3, 1, random());
        const lump = s.mesh(new THREE.DodecahedronGeometry(mix(.0065,.009,random()), 0), new THREE.MeshStandardMaterial({ color: new THREE.Color('#201a18').lerp(new THREE.Color('#9a9692'), (1 - heat) * 0.6), emissive: glowColour, emissiveIntensity: hot * 1.3, roughness: 0.95, flatShading: true }), [Math.cos(ang) * d, coalY + random() * 0.006, Math.sin(ang) * d]);
        if(a.coalLayout==='split'){lump.position.x=(i%2?1:-1)*rimR*.35+(random()-.5)*.008;lump.position.z=(random()-.5)*rimR;}if(a.coalLayout==='rows'){lump.position.x=(i%2?1:-1)*rimR*.3;lump.position.z=(Math.floor(i/2)-(coals/2-1)/2)*.018;}
        lump.rotation.set(random()*3,random()*3,random()*3);seat(lump,[ashBed]);supports.push(lump);coalPoints.push(lump.position.toArray() as V3);
      }
      const resinColour = { white: '#f4f0e2', gold: '#e0a030', dark: '#3a2418', herbs: '#e0a030' }[a.resin];
      const resin = new THREE.MeshStandardMaterial({ color: resinColour, roughness: 0.3, emissive: a.resin === 'dark' ? '#000000' : resinColour, emissiveIntensity: 0.15 + heat * 0.25, flatShading: true });
      for (let i=0;i<Math.min(coals,4+Math.floor(random()*4));i++) {
        const [x,,z]=coalPoints[i];
        const chunk = s.mesh(new THREE.IcosahedronGeometry(mix(.003,.005,random()), 0), resin, [x,coalY+.02,z]);
        chunk.rotation.set(random()*3,random()*3,random()*3);seat(chunk,supports);supports.push(chunk);
      }
      if (a.resin === 'herbs') for (let i = 0; i < 4; i++) {
        const ang = random() * 3.14, len = rimR * 1.1;
        s.rod([Math.cos(ang) * len, coalY + 0.02, Math.sin(ang) * len], [-Math.cos(ang) * len * 0.8, coalY + 0.024, -Math.sin(ang) * len * 0.8], 0.0022, s.material('#6f7a3c'));
        for (let k = 0; k < 5; k++) { const t = k / 5 * 1.6 - 0.8; s.ball([0.008, 0.002, 0.004], [Math.cos(ang) * len * t, coalY + 0.024, Math.sin(ang) * len * t + 0.004], s.material('#8a9448'), 6).rotation.y = random() * 3; }
      }
    }
    const flames: THREE.Mesh[] = [];
    if (heat > 0.82 && !lidded) for (let i = 0; i < 3; i++) {
      const fl = s.mesh(new THREE.ConeGeometry(0.011, mix(0.035, 0.06, random()), 8), new THREE.MeshBasicMaterial({ color: i === 0 ? '#ffd35a' : '#ff8a1e' }), [(random() - 0.5) * 0.04, coalY + 0.04, (random() - 0.5) * 0.04]);
      fl.castShadow = false; flames.push(fl);
    }

    // Smoke ribbons: see-through, so not measured as part of the object.
    const smoke = new THREE.Group();
    const smokeMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#8f96a2').lerp(new THREE.Color('#b9b2a8'), mood.warmth * 0.6), transparent: true, opacity: mix(0.3, 0.5, a.smoke), depthWrite: false, side: THREE.DoubleSide });
    const ribbon = (path: (t: number) => THREE.Vector3, width: (t: number) => number, twist: number, phase: number) => {
      const n = 70, pos: number[] = [], idx: number[] = [];
      for (let i = 0; i <= n; i++) {
        const t = i / n, c = path(t), ang = phase + t * twist, w = width(t);
        pos.push(c.x - Math.cos(ang) * w, c.y, c.z - Math.sin(ang) * w, c.x + Math.cos(ang) * w, c.y, c.z + Math.sin(ang) * w);
        if (i < n) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
      const mesh = new THREE.Mesh(geo, smokeMat);
      const pivot = new THREE.Group(); pivot.add(mesh); smoke.add(pivot);
    };
    const volume = Math.max(0, a.smoke);
    const H = mix(0.14, 0.27, volume), wide = mix(0.004, 0.022, volume);
    const strands = volume < 0.08 ? 0 : Math.round(mix(1, 5, volume) + mood.density * 0.6);
    const origin = (i: number) => (vents.length ? new THREE.Vector3(...vents[i % vents.length]) : new THREE.Vector3((random() - 0.5) * rimR * 0.5, coalY + 0.015, (random() - 0.5) * rimR * 0.5));
    for (let i = 0; i < strands; i++) {
      const o = origin(i), ph = random() * 6.28, amp = mix(0.6, 1.4, random());
      const hgt = H * mix(0.75, 1.1, random());
      const path = (t: number) => {
        const p = new THREE.Vector3(o.x * (1 - t), o.y + t * hgt, o.z * (1 - t));
        if (a.shape === 'column') { p.x += Math.sin(t * 4 + ph) * 0.008 * t * amp; p.z += Math.cos(t * 3 + ph) * 0.006 * t; }
        else if (a.shape === 'curl') { p.x += Math.sin(t * 6.5 + ph) * 0.05 * t * amp; p.z += Math.cos(t * 4.6 + ph) * 0.03 * t * amp; }
        else if (a.shape === 'drift') { p.x += t * t * 0.26 + Math.sin(t * 7 + ph) * 0.02 * t; p.y -= t * t * hgt * 0.35; p.z += Math.cos(t * 5 + ph) * 0.02 * t; }
        else { const side = i % 2 ? 1 : -1; const gather = Math.sin(t * Math.PI); p.x += side * (0.012 + gather * 0.05 * (0.6 + (i % 3) * 0.25)) * Math.min(1, t * 3); p.z += Math.cos(t * 5 + ph) * 0.008; }
        return p;
      };
      ribbon(path, (t) => wide * (0.25 + t * 1.2) * (1 - t * t * 0.25), mix(2, 6, random()), ph);
    }
    if (a.shape === 'spirit' && strands > 0) {
      const top = coalY + 0.015 + H * 1.02, r = mix(0.028, 0.045, volume);
      ribbon((t) => new THREE.Vector3(Math.sin(t * 6.28) * r, top + r * 0.9 + Math.cos(t * 6.28) * r * 1.15, 0), () => wide * 0.9 + 0.003, 0.5, 0);
      for (const side of [-1, 1]) ribbon((t) => new THREE.Vector3(side * (0.03 + t * 0.085), coalY + 0.015 + H * (0.66 + Math.sin(t * 2.4) * 0.14), Math.sin(t * 3) * 0.015), (t) => (wide * 0.8 + 0.002) * (1 - t * 0.6), 2, side);
    }
    s.root.add(smoke);

    const censer=new THREE.Group();for(const child of [...s.root.children])censer.add(child);s.root.add(censer);

    // Beside it.
    const off = 0.14;
    if (a.beside === 'dish') {
      s.lathe([[0, 0.003], [0.03, 0.003], [0.046, 0.012], [0.048, 0.014], [0.044, 0.008], [0.026, 0], [0, 0]], s.material('#e9e2cf', { roughness: 0.35 }), [off, 0, 0.05]);
      const tint = { white: '#f4f0e2', gold: '#e0a030', dark: '#3a2418', herbs: '#e0a030' }[a.resin];
      for (let i = 0; i < 9; i++) { const ang = random() * 6.28, d = Math.sqrt(random()) * 0.024; s.mesh(new THREE.IcosahedronGeometry(mix(0.005, 0.009, random()), 0), s.material(tint, { flatShading: true, roughness: 0.35 }), [off + Math.cos(ang) * d, 0.009 + random() * 0.006, 0.05 + Math.sin(ang) * d]); }
      const metal = s.material('#b9a060', { metalness: 0.6, roughness: 0.3 });
      s.rod([off + 0.02, 0.012, 0.07], [off + 0.085, 0.005, 0.11], 0.002, metal); s.ball([0.008, 0.003, 0.006], [off + 0.018, 0.012, 0.068], metal, 8);
    } else if (a.beside === 'fan') {
      const fan = new THREE.Group();
      const tones = ['#5a3a22', '#2a2622', '#8a6a44', '#d8ccb4', '#3a4a3a'];
      for (let i = 0; i < 7; i++) {
        const ang = (i - 3) * 0.2;
        const feather = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 6), s.material(tones[i % tones.length], { roughness: 0.8 }));
        feather.scale.set(0.014, 0.002, 0.065);
        feather.position.set(Math.sin(ang) * 0.085, 0.004 + i * 0.0006, -Math.cos(ang) * 0.085);
        feather.rotation.y = -ang; feather.castShadow = true;
        const quill = new THREE.Mesh(new THREE.CylinderGeometry(0.0008, 0.0012, 0.13, 5), s.material('#efe6d0'));
        quill.rotation.x = Math.PI / 2; quill.rotation.z = 0; quill.position.set(Math.sin(ang) * 0.07, 0.0065 + i * 0.0006, -Math.cos(ang) * 0.07); quill.rotation.y = -ang; quill.rotation.order = 'YXZ';
        fan.add(feather, quill);
      }
      const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.006, 0.06, 10), s.material('#a8262e'));
      grip.rotation.x = Math.PI / 2; grip.position.set(0, 0.008, 0.02); grip.castShadow = true; fan.add(grip);
      fan.position.set(off + 0.03, 0, 0.06); fan.rotation.y = -0.9 + random() * 0.4;
      s.root.add(fan);ground(fan);
    } else if (a.beside === 'tongs') {
      const iron = s.material('#3a3c40', { metalness: 0.5, roughness: 0.5 });
      s.rod([off - 0.02, 0.004, 0.0], [off + 0.09, 0.004, 0.09], 0.0028, iron); s.rod([off - 0.02, 0.009, 0.0], [off + 0.095, 0.004, 0.075], 0.0028, iron);
      for (let i = 0; i < 5; i++) { const lump = s.mesh(new THREE.DodecahedronGeometry(mix(0.012, 0.02, random()), 0), s.material('#1c1a1a', { flatShading: true, roughness: 1 }), [-off + (random() - 0.5) * 0.06, 0.012, 0.04 + (random() - 0.5) * 0.06]); lump.rotation.set(random()*3,random()*3,0);ground(lump); }
    }
    if (a.beside === 'ash' || mood.wear > 0.7) {
      const ash = s.material('#9a9794', { roughness: 1 });
      for (let i = 0; i < 9; i++) { const ang = random() * 6.28, d = mix(0.06, 0.15, random()); s.ball([mix(0.008, 0.024, random()), 0.0025, mix(0.008, 0.02, random())], [Math.cos(ang)*d,.0025,Math.sin(ang)*d], ash, 8).castShadow = false; }
      const crumbs = []; for (let i = 0; i < 40; i++) { const ang = random() * 6.28, d = mix(0.05, 0.17, random()); crumbs.push({ at: [Math.cos(ang) * d, 0.003, Math.sin(ang) * d] as V3, size: mix(0.0015, 0.004, random()), color: random() < 0.5 ? '#2a2624' : '#b8b4ae' }); }
      s.scatter(new THREE.IcosahedronGeometry(1, 0), s.material('#ffffff', { roughness: 1 }), crumbs);
    }

    if(a.baseDetail!=='plain'){
      censer.position.y+=.008;
      const base=surface('#9d6046');
      if(a.baseDetail==='ring')s.lathe([[0,0],[.087,0],[.087,.008],[0,.008]],base);
      else if(a.baseDetail==='square')s.box([.18,.008,.18],[0,.004,0],base);
      else{for(let i=0;i<6;i++){const t=i*Math.PI/3;s.cylinder(.038,.038,.008,[Math.cos(t)*.05,.004,Math.sin(t)*.05],base,16);}s.cylinder(.055,.055,.008,[0,.004,0],base,24);}
    }
    if(a.underlay!=='bare'){
      const group=new THREE.Group();for(const child of [...s.root.children])group.add(child);s.root.add(group);group.position.y+=.006;
      censer.remove(smoke);const bounds=new THREE.Box3().setFromObject(group,true);censer.add(smoke);const size=bounds.getSize(new THREE.Vector3()),centre=bounds.getCenter(new THREE.Vector3());const width=size.x+.03,depth=size.z+.03;
      s.box([width,.006,depth],[centre.x,.003,centre.z],s.material(a.underlay==='cloth'?'#c5a779':'#97543c',{roughness:.9}));
      if(a.underlay==='cloth'){for(let i=0;i<22;i++){const x=centre.x-width/2+(i+.5)*width/22;s.rod([x,.003,centre.z-depth/2],[x,.003,centre.z-depth/2-.009],.0007,s.material('#e2cba6'));}}
      if(a.underlay==='sand'){s.box([width-.01,.002,depth-.01],[centre.x,.005,centre.z],s.material('#cab689',{roughness:1}));const border=s.material('#885b37');for(const side of [-1,1]){s.box([width,.012,.005],[centre.x,.006,centre.z+side*depth/2],border);s.box([.005,.012,depth],[centre.x+side*width/2,.006,centre.z],border);}}
    }
    const speed = mix(0.25, 1.6, mood.energy);
    return s.finish({
      footprint: 0.12,
      update: (_dt, time) => {
        smoke.children.forEach((pivot, i) => { pivot.rotation.y = Math.sin(time * speed + i * 1.7) * 0.35; pivot.scale.y = 1 + Math.sin(time * speed * 0.6 + i) * 0.04; });
        flames.forEach((fl, i) => { fl.scale.y = 1 + Math.sin(time * speed * 9 + i * 2) * 0.25; });
      },
    });
  },
});
