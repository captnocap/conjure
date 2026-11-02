import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type V3 = [number, number, number];

export default defineThing({
  questions: {
    flowerForm: choice('What form do the marigold heads take?', { pompon: 'Deep rounded pompons with ruffled petals.', button: 'Small tightly packed button heads.', flat: 'Broad low ruffled heads.', open: 'Open flowers with distinct outer petals and a visible centre.' }),
    flowerSize: choice('How large are the flower heads?', { small: 'Small delicate heads.', medium: 'Full-sized market flowers.', large: 'Large showy heads.', mixed: 'A mixture of small and large heads.' }),
    foliage: choice('What shape are the leaves?', { fern: 'Finely divided fern-like leaves.', lance: 'Long narrow pointed leaves.', broad: 'Broad pointed leaves.', curled: 'Narrow leaves curling back on themselves.' }),
    binding: choice('What ties the flowers and their supports together?', { twine: 'Plain pale twine.', red: 'Red cloth ribbon.', straw: 'Braided straw ties.', wire: 'Fine dark florist wire.' }),
    pathShape: choice('If petals form a path, what course does it take?', { straight: 'A straight narrow trail.', bend: 'A trail curving gently to one side.', wave: 'A trail winding from side to side.', fork: 'A trail dividing into two branches.' }),
    accent: choice('What small ornaments are tied among the flowers?', { plain: 'Only the flowers and their bindings.', ribbons: 'Short pairs of red ribbon tails.', tassels: 'Fine golden thread tassels.', bells: 'Tiny hanging brass bells.' }),
    arrangement: choice('How are the marigolds arranged?', {
      garland: 'Strung on thread and hung in swags between two cane stakes, the ends pooling on the ground.',
      vase: 'A generous bunch standing in a vase.',
      path: 'A trail of loose petals laid across the ground with whole blooms along its edges, a road for the dead.',
      arch: 'Tied thickly onto a bent cane arch, a doorway of flowers.',
      heap: 'An armful just bought, lying in a heap on spread newspaper and tied with twine.',
      full: 'Everything at once: a vase wreathed in a garland with a petal path running out from its foot.',
    }),
    freshness: score('How fresh are the flowers?', ['Cut this morning, plump and blazing', 'A day old, still bright', 'Drooping and dulled', 'Dried brown and crumbling, days after the feast']),
    colour: choice('What colours are in the bunch?', {
      orange: 'All deep orange, pure cempasuchil.',
      sunset: 'Orange mixed with golden yellow blooms.',
      velvet: 'Orange with crests of magenta cockscomb, the classic market pairing.',
      cloud: 'Orange dotted with sprays of tiny white baby\'s breath.',
    }),
    vessel: choice('If there is a vase, what kind is it?', {
      barro: 'A round-bellied pot of polished black clay.',
      talavera: 'A white glazed jar painted with cobalt blue bands.',
      can: 'A reused tin can with a red paper label, humble and practical.',
      jar: 'A plain glass jar of water, the stems visible inside.',
      bucket: 'A galvanised market bucket.',
    }),
    scatter: score('How many loose petals lie scattered around it?', ['None, swept clean', 'A few fallen', 'A generous strewing', 'A thick drift running off toward the door']),
    visitor: choice('What has joined the flowers?', {
      none: 'Nothing: only the flowers.',
      monarchs: 'Monarch butterflies settling on the blooms, the returning souls.',
      tealight: 'A tea light burning low among the petals.',
      tag: 'A handwritten paper tag on a string: who they are for.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const stale = Math.min(1, a.freshness * 0.85 + mood.wear * 0.2);
    const brown = new THREE.Color('#7c5223');
    const tone = (hex: string, amount = stale) => new THREE.Color(hex).lerp(brown, amount * 0.85);
    const bloomColour = () => {
      const r = random();
      if (a.colour === 'sunset' && r < 0.4) return tone('#f7c02a');
      if (a.colour === 'velvet' && r < 0.22) return tone('#c2186a');
      return tone(r < 0.5 ? '#f0780a' : r < 0.8 ? '#f58d14' : '#e9620a');
    };
    const size = mix(1,.72,stale)*(a.flowerSize==='small'?.72:a.flowerSize==='large'?1.25:1);
    const tieMat=s.material(a.binding==='red'?'#b92f34':a.binding==='wire'?'#45484b':'#c9b27c',{roughness:a.binding==='wire'?.4:.85,metalness:a.binding==='wire'?.5:0});
    const minAt=(geometry:THREE.BufferGeometry,matrix:THREE.Matrix4)=>{const p=geometry.getAttribute('position'),v=new THREE.Vector3();let min=Infinity;for(let i=0;i<p.count;i++)min=Math.min(min,v.fromBufferAttribute(p,i).applyMatrix4(matrix).y);return min;};

    const blooms: { p: THREE.Vector3; r: number; c: THREE.Color }[] = [];
    const leaves: { p: THREE.Vector3; r: number }[] = [];
    const petals: { p: THREE.Vector3; r: number; c: THREE.Color }[] = [];
    const specks: { at: V3; size: number }[] = [];
    const perches: THREE.Vector3[] = [];
    const bloom = (x: number, y: number, z: number, r = 0.026) => {
      const p = new THREE.Vector3(x, y, z);
      blooms.push({ p, r: r*size*mix(a.flowerSize==='mixed'?.65:.85,a.flowerSize==='mixed'?1.35:1.15,random()), c: bloomColour() });
      if (y > 0.1) perches.push(p);
      if (a.colour === 'cloud' && random() < 0.35) for (let i = 0; i < 5; i++) specks.push({ at: [x + (random() - 0.5) * 0.07, y + random() * 0.05, z + (random() - 0.5) * 0.07], size: 0.006 });
    };
    const leaf=(x:number,y:number,z:number,r=.03,anchor?:THREE.Vector3)=>{leaves.push({p:new THREE.Vector3(x,y,z),r});if(anchor)s.rod(anchor.toArray() as V3,[x,y,z],.0012,green);};
    const petal = (x: number, z: number, y = 0.003) => petals.push({ p: new THREE.Vector3(x, y, z), r: mix(0.008, 0.014, random()), c: tone(random() < 0.5 ? '#f58d14' : '#f7a81e', stale * 0.8) });

    const cane = s.material('#b8975a', { roughness: 0.8 });
    const green = s.material(tone('#3f7a2e', stale * 0.7), { roughness: 0.8 });
    let pathFrom = new THREE.Vector3(0, 0, 0.1);

    const strand = (points: V3[], spacing = 0.036) => {
      s.tube(points,a.binding==='red'?.0035:a.binding==='wire'?.0009:.0017,tieMat);
      const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
      const n = Math.max(2, Math.round(curve.getLength() / spacing));
      for (let i = 0; i <= n; i++) {
        const p = curve.getPointAt(i / n);
        bloom(p.x + (random() - 0.5) * 0.008, Math.max(0.02, p.y + (random() - 0.5) * 0.008), p.z + (random() - 0.5) * 0.008, 0.023);
      }
    };

    const garland = () => {
      const w = 0.3, h = 0.44;
      for (const side of [-1, 1]) {
        s.rod([side * w, 0, 0], [side * (w + 0.015), h + 0.04, 0], 0.008, cane, 0.006);
        s.cylinder(0.035, 0.045, 0.03, [side * w, 0.015, 0], s.material('#9a5a3c'), 14);
      }
      for (const [sag, z] of [[0.16 + stale * 0.06, 0.012], [0.28 + stale * 0.05, -0.012]] as const) {
        const pts: V3[] = [];
        for (let i = 0; i <= 10; i++) { const t = i / 10 * 2 - 1; pts.push([t * w, h - sag * (1 - t * t), z + Math.sin(t * 3) * 0.008]); }
        strand(pts);
      }
      for (const side of [-1, 1]) {
        const tail: V3[] = [[side * w, h, 0.01], [side * (w + 0.03), h * 0.5, 0.02], [side * (w + 0.035), 0.05, 0.03]];
        const turns = mix(1.2, 2.2, random());
        for (let i = 1; i <= 12; i++) { const ang = i / 12 * turns * Math.PI * 2; tail.push([side * (w + 0.04) + Math.cos(ang) * (0.02 + i * 0.006) * side, 0.045 - i * 0.002, 0.06 + Math.sin(ang) * (0.02 + i * 0.006)]); }
        strand(tail);
      }
      pathFrom = new THREE.Vector3(0, 0, 0.08);
    };

    const vase = (wreath: boolean) => {
      let mouth = 0.05, top = 0.24;
      if (a.vessel === 'barro') s.lathe([[0, 0], [0.055, 0], [0.095, 0.05], [0.105, 0.1], [0.085, 0.16], [0.045, 0.2], [0.045, 0.225], [0.058,.24],[.05,.24],[.037,.224],[.037,.201],[.078,.16],[.097,.1],[.087,.05],[.05,.008],[0,.008]], s.material('#1d1b1c', { roughness: 0.22, metalness: 0.3 }));
      else if (a.vessel === 'talavera') {
        const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 128;
        const g = canvas.getContext('2d')!;
        g.fillStyle = '#f5f2e8'; g.fillRect(0, 0, 256, 128);
        g.fillStyle = '#1f46b0'; g.fillRect(0, 10, 256, 8); g.fillRect(0, 108, 256, 8);
        for (let i = 0; i < 8; i++) { g.beginPath(); g.arc(16 + i * 32, 62, 11, 0, 7); g.fill(); g.fillStyle = '#f2c230'; g.beginPath(); g.arc(16 + i * 32, 62, 4, 0, 7); g.fill(); g.fillStyle = '#1f46b0'; g.fillRect(i * 32, 34, 3, 56); }
        const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace;
        s.lathe([[0, 0], [0.06, 0], [0.085, 0.04], [0.095, 0.12], [0.08, 0.2], [0.055, 0.235], [.065,.25],[.055,.25],[.047,.235],[.072,.2],[.087,.12],[.077,.04],[.054,.008],[0,.008]], new THREE.MeshStandardMaterial({ map, roughness: 0.25 }));
        mouth = 0.055; top = 0.25;
      } else if (a.vessel === 'can') {
        s.lathe([[0,0],[.06,0],[.06,.17],[.057,.17],[.057,.004],[0,.004]], s.material('#b9bdbf', { metalness: 0.7, roughness:.35 }));
        s.lathe([[.061,.03],[.061,.14]],s.material('#c4262b',{roughness:.7}));
        s.label('CHILES', 0.07, 0.03, [0, 0.09, 0.0622], '#c4262b', '#f4e7a8');
        mouth = 0.052; top = 0.17;
      } else if (a.vessel === 'jar') {
        s.lathe([[0,0],[.055,0],[.06,.2],[.057,.2],[.052,.006],[0,.006]], new THREE.MeshPhysicalMaterial({ color: '#dff1ee', transparent: true, opacity: 0.3, roughness: 0.05, depthWrite:false }));
        s.cylinder(0.055, 0.05, 0.12, [0, 0.065, 0], s.material('#9fc7b6', { transparent: true, opacity: 0.55, roughness: 0.1 }), 28);
        s.ring(0.058, 0.005, [0, 0.2, 0], s.material('#cfe3df', { roughness: 0.2 })).rotation.x = Math.PI / 2;
        top = 0.2;
      } else {
        s.lathe([[0,0],[.07,0],[.095,.2],[.092,.2],[.067,.006],[0,.006]],s.material('#a9b0b3',{metalness:.65,roughness:.4}));
        s.ring(0.096, 0.005, [0, 0.2, 0], s.material('#8c9396', { metalness: 0.6 })).rotation.x = Math.PI / 2;
        s.tube([[-0.096, 0.19, 0], [-0.07, 0.11, 0.07], [0, 0.085, 0.1], [0.07, 0.11, 0.07], [0.096, 0.19, 0]], 0.003, s.material('#7d8386', { metalness: 0.6 }));
        mouth = 0.085; top = 0.2;
      }
      const count = Math.round(mix(17, 30, mood.density) * (a.vessel === 'bucket' ? 1.4 : 1));
      for (let i = 0; i < count; i++) {
        const ring = i === 0 ? 0 : Math.sqrt(i / count), ang = i * 2.399 + random() * 0.4;
        const lean = ring * mix(0.85, 1.5, stale) + 0.05, len = mix(0.19, 0.13, ring) * mix(1, 0.85, stale) + random() * 0.03;
        const dir = new THREE.Vector3(Math.sin(lean) * Math.cos(ang), Math.cos(lean), Math.sin(lean) * Math.sin(ang));
        const base = new THREE.Vector3(Math.cos(ang) * mouth * 0.5 * ring, top - 0.02, Math.sin(ang) * mouth * 0.5 * ring);
        const head = base.clone().addScaledVector(dir, len);
        head.y -= stale * ring * 0.05;
        const mid = base.clone().addScaledVector(dir, len * 0.5); mid.y += 0.03 * ring;
        s.tube([[base.x*.25,.008,base.z*.25],base.toArray() as V3,mid.toArray() as V3,head.toArray() as V3],.0035,green);
        bloom(head.x, head.y, head.z, 0.043);
        if (random() < 0.7) leaf(mid.x * 1.2, mid.y - 0.01, mid.z*1.2,.03,mid);
      }
      if (wreath) {
        const pts: V3[] = [];
        for (let i = 0; i <= 14; i++) { const ang = i / 14 * Math.PI * 2.6; const r = 0.13 + i * 0.006; pts.push([Math.cos(ang) * r, 0.03, Math.sin(ang) * r]); }
        strand(pts);
      }
      pathFrom = new THREE.Vector3(0, 0, wreath ? 0.2 : 0.11);
    };

    const path = (length: number) => {
      const n = Math.round(length * mix(420, 760, mood.density));
      const wobble = random() * 6;
      const centre=(t:number,side=1)=>pathFrom.x+(a.pathShape==='straight'?0:a.pathShape==='bend'?.18*t*t:a.pathShape==='fork'?side*.2*Math.max(0,t-.35):Math.sin(t*8+wobble)*.08*t);
      for (let i = 0; i < n; i++) {
        const t = random(), half = mix(0.05, 0.1, t);
        const off = (random() + random() - 1) * half;
        petal(centre(t,i%2?1:-1)+off, pathFrom.z + t * length);
      }
      const edge = Math.round(length / 0.11);
      for (let i = 0; i < edge; i++) {
        const t = (i + 0.5) / edge;
        for (const side of [-1, 1]) if (random() < 0.8) bloom(centre(t,side)+side* (mix(0.07, 0.125, t) + random() * 0.015), 0.022, pathFrom.z + t * length + (random() - 0.5) * 0.03, 0.027);
      }
    };

    const arch = () => {
      const w = 0.27, leg = 0.24;
      const pts: V3[] = [];
      for (let i = 0; i <= 5; i++) pts.push([-w, i / 5 * leg, 0]);
      for (let i = 1; i < 16; i++) { const ang = Math.PI - i / 16 * Math.PI; pts.push([Math.cos(ang) * w, leg + Math.sin(ang) * w * 1.05, 0]); }
      for (let i = 5; i >= 0; i--) pts.push([w, i / 5 * leg, 0]);
      s.tube(pts, 0.009, cane);
      const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)));
      const n = Math.round(curve.getLength() / 0.03);
      for (let i = 0; i <= n; i++) {
        const p = curve.getPointAt(i / n);
        const cover = mix(3, 1.4, stale);
        for (let k = 0; k < cover; k++) {
          if (random() < stale * 0.35) continue;
          const ang = random() * Math.PI * 2;
          bloom(p.x + Math.cos(ang) * 0.02, Math.max(0.025, p.y + Math.sin(ang) * 0.02), p.z + Math.sin(ang * 1.7) * 0.028, 0.027);
        }
        if (i % 3 === 0) leaf(p.x * 1.07, p.y * 1.03, (random()-.5)*.08,.032,p);
      }
      pathFrom = new THREE.Vector3(0, 0, 0.02);
    };

    const heap = () => {
      const paper = document.createElement('canvas'); paper.width = 256; paper.height = 256;
      const g = paper.getContext('2d')!;
      g.fillStyle = '#ddd8c8'; g.fillRect(0, 0, 256, 256);
      g.fillStyle = '#55524a';
      g.fillRect(14, 14, 228, 16);
      for (let col = 0; col < 4; col++) for (let row = 0; row < 30; row++) if (random() > 0.12) g.fillRect(14 + col * 58, 44 + row * 7, 40 + random() * 12, 2.5);
      g.fillRect(130, 120, 110, 70);
      const map = new THREE.CanvasTexture(paper); map.colorSpace = THREE.SRGBColorSpace;
      const sheet = s.mesh(new THREE.PlaneGeometry(0.5, 0.42, 6, 6), new THREE.MeshStandardMaterial({ map, roughness: 0.95, side: THREE.DoubleSide }), [0, 0.004, 0]);
      const pos = sheet.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) pos.setZ(i, Math.abs(pos.getX(i)) > 0.2 ? 0.02 + random() * 0.02 : random() * 0.004);
      sheet.geometry.computeVertexNormals();
      sheet.rotation.x = -Math.PI / 2; sheet.rotation.z = 0.25;
      const count = Math.round(mix(22, 46, mood.density));
      for (let i = 0; i < count; i++) {
        const u = random(), spread = (random() - 0.5) * 0.22, layer = random();
        const hx = 0.04 + u * 0.14 + spread * 0.2, hz = spread * (0.6 + u), hy = 0.03 + layer * 0.07 * (1 - Math.abs(spread) * 3.2);
        bloom(hx, Math.max(0.025, hy), hz, 0.03);
        if (i % 2 === 0) s.rod([hx, Math.max(0.02, hy - 0.01), hz], [-0.2 + (random() - 0.5) * 0.03, 0.02 + layer * 0.03, spread * 0.25], 0.0035, green);
        if (random() < 0.5) leaf(hx - 0.08 - random() * 0.06, 0.03 + layer * 0.04, hz*.7,.03,new THREE.Vector3(hx,Math.max(.02,hy-.01),hz));
      }
      s.ring(.034,a.binding==='red'?.006:.0035,[-.12,.035,0],tieMat).rotation.y = Math.PI / 2;
      pathFrom = new THREE.Vector3(0.1, 0, 0.12);
    };

    if (a.arrangement === 'garland') garland();
    else if (a.arrangement === 'vase') vase(false);
    else if (a.arrangement === 'arch') arch();
    else if (a.arrangement === 'heap') heap();
    else if (a.arrangement === 'full') vase(true);
    if (a.arrangement === 'path') { pathFrom = new THREE.Vector3(0, 0, -0.3); for (let i = 0; i < 9; i++) bloom((random() - 0.5) * 0.12, 0.022 + (i > 4 ? 0.04 : 0), -0.32 + (random() - 0.5) * 0.08, 0.03); path(0.62); }
    else if (a.arrangement === 'full') path(mix(0.22, 0.34, a.scatter));

    // Loose petals round the foot.
    const loose = Math.round(a.scatter ** 1.4 * mix(90, 260, mood.density) + stale * 40);
    for (let i = 0; i < loose; i++) {
      const ang = random() * Math.PI * 2, r = mix(0.04, 0.13 + a.scatter * 0.09, Math.sqrt(random()));
      const stretch = a.scatter > 0.7 && random() < 0.5 ? random() * 0.16 : 0;
      petal(pathFrom.x * 0.3 + Math.cos(ang) * r * 1.3, pathFrom.z * 0.4 + Math.sin(ang) * r + stretch);
    }

    // Instanced blooms, leaves, petals.
    const dummy = new THREE.Object3D();
    const bloomGeo = new THREE.IcosahedronGeometry(1, 2);
    const bp = bloomGeo.attributes.position;
    for (let i = 0; i < bp.count; i++) {
      const v = new THREE.Vector3().fromBufferAttribute(bp, i);
      const theta=Math.atan2(v.z,v.x),ruffle=1+(a.flowerForm==='button'?.06:a.flowerForm==='open'?.24:.16)*Math.sin(v.x*9+v.y*5)*Math.cos(v.z*8+v.x*3);
      v.multiplyScalar(ruffle);if(a.flowerForm==='open'){const radial=1+.18*Math.cos(theta*12)*(1-Math.abs(v.y));v.x*=radial;v.z*=radial;}v.y*=a.flowerForm==='flat'?.38:a.flowerForm==='open'?.32:a.flowerForm==='button'?.82:.72;
      bp.setXYZ(i, v.x, v.y, v.z);
    }
    bloomGeo.computeVertexNormals();
    if (blooms.length) {
      const mesh = new THREE.InstancedMesh(bloomGeo, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.75, flatShading: true, emissive: '#b84a00', emissiveIntensity: mix(0.22, 0.02, stale) * mix(0.6, 1.2, mood.cheer) }), blooms.length);
      blooms.forEach((b, i) => {
        dummy.position.copy(b.p); dummy.rotation.set((random() - 0.5) * 1.2, random() * 6.28, (random() - 0.5) * 1.2); dummy.scale.setScalar(b.r); dummy.updateMatrix();
        const bottom=minAt(bloomGeo,dummy.matrix);if(a.arrangement==='path'||b.p.y<.031){dummy.position.y-=bottom;dummy.updateMatrix();}
        mesh.setMatrixAt(i,dummy.matrix);mesh.setColorAt(i,b.c);
        if(a.flowerForm==='open'){const centre=s.ball([b.r*.34,b.r*.17,b.r*.34],[dummy.position.x,dummy.position.y+b.r*.24,dummy.position.z],s.material(tone('#835c18')) ,7);centre.rotation.copy(dummy.rotation);}
      });
      mesh.castShadow = mesh.receiveShadow = true;
      s.root.add(mesh);
    } else bloomGeo.dispose();
    if (leaves.length) {
      const leafGeometry=new THREE.SphereGeometry(1,16,8),lp=leafGeometry.getAttribute('position');for(let i=0;i<lp.count;i++){const x=lp.getX(i),y=lp.getY(i),z=lp.getZ(i);const edge=a.foliage==='fern'?.45+.55*Math.abs(Math.sin(x*14)):1;lp.setXYZ(i,x,y+(a.foliage==='curled'?.8*x*x:0),z*edge*(a.foliage==='broad'?1.5:a.foliage==='lance'?.55:1));}leafGeometry.computeVertexNormals();
      const mesh=new THREE.InstancedMesh(leafGeometry,green,leaves.length);
      leaves.forEach((l, i) => {
        dummy.position.copy(l.p); dummy.rotation.set(random() * 3, random() * 6.28, random() * 3); dummy.scale.set(l.r, l.r * 0.12, l.r * 0.4); dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      });
      mesh.castShadow = mesh.receiveShadow = true;
      s.root.add(mesh);
    }
    if (petals.length) {
      const petalGeo=new THREE.SphereGeometry(1,6,4);
      const mesh=new THREE.InstancedMesh(petalGeo,new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.8}),petals.length);
      petals.forEach((p, i) => {
        dummy.position.copy(p.p); dummy.rotation.set((random() - 0.5) * 0.5, random() * 6.28, (random() - 0.5) * 0.5); dummy.scale.set(p.r, p.r * 0.22, p.r * 0.6); dummy.updateMatrix();
        dummy.position.y-=minAt(petalGeo,dummy.matrix);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);mesh.setColorAt(i,p.c);
      });
      mesh.receiveShadow = true;
      s.root.add(mesh);
    }
    if (specks.length) s.scatter(new THREE.SphereGeometry(1, 6, 4), s.material('#fbf8ee', { roughness: 0.8 }), specks);

    // Visitors.
    const wings: { pivot: THREE.Group; side: number; phase: number }[] = [];
    let flame: THREE.Mesh | null = null;
    if (a.visitor === 'monarchs') {
      const shape = new THREE.Shape();
      shape.moveTo(0, -0.012); shape.quadraticCurveTo(0.03, -0.028, 0.034, -0.006); shape.quadraticCurveTo(0.03, 0.004, 0.02, 0.004); shape.quadraticCurveTo(0.05, 0.012, 0.046, 0.032); shape.quadraticCurveTo(0.02, 0.036, 0, 0.012);
      const wingGeo = new THREE.ShapeGeometry(shape);
      const orange = new THREE.MeshStandardMaterial({ color: '#f07a12', side: THREE.DoubleSide, roughness: 0.7, emissive: '#b84a00', emissiveIntensity: 0.25 });
      const black = new THREE.MeshStandardMaterial({ color: '#17120f', side: THREE.DoubleSide, roughness: 0.8 });
      const count = 2 + Math.floor(random() * 3);
      for (let i = 0; i < count; i++) {
        const spot = perches.length ? perches[Math.floor(random() * perches.length)] : new THREE.Vector3((random() - 0.5) * 0.3, 0.03, (random() - 0.5) * 0.3 + pathFrom.z);
        const fly = new THREE.Group();
        fly.position.copy(spot).add(new THREE.Vector3(0, perches.length ? 0.03 + (i === 0 ? 0.07 : 0) : 0.02, 0));
        fly.rotation.set(-Math.PI / 2 + 0.3, random() * 6.28, 0, 'YXZ');
        const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.003, 0.03, 3, 6), black);
        body.castShadow = true; fly.add(body);
        for (const side of [-1, 1]) {
          const pivot = new THREE.Group();
          const rim = new THREE.Mesh(wingGeo, black); rim.scale.set(side * 1.12, 1.12, 1);
          const fill = new THREE.Mesh(wingGeo, orange); fill.scale.set(side * 0.86, 0.86, 1); fill.position.set(side * 0.003, 0.001, 0.0012);
          const under = fill.clone(); under.position.z = -0.0012;
          rim.castShadow = true;
          pivot.add(rim, fill, under); fly.add(pivot);
          wings.push({ pivot, side, phase: random() * 6 });
        }
        s.root.add(fly);
      }
    } else if (a.visitor === 'tealight') {
      const at: V3 = [pathFrom.x + 0.12, 0, pathFrom.z + 0.06];
      s.lathe([[0,0],[.019,0],[.02,.016],[.0185,.016],[.0175,.0015],[0,.0015]],s.material('#c9ced1',{metalness:.7,roughness:.3}),[at[0],0,at[2]]);
      s.cylinder(0.018, 0.018, 0.004, [at[0],.012,at[2]], s.material('#f6efd9', { emissive: '#ffb347', emissiveIntensity: 0.5 }), 18);
      flame = s.mesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshBasicMaterial({ color: '#ffc04a' }), [at[0], 0.03, at[2]]);
      flame.scale.set(0.005, 0.012, 0.005); flame.castShadow = false;
    } else if (a.visitor === 'tag') {
      const anchor = perches.length ? perches[Math.floor(random() * perches.length)] : new THREE.Vector3(0.05, 0.03, pathFrom.z);
      const tag = s.label(['PARA MAMÁ', 'PARA TI', 'ABUELO', 'TE ESPERO'][Math.floor(random() * 4)], 0.1, 0.05, [anchor.x + 0.02, Math.max(0.035, anchor.y - 0.07), anchor.z + 0.05], '#4a3a2a', '#f1e6c8');
      tag.rotation.set(-0.25, 0.2, 0.12);
      s.rod([anchor.x, anchor.y, anchor.z], [anchor.x + 0.02, Math.max(0.06, anchor.y - 0.045), anchor.z + 0.05], 0.001, s.material('#c9b27c'));
    }

    if(a.accent!=='plain'){
      const anchors=perches.length?perches.filter((_,i)=>i%Math.max(1,Math.floor(perches.length/5))===0).slice(0,5):blooms.slice(0,3).map(b=>b.p);
      for(const p of anchors){const drop=Math.min(.06,Math.max(.008,p.y-.015));s.rod(p.toArray() as V3,[p.x,p.y-drop,p.z],.0008,tieMat);
        if(a.accent==='ribbons')for(const side of [-1,1])s.tube([[p.x,p.y,p.z],[p.x+side*.012,p.y-drop*.6,p.z+.005],[p.x+side*.006,p.y-drop,p.z+.01]],.003,s.material('#b92f34'));
        else if(a.accent==='tassels')for(let j=0;j<8;j++){const angle=j*Math.PI/4;s.rod([p.x,p.y-drop*.35,p.z],[p.x+Math.cos(angle)*.008,Math.max(.001,p.y-drop),p.z+Math.sin(angle)*.008],.0007,s.material('#d9ae45'));}
        else {const bell=s.lathe([[.009,0],[.008,.004],[.006,.013],[0,.016]],s.material('#b79643',{metalness:.7,roughness:.3}),[p.x,Math.max(0,p.y-drop),p.z]);s.ball([.002,.002,.002],[p.x,Math.max(0,p.y-drop)+.002,p.z],s.material('#594a2c'),7);void bell;}
      }
    }
    const speed = mix(1.5, 9, mood.energy);
    return s.finish({
      update: (_dt, time) => {
        for (const w of wings) w.pivot.rotation.y = -w.side * (0.25 + 0.95 * Math.abs(Math.sin(time * speed + w.phase)));
        if (flame) flame.scale.y = 0.012 * (1 + 0.2 * Math.sin(time * speed * 2.3));
      },
    });
  },
});
