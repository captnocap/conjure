import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Sculpture, choice, clamp01, defineThing, mix, score } from '@conjure/kit';

const FILLINGS = {
  ham: 'Pink ham and a slab of yellow cheese.',
  egg: 'Pale yellow egg mayonnaise with green cress.',
  jam: 'Peanut butter and dark purple jam, a child\'s lunch.',
  cucumber: 'Thin green cucumber on white, crusts cut off: a tea-party sandwich.',
  salad: 'Frilled lettuce, red tomato and bacon, stacked high.',
  cheese: 'Thick orange cheddar and brown pickle, a ploughman\'s.',
} as const;
const LAYERS: Record<keyof typeof FILLINGS, [string, number][]> = {
  ham: [['#f0a5a0', 0.006], ['#f2c53a', 0.005]],
  egg: [['#f4e39a', 0.011], ['#5c9a3a', 0.003]],
  jam: [['#b9843f', 0.005], ['#5a1f4a', 0.005]],
  cucumber: [['#f6f3e6', 0.002], ['#a9cf7a', 0.005]],
  salad: [['#7fb347', 0.005], ['#d83a2c', 0.007], ['#a1482a', 0.004], ['#8cc152', 0.004]],
  cheese: [['#f0a02c', 0.009], ['#5a3520', 0.004]],
};

function canvasTexture(size: number, paint: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  paint(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

export default defineThing({
  questions: {
    thickness: choice('How thick are the bread slices?', { thin: 'Delicate thin slices.', usual: 'Ordinary sliced bread.', thick: 'Thick hand-cut slices.', doorstep: 'Very thick doorstep slices.' }),
    toasted: choice('How was the bread toasted?', { fresh: 'Soft and untoasted.', golden: 'Golden toasted patches.', dark: 'Dark crisp toasted patches.', griddle: 'Parallel browned griddle lines.' }),
    spread: choice('What extra spread shows at the cut edge?', { butter: 'A thin pale butter layer.', mustard: 'A sharp yellow mustard layer.', mayonnaise: 'A creamy white mayonnaise layer.', chutney: 'A dark red chutney layer.' }),
    assembly: choice('How are the triangles arranged?', { close: 'Close together, as packed.', apart: 'The triangles pulled apart.', fan: 'Fanned in opposite directions.', crossed: 'One triangle leaning across the other.' }),
    wrapperPrint: choice('What pattern is on the wrapping?', { plain: 'Unprinted paper, foil, or plain checked cloth.', stripe: 'Blue parallel wrapper stripes.', flowers: 'Small red flower sprigs.', news: 'Dense rows of newspaper-like type.' }),
    antBuild: choice('What silhouette do the ants have?', { compact: 'Compact workers with short bodies.', slender: 'Slender workers with narrow abdomens.', long: 'Long-legged workers.', round: 'Workers with prominent round abdomens.' }),
    trailEdge: choice('What lies beside the ant trail?', { pebbles: 'Three rounded pebbles.', leaf: 'A fallen leaf with a visible midrib.', stems: 'Two fallen dry stems.', clover: 'A low three-leaf clover sprig.' }),
    filling: choice('What is in the sandwich?', FILLINGS),
    bread: choice('What bread is it?', {
      white: 'Soft white sliced bread with a tan crust.',
      brown: 'Brown wholemeal with a dark crust.',
      seeded: 'Golden bread with a crust rolled in seeds.',
      rye: 'Dense dark rye.',
    }),
    eaten: score('How much of it has been eaten?', ['Two untouched triangles', 'One bite out of a corner', 'One triangle half gone', 'One triangle left', 'Only a crust remains']),
    wrapper: choice('What is it lying on?', {
      wax: 'A square of creased wax paper.',
      foil: 'Crumpled kitchen foil.',
      bag: 'A torn-open brown paper bag.',
      napkin: 'A checked cloth napkin.',
      box: 'An open plastic lunchbox.',
    }),
    ants: score('How many ants are there?', ['A couple of scouts', 'A thin single file', 'A busy column', 'A thick swarming river of them']),
    cargo: choice('What are the ants carrying?', {
      crumbs: 'Pale breadcrumbs, each bigger than its bearer.',
      filling: 'Bright scraps of the filling.',
      sugar: 'White grains of sugar.',
      crust: 'A whole length of crust, hauled by a team.',
      nothing: 'Nothing yet: they have only just found it.',
    }),
    route: choice('Where does the trail go?', {
      hill: 'To a little sandy anthill a short way off.',
      grass: 'Into a tuft of grass, where it vanishes.',
      away: 'Off in a long wandering line toward somewhere unseen.',
      mill: 'Nowhere: they circle the sandwich in a closed loop, round and round.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const L = 0.115;
    const sliceDepth = { thin: 0.008, usual: 0.013, thick: 0.019, doorstep: 0.027 }[a.thickness];
    const crumbTone = { white: '#f3e9cf', brown: '#b98a55', seeded: '#e6c98a', rye: '#6e4a30' }[a.bread];
    const crustTone = { white: '#c08a4a', brown: '#6e431f', seeded: '#a8743a', rye: '#3d2616' }[a.bread];
    const breadMap = canvasTexture(128, (ctx) => {
      ctx.fillStyle = crumbTone; ctx.fillRect(0, 0, 128, 128);
      for (let i = 0; i < 260; i++) { ctx.fillStyle = `rgba(${a.bread === 'white' ? '160,130,80' : '40,22,10'},${0.1 + random() * 0.2})`; ctx.beginPath(); ctx.arc(random() * 128, random() * 128, 0.6 + random() * 2, 0, 7); ctx.fill(); }
      if (a.bread === 'seeded') for (let i = 0; i < 60; i++) { ctx.fillStyle = random() < 0.5 ? '#3a2a18' : '#f3e6b8'; ctx.beginPath(); ctx.ellipse(random() * 128, random() * 128, 3, 1.5, random() * 3, 0, 7); ctx.fill(); }
      if (a.toasted !== 'fresh') {
        ctx.fillStyle = a.toasted === 'dark' ? 'rgba(58,28,8,.68)' : 'rgba(142,71,16,.40)';
        if (a.toasted === 'griddle') for (let x = 9; x < 128; x += 27) ctx.fillRect(x, 0, 6, 128);
        else for (let i = 0; i < 28; i++) { ctx.beginPath(); ctx.ellipse(random()*128, random()*128, 8+random()*13, 5+random()*8, random()*3, 0, 7); ctx.fill(); }
      }
      for (let i = 0; i < mood.wear * 14; i++) { ctx.fillStyle = 'rgba(90,120,90,0.28)'; ctx.beginPath(); ctx.arc(random() * 128, random() * 128, 4 + random() * 9, 0, 7); ctx.fill(); }
    });
    breadMap.repeat.set(9, 9);
    const bread = new THREE.MeshStandardMaterial({ map: breadMap, roughness: 0.95 });
    const crust = s.material(crustTone, { roughness: 0.85 });
    const layers: [string, number][] = [[{butter:'#f6df8b',mustard:'#cea525',mayonnaise:'#fff7dc',chutney:'#8c3227'}[a.spread], 0.002], ...LAYERS[a.filling]];
    const crusted = a.filling !== 'cucumber';

    /** One triangle, eaten in from its sharp corner with scalloped tooth marks. */
    const triangle = (eaten: number) => {
      const group = new THREE.Group();
      const cut = L * (1 - eaten * 0.9);
      const points: THREE.Vector2[] = [new THREE.Vector2(0, 0)];
      if (eaten <= 0.001) points.push(new THREE.Vector2(L, 0));
      else {
        const top = (L - cut) + 0.02;
        for (let i = 0; i <= 24; i++) {
          const y = (i / 24) * Math.min(L, top + 0.03);
          const x = cut - Math.abs(Math.sin((y / 0.021) * Math.PI + 0.4)) * 0.011 + Math.sin(y * 40) * 0.003;
          if (x + y >= L) { points.push(new THREE.Vector2(Math.max(0.004, L - y), y)); break; }
          points.push(new THREE.Vector2(Math.max(0.004, x), y));
        }
      }
      points.push(new THREE.Vector2(0, L));
      const shape = new THREE.Shape(points);
      const reach = points.reduce((most, p) => (p.y < 0.001 ? Math.max(most, p.x) : most), 0);
      let y = 0;
      const slab = (depth: number, material: THREE.Material, grow = 1) => {
        const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.y = y;
        mesh.scale.set(grow, grow, 1);
        mesh.castShadow = mesh.receiveShadow = true;
        group.add(mesh);
        y += depth;
      };
      const slice = () => {
        if (crusted) {
          for (const [w, d, x, z] of [[reach + 0.004, 0.005, reach / 2, 0.0015], [0.005, L + 0.004, -0.0015, -L / 2]]) {
            const edge = new THREE.Mesh(new THREE.BoxGeometry(w, sliceDepth + 0.0005, d), crust);
            edge.position.set(x, y + sliceDepth / 2, z);
            edge.castShadow = true;
            group.add(edge);
          }
        }
        slab(sliceDepth, bread);
      };
      slice();
      for (const [colour, depth] of layers) slab(depth, new THREE.MeshStandardMaterial({ color: colour, roughness: 0.55 }), 1.03 + random() * 0.03);
      if (a.filling === 'salad' || a.filling === 'egg') {
        // Frills of leaf poking out along the cut face.
        const leaf = new THREE.MeshStandardMaterial({ color: a.filling === 'salad' ? '#8cc152' : '#4f9a36', roughness: 0.7 });
        for (let i = 0; i < 9; i++) {
          const t = (i + random() * 0.6) / 9;
          const px = t * L * 1.0, pz = -(1 - t) * L;
          if (px > reach - 0.004 && eaten > 0) continue;
          const frill = new THREE.Mesh(new THREE.SphereGeometry(1, 7, 5), leaf);
          frill.scale.set(0.011, 0.003, 0.011);
          frill.position.set(px + 0.004, y - 0.004 - random() * 0.008, pz - 0.004 + L);
          frill.position.z -= L;
          frill.rotation.set(random(), random(), random());
          frill.castShadow = true;
          group.add(frill);
        }
      }
      slice();
      return { group, height: y, reach };
    };

    const first = clamp01(a.eaten * 2.2), second = clamp01(a.eaten * 2.2 - 1.15);
    const halves = new THREE.Group();
    const one = triangle(Math.min(first, 0.97));
    one.group.rotation.y = -Math.PI / 2 + (random() - 0.5) * 0.3;
    one.group.position.set(0.012, 0, 0.008);
    if (first < 0.985) halves.add(one.group);
    else {
      // Only its crust is left, tossed aside.
      const scrap = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.013, L * 0.8), crust);
      scrap.position.set(0.06, 0.007, 0.07); scrap.rotation.y = random() * 3; scrap.castShadow = true;
      halves.add(scrap);
    }
    const two = triangle(Math.min(second, 0.97));
    two.group.rotation.y = Math.PI / 2 + (random() - 0.5) * 0.3;
    two.group.position.set(-0.014, 0, -0.012);
    if (first < 0.5) { two.group.rotation.z = -0.3; two.group.position.set(-0.008, 0.004, -0.004); }
    if (a.assembly === 'apart') { one.group.position.x += 0.034; two.group.position.x -= 0.034; two.group.rotation.z = 0; }
    if (a.assembly === 'fan') { one.group.rotation.y -= 0.45; two.group.rotation.y += 0.45; two.group.rotation.z = 0; }
    if (a.assembly === 'crossed') { two.group.rotation.z = -0.45; two.group.position.set(-0.004, 0.014, -0.018); }
    // Each posed half must meet its wrapper rather than inherit another half's lowest point.
    for (const half of [one.group, two.group]) { half.updateMatrixWorld(true); half.position.y -= new THREE.Box3().setFromObject(half, true).min.y; }
    halves.add(two.group);
    s.root.add(halves);
    const stackHeight = one.height;

    const wrapperMap = canvasTexture(128, ctx => {
      ctx.fillStyle = a.wrapper === 'bag' ? '#c4a071' : '#eee9d8'; ctx.fillRect(0,0,128,128);
      if (a.wrapperPrint === 'stripe') { ctx.fillStyle='#588bb0'; for(let x=0;x<128;x+=19) ctx.fillRect(x,0,5,128); }
      if (a.wrapperPrint === 'news') { ctx.fillStyle='#555044'; for(let y=6;y<128;y+=9) for(let x=4;x<128;x+=32) ctx.fillRect(x,y,22+(x+y)%7,2); }
      if (a.wrapperPrint === 'flowers') for(let y=12;y<128;y+=28) for(let x=12;x<128;x+=28) { ctx.strokeStyle='#5b7c42'; ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x+4,y+10); ctx.stroke(); ctx.fillStyle='#b94842'; for(let p=0;p<5;p++) { ctx.beginPath();ctx.arc(x+3*Math.cos(p*1.257),y+3*Math.sin(p*1.257),2.4,0,7);ctx.fill(); } }
    });
    const wrapperSupports: THREE.Object3D[] = [];
    // The wrapper.
    const W = 0.25;
    let floor = 0.002;
    if (a.wrapper === 'wax' || a.wrapper === 'foil' || a.wrapper === 'bag') {
      const geometry = new THREE.PlaneGeometry(W, a.wrapper === 'bag' ? W * 0.82 : W, 22, 22);
      geometry.rotateX(-Math.PI / 2);
      const pos = geometry.attributes.position;
      const crumple = a.wrapper === 'foil' ? 0.006 : 0.0025;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), z = pos.getZ(i), edge = Math.max(Math.abs(x), Math.abs(z)) / (W / 2);
        const fold = a.wrapper === 'foil' ? 0 : Math.abs(Math.sin(x * 22)) * 0.0015 + Math.abs(Math.sin(z * 22)) * 0.0015;
        pos.setY(i, random() * crumple * (0.4 + edge) + fold + (edge > 0.82 ? (edge - 0.82) * (a.wrapper === 'foil' ? 0.12 : 0.05) * (0.3 + random()) : 0));
        if (a.wrapper === 'bag' && z > W * 0.3) pos.setZ(i, z + (random() - 0.5) * 0.03);
      }
      geometry.computeVertexNormals();
      const paint = a.wrapper === 'foil'
        ? new THREE.MeshStandardMaterial({ map: a.wrapperPrint === 'plain' ? null : wrapperMap, color: '#d5d8da', metalness: 0.85, roughness: 0.32, flatShading: true, side: THREE.DoubleSide })
        : new THREE.MeshStandardMaterial({ map: a.wrapperPrint === 'plain' ? null : wrapperMap, color: a.wrapper === 'wax' ? '#f1ecd9' : '#b98f5f', roughness: 0.8, flatShading: a.wrapper === 'bag', side: THREE.DoubleSide });
      const sheet = new THREE.Mesh(geometry, paint);
      sheet.rotation.y = 0.2 + random() * 0.5;
      sheet.receiveShadow = true; sheet.castShadow = true;
      s.root.add(sheet); wrapperSupports.push(sheet);
      halves.position.y = crumple + 0.003;
      floor = 0.004;
    } else if (a.wrapper === 'napkin') {
      const tone = mood.cheer > 0.5 ? '#cf3a36' : '#3b62a8';
      const map = canvasTexture(128, (ctx) => {
        ctx.fillStyle = '#f6f2e6'; ctx.fillRect(0, 0, 128, 128);
        ctx.fillStyle = tone; ctx.globalAlpha = 0.55;
        for (let i = 0; i < 8; i += 2) { ctx.fillRect(i * 16, 0, 16, 128); ctx.fillRect(0, i * 16, 128, 16); }
      });
      if (a.wrapperPrint !== 'plain') { map.image = wrapperMap.image; map.needsUpdate = true; }
      map.repeat.set(2, 2);
      const cloth = s.box([W, 0.003, W], [0, 0.0015, 0], new THREE.MeshStandardMaterial({ map, roughness: 0.95 }));
      wrapperSupports.push(cloth);
      cloth.rotation.y = 0.3 + random() * 0.4;
      const foldOver = s.box([W * 0.36, 0.004, W * 0.36], [W * 0.33, 0.005, -W * 0.33], new THREE.MeshStandardMaterial({ map, roughness: 0.95 }));
      foldOver.rotation.y = cloth.rotation.y + 0.5;
      halves.position.y = 0.003;
      floor = 0.004;
    } else {
      const plastic = new THREE.MeshStandardMaterial({ color: mood.cheer > 0.5 ? '#3f9bd8' : '#8a9aa0', map: a.wrapperPrint === 'plain' ? null : wrapperMap, roughness: 0.35 });
      wrapperSupports.push(s.box([W * 0.86, 0.005, W * 0.7], [0, 0.0025, 0], plastic));
      for (const side of [-1, 1]) {
        s.box([W * 0.86, 0.045, 0.005], [0, 0.0225, side * W * 0.35], plastic);
        s.box([0.005, 0.045, W * 0.7], [side * W * 0.43, 0.0225, 0], plastic);
      }
      const lid = s.box([W * 0.88, 0.006, W * 0.72], [0.03, 0.003, -W * 0.82], s.material('#f1f2ee', { roughness: 0.35 }));
      lid.rotation.y = 0.2;
      halves.position.y = 0.005;
      halves.scale.setScalar(0.92);
    }

    // Settle each separate sandwich half on the actual wrapper geometry.
    s.root.updateMatrixWorld(true);
    const supportRay=new THREE.Raycaster(), vertex=new THREE.Vector3();
    for(const half of halves.children) {
      let shift=-Infinity;
      half.traverse(node=>{if(!(node instanceof THREE.Mesh))return;const pos=node.geometry.attributes.position;if(!pos)return;for(let i=0;i<pos.count;i++) {vertex.fromBufferAttribute(pos,i).applyMatrix4(node.matrixWorld);supportRay.set(new THREE.Vector3(vertex.x,1,vertex.z),new THREE.Vector3(0,-1,0));const hit=supportRay.intersectObjects(wrapperSupports,true)[0];shift=Math.max(shift,(hit?.point.y??0)-vertex.y);}});
      if(Number.isFinite(shift))half.position.y+=shift/halves.scale.y+0.0003;
    }
    // Loose crumbs where it was bitten.
    const crumbs = Array.from({ length: Math.round(6 + a.eaten * 40 + mood.wear * 15) }, () => {
      const angle = random() * 6.28, r = 0.02 + random() * 0.1;
      return { at: [Math.cos(angle) * r * 0.9 + 0.01, floor + 0.002 + (a.wrapper === 'box' ? 0.003 : 0), Math.sin(angle) * r * 0.8 + 0.03] as [number, number, number], size: 0.0015 + random() * 0.003, color: random() < 0.8 ? crumbTone : crustTone };
    });
    s.scatter(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ roughness: 0.9 }), crumbs);

    // The trail: a wandering path the ants walk along.
    const loop = a.route === 'mill';
    const waypoints: THREE.Vector3[] = [];
    let end = new THREE.Vector3(-0.27, 0, 0.2);
    if (loop) {
      const lobes = 2 + Math.floor(random() * 2), phase = random() * 6;
      for (let i = 0; i < 12; i++) { const t = (i / 12) * Math.PI * 2, r = 0.185 + Math.sin(t * lobes + phase) * 0.022; waypoints.push(new THREE.Vector3(Math.cos(t) * r, 0.003, Math.sin(t) * r)); }
    } else {
      end = a.route === 'hill' ? new THREE.Vector3(-0.21, 0, 0.15) : a.route === 'grass' ? new THREE.Vector3(-0.21, 0, 0.11) : new THREE.Vector3(-0.3, 0, 0.16);
      const start = new THREE.Vector3(0.035, halves.position.y + stackHeight * 0.5, 0.05);
      waypoints.push(start, new THREE.Vector3(0.03, floor + 0.002, 0.085));
      for (let i = 1; i <= 5; i++) {
        const t = i / 6, p = new THREE.Vector3(0.03, 0.003, 0.1).lerp(end, t);
        p.z += Math.sin(t * Math.PI * (2 + random())) * 0.03 + (random() - 0.5) * 0.02;
        p.y = 0.003;
        waypoints.push(p);
      }
      waypoints.push(end.clone().setY(a.route === 'hill' ? 0.03 : 0.003));
    }
    const path = new THREE.CatmullRomCurve3(waypoints, loop, 'catmullrom', 0.5);

    if (a.route === 'hill') {
      const sand = s.material('#c9a877', { roughness: 1 });
      s.mesh(new THREE.LatheGeometry([[0.007, 0.004], [0.007, 0.026], [0.014, 0.031], [0.03, 0.02], [0.055, 0.006], [0.07, 0]].map(([x, y]) => new THREE.Vector2(x, y)), 20), sand, [end.x, 0, end.z]);
      s.cylinder(0.006, 0.006, 0.001, [end.x, 0.001, end.z], s.material('#2a1c10'), 10);
      s.scatter(new THREE.SphereGeometry(1, 5, 4), new THREE.MeshStandardMaterial({ color: '#b89766', roughness: 1 }), Array.from({ length: 50 }, () => {
        const angle = random() * 6.28, r = 0.035 + random() * 0.05;
        return { at: [end.x + Math.cos(angle) * r, 0.002, end.z + Math.sin(angle) * r] as [number, number, number], size: 0.002 + random() * 0.003 };
      }));
    } else if (a.route === 'grass') {
      const blade = new THREE.ConeGeometry(0.004, 1, 4);
      blade.translate(0, 0.5, 0);
      const tuft = new THREE.InstancedMesh(blade, new THREE.MeshStandardMaterial({ roughness: 0.85 }), 34);
      const dummy = new THREE.Object3D();
      for (let i = 0; i < 34; i++) {
        const angle = random() * 6.28, r = random() * 0.04;
        dummy.position.set(end.x - 0.025 + Math.cos(angle) * r, 0, end.z + Math.sin(angle) * r);
        dummy.rotation.set((random() - 0.5) * 0.7, random() * 6, (random() - 0.5) * 0.7);
        dummy.scale.set(1, 0.05 + random() * 0.09, 1);
        dummy.updateMatrix();
        tuft.setMatrixAt(i, dummy.matrix);
        tuft.setColorAt(i, new THREE.Color().setHSL(mix(0.2, 0.3, random()), mix(0.3, 0.6, mood.cheer), mix(0.28, 0.45, random())));
      }
      tuft.castShadow = true;
      s.root.add(tuft);
    }

    // Small landmarks along the trail, with each support touching the ground.
    const edgeX=-0.15, edgeZ=-0.055;
    if(a.trailEdge==='pebbles') for(let i=0;i<3;i++) { const r=0.009+i*0.002; const pebble=s.mesh(new THREE.SphereGeometry(1,10,7),s.material(['#969083','#736e67','#b6a48b'][i]),[edgeX+i*0.024,r*0.65,edgeZ]);pebble.scale.set(r,r*0.65,r*0.8); }
    if(a.trailEdge==='leaf') { const leaf=s.mesh(new THREE.SphereGeometry(1,14,6),s.material('#a6783a'),[edgeX,0.002,edgeZ]);leaf.scale.set(0.05,0.002,0.019);s.rod([edgeX-0.055,0.003,edgeZ],[edgeX+0.045,0.003,edgeZ],0.001,s.material('#624c2c')); }
    if(a.trailEdge==='stems') for(let i=0;i<2;i++) s.rod([edgeX-0.05,0.002,edgeZ+i*0.016],[edgeX+0.05,0.002,edgeZ+0.025-i*0.025],0.002,s.material('#b09765'));
    if(a.trailEdge==='clover') { s.rod([edgeX-0.035,0.0015,edgeZ],[edgeX,0.003,edgeZ],0.0015,s.material('#527d35')); for(let i=0;i<3;i++) { const t=i*Math.PI*2/3;const leaf=s.mesh(new THREE.SphereGeometry(1,10,7),s.material('#5c8c40'),[edgeX+Math.cos(t)*0.012,0.003,edgeZ+Math.sin(t)*0.012]);leaf.scale.set(0.012,0.003,0.009);leaf.rotation.y=-t; } }
    // Ants: one merged body, instanced, walking the path.
    const antSize = 0.012;
    const parts: THREE.BufferGeometry[] = [];
    for (const [x, r, stretch] of [[-0.75, 0.42, 1.5], [0.05, 0.26, 1.2], [0.62, 0.33, 1]] as const) {
      const part = new THREE.SphereGeometry(r, 7, 5);
      part.scale(stretch * (a.antBuild==='compact'?0.8:1), x<0 ? (a.antBuild==='round'?1.3:a.antBuild==='slender'?0.65:1) : 1, a.antBuild==='slender'?0.7:1); part.translate(x, 0.42, 0);
      parts.push(part);
    }
    const segment = (from: THREE.Vector3, to: THREE.Vector3, radius: number) => { const direction=to.clone().sub(from); const g=new THREE.CylinderGeometry(radius,radius,direction.length(),5);g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize()));g.translate(...from.clone().add(to).multiplyScalar(.5).toArray());parts.push(g); };
    const legReach=a.antBuild==='long'?1.1:0.75;
    for (const lean of [-0.5,0,0.5]) for(const side of [-1,1]) { const joint=new THREE.Vector3(lean*0.65,0.3,side*legReach*0.6);segment(new THREE.Vector3(0.05+lean*0.3,0.4,0),joint,0.035);segment(joint,new THREE.Vector3(lean*0.9,0,side*legReach),0.028); }
    for(const side of [-1,1]) { const joint=new THREE.Vector3(1.1,0.65,side*0.3); segment(new THREE.Vector3(.8,.55,side*.15),joint,.026);segment(joint,new THREE.Vector3(1.35,.5,side*.55),.022); }
    const antGeometry = mergeGeometries(parts)!;
    for (const part of parts) part.dispose();
    const count = Math.round(mix(3, 74, a.ants ** 1.4) * mix(0.8, 1.2, mood.density));
    const ants = new THREE.InstancedMesh(antGeometry, new THREE.MeshStandardMaterial({ color: mood.warmth > 0.7 ? '#5a1f12' : '#17120e', roughness: 0.35 }), count);
    ants.castShadow = true;
    const carrying = a.cargo !== 'nothing' && a.cargo !== 'crust';
    const loadColours = a.cargo === 'filling' ? layers.map(([colour]) => colour) : a.cargo === 'sugar' ? ['#ffffff'] : [crumbTone, crumbTone, crustTone];
    const loads = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ roughness: 0.8 }), carrying ? count : 1);
    loads.castShadow = true;
    loads.visible = carrying;
    const walkers = Array.from({ length: count }, (_unused, i) => ({
      offset: (i + random() * 0.7) / count,
      side: (random() - 0.5) * mix(0.004, 0.03, a.ants),
      back: !loop && a.cargo !== 'nothing' && i % 4 === 3,
      load: 0.0035 + random() * 0.003,
    }));
    walkers.forEach((walker, i) => loads.setColorAt(Math.min(i, loads.count - 1), new THREE.Color(loadColours[i % loadColours.length])));
    let team: THREE.Mesh | null = null;
    if (a.cargo === 'crust') {
      team = s.mesh(new THREE.BoxGeometry(0.075, 0.011, 0.007), crust);
    }
    const dummy = new THREE.Object3D(), point = new THREE.Vector3(), ahead = new THREE.Vector3();
    const speed = mix(0.006, 0.06, mood.energy);
    const march = (time: number) => {
      walkers.forEach((walker, i) => {
        let u = (walker.offset + time * speed) % 1;
        if (walker.back || (a.cargo === 'nothing' && !loop)) u = 1 - u;
        path.getPointAt(u, point);
        path.getTangentAt(u, ahead);
        const sideways = new THREE.Vector3(-ahead.z, 0, ahead.x).multiplyScalar(walker.side + (walker.back ? 0.012 : 0));
        dummy.position.copy(point).add(sideways);
        const facing = walker.back || (a.cargo === 'nothing' && !loop) ? -1 : 1;
        dummy.rotation.set(0, Math.atan2(-ahead.z * facing, ahead.x * facing), Math.asin(Math.max(-1, Math.min(1, ahead.y * facing))));
        dummy.scale.setScalar(antSize);
        dummy.updateMatrix();
        ants.setMatrixAt(i, dummy.matrix);
        if (carrying) {
          dummy.position.y += antSize * 0.95;
          dummy.scale.setScalar(walker.back ? 0.00001 : walker.load);
          dummy.rotation.set(i, i * 2, i * 3);
          dummy.updateMatrix();
          loads.setMatrixAt(i, dummy.matrix);
        }
      });
      ants.instanceMatrix.needsUpdate = true;
      loads.instanceMatrix.needsUpdate = true;
      if (team) {
        const u = loop ? (0.1 + time * speed) % 1 : 0.35 + ((time * speed) % 0.5);
        path.getPointAt(u, point); path.getTangentAt(u, ahead);
        team.position.set(point.x, point.y + antSize * 1.05, point.z);
        team.rotation.y = Math.atan2(-ahead.z, ahead.x);
      }
    };
    march(0);
    if (loads.instanceColor) loads.instanceColor.needsUpdate = true;
    s.root.add(ants, loads);
    // A few explorers on the sandwich itself.
    if (first < 0.985 || second < 0.9) {
      const explorers = Array.from({ length: 2 + Math.round(a.ants * 7) }, () => ({ x: (random() - 0.5) * 0.09, z: (random() - 0.5) * 0.09, turn: random() * 6.28 }));
      const onTop = new THREE.InstancedMesh(antGeometry, ants.material, explorers.length);
      halves.updateMatrixWorld(true);
      const ray = new THREE.Raycaster();
      explorers.forEach((explorer, i) => {
        const target=two.group.localToWorld(new THREE.Vector3(two.reach*0.18+Math.abs(explorer.x)*0.12,0,-L*(0.15+Math.abs(explorer.z)*4)));
        ray.set(new THREE.Vector3(target.x,1,target.z),new THREE.Vector3(0,-1,0));
        const hit=ray.intersectObject(halves,true)[0];
        dummy.position.set(target.x,hit?hit.point.y+0.0004:floor+0.0004,target.z);
        dummy.rotation.set(0, explorer.turn, 0);
        dummy.scale.setScalar(antSize);
        dummy.updateMatrix();
        onTop.setMatrixAt(i, dummy.matrix);
      });
      onTop.castShadow = true;
      s.root.add(onTop);
    }
    return s.finish({ footprint: loop ? 0.21 : 0.2, update: (_dt, time) => march(time) });
  },
});
